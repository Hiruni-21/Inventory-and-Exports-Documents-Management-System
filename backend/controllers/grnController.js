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

  const set = new Set(rows.map((r) => r.COLUMN_NAME));
  tableCache[tableName] = set;
  return set;
};

const ensureRuntimeSchema = async () => {
  if (ensured) return;

  if (!(await tableExists("grn"))) throw new Error("grn table does not exist");
  if (!(await tableExists("grn_items"))) throw new Error("grn_items table does not exist");

  const grnCols = await getTableColumns("grn");
  const grnAlters = [];

  if (!grnCols.has("supplier_invoice_no")) grnAlters.push("ADD COLUMN supplier_invoice_no VARCHAR(120) NULL");
  if (!grnCols.has("po_order_date")) grnAlters.push("ADD COLUMN po_order_date DATE NULL");
  if (!grnCols.has("received_by_name")) grnAlters.push("ADD COLUMN received_by_name VARCHAR(150) NULL");
  if (!grnCols.has("remarks")) grnAlters.push("ADD COLUMN remarks TEXT NULL");
  if (!grnCols.has("status")) grnAlters.push("ADD COLUMN status VARCHAR(40) NOT NULL DEFAULT 'received'");
  if (!grnCols.has("verification_required")) grnAlters.push("ADD COLUMN verification_required TINYINT(1) NOT NULL DEFAULT 0");
  if (!grnCols.has("inventory_posted")) grnAlters.push("ADD COLUMN inventory_posted TINYINT(1) NOT NULL DEFAULT 0");
  if (!grnCols.has("verified_by")) grnAlters.push("ADD COLUMN verified_by INT NULL");
  if (!grnCols.has("verified_at")) grnAlters.push("ADD COLUMN verified_at DATETIME NULL");

  for (const sql of grnAlters) {
    await q(`ALTER TABLE grn ${sql}`);
  }

  const itemCols = await getTableColumns("grn_items");
  const itemAlters = [];

  if (!itemCols.has("purchase_order_item_id")) itemAlters.push("ADD COLUMN purchase_order_item_id INT NULL");
  if (!itemCols.has("ordered_qty")) itemAlters.push("ADD COLUMN ordered_qty DECIMAL(12,2) NOT NULL DEFAULT 0");
  if (!itemCols.has("received_qty")) itemAlters.push("ADD COLUMN received_qty DECIMAL(12,2) NOT NULL DEFAULT 0");
  if (!itemCols.has("variance_qty")) itemAlters.push("ADD COLUMN variance_qty DECIMAL(12,2) NOT NULL DEFAULT 0");
  if (!itemCols.has("variance_percent")) itemAlters.push("ADD COLUMN variance_percent DECIMAL(12,2) NOT NULL DEFAULT 0");
  if (!itemCols.has("batch_number")) itemAlters.push("ADD COLUMN batch_number VARCHAR(120) NULL");
  if (!itemCols.has("expiry_date")) itemAlters.push("ADD COLUMN expiry_date DATE NULL");
  if (!itemCols.has("quality_grade")) itemAlters.push("ADD COLUMN quality_grade VARCHAR(40) NULL");
  if (!itemCols.has("unit_cost")) itemAlters.push("ADD COLUMN unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0");
  if (!itemCols.has("line_total")) itemAlters.push("ADD COLUMN line_total DECIMAL(12,2) NOT NULL DEFAULT 0");
  if (!itemCols.has("notes")) itemAlters.push("ADD COLUMN notes TEXT NULL");
  if (!itemCols.has("verification_required")) itemAlters.push("ADD COLUMN verification_required TINYINT(1) NOT NULL DEFAULT 0");

  for (const sql of itemAlters) {
    await q(`ALTER TABLE grn_items ${sql}`);
  }

  if (!(await tableExists("grn_photos"))) {
    await q(`
      CREATE TABLE grn_photos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        grn_id INT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        original_name VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_grn_photos_grn (grn_id)
      )
    `);
  }

  clearCache();
  ensured = true;
};

const wrapRefreshInventorySnapshot = (itemId) =>
  new Promise((resolve, reject) => {
    if (typeof refreshInventorySnapshot !== "function") return resolve();
    refreshInventorySnapshot(itemId, (err) => (err ? reject(err) : resolve()));
  });

