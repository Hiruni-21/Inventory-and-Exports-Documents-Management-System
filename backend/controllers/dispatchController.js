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
      u.full_name AS created_by_name
    FROM dispatch_records d
    LEFT JOIN users u ON d.created_by = u.id
    ORDER BY d.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("getAllDispatches error:", err);
      return res.status(500).json({
        message: "Database error",
        error: err.message,
      });
    }

    res.json(results);
  });
};

const getDispatchById = (req, res) => {
  const { id } = req.params;

  const dispatchSql = `
    SELECT
      d.id,
      d.dispatch_number,
      d.client_name,
      d.dispatch_date,
      d.remarks,
      d.created_at,
      u.full_name AS created_by_name
    FROM dispatch_records d
    LEFT JOIN users u ON d.created_by = u.id
    WHERE d.id = ?
  `;

  const itemsSql = `
    SELECT
      di.id,
      di.dispatch_id,
      di.item_id,
      di.batch_id,
      di.quantity,
      i.code AS item_code,
      i.name AS item_name,
      i.unit,
      ib.batch_code
    FROM dispatch_items di
    JOIN items i ON di.item_id = i.id
    JOIN inventory_batches ib ON di.batch_id = ib.id
    WHERE di.dispatch_id = ?
    ORDER BY di.id ASC
  `;

  db.query(dispatchSql, [id], (err, dispatchResults) => {
    if (err) {
      console.error("getDispatchById error:", err);
      return res.status(500).json({
        message: "Database error",
        error: err.message,
      });
    }

    if (!dispatchResults.length) {
      return res.status(404).json({ message: "Dispatch not found" });
    }

    db.query(itemsSql, [id], (itemErr, itemResults) => {
      if (itemErr) {
        console.error("getDispatchById items error:", itemErr);
        return res.status(500).json({
          message: "Database error",
          error: itemErr.message,
        });
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
  const created_by = req.user?.id || null;

  if (!client_name || !dispatch_date || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      message: "Client name, dispatch date, and at least one item are required",
    });
  }

  const cleanedItems = items
    .map((item) => ({
      item_id: Number(item.item_id),
      batch_id: Number(item.batch_id),
      quantity: Number(item.quantity || 0),
    }))
    .filter((item) => item.item_id && item.batch_id && item.quantity > 0);

  if (!cleanedItems.length) {
    return res.status(400).json({
      message: "At least one valid dispatch line is required",
    });
  }

  const dispatchNumber = `DSP-${Date.now()}`;

  const insertDispatchSql = `
    INSERT INTO dispatch_records
      (dispatch_number, client_name, dispatch_date, remarks, created_by)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(
    insertDispatchSql,
    [dispatchNumber, client_name, dispatch_date, remarks || null, created_by],
    (dispatchErr, dispatchResult) => {
      if (dispatchErr) {
        console.error("createDispatch dispatch insert error:", dispatchErr);
        return res.status(500).json({
          message: "Database error",
          error: dispatchErr.message,
        });
      }

      const dispatchId = dispatchResult.insertId;

      let processed = 0;
      let failed = false;

      cleanedItems.forEach((item) => {
        const batchSql = `
          SELECT id, item_id, batch_code, available_quantity
          FROM inventory_batches
          WHERE id = ? AND item_id = ?
          LIMIT 1
        `;

        db.query(batchSql, [item.batch_id, item.item_id], (batchErr, batchRows) => {
          if (failed) return;

          if (batchErr) {
            failed = true;
            console.error("createDispatch batch lookup error:", batchErr);
            return res.status(500).json({
              message: "Database error",
              error: batchErr.message,
            });
          }

          if (!batchRows.length) {
            failed = true;
            return res.status(404).json({
              message: `Selected batch not found for item ${item.item_id}`,
            });
          }

          const batch = batchRows[0];
          const availableQty = Number(batch.available_quantity || 0);

          if (item.quantity > availableQty) {
            failed = true;
            return res.status(400).json({
              message: `Not enough stock in batch ${batch.batch_code}`,
            });
          }

          const newQty = availableQty - item.quantity;
          const newStatus = newQty <= 0 ? "Depleted" : "Available";

          const updateBatchSql = `
            UPDATE inventory_batches
            SET available_quantity = ?, status = ?
            WHERE id = ?
          `;

          db.query(updateBatchSql, [newQty, newStatus, item.batch_id], (updateErr) => {
            if (failed) return;

            if (updateErr) {
              failed = true;
              console.error("createDispatch batch update error:", updateErr);
              return res.status(500).json({
                message: "Database error",
                error: updateErr.message,
              });
            }

            const insertItemSql = `
              INSERT INTO dispatch_items
                (dispatch_id, item_id, batch_id, quantity)
              VALUES (?, ?, ?, ?)
            `;

            db.query(
              insertItemSql,
              [dispatchId, item.item_id, item.batch_id, item.quantity],
              (itemErr) => {
                if (failed) return;

                if (itemErr) {
                  failed = true;
                  console.error("createDispatch dispatch item insert error:", itemErr);
                  return res.status(500).json({
                    message: "Database error",
                    error: itemErr.message,
                  });
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
                    item.quantity,
                    `Local dispatch created for ${client_name}`,
                  ],
                  (movementErr) => {
                    if (failed) return;

                    if (movementErr) {
                      failed = true;
                      console.error("createDispatch stock movement error:", movementErr);
                      return res.status(500).json({
                        message: "Database error",
                        error: movementErr.message,
                      });
                    }

                    processed += 1;

                    if (processed === cleanedItems.length) {
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