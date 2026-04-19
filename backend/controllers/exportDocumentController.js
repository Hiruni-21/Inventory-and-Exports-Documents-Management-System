const fs = require("fs");
const path = require("path");
const db = require("../config/db");

const CUSTOMER_DISPLAY_SQL = `
  CASE
    WHEN c.location_island IS NOT NULL AND TRIM(c.location_island) <> ''
      THEN CONCAT(c.customer_name, ' — ', c.location_island)
    WHEN c.city IS NOT NULL AND TRIM(c.city) <> ''
      THEN CONCAT(c.customer_name, ' — ', c.city)
    ELSE c.customer_name
  END
`;

const q = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

const DOC_FIELDS = [
  "commercial_invoice_status",
  "packing_list_status",
  "phytosanitary_certificate_status",
  "airway_bill_status",
  "certificate_of_origin_status",
  "health_certificate_status",
  "insurance_certificate_status",
];

const FILE_FIELDS = [
  "commercial_invoice_file",
  "packing_list_file",
  "phytosanitary_certificate_file",
  "airway_bill_file",
  "certificate_of_origin_file",
  "health_certificate_file",
  "insurance_certificate_file",
];

const DOC_UPLOAD_MAP = {
  commercial_invoice: {
    statusField: "commercial_invoice_status",
    fileField: "commercial_invoice_file",
    label: "Commercial Invoice",
  },
  packing_list: {
    statusField: "packing_list_status",
    fileField: "packing_list_file",
    label: "Packing List",
  },
  phytosanitary_certificate: {
    statusField: "phytosanitary_certificate_status",
    fileField: "phytosanitary_certificate_file",
    label: "Phytosanitary Certificate",
  },
  airway_bill: {
    statusField: "airway_bill_status",
    fileField: "airway_bill_file",
    label: "Airway Bill",
  },
  certificate_of_origin: {
    statusField: "certificate_of_origin_status",
    fileField: "certificate_of_origin_file",
    label: "Certificate of Origin",
  },
  health_certificate: {
    statusField: "health_certificate_status",
    fileField: "health_certificate_file",
    label: "Health Certificate",
  },
  insurance_certificate: {
    statusField: "insurance_certificate_status",
    fileField: "insurance_certificate_file",
    label: "Insurance Certificate",
  },
};

const computeAllCleared = (statuses, incoterm) => {
  const requiredFields =
    String(incoterm || "").toUpperCase() === "CIF"
      ? DOC_FIELDS
      : DOC_FIELDS.filter((field) => field !== "insurance_certificate_status");

  return requiredFields.every((field) => statuses[field] === "done") ? 1 : 0;
};

const resolveDocConfig = (docType = "") => {
  const normalized = String(docType)
    .trim()
    .toLowerCase()
    .replace(/_status$/, "")
    .replace(/_file$/, "")
    .replace(/[^a-z_]/g, "");

  return DOC_UPLOAD_MAP[normalized] || null;
};

const removeStoredFile = (storedPath) => {
  if (!storedPath) return;

  try {
    const relativePath = String(storedPath).replace(/^\/+/, "");
    const absolutePath = path.join(__dirname, "..", relativePath);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  } catch (err) {
    console.warn("removeStoredFile warning:", err.message);
  }
};

const serializeExportRow = (row) => {
  const insuranceRequired = String(row.incoterm || "").toUpperCase() === "CIF";
  const docsDoneCount = (
    insuranceRequired
      ? DOC_FIELDS
      : DOC_FIELDS.filter((field) => field !== "insurance_certificate_status")
  ).filter((field) => row[field] === "done").length;

  return {
    ...row,
    docs_done_count: docsDoneCount,
    insurance_required: insuranceRequired,
    has_any_files: FILE_FIELDS.some((field) => !!row[field]),
  };
};

const ensureMissingExportDocumentRows = async () => {
  await q(`
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
    SELECT
      gd.id,
      'pending',
      'pending',
      'pending',
      'pending',
      'pending',
      'pending',
      'pending',
      0,
      NULL,
      NULL
    FROM global_dispatch gd
    LEFT JOIN export_documents ed ON ed.global_dispatch_id = gd.id
    WHERE ed.id IS NULL
  `);
};