const generateGrnNumber = async () => {
  const year = new Date().getFullYear();
  const rows = await q(
    `
      SELECT grn_number
      FROM grn
      WHERE grn_number LIKE ?
      ORDER BY id DESC
      LIMIT 100
    `,
    [`GRN-${year}-%`]
  );

  let maxNo = 0;
  rows.forEach((row) => {
    const match = String(row.grn_number || "").match(/GRN-\d{4}-(\d+)$/);
    if (match) {
      maxNo = Math.max(maxNo, Number(match[1] || 0));
    }
  });

  return `GRN-${year}-${String(maxNo + 1).padStart(3, "0")}`;
};

const varianceMeta = (orderedQty, receivedQty) => {
  const ordered = safeNumber(orderedQty, 0);
  const received = safeNumber(receivedQty, 0);
  const varianceQty = received - ordered;
  const variancePercent = ordered > 0 ? (Math.abs(varianceQty) / ordered) * 100 : received > 0 ? 100 : 0;
  const verificationRequired = Math.abs(varianceQty) > 1 || variancePercent > 5;
  return { varianceQty, variancePercent, verificationRequired };
};

const getPoItemSource = async (purchaseOrderId) => {
  if (await tableExists("po_items")) {
    const rows = await q(`SELECT COUNT(*) AS total FROM po_items WHERE purchase_order_id = ?`, [purchaseOrderId]);
    if (Number(rows?.[0]?.total || 0) > 0) return "po_items";
  }

  if (await tableExists("purchase_order_items")) {
    const rows = await q(
      `SELECT COUNT(*) AS total FROM purchase_order_items WHERE purchase_order_id = ?`,
      [purchaseOrderId]
    );
    if (Number(rows?.[0]?.total || 0) > 0) return "purchase_order_items";
  }

  return null;
};

const getPurchaseOrderItemsForGrn = async (req, res) => {
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
          COALESCE(po.order_date, DATE(po.created_at)) AS po_order_date,
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
          COALESCE(po.order_date, DATE(po.created_at)) AS po_order_date,
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
    console.error("getPurchaseOrderItemsForGrn error:", err);
    res.status(500).json({ message: "Failed to load PO items", error: err.message });
  }
};

const insertInventoryBatch = async ({
  itemId,
  grnId,
  batchCode,
  receivedQty,
  unit,
  receivedDate,
  expiryDate,
}) => {
  if (!(await tableExists("inventory_batches"))) return;

  const cols = await getTableColumns("inventory_batches");
  const fields = [];
  const values = [];

  if (cols.has("item_id")) {
    fields.push("item_id");
    values.push(itemId);
  }
  if (cols.has("grn_id")) {
    fields.push("grn_id");
    values.push(grnId);
  }
  if (cols.has("batch_code")) {
    fields.push("batch_code");
    values.push(batchCode);
  }
  if (cols.has("received_quantity")) {
    fields.push("received_quantity");
    values.push(receivedQty);
  }
  if (cols.has("available_quantity")) {
    fields.push("available_quantity");
    values.push(receivedQty);
  }
  if (cols.has("unit")) {
    fields.push("unit");
    values.push(unit || "");
  }
  if (cols.has("received_date")) {
    fields.push("received_date");
    values.push(receivedDate);
  }
  if (cols.has("expiry_date")) {
    fields.push("expiry_date");
    values.push(expiryDate || null);
  }
  if (cols.has("status")) {
    fields.push("status");
    values.push("Available");
  }

  if (!fields.length) return;

  await q(
    `INSERT INTO inventory_batches (${fields.join(", ")}) VALUES (${fields.map(() => "?").join(", ")})`,
    values
  );
};

const insertStockMovement = async ({ itemId, grnId, quantity, grnNumber }) => {
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
    values.push("IN");
  }
  if (cols.has("reference_type")) {
    fields.push("reference_type");
    values.push("GRN");
  }
  if (cols.has("reference_id")) {
    fields.push("reference_id");
    values.push(grnId);
  }
  if (cols.has("quantity")) {
    fields.push("quantity");
    values.push(quantity);
  }
  if (cols.has("notes")) {
    fields.push("notes");
    values.push(`Stock added from GRN ${grnNumber}`);
  }

  if (!fields.length) return;

  await q(
    `INSERT INTO stock_movements (${fields.join(", ")}) VALUES (${fields.map(() => "?").join(", ")})`,
    values
  );
};

