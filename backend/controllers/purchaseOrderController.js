const db = require("../config/db");

const q = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

let ensured = false;
let tableCache = {};
let poItemsMetaCache = null;

const clearCache = () => {
  ensured = false;
  tableCache = {};
  poItemsMetaCache = null;
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

  const set = new Set(rows.map((row) => row.COLUMN_NAME));
  tableCache[tableName] = set;
  return set;
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

const ensurePurchaseOrderRuntimeSchema = async () => {
  if (ensured) return;

  const poExists = await tableExists("purchase_orders");
  if (!poExists) {
    throw new Error("purchase_orders table does not exist");
  }

  const poCols = await getTableColumns("purchase_orders");
  const alterPo = [];

  if (!poCols.has("requested_by")) alterPo.push("ADD COLUMN requested_by INT NULL");
  if (!poCols.has("approved_by")) alterPo.push("ADD COLUMN approved_by INT NULL");
  if (!poCols.has("sent_by")) alterPo.push("ADD COLUMN sent_by INT NULL");
  if (!poCols.has("expected_date")) alterPo.push("ADD COLUMN expected_date DATE NULL");
  if (!poCols.has("payment_terms")) alterPo.push("ADD COLUMN payment_terms VARCHAR(100) NULL");
  if (!poCols.has("notes")) alterPo.push("ADD COLUMN notes TEXT NULL");
  if (!poCols.has("status")) alterPo.push("ADD COLUMN status VARCHAR(40) NOT NULL DEFAULT 'draft'");
  if (!poCols.has("total_amount")) alterPo.push("ADD COLUMN total_amount DECIMAL(14,2) NOT NULL DEFAULT 0");
  if (!poCols.has("updated_at")) {
    alterPo.push(
      "ADD COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    );
  }

  for (const statement of alterPo) {
    await q(`ALTER TABLE purchase_orders ${statement}`);
  }

  const hasLegacyItems = await tableExists("purchase_order_items");
  const hasPoItems = await tableExists("po_items");

  if (!hasLegacyItems && !hasPoItems) {
    await q(`
      CREATE TABLE po_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        purchase_order_id INT NOT NULL,
        item_id INT NOT NULL,
        ordered_qty DECIMAL(12,2) NOT NULL,
        unit VARCHAR(30) NOT NULL,
        unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
        line_total DECIMAL(14,2) NOT NULL DEFAULT 0,
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_po_items_po (purchase_order_id)
      )
    `);
  }

  await q(`
    CREATE TABLE IF NOT EXISTS supplier_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      supplier_id INT NOT NULL,
      message_type VARCHAR(80) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      message_body TEXT NOT NULL,
      linked_kind ENUM('none','order','return') NOT NULL DEFAULT 'none',
      linked_record_id INT NULL,
      sent_by VARCHAR(40) NOT NULL DEFAULT 'System',
      status VARCHAR(40) NOT NULL DEFAULT 'Sent',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  ensured = true;
};

const getPoItemsMeta = async () => {
  if (poItemsMetaCache) return poItemsMetaCache;

  const legacyExists = await tableExists("purchase_order_items");
  const tableName = legacyExists ? "purchase_order_items" : "po_items";
  const cols = await getTableColumns(tableName);

  poItemsMetaCache = {
    tableName,
    qtyCol: cols.has("quantity") ? "quantity" : "ordered_qty",
    unitCol: cols.has("unit") ? "unit" : null,
    priceCol: cols.has("unit_price")
      ? "unit_price"
      : cols.has("price")
      ? "price"
      : null,
    totalCol: cols.has("line_total") ? "line_total" : null,
    notesCol: cols.has("notes") ? "notes" : null,
  };

  return poItemsMetaCache;
};

const roleOf = (req) => String(req.user?.role || "").toLowerCase();
const isManager = (req) => roleOf(req).includes("manager");
const isOps = (req) =>
  roleOf(req).includes("ops") || roleOf(req).includes("operation");
const isSupervisor = (req) => roleOf(req).includes("supervisor");
const isLogistics = (req) => roleOf(req).includes("logistics");
const isSupplier = (req) => roleOf(req).includes("supplier");
const canCreatePo = (req) => isManager(req) || isOps(req);
const canSendPo = (req) => isManager(req) || isOps(req);

const cleanNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const generatePoNumber = async () => {
  const year = new Date().getFullYear();

  const rows = await q(
    `
      SELECT po_number
      FROM purchase_orders
      WHERE po_number LIKE ?
      ORDER BY id DESC
    `,
    [`PO-${year}-%`]
  );

  let maxNo = 0;

  rows.forEach((row) => {
    const match = String(row.po_number || "").match(/PO-\d{4}-(\d+)$/);
    if (!match) return;
    const current = Number(match[1]);
    if (Number.isFinite(current) && current > maxNo) {
      maxNo = current;
    }
  });

  return `PO-${year}-${String(maxNo + 1).padStart(3, "0")}`;
};

const getItemUnitCost = async (itemId) => {
  const rows = await q(
    `SELECT unit, unit_cost, name, code FROM items WHERE id = ? LIMIT 1`,
    [itemId]
  );
  return rows[0] || null;
};

const buildItemsSummarySql = (meta) => {
  const lineTotalExpr = meta.totalCol
    ? `COALESCE(poi.${meta.totalCol}, 0)`
    : meta.priceCol
    ? `COALESCE(poi.${meta.qtyCol}, 0) * COALESCE(poi.${meta.priceCol}, 0)`
    : `0`;

  return `
    SELECT
      poi.purchase_order_id,
      COUNT(*) AS item_count,
      COALESCE(SUM(${lineTotalExpr}), 0) AS items_total,
      COALESCE(SUM(poi.${meta.qtyCol}), 0) AS total_qty
    FROM ${meta.tableName} poi
    GROUP BY poi.purchase_order_id
  `;
};

const getAllPurchaseOrders = async (req, res) => {
  try {
    await ensurePurchaseOrderRuntimeSchema();
    const meta = await getPoItemsMeta();

    const rows = await q(`
      SELECT
        po.id,
        po.po_number,
        po.order_date,
        po.expected_date,
        po.payment_terms,
        po.notes,
        po.status,
        COALESCE(po.total_amount, 0) AS total_amount,
        po.created_at,
        po.updated_at,
        s.supplier_name,
        s.contact_person,
        s.contact_number,
        s.whatsapp_number,
        s.email,
        COALESCE(ureq.full_name, ureq.email) AS requested_by_name,
        COALESCE(uapp.full_name, uapp.email) AS approved_by_name,
        COALESCE(usent.full_name, usent.email) AS sent_by_name,
        COALESCE(poi_summary.item_count, 0) AS item_count,
        COALESCE(poi_summary.total_qty, 0) AS total_qty,
        COALESCE(poi_summary.items_total, COALESCE(po.total_amount, 0)) AS calculated_total
      FROM purchase_orders po
      JOIN suppliers s ON s.id = po.supplier_id
      LEFT JOIN users ureq ON ureq.id = po.requested_by
      LEFT JOIN users uapp ON uapp.id = po.approved_by
      LEFT JOIN users usent ON usent.id = po.sent_by
      LEFT JOIN (${buildItemsSummarySql(meta)}) poi_summary ON poi_summary.purchase_order_id = po.id
      ORDER BY po.created_at DESC, po.id DESC
    `);

    res.json(
      rows.map((row) => ({
        ...row,
        total_amount: Number(row.total_amount || row.calculated_total || 0),
        item_count: Number(row.item_count || 0),
        total_qty: Number(row.total_qty || 0),
      }))
    );
  } catch (err) {
    console.error("getAllPurchaseOrders error:", err);
    res
      .status(500)
      .json({ message: "Failed to load purchase orders", error: err.message });
  }
};

const getPurchaseOrderById = async (req, res) => {
  try {
    await ensurePurchaseOrderRuntimeSchema();
    const meta = await getPoItemsMeta();
    const { id } = req.params;

    const rows = await q(
      `
      SELECT
        po.*,
        s.supplier_name,
        s.contact_person,
        s.contact_number,
        s.whatsapp_number,
        s.email,
        s.city,
        COALESCE(ureq.full_name, ureq.email) AS requested_by_name,
        COALESCE(uapp.full_name, uapp.email) AS approved_by_name,
        COALESCE(usent.full_name, usent.email) AS sent_by_name
      FROM purchase_orders po
      JOIN suppliers s ON s.id = po.supplier_id
      LEFT JOIN users ureq ON ureq.id = po.requested_by
      LEFT JOIN users uapp ON uapp.id = po.approved_by
      LEFT JOIN users usent ON usent.id = po.sent_by
      WHERE po.id = ?
      LIMIT 1
    `,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Purchase order not found" });
    }

    const items = await q(
      `
      SELECT
        poi.id,
        poi.item_id,
        i.code AS item_code,
        i.name AS item_name,
        i.unit AS item_master_unit,
        poi.${meta.qtyCol} AS ordered_qty,
        ${meta.unitCol ? `poi.${meta.unitCol}` : `i.unit`} AS unit,
        ${
          meta.priceCol ? `COALESCE(poi.${meta.priceCol}, 0)` : `0`
        } AS unit_price,
        ${
          meta.totalCol
            ? `COALESCE(poi.${meta.totalCol}, 0)`
            : `COALESCE(poi.${meta.qtyCol}, 0) * COALESCE(${
                meta.priceCol ? `poi.${meta.priceCol}` : 0
              }, 0)`
        } AS line_total,
        ${meta.notesCol ? `poi.${meta.notesCol}` : `NULL`} AS notes
      FROM ${meta.tableName} poi
      JOIN items i ON i.id = poi.item_id
      WHERE poi.purchase_order_id = ?
      ORDER BY poi.id ASC
    `,
      [id]
    );

    const comms = await q(
      `
      SELECT id, message_type, subject, message_body, sent_by, status, created_at
      FROM supplier_messages
      WHERE linked_kind = 'order' AND linked_record_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `,
      [id]
    );

    const totalQty = items.reduce(
      (sum, item) => sum + Number(item.ordered_qty || 0),
      0
    );
    const totalAmount = items.reduce(
      (sum, item) => sum + Number(item.line_total || 0),
      0
    );

    res.json({
      ...rows[0],
      items,
      communications: comms,
      item_count: items.length,
      total_qty: totalQty,
      total_amount: Number(rows[0].total_amount || totalAmount || 0),
    });
  } catch (err) {
    console.error("getPurchaseOrderById error:", err);
    res
      .status(500)
      .json({ message: "Failed to load purchase order details", error: err.message });
  }
};

const createPurchaseOrder = async (req, res) => {
  if (!canCreatePo(req)) {
    return res
      .status(403)
      .json({ message: "Only Manager or Operations can create purchase orders" });
  }

  if (isSupervisor(req) || isLogistics(req) || isSupplier(req)) {
    return res
      .status(403)
      .json({ message: "This role cannot create purchase orders" });
  }

  try {
    await ensurePurchaseOrderRuntimeSchema();
    const meta = await getPoItemsMeta();

    const {
      supplier_id,
      expected_delivery_date,
      expected_date,
      payment_terms,
      remarks,
      notes,
      items = [],
      save_mode,
    } = req.body;

    const supplierId = Number(supplier_id || 0);
    if (!supplierId) {
      return res.status(400).json({ message: "Supplier is required" });
    }

    const requiredDate = String(
      expected_delivery_date || expected_date || ""
    ).trim();
    if (!requiredDate) {
      return res.status(400).json({ message: "Required-by date is required" });
    }

    const cleanItems = [];

    for (const rawItem of items) {
      const itemId = Number(rawItem.item_id || 0);
      const orderedQty = cleanNumber(
        rawItem.quantity ?? rawItem.ordered_qty,
        0
      );

      if (!itemId || orderedQty <= 0) continue;

      const itemMaster = await getItemUnitCost(itemId);
      if (!itemMaster) continue;

      const unit = String(rawItem.unit || itemMaster.unit || "kg").trim();
      const unitPrice = cleanNumber(
        rawItem.price ?? rawItem.unit_price,
        cleanNumber(itemMaster.unit_cost, 0)
      );
      const lineTotal = Number((orderedQty * unitPrice).toFixed(2));

      cleanItems.push({
        item_id: itemId,
        ordered_qty: orderedQty,
        unit,
        unit_price: unitPrice,
        line_total: lineTotal,
        notes: String(rawItem.notes || "").trim() || null,
      });
    }

    if (!cleanItems.length) {
      return res
        .status(400)
        .json({ message: "At least one valid line item is required" });
    }

    const poNumber = await generatePoNumber();
    const totalAmount = Number(
      cleanItems.reduce((sum, item) => sum + item.line_total, 0).toFixed(2)
    );
    const nextStatus =
      String(save_mode || "submit").toLowerCase() === "draft"
        ? "draft"
        : "pending_approval";

    const result = await q(
      `
        INSERT INTO purchase_orders (
          po_number,
          supplier_id,
          requested_by,
          order_date,
          expected_date,
          payment_terms,
          notes,
          status,
          total_amount
        )
        VALUES (?, ?, ?, CURDATE(), ?, ?, ?, ?, ?)
      `,
      [
        poNumber,
        supplierId,
        Number(req.user?.id || 0) || null,
        requiredDate,
        String(payment_terms || "").trim() || null,
        String(notes || remarks || "").trim() || null,
        nextStatus,
        totalAmount,
      ]
    );

    const purchaseOrderId = result.insertId;

    const itemRows = cleanItems.map((item) => {
      if (meta.tableName === "purchase_order_items") {
        return [purchaseOrderId, item.item_id, item.ordered_qty];
      }

      return [
        purchaseOrderId,
        item.item_id,
        item.ordered_qty,
        item.unit,
        item.unit_price,
        item.line_total,
        item.notes,
      ];
    });

    if (meta.tableName === "purchase_order_items") {
      await q(
        `INSERT INTO purchase_order_items (purchase_order_id, item_id, quantity) VALUES ?`,
        [itemRows]
      );
    } else {
      await q(
        `INSERT INTO po_items (purchase_order_id, item_id, ordered_qty, unit, unit_price, line_total, notes) VALUES ?`,
        [itemRows]
      );
    }

    clearCache();

    res.status(201).json({
      message:
        nextStatus === "draft"
          ? "Purchase order draft saved"
          : "Purchase order submitted for approval",
      purchaseOrderId,
      poNumber,
      status: nextStatus,
    });
  } catch (err) {
    console.error("createPurchaseOrder error:", err);
    res
      .status(500)
      .json({ message: "Failed to create purchase order", error: err.message });
  }
};

const approvePurchaseOrder = async (req, res) => {
  if (!isManager(req)) {
    return res.status(403).json({ message: "Manager access only" });
  }

  try {
    await ensurePurchaseOrderRuntimeSchema();
    const { id } = req.params;

    const rows = await q(
      `SELECT id, po_number, status FROM purchase_orders WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Purchase order not found" });
    }

    const current = String(rows[0].status || "draft").toLowerCase();
    if (!["pending_approval", "draft"].includes(current)) {
      return res
        .status(400)
        .json({ message: "Only draft or pending approval POs can be approved" });
    }

    await q(
      `UPDATE purchase_orders SET status = 'approved', approved_by = ?, updated_at = NOW() WHERE id = ?`,
      [Number(req.user?.id || 0) || null, id]
    );

    res.json({ message: "Purchase order approved", status: "approved" });
  } catch (err) {
    console.error("approvePurchaseOrder error:", err);
    res
      .status(500)
      .json({ message: "Failed to approve purchase order", error: err.message });
  }
};

const sendPurchaseOrder = async (req, res) => {
  if (!canSendPo(req)) {
    return res
      .status(403)
      .json({ message: "Only Manager or Operations can send purchase orders" });
  }

  try {
    await ensurePurchaseOrderRuntimeSchema();
    const { id } = req.params;

    const rows = await q(
      `
      SELECT
        po.id,
        po.po_number,
        po.status,
        po.order_date,
        po.expected_date,
        po.notes,
        s.id AS supplier_id,
        s.supplier_name,
        s.email,
        s.contact_number,
        s.whatsapp_number
      FROM purchase_orders po
      JOIN suppliers s ON s.id = po.supplier_id
      WHERE po.id = ?
      LIMIT 1
    `,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Purchase order not found" });
    }

    const po = rows[0];
    if (String(po.status || "").toLowerCase() !== "approved") {
      return res
        .status(400)
        .json({ message: "Purchase order must be approved before sending" });
    }

    await q(
      `UPDATE purchase_orders SET status = 'sent', sent_by = ?, updated_at = NOW() WHERE id = ?`,
      [Number(req.user?.id || 0) || null, id]
    );

    const messageBody = [
      `Purchase Order: ${po.po_number}`,
      `Supplier: ${po.supplier_name}`,
      `Order Date: ${po.order_date || "—"}`,
      `Required By: ${po.expected_date || "—"}`,
      po.notes ? `Notes: ${po.notes}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    await q(
      `
      INSERT INTO supplier_messages
        (supplier_id, message_type, subject, message_body, linked_kind, linked_record_id, sent_by, status)
      VALUES (?, 'purchase_order', ?, ?, 'order', ?, ?, 'Sent')
    `,
      [
        po.supplier_id,
        `Purchase Order ${po.po_number}`,
        messageBody,
        po.id,
        req.user?.full_name || req.user?.name || req.user?.email || "Fresh World ERP",
      ]
    );

    const cleanPhone = String(
      po.whatsapp_number || po.contact_number || ""
    ).replace(/\D/g, "");
    const emailSubject = encodeURIComponent(
      `Fresh World Purchase Order ${po.po_number}`
    );
    const emailBody = encodeURIComponent(messageBody);
    const whatsappText = encodeURIComponent(messageBody);

    res.json({
      message: "Purchase order marked as sent and communication logged",
      status: "sent",
      email_link: po.email
        ? `mailto:${po.email}?subject=${emailSubject}&body=${emailBody}`
        : null,
      whatsapp_link: cleanPhone
        ? `https://wa.me/${cleanPhone}?text=${whatsappText}`
        : null,
    });
  } catch (err) {
    console.error("sendPurchaseOrder error:", err);
    res
      .status(500)
      .json({ message: "Failed to send purchase order", error: err.message });
  }
};

module.exports = {
  getAllPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  approvePurchaseOrder,
  sendPurchaseOrder,
};