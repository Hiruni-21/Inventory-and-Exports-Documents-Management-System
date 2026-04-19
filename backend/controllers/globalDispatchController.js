const db = require("../config/db");

const DOC_FIELDS = [
  "commercial_invoice_status",
  "packing_list_status",
  "phytosanitary_certificate_status",
  "airway_bill_status",
  "certificate_of_origin_status",
  "health_certificate_status",
  "insurance_certificate_status",
];

const docsDoneExpression = `
  (CASE WHEN commercial_invoice_status = 'done' THEN 1 ELSE 0 END) +
  (CASE WHEN packing_list_status = 'done' THEN 1 ELSE 0 END) +
  (CASE WHEN phytosanitary_certificate_status = 'done' THEN 1 ELSE 0 END) +
  (CASE WHEN airway_bill_status = 'done' THEN 1 ELSE 0 END) +
  (CASE WHEN certificate_of_origin_status = 'done' THEN 1 ELSE 0 END) +
  (CASE WHEN health_certificate_status = 'done' THEN 1 ELSE 0 END) +
  (CASE WHEN insurance_certificate_status = 'done' THEN 1 ELSE 0 END)
`;

const getAllGlobalDispatches = (req, res) => {
  const sql = `
    SELECT
      gd.id,
      gd.dispatch_number,
      gd.dispatch_date,
      gd.departure_date,
      gd.airline,
      gd.flight_no,
      gd.awb_number,
      gd.incoterm,
      gd.total_weight,
      gd.total_boxes,
      gd.cold_chain_required,
      gd.status,
      gd.stock_deducted,
      gd.remarks,
      gd.created_at,
      c.customer_name,
      c.customer_code,
      COALESCE(ed.docs_done_count, 0) AS docs_done_count
    FROM global_dispatch gd
    JOIN customers c ON c.id = gd.customer_id
    LEFT JOIN (
      SELECT
        global_dispatch_id,
        ${docsDoneExpression} AS docs_done_count
      FROM export_documents
    ) ed ON ed.global_dispatch_id = gd.id
    ORDER BY gd.id DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("getAllGlobalDispatches error:", err);
      return res.status(500).json({
        message: "Database error",
        error: err.message,
      });
    }

    res.json(rows);
  });
};

const getGlobalDispatchById = (req, res) => {
  const { id } = req.params;

  const headerSql = `
    SELECT
      gd.*,
      c.customer_name,
      c.customer_code,
      c.contact_person,
      c.phone,
      c.email,
      c.location_island,
      COALESCE(ed.commercial_invoice_status, 'pending') AS commercial_invoice_status,
      COALESCE(ed.packing_list_status, 'pending') AS packing_list_status,
      COALESCE(ed.phytosanitary_certificate_status, 'pending') AS phytosanitary_certificate_status,
      COALESCE(ed.airway_bill_status, 'pending') AS airway_bill_status,
      COALESCE(ed.certificate_of_origin_status, 'pending') AS certificate_of_origin_status,
      COALESCE(ed.health_certificate_status, 'pending') AS health_certificate_status,
      COALESCE(ed.insurance_certificate_status, 'pending') AS insurance_certificate_status,
      COALESCE(ed.notes, '') AS export_notes
    FROM global_dispatch gd
    JOIN customers c ON c.id = gd.customer_id
    LEFT JOIN export_documents ed ON ed.global_dispatch_id = gd.id
    WHERE gd.id = ?
    LIMIT 1
  `;

  const itemsSql = `
    SELECT
      gdi.id,
      gdi.item_id,
      gdi.batch_id,
      gdi.qty,
      COALESCE(gdi.boxes, 0) AS boxes,
      i.name AS item_name,
      ib.batch_code,
      ib.expiry_date
    FROM global_dispatch_items gdi
    JOIN items i ON i.id = gdi.item_id
    LEFT JOIN inventory_batches ib ON ib.id = gdi.batch_id
    WHERE gdi.global_dispatch_id = ?
    ORDER BY gdi.id ASC
  `;

  db.query(headerSql, [id], (headerErr, headerRows) => {
    if (headerErr) {
      console.error("getGlobalDispatchById header error:", headerErr);
      return res.status(500).json({
        message: "Database error",
        error: headerErr.message,
      });
    }

    if (!headerRows.length) {
      return res.status(404).json({ message: "Shipment not found" });
    }

    db.query(itemsSql, [id], (itemsErr, itemRows) => {
      if (itemsErr) {
        console.error("getGlobalDispatchById items error:", itemsErr);
        return res.status(500).json({
          message: "Database error",
          error: itemsErr.message,
        });
      }

      const record = headerRows[0];

      res.json({
        ...record,
        items: itemRows,
        export_documents: {
          commercial_invoice_status: record.commercial_invoice_status,
          packing_list_status: record.packing_list_status,
          phytosanitary_certificate_status: record.phytosanitary_certificate_status,
          airway_bill_status: record.airway_bill_status,
          certificate_of_origin_status: record.certificate_of_origin_status,
          health_certificate_status: record.health_certificate_status,
          insurance_certificate_status: record.insurance_certificate_status,
          notes: record.export_notes || "",
        },
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
    flight_no,
    awb_number,
    incoterm,
    cold_chain_required,
    remarks,
    items,
  } = req.body;

  const created_by = req.user?.id || null;

  if (!customer_id || !dispatch_date || !airline || !Array.isArray(items) || !items.length) {
    return res.status(400).json({
      message: "Customer, shipment date, airline and at least one item are required",
    });
  }

  const cleanedItems = items
    .map((item) => ({
      item_id: Number(item.item_id),
      batch_id: item.batch_id ? Number(item.batch_id) : null,
      qty: Number(item.qty || 0),
      boxes: Number(item.boxes || 0),
    }))
    .filter((item) => item.item_id && item.qty > 0);

  if (!cleanedItems.length) {
    return res.status(400).json({
      message: "At least one valid shipment item is required",
    });
  }

  const total_weight = cleanedItems.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const total_boxes = cleanedItems.reduce((sum, item) => sum + Number(item.boxes || 0), 0);
  const dispatchNumber = `SHP-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`;

  db.beginTransaction((txErr) => {
    if (txErr) {
      console.error("createGlobalDispatch tx error:", txErr);
      return res.status(500).json({
        message: "Database error",
        error: txErr.message,
      });
    }

    const insertHeaderSql = `
      INSERT INTO global_dispatch
      (
        dispatch_number,
        customer_id,
        dispatch_date,
        departure_date,
        airline,
        flight_no,
        awb_number,
        incoterm,
        total_weight,
        total_boxes,
        cold_chain_required,
        status,
        stock_deducted,
        remarks,
        created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'docs_pending', 0, ?, ?)
    `;

    db.query(
      insertHeaderSql,
      [
        dispatchNumber,
        customer_id,
        dispatch_date,
        departure_date || null,
        airline,
        flight_no || null,
        awb_number || null,
        incoterm || "CIF",
        total_weight,
        total_boxes,
        cold_chain_required ? 1 : 0,
        remarks || null,
        created_by,
      ],
      (headerErr, headerResult) => {
        if (headerErr) {
          return db.rollback(() => {
            console.error("createGlobalDispatch header error:", headerErr);
            res.status(500).json({
              message: "Database error",
              error: headerErr.message,
            });
          });
        }

        const globalDispatchId = headerResult.insertId;
        const insertItemSql = `
          INSERT INTO global_dispatch_items
          (
            global_dispatch_id,
            item_id,
            batch_id,
            qty,
            boxes
          )
          VALUES (?, ?, ?, ?, ?)
        `;

        let index = 0;

        const insertNextItem = () => {
          if (index >= cleanedItems.length) {
            const insertDocsSql = `
              INSERT INTO export_documents
              (
                global_dispatch_id,
                commercial_invoice_status,
                packing_list_status,
                phytosanitary_certificate_status,
                airway_bill_status,
                certificate_of_origin_status,
                health_certificate_status,
                insurance_certificate_status,
                all_cleared,
                notes,
                updated_by
              )
              VALUES (?, 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 0, NULL, ?)
            `;

            db.query(insertDocsSql, [globalDispatchId, created_by], (docsErr) => {
              if (docsErr) {
                return db.rollback(() => {
                  console.error("createGlobalDispatch docs error:", docsErr);
                  res.status(500).json({
                    message: "Database error",
                    error: docsErr.message,
                  });
                });
              }

              db.commit((commitErr) => {
                if (commitErr) {
                  return db.rollback(() => {
                    console.error("createGlobalDispatch commit error:", commitErr);
                    res.status(500).json({
                      message: "Database error",
                      error: commitErr.message,
                    });
                  });
                }

                res.status(201).json({
                  message: "Shipment created successfully",
                  globalDispatchId,
                  dispatchNumber,
                });
              });
            });

            return;
          }

          const item = cleanedItems[index];

          db.query(
            insertItemSql,
            [globalDispatchId, item.item_id, item.batch_id, item.qty, item.boxes],
            (itemErr) => {
              if (itemErr) {
                return db.rollback(() => {
                  console.error("createGlobalDispatch item error:", itemErr);
                  res.status(500).json({
                    message: "Database error",
                    error: itemErr.message,
                  });
                });
              }

              index += 1;
              insertNextItem();
            }
          );
        };

        insertNextItem();
      }
    );
  });
};

const markGlobalDispatchDelivered = (req, res) => {
  const { id } = req.params;

  const checkSql = `SELECT status FROM global_dispatch WHERE id = ? LIMIT 1`;

  db.query(checkSql, [id], (checkErr, rows) => {
    if (checkErr) {
      console.error("markGlobalDispatchDelivered check error:", checkErr);
      return res.status(500).json({
        message: "Database error",
        error: checkErr.message,
      });
    }

    if (!rows.length) {
      return res.status(404).json({ message: "Shipment not found" });
    }

    const currentStatus = String(rows[0].status || "").toLowerCase();

    if (currentStatus !== "cleared" && currentStatus !== "delivered") {
      return res.status(400).json({
        message: "Shipment must be cleared before marking delivered",
      });
    }

    const updateSql = `
      UPDATE global_dispatch
      SET status = 'delivered'
      WHERE id = ?
    `;

    db.query(updateSql, [id], (updateErr) => {
      if (updateErr) {
        console.error("markGlobalDispatchDelivered update error:", updateErr);
        return res.status(500).json({
          message: "Database error",
          error: updateErr.message,
        });
      }

      res.json({ message: "Shipment marked delivered" });
    });
  });
};

module.exports = {
  getAllGlobalDispatches,
  getGlobalDispatchById,
  createGlobalDispatch,
  markGlobalDispatchDelivered,
};