const exportSelectSql = `
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
    ed.commercial_invoice_file,
    ed.packing_list_file,
    ed.phytosanitary_certificate_file,
    ed.airway_bill_file,
    ed.certificate_of_origin_file,
    ed.health_certificate_file,
    ed.insurance_certificate_file,
    ed.all_cleared,
    ed.notes,
    ed.updated_at,
    gd.dispatch_number,
    gd.dispatch_date,
    gd.departure_date,
    gd.status AS dispatch_status,
    gd.airline,
    gd.flight_no,
    gd.awb_number,
    gd.incoterm,
    0 AS total_weight,
    0 AS total_boxes,
    ${CUSTOMER_DISPLAY_SQL} AS customer_name
  FROM export_documents ed
  JOIN global_dispatch gd ON gd.id = ed.global_dispatch_id
  JOIN customers c ON c.id = gd.customer_id
`;
const getExportDocumentRowByDispatchId = async (globalDispatchId) => {
  const rows = await q(
    `${exportSelectSql} WHERE ed.global_dispatch_id = ? LIMIT 1`,
    [globalDispatchId]
  );

  return rows.length ? serializeExportRow(rows[0]) : null;
};

const getAllExportDocuments = async (req, res) => {
  try {
    await ensureMissingExportDocumentRows();

    const rows = await q(`
      ${exportSelectSql}
      ORDER BY gd.id DESC
    `);

    res.json(rows.map(serializeExportRow));
  } catch (err) {
    console.error("getAllExportDocuments error:", err);
    res.status(500).json({
      message: "Failed to load export documents",
      error: err.message,
    });
  }
};

const getExportDocumentShipments = async (req, res) => {
  try {
    await ensureMissingExportDocumentRows();

    const rows = await q(`
      SELECT
        gd.id,
        gd.dispatch_number,
        gd.dispatch_date,
        gd.status,
        gd.incoterm,
        gd.airline,
        gd.flight_no,
        gd.awb_number,
        ${CUSTOMER_DISPLAY_SQL} AS customer_name
      FROM global_dispatch gd
      JOIN customers c ON c.id = gd.customer_id
      ORDER BY gd.id DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error("getExportDocumentShipments error:", err);
    res.status(500).json({
      message: "Failed to load shipments",
      error: err.message,
    });
  }
};

const getExportDocumentById = async (req, res) => {
  const { id } = req.params;

  try {
    const rows = await q(
      `${exportSelectSql} WHERE ed.id = ? LIMIT 1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Export document set not found" });
    }

    res.json(serializeExportRow(rows[0]));
  } catch (err) {
    console.error("getExportDocumentById error:", err);
    res.status(500).json({
      message: "Failed to load export document set",
      error: err.message,
    });
  }
};

