const db = require("../config/db");
const { sendReturnNoteEmail } = require("../services/returnNoteEmail.service");

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

  if (!(await tableExists("returns"))) {
    await q(`
      CREATE TABLE \`returns\` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        return_number VARCHAR(50) NOT NULL,
        purchase_order_id INT NULL,
        supplier_id INT NOT NULL,
        return_date DATE NOT NULL,
        reason VARCHAR(150) NULL,
        remarks TEXT NULL,
        deducted_from_supplier_payment TINYINT(1) NOT NULL DEFAULT 0,
        status VARCHAR(40) NOT NULL DEFAULT 'draft',
        created_by INT NULL,
        created_by_name VARCHAR(150) NULL,
        email_sent_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
  } else {
    const cols = await getTableColumns("returns");
    if (!cols.has("return_number")) await q(`ALTER TABLE \`returns\` ADD COLUMN return_number VARCHAR(50) NOT NULL`);
    if (!cols.has("purchase_order_id")) await q(`ALTER TABLE \`returns\` ADD COLUMN purchase_order_id INT NULL`);
    if (!cols.has("supplier_id")) await q(`ALTER TABLE \`returns\` ADD COLUMN supplier_id INT NOT NULL`);
    if (!cols.has("return_date")) await q(`ALTER TABLE \`returns\` ADD COLUMN return_date DATE NOT NULL`);
    if (!cols.has("reason")) await q(`ALTER TABLE \`returns\` ADD COLUMN reason VARCHAR(150) NULL`);
    if (!cols.has("remarks")) await q(`ALTER TABLE \`returns\` ADD COLUMN remarks TEXT NULL`);
    if (!cols.has("deducted_from_supplier_payment")) await q(`ALTER TABLE \`returns\` ADD COLUMN deducted_from_supplier_payment TINYINT(1) NOT NULL DEFAULT 0`);
    if (!cols.has("status")) await q(`ALTER TABLE \`returns\` ADD COLUMN status VARCHAR(40) NOT NULL DEFAULT 'draft'`);
    if (!cols.has("created_by")) await q(`ALTER TABLE \`returns\` ADD COLUMN created_by INT NULL`);
    if (!cols.has("created_by_name")) await q(`ALTER TABLE \`returns\` ADD COLUMN created_by_name VARCHAR(150) NULL`);
    if (!cols.has("email_sent_at")) await q(`ALTER TABLE \`returns\` ADD COLUMN email_sent_at DATETIME NULL`);
    if (!cols.has("created_at")) await q(`ALTER TABLE \`returns\` ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    if (!cols.has("updated_at")) await q(`ALTER TABLE \`returns\` ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
  }

  if (!(await tableExists("return_items"))) {
    await q(`
      CREATE TABLE return_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        return_id INT NOT NULL,
        item_id INT NOT NULL,
        quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
        unit VARCHAR(30) NULL,
        batch_number VARCHAR(120) NULL,
        unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
        line_total DECIMAL(12,2) NOT NULL DEFAULT 0,
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_return_items_return (return_id)
      )
    `);
  } else {
    const cols = await getTableColumns("return_items");
    if (!cols.has("return_id")) await q(`ALTER TABLE return_items ADD COLUMN return_id INT NOT NULL`);
    if (!cols.has("item_id")) await q(`ALTER TABLE return_items ADD COLUMN item_id INT NOT NULL`);
    if (!cols.has("quantity")) await q(`ALTER TABLE return_items ADD COLUMN quantity DECIMAL(12,2) NOT NULL DEFAULT 0`);
    if (!cols.has("unit")) await q(`ALTER TABLE return_items ADD COLUMN unit VARCHAR(30) NULL`);
    if (!cols.has("batch_number")) await q(`ALTER TABLE return_items ADD COLUMN batch_number VARCHAR(120) NULL`);
    if (!cols.has("unit_cost")) await q(`ALTER TABLE return_items ADD COLUMN unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0`);
    if (!cols.has("line_total")) await q(`ALTER TABLE return_items ADD COLUMN line_total DECIMAL(12,2) NOT NULL DEFAULT 0`);
    if (!cols.has("notes")) await q(`ALTER TABLE return_items ADD COLUMN notes TEXT NULL`);
  }

  if (!(await tableExists("return_photos"))) {
    await q(`
      CREATE TABLE return_photos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        return_id INT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        original_name VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_return_photos_return (return_id)
      )
    `);
  } else {
    const cols = await getTableColumns("return_photos");
    if (!cols.has("file_name")) await q(`ALTER TABLE return_photos ADD COLUMN file_name VARCHAR(255) NOT NULL`);
    if (!cols.has("file_path")) await q(`ALTER TABLE return_photos ADD COLUMN file_path VARCHAR(500) NOT NULL`);
    if (!cols.has("original_name")) await q(`ALTER TABLE return_photos ADD COLUMN original_name VARCHAR(255) NULL`);
    if (!cols.has("created_at")) await q(`ALTER TABLE return_photos ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
  }

  clearCache();
  ensured = true;
};

