const db = require("../config/db");

const STATUS_FIELDS = [
  "commercial_invoice_status",
  "packing_list_status",
  "phytosanitary_certificate_status",
  "airway_bill_status",
  "certificate_of_origin_status",
  "health_certificate_status",
  "insurance_certificate_status",
];

const normalizeStatuses = (body = {}) => {
  const statuses = {};
  STATUS_FIELDS.forEach((field) => {
    statuses[field] = body[field] === "done" ? "done" : "pending";
  });
  return statuses;
};

const docsDoneExpression = `
(
  (COALESCE(ed.commercial_invoice_status, 'pending') = 'done') +
  (COALESCE(ed.packing_list_status, 'pending') = 'done') +
  (COALESCE(ed.phytosanitary_certificate_status, 'pending') = 'done') +
  (COALESCE(ed.airway_bill_status, 'pending') = 'done') +
  (COALESCE(ed.certificate_of_origin_status, 'pending') = 'done') +
  (COALESCE(ed.health_certificate_status, 'pending') = 'done') +
  (COALESCE(ed.insurance_certificate_status, 'pending') = 'done')
)
`;

const getAllExportDocuments = (req, res) => {
  const sql = `
    SELECT
      gd.id AS global_dispatch_id,
      gd.dispatch_number,
      gd.dispatch_date,
      gd.departure_date,
      gd.airline,
      gd.flight_no,
      gd.awb_number,
      gd.incoterm,
      gd.status AS dispatch_status,
      gd.remarks,
      c.customer_name,
      c.customer_code,
      COALESCE(ed.id, 0) AS id,
      COALESCE(ed.commercial_invoice_status, 'pending') AS commercial_invoice_status,
      COALESCE(ed.packing_list_status, 'pending') AS packing_list_status,
      COALESCE(ed.phytosanitary_certificate_status, 'pending') AS phytosanitary_certificate_status,
      COALESCE(ed.airway_bill_status, 'pending') AS airway_bill_status,
      COALESCE(ed.certificate_of_origin_status, 'pending') AS certificate_of_origin_status,
      COALESCE(ed.health_certificate_status, 'pending') AS health_certificate_status,
      COALESCE(ed.insurance_certificate_status, 'pending') AS insurance_certificate_status,
      COALESCE(ed.notes, '') AS notes,
      COALESCE(ed.updated_at, gd.created_at) AS updated_at,
      CASE
        WHEN ${docsDoneExpression} = 7 THEN 1
        ELSE 0
      END AS all_cleared
    FROM global_dispatch gd
    JOIN customers c ON c.id = gd.customer_id
    LEFT JOIN export_documents ed ON ed.global_dispatch_id = gd.id
    ORDER BY gd.id DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("getAllExportDocuments error:", err);
      return res.status(500).json({
        message: "Database error",
        error: err.message,
      });
    }

    res.json(rows);
  });
};

const getExportDocumentsByDispatchId = (req, res) => {
  const { globalDispatchId } = req.params;

  const sql = `
    SELECT
      gd.id AS global_dispatch_id,
      gd.dispatch_number,
      gd.dispatch_date,
      gd.departure_date,
      gd.airline,
      gd.flight_no,
      gd.awb_number,
      gd.incoterm,
      gd.status AS dispatch_status,
      gd.remarks,
      c.customer_name,
      c.customer_code,
      COALESCE(ed.id, 0) AS id,
      COALESCE(ed.commercial_invoice_status, 'pending') AS commercial_invoice_status,
      COALESCE(ed.packing_list_status, 'pending') AS packing_list_status,
      COALESCE(ed.phytosanitary_certificate_status, 'pending') AS phytosanitary_certificate_status,
      COALESCE(ed.airway_bill_status, 'pending') AS airway_bill_status,
      COALESCE(ed.certificate_of_origin_status, 'pending') AS certificate_of_origin_status,
      COALESCE(ed.health_certificate_status, 'pending') AS health_certificate_status,
      COALESCE(ed.insurance_certificate_status, 'pending') AS insurance_certificate_status,
      COALESCE(ed.notes, '') AS notes,
      COALESCE(ed.updated_at, gd.created_at) AS updated_at,
      CASE
        WHEN ${docsDoneExpression} = 7 THEN 1
        ELSE 0
      END AS all_cleared
    FROM global_dispatch gd
    JOIN customers c ON c.id = gd.customer_id
    LEFT JOIN export_documents ed ON ed.global_dispatch_id = gd.id
    WHERE gd.id = ?
    LIMIT 1
  `;

  db.query(sql, [globalDispatchId], (err, rows) => {
    if (err) {
      console.error("getExportDocumentsByDispatchId error:", err);
      return res.status(500).json({
        message: "Database error",
        error: err.message,
      });
    }

    if (!rows.length) {
      return res.status(404).json({ message: "Shipment not found" });
    }

    res.json(rows[0]);
  });
};

const updateExportDocumentsByDispatchId = (req, res) => {
  const { globalDispatchId } = req.params;
  const userId = req.user?.id || null;
  const notes = req.body.notes || null;
  const statuses = normalizeStatuses(req.body);

  const allCleared = Object.values(statuses).every((value) => value === "done");
  const nextStatus = allCleared ? "cleared" : "docs_pending";

  const selectSql = `
    SELECT id
    FROM export_documents
    WHERE global_dispatch_id = ?
    LIMIT 1
  `;

  db.query(selectSql, [globalDispatchId], (selectErr, rows) => {
    if (selectErr) {
      console.error("select export_documents error:", selectErr);
      return res.status(500).json({
        message: "Database error",
        error: selectErr.message,
      });
    }

    const afterWrite = () => {
      const updateDispatchSql = `
        UPDATE global_dispatch
        SET
          status = CASE WHEN status = 'delivered' THEN status ELSE ? END,
          stock_deducted = CASE WHEN ? = 1 THEN 1 ELSE stock_deducted END
        WHERE id = ?
      `;

      db.query(updateDispatchSql, [nextStatus, allCleared ? 1 : 0, globalDispatchId], (dispatchErr) => {
        if (dispatchErr) {
          console.error("update global_dispatch from export docs error:", dispatchErr);
          return res.status(500).json({
            message: "Database error",
            error: dispatchErr.message,
          });
        }

        res.json({
          message: "Export document statuses updated successfully",
          all_cleared: allCleared,
        });
      });
    };

    if (rows.length) {
      const updateSql = `
        UPDATE export_documents
        SET
          commercial_invoice_status = ?,
          packing_list_status = ?,
          phytosanitary_certificate_status = ?,
          airway_bill_status = ?,
          certificate_of_origin_status = ?,
          health_certificate_status = ?,
          insurance_certificate_status = ?,
          all_cleared = ?,
          notes = ?,
          updated_by = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE global_dispatch_id = ?
      `;

      db.query(
        updateSql,
        [
          statuses.commercial_invoice_status,
          statuses.packing_list_status,
          statuses.phytosanitary_certificate_status,
          statuses.airway_bill_status,
          statuses.certificate_of_origin_status,
          statuses.health_certificate_status,
          statuses.insurance_certificate_status,
          allCleared ? 1 : 0,
          notes,
          userId,
          globalDispatchId,
        ],
        (updateErr) => {
          if (updateErr) {
            console.error("update export_documents error:", updateErr);
            return res.status(500).json({
              message: "Database error",
              error: updateErr.message,
            });
          }

          afterWrite();
        }
      );
    } else {
      const insertSql = `
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(
        insertSql,
        [
          globalDispatchId,
          statuses.commercial_invoice_status,
          statuses.packing_list_status,
          statuses.phytosanitary_certificate_status,
          statuses.airway_bill_status,
          statuses.certificate_of_origin_status,
          statuses.health_certificate_status,
          statuses.insurance_certificate_status,
          allCleared ? 1 : 0,
          notes,
          userId,
        ],
        (insertErr) => {
          if (insertErr) {
            console.error("insert export_documents error:", insertErr);
            return res.status(500).json({
              message: "Database error",
              error: insertErr.message,
            });
          }

          afterWrite();
        }
      );
    }
  });
};

module.exports = {
  getAllExportDocuments,
  getExportDocumentsByDispatchId,
  updateExportDocumentsByDispatchId,
};