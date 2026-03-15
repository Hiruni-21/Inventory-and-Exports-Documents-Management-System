const db = require("../config/db");

const getAllItems = (req, res) => {
  const sql = `
    SELECT 
      items.*,
      item_categories.category_name
    FROM items
    JOIN item_categories ON items.category_id = item_categories.id
    ORDER BY items.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json(results);
  });
};

const createItem = (req, res) => {
  const {
    item_code,
    item_name,
    category_id,
    unit,
    reorder_level,
    is_perishable,
    return_eligibility,
  } = req.body;

  const sql = `
    INSERT INTO items
    (item_code, item_name, category_id, unit, reorder_level, is_perishable, return_eligibility)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      item_code,
      item_name,
      category_id,
      unit,
      reorder_level || 0,
      is_perishable || "Yes",
      return_eligibility || "Yes",
    ],
    (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err.message });
      }

      res.status(201).json({
        message: "Item created successfully",
        itemId: result.insertId,
      });
    }
  );
};

module.exports = {
  getAllItems,
  createItem,
};