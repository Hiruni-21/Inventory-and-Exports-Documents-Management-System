const db = require("../config/db");
const logActivity = require("../utils/logActivity");

const getAllCategories = (req, res) => {
  const sql = `
    SELECT ic.*, u.full_name AS created_by_name
    FROM item_categories ic
    LEFT JOIN users u ON ic.created_by = u.id
    ORDER BY ic.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json(results);
  });
};

const createCategory = (req, res) => {
  const { category_name, description, status } = req.body;

  if (!category_name) {
    return res.status(400).json({ message: "Category name is required" });
  }

  const sql = `
    INSERT INTO item_categories (category_name, description, status, created_by)
    VALUES (?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      category_name,
      description || null,
      status || "active",
      req.user.id,
    ],
    (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err.message });
      }

      logActivity({
        user_id: req.user.id,
        user_name: req.user.name,
        module: "Item Categories",
        action: "Created item category",
        reference_type: "item_category",
        reference_id: result.insertId,
        ip_address: req.ip,
      });

      res.status(201).json({
        message: "Category created successfully",
        categoryId: result.insertId,
      });
    }
  );
};

const updateCategory = (req, res) => {
  const { id } = req.params;
  const { category_name, description, status } = req.body;

  const sql = `
    UPDATE item_categories
    SET category_name = ?, description = ?, status = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [category_name, description || null, status || "active", id],
    (err) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err.message });
      }

      logActivity({
        user_id: req.user.id,
        user_name: req.user.name,
        module: "Item Categories",
        action: "Updated item category",
        reference_type: "item_category",
        reference_id: id,
        ip_address: req.ip,
      });

      res.json({ message: "Category updated successfully" });
    }
  );
};

const deleteCategory = (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM item_categories WHERE id = ?", [id], (err) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    logActivity({
      user_id: req.user.id,
      user_name: req.user.name,
      module: "Item Categories",
      action: "Deleted item category",
      reference_type: "item_category",
      reference_id: id,
      ip_address: req.ip,
    });

    res.json({ message: "Category deleted successfully" });
  });
};

module.exports = {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};