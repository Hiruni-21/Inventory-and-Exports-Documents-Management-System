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

const ensureMissingExportDocumentRows = async () => {
  await q(`
    INSERT INTO export_documents (global_dispatch_id, all_cleared, notes, updated_by)
    SELECT gd.id, 0, NULL, NULL
    FROM global_dispatch gd
    LEFT JOIN export_documents ed ON ed.global_dispatch_id = gd.id
    WHERE ed.id IS NULL
  `);
};

const updateAllClearedStatus = async (globalDispatchId, incoterm) => {
  const reqDocs = String(incoterm || "").toUpperCase() === "CIF" ? 7 : 6;
  const countRes = await q(`SELECT COUNT(*) as count FROM shipment_documents WHERE global_dispatch_id = ?`, [globalDispatchId]);
  const docsDoneCount = countRes[0].count;
  const allCleared = docsDoneCount >= reqDocs ? 1 : 0;

  await q(`UPDATE export_documents SET all_cleared = ? WHERE global_dispatch_id = ?`, [allCleared, globalDispatchId]);
  
  if (allCleared) {
      await q(`UPDATE global_dispatch SET status = 'cleared' WHERE id = ? AND status = 'docs_pending'`, [globalDispatchId]);
  } else {
      await q(`UPDATE global_dispatch SET status = 'docs_pending' WHERE id = ? AND status = 'cleared'`, [globalDispatchId]);
  }
  
  return allCleared;
}

const getAllExportDocuments = async (req, res) => {
  try {
    await ensureMissingExportDocumentRows();

    const rows = await q(`
      SELECT
        ed.id,
        ed.global_dispatch_id,
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
        gd.total_weight,
        gd.total_boxes,
        ${CUSTOMER_DISPLAY_SQL} AS customer_name,
        (SELECT COUNT(*) FROM shipment_documents sd WHERE sd.global_dispatch_id = gd.id) AS docs_done_count
      FROM export_documents ed
      JOIN global_dispatch gd ON gd.id = ed.global_dispatch_id
      JOIN customers c ON c.id = gd.customer_id
      ORDER BY gd.id DESC
    `);

    const normalized = rows.map((row) => {
      const insuranceRequired = String(row.incoterm || "").toUpperCase() === "CIF";

      return {
        ...row,
        insurance_required: insuranceRequired,
      };
    });

    res.json(normalized);
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
      `
      SELECT
        ed.id,
        ed.global_dispatch_id,
        ed.all_cleared,
        ed.notes,
        ed.updated_at,
        gd.dispatch_number,
        gd.dispatch_date,
        gd.departure_date,
        gd.status AS dispatch_status,
        gd.incoterm,
        gd.airline,
        gd.flight_no,
        gd.awb_number,
        gd.total_weight,
        gd.total_boxes,
        ${CUSTOMER_DISPLAY_SQL} AS customer_name
      FROM export_documents ed
      JOIN global_dispatch gd ON gd.id = ed.global_dispatch_id
      JOIN customers c ON c.id = gd.customer_id
      WHERE ed.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Export document set not found" });
    }

    const docRow = rows[0];
    
    const shipmentDocs = await q(`
      SELECT sd.*, u.full_name as uploaded_by_name
      FROM shipment_documents sd
      LEFT JOIN users u ON sd.uploaded_by = u.id
      WHERE sd.global_dispatch_id = ?
    `, [docRow.global_dispatch_id]);
    
    docRow.documents = shipmentDocs;

    res.json(docRow);
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
        gd.incoterm,
        gd.id as global_dispatch_id
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

    await q(
      `
      UPDATE export_documents
      SET
        notes = ?,
        updated_by = ?
      WHERE id = ?
      `,
      [
        req.body.notes || null,
        userId,
        id,
      ]
    );

    const allCleared = await updateAllClearedStatus(existingRows[0].global_dispatch_id, existingRows[0].incoterm);

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

    const updateResult = await q(
      `
      UPDATE export_documents
      SET
        notes = ?,
        updated_by = ?
      WHERE global_dispatch_id = ?
      `,
      [
        req.body.notes || null,
        userId,
        globalDispatchId,
      ]
    );

    if (!updateResult.affectedRows) {
      return res.status(404).json({ message: "Export document set not found" });
    }
    
    const allCleared = await updateAllClearedStatus(globalDispatchId, incoterm);

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

const uploadDocument = async (req, res) => {
    try {
        const { global_dispatch_id, document_type, reference_number, expiry_date } = req.body;
        const file = req.file;
        const userId = req.user?.id || null;

        if (!global_dispatch_id || !document_type || !reference_number || !file) {
            return res.status(400).json({ message: "Missing required fields: global_dispatch_id, document_type, reference_number, or file" });
        }

        const filePath = "/uploads/export_docs/" + file.filename;

        // Use REPLACE INTO or INSERT ON DUPLICATE KEY UPDATE to handle overwrites
        await q(`
            INSERT INTO shipment_documents (global_dispatch_id, document_type, file_path, reference_number, expiry_date, uploaded_by)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                file_path = VALUES(file_path),
                reference_number = VALUES(reference_number),
                expiry_date = VALUES(expiry_date),
                uploaded_by = VALUES(uploaded_by),
                uploaded_at = CURRENT_TIMESTAMP
        `, [
            global_dispatch_id, 
            document_type, 
            filePath, 
            reference_number, 
            expiry_date || null, 
            userId
        ]);

        const dispatchRows = await q(`SELECT incoterm FROM global_dispatch WHERE id = ?`, [global_dispatch_id]);
        const incoterm = dispatchRows.length ? dispatchRows[0].incoterm : "FOB";
        
        await updateAllClearedStatus(global_dispatch_id, incoterm);

        res.json({ message: "Document uploaded successfully", file_path: filePath });
    } catch (err) {
        console.error("uploadDocument error:", err);
        res.status(500).json({ message: "Failed to upload document", error: err.message });
    }
};

module.exports = {
  getAllExportDocuments,
  getExportDocumentShipments,
  getExportDocumentById,
  updateExportDocuments,
  updateExportDocumentsByDispatchId,
  uploadDocument
};