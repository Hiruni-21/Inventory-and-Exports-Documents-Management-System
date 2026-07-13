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
    LEFT JOIN item_categories c ON i.category_id = c.id
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


const getDispatchReport = (req, res) => {
  const { start_date, end_date } = req.query;

  let sql = `
    SELECT
      d.id,
      d.dispatch_number,
      d.client_name,
      d.dispatch_date,
      d.remarks,
      COALESCE(NULLIF(u.full_name, ''), u.email, 'System User') AS created_by_name
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
  const { from, to, category } = req.query;

  let sql = `
    SELECT
      i.name as item_name,
      c.category_name,
      SUM(wi.quantity) as total_qty,
      SUM(wi.quantity * i.unit_cost) as estimated_loss
    FROM wastage w
    JOIN wastage_items wi ON w.id = wi.wastage_id
    JOIN items i ON wi.item_id = i.id
    LEFT JOIN item_categories c ON i.category_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (from && to) {
    sql += ` AND w.wastage_date BETWEEN ? AND ? `;
    params.push(from, to);
  }
  
  if (category && category !== "All Categories") {
    sql += ` AND c.category_name = ? `;
    params.push(category);
  }

  sql += ` GROUP BY i.id, i.name, c.category_name ORDER BY estimated_loss DESC `;

  db.query(sql, params, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }
    res.json(results);
  });
};

const getReturnReport = (req, res) => {
  const { from, to, category } = req.query;

  let sql = `
    SELECT
      rn.status as return_type,
      i.name as item_name,
      c.category_name,
      SUM(rni.quantity) as total_qty,
      SUM(rni.quantity * i.unit_cost) as estimated_value
    FROM return_notes rn
    JOIN return_note_items rni ON rn.id = rni.return_note_id
    JOIN items i ON rni.item_id = i.id
    LEFT JOIN item_categories c ON i.category_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (from && to) {
    sql += ` AND rn.return_date BETWEEN ? AND ? `;
    params.push(from, to);
  }
  
  if (category && category !== "All Categories") {
    sql += ` AND c.category_name = ? `;
    params.push(category);
  }

  sql += ` GROUP BY rn.status, i.id, i.name, c.category_name ORDER BY estimated_value DESC `;

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
      COALESCE(NULLIF(u.full_name, ''), u.email, 'System User') AS created_by_name
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

const getSupplierPurchaseReport = (req, res) => {
  const { from, to, category } = req.query;

  let sql = `
    SELECT 
      s.supplier_name, 
      COUNT(DISTINCT po.id) as order_count, 
      SUM(poi.quantity) as total_items,
      SUM(poi.quantity * poi.unit_price) as total_spend 
    FROM purchase_orders po 
    JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
    JOIN suppliers s ON po.supplier_id = s.id
    JOIN items i ON poi.item_id = i.id
    LEFT JOIN item_categories c ON i.category_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (from && to) {
    sql += ` AND po.order_date BETWEEN ? AND ? `;
    params.push(from, to);
  }
  
  if (category && category !== "All Categories") {
    sql += ` AND c.category_name = ? `;
    params.push(category);
  }

  sql += ` GROUP BY s.id, s.supplier_name ORDER BY total_spend DESC `;

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ message: "Database error", error: err.message });
    res.json(results);
  });
};

const getStockValuationReport = (req, res) => {
  const { category } = req.query;

  let sql = `
    SELECT 
      i.name as item_name,
      c.category_name,
      SUM(ib.available_quantity) as total_stock,
      SUM(ib.available_quantity * i.unit_cost) as total_value
    FROM inventory_batches ib 
    JOIN items i ON ib.item_id = i.id
    LEFT JOIN item_categories c ON i.category_id = c.id
    WHERE ib.available_quantity > 0
  `;
  const params = [];

  if (category && category !== "All Categories") {
    sql += ` AND c.category_name = ? `;
    params.push(category);
  }

  sql += ` GROUP BY i.id, i.name, c.category_name ORDER BY total_value DESC `;

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ message: "Database error", error: err.message });
    res.json(results);
  });
};

module.exports = {
  getStockSummaryReport,
  getLowStockReport,
  getDispatchReport,
  getWastageReport,
  getReturnReport,
  getExportDocumentReport,
  getSupplierPurchaseReport,
  getStockValuationReport,
};