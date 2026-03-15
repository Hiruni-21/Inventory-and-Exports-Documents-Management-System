const db = require("../config/db");

const getAllWastage = (req, res) => {
  const sql = `
    SELECT
      w.id,
      w.quantity,
      w.reason,
      w.notes,
      w.created_at,
      i.item_name,
      i.item_code,
      ib.batch_code,
      u.name AS created_by_name
    FROM wastage_records w
    JOIN items i ON w.item_id = i.id
    JOIN inventory_batches ib ON w.batch_id = ib.id
    LEFT JOIN users u ON w.created_by = u.id
    ORDER BY w.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json(results);
  });
};

const createWastage = (req, res) => {
  const { item_id, batch_id, quantity, reason, notes } = req.body;
  const created_by = req.user.id;

  if (!item_id || !batch_id || !quantity || !reason) {
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
    const wasteQty = parseFloat(quantity);

    if (wasteQty > currentQty) {
      return res.status(400).json({ message: "Not enough stock in selected batch" });
    }

    const newQty = currentQty - wasteQty;
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

      const insertWastageSql = `
        INSERT INTO wastage_records
        (item_id, batch_id, quantity, reason, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      db.query(
        insertWastageSql,
        [item_id, batch_id, wasteQty, reason, notes || null, created_by],
        (wErr, result) => {
          if (wErr) {
            return res.status(500).json({ message: "Database error", error: wErr.message });
          }

          const movementSql = `
            INSERT INTO stock_movements
            (item_id, movement_type, reference_type, reference_id, quantity, notes)
            VALUES (?, 'OUT', 'WASTAGE', ?, ?, ?)
          `;

          db.query(
            movementSql,
            [
              item_id,
              result.insertId,
              wasteQty,
              notes || `Wastage recorded: ${reason}`,
            ],
            (mErr) => {
              if (mErr) {
                return res.status(500).json({ message: "Database error", error: mErr.message });
              }

              res.status(201).json({ message: "Wastage recorded successfully" });
            }
          );
        }
      );
    });
  });
};

module.exports = {
  getAllWastage,
  createWastage,
};