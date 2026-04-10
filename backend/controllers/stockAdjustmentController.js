const db = require("../config/db");
const { refreshInventorySnapshot } = require("./inventoryController");

const buildAdjustmentNumber = () => `ADJ-${Date.now().toString().slice(-6)}`;

const normalizeAdjustmentType = (value) => {
  const raw = String(value || "").trim().toLowerCase();

  if (["in", "increase", "+"].includes(raw)) return "increase";
  if (["out", "decrease", "-"].includes(raw)) return "decrease";
  if (["variance", "stock_count"].includes(raw)) return raw;

  return "";
};

const getAllStockAdjustments = (req, res) => {
  const sql = `
    SELECT
      sa.id,
      sa.adjustment_number,
      sa.adjustment_type,
      sa.system_qty,
      sa.actual_qty,
      sa.variance_qty,
      sa.adjustment_qty,
      sa.adjustment_qty AS quantity,
      sa.reason,
      sa.notes,
      sa.created_at,
      i.code AS item_code,
      i.name AS item_name,
      ib.batch_code,
      u.full_name AS created_by_name
    FROM stock_adjustments sa
    JOIN items i ON sa.item_id = i.id
    LEFT JOIN inventory_batches ib ON sa.batch_id = ib.id
    LEFT JOIN users u ON sa.created_by = u.id
    ORDER BY sa.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json(results);
  });
};

const createStockAdjustment = (req, res) => {
  const createdBy = req.user?.id || null;
  const itemId = Number(req.body.item_id);
  const batchId = Number(req.body.batch_id);
  const adjustmentType = normalizeAdjustmentType(req.body.adjustment_type);
  const requestedQty = Number(req.body.quantity || 0);
  const reason = String(req.body.reason || "").trim();
  const notes = String(req.body.notes || "").trim() || null;

  if (!itemId || !batchId || !adjustmentType || !reason) {
    return res.status(400).json({ message: "Required fields are missing" });
  }

  if (!["increase", "decrease", "variance", "stock_count"].includes(adjustmentType)) {
    return res.status(400).json({ message: "Invalid adjustment type" });
  }

  const batchSql = `
    SELECT
      ib.id,
      ib.item_id,
      ib.batch_code,
      COALESCE(ib.available_quantity, 0) AS available_quantity
    FROM inventory_batches ib
    WHERE ib.id = ? AND ib.item_id = ?
    LIMIT 1
  `;

  db.query(batchSql, [batchId, itemId], (batchErr, batchRows) => {
    if (batchErr) {
      return res.status(500).json({ message: "Database error", error: batchErr.message });
    }

    if (!batchRows.length) {
      return res.status(404).json({ message: "Inventory batch not found" });
    }

    const batch = batchRows[0];
    const systemQty = Number(batch.available_quantity || 0);

    let actualQty = systemQty;
    let adjustmentQty = requestedQty;
    let varianceQty = 0;
    let nextQty = systemQty;

    if (["variance", "stock_count"].includes(adjustmentType)) {
      actualQty = Number(req.body.actual_qty);
      if (Number.isNaN(actualQty)) {
        return res.status(400).json({ message: "Actual quantity is required for stock count" });
      }

      varianceQty = actualQty - systemQty;
      adjustmentQty = Math.abs(varianceQty);
      nextQty = actualQty;
    } else if (adjustmentType === "increase") {
      if (!(requestedQty > 0)) {
        return res.status(400).json({ message: "Quantity must be greater than 0" });
      }
      actualQty = systemQty + requestedQty;
      varianceQty = requestedQty;
      nextQty = systemQty + requestedQty;
    } else if (adjustmentType === "decrease") {
      if (!(requestedQty > 0)) {
        return res.status(400).json({ message: "Quantity must be greater than 0" });
      }
      if (requestedQty > systemQty) {
        return res.status(400).json({ message: "Not enough stock in selected batch" });
      }
      actualQty = systemQty - requestedQty;
      varianceQty = requestedQty * -1;
      nextQty = systemQty - requestedQty;
    }

    const nextStatus = nextQty <= 0 ? "Depleted" : "Available";
    const updateBatchSql = `
      UPDATE inventory_batches
      SET available_quantity = ?, status = ?
      WHERE id = ?
    `;

    db.beginTransaction((txErr) => {
      if (txErr) {
        return res.status(500).json({ message: "Database error", error: txErr.message });
      }

      db.query(updateBatchSql, [nextQty, nextStatus, batchId], (updateErr) => {
        if (updateErr) {
          return db.rollback(() =>
            res.status(500).json({ message: "Database error", error: updateErr.message })
          );
        }

        const insertSql = `
          INSERT INTO stock_adjustments
          (
            adjustment_number,
            item_id,
            batch_id,
            adjustment_type,
            system_qty,
            actual_qty,
            variance_qty,
            adjustment_qty,
            reason,
            notes,
            created_by
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(
          insertSql,
          [
            buildAdjustmentNumber(),
            itemId,
            batchId,
            adjustmentType,
            systemQty,
            actualQty,
            varianceQty,
            adjustmentQty,
            reason,
            notes,
            createdBy,
          ],
          (insertErr, insertResult) => {
            if (insertErr) {
              return db.rollback(() =>
                res.status(500).json({ message: "Database error", error: insertErr.message })
              );
            }

            const movementType = nextQty >= systemQty ? "IN" : "OUT";
            const movementQty = Math.abs(nextQty - systemQty);
            const movementSql = `
              INSERT INTO stock_movements
              (item_id, movement_type, reference_type, reference_id, quantity, notes)
              VALUES (?, ?, 'ADJUSTMENT', ?, ?, ?)
            `;

            db.query(
              movementSql,
              [
                itemId,
                movementType,
                insertResult.insertId,
                movementQty,
                notes || `Stock adjustment: ${reason}`,
              ],
              (movementErr) => {
                if (movementErr) {
                  return db.rollback(() =>
                    res.status(500).json({ message: "Database error", error: movementErr.message })
                  );
                }

                refreshInventorySnapshot(itemId, (refreshErr) => {
                  if (refreshErr) {
                    return db.rollback(() =>
                      res.status(500).json({ message: "Database error", error: refreshErr.message })
                    );
                  }

                  db.commit((commitErr) => {
                    if (commitErr) {
                      return db.rollback(() =>
                        res.status(500).json({ message: "Database error", error: commitErr.message })
                      );
                    }

                    return res.status(201).json({
                      message: "Stock adjustment created successfully",
                    });
                  });
                });
              }
            );
          }
        );
      });
    });
  });
};

module.exports = {
  getAllStockAdjustments,
  createStockAdjustment,
};