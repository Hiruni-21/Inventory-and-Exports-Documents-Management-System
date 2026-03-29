const db = require("../config/db");

const getAllExportDocuments = (req, res) => {
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
      gd.status AS dispatch_status,
      c.name AS customer_name
    FROM export_documents ed
    JOIN global_dispatch gd ON gd.id = ed.global_dispatch_id
    JOIN customers c ON c.id = gd.customer_id
    ORDER BY ed.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("getAllExportDocuments error:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }
    res.json(results);
  });
};

const getExportDocumentById = (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT
      ed.*,
      gd.dispatch_number,
      gd.dispatch_date,
      gd.departure_date,
      gd.status AS dispatch_status,
      gd.incoterm,
      c.name AS customer_name,
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
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (!rows.length) {
      return res.status(404).json({ message: "Export document record not found" });
    }

    res.json(rows[0]);
  });
};

const updateExportDocuments = (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id || null;

  const {
    commercial_invoice_status,
    packing_list_status,
    phytosanitary_certificate_status,
    airway_bill_status,
    certificate_of_origin_status,
    health_certificate_status,
    insurance_certificate_status,
    notes,
  } = req.body;

  const statuses = {
    commercial_invoice_status: commercial_invoice_status || "pending",
    packing_list_status: packing_list_status || "pending",
    phytosanitary_certificate_status: phytosanitary_certificate_status || "pending",
    airway_bill_status: airway_bill_status || "pending",
    certificate_of_origin_status: certificate_of_origin_status || "pending",
    health_certificate_status: health_certificate_status || "pending",
    insurance_certificate_status: insurance_certificate_status || "pending",
  };

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
      notes || null,
      userId,
      id,
    ],
    (err) => {
      if (err) {
        console.error("updateExportDocuments error:", err);
        return res.status(500).json({ message: "Database error", error: err.message });
      }

      res.json({
        message: "Export document statuses updated successfully",
        all_cleared: !!allCleared,
      });
    }
  );
};

const updateExportDocumentsByDispatchId = (req, res) => {
  const { globalDispatchId } = req.params;
  const userId = req.user?.id || null;

  const {
    commercial_invoice_status,
    packing_list_status,
    phytosanitary_certificate_status,
    airway_bill_status,
    certificate_of_origin_status,
    health_certificate_status,
    insurance_certificate_status,
    notes,
  } = req.body;

  const statuses = {
    commercial_invoice_status: commercial_invoice_status || "pending",
    packing_list_status: packing_list_status || "pending",
    phytosanitary_certificate_status: phytosanitary_certificate_status || "pending",
    airway_bill_status: airway_bill_status || "pending",
    certificate_of_origin_status: certificate_of_origin_status || "pending",
    health_certificate_status: health_certificate_status || "pending",
    insurance_certificate_status: insurance_certificate_status || "pending",
  };

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
    WHERE global_dispatch_id = ?
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
      notes || null,
      userId,
      globalDispatchId,
    ],
    (err, result) => {
      if (err) {
        console.error("updateExportDocumentsByDispatchId error:", err);
        return res.status(500).json({ message: "Database error", error: err.message });
      }

      if (!result.affectedRows) {
        return res.status(404).json({ message: "Export document record not found for this dispatch" });
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
  getExportDocumentById,
  updateExportDocuments,
  updateExportDocumentsByDispatchId,
};