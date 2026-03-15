const db = require("../config/db");

const getAllCategories = (req, res) => {
  const sql = "SELECT * FROM item_categories ORDER BY id DESC";

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }
    res.json(results);
  });
};

const createCategory = (req, res) => {
  const { category_name, description } = req.body;

  const sql = `
    INSERT INTO item_categories (category_name, description)
    VALUES (?, ?)
  `;

  db.query(sql, [category_name, description || null], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.status(201).json({
      message: "Category created successfully",
      categoryId: result.insertId,
    });
  });
};

module.exports = {
  getAllCategories,
  createCategory,
};