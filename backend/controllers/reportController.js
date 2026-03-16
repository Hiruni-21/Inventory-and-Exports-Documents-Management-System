const db = require("../config/db");

const getStockSummaryReport = (req, res) => {
  const sql = `
    SELECT
      ib.id AS batch_id,
      i.item_code,
      i.item_name,
      i.unit,
      c.category_name,
      ib.batch_code,
      ib.available_quantity,
      ib.status,
      ib.expiry_date
    FROM inventory_batches ib
    JOIN items i ON ib.item_id = i.id
    LEFT JOIN categories c ON i.category_id = c.id
    ORDER BY i.item_name ASC, ib.batch_code ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }
    res.json(results);
  });
};

const getLowStockReport = (req, res) => {
  const sql = `
    SELECT
      ib.id AS batch_id,
      i.item_code,
      i.item_name,
      i.unit,
      ib.batch_code,
      ib.available_quantity,
      ib.status
    FROM inventory_batches ib
    JOIN items i ON ib.item_id = i.id
    WHERE ib.available_quantity > 0
      AND ib.available_quantity <= 10
    ORDER BY ib.available_quantity ASC, i.item_name ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }
    res.json(results);
  });
};

const getStockMovementsReport = (req, res) => {
  const { start_date, end_date } = req.query;

  let sql = `
    SELECT
      sm.id,
      i.item_code,
      i.item_name,
      i.unit,
      sm.movement_type,
      sm.reference_type,
      sm.reference_id,
      sm.quantity,
      sm.notes,
      sm.created_at
    FROM stock_movements sm
    JOIN items i ON sm.item_id = i.id
  `;

  const params = [];

  if (start_date && end_date) {
    sql += ` WHERE DATE(sm.created_at) BETWEEN ? AND ? `;
    params.push(start_date, end_date);
  }

  sql += ` ORDER BY sm.id DESC `;

  db.query(sql, params, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }
    res.json(results);
  });
};

const getDispatchReport = (req, res) => {
  const { start_date, end_date } = req.query;

  let sql = `
    SELECT
      d.id,
      d.dispatch_number,
      d.client_name,
      d.dispatch_date,
      d.remarks,
      u.name AS created_by_name
    FROM dispatch_records d
    LEFT JOIN users u ON d.created_by = u.id
  `;

  const params = [];

  if (start_date && end_date) {
    sql += ` WHERE d.dispatch_date BETWEEN ? AND ? `;
    params.push(start_date, end_date);
  }

  sql += ` ORDER BY d.id DESC `;

  db.query(sql, params, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }
    res.json(results);
  });
};

const getWastageReport = (req, res) => {
  const { start_date, end_date } = req.query;

  let sql = `
    SELECT
      w.id,
      w.wastage_number,
      w.wastage_date,
      w.reason,
      w.remarks,
      u.name AS created_by_name
    FROM wastage_records w
    LEFT JOIN users u ON w.created_by = u.id
  `;

  const params = [];

  if (start_date && end_date) {
    sql += ` WHERE w.wastage_date BETWEEN ? AND ? `;
    params.push(start_date, end_date);
  }

  sql += ` ORDER BY w.id DESC `;

  db.query(sql, params, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }
    res.json(results);
  });
};

const getReturnReport = (req, res) => {
  const { start_date, end_date } = req.query;

  let sql = `
    SELECT
      r.id,
      r.return_number,
      r.return_date,
      r.return_type,
      r.reference_number,
      r.remarks,
      u.name AS created_by_name
    FROM return_records r
    LEFT JOIN users u ON r.created_by = u.id
  `;

  const params = [];

  if (start_date && end_date) {
    sql += ` WHERE r.return_date BETWEEN ? AND ? `;
    params.push(start_date, end_date);
  }

  sql += ` ORDER BY r.id DESC `;

  db.query(sql, params, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }
    res.json(results);
  });
};

const getExportDocumentReport = (req, res) => {
  const { start_date, end_date } = req.query;

  let sql = `
    SELECT
      ed.id,
      ed.document_type,
      ed.document_number,
      ed.document_date,
      ed.consignee_name,
      ed.destination_country,
      dr.dispatch_number,
      dr.client_name,
      u.name AS created_by_name
    FROM export_documents ed
    JOIN dispatch_records dr ON ed.dispatch_id = dr.id
    LEFT JOIN users u ON ed.created_by = u.id
  `;

  const params = [];

  if (start_date && end_date) {
    sql += ` WHERE ed.document_date BETWEEN ? AND ? `;
    params.push(start_date, end_date);
  }

  sql += ` ORDER BY ed.id DESC `;

  db.query(sql, params, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }
    res.json(results);
  });
};

module.exports = {
  getStockSummaryReport,
  getLowStockReport,
  getStockMovementsReport,
  getDispatchReport,
  getWastageReport,
  getReturnReport,
  getExportDocumentReport,
};