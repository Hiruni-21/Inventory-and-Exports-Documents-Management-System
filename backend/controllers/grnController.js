const db = require("../config/db");
const { refreshInventorySnapshot } = require("./inventoryController");

const q = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

let tableCache = {};
let ensured = false;

const clearCache = () => {
  tableCache = {};
  ensured = false;
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

const ensureGrnRuntimeSchema = async () => {
  if (ensured) return;

  if (!(await tableExists("grn"))) {
    throw new Error("grn table does not exist");
  }

  if (!(await tableExists("grn_items"))) {
    throw new Error("grn_items table does not exist");
  }

  const grnCols = await getTableColumns("grn");
  const grnAlters = [];

  if (!grnCols.has("remarks")) grnAlters.push("ADD COLUMN remarks TEXT NULL");
  if (!grnCols.has("status")) grnAlters.push("ADD COLUMN status VARCHAR(40) NOT NULL DEFAULT 'received'");
  if (!grnCols.has("verification_required"))
    grnAlters.push("ADD COLUMN verification_required TINYINT(1) NOT NULL DEFAULT 0");
  if (!grnCols.has("inventory_posted"))
    grnAlters.push("ADD COLUMN inventory_posted TINYINT(1) NOT NULL DEFAULT 0");
  if (!grnCols.has("verified_by")) grnAlters.push("ADD COLUMN verified_by INT NULL");
  if (!grnCols.has("verified_at")) grnAlters.push("ADD COLUMN verified_at DATETIME NULL");

  for (const statement of grnAlters) {
    await q(`ALTER TABLE grn ${statement}`);
  }

  const grnItemCols = await getTableColumns("grn_items");
  const grnItemAlters = [];

  if (!grnItemCols.has("purchase_order_item_id"))
    grnItemAlters.push("ADD COLUMN purchase_order_item_id INT NULL");
  if (!grnItemCols.has("ordered_qty"))
    grnItemAlters.push("ADD COLUMN ordered_qty DECIMAL(12,2) NOT NULL DEFAULT 0");
  if (!grnItemCols.has("received_qty"))
    grnItemAlters.push("ADD COLUMN received_qty DECIMAL(12,2) NOT NULL DEFAULT 0");
  if (!grnItemCols.has("variance_qty"))
    grnItemAlters.push("ADD COLUMN variance_qty DECIMAL(12,2) NOT NULL DEFAULT 0");
  if (!grnItemCols.has("variance_percent"))
    grnItemAlters.push("ADD COLUMN variance_percent DECIMAL(12,2) NOT NULL DEFAULT 0");
  if (!grnItemCols.has("batch_number"))
    grnItemAlters.push("ADD COLUMN batch_number VARCHAR(120) NULL");
  if (!grnItemCols.has("expiry_date"))
    grnItemAlters.push("ADD COLUMN expiry_date DATE NULL");
  if (!grnItemCols.has("unit_cost"))
    grnItemAlters.push("ADD COLUMN unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0");
  if (!grnItemCols.has("line_total"))
    grnItemAlters.push("ADD COLUMN line_total DECIMAL(12,2) NOT NULL DEFAULT 0");
  if (!grnItemCols.has("notes")) grnItemAlters.push("ADD COLUMN notes TEXT NULL");
  if (!grnItemCols.has("verification_required"))
    grnItemAlters.push("ADD COLUMN verification_required TINYINT(1) NOT NULL DEFAULT 0");

  for (const statement of grnItemAlters) {
    await q(`ALTER TABLE grn_items ${statement}`);
  }

  ensured = true;
};

const formatStatusLabel = (value) => {
  const text = String(value || "received").toLowerCase();
  return text;
};

const safeNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const safeText = (value) => String(value || "").trim();

const wrapRefreshInventorySnapshot = (itemId) =>
  new Promise((resolve, reject) => {
    if (typeof refreshInventorySnapshot !== "function") return resolve();
    refreshInventorySnapshot(itemId, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });

const generateGrnNumber = async () => {
  const year = new Date().getFullYear();

  const rows = await q(
    `
      SELECT grn_number
      FROM grn
      WHERE grn_number LIKE ?
      ORDER BY id DESC
    `,
    [`GRN-${year}-%`]
  );

  let maxNo = 0;

  rows.forEach((row) => {
    const match = String(row.grn_number || "").match(/GRN-\d{4}-(\d+)$/);
    if (!match) return;
    const current = Number(match[1]);
    if (Number.isFinite(current) && current > maxNo) {
      maxNo = current;
    }
  });

  return `GRN-${year}-${String(maxNo + 1).padStart(3, "0")}`;
};

const needsVarianceVerification = (orderedQty, receivedQty) => {
  const ordered = safeNumber(orderedQty, 0);
  const received = safeNumber(receivedQty, 0);
  const varianceQty = received - ordered;
  const variancePercent = ordered > 0 ? (Math.abs(varianceQty) / ordered) * 100 : received > 0 ? 100 : 0;

  return {
    varianceQty,
    variancePercent,
    required: Math.abs(varianceQty) > 1 || variancePercent > 5,
  };
};

const getPoItemSource = async (purchaseOrderId) => {
  const hasModern = await tableExists("po_items");
  const hasLegacy = await tableExists("purchase_order_items");

  if (hasModern) {
    const rows = await q(`SELECT COUNT(*) AS total FROM po_items WHERE purchase_order_id = ?`, [purchaseOrderId]);
    if (Number(rows?.[0]?.total || 0) > 0) return "po_items";
  }

  if (hasLegacy) {
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
    await ensureGrnRuntimeSchema();

    const purchaseOrderId = Number(req.params.purchaseOrderId || 0);
    const source = await getPoItemSource(purchaseOrderId);

    if (!source) {
      return res.status(404).json({ message: "No purchase order items found for this PO" });
    }

    let sql = "";
    if (source === "po_items") {
      sql = `
        SELECT
          poi.id AS purchase_order_item_id,
          poi.item_id,
          COALESCE(poi.ordered_qty, 0) AS ordered_quantity,
          COALESCE(poi.unit, i.unit, '') AS unit,
          COALESCE(poi.unit_price, i.unit_cost, 0) AS unit_price,
          i.name AS item_name,
          i.code AS item_code,
          po.id AS purchase_order_id,
          po.po_number,
          po.status AS purchase_order_status,
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
          NULL AS purchase_order_item_id,
          poi.item_id,
          COALESCE(poi.quantity, 0) AS ordered_quantity,
          COALESCE(i.unit, '') AS unit,
          COALESCE(i.unit_cost, 0) AS unit_price,
          i.name AS item_name,
          i.code AS item_code,
          po.id AS purchase_order_id,
          po.po_number,
          po.status AS purchase_order_status,
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
    res.status(500).json({
      message: "Failed to load purchase order items for GRN",
      error: err.message,
    });
  }
};

const getAllGrn = async (req, res) => {
  try {
    await ensureGrnRuntimeSchema();

    const rows = await q(`
      SELECT
        g.id,
        g.grn_number,
        g.received_date,
        g.created_at,
        g.status,
        g.verification_required,
        g.inventory_posted,
        g.purchase_order_id,
        g.supplier_id,
        po.po_number,
        s.supplier_name,
        u.full_name AS created_by_name,
        COUNT(gi.id) AS item_count,
        COALESCE(SUM(gi.received_qty), 0) AS total_received_qty
      FROM grn g
      JOIN purchase_orders po ON g.purchase_order_id = po.id
      JOIN suppliers s ON g.supplier_id = s.id
      LEFT JOIN users u ON g.created_by = u.id
      LEFT JOIN grn_items gi ON gi.grn_id = g.id
      GROUP BY
        g.id,
        g.grn_number,
        g.received_date,
        g.created_at,
        g.status,
        g.verification_required,
        g.inventory_posted,
        g.purchase_order_id,
        g.supplier_id,
        po.po_number,
        s.supplier_name,
        u.full_name
      ORDER BY g.id DESC
    `);

    res.json(
      rows.map((row) => ({
        ...row,
        item_count: Number(row.item_count || 0),
        total_received_qty: Number(row.total_received_qty || 0),
      }))
    );
  } catch (err) {
    console.error("getAllGrn error:", err);
    res.status(500).json({
      message: "Failed to load GRNs",
      error: err.message,
    });
  }
};

const getGrnById = async (req, res) => {
  try {
    await ensureGrnRuntimeSchema();

    const id = Number(req.params.id || 0);

    const headerRows = await q(
      `
        SELECT
          g.*,
          po.po_number,
          po.status AS purchase_order_status,
          s.supplier_name,
          s.contact_number,
          s.email,
          u.full_name AS created_by_name,
          vu.full_name AS verified_by_name
        FROM grn g
        JOIN purchase_orders po ON g.purchase_order_id = po.id
        JOIN suppliers s ON g.supplier_id = s.id
        LEFT JOIN users u ON g.created_by = u.id
        LEFT JOIN users vu ON g.verified_by = vu.id
        WHERE g.id = ?
        LIMIT 1
      `,
      [id]
    );

    if (!headerRows.length) {
      return res.status(404).json({ message: "GRN not found" });
    }

    const itemRows = await q(
      `
        SELECT
          gi.id,
          gi.purchase_order_item_id,
          gi.item_id,
          gi.ordered_qty,
          gi.received_qty,
          gi.variance_qty,
          gi.variance_percent,
          gi.batch_number,
          gi.expiry_date,
          gi.unit_cost,
          gi.line_total,
          gi.notes,
          gi.verification_required,
          i.name AS item_name,
          i.code AS item_code,
          i.unit
        FROM grn_items gi
        JOIN items i ON gi.item_id = i.id
        WHERE gi.grn_id = ?
        ORDER BY gi.id ASC
      `,
      [id]
    );

    res.json({
      ...headerRows[0],
      items: itemRows.map((row) => ({
        ...row,
        ordered_qty: Number(row.ordered_qty || 0),
        received_qty: Number(row.received_qty || 0),
        variance_qty: Number(row.variance_qty || 0),
        variance_percent: Number(row.variance_percent || 0),
        unit_cost: Number(row.unit_cost || 0),
        line_total: Number(row.line_total || 0),
        verification_required: Number(row.verification_required || 0),
      })),
    });
  } catch (err) {
    console.error("getGrnById error:", err);
    res.status(500).json({
      message: "Failed to load GRN details",
      error: err.message,
    });
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
  if (!(await tableExists("inventory_batches"))) {
    throw new Error("inventory_batches table does not exist");
  }

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

const postGrnInventory = async (grnId, grnNumber) => {
  const itemRows = await q(
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

  const headerRows = await q(`SELECT received_date FROM grn WHERE id = ? LIMIT 1`, [grnId]);
  const receivedDate = headerRows?.[0]?.received_date;

  for (const item of itemRows) {
    await insertInventoryBatch({
      itemId: item.item_id,
      grnId,
      batchCode: item.batch_number || `BT-${grnId}-${item.item_id}`,
      receivedQty: Number(item.received_qty || 0),
      unit: item.unit || "",
      receivedDate,
      expiryDate: item.expiry_date || null,
    });

    await insertStockMovement({
      itemId: item.item_id,
      grnId,
      quantity: Number(item.received_qty || 0),
      grnNumber,
    });

    await wrapRefreshInventorySnapshot(item.item_id);
  }

  await q(`UPDATE grn SET inventory_posted = 1 WHERE id = ?`, [grnId]);
};

const updatePurchaseOrderAfterGrn = async (purchaseOrderId) => {
  if (!(await tableExists("purchase_orders"))) return;
  const cols = await getTableColumns("purchase_orders");
  if (!cols.has("status")) return;

  await q(`UPDATE purchase_orders SET status = 'grn_created' WHERE id = ?`, [purchaseOrderId]);
};

const createGrn = async (req, res) => {
  try {
    await ensureGrnRuntimeSchema();

    const purchaseOrderId = Number(req.body.purchase_order_id || 0);
    const supplierId = Number(req.body.supplier_id || 0);
    const receivedDate = safeText(req.body.received_date);
    const remarks = safeText(req.body.remarks);
    const createdBy = req.user?.id || null;
    const items = Array.isArray(req.body.items) ? req.body.items : [];

    if (!purchaseOrderId || !supplierId || !receivedDate || !items.length) {
      return res.status(400).json({
        message: "Purchase order, supplier, received date, and items are required",
      });
    }

    const poRows = await q(
      `
        SELECT po.id, po.po_number, po.supplier_id, po.status, s.supplier_name
        FROM purchase_orders po
        JOIN suppliers s ON s.id = po.supplier_id
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
      return res.status(400).json({ message: "Supplier does not match the selected purchase order" });
    }

    const poItems = await new Promise((resolve, reject) => {
      const fakeReq = { params: { purchaseOrderId } };
      const fakeRes = {
        json: resolve,
        status(code) {
          this.statusCode = code;
          return this;
        },
        send: reject,
      };
      getPurchaseOrderItemsForGrn(fakeReq, fakeRes).catch(reject);
    });

    const poItemMap = new Map(
      poItems.map((item) => [
        String(item.item_id),
        {
          purchase_order_item_id: item.purchase_order_item_id || null,
          ordered_quantity: Number(item.ordered_quantity || 0),
          unit: item.unit || "",
          unit_price: Number(item.unit_price || 0),
        },
      ])
    );

    const validItems = items
      .map((row, index) => {
        const itemId = Number(row.item_id || 0);
        const sourceItem = poItemMap.get(String(itemId));
        if (!itemId || !sourceItem) return null;

        const orderedQty = Number(
          row.ordered_quantity !== undefined ? row.ordered_quantity : sourceItem.ordered_quantity
        );
        const receivedQty = Number(
          row.received_qty !== undefined ? row.received_qty : row.delivered_quantity
        );
        const unitCost = Number(
          row.unit_cost !== undefined ? row.unit_cost : sourceItem.unit_price
        );
        const batchNumber = safeText(row.batch_number) || `BT-${Date.now()}-${index + 1}`;
        const expiryDate = safeText(row.expiry_date) || null;
        const notes = safeText(row.notes);

        if (receivedQty <= 0) return null;

        const variance = needsVarianceVerification(orderedQty, receivedQty);

        return {
          item_id: itemId,
          purchase_order_item_id: sourceItem.purchase_order_item_id,
          ordered_qty: orderedQty,
          received_qty: receivedQty,
          variance_qty: variance.varianceQty,
          variance_percent: variance.variancePercent,
          batch_number: batchNumber,
          expiry_date: expiryDate,
          unit_cost: unitCost,
          line_total: receivedQty * unitCost,
          notes,
          verification_required: variance.required ? 1 : 0,
        };
      })
      .filter(Boolean);

    if (!validItems.length) {
      return res.status(400).json({
        message: "At least one received quantity must be greater than 0",
      });
    }

    const verificationRequired = validItems.some((item) => Number(item.verification_required) === 1);
    const grnNumber = await generateGrnNumber();

    const result = await q(
      `
        INSERT INTO grn (
          grn_number,
          purchase_order_id,
          supplier_id,
          received_date,
          remarks,
          created_by,
          status,
          verification_required,
          inventory_posted
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        grnNumber,
        purchaseOrderId,
        supplierId,
        receivedDate,
        remarks || null,
        createdBy,
        verificationRequired ? "pending_verification" : "received",
        verificationRequired ? 1 : 0,
        0,
      ]
    );

    const grnId = result.insertId;

    const values = validItems.map((item) => [
      grnId,
      item.purchase_order_item_id,
      item.item_id,
      item.ordered_qty,
      item.received_qty,
      item.variance_qty,
      item.variance_percent,
      item.batch_number,
      item.expiry_date,
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
          unit_cost,
          line_total,
          notes,
          verification_required
        )
        VALUES ?
      `,
      [values]
    );

    if (!verificationRequired) {
      await postGrnInventory(grnId, grnNumber);
    }

    await updatePurchaseOrderAfterGrn(purchaseOrderId);

    clearCache();

    return res.status(201).json({
      message: verificationRequired
        ? "GRN created and sent for Ops verification"
        : "GRN created successfully and inventory updated",
      grnId,
      grnNumber,
      status: verificationRequired ? "pending_verification" : "received",
      verificationRequired,
    });
  } catch (err) {
    console.error("createGrn error:", err);
    return res.status(500).json({
      message: "Failed to create GRN",
      error: err.message,
    });
  }
};

const verifyGrn = async (req, res) => {
  try {
    await ensureGrnRuntimeSchema();

    const grnId = Number(req.params.id || 0);
    const verifierId = req.user?.id || null;

    const rows = await q(`SELECT * FROM grn WHERE id = ? LIMIT 1`, [grnId]);
    if (!rows.length) {
      return res.status(404).json({ message: "GRN not found" });
    }

    const grn = rows[0];

    if (Number(grn.inventory_posted || 0) === 1) {
      return res.json({ message: "GRN inventory is already posted" });
    }

    await postGrnInventory(grnId, grn.grn_number);

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

    await updatePurchaseOrderAfterGrn(grn.purchase_order_id);

    return res.json({
      message: "GRN verified and inventory updated successfully",
      grnId,
    });
  } catch (err) {
    console.error("verifyGrn error:", err);
    return res.status(500).json({
      message: "Failed to verify GRN",
      error: err.message,
    });
  }
};

module.exports = {
  getAllGrn,
  getGrnById,
  getPurchaseOrderItemsForGrn,
  createGrn,
  verifyGrn,
};