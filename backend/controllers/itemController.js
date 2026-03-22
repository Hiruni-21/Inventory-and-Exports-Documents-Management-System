const db = require("../config/db");
const logActivity = require("../utils/logActivity");

const getAllItems = (req, res) => {
  const sql = `
    SELECT
      i.*,
      c.category_name
    FROM items i
    JOIN item_categories c ON i.category_id = c.id
    ORDER BY i.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json(results);
  });
};

const getItemById = (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT
      i.*,
      c.category_name
    FROM items i
    JOIN item_categories c ON i.category_id = c.id
    WHERE i.id = ?
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json(results[0]);
  });
};

const createItem = (req, res) => {
  const {
    code,
    name,
    botanical_name,
    category_id,
    type,
    unit,
    shelf_life_days,
    reorder_level,
    storage_temp,
    unit_cost,
    returnable,
    description,
    status,
  } = req.body;

  if (!code || !name || !category_id || !type || !unit) {
    return res.status(400).json({
      message: "Code, name, category, type, and unit are required",
    });
  }

  const sql = `
    INSERT INTO items
    (code, name, botanical_name, category_id, type, unit, shelf_life_days, reorder_level, storage_temp, unit_cost, returnable, description, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      code,
      name,
      botanical_name || null,
      category_id,
      type,
      unit,
      shelf_life_days || 0,
      reorder_level || 0,
      storage_temp || null,
      unit_cost || 0,
      returnable ?? 1,
      description || null,
      status || "active",
      req.user.id,
    ],
    (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err.message });
      }

      const itemId = result.insertId;

      db.query(
        `
          INSERT INTO inventory (item_id, qty_on_hand, qty_reserved, qty_available, avg_unit_cost, total_value)
          VALUES (?, 0, 0, 0, ?, 0)
        `,
        [itemId, unit_cost || 0],
        (invErr) => {
          if (invErr) {
            return res.status(500).json({ message: "Database error", error: invErr.message });
          }

          logActivity({
            user_id: req.user.id,
            user_name: req.user.name,
            module: "Items",
            action: "Created item",
            reference_type: "item",
            reference_id: itemId,
            details: { code, name },
            ip_address: req.ip,
          });

          res.status(201).json({
            message: "Item created successfully",
            itemId,
          });
        }
      );
    }
  );
};

const updateItem = (req, res) => {
  const { id } = req.params;

  const {
    code,
    name,
    botanical_name,
    category_id,
    type,
    unit,
    shelf_life_days,
    reorder_level,
    storage_temp,
    unit_cost,
    returnable,
    description,
    status,
  } = req.body;

  if (!code || !name || !category_id || !type || !unit) {
    return res.status(400).json({
      message: "Code, name, category, type, and unit are required",
    });
  }

  const sql = `
    UPDATE items
    SET
      code = ?,
      name = ?,
      botanical_name = ?,
      category_id = ?,
      type = ?,
      unit = ?,
      shelf_life_days = ?,
      reorder_level = ?,
      storage_temp = ?,
      unit_cost = ?,
      returnable = ?,
      description = ?,
      status = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      code,
      name,
      botanical_name || null,
      category_id,
      type,
      unit,
      shelf_life_days || 0,
      reorder_level || 0,
      storage_temp || null,
      unit_cost || 0,
      returnable ?? 1,
      description || null,
      status || "active",
      id,
    ],
    (err) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err.message });
      }

      db.query(
        `
          UPDATE inventory
          SET avg_unit_cost = ?
          WHERE item_id = ?
        `,
        [unit_cost || 0, id],
        (invErr) => {
          if (invErr) {
            return res.status(500).json({ message: "Database error", error: invErr.message });
          }

          logActivity({
            user_id: req.user.id,
            user_name: req.user.name,
            module: "Items",
            action: "Updated item",
            reference_type: "item",
            reference_id: id,
            details: { code, name },
            ip_address: req.ip,
          });

          res.json({ message: "Item updated successfully" });
        }
      );
    }
  );
};

const deleteItem = (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM items WHERE id = ?", [id], (err) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    logActivity({
      user_id: req.user.id,
      user_name: req.user.name,
      module: "Items",
      action: "Deleted item",
      reference_type: "item",
      reference_id: id,
      ip_address: req.ip,
    });

    res.json({ message: "Item deleted successfully" });
  });
};

module.exports = {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
};