const db = require("../config/db");

const getAllGlobalDispatches = (req, res) => {
  const sql = `
    SELECT
      gd.id,
      gd.dispatch_number,
      gd.dispatch_date,
      gd.departure_date,
      gd.airline,
      gd.incoterm,
      gd.cold_chain_required,
      gd.status,
      gd.stock_deducted,
      gd.remarks,
      gd.created_at,
      c.name AS customer_name,
      c.customer_code,
      COALESCE(SUM(gdi.qty), 0) AS total_qty,
      COUNT(gdi.id) AS line_count,
      CASE
        WHEN ed.id IS NULL THEN 0
        ELSE (
          (ed.commercial_invoice_status = 'done') +
          (ed.packing_list_status = 'done') +
          (ed.phytosanitary_certificate_status = 'done') +
          (ed.airway_bill_status = 'done') +
          (ed.certificate_of_origin_status = 'done') +
          (ed.health_certificate_status = 'done') +
          (ed.insurance_certificate_status = 'done')
        )
      END AS docs_done_count
    FROM global_dispatch gd
    JOIN customers c ON gd.customer_id = c.id
    LEFT JOIN global_dispatch_items gdi ON gdi.global_dispatch_id = gd.id
    LEFT JOIN export_documents ed ON ed.global_dispatch_id = gd.id
    GROUP BY gd.id
    ORDER BY gd.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("getAllGlobalDispatches error:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }
    res.json(results);
  });
};

const getGlobalDispatchById = (req, res) => {
  const { id } = req.params;

  const headerSql = `
    SELECT
      gd.*,
      c.name AS customer_name,
      c.customer_code,
      c.contact_person,
      c.phone,
      c.email
    FROM global_dispatch gd
    JOIN customers c ON gd.customer_id = c.id
    WHERE gd.id = ?
    LIMIT 1
  `;

  const itemsSql = `
    SELECT
      gdi.id,
      gdi.item_id,
      gdi.batch_id,
      gdi.qty,
      gdi.unit,
      gdi.unit_price,
      gdi.line_total,
      gdi.notes,
      i.code AS item_code,
      i.name AS item_name,
      b.batch_code,
      b.expiry_date
    FROM global_dispatch_items gdi
    JOIN items i ON i.id = gdi.item_id
    LEFT JOIN batches b ON b.id = gdi.batch_id
    WHERE gdi.global_dispatch_id = ?
    ORDER BY gdi.id ASC
  `;

  const docsSql = `
    SELECT *
    FROM export_documents
    WHERE global_dispatch_id = ?
    LIMIT 1
  `;

  db.query(headerSql, [id], (err, headerRows) => {
    if (err) {
      console.error("getGlobalDispatchById header error:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (!headerRows.length) {
      return res.status(404).json({ message: "Global dispatch not found" });
    }

    db.query(itemsSql, [id], (itemsErr, itemRows) => {
      if (itemsErr) {
        console.error("getGlobalDispatchById items error:", itemsErr);
        return res.status(500).json({ message: "Database error", error: itemsErr.message });
      }

      db.query(docsSql, [id], (docsErr, docsRows) => {
        if (docsErr) {
          console.error("getGlobalDispatchById docs error:", docsErr);
          return res.status(500).json({ message: "Database error", error: docsErr.message });
        }

        res.json({
          ...headerRows[0],
          items: itemRows,
          export_documents: docsRows[0] || null,
        });
      });
    });
  });
};

const createGlobalDispatch = (req, res) => {
  const {
    customer_id,
    dispatch_date,
    departure_date,
    airline,
    incoterm,
    cold_chain_required,
    remarks,
    items,
  } = req.body;

  const created_by = req.user?.id || null;

  if (!customer_id || !dispatch_date || !airline || !incoterm || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      message: "Customer, dispatch date, airline, incoterm and at least one item are required",
    });
  }

  const cleanedItems = items
    .map((item) => ({
      item_id: Number(item.item_id),
      batch_id: item.batch_id ? Number(item.batch_id) : null,
      qty: Number(item.qty || 0),
      unit: item.unit || "kg",
      unit_price: Number(item.unit_price || 0),
      notes: item.notes || null,
    }))
    .filter((item) => item.item_id && item.qty > 0);

  if (!cleanedItems.length) {
    return res.status(400).json({ message: "At least one valid global dispatch line is required" });
  }

  const dispatchNumber = `GDS-${Date.now()}`;

  const insertHeaderSql = `
    INSERT INTO global_dispatch
    (
      dispatch_number,
      customer_id,
      dispatch_date,
      departure_date,
      airline,
      incoterm,
      cold_chain_required,
      status,
      stock_deducted,
      remarks,
      created_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 'docs_pending', 0, ?, ?)
  `;

  db.query(
    insertHeaderSql,
    [
      dispatchNumber,
      customer_id,
      dispatch_date,
      departure_date || null,
      airline,
      incoterm,
      cold_chain_required ? 1 : 0,
      remarks || null,
      created_by,
    ],
    (headerErr, headerResult) => {
      if (headerErr) {
        console.error("createGlobalDispatch header error:", headerErr);
        return res.status(500).json({ message: "Database error", error: headerErr.message });
      }

      const globalDispatchId = headerResult.insertId;
      let processed = 0;
      let failed = false;

      cleanedItems.forEach((item) => {
        const lineTotal = Number(item.qty) * Number(item.unit_price || 0);

        const insertItemSql = `
          INSERT INTO global_dispatch_items
          (
            global_dispatch_id,
            item_id,
            batch_id,
            qty,
            unit,
            unit_price,
            line_total,
            notes
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(
          insertItemSql,
          [
            globalDispatchId,
            item.item_id,
            item.batch_id,
            item.qty,
            item.unit,
            item.unit_price,
            lineTotal,
            item.notes,
          ],
          (itemErr) => {
            if (failed) return;

            if (itemErr) {
              failed = true;
              console.error("createGlobalDispatch item error:", itemErr);
              return res.status(500).json({ message: "Database error", error: itemErr.message });
            }

            processed += 1;

            if (processed === cleanedItems.length) {
              const insertDocsSql = `
                INSERT INTO export_documents (global_dispatch_id, all_cleared, updated_by)
                VALUES (?, 0, ?)
              `;

              db.query(insertDocsSql, [globalDispatchId, created_by], (docsErr) => {
                if (docsErr) {
                  console.error("createGlobalDispatch docs row error:", docsErr);
                  return res.status(500).json({ message: "Database error", error: docsErr.message });
                }

                return res.status(201).json({
                  message: "Global dispatch created successfully",
                  globalDispatchId,
                  dispatchNumber,
                });
              });
            }
          }
        );
      });
    }
  );
};

