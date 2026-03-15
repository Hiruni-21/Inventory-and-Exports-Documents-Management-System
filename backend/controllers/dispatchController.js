const db = require("../config/db");

const getAllDispatches = (req, res) => {
  const sql = `
    SELECT
      d.id,
      d.dispatch_number,
      d.client_name,
      d.dispatch_date,
      d.remarks,
      d.created_at,
      u.name AS created_by_name
    FROM dispatch_records d
    LEFT JOIN users u ON d.created_by = u.id
    ORDER BY d.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json(results);
  });
};

const getDispatchById = (req, res) => {
  const { id } = req.params;

  const dispatchSql = `
    SELECT
      d.*,
      u.name AS created_by_name
    FROM dispatch_records d
    LEFT JOIN users u ON d.created_by = u.id
    WHERE d.id = ?
  `;

  const itemsSql = `
    SELECT
      di.id,
      di.quantity,
      i.item_code,
      i.item_name,
      i.unit,
      ib.batch_code
    FROM dispatch_items di
    JOIN items i ON di.item_id = i.id
    JOIN inventory_batches ib ON di.batch_id = ib.id
    WHERE di.dispatch_id = ?
  `;

  db.query(dispatchSql, [id], (err, dispatchResults) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (dispatchResults.length === 0) {
      return res.status(404).json({ message: "Dispatch not found" });
    }

    db.query(itemsSql, [id], (itemErr, itemResults) => {
      if (itemErr) {
        return res.status(500).json({ message: "Database error", error: itemErr.message });
      }

      res.json({
        ...dispatchResults[0],
        items: itemResults,
      });
    });
  });
};

const createDispatch = (req, res) => {
  const { client_name, dispatch_date, remarks, items } = req.body;
  const created_by = req.user.id;

  if (!client_name || !dispatch_date || !items || items.length === 0) {
    return res.status(400).json({ message: "Required fields are missing" });
  }

  const dispatchNumber = `DISP-${Date.now()}`;

  const dispatchSql = `
    INSERT INTO dispatch_records
    (dispatch_number, client_name, dispatch_date, remarks, created_by)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(
    dispatchSql,
    [dispatchNumber, client_name, dispatch_date, remarks || null, created_by],
    (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err.message });
      }

      const dispatchId = result.insertId;

      let processed = 0;
      let failed = false;

      items.forEach((item) => {
        const getBatchSql = `
          SELECT available_quantity
          FROM inventory_batches
          WHERE id = ? AND item_id = ?
        `;

        db.query(getBatchSql, [item.batch_id, item.item_id], (batchErr, batchResults) => {
          if (failed) return;

          if (batchErr) {
            failed = true;
            return res.status(500).json({ message: "Database error", error: batchErr.message });
          }

          if (batchResults.length === 0) {
            failed = true;
            return res.status(404).json({ message: "Inventory batch not found" });
          }

          const currentQty = parseFloat(batchResults[0].available_quantity);
          const dispatchQty = parseFloat(item.quantity);

          if (dispatchQty > currentQty) {
            failed = true;
            return res.status(400).json({
              message: `Not enough stock in selected batch for item ID ${item.item_id}`,
            });
          }

          const newQty = currentQty - dispatchQty;
          const newStatus = newQty === 0 ? "Depleted" : "Available";

          const updateBatchSql = `
            UPDATE inventory_batches
            SET available_quantity = ?, status = ?
            WHERE id = ?
          `;

          db.query(updateBatchSql, [newQty, newStatus, item.batch_id], (updateErr) => {
            if (failed) return;

            if (updateErr) {
              failed = true;
              return res.status(500).json({ message: "Database error", error: updateErr.message });
            }

            const insertDispatchItemSql = `
              INSERT INTO dispatch_items
              (dispatch_id, item_id, batch_id, quantity)
              VALUES (?, ?, ?, ?)
            `;

            db.query(
              insertDispatchItemSql,
              [dispatchId, item.item_id, item.batch_id, dispatchQty],
              (itemErr, itemResult) => {
                if (failed) return;

                if (itemErr) {
                  failed = true;
                  return res.status(500).json({ message: "Database error", error: itemErr.message });
                }

                const movementSql = `
                  INSERT INTO stock_movements
                  (item_id, movement_type, reference_type, reference_id, quantity, notes)
                  VALUES (?, 'OUT', 'DISPATCH', ?, ?, ?)
                `;

                db.query(
                  movementSql,
                  [
                    item.item_id,
                    dispatchId,
                    dispatchQty,
                    `Stock dispatched for ${client_name}`,
                  ],
                  (movementErr) => {
                    if (failed) return;

                    if (movementErr) {
                      failed = true;
                      return res.status(500).json({ message: "Database error", error: movementErr.message });
                    }

                    processed += 1;

                    if (processed === items.length) {
                      return res.status(201).json({
                        message: "Dispatch created successfully",
                        dispatchId,
                        dispatchNumber,
                      });
                    }
                  }
                );
              }
            );
          });
        });
      });
    }
  );
};

module.exports = {
  getAllDispatches,
  getDispatchById,
  createDispatch,
};