const postInventoryFromGrn = async (grnId, grnNumber) => {
  const rows = await q(
    `
      SELECT
        gi.item_id,
        gi.received_qty,
        gi.batch_number,
        gi.expiry_date,
        i.unit
      FROM grn_items gi
      JOIN items i ON i.id = gi.item_id
      WHERE gi.grn_id = ?
      ORDER BY gi.id ASC
    `,
    [grnId]
  );

  const header = await q(`SELECT received_date FROM grn WHERE id = ? LIMIT 1`, [grnId]);
  const receivedDate = header?.[0]?.received_date || null;

  for (const row of rows) {
    await insertInventoryBatch({
      itemId: row.item_id,
      grnId,
      batchCode: row.batch_number || `BT-${grnId}-${row.item_id}`,
      receivedQty: Number(row.received_qty || 0),
      unit: row.unit || "",
      receivedDate,
      expiryDate: row.expiry_date || null,
    });

    await insertStockMovement({
      itemId: row.item_id,
      grnId,
      quantity: Number(row.received_qty || 0),
      grnNumber,
    });

    try {
      await wrapRefreshInventorySnapshot(row.item_id);
    } catch (err) {
      console.error("refreshInventorySnapshot error:", err.message);
    }
  }

  await q(`UPDATE grn SET inventory_posted = 1 WHERE id = ?`, [grnId]);
};

const updatePurchaseOrderStatus = async (purchaseOrderId) => {
  if (!(await tableExists("purchase_orders"))) return;
  const cols = await getTableColumns("purchase_orders");
  if (!cols.has("status")) return;
  await q(`UPDATE purchase_orders SET status = 'grn_created' WHERE id = ?`, [purchaseOrderId]);
};

const getAllGrn = async (_req, res) => {
  try {
    await ensureRuntimeSchema();

    const rows = await q(`
      SELECT
        g.id,
        g.grn_number,
        g.po_order_date,
        g.received_date,
        g.received_by_name,
        g.status,
        g.verification_required,
        g.inventory_posted,
        g.purchase_order_id,
        g.supplier_id,
        po.po_number,
        s.supplier_name,
        COALESCE(COUNT(DISTINCT gi.id), 0) AS item_count,
        COALESCE(SUM(gi.received_qty), 0) AS total_received_qty,
        COALESCE(SUM(gi.variance_qty), 0) AS total_variance_qty,
        COALESCE(COUNT(DISTINCT gp.id), 0) AS photo_count
      FROM grn g
      JOIN purchase_orders po ON po.id = g.purchase_order_id
      JOIN suppliers s ON s.id = g.supplier_id
      LEFT JOIN grn_items gi ON gi.grn_id = g.id
      LEFT JOIN grn_photos gp ON gp.grn_id = g.id
      GROUP BY
        g.id,
        g.grn_number,
        g.po_order_date,
        g.received_date,
        g.received_by_name,
        g.status,
        g.verification_required,
        g.inventory_posted,
        g.purchase_order_id,
        g.supplier_id,
        po.po_number,
        s.supplier_name
      ORDER BY g.id DESC
    `);

    res.json(
      rows.map((row) => ({
        ...row,
        created_by_name: row.received_by_name || "—",
        verified_by_name:
          Number(row.verification_required || 0) === 1 && String(row.status || "").toLowerCase() !== "verified"
            ? "Pending Ops"
            : String(row.status || "").toLowerCase() === "verified"
            ? "Verified"
            : "—",
        item_count: Number(row.item_count || 0),
        total_received_qty: Number(row.total_received_qty || 0),
        total_variance_qty: Number(row.total_variance_qty || 0),
        photo_count: Number(row.photo_count || 0),
      }))
    );
  } catch (err) {
    console.error("getAllGrn error:", err);
    res.status(500).json({ message: "Failed to load GRNs", error: err.message });
  }
};