const getPoItemSource = async (purchaseOrderId) => {
  if (await tableExists("po_items")) {
    const rows = await q(`SELECT COUNT(*) AS total FROM po_items WHERE purchase_order_id = ?`, [purchaseOrderId]);
    if (Number(rows?.[0]?.total || 0) > 0) return "po_items";
  }

  if (await tableExists("purchase_order_items")) {
    const rows = await q(`SELECT COUNT(*) AS total FROM purchase_order_items WHERE purchase_order_id = ?`, [purchaseOrderId]);
    if (Number(rows?.[0]?.total || 0) > 0) return "purchase_order_items";
  }

  return null;
};

const generateReturnNumber = async () => {
  const year = new Date().getFullYear();
  const rows = await q(
    `SELECT return_number FROM \`returns\` WHERE return_number LIKE ? ORDER BY id DESC LIMIT 100`,
    [`RTN-${year}-%`]
  );

  let maxNo = 0;
  rows.forEach((row) => {
    const match = String(row.return_number || "").match(/RTN-\d{4}-(\d+)$/);
    if (match) maxNo = Math.max(maxNo, Number(match[1] || 0));
  });

  return `RTN-${year}-${String(maxNo + 1).padStart(3, "0")}`;
};

const loadReturnNoteById = async (returnId) => {
  const headerRows = await q(
    `
      SELECT
        r.*,
        po.po_number,
        s.supplier_name,
        s.contact_number,
        s.whatsapp_number,
        s.email,
        s.address,
        s.city
      FROM \`returns\` r
      LEFT JOIN purchase_orders po ON po.id = r.purchase_order_id
      JOIN suppliers s ON s.id = r.supplier_id
      WHERE r.id = ?
      LIMIT 1
    `,
    [returnId]
  );

  if (!headerRows.length) return null;

  const items = await q(
    `
      SELECT
        ri.*,
        i.name AS item_name,
        i.code AS item_code
      FROM return_items ri
      JOIN items i ON i.id = ri.item_id
      WHERE ri.return_id = ?
      ORDER BY ri.id ASC
    `,
    [returnId]
  );

  const photos = await q(
    `
      SELECT id, file_name, file_path, original_name, created_at
      FROM return_photos
      WHERE return_id = ?
      ORDER BY id ASC
    `,
    [returnId]
  );

  const header = headerRows[0];
  return {
    ...header,
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

const getAllReturns = async (_req, res) => {
  try {
    await ensureRuntimeSchema();

    const rows = await q(`
      SELECT
        r.id,
        r.return_number,
        r.return_date,
        r.reason,
        r.status,
        r.deducted_from_supplier_payment,
        r.created_by_name,
        r.email_sent_at,
        r.purchase_order_id,
        r.supplier_id,
        po.po_number,
        s.supplier_name,
        COALESCE(COUNT(DISTINCT ri.id), 0) AS item_count,
        COALESCE(SUM(ri.quantity), 0) AS total_qty,
        COALESCE(SUM(ri.line_total), 0) AS total_amount,
        COALESCE(COUNT(DISTINCT rp.id), 0) AS photo_count
      FROM \`returns\` r
      LEFT JOIN purchase_orders po ON po.id = r.purchase_order_id
      JOIN suppliers s ON s.id = r.supplier_id
      LEFT JOIN return_items ri ON ri.return_id = r.id
      LEFT JOIN return_photos rp ON rp.return_id = r.id
      GROUP BY
        r.id,
        r.return_number,
        r.return_date,
        r.reason,
        r.status,
        r.deducted_from_supplier_payment,
        r.created_by_name,
        r.email_sent_at,
        r.purchase_order_id,
        r.supplier_id,
        po.po_number,
        s.supplier_name
      ORDER BY r.id DESC
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
    console.error("getAllReturns error:", err);
    res.status(500).json({ message: "Failed to load returns", error: err.message });
  }
};

const getReturnById = async (req, res) => {
  try {
    await ensureRuntimeSchema();

    const note = await loadReturnNoteById(Number(req.params.id || 0));
    if (!note) {
      return res.status(404).json({ message: "Return note not found" });
    }

    res.json({
      ...note,
      photos: (note.photos || []).map((photo) => ({
        ...photo,
        file_path:
          photo.file_path && String(photo.file_path).startsWith("/uploads")
            ? photo.file_path
            : `/uploads/return-photos/${photo.file_name}`,
      })),
    });
  } catch (err) {
    console.error("getReturnById error:", err);
    res.status(500).json({ message: "Failed to load return note details", error: err.message });
  }
};

const getPurchaseOrderItemsForReturn = async (req, res) => {
  try {
    await ensureRuntimeSchema();

    const purchaseOrderId = Number(req.params.purchaseOrderId || 0);
    const source = await getPoItemSource(purchaseOrderId);

    if (!source) {
      return res.status(404).json({ message: "No PO items found for this purchase order" });
    }

    let sql = "";

    if (source === "po_items") {
      sql = `
        SELECT
          poi.id AS purchase_order_item_id,
          poi.item_id,
          COALESCE(poi.ordered_qty, 0) AS ordered_quantity,
          COALESCE(poi.unit_price, 0) AS unit_price,
          COALESCE(poi.unit, i.unit, '') AS unit,
          i.name AS item_name,
          i.code AS item_code,
          po.id AS purchase_order_id,
          po.po_number,
          po.supplier_id,
          s.supplier_name
        FROM po_items poi
        JOIN purchase_orders po ON po.id = poi.purchase_order_id
        JOIN suppliers s ON s.id = po.supplier_id
        JOIN items i ON i.id = poi.item_id
        WHERE poi.purchase_order_id = ?
        ORDER BY poi.id ASC
      `;
    } else {
      sql = `
        SELECT
          poi.id AS purchase_order_item_id,
          poi.item_id,
          COALESCE(poi.quantity, 0) AS ordered_quantity,
          COALESCE(i.unit_cost, 0) AS unit_price,
          COALESCE(i.unit, '') AS unit,
          i.name AS item_name,
          i.code AS item_code,
          po.id AS purchase_order_id,
          po.po_number,
          po.supplier_id,
          s.supplier_name
        FROM purchase_order_items poi
        JOIN purchase_orders po ON po.id = poi.purchase_order_id
        JOIN suppliers s ON s.id = po.supplier_id
        JOIN items i ON i.id = poi.item_id
        WHERE poi.purchase_order_id = ?
        ORDER BY poi.id ASC
      `;
    }

    const rows = await q(sql, [purchaseOrderId]);
    res.json(rows);
  } catch (err) {
    console.error("getPurchaseOrderItemsForReturn error:", err);
    res.status(500).json({ message: "Failed to load return items", error: err.message });
  }
};

const createReturn = async (req, res) => {
  try {
    await ensureRuntimeSchema();

    const purchaseOrderId = req.body.purchase_order_id ? Number(req.body.purchase_order_id) : null;
    const supplierId = Number(req.body.supplier_id || 0);
    const returnDate = safeText(req.body.return_date);
    const reason = safeText(req.body.reason);
    const remarks = safeText(req.body.remarks);
    const deductedFromSupplierPayment = Number(req.body.deducted_from_supplier_payment || 0) === 1 ? 1 : 0;
    const createdBy = req.user?.id || null;
    const createdByName =
      req.user?.full_name || req.user?.name || req.user?.username || "Manager User";

    const bodyItems =
      typeof req.body.items === "string" ? JSON.parse(req.body.items || "[]") : req.body.items;
    const items = Array.isArray(bodyItems) ? bodyItems : [];

    if (!supplierId || !returnDate || !items.length) {
      return res.status(400).json({ message: "Supplier, return date, and items are required" });
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
          line_total: quantity * unitCost,
          notes: safeText(item.notes),
        };
      })
      .filter(Boolean);

    if (!validItems.length) {
      return res.status(400).json({ message: "At least one return item is required" });
    }

    const returnNumber = await generateReturnNumber();

    const headerResult = await q(
      `
        INSERT INTO \`returns\` (
          return_number,
          purchase_order_id,
          supplier_id,
          return_date,
          reason,
          remarks,
          deducted_from_supplier_payment,
          status,
          created_by,
          created_by_name
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        returnNumber,
        purchaseOrderId,
        supplierId,
        returnDate,
        reason || null,
        remarks || null,
        deductedFromSupplierPayment,
        "draft",
        createdBy,
        createdByName,
      ]
    );

    const returnId = headerResult.insertId;

    const itemValues = validItems.map((item) => [
      returnId,
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
        INSERT INTO return_items (
          return_id,
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
        returnId,
        file.filename,
        `/uploads/return-photos/${file.filename}`,
        file.originalname || file.filename,
      ]);

      await q(
        `
          INSERT INTO return_photos (
            return_id,
            file_name,
            file_path,
            original_name
          )
          VALUES ?
        `,
        [photoValues]
      );
    }

    clearCache();

    res.status(201).json({
      message: "Return note created successfully",
      returnId,
      returnNumber,
    });
  } catch (err) {
    console.error("createReturn error:", err);
    res.status(500).json({ message: "Failed to create return note", error: err.message });
  }
};

const sendReturnEmail = async (req, res) => {
  try {
    await ensureRuntimeSchema();

    const returnId = Number(req.params.id || 0);
    const overrideEmail = safeText(req.body?.toEmail || "");

    const note = await loadReturnNoteById(returnId);
    if (!note) {
      return res.status(404).json({ message: "Return note not found" });
    }

    await sendReturnNoteEmail(note, overrideEmail);

    await q(`UPDATE \`returns\` SET email_sent_at = NOW(), status = 'sent' WHERE id = ?`, [returnId]);

    res.json({ message: "Return note email sent successfully" });
  } catch (err) {
    console.error("sendReturnEmail error:", err);
    res.status(500).json({ message: err.message || "Failed to send return note email" });
  }
};

module.exports = {
  getAllReturns,
  getReturnById,
  getPurchaseOrderItemsForReturn,
  createReturn,
  sendReturnEmail,
};