const db = require("../config/db");

const getInventoryList = (req, res) => {
  const sql = `
    SELECT
      i.id AS item_id,
      i.item_code,
      i.item_name,
      c.category_name,
      i.unit,
      i.reorder_level,
      i.is_perishable,
      i.return_eligibility,
      IFNULL(SUM(ib.available_quantity), 0) AS total_available_quantity
    FROM items i
    JOIN item_categories c ON i.category_id = c.id
    LEFT JOIN inventory_batches ib ON i.id = ib.item_id AND ib.status = 'Available'
    GROUP BY i.id
    ORDER BY i.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json(results);
  });
};

const getInventoryBatchesByItem = (req, res) => {
  const { itemId } = req.params;

  const sql = `
    SELECT
      ib.*,
      g.grn_number
    FROM inventory_batches ib
    JOIN grn g ON ib.grn_id = g.id
    WHERE ib.item_id = ?
      AND ib.status = 'Available'
      AND ib.available_quantity > 0
    ORDER BY ib.id DESC
  `;

  db.query(sql, [itemId], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json(results);
  });
};

const getStockMovements = (req, res) => {
  const sql = `
    SELECT
      sm.*,
      i.item_name,
      i.item_code
    FROM stock_movements sm
    JOIN items i ON sm.item_id = i.id
    ORDER BY sm.id DESC
  `;

  db.query(sql, (err, results) => {
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
      i.item_code,
      i.item_name,
      i.unit,
      i.reorder_level,
      IFNULL(SUM(ib.available_quantity), 0) AS total_available_quantity
    FROM items i
    LEFT JOIN inventory_batches ib ON i.id = ib.item_id AND ib.status = 'Available'
    GROUP BY i.id
    HAVING total_available_quantity <= i.reorder_level
    ORDER BY total_available_quantity ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json(results);
  });
};

module.exports = {
  getInventoryList,
  getInventoryBatchesByItem,
  getStockMovements,
  getLowStockItems,
};