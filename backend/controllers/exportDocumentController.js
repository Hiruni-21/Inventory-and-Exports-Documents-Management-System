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

const getAllExportDocuments = (req, res) => {
  const sql = `
    SELECT
      gd.id AS global_dispatch_id,
      COALESCE(ed.id, 0) AS id,
      gd.dispatch_number,
      gd.dispatch_date,
      gd.departure_date,
      gd.status AS dispatch_status,
      gd.incoterm,
      gd.remarks,
      c.customer_name,
      c.customer_code,

      COALESCE(ed.commercial_invoice_status, 'pending') AS commercial_invoice_status,
      COALESCE(ed.packing_list_status, 'pending') AS packing_list_status,
      COALESCE(ed.phytosanitary_certificate_status, 'pending') AS phytosanitary_certificate_status,
      COALESCE(ed.airway_bill_status, 'pending') AS airway_bill_status,
      COALESCE(ed.certificate_of_origin_status, 'pending') AS certificate_of_origin_status,
      COALESCE(ed.health_certificate_status, 'pending') AS health_certificate_status,
      COALESCE(ed.insurance_certificate_status, 'pending') AS insurance_certificate_status,

      COALESCE(ed.notes, '') AS notes,
      COALESCE(ed.updated_at, gd.updated_at, gd.created_at) AS updated_at,

      CASE
        WHEN
          COALESCE(ed.commercial_invoice_status, 'pending') = 'done' AND
          COALESCE(ed.packing_list_status, 'pending') = 'done' AND
          COALESCE(ed.phytosanitary_certificate_status, 'pending') = 'done' AND
          COALESCE(ed.airway_bill_status, 'pending') = 'done' AND
          COALESCE(ed.certificate_of_origin_status, 'pending') = 'done' AND
          COALESCE(ed.health_certificate_status, 'pending') = 'done' AND
          COALESCE(ed.insurance_certificate_status, 'pending') = 'done'
        THEN 1
        ELSE 0
      END AS all_cleared
    FROM global_dispatch gd
    JOIN customers c ON c.id = gd.customer_id
    LEFT JOIN export_documents ed ON ed.global_dispatch_id = gd.id
    ORDER BY gd.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("getAllExportDocuments error:", err);
      return res.status(500).json({
        message: "Database error",
        error: err.message,
      });
    }

    res.json(results);
  });
};

const getExportDocumentsByDispatchId = (req, res) => {
  const { globalDispatchId } = req.params;

  const sql = `
    SELECT
      gd.id AS global_dispatch_id,
      COALESCE(ed.id, 0) AS id,
      gd.dispatch_number,
      gd.dispatch_date,
      gd.departure_date,
      gd.status AS dispatch_status,
      gd.incoterm,
      gd.remarks,
      c.customer_name,
      c.customer_code,

      COALESCE(ed.commercial_invoice_status, 'pending') AS commercial_invoice_status,
      COALESCE(ed.packing_list_status, 'pending') AS packing_list_status,
      COALESCE(ed.phytosanitary_certificate_status, 'pending') AS phytosanitary_certificate_status,
      COALESCE(ed.airway_bill_status, 'pending') AS airway_bill_status,
      COALESCE(ed.certificate_of_origin_status, 'pending') AS certificate_of_origin_status,
      COALESCE(ed.health_certificate_status, 'pending') AS health_certificate_status,
      COALESCE(ed.insurance_certificate_status, 'pending') AS insurance_certificate_status,

      COALESCE(ed.notes, '') AS notes,
      COALESCE(ed.updated_at, gd.updated_at, gd.created_at) AS updated_at,

      CASE
        WHEN
          COALESCE(ed.commercial_invoice_status, 'pending') = 'done' AND
          COALESCE(ed.packing_list_status, 'pending') = 'done' AND
          COALESCE(ed.phytosanitary_certificate_status, 'pending') = 'done' AND
          COALESCE(ed.airway_bill_status, 'pending') = 'done' AND
          COALESCE(ed.certificate_of_origin_status, 'pending') = 'done' AND
          COALESCE(ed.health_certificate_status, 'pending') = 'done' AND
          COALESCE(ed.insurance_certificate_status, 'pending') = 'done'
        THEN 1
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

const getExportDocumentById = (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT
      ed.id,
      ed.global_dispatch_id,
      ed.commercial_invoice_status,
      ed.packing_list_status,
      ed.phytosanitary_certificate_status,
      ed.airway_bill_status,
      ed.certificate_of_origin_status,
      ed.health_certificate_status,
      ed.insurance_certificate_status,
      ed.all_cleared,
      ed.notes,
      ed.updated_at,
      gd.dispatch_number,
      gd.dispatch_date,
      gd.departure_date,
      gd.status AS dispatch_status,
      gd.incoterm,
      c.customer_name,
      c.customer_code
    FROM export_documents ed
    JOIN global_dispatch gd ON gd.id = ed.global_dispatch_id
    JOIN customers c ON c.id = gd.customer_id
    WHERE ed.id = ?
    LIMIT 1
  `;

  db.query(sql, [id], (err, rows) => {
    if (err) {
      console.error("getExportDocumentById error:", err);
      return res.status(500).json({
        message: "Database error",
        error: err.message,
      });
    }

    if (!rows.length) {
      return res.status(404).json({ message: "Export document record not found" });
    }

    res.json(rows[0]);
  });
};

const updateExportDocumentsByDispatchId = (req, res) => {
  const { globalDispatchId } = req.params;
  const userId = req.user?.id || null;

  const statuses = normalizeStatuses(req.body);
  const notes = req.body.notes || null;

  const allCleared = Object.values(statuses).every((value) => value === "done") ? 1 : 0;
  const nextDispatchStatus = allCleared ? "cleared" : "docs_pending";

  const upsertSql = `
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
    ON DUPLICATE KEY UPDATE
      commercial_invoice_status = VALUES(commercial_invoice_status),
      packing_list_status = VALUES(packing_list_status),
      phytosanitary_certificate_status = VALUES(phytosanitary_certificate_status),
      airway_bill_status = VALUES(airway_bill_status),
      certificate_of_origin_status = VALUES(certificate_of_origin_status),
      health_certificate_status = VALUES(health_certificate_status),
      insurance_certificate_status = VALUES(insurance_certificate_status),
      all_cleared = VALUES(all_cleared),
      notes = VALUES(notes),
      updated_by = VALUES(updated_by),
      updated_at = CURRENT_TIMESTAMP
  `;

  db.query(
    upsertSql,
    [
      globalDispatchId,
      statuses.commercial_invoice_status,
      statuses.packing_list_status,
      statuses.phytosanitary_certificate_status,
      statuses.airway_bill_status,
      statuses.certificate_of_origin_status,
      statuses.health_certificate_status,
      statuses.insurance_certificate_status,
      allCleared,
      notes,
      userId,
    ],
    (err) => {
      if (err) {
        console.error("updateExportDocumentsByDispatchId error:", err);
        return res.status(500).json({
          message: "Database error",
          error: err.message,
        });
      }

      const updateDispatchSql = `
        UPDATE global_dispatch
        SET status = ?
        WHERE id = ?
          AND status <> 'delivered'
      `;

      db.query(updateDispatchSql, [nextDispatchStatus, globalDispatchId], (dispatchErr) => {
        if (dispatchErr) {
          console.error("update global_dispatch status error:", dispatchErr);
          return res.status(500).json({
            message: "Database error",
            error: dispatchErr.message,
          });
        }

        res.json({
          message: "Export document statuses updated successfully",
          all_cleared: !!allCleared,
        });
      });
    }
  );
};

const updateExportDocuments = (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id || null;

  const statuses = normalizeStatuses(req.body);
  const notes = req.body.notes || null;
  const allCleared = Object.values(statuses).every((value) => value === "done") ? 1 : 0;

  const sql = `
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
      updated_by = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      statuses.commercial_invoice_status,
      statuses.packing_list_status,
      statuses.phytosanitary_certificate_status,
      statuses.airway_bill_status,
      statuses.certificate_of_origin_status,
      statuses.health_certificate_status,
      statuses.insurance_certificate_status,
      allCleared,
      notes,
      userId,
      id,
    ],
    (err, result) => {
      if (err) {
        console.error("updateExportDocuments error:", err);
        return res.status(500).json({
          message: "Database error",
          error: err.message,
        });
      }

      if (!result.affectedRows) {
        return res.status(404).json({ message: "Export document record not found" });
      }

      res.json({
        message: "Export document statuses updated successfully",
        all_cleared: !!allCleared,
      });
    }
  );
};

module.exports = {
  getAllExportDocuments,
  getExportDocumentsByDispatchId,
  getExportDocumentById,
  updateExportDocuments,
  updateExportDocumentsByDispatchId,
};