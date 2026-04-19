const db = require("../config/db");

let refreshInventorySnapshot = null;
try {
  const inventoryController = require("./inventoryController");
  if (typeof inventoryController.refreshInventorySnapshot === "function") {
    refreshInventorySnapshot = inventoryController.refreshInventorySnapshot;
  }
} catch (err) {
  refreshInventorySnapshot = null;
}

const q = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

let ensured = false;
let tableCache = {};

const clearCache = () => {
  ensured = false;
  tableCache = {};
};

const safeText = (value) => String(value || "").trim();
const safeNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const tableExists = async (tableName) => {
  const rows = await q(
    `
      SELECT COUNT(*) AS total
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
    `,
    [tableName]
  );
  return Number(rows?.[0]?.total || 0) > 0;
};

const getTableColumns = async (tableName) => {
  if (tableCache[tableName]) return tableCache[tableName];

  const rows = await q(
    `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
    `,
    [tableName]
  );

  const cols = new Set(rows.map((r) => r.COLUMN_NAME));
  tableCache[tableName] = cols;
  return cols;
};

const ensureRuntimeSchema = async () => {
  if (ensured) return;

  if (!(await tableExists("wastage"))) {
    await q(`
      CREATE TABLE wastage (
        id INT AUTO_INCREMENT PRIMARY KEY,
        wastage_number VARCHAR(50) NOT NULL,
        wastage_date DATE NOT NULL,
        reason VARCHAR(150) NULL,
        remarks TEXT NULL,
        reported_by_name VARCHAR(150) NULL,
        created_by INT NULL,
        total_qty DECIMAL(12,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
  } else {
    const cols = await getTableColumns("wastage");
    if (!cols.has("wastage_number")) await q(`ALTER TABLE wastage ADD COLUMN wastage_number VARCHAR(50) NOT NULL`);
    if (!cols.has("wastage_date")) await q(`ALTER TABLE wastage ADD COLUMN wastage_date DATE NOT NULL`);
    if (!cols.has("reason")) await q(`ALTER TABLE wastage ADD COLUMN reason VARCHAR(150) NULL`);
    if (!cols.has("remarks")) await q(`ALTER TABLE wastage ADD COLUMN remarks TEXT NULL`);
    if (!cols.has("reported_by_name")) await q(`ALTER TABLE wastage ADD COLUMN reported_by_name VARCHAR(150) NULL`);
    if (!cols.has("created_by")) await q(`ALTER TABLE wastage ADD COLUMN created_by INT NULL`);
    if (!cols.has("total_qty")) await q(`ALTER TABLE wastage ADD COLUMN total_qty DECIMAL(12,2) NOT NULL DEFAULT 0`);
  }

  if (!(await tableExists("wastage_items"))) {
    await q(`
      CREATE TABLE wastage_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        wastage_id INT NOT NULL,
        item_id INT NOT NULL,
        quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
        unit VARCHAR(30) NULL,
        batch_number VARCHAR(120) NULL,
        unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
        line_total DECIMAL(12,2) NOT NULL DEFAULT 0,
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_wastage_items_wastage (wastage_id)
      )
    `);
  } else {
    const cols = await getTableColumns("wastage_items");
    if (!cols.has("wastage_id")) await q(`ALTER TABLE wastage_items ADD COLUMN wastage_id INT NOT NULL`);
    if (!cols.has("item_id")) await q(`ALTER TABLE wastage_items ADD COLUMN item_id INT NOT NULL`);
    if (!cols.has("quantity")) await q(`ALTER TABLE wastage_items ADD COLUMN quantity DECIMAL(12,2) NOT NULL DEFAULT 0`);
    if (!cols.has("unit")) await q(`ALTER TABLE wastage_items ADD COLUMN unit VARCHAR(30) NULL`);
    if (!cols.has("batch_number")) await q(`ALTER TABLE wastage_items ADD COLUMN batch_number VARCHAR(120) NULL`);
    if (!cols.has("unit_cost")) await q(`ALTER TABLE wastage_items ADD COLUMN unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0`);
    if (!cols.has("line_total")) await q(`ALTER TABLE wastage_items ADD COLUMN line_total DECIMAL(12,2) NOT NULL DEFAULT 0`);
    if (!cols.has("notes")) await q(`ALTER TABLE wastage_items ADD COLUMN notes TEXT NULL`);
  }

  if (!(await tableExists("wastage_photos"))) {
    await q(`
      CREATE TABLE wastage_photos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        wastage_id INT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        original_name VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_wastage_photos_wastage (wastage_id)
      )
    `);
  } else {
    const cols = await getTableColumns("wastage_photos");
    if (!cols.has("file_name")) await q(`ALTER TABLE wastage_photos ADD COLUMN file_name VARCHAR(255) NOT NULL`);
    if (!cols.has("file_path")) await q(`ALTER TABLE wastage_photos ADD COLUMN file_path VARCHAR(500) NOT NULL`);
    if (!cols.has("original_name")) await q(`ALTER TABLE wastage_photos ADD COLUMN original_name VARCHAR(255) NULL`);
    if (!cols.has("created_at")) await q(`ALTER TABLE wastage_photos ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
  }

  clearCache();
  ensured = true;
};

