const db = require("../config/db");

const refreshInventorySnapshot = (itemId, callback = () => {}) => {
  const totalsSql = `
    SELECT
      COALESCE(SUM(received_quantity), 0) AS qty_on_hand,
      COALESCE(SUM(available_quantity), 0) AS qty_available
    FROM inventory_batches
    WHERE item_id = ?
  `;

  const itemSql = `
    SELECT COALESCE(unit_cost, 0) AS unit_cost
    FROM items
    WHERE id = ?
    LIMIT 1
  `;

  db.query(totalsSql, [itemId], (totalsErr, totalsResults) => {
    if (totalsErr) return callback(totalsErr);

    db.query(itemSql, [itemId], (itemErr, itemResults) => {
      if (itemErr) return callback(itemErr);

      const qtyOnHand = Number(totalsResults?.[0]?.qty_on_hand || 0);
      const qtyAvailable = Number(totalsResults?.[0]?.qty_available || 0);
      const unitCost = Number(itemResults?.[0]?.unit_cost || 0);
      const totalValue = qtyAvailable * unitCost;

      const upsertSql = `
        INSERT INTO inventory
          (item_id, qty_on_hand, qty_reserved, qty_available, avg_unit_cost, total_value, updated_at)
        VALUES (?, ?, 0, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          qty_on_hand = VALUES(qty_on_hand),
          qty_reserved = 0,
          qty_available = VALUES(qty_available),
          avg_unit_cost = VALUES(avg_unit_cost),
          total_value = VALUES(total_value),
          updated_at = NOW()
      `;

      db.query(
        upsertSql,
        [itemId, qtyOnHand, qtyAvailable, unitCost, totalValue],
        (upsertErr) => callback(upsertErr)
      );
    });
  });
};

const getInventory = (req, res) => {
  const { category, type } = req.query;

  let sql = `
    SELECT
      i.id AS item_id,
      i.id,
      i.code,
      i.name,
      i.code AS item_code,
      i.name AS item_name,
      i.botanical_name,
      c.category_name,
      i.type,
      i.unit,
      i.reorder_level,
      i.storage_temp,
      COALESCE(i.unit_cost, 0) AS unit_cost,
      COALESCE(inv.qty_on_hand, 0) AS qty_on_hand,
      COALESCE(inv.qty_reserved, 0) AS qty_reserved,
      COALESCE(inv.qty_available, 0) AS qty_available,
      COALESCE(inv.avg_unit_cost, COALESCE(i.unit_cost, 0)) AS avg_unit_cost,
      COALESCE(inv.total_value, 0) AS total_value,
      inv.last_movement_at,
      inv.updated_at
    FROM items i
    JOIN item_categories c ON i.category_id = c.id
    LEFT JOIN inventory inv ON inv.item_id = i.id
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
      i.id AS item_id,
      i.id,
      i.code,
      i.name,
      i.code AS item_code,
      i.name AS item_name,
      c.category_name,
      i.type,
      i.unit,
      COALESCE(i.reorder_level, 0) AS reorder_level,
      COALESCE(inv.qty_available, 0) AS qty_available,
      (COALESCE(i.reorder_level, 0) - COALESCE(inv.qty_available, 0)) AS shortage
    FROM items i
    JOIN item_categories c ON i.category_id = c.id
    LEFT JOIN inventory inv ON inv.item_id = i.id
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

const getExpiryItems = (req, res) => {
  const days = Number(req.query.days) || 7;

  const sql = `
    SELECT
      ib.id,
      ib.item_id,
      i.code,
      i.name,
      i.code AS item_code,
      i.name AS item_name,
      i.unit,
      ib.batch_code,
      ib.batch_code AS batch_number,
      ib.received_quantity AS qty_received,
      ib.available_quantity AS qty_remaining,
      ib.received_date,
      ib.expiry_date,
      DATEDIFF(ib.expiry_date, CURDATE()) AS days_left,
      ib.status
    FROM inventory_batches ib
    JOIN items i ON ib.item_id = i.id
    WHERE ib.expiry_date IS NOT NULL
      AND ib.available_quantity > 0
      AND ib.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
    ORDER BY ib.expiry_date ASC, i.name ASC
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
      ib.id,
      ib.item_id,
      ib.batch_code,
      ib.batch_code AS batch_number,
      ib.received_quantity AS qty_received,
      ib.available_quantity AS qty_remaining,
      0 AS qty_reserved,
      ib.received_date,
      ib.expiry_date,
      ib.grn_id,
      'GRN' AS source_type,
      COALESCE(i.unit_cost, 0) AS unit_cost,
      ib.status,
      i.unit
    FROM inventory_batches ib
    JOIN items i ON ib.item_id = i.id
    WHERE ib.item_id = ?
      AND COALESCE(ib.available_quantity, 0) > 0
    ORDER BY
      CASE WHEN ib.expiry_date IS NULL THEN 1 ELSE 0 END,
      ib.expiry_date ASC,
      ib.received_date ASC,
      ib.id ASC
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
  refreshInventorySnapshot,
};