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

const computeAllCleared = (statuses, incoterm) => {
  const requiredFields =
    String(incoterm || "").toUpperCase() === "CIF"
      ? DOC_FIELDS
      : DOC_FIELDS.filter((field) => field !== "insurance_certificate_status");

  return requiredFields.every((field) => statuses[field] === "done") ? 1 : 0;
};

let exportSchemaCache = null;

const getExportSchema = async () => {
  if (exportSchemaCache) return exportSchemaCache;

  const dispatchCols = await q(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'global_dispatch'
  `);

  const itemCols = await q(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'global_dispatch_items'
  `);

  const dispatchSet = new Set(dispatchCols.map((row) => row.COLUMN_NAME));
  const itemSet = new Set(itemCols.map((row) => row.COLUMN_NAME));

  exportSchemaCache = {
    hasFlightNo: dispatchSet.has("flight_no"),
    hasAwbNumber: dispatchSet.has("awb_number"),
    hasTotalWeight: dispatchSet.has("total_weight"),
    hasTotalBoxes: dispatchSet.has("total_boxes"),
    hasItemBoxes: itemSet.has("boxes"),
  };

  return exportSchemaCache;
};

const parseDispatchMetaFromRemarks = (remarks) => {
  const raw = String(remarks || "");
  const flightMatch = raw.match(/Flight No:\s*(.+)/i);
  const awbMatch = raw.match(/AWB No:\s*(.+)/i);

  return {
    flight_no: flightMatch ? flightMatch[1].trim() : "",
    awb_number: awbMatch ? awbMatch[1].trim() : "",
  };
};

const normalizeExportRow = (row) => {
  const parsed = parseDispatchMetaFromRemarks(row.remarks);
  const insuranceRequired = String(row.incoterm || "").toUpperCase() === "CIF";
  const docsDoneCount = (
    insuranceRequired
      ? DOC_FIELDS
      : DOC_FIELDS.filter((field) => field !== "insurance_certificate_status")
  ).filter((field) => row[field] === "done").length;

  return {
    ...row,
    flight_no: row.flight_no || parsed.flight_no || "",
    awb_number: row.awb_number || parsed.awb_number || "",
    docs_done_count: docsDoneCount,
    insurance_required: insuranceRequired,
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

const getTotalsJoinSql = (schema) => `
  LEFT JOIN (
    SELECT
      global_dispatch_id,
      COALESCE(SUM(qty), 0) AS total_weight
      ${schema.hasItemBoxes ? `, COALESCE(SUM(boxes), 0) AS total_boxes` : ``}
    FROM global_dispatch_items
    GROUP BY global_dispatch_id
  ) it ON it.global_dispatch_id = gd.id
`;

const getAllExportDocuments = async (req, res) => {
  try {
    await ensureMissingExportDocumentRows();
    const schema = await getExportSchema();

    const rows = await q(`
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
        gd.airline,
        ${schema.hasFlightNo ? "gd.flight_no" : "NULL AS flight_no"},
        ${schema.hasAwbNumber ? "gd.awb_number" : "NULL AS awb_number"},
        gd.incoterm,
        ${schema.hasTotalWeight ? "gd.total_weight" : "COALESCE(it.total_weight, 0) AS total_weight"},
        ${
          schema.hasTotalBoxes
            ? "gd.total_boxes"
            : schema.hasItemBoxes
            ? "COALESCE(it.total_boxes, 0) AS total_boxes"
            : "0 AS total_boxes"
        },
        gd.remarks,
        ${CUSTOMER_DISPLAY_SQL} AS customer_name
      FROM export_documents ed
      JOIN global_dispatch gd ON gd.id = ed.global_dispatch_id
      JOIN customers c ON c.id = gd.customer_id
      ${getTotalsJoinSql(schema)}
      ORDER BY gd.id DESC
    `);

    res.json(rows.map(normalizeExportRow));
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
    const schema = await getExportSchema();

    const rows = await q(`
      SELECT
        gd.id,
        gd.dispatch_number,
        gd.dispatch_date,
        gd.status,
        gd.incoterm,
        gd.airline,
        ${schema.hasFlightNo ? "gd.flight_no" : "NULL AS flight_no"},
        ${schema.hasAwbNumber ? "gd.awb_number" : "NULL AS awb_number"},
        gd.remarks,
        ${CUSTOMER_DISPLAY_SQL} AS customer_name
      FROM global_dispatch gd
      JOIN customers c ON c.id = gd.customer_id
      ORDER BY gd.id DESC
    `);

    res.json(rows.map(normalizeExportRow));
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
    const schema = await getExportSchema();

    const rows = await q(
      `
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
        gd.airline,
        ${schema.hasFlightNo ? "gd.flight_no" : "NULL AS flight_no"},
        ${schema.hasAwbNumber ? "gd.awb_number" : "NULL AS awb_number"},
        ${schema.hasTotalWeight ? "gd.total_weight" : "COALESCE(it.total_weight, 0) AS total_weight"},
        ${
          schema.hasTotalBoxes
            ? "gd.total_boxes"
            : schema.hasItemBoxes
            ? "COALESCE(it.total_boxes, 0) AS total_boxes"
            : "0 AS total_boxes"
        },
        gd.remarks,
        ${CUSTOMER_DISPLAY_SQL} AS customer_name
      FROM export_documents ed
      JOIN global_dispatch gd ON gd.id = ed.global_dispatch_id
      JOIN customers c ON c.id = gd.customer_id
      ${getTotalsJoinSql(schema)}
      WHERE ed.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Export document set not found" });
    }

    res.json(normalizeExportRow(rows[0]));
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

module.exports = {
  getAllExportDocuments,
  getExportDocumentShipments,
  getExportDocumentById,
  updateExportDocuments,
  updateExportDocumentsByDispatchId,
};