const wrapRefreshInventorySnapshot = (itemId) =>
  new Promise((resolve, reject) => {
    if (typeof refreshInventorySnapshot !== "function") return resolve();
    refreshInventorySnapshot(itemId, (err) => (err ? reject(err) : resolve()));
  });

const generateWastageNumber = async () => {
  const year = new Date().getFullYear();
  const rows = await q(
    `SELECT wastage_number FROM wastage WHERE wastage_number LIKE ? ORDER BY id DESC LIMIT 100`,
    [`WST-${year}-%`]
  );

  let maxNo = 0;
  rows.forEach((row) => {
    const match = String(row.wastage_number || "").match(/WST-\d{4}-(\d+)$/);
    if (match) maxNo = Math.max(maxNo, Number(match[1] || 0));
  });

  return `WST-${year}-${String(maxNo + 1).padStart(3, "0")}`;
};

const insertStockMovement = async ({ itemId, wastageId, quantity, wastageNumber }) => {
  if (!(await tableExists("stock_movements"))) return;

  const cols = await getTableColumns("stock_movements");
  const fields = [];
  const values = [];

  if (cols.has("item_id")) {
    fields.push("item_id");
    values.push(itemId);
  }
  if (cols.has("movement_type")) {
    fields.push("movement_type");
    values.push("OUT");
  }
  if (cols.has("reference_type")) {
    fields.push("reference_type");
    values.push("WASTAGE");
  }
  if (cols.has("reference_id")) {
    fields.push("reference_id");
    values.push(wastageId);
  }
  if (cols.has("quantity")) {
    fields.push("quantity");
    values.push(quantity);
  }
  if (cols.has("notes")) {
    fields.push("notes");
    values.push(`Stock reduced for wastage ${wastageNumber}`);
  }

  if (!fields.length) return;

  await q(
    `INSERT INTO stock_movements (${fields.join(", ")}) VALUES (${fields.map(() => "?").join(", ")})`,
    values
  );
};

const applyBatchWastage = async (itemId, batchNumber, quantity) => {
  if (!(await tableExists("inventory_batches"))) return;

  const cols = await getTableColumns("inventory_batches");
  if (!cols.has("item_id") || !cols.has("available_quantity")) return;

  const batchCol = cols.has("batch_code") ? "batch_code" : cols.has("batch_number") ? "batch_number" : null;
  if (!batchCol) return;

  if (!batchNumber) return;

  const rows = await q(
    `
      SELECT id, available_quantity
      FROM inventory_batches
      WHERE item_id = ?
        AND ${batchCol} = ?
      ORDER BY id ASC
      LIMIT 1
    `,
    [itemId, batchNumber]
  );

  if (!rows.length) return;

  const currentQty = Number(rows[0].available_quantity || 0);
  const nextQty = Math.max(currentQty - Number(quantity || 0), 0);

  await q(`UPDATE inventory_batches SET available_quantity = ? WHERE id = ?`, [nextQty, rows[0].id]);
};

const loadWastageById = async (wastageId) => {
  const headerRows = await q(
    `SELECT * FROM wastage WHERE id = ? LIMIT 1`,
    [wastageId]
  );

  if (!headerRows.length) return null;

  const items = await q(
    `
      SELECT
        wi.*,
        i.name AS item_name,
        i.code AS item_code
      FROM wastage_items wi
      JOIN items i ON i.id = wi.item_id
      WHERE wi.wastage_id = ?
      ORDER BY wi.id ASC
    `,
    [wastageId]
  );

  const photos = await q(
    `
      SELECT id, file_name, file_path, original_name, created_at
      FROM wastage_photos
      WHERE wastage_id = ?
      ORDER BY id ASC
    `,
    [wastageId]
  );

  return {
    ...headerRows[0],
    items: items.map((row) => ({
      ...row,
      quantity: Number(row.quantity || 0),
      unit_cost: Number(row.unit_cost || 0),
      line_total: Number(row.line_total || 0),
    })),
    photos,
    total_amount: items.reduce((sum, row) => sum + Number(row.line_total || 0), 0),
  };
};

