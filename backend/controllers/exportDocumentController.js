const db = require("../config/db");

const getAllExportDocuments = (req, res) => {
  const sql = `
    SELECT
      ed.id,
      ed.document_type,
      ed.document_number,
      ed.document_date,
      ed.consignee_name,
      ed.destination_country,
      ed.port_of_loading,
      ed.port_of_discharge,
      ed.remarks,
      ed.created_at,
      dr.dispatch_number,
      dr.client_name,
      u.name AS created_by_name
    FROM export_documents ed
    JOIN dispatch_records dr ON ed.dispatch_id = dr.id
    LEFT JOIN users u ON ed.created_by = u.id
    ORDER BY ed.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json(results);
  });
};

const getExportDocumentById = (req, res) => {
  const { id } = req.params;

  const exportDocSql = `
    SELECT
      ed.*,
      dr.dispatch_number,
      dr.client_name,
      u.name AS created_by_name
    FROM export_documents ed
    JOIN dispatch_records dr ON ed.dispatch_id = dr.id
    LEFT JOIN users u ON ed.created_by = u.id
    WHERE ed.id = ?
  `;

  const itemsSql = `
    SELECT
      edi.id,
      edi.quantity,
      edi.unit_price,
      edi.total_value,
      i.item_code,
      i.item_name,
      i.unit,
      ib.batch_code
    FROM export_document_items edi
    JOIN items i ON edi.item_id = i.id
    JOIN inventory_batches ib ON edi.batch_id = ib.id
    WHERE edi.export_document_id = ?
  `;

  db.query(exportDocSql, [id], (err, docResults) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (docResults.length === 0) {
      return res.status(404).json({ message: "Export document not found" });
    }

    db.query(itemsSql, [id], (itemErr, itemResults) => {
      if (itemErr) {
        return res.status(500).json({ message: "Database error", error: itemErr.message });
      }

      res.json({
        ...docResults[0],
        items: itemResults,
      });
    });
  });
};

const getDispatchListForExport = (req, res) => {
  const sql = `
    SELECT
      id,
      dispatch_number,
      client_name,
      dispatch_date
    FROM dispatch_records
    ORDER BY id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json(results);
  });
};

const getDispatchItemsForExport = (req, res) => {
  const { dispatchId } = req.params;

  const sql = `
    SELECT
      di.item_id,
      di.batch_id,
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

  db.query(sql, [dispatchId], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json(results);
  });
};

const createExportDocument = (req, res) => {
  const {
    dispatch_id,
    document_type,
    document_date,
    consignee_name,
    destination_country,
    port_of_loading,
    port_of_discharge,
    remarks,
    items,
  } = req.body;

  const created_by = req.user.id;

  if (!dispatch_id || !document_type || !document_date || !consignee_name || !items || items.length === 0) {
    return res.status(400).json({ message: "Required fields are missing" });
  }

  const documentNumber = `EXP-${Date.now()}`;

  const exportDocSql = `
    INSERT INTO export_documents
    (
      dispatch_id,
      document_type,
      document_number,
      document_date,
      consignee_name,
      destination_country,
      port_of_loading,
      port_of_discharge,
      remarks,
      created_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    exportDocSql,
    [
      dispatch_id,
      document_type,
      documentNumber,
      document_date,
      consignee_name,
      destination_country || null,
      port_of_loading || null,
      port_of_discharge || null,
      remarks || null,
      created_by,
    ],
    (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err.message });
      }

      const exportDocumentId = result.insertId;

      let processed = 0;
      let failed = false;

      items.forEach((item) => {
        const qty = parseFloat(item.quantity || 0);
        const price = parseFloat(item.unit_price || 0);
        const total = qty * price;

        const insertItemSql = `
          INSERT INTO export_document_items
          (export_document_id, item_id, batch_id, quantity, unit_price, total_value)
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        db.query(
          insertItemSql,
          [exportDocumentId, item.item_id, item.batch_id, qty, price, total],
          (itemErr) => {
            if (failed) return;

            if (itemErr) {
              failed = true;
              return res.status(500).json({ message: "Database error", error: itemErr.message });
            }

            processed += 1;

            if (processed === items.length) {
              return res.status(201).json({
                message: "Export document created successfully",
                exportDocumentId,
                documentNumber,
              });
            }
          }
        );
      });
    }
  );
};

module.exports = {
  getAllExportDocuments,
  getExportDocumentById,
  getDispatchListForExport,
  getDispatchItemsForExport,
  createExportDocument,
};