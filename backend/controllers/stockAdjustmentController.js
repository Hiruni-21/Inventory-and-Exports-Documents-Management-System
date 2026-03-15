const db = require("../config/db");

const getAllStockAdjustments = (req, res) => {
  const sql = `
    SELECT
      sa.id,
      sa.adjustment_type,
      sa.quantity,
      sa.reason,
      sa.notes,
      sa.created_at,
      i.item_name,
      i.item_code,
      ib.batch_code,
      u.name AS created_by_name
    FROM stock_adjustments sa
    JOIN items i ON sa.item_id = i.id
    JOIN inventory_batches ib ON sa.batch_id = ib.id
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
  const { item_id, batch_id, adjustment_type, quantity, reason, notes } = req.body;
  const created_by = req.user.id;

  if (!item_id || !batch_id || !adjustment_type || !quantity || !reason) {
    return res.status(400).json({ message: "Required fields are missing" });
  }

  const getBatchSql = `
    SELECT available_quantity
    FROM inventory_batches
    WHERE id = ? AND item_id = ?
  `;

  db.query(getBatchSql, [batch_id, item_id], (batchErr, batchResults) => {
    if (batchErr) {
      return res.status(500).json({ message: "Database error", error: batchErr.message });
    }

    if (batchResults.length === 0) {
      return res.status(404).json({ message: "Inventory batch not found" });
    }

    const currentQty = parseFloat(batchResults[0].available_quantity);
    const changeQty = parseFloat(quantity);

    let newQty = currentQty;

    if (adjustment_type === "IN") {
      newQty = currentQty + changeQty;
    } else if (adjustment_type === "OUT") {
      newQty = currentQty - changeQty;

      if (newQty < 0) {
        return res.status(400).json({ message: "Not enough stock in selected batch" });
      }
    }

    const updateBatchSql = `
      UPDATE inventory_batches
      SET available_quantity = ?, status = ?
      WHERE id = ?
    `;

    const newStatus = newQty === 0 ? "Depleted" : "Available";

    db.query(updateBatchSql, [newQty, newStatus, batch_id], (updateErr) => {
      if (updateErr) {
        return res.status(500).json({ message: "Database error", error: updateErr.message });
      }

      const insertAdjustmentSql = `
        INSERT INTO stock_adjustments
        (item_id, batch_id, adjustment_type, quantity, reason, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(
        insertAdjustmentSql,
        [item_id, batch_id, adjustment_type, changeQty, reason, notes || null, created_by],
        (adjustErr, adjustResult) => {
          if (adjustErr) {
            return res.status(500).json({ message: "Database error", error: adjustErr.message });
          }

          const movementSql = `
            INSERT INTO stock_movements
            (item_id, movement_type, reference_type, reference_id, quantity, notes)
            VALUES (?, ?, 'ADJUSTMENT', ?, ?, ?)
          `;

          db.query(
            movementSql,
            [
              item_id,
              adjustment_type,
              adjustResult.insertId,
              changeQty,
              notes || `Stock adjusted: ${reason}`,
            ],
            (movementErr) => {
              if (movementErr) {
                return res.status(500).json({ message: "Database error", error: movementErr.message });
              }

              res.status(201).json({
                message: "Stock adjustment created successfully",
              });
            }
          );
        }
      );
    });
  });
};

module.exports = {
  getAllStockAdjustments,
  createStockAdjustment,
};