const clearGlobalDispatch = (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id || null;

  const dispatchSql = `
    SELECT id, status, stock_deducted
    FROM global_dispatch
    WHERE id = ?
    LIMIT 1
  `;

  const docsSql = `
    SELECT *
    FROM export_documents
    WHERE global_dispatch_id = ?
    LIMIT 1
  `;

  const itemsSql = `
    SELECT
      gdi.id,
      gdi.item_id,
      gdi.batch_id,
      gdi.qty,
      i.name AS item_name,
      b.batch_code,
      b.qty_on_hand
    FROM global_dispatch_items gdi
    JOIN items i ON i.id = gdi.item_id
    LEFT JOIN batches b ON b.id = gdi.batch_id
    WHERE gdi.global_dispatch_id = ?
    ORDER BY gdi.id ASC
  `;

  db.query(dispatchSql, [id], (dispatchErr, dispatchRows) => {
    if (dispatchErr) {
      console.error("clearGlobalDispatch dispatch error:", dispatchErr);
      return res.status(500).json({ message: "Database error", error: dispatchErr.message });
    }

    if (!dispatchRows.length) {
      return res.status(404).json({ message: "Global dispatch not found" });
    }

    const dispatch = dispatchRows[0];

    if (dispatch.stock_deducted) {
      return res.status(400).json({ message: "Stock already deducted for this shipment" });
    }

    db.query(docsSql, [id], (docsErr, docsRows) => {
      if (docsErr) {
        console.error("clearGlobalDispatch docs error:", docsErr);
        return res.status(500).json({ message: "Database error", error: docsErr.message });
      }

      if (!docsRows.length) {
        return res.status(400).json({ message: "Export document record not found" });
      }

      const docs = docsRows[0];
      const allDone =
        docs.commercial_invoice_status === "done" &&
        docs.packing_list_status === "done" &&
        docs.phytosanitary_certificate_status === "done" &&
        docs.airway_bill_status === "done" &&
        docs.certificate_of_origin_status === "done" &&
        docs.health_certificate_status === "done" &&
        docs.insurance_certificate_status === "done";

      if (!allDone || !docs.all_cleared) {
        return res.status(400).json({
          message: "Cannot clear shipment until all 7 export documents are completed",
        });
      }

      db.query(itemsSql, [id], (itemsErr, itemRows) => {
        if (itemsErr) {
          console.error("clearGlobalDispatch items error:", itemsErr);
          return res.status(500).json({ message: "Database error", error: itemsErr.message });
        }

        if (!itemRows.length) {
          return res.status(400).json({ message: "No items found for this shipment" });
        }

        for (const row of itemRows) {
          if (!row.batch_id) {
            return res.status(400).json({
              message: `Missing batch for item ${row.item_name}`,
            });
          }

          if (Number(row.qty_on_hand || 0) < Number(row.qty || 0)) {
            return res.status(400).json({
              message: `Insufficient stock in batch ${row.batch_code}`,
            });
          }
        }

        let processed = 0;
        let failed = false;

        itemRows.forEach((row) => {
          const newQty = Number(row.qty_on_hand || 0) - Number(row.qty || 0);

          const updateBatchSql = `
            UPDATE batches
            SET qty_on_hand = ?
            WHERE id = ?
          `;

          db.query(updateBatchSql, [newQty, row.batch_id], (batchErr) => {
            if (failed) return;

            if (batchErr) {
              failed = true;
              console.error("clearGlobalDispatch batch update error:", batchErr);
              return res.status(500).json({ message: "Database error", error: batchErr.message });
            }

            const movementSql = `
              INSERT INTO activity_log
              (user_id, action, module, reference_type, reference_id, description)
              VALUES (?, 'CLEAR', 'GLOBAL_DISPATCH', 'global_dispatch', ?, ?)
            `;

            db.query(
              movementSql,
              [
                userId,
                id,
                `Stock deducted for global shipment ${id}, item ${row.item_name}, batch ${row.batch_code}`,
              ],
              (logErr) => {
                if (failed) return;

                if (logErr) {
                  failed = true;
                  console.error("clearGlobalDispatch log error:", logErr);
                  return res.status(500).json({ message: "Database error", error: logErr.message });
                }

                processed += 1;

                if (processed === itemRows.length) {
                  const updateDispatchSql = `
                    UPDATE global_dispatch
                    SET status = 'cleared',
                        stock_deducted = 1,
                        cleared_by = ?,
                        cleared_at = NOW()
                    WHERE id = ?
                  `;

                  db.query(updateDispatchSql, [userId, id], (updateErr) => {
                    if (updateErr) {
                      console.error("clearGlobalDispatch final update error:", updateErr);
                      return res.status(500).json({ message: "Database error", error: updateErr.message });
                    }

                    return res.json({
                      message: "Global dispatch cleared and stock deducted successfully",
                    });
                  });
                }
              }
            );
          });
        });
      });
    });
  });
};

module.exports = {
  getAllGlobalDispatches,
  getGlobalDispatchById,
  createGlobalDispatch,
  clearGlobalDispatch,
};