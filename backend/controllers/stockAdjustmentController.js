const db = require("../config/db");

const buildAdjustmentNumber = () => `ADJ-${Date.now().toString().slice(-6)}`;

const refreshInventorySnapshot = (itemId, callback = () => {}) => {
  const totalsSql = `
    SELECT
      COALESCE(SUM(received_quantity), 0) AS qty_on_hand,
      COALESCE(SUM(available_quantity), 0) AS qty_available
    FROM inventory_batches
    WHERE item_id = ?
  `;

  const itemSql = `
    SELECT COALESCE(unit_cost, 0) AS unit_cost
    FROM items
    WHERE id = ?
    LIMIT 1
  `;

  db.query(totalsSql, [itemId], (totalsErr, totalsRows) => {
    if (totalsErr) return callback(totalsErr);

    db.query(itemSql, [itemId], (itemErr, itemRows) => {
      if (itemErr) return callback(itemErr);

      const qtyOnHand = Number(totalsRows?.[0]?.qty_on_hand || 0);
      const qtyAvailable = Number(totalsRows?.[0]?.qty_available || 0);
      const unitCost = Number(itemRows?.[0]?.unit_cost || 0);
      const totalValue = qtyAvailable * unitCost;

      const upsertSql = `
        INSERT INTO inventory
          (item_id, qty_on_hand, qty_reserved, qty_available, avg_unit_cost, total_value, updated_at)
        VALUES (?, ?, 0, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          qty_on_hand = VALUES(qty_on_hand),
          qty_reserved = 0,
          qty_available = VALUES(qty_available),
          avg_unit_cost = VALUES(avg_unit_cost),
          total_value = VALUES(total_value),
          updated_at = NOW()
      `;

      db.query(
        upsertSql,
        [itemId, qtyOnHand, qtyAvailable, unitCost, totalValue],
        (upsertErr) => {
          if (!upsertErr) {
            const { triggerLowStockCheck } = require("../utils/notificationHelper");
            triggerLowStockCheck(itemId);
          }
          callback(upsertErr);
        }
      );
    });
  });
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
    WHERE i.stock_type = 'packaging'
    ORDER BY sa.id DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("GET /stock-adjustments failed:", err);
      return res.status(500).json({ message: "Failed to load stock adjustments", error: err.message });
    }

    res.json(rows);
  });
};

const createStockAdjustment = (req, res) => {
  const createdBy = req.user?.id || null;

  const itemId = Number(req.body.item_id);
  const batchId = Number(req.body.batch_id);
  const quantity = Number(req.body.quantity || 0);
  const adjustmentMode = String(req.body.adjustment_mode || "").trim().toLowerCase();
  const reason = String(req.body.reason || "").trim();
  const notes = String(req.body.notes || "").trim();
  const authorizedBy = String(req.body.authorized_by || "").trim();

  if (!itemId || !batchId || !adjustmentMode || !reason) {
    return res.status(400).json({ message: "Item, batch, adjustment type and reason are required" });
  }

  if (Number.isNaN(quantity) || quantity < 0) {
    return res.status(400).json({ message: "Quantity must be a valid non-negative number" });
  }

  const batchSql = `
    SELECT
      ib.id,
      ib.item_id,
      ib.batch_code,
      COALESCE(ib.available_quantity, 0) AS available_quantity
    FROM inventory_batches ib
    JOIN items i ON ib.item_id = i.id
    WHERE ib.id = ? AND ib.item_id = ? AND i.stock_type = 'packaging'
    LIMIT 1
  `;

  db.query(batchSql, [batchId, itemId], (batchErr, batchRows) => {
    if (batchErr) {
      console.error("Batch lookup failed:", batchErr);
      return res.status(500).json({ message: "Database error", error: batchErr.message });
    }

    if (!batchRows.length) {
      return res.status(404).json({ message: "Selected batch not found or item is not a packaging material" });
    }

    const batch = batchRows[0];
    const currentQty = Number(batch.available_quantity || 0);

    let adjustmentType = "increase";
    let adjustmentQty = quantity;
    let actualQty = currentQty;
    let varianceQty = 0;
    let nextQty = currentQty;

    if (adjustmentMode === "add") {
      if (!(quantity > 0)) {
        return res.status(400).json({ message: "Add quantity must be greater than zero" });
      }

      adjustmentType = "increase";
      actualQty = currentQty + quantity;
      varianceQty = quantity;
      nextQty = currentQty + quantity;
    } else if (adjustmentMode === "remove") {
      if (!(quantity > 0)) {
        return res.status(400).json({ message: "Remove quantity must be greater than zero" });
      }

      if (quantity > currentQty) {
        return res.status(400).json({ message: "Cannot remove more than current batch quantity" });
      }

      adjustmentType = "decrease";
      actualQty = currentQty - quantity;
      varianceQty = quantity * -1;
      nextQty = currentQty - quantity;
    } else if (adjustmentMode === "exact") {
      adjustmentType = "stock_count";
      actualQty = quantity;
      varianceQty = quantity - currentQty;
      adjustmentQty = Math.abs(varianceQty);
      nextQty = quantity;

      if (varianceQty === 0) {
        return res.status(400).json({ message: "Exact quantity is already equal to current stock" });
      }
    } else {
      return res.status(400).json({ message: "Invalid adjustment type" });
    }

    const nextStatus = nextQty <= 0 ? "Depleted" : "Available";
    const mergedNotes = [notes, authorizedBy ? `Authorized By: ${authorizedBy}` : ""]
      .filter(Boolean)
      .join("\n");

    db.beginTransaction((txErr) => {
      if (txErr) {
        console.error("Transaction start failed:", txErr);
        return res.status(500).json({ message: "Database error", error: txErr.message });
      }

      const updateBatchSql = `
        UPDATE inventory_batches
        SET available_quantity = ?, status = ?
        WHERE id = ?
      `;

      db.query(updateBatchSql, [nextQty, nextStatus, batchId], (updateErr) => {
        if (updateErr) {
          console.error("Batch update failed:", updateErr);
          return db.rollback(() =>
            res.status(500).json({ message: "Failed to update batch", error: updateErr.message })
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
            currentQty,
            actualQty,
            varianceQty,
            adjustmentQty,
            reason,
            mergedNotes,
            createdBy,
          ],
          (insertErr) => {
            if (insertErr) {
              console.error("Adjustment insert failed:", insertErr);
              return db.rollback(() =>
                res.status(500).json({ message: "Failed to save adjustment", error: insertErr.message })
              );
            }

            refreshInventorySnapshot(itemId, (refreshErr) => {
              if (refreshErr) {
                console.error("Inventory snapshot refresh failed:", refreshErr);
                return db.rollback(() =>
                  res.status(500).json({ message: "Failed to refresh inventory", error: refreshErr.message })
                );
              }

                const { sendNotification } = require("../utils/notificationHelper");
                sendNotification({
                  role: "supervisor",
                  title: "Stock Adjustment Submitted",
                  message: `Stock adjustment has been submitted for item ID ${itemId}.`,
                  type: "stock_adjustment"
                }).catch(err => console.error("Stock adjustment notification error:", err.message));

                res.status(201).json({ message: "Stock adjustment saved successfully" });
              });
            });
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