const getAllWastage = async (_req, res) => {
  try {
    await ensureRuntimeSchema();

    const rows = await q(`
      SELECT
        w.id,
        w.wastage_number,
        w.wastage_date,
        w.reason,
        w.remarks,
        w.reported_by_name,
        w.total_qty,
        COALESCE(COUNT(DISTINCT wi.id), 0) AS item_count,
        COALESCE(SUM(wi.line_total), 0) AS total_amount,
        COALESCE(COUNT(DISTINCT wp.id), 0) AS photo_count
      FROM wastage w
      LEFT JOIN wastage_items wi ON wi.wastage_id = w.id
      LEFT JOIN wastage_photos wp ON wp.wastage_id = w.id
      GROUP BY
        w.id,
        w.wastage_number,
        w.wastage_date,
        w.reason,
        w.remarks,
        w.reported_by_name,
        w.total_qty
      ORDER BY w.id DESC
    `);

    res.json(
      rows.map((row) => ({
        ...row,
        item_count: Number(row.item_count || 0),
        total_qty: Number(row.total_qty || 0),
        total_amount: Number(row.total_amount || 0),
        photo_count: Number(row.photo_count || 0),
      }))
    );
  } catch (err) {
    console.error("getAllWastage error:", err);
    res.status(500).json({ message: "Failed to load wastage records", error: err.message });
  }
};

const getWastageById = async (req, res) => {
  try {
    await ensureRuntimeSchema();

    const data = await loadWastageById(Number(req.params.id || 0));
    if (!data) {
      return res.status(404).json({ message: "Wastage record not found" });
    }

    res.json({
      ...data,
      photos: (data.photos || []).map((photo) => ({
        ...photo,
        file_path:
          photo.file_path && String(photo.file_path).startsWith("/uploads")
            ? photo.file_path
            : `/uploads/wastage-photos/${photo.file_name}`,
      })),
    });
  } catch (err) {
    console.error("getWastageById error:", err);
    res.status(500).json({ message: "Failed to load wastage details", error: err.message });
  }
};

const createWastage = async (req, res) => {
  try {
    await ensureRuntimeSchema();

    const wastageDate = safeText(req.body.wastage_date);
    const reason = safeText(req.body.reason);
    const remarks = safeText(req.body.remarks);
    const reportedByName =
      safeText(req.body.reported_by_name) ||
      req.user?.full_name ||
      req.user?.name ||
      req.user?.username ||
      "Manager User";

    const createdBy = req.user?.id || null;

    const bodyItems =
      typeof req.body.items === "string" ? JSON.parse(req.body.items || "[]") : req.body.items;
    const items = Array.isArray(bodyItems) ? bodyItems : [];

    if (!wastageDate || !reason || !items.length) {
      return res.status(400).json({ message: "Wastage date, reason, and items are required" });
    }

    const validItems = items
      .map((item) => {
        const quantity = safeNumber(item.quantity, 0);
        if (!Number(item.item_id) || quantity <= 0) return null;

        const unitCost = safeNumber(item.unit_cost, 0);

        return {
          item_id: Number(item.item_id),
          quantity,
          unit: safeText(item.unit),
          batch_number: safeText(item.batch_number),
          unit_cost: unitCost,
          line_total: unitCost * quantity,
          notes: safeText(item.notes),
        };
      })
      .filter(Boolean);

    if (!validItems.length) {
      return res.status(400).json({ message: "At least one wastage item is required" });
    }

    const totalQty = validItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const wastageNumber = await generateWastageNumber();

    const result = await q(
      `
        INSERT INTO wastage (
          wastage_number,
          wastage_date,
          reason,
          remarks,
          reported_by_name,
          created_by,
          total_qty
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [wastageNumber, wastageDate, reason, remarks || null, reportedByName, createdBy, totalQty]
    );

    const wastageId = result.insertId;

    const itemValues = validItems.map((item) => [
      wastageId,
      item.item_id,
      item.quantity,
      item.unit || null,
      item.batch_number || null,
      item.unit_cost,
      item.line_total,
      item.notes || null,
    ]);

    await q(
      `
        INSERT INTO wastage_items (
          wastage_id,
          item_id,
          quantity,
          unit,
          batch_number,
          unit_cost,
          line_total,
          notes
        )
        VALUES ?
      `,
      [itemValues]
    );

    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length) {
      const photoValues = files.map((file) => [
        wastageId,
        file.filename,
        `/uploads/wastage-photos/${file.filename}`,
        file.originalname || file.filename,
      ]);

      await q(
        `
          INSERT INTO wastage_photos (
            wastage_id,
            file_name,
            file_path,
            original_name
          )
          VALUES ?
        `,
        [photoValues]
      );
    }

    for (const item of validItems) {
      await applyBatchWastage(item.item_id, item.batch_number, item.quantity);
      await insertStockMovement({
        itemId: item.item_id,
        wastageId,
        quantity: item.quantity,
        wastageNumber,
      });

      try {
        await wrapRefreshInventorySnapshot(item.item_id);
      } catch (err) {
        console.error("refreshInventorySnapshot error:", err.message);
      }
    }

    res.status(201).json({
      message: "Wastage recorded successfully",
      wastageId,
      wastageNumber,
    });
  } catch (err) {
    console.error("createWastage error:", err);
    res.status(500).json({ message: "Failed to record wastage", error: err.message });
  }
};

module.exports = {
  getAllWastage,
  getWastageById,
  createWastage,
};