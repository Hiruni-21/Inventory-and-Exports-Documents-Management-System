const db = require("../config/db");
const logActivity = require("../utils/logActivity");

const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

const getAllCategories = async (req, res) => {
  try {
    const sql = `
      SELECT
        c.id,
        c.category_name,
        COALESCE(c.description, '') AS description,
        COALESCE(c.status, 'active') AS status,
        c.created_at,
        COUNT(i.id) AS item_count,
        MIN(NULLIF(i.shelf_life_days, 0)) AS min_shelf_life,
        MAX(NULLIF(i.shelf_life_days, 0)) AS max_shelf_life
      FROM item_categories c
      LEFT JOIN items i
        ON i.category_id = c.id
       AND COALESCE(i.status, 'active') <> 'inactive'
      WHERE COALESCE(c.status, 'active') <> 'inactive'
      GROUP BY c.id, c.category_name, c.description, c.status, c.created_at
      ORDER BY c.id ASC
    `;

    const results = await query(sql);
    res.json(results);
  } catch (err) {
    console.error("GET CATEGORIES ERROR:", err);
    res.status(500).json({ message: "Database error", error: err.message });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT
        c.id,
        c.category_name,
        COALESCE(c.description, '') AS description,
        COALESCE(c.status, 'active') AS status,
        c.created_at,
        COUNT(i.id) AS item_count,
        MIN(NULLIF(i.shelf_life_days, 0)) AS min_shelf_life,
        MAX(NULLIF(i.shelf_life_days, 0)) AS max_shelf_life
      FROM item_categories c
      LEFT JOIN items i
        ON i.category_id = c.id
       AND COALESCE(i.status, 'active') <> 'inactive'
      WHERE c.id = ?
      GROUP BY c.id, c.category_name, c.description, c.status, c.created_at
      LIMIT 1
    `;

    const results = await query(sql, [id]);

    if (!results.length) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json(results[0]);
  } catch (err) {
    console.error("GET CATEGORY BY ID ERROR:", err);
    res.status(500).json({ message: "Database error", error: err.message });
  }
};

const createCategory = async (req, res) => {
  try {
    const { category_name, description, status } = req.body;

    if (!category_name || !String(category_name).trim()) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const result = await query(
      `
        INSERT INTO item_categories (category_name, description, status)
        VALUES (?, ?, ?)
      `,
      [
        String(category_name).trim(),
        description ? String(description).trim() : null,
        String(status || "active").toLowerCase() === "inactive" ? "inactive" : "active",
      ]
    );

    logActivity({
      user_id: req.user.id,
      user_name: req.user.name,
      module: "Item Categories",
      action: "Created category",
      reference_type: "item_category",
      reference_id: result.insertId,
      details: { category_name },
      ip_address: req.ip,
    });

    res.status(201).json({
      message: "Category created successfully",
      id: result.insertId,
    });
  } catch (err) {
    console.error("CREATE CATEGORY ERROR:", err);
    res.status(500).json({ message: "Database error", error: err.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_name, description, status } = req.body;

    if (!category_name || !String(category_name).trim()) {
      return res.status(400).json({ message: "Category name is required" });
    }

    await query(
      `
        UPDATE item_categories
        SET
          category_name = ?,
          description = ?,
          status = ?
        WHERE id = ?
      `,
      [
        String(category_name).trim(),
        description ? String(description).trim() : null,
        String(status || "active").toLowerCase() === "inactive" ? "inactive" : "active",
        id,
      ]
    );

    logActivity({
      user_id: req.user.id,
      user_name: req.user.name,
      module: "Item Categories",
      action: "Updated category",
      reference_type: "item_category",
      reference_id: id,
      details: { category_name },
      ip_address: req.ip,
    });

    res.json({ message: "Category updated successfully" });
  } catch (err) {
    console.error("UPDATE CATEGORY ERROR:", err);
    res.status(500).json({ message: "Database error", error: err.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const linked = await query(
      `
        SELECT COUNT(*) AS count
        FROM items
        WHERE category_id = ?
          AND COALESCE(status, 'active') <> 'inactive'
      `,
      [id]
    );

    if (Number(linked[0]?.count || 0) > 0) {
      return res.status(400).json({
        message: "Cannot delete category with linked items",
      });
    }

    await query(
      `
        UPDATE item_categories
        SET status = 'inactive'
        WHERE id = ?
      `,
      [id]
    );

    logActivity({
      user_id: req.user.id,
      user_name: req.user.name,
      module: "Item Categories",
      action: "Deleted category",
      reference_type: "item_category",
      reference_id: id,
      ip_address: req.ip,
    });

    res.json({ message: "Category deleted successfully" });
  } catch (err) {
    console.error("DELETE CATEGORY ERROR:", err);
    res.status(500).json({ message: "Database error", error: err.message });
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};