const getGrnById = async (req, res) => {
  try {
    await ensureRuntimeSchema();

    const grnId = Number(req.params.id || 0);

    const headerRows = await q(
      `
        SELECT
          g.*,
          po.po_number,
          s.supplier_name,
          s.contact_number,
          s.whatsapp_number,
          s.email,
          s.address,
          s.city
        FROM grn g
        JOIN purchase_orders po ON po.id = g.purchase_order_id
        JOIN suppliers s ON s.id = g.supplier_id
        WHERE g.id = ?
        LIMIT 1
      `,
      [grnId]
    );

    if (!headerRows.length) {
      return res.status(404).json({ message: "GRN not found" });
    }

    const items = await q(
      `
        SELECT
          gi.*,
          i.name AS item_name,
          i.code AS item_code,
          i.unit
        FROM grn_items gi
        JOIN items i ON i.id = gi.item_id
        WHERE gi.grn_id = ?
        ORDER BY gi.id ASC
      `,
      [grnId]
    );

    let photos = [];
    if (await tableExists("grn_photos")) {
      photos = await q(
        `
          SELECT
            id,
            file_name,
            file_path,
            original_name,
            created_at
          FROM grn_photos
          WHERE grn_id = ?
          ORDER BY id ASC
        `,
        [grnId]
      );
    }

    const header = headerRows[0];

    res.json({
      ...header,
      created_by_name: header.received_by_name || "—",
      verified_by_name:
        String(header.status || "").toLowerCase() === "verified"
          ? "Verified"
          : Number(header.verification_required || 0) === 1
          ? "Pending Ops"
          : "—",
      items: items.map((row) => ({
        ...row,
        ordered_qty: Number(row.ordered_qty || 0),
        received_qty: Number(row.received_qty || 0),
        variance_qty: Number(row.variance_qty || 0),
        variance_percent: Number(row.variance_percent || 0),
        unit_cost: Number(row.unit_cost || 0),
        line_total: Number(row.line_total || 0),
        verification_required: Number(row.verification_required || 0),
      })),
      photos: photos.map((photo) => ({
        ...photo,
        file_path:
          photo.file_path && String(photo.file_path).startsWith("/uploads")
            ? photo.file_path
            : `/uploads/grn-photos/${photo.file_name}`,
      })),
    });
  } catch (err) {
    console.error("getGrnById error:", err);
    res.status(500).json({ message: "Failed to load GRN details", error: err.message });
  }
};

