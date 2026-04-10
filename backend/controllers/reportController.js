const db = require("../config/db");

const CUSTOMER_LOCAL_SQL = `
  CASE
    WHEN c.city IS NOT NULL AND TRIM(c.city) <> ''
      THEN CONCAT(c.customer_name, ' — ', c.city)
    ELSE c.customer_name
  END
`;

const CUSTOMER_GLOBAL_SQL = `
  CASE
    WHEN c.location_island IS NOT NULL AND TRIM(c.location_island) <> ''
      THEN CONCAT(c.customer_name, ' — ', c.location_island)
    WHEN c.city IS NOT NULL AND TRIM(c.city) <> ''
      THEN CONCAT(c.customer_name, ' — ', c.city)
    ELSE c.customer_name
  END
`;

const getStockSummaryReport = (req, res) => {
  const sql = `
    SELECT
      ib.id AS batch_id,
      i.code AS item_code,
      i.name AS item_name,
      i.unit,
      ic.category_name,
      ib.batch_code,
      ib.available_quantity,
      ib.status,
      ib.expiry_date
    FROM inventory_batches ib
    JOIN items i ON ib.item_id = i.id
    LEFT JOIN item_categories ic ON i.category_id = ic.id
    ORDER BY i.name ASC, ib.batch_code ASC
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
      i.id AS item_id,
      i.code AS item_code,
      i.name AS item_name,
      ic.category_name,
      i.unit,
      COALESCE(i.reorder_level, 0) AS reorder_level,
      COALESCE(inv.qty_available, 0) AS available_quantity,
      (COALESCE(i.reorder_level, 0) - COALESCE(inv.qty_available, 0)) AS shortage
    FROM items i
    LEFT JOIN inventory inv ON inv.item_id = i.id
    LEFT JOIN item_categories ic ON i.category_id = ic.id
    WHERE COALESCE(inv.qty_available, 0) <= COALESCE(i.reorder_level, 0)
    ORDER BY shortage DESC, i.name ASC
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
      i.code AS item_code,
      i.name AS item_name,
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
      ld.id,
      ld.dispatch_number,
      ${CUSTOMER_LOCAL_SQL} AS client_name,
      ld.dispatch_date,
      ld.status,
      ld.notes AS remarks,
      u.full_name AS created_by_name
    FROM local_dispatch ld
    JOIN customers c ON ld.customer_id = c.id
    LEFT JOIN users u ON ld.created_by = u.id
  `;

  const params = [];

  if (start_date && end_date) {
    sql += ` WHERE ld.dispatch_date BETWEEN ? AND ? `;
    params.push(start_date, end_date);
  }

  sql += ` ORDER BY ld.id DESC `;

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
      w.item_id,
      w.batch_id,
      w.quantity,
      w.reason,
      w.notes,
      w.created_at,
      i.code AS item_code,
      i.name AS item_name,
      ib.batch_code,
      u.full_name AS created_by_name
    FROM wastage_records w
    JOIN items i ON w.item_id = i.id
    LEFT JOIN inventory_batches ib ON w.batch_id = ib.id
    LEFT JOIN users u ON w.created_by = u.id
  `;

  const params = [];

  if (start_date && end_date) {
    sql += ` WHERE DATE(w.created_at) BETWEEN ? AND ? `;
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
      r.supplier_id,
      r.item_id,
      r.batch_id,
      r.quantity,
      r.reason,
      r.notes,
      r.created_at,
      s.supplier_name,
      i.code AS item_code,
      i.name AS item_name,
      ib.batch_code,
      u.full_name AS created_by_name
    FROM goods_returns r
    JOIN suppliers s ON r.supplier_id = s.id
    JOIN items i ON r.item_id = i.id
    LEFT JOIN inventory_batches ib ON r.batch_id = ib.id
    LEFT JOIN users u ON r.created_by = u.id
  `;

  const params = [];

  if (start_date && end_date) {
    sql += ` WHERE DATE(r.created_at) BETWEEN ? AND ? `;
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
      gd.dispatch_number,
      gd.dispatch_date,
      gd.departure_date,
      gd.airline,
      gd.incoterm,
      gd.status AS shipment_status,
      ${CUSTOMER_GLOBAL_SQL} AS client_name,
      ed.commercial_invoice_status,
      ed.packing_list_status,
      ed.phytosanitary_certificate_status,
      ed.airway_bill_status,
      ed.certificate_of_origin_status,
      ed.health_certificate_status,
      ed.insurance_certificate_status,
      ed.all_cleared,
      ed.updated_at,
      u.full_name AS updated_by_name
    FROM export_documents ed
    JOIN global_dispatch gd ON ed.global_dispatch_id = gd.id
    JOIN customers c ON gd.customer_id = c.id
    LEFT JOIN users u ON ed.updated_by = u.id
  `;

  const params = [];

  if (start_date && end_date) {
    sql += ` WHERE gd.dispatch_date BETWEEN ? AND ? `;
    params.push(start_date, end_date);
  }

  sql += ` ORDER BY gd.id DESC `;

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