const db = require("../config/db");

const getAllReturns = (req, res) => {
  const sql = `
    SELECT
      r.id,
      r.quantity,
      r.reason,
      r.notes,
      r.created_at,
      s.supplier_name,
      i.item_name,
      i.item_code,
      ib.batch_code,
      u.name AS created_by_name
    FROM goods_returns r
    JOIN suppliers s ON r.supplier_id = s.id
    JOIN items i ON r.item_id = i.id
    JOIN inventory_batches ib ON r.batch_id = ib.id
    LEFT JOIN users u ON r.created_by = u.id
    ORDER BY r.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json(results);
  });
};

const createReturn = (req, res) => {
  const { supplier_id, item_id, batch_id, quantity, reason, notes } = req.body;
  const created_by = req.user.id;

  if (!supplier_id || !item_id || !batch_id || !quantity || !reason) {
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
    const returnQty = parseFloat(quantity);

    if (returnQty > currentQty) {
      return res.status(400).json({ message: "Not enough stock in selected batch" });
    }

    const newQty = currentQty - returnQty;
    const newStatus = newQty === 0 ? "Depleted" : "Available";

    const updateBatchSql = `
      UPDATE inventory_batches
      SET available_quantity = ?, status = ?
      WHERE id = ?
    `;

    db.query(updateBatchSql, [newQty, newStatus, batch_id], (updateErr) => {
      if (updateErr) {
        return res.status(500).json({ message: "Database error", error: updateErr.message });
      }

      const insertReturnSql = `
        INSERT INTO goods_returns
        (supplier_id, item_id, batch_id, quantity, reason, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(
        insertReturnSql,
        [supplier_id, item_id, batch_id, returnQty, reason, notes || null, created_by],
        (rErr, result) => {
          if (rErr) {
            return res.status(500).json({ message: "Database error", error: rErr.message });
          }

          const movementSql = `
            INSERT INTO stock_movements
            (item_id, movement_type, reference_type, reference_id, quantity, notes)
            VALUES (?, 'OUT', 'RETURN', ?, ?, ?)
          `;

          db.query(
            movementSql,
            [
              item_id,
              result.insertId,
              returnQty,
              notes || `Goods returned: ${reason}`,
            ],
            (mErr) => {
              if (mErr) {
                return res.status(500).json({ message: "Database error", error: mErr.message });
              }

              res.status(201).json({ message: "Goods return recorded successfully" });
            }
          );
        }
      );
    });
  });
};

module.exports = {
  getAllReturns,
  createReturn,
};