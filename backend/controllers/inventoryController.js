const db = require("../config/db");

const getInventory = (req, res) => {
  const { category, type } = req.query;

  let sql = `
    SELECT
      inv.id,
      inv.item_id,
      i.code,
      i.name,
      i.botanical_name,
      c.category_name,
      i.type,
      i.unit,
      i.reorder_level,
      i.storage_temp,
      i.unit_cost,
      inv.qty_on_hand,
      inv.qty_reserved,
      inv.qty_available,
      inv.avg_unit_cost,
      inv.total_value,
      inv.last_movement_at,
      inv.updated_at
    FROM inventory inv
    JOIN items i ON inv.item_id = i.id
    JOIN item_categories c ON i.category_id = c.id
    WHERE 1=1
  `;

  const params = [];

  if (category) {
    sql += ` AND i.category_id = ?`;
    params.push(category);
  }

  if (type) {
    sql += ` AND i.type = ?`;
    params.push(type);
  }

  sql += ` ORDER BY i.name ASC`;

  db.query(sql, params, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json(results);
  });
};

const getLowStockItems = (req, res) => {
  const sql = `
    SELECT
      inv.id,
      inv.item_id,
      i.code,
      i.name,
      c.category_name,
      i.type,
      i.unit,
      i.reorder_level,
      inv.qty_available,
      (i.reorder_level - inv.qty_available) AS shortage
    FROM inventory inv
    JOIN items i ON inv.item_id = i.id
    JOIN item_categories c ON i.category_id = c.id
    WHERE inv.qty_available <= i.reorder_level
    ORDER BY shortage DESC, i.name ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json(results);
  });
};

const getExpiryItems = (req, res) => {
  const days = Number(req.query.days) || 7;

  const sql = `
    SELECT
      b.id,
      b.item_id,
      i.code,
      i.name,
      i.unit,
      b.batch_number,
      b.qty_remaining,
      b.received_date,
      b.expiry_date,
      DATEDIFF(b.expiry_date, CURDATE()) AS days_left,
      b.status
    FROM batches b
    JOIN items i ON b.item_id = i.id
    WHERE b.expiry_date IS NOT NULL
      AND b.qty_remaining > 0
      AND b.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
    ORDER BY b.expiry_date ASC, i.name ASC
  `;

  db.query(sql, [days], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json(results);
  });
};

const getBatchesByItemId = (req, res) => {
  const { itemId } = req.params;

  const sql = `
    SELECT
      b.id,
      b.item_id,
      b.batch_number,
      b.qty_received,
      b.qty_remaining,
      b.qty_reserved,
      b.received_date,
      b.expiry_date,
      b.grn_id,
      b.source_type,
      b.unit_cost,
      b.status,
      i.unit
    FROM batches b
    JOIN items i ON b.item_id = i.id
    WHERE b.item_id = ?
    ORDER BY
      CASE WHEN b.expiry_date IS NULL THEN 1 ELSE 0 END,
      b.expiry_date ASC,
      b.received_date ASC
  `;

  db.query(sql, [itemId], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json(results);
  });
};

const getInventoryValuation = (req, res) => {
  const sql = `
    SELECT
      COUNT(*) AS total_items,
      COALESCE(SUM(qty_on_hand), 0) AS total_qty_on_hand,
      COALESCE(SUM(qty_available), 0) AS total_qty_available,
      COALESCE(SUM(total_value), 0) AS total_inventory_value
    FROM inventory
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json(results[0]);
  });
};

module.exports = {
  getInventory,
  getLowStockItems,
  getExpiryItems,
  getBatchesByItemId,
  getInventoryValuation,
};