const createGrn = async (req, res) => {
  try {
    await ensureRuntimeSchema();

    const purchaseOrderId = Number(req.body.purchase_order_id || 0);
    const supplierId = Number(req.body.supplier_id || 0);
    const receivedDate = safeText(req.body.received_date);
    const supplierInvoiceNo = safeText(req.body.supplier_invoice_no);
    const receivedByName = safeText(req.body.received_by_name || req.user?.full_name || req.user?.name || "");
    const remarks = safeText(req.body.remarks);
    const createdBy = req.user?.id || null;

    const bodyItems =
      typeof req.body.items === "string" ? JSON.parse(req.body.items || "[]") : req.body.items;
    const items = Array.isArray(bodyItems) ? bodyItems : [];

    if (!purchaseOrderId || !supplierId || !receivedDate || !items.length) {
      return res.status(400).json({
        message: "Purchase order, supplier, received date, and items are required",
      });
    }

    const poRows = await q(
      `
        SELECT
          po.id,
          po.po_number,
          po.supplier_id,
          COALESCE(po.order_date, DATE(po.created_at)) AS po_order_date
        FROM purchase_orders po
        WHERE po.id = ?
        LIMIT 1
      `,
      [purchaseOrderId]
    );

    if (!poRows.length) {
      return res.status(404).json({ message: "Purchase order not found" });
    }

    const po = poRows[0];
    if (Number(po.supplier_id) !== supplierId) {
      return res.status(400).json({ message: "Supplier does not match selected PO" });
    }

    const validItems = items
      .map((item) => {
        const orderedQty = safeNumber(item.ordered_quantity, 0);
        const receivedQty = safeNumber(item.received_qty ?? item.delivered_quantity, 0);
        if (!Number(item.item_id) || receivedQty <= 0) return null;

        const meta = varianceMeta(orderedQty, receivedQty);

        return {
          purchase_order_item_id: item.purchase_order_item_id ? Number(item.purchase_order_item_id) : null,
          item_id: Number(item.item_id),
          ordered_qty: orderedQty,
          received_qty: receivedQty,
          variance_qty: meta.varianceQty,
          variance_percent: meta.variancePercent,
          batch_number: safeText(item.batch_number),
          expiry_date: safeText(item.expiry_date) || null,
          quality_grade: safeText(item.quality_grade || "Grade A"),
          unit_cost: safeNumber(item.unit_cost, 0),
          line_total: receivedQty * safeNumber(item.unit_cost, 0),
          notes: safeText(item.notes),
          verification_required: meta.verificationRequired ? 1 : 0,
        };
      })
      .filter(Boolean);

    if (!validItems.length) {
      return res.status(400).json({ message: "At least one received item is required" });
    }

    const anyVariance = validItems.some((item) => Number(item.verification_required) === 1);
    const files = Array.isArray(req.files) ? req.files : [];

    if (anyVariance && files.length === 0) {
      return res.status(400).json({ message: "Photo evidence is required when variance exists" });
    }

    const grnNumber = await generateGrnNumber();

    const insertHeader = await q(
      `
        INSERT INTO grn (
          grn_number,
          purchase_order_id,
          supplier_id,
          supplier_invoice_no,
          po_order_date,
          received_date,
          received_by_name,
          remarks,
          created_by,
          status,
          verification_required,
          inventory_posted
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        grnNumber,
        purchaseOrderId,
        supplierId,
        supplierInvoiceNo || null,
        po.po_order_date || null,
        receivedDate,
        receivedByName || null,
        remarks || null,
        createdBy,
        anyVariance ? "pending_verification" : "received",
        anyVariance ? 1 : 0,
        0,
      ]
    );

    const grnId = insertHeader.insertId;

    const itemValues = validItems.map((item) => [
      grnId,
      item.purchase_order_item_id,
      item.item_id,
      item.ordered_qty,
      item.received_qty,
      item.variance_qty,
      item.variance_percent,
      item.batch_number || `BT-${grnId}-${item.item_id}`,
      item.expiry_date,
      item.quality_grade,
      item.unit_cost,
      item.line_total,
      item.notes || remarks || null,
      item.verification_required,
    ]);

    await q(
      `
        INSERT INTO grn_items (
          grn_id,
          purchase_order_item_id,
          item_id,
          ordered_qty,
          received_qty,
          variance_qty,
          variance_percent,
          batch_number,
          expiry_date,
          quality_grade,
          unit_cost,
          line_total,
          notes,
          verification_required
        )
        VALUES ?
      `,
      [itemValues]
    );

    if (files.length) {
      const photoValues = files.map((file) => [
        grnId,
        file.filename,
        `/uploads/grn-photos/${file.filename}`,
        file.originalname || file.filename,
      ]);

      await q(
        `
          INSERT INTO grn_photos (
            grn_id,
            file_name,
            file_path,
            original_name
          )
          VALUES ?
        `,
        [photoValues]
      );
    }

    if (!anyVariance) {
      await postInventoryFromGrn(grnId, grnNumber);
    }

    await updatePurchaseOrderStatus(purchaseOrderId);
    clearCache();

    res.status(201).json({
      message: anyVariance
        ? "GRN created. Ops verification required before stock update."
        : "GRN created and stock updated successfully",
      grnId,
      grnNumber,
      verificationRequired: anyVariance,
    });
  } catch (err) {
    console.error("createGrn error:", err);
    res.status(500).json({ message: "Failed to create GRN", error: err.message });
  }
};

const verifyGrn = async (req, res) => {
  try {
    await ensureRuntimeSchema();

    const grnId = Number(req.params.id || 0);
    const verifierId = req.user?.id || null;

    const rows = await q(`SELECT * FROM grn WHERE id = ? LIMIT 1`, [grnId]);
    if (!rows.length) {
      return res.status(404).json({ message: "GRN not found" });
    }

    const grn = rows[0];

    if (Number(grn.inventory_posted || 0) === 1) {
      return res.json({ message: "Inventory already posted for this GRN" });
    }

    await postInventoryFromGrn(grnId, grn.grn_number);

    await q(
      `
        UPDATE grn
        SET
          status = 'verified',
          verified_by = ?,
          verified_at = NOW(),
          inventory_posted = 1
        WHERE id = ?
      `,
      [verifierId, grnId]
    );

    await updatePurchaseOrderStatus(grn.purchase_order_id);

    res.json({ message: "GRN verified and stock updated successfully" });
  } catch (err) {
    console.error("verifyGrn error:", err);
    res.status(500).json({ message: "Failed to verify GRN", error: err.message });
  }
};

module.exports = {
  getAllGrn,
  getGrnById,
  getPurchaseOrderItemsForGrn,
  createGrn,
  verifyGrn,
};