const updateExportDocuments = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id || null;

  try {
    const existingRows = await q(
      `
      SELECT
        ed.id,
        gd.incoterm
      FROM export_documents ed
      JOIN global_dispatch gd ON gd.id = ed.global_dispatch_id
      WHERE ed.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!existingRows.length) {
      return res.status(404).json({ message: "Export document set not found" });
    }

    const incoterm = existingRows[0].incoterm;

    const statuses = {
      commercial_invoice_status: req.body.commercial_invoice_status || "pending",
      packing_list_status: req.body.packing_list_status || "pending",
      phytosanitary_certificate_status: req.body.phytosanitary_certificate_status || "pending",
      airway_bill_status: req.body.airway_bill_status || "pending",
      certificate_of_origin_status: req.body.certificate_of_origin_status || "pending",
      health_certificate_status: req.body.health_certificate_status || "pending",
      insurance_certificate_status: req.body.insurance_certificate_status || "pending",
    };

    const allCleared = computeAllCleared(statuses, incoterm);

    await q(
      `
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
      `,
      [
        statuses.commercial_invoice_status,
        statuses.packing_list_status,
        statuses.phytosanitary_certificate_status,
        statuses.airway_bill_status,
        statuses.certificate_of_origin_status,
        statuses.health_certificate_status,
        statuses.insurance_certificate_status,
        allCleared,
        req.body.notes || null,
        userId,
        id,
      ]
    );

    res.json({
      message: "Export document set updated successfully",
      all_cleared: !!allCleared,
    });
  } catch (err) {
    console.error("updateExportDocuments error:", err);
    res.status(500).json({
      message: "Failed to update export document set",
      error: err.message,
    });
  }
};

const updateExportDocumentsByDispatchId = async (req, res) => {
  const { globalDispatchId } = req.params;
  const userId = req.user?.id || null;

  try {
    await ensureMissingExportDocumentRows();

    const dispatchRows = await q(
      `
      SELECT id, incoterm
      FROM global_dispatch
      WHERE id = ?
      LIMIT 1
      `,
      [globalDispatchId]
    );

    if (!dispatchRows.length) {
      return res.status(404).json({ message: "Shipment not found" });
    }

    const incoterm = dispatchRows[0].incoterm;

    const statuses = {
      commercial_invoice_status: req.body.commercial_invoice_status || "pending",
      packing_list_status: req.body.packing_list_status || "pending",
      phytosanitary_certificate_status: req.body.phytosanitary_certificate_status || "pending",
      airway_bill_status: req.body.airway_bill_status || "pending",
      certificate_of_origin_status: req.body.certificate_of_origin_status || "pending",
      health_certificate_status: req.body.health_certificate_status || "pending",
      insurance_certificate_status: req.body.insurance_certificate_status || "pending",
    };

    const allCleared = computeAllCleared(statuses, incoterm);

    const updateResult = await q(
      `
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
      `,
      [
        statuses.commercial_invoice_status,
        statuses.packing_list_status,
        statuses.phytosanitary_certificate_status,
        statuses.airway_bill_status,
        statuses.certificate_of_origin_status,
        statuses.health_certificate_status,
        statuses.insurance_certificate_status,
        allCleared,
        req.body.notes || null,
        userId,
        globalDispatchId,
      ]
    );

    if (!updateResult.affectedRows) {
      return res.status(404).json({ message: "Export document set not found" });
    }

    await q(
      `
      UPDATE global_dispatch
      SET status = CASE
        WHEN status = 'created' THEN 'docs_pending'
        ELSE status
      END
      WHERE id = ?
      `,
      [globalDispatchId]
    );

    res.json({
      message: "Export document set updated successfully",
      all_cleared: !!allCleared,
    });
  } catch (err) {
    console.error("updateExportDocumentsByDispatchId error:", err);
    res.status(500).json({
      message: "Failed to update export document set",
      error: err.message,
    });
  }
};

const uploadExportDocumentFile = async (req, res) => {
  const { globalDispatchId, docType } = req.params;
  const userId = req.user?.id || null;
  const config = resolveDocConfig(docType);

  try {
    if (!config) {
      return res.status(400).json({ message: "Invalid document type" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Please choose a file to upload" });
    }

    await ensureMissingExportDocumentRows();

    const rows = await q(
      `
      SELECT
        ed.id,
        ed.${config.fileField} AS existing_file,
        gd.incoterm
      FROM export_documents ed
      JOIN global_dispatch gd ON gd.id = ed.global_dispatch_id
      WHERE ed.global_dispatch_id = ?
      LIMIT 1
      `,
      [globalDispatchId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Export document set not found" });
    }

    const current = rows[0];
    const storedPath = `/uploads/export-docs/${req.file.filename}`;

    const statusesRows = await q(
      `
      SELECT
        commercial_invoice_status,
        packing_list_status,
        phytosanitary_certificate_status,
        airway_bill_status,
        certificate_of_origin_status,
        health_certificate_status,
        insurance_certificate_status
      FROM export_documents
      WHERE global_dispatch_id = ?
      LIMIT 1
      `,
      [globalDispatchId]
    );

    const statuses = statusesRows[0] || {};
    statuses[config.statusField] = "done";
    const allCleared = computeAllCleared(statuses, current.incoterm);

    await q(
      `
      UPDATE export_documents
      SET
        ${config.fileField} = ?,
        ${config.statusField} = 'done',
        all_cleared = ?,
        updated_by = ?
      WHERE global_dispatch_id = ?
      `,
      [storedPath, allCleared, userId, globalDispatchId]
    );

    removeStoredFile(current.existing_file);

    const updatedRow = await getExportDocumentRowByDispatchId(globalDispatchId);

    res.json({
      message: `${config.label} uploaded successfully`,
      document: updatedRow,
      uploaded_field: config.fileField,
      uploaded_status_field: config.statusField,
      file_path: storedPath,
    });
  } catch (err) {
    console.error("uploadExportDocumentFile error:", err);
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      message: "Failed to upload export document",
      error: err.message,
    });
  }
};

module.exports = {
  getAllExportDocuments,
  getExportDocumentShipments,
  getExportDocumentById,
  updateExportDocuments,
  updateExportDocumentsByDispatchId,
  uploadExportDocumentFile,
};