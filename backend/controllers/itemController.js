const db = require("../config/db");
const logActivity = require("../utils/logActivity");

const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

const normalizeStatus = (value) => {
  const text = String(value || "active").toLowerCase();
  return text === "inactive" ? "inactive" : "active";
};

const normalizeReturnable = (value) => {
  if (value === undefined || value === null || value === "") return 1;

  const num = Number(value);
  if (!Number.isNaN(num)) {
    return num === 1 ? 1 : 0;
  }

  const text = String(value).toLowerCase().trim();
  return text === "yes" || text === "true" || text === "1" ? 1 : 0;
};

const normalizeSupplierIds = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0);
  }

  if (value === undefined || value === null || value === "") return [];

  return String(value)
    .split(",")
    .map((id) => Number(String(id).trim()))
    .filter((id) => Number.isInteger(id) && id > 0);
};

const syncItemSuppliers = async (itemId, supplierIds) => {
  await query("DELETE FROM supplier_items WHERE item_id = ?", [itemId]);

  const cleaned = [...new Set(normalizeSupplierIds(supplierIds))];
  if (!cleaned.length) return;

  const values = cleaned.map((supplierId) => [itemId, supplierId]);
  await query(
    "INSERT INTO supplier_items (item_id, supplier_id) VALUES ?",
    [values]
  );
};

const getAllItems = async (req, res) => {
  try {
    const sql = `
      SELECT
        i.*,
        c.category_name,
        COALESCE(
          (
            SELECT GROUP_CONCAT(
              DISTINCT s.supplier_name
              ORDER BY s.supplier_name
              SEPARATOR ', '
            )
            FROM supplier_items isp
            LEFT JOIN suppliers s ON s.id = isp.supplier_id
            WHERE isp.item_id = i.id
          ),
          ''
        ) AS supplier_names,
        COALESCE(
          (
            SELECT GROUP_CONCAT(
              DISTINCT isp.supplier_id
              ORDER BY isp.supplier_id
              SEPARATOR ','
            )
            FROM supplier_items isp
            WHERE isp.item_id = i.id
          ),
          ''
        ) AS supplier_ids_csv
      FROM items i
      LEFT JOIN item_categories c ON i.category_id = c.id
      WHERE COALESCE(i.status, 'active') <> 'inactive'
      ORDER BY i.id DESC
    `;

    const results = await query(sql);

    res.json(
      results.map((row) => ({
        ...row,
        supplier_ids: row.supplier_ids_csv
          ? String(row.supplier_ids_csv)
              .split(",")
              .map((id) => Number(id))
              .filter(Boolean)
          : [],
      }))
    );
  } catch (err) {
    console.error("GET ALL ITEMS ERROR:", err);
    res.status(500).json({ message: "Database error", error: err.message });
  }
};

const getItemById = async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT
        i.*,
        c.category_name,
        COALESCE(
          (
            SELECT GROUP_CONCAT(
              DISTINCT s.supplier_name
              ORDER BY s.supplier_name
              SEPARATOR ', '
            )
            FROM supplier_items isp
            LEFT JOIN suppliers s ON s.id = isp.supplier_id
            WHERE isp.item_id = i.id
          ),
          ''
        ) AS supplier_names,
        COALESCE(
          (
            SELECT GROUP_CONCAT(
              DISTINCT isp.supplier_id
              ORDER BY isp.supplier_id
              SEPARATOR ','
            )
            FROM supplier_items isp
            WHERE isp.item_id = i.id
          ),
          ''
        ) AS supplier_ids_csv
      FROM items i
      LEFT JOIN item_categories c ON i.category_id = c.id
      WHERE i.id = ?
      LIMIT 1
    `;

    const results = await query(sql, [id]);

    if (!results.length) {
      return res.status(404).json({ message: "Item not found" });
    }

    const row = results[0];

    res.json({
      ...row,
      supplier_ids: row.supplier_ids_csv
        ? String(row.supplier_ids_csv)
            .split(",")
            .map((supplierId) => Number(supplierId))
            .filter(Boolean)
        : [],
    });
  } catch (err) {
    console.error("GET ITEM BY ID ERROR:", err);
    res.status(500).json({ message: "Database error", error: err.message });
  }
};

const createItem = async (req, res) => {
  try {
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
      supplier_ids,
    } = req.body;

    if (!code || !name || !category_id || !type || !unit) {
      return res.status(400).json({
        message: "Code, name, category, type, and unit are required",
      });
    }

    const insertSql = `
      INSERT INTO items
      (
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
        created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await query(insertSql, [
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
      normalizeReturnable(returnable),
      description || null,
      normalizeStatus(status),
      req.user.id,
    ]);

    const itemId = result.insertId;

    await query(
      `
        INSERT INTO inventory
        (item_id, qty_on_hand, qty_reserved, qty_available, avg_unit_cost, total_value)
        VALUES (?, 0, 0, 0, ?, 0)
      `,
      [itemId, unit_cost || 0]
    );

    await syncItemSuppliers(itemId, supplier_ids);

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
  } catch (err) {
    console.error("CREATE ITEM ERROR:", err);
    res.status(500).json({ message: "Database error", error: err.message });
  }
};

const updateItem = async (req, res) => {
  try {
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
      supplier_ids,
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

    await query(sql, [
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
      normalizeReturnable(returnable),
      description || null,
      normalizeStatus(status),
      id,
    ]);

    await query(
      `
        UPDATE inventory
        SET avg_unit_cost = ?
        WHERE item_id = ?
      `,
      [unit_cost || 0, id]
    );

    await syncItemSuppliers(id, supplier_ids);

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
  } catch (err) {
    console.error("UPDATE ITEM ERROR:", err);
    res.status(500).json({ message: "Database error", error: err.message });
  }
};

const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;

    await query(
      `
        UPDATE items
        SET status = 'inactive'
        WHERE id = ?
      `,
      [id]
    );

    logActivity({
      user_id: req.user.id,
      user_name: req.user.name,
      module: "Items",
      action: "Deactivated item",
      reference_type: "item",
      reference_id: id,
      ip_address: req.ip,
    });

    res.json({ message: "Item deactivated successfully" });
  } catch (err) {
    console.error("DELETE ITEM ERROR:", err);
    res.status(500).json({ message: "Database error", error: err.message });
  }
};

module.exports = {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
};