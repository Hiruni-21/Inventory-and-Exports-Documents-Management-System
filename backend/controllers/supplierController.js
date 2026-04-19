const db = require("../config/db");
const bcrypt = require("bcryptjs");

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

const ensureSupplierRuntimeSchema = async () => {
  if (ensured) return;

  const suppliersExists = await tableExists("suppliers");
  if (!suppliersExists) {
    throw new Error("suppliers table does not exist");
  }

  const supplierCols = await getTableColumns("suppliers");
  const alterSuppliers = [];

  if (!supplierCols.has("whatsapp_number")) {
    alterSuppliers.push("ADD COLUMN whatsapp_number VARCHAR(40) NULL");
  }
  if (!supplierCols.has("email")) {
    alterSuppliers.push("ADD COLUMN email VARCHAR(150) NULL");
  }
  if (!supplierCols.has("address")) {
    alterSuppliers.push("ADD COLUMN address TEXT NULL");
  }
  if (!supplierCols.has("city")) {
    alterSuppliers.push("ADD COLUMN city VARCHAR(120) NULL");
  }
  if (!supplierCols.has("payment_terms")) {
    alterSuppliers.push("ADD COLUMN payment_terms VARCHAR(120) NULL");
  }
  if (!supplierCols.has("lead_time_days")) {
    alterSuppliers.push("ADD COLUMN lead_time_days INT NOT NULL DEFAULT 0");
  }
  if (!supplierCols.has("notes")) {
    alterSuppliers.push("ADD COLUMN notes TEXT NULL");
  }
  if (!supplierCols.has("organic_certified")) {
    alterSuppliers.push("ADD COLUMN organic_certified TINYINT(1) NOT NULL DEFAULT 0");
  }
  if (!supplierCols.has("accepts_returns")) {
    alterSuppliers.push("ADD COLUMN accepts_returns TINYINT(1) NOT NULL DEFAULT 1");
  }
  if (!supplierCols.has("portal_enabled")) {
    alterSuppliers.push("ADD COLUMN portal_enabled TINYINT(1) NOT NULL DEFAULT 0");
  }
  if (!supplierCols.has("status")) {
    alterSuppliers.push("ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active'");
  }
  if (!supplierCols.has("updated_at")) {
    alterSuppliers.push(
      "ADD COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    );
  }

  for (const statement of alterSuppliers) {
    await q(`ALTER TABLE suppliers ${statement}`);
  }

  if (!(await tableExists("supplier_items"))) {
    await q(`
      CREATE TABLE supplier_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        supplier_id INT NOT NULL,
        item_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_supplier_item (supplier_id, item_id),
        INDEX idx_supplier_items_supplier (supplier_id),
        INDEX idx_supplier_items_item (item_id)
      )
    `);
  }

  if (await tableExists("users")) {
    const userCols = await getTableColumns("users");
    if (!userCols.has("supplier_id")) {
      await q(`ALTER TABLE users ADD COLUMN supplier_id INT NULL`);
    }
  }

  ensured = true;
};

const toIntBool = (value, fallback = 0) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number") return value ? 1 : 0;
  const text = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "enabled", "active"].includes(text)) return 1;
  return 0;
};

const safeText = (value) => String(value || "").trim();
const safeNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const normalizeSupplierRow = (row = {}) => ({
  ...row,
  item_count: Number(row.item_count || 0),
  total_purchase_orders: Number(row.total_purchase_orders || 0),
  total_return_notes: Number(row.total_return_notes || 0),
  lead_time_days: Number(row.lead_time_days || 0),
  organic_certified: Number(row.organic_certified || 0),
  accepts_returns: Number(row.accepts_returns || 0),
  portal_enabled: Number(row.portal_enabled || 0),
  purchase_orders: Array.isArray(row.purchase_orders) ? row.purchase_orders : [],
  return_notes: Array.isArray(row.return_notes) ? row.return_notes : [],
  items: Array.isArray(row.items) ? row.items : [],
});

const getPortalUserForSupplier = async (supplierId) => {
  if (!(await tableExists("users"))) return null;

  const cols = await getTableColumns("users");
  if (!cols.has("supplier_id")) return null;

  const emailExpr = cols.has("email") ? "u.email" : "NULL";
  const nameExpr = cols.has("full_name")
    ? "u.full_name"
    : cols.has("name")
    ? "u.name"
    : "NULL";

  const rows = await q(
    `
      SELECT
        u.id,
        ${emailExpr} AS portal_user_email,
        ${nameExpr} AS portal_user_name
      FROM users u
      WHERE u.supplier_id = ?
      ORDER BY u.id DESC
      LIMIT 1
    `,
    [supplierId]
  );

  return rows[0] || null;
};

const syncSupplierItems = async (supplierId, itemIds = []) => {
  if (!(await tableExists("supplier_items"))) return;

  await q(`DELETE FROM supplier_items WHERE supplier_id = ?`, [supplierId]);

  const cleanIds = Array.from(
    new Set((itemIds || []).map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))
  );

  if (!cleanIds.length) return;

  const values = cleanIds.map((itemId) => [supplierId, itemId]);
  await q(`INSERT INTO supplier_items (supplier_id, item_id) VALUES ?`, [values]);
};

const syncPortalUser = async ({
  supplierId,
  supplierName,
  portalEnabled,
  portalEmail,
  portalPassword,
  status,
}) => {
  if (!(await tableExists("users"))) return;

  const cols = await getTableColumns("users");
  if (!cols.has("supplier_id")) return;

  const emailCol = cols.has("email");
  const passwordCol = cols.has("password");
  const roleCol = cols.has("role");
  const fullNameCol = cols.has("full_name");
  const nameCol = cols.has("name");
  const statusCol = cols.has("status");
  const activeCol = cols.has("is_active");

  const existing = await q(
    `SELECT * FROM users WHERE supplier_id = ? ORDER BY id DESC LIMIT 1`,
    [supplierId]
  );

  const existingUser = existing[0] || null;
  const passwordHash = portalPassword ? await bcrypt.hash(portalPassword, 10) : null;

  if (!portalEnabled || !portalEmail) {
    if (existingUser) {
      const sets = [];
      const params = [];

      if (statusCol) {
        sets.push("status = ?");
        params.push("inactive");
      }
      if (activeCol) {
        sets.push("is_active = ?");
        params.push(0);
      }

      if (sets.length) {
        params.push(existingUser.id);
        await q(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, params);
      }
    }
    return;
  }

  if (existingUser) {
    const sets = [];
    const params = [];

    if (emailCol) {
      sets.push("email = ?");
      params.push(portalEmail);
    }
    if (passwordCol && passwordHash) {
      sets.push("password = ?");
      params.push(passwordHash);
    }
    if (roleCol) {
      sets.push("role = ?");
      params.push("supplier");
    }
    if (fullNameCol) {
      sets.push("full_name = ?");
      params.push(supplierName);
    } else if (nameCol) {
      sets.push("name = ?");
      params.push(supplierName);
    }
    if (statusCol) {
      sets.push("status = ?");
      params.push(status === "inactive" ? "inactive" : "active");
    }
    if (activeCol) {
      sets.push("is_active = ?");
      params.push(status === "inactive" ? 0 : 1);
    }

    if (sets.length) {
      params.push(existingUser.id);
      await q(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, params);
    }
    return;
  }

  const fields = [];
  const placeholders = [];
  const values = [];

  if (emailCol) {
    fields.push("email");
    placeholders.push("?");
    values.push(portalEmail);
  }
  if (passwordCol) {
    fields.push("password");
    placeholders.push("?");
    values.push(passwordHash || (await bcrypt.hash("supplier123", 10)));
  }
  if (roleCol) {
    fields.push("role");
    placeholders.push("?");
    values.push("supplier");
  }
  if (fullNameCol) {
    fields.push("full_name");
    placeholders.push("?");
    values.push(supplierName);
  } else if (nameCol) {
    fields.push("name");
    placeholders.push("?");
    values.push(supplierName);
  }
  if (cols.has("supplier_id")) {
    fields.push("supplier_id");
    placeholders.push("?");
    values.push(supplierId);
  }
  if (statusCol) {
    fields.push("status");
    placeholders.push("?");
    values.push(status === "inactive" ? "inactive" : "active");
  }
  if (activeCol) {
    fields.push("is_active");
    placeholders.push("?");
    values.push(status === "inactive" ? 0 : 1);
  }

  if (fields.length) {
    await q(
      `INSERT INTO users (${fields.join(", ")}) VALUES (${placeholders.join(", ")})`,
      values
    );
  }
};

const getAllSuppliers = async (req, res) => {
  try {
    await ensureSupplierRuntimeSchema();

    const hasSupplierItems = await tableExists("supplier_items");
    const hasPurchaseOrders = await tableExists("purchase_orders");
    const hasReturns = await tableExists("returns");
    const hasUsers = await tableExists("users");

    const itemCountExpr = hasSupplierItems
      ? `(SELECT COUNT(*) FROM supplier_items si WHERE si.supplier_id = s.id)`
      : `0`;

    const itemNamesExpr = hasSupplierItems
      ? `(
          SELECT GROUP_CONCAT(i.name ORDER BY i.name SEPARATOR ', ')
          FROM supplier_items si
          JOIN items i ON i.id = si.item_id
          WHERE si.supplier_id = s.id
        )`
      : `NULL`;

    const poCountExpr = hasPurchaseOrders
      ? `(SELECT COUNT(*) FROM purchase_orders po WHERE po.supplier_id = s.id)`
      : `0`;

    const lastOrderExpr = hasPurchaseOrders
      ? `(
          SELECT MAX(COALESCE(po.order_date, po.created_at))
          FROM purchase_orders po
          WHERE po.supplier_id = s.id
        )`
      : `NULL`;

    const returnCountExpr = hasReturns
      ? `(SELECT COUNT(*) FROM returns r WHERE r.supplier_id = s.id)`
      : `0`;

    const portalEmailExpr =
      hasUsers && (await getTableColumns("users")).has("supplier_id")
        ? `(
            SELECT u.email
            FROM users u
            WHERE u.supplier_id = s.id
            ORDER BY u.id DESC
            LIMIT 1
          )`
        : `NULL`;

    const rows = await q(`
      SELECT
        s.*,
        ${itemCountExpr} AS item_count,
        ${itemNamesExpr} AS item_names,
        ${poCountExpr} AS total_purchase_orders,
        ${returnCountExpr} AS total_return_notes,
        ${lastOrderExpr} AS last_order_at,
        ${portalEmailExpr} AS portal_user_email
      FROM suppliers s
      ORDER BY
        CAST(SUBSTRING_INDEX(s.supplier_code, '-', -1) AS UNSIGNED) ASC,
        s.id ASC
    `);

    res.json(rows.map(normalizeSupplierRow));
  } catch (err) {
    console.error("getAllSuppliers error:", err);
    res.status(500).json({
      message: "Failed to load suppliers",
      error: err.message,
    });
  }
};

const getSupplierById = async (req, res) => {
  try {
    await ensureSupplierRuntimeSchema();
    const supplierId = Number(req.params.id || 0);

    const rows = await q(`SELECT * FROM suppliers WHERE id = ? LIMIT 1`, [supplierId]);
    if (!rows.length) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    const supplier = normalizeSupplierRow(rows[0]);
    const portalUser = await getPortalUserForSupplier(supplierId);

    let items = [];
    if (await tableExists("supplier_items")) {
      items = await q(
        `
          SELECT
            si.item_id,
            i.code,
            i.name
          FROM supplier_items si
          JOIN items i ON i.id = si.item_id
          WHERE si.supplier_id = ?
          ORDER BY i.name ASC
        `,
        [supplierId]
      );
    }

    let purchaseOrders = [];
    if (await tableExists("purchase_orders")) {
      purchaseOrders = await q(
        `
          SELECT
            po.id,
            po.po_number,
            po.order_date,
            po.status,
            COALESCE(po.total_amount, 0) AS total_amount
          FROM purchase_orders po
          WHERE po.supplier_id = ?
          ORDER BY COALESCE(po.order_date, po.created_at) DESC, po.id DESC
          LIMIT 5
        `,
        [supplierId]
      ).then((list) =>
        list.map((row) => ({
          ...row,
          total_amount: Number(row.total_amount || 0),
          item_count: 0,
        }))
      );
    }

    let returnNotes = [];
    if (await tableExists("returns")) {
      returnNotes = await q(
        `
          SELECT
            r.id,
            r.return_number,
            r.return_date,
            0 AS item_count,
            0 AS total_qty,
            0 AS deducted_from_supplier_payment
          FROM returns r
          WHERE r.supplier_id = ?
          ORDER BY COALESCE(r.return_date, r.created_at) DESC, r.id DESC
          LIMIT 5
        `,
        [supplierId]
      );
    }

    res.json(
      normalizeSupplierRow({
        ...supplier,
        portal_user_email: portalUser?.portal_user_email || "",
        items,
        item_count: items.length,
        item_names: items.map((item) => item.name).join(", "),
        purchase_orders: purchaseOrders,
        return_notes: returnNotes,
      })
    );
  } catch (err) {
    console.error("getSupplierById error:", err);
    res.status(500).json({
      message: "Failed to load supplier details",
      error: err.message,
    });
  }
};

const createSupplier = async (req, res) => {
  try {
    await ensureSupplierRuntimeSchema();

    const payload = {
      supplier_code: safeText(req.body.supplier_code),
      supplier_name: safeText(req.body.supplier_name),
      contact_person: safeText(req.body.contact_person),
      contact_number: safeText(req.body.contact_number),
      whatsapp_number: safeText(req.body.whatsapp_number || req.body.contact_number),
      email: safeText(req.body.email),
      address: safeText(req.body.address),
      city: safeText(req.body.city),
      payment_terms: safeText(req.body.payment_terms),
      lead_time_days: safeNumber(req.body.lead_time_days, 0),
      notes: safeText(req.body.notes),
      organic_certified: toIntBool(req.body.organic_certified, 0),
      accepts_returns: toIntBool(req.body.accepts_returns, 1),
      portal_enabled: toIntBool(req.body.portal_enabled, 0),
      status: safeText(req.body.status || "active").toLowerCase() === "inactive" ? "inactive" : "active",
    };

    if (!payload.supplier_name || !payload.contact_number) {
      return res.status(400).json({
        message: "Supplier name and contact number are required",
      });
    }

    if (!payload.supplier_code) {
      const last = await q(
        `
          SELECT supplier_code
          FROM suppliers
          WHERE supplier_code LIKE 'FW-SUP-%'
          ORDER BY id DESC
          LIMIT 1
        `
      );

      const lastCode = String(last?.[0]?.supplier_code || "FW-SUP-000");
      const lastNo = Number(lastCode.split("-").pop() || 0);
      payload.supplier_code = `FW-SUP-${String(lastNo + 1).padStart(3, "0")}`;
    }

    const result = await q(
      `
        INSERT INTO suppliers (
          supplier_code,
          supplier_name,
          contact_person,
          contact_number,
          whatsapp_number,
          email,
          address,
          city,
          payment_terms,
          lead_time_days,
          notes,
          organic_certified,
          accepts_returns,
          portal_enabled,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        payload.supplier_code,
        payload.supplier_name,
        payload.contact_person,
        payload.contact_number,
        payload.whatsapp_number,
        payload.email,
        payload.address,
        payload.city,
        payload.payment_terms,
        payload.lead_time_days,
        payload.notes,
        payload.organic_certified,
        payload.accepts_returns,
        payload.portal_enabled,
        payload.status,
      ]
    );

    const supplierId = result.insertId;

    await syncSupplierItems(supplierId, req.body.item_ids || []);
    await syncPortalUser({
      supplierId,
      supplierName: payload.supplier_name,
      portalEnabled: !!payload.portal_enabled,
      portalEmail: safeText(req.body.portal_email),
      portalPassword: safeText(req.body.portal_password),
      status: payload.status,
    });

    clearCache();

    res.status(201).json({
      message: "Supplier created successfully",
      supplierId,
    });
  } catch (err) {
    console.error("createSupplier error:", err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Supplier code or supplier portal email already exists",
      });
    }

    res.status(500).json({
      message: "Failed to create supplier",
      error: err.message,
    });
  }
};

const updateSupplier = async (req, res) => {
  try {
    await ensureSupplierRuntimeSchema();

    const supplierId = Number(req.params.id || 0);
    const existing = await q(`SELECT id FROM suppliers WHERE id = ? LIMIT 1`, [supplierId]);

    if (!existing.length) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    const payload = {
      supplier_name: safeText(req.body.supplier_name),
      contact_person: safeText(req.body.contact_person),
      contact_number: safeText(req.body.contact_number),
      whatsapp_number: safeText(req.body.whatsapp_number || req.body.contact_number),
      email: safeText(req.body.email),
      address: safeText(req.body.address),
      city: safeText(req.body.city),
      payment_terms: safeText(req.body.payment_terms),
      lead_time_days: safeNumber(req.body.lead_time_days, 0),
      notes: safeText(req.body.notes),
      organic_certified: toIntBool(req.body.organic_certified, 0),
      accepts_returns: toIntBool(req.body.accepts_returns, 1),
      portal_enabled: toIntBool(req.body.portal_enabled, 0),
      status: safeText(req.body.status || "active").toLowerCase() === "inactive" ? "inactive" : "active",
    };

    if (!payload.supplier_name || !payload.contact_number) {
      return res.status(400).json({
        message: "Supplier name and contact number are required",
      });
    }

    await q(
      `
        UPDATE suppliers
        SET
          supplier_name = ?,
          contact_person = ?,
          contact_number = ?,
          whatsapp_number = ?,
          email = ?,
          address = ?,
          city = ?,
          payment_terms = ?,
          lead_time_days = ?,
          notes = ?,
          organic_certified = ?,
          accepts_returns = ?,
          portal_enabled = ?,
          status = ?
        WHERE id = ?
      `,
      [
        payload.supplier_name,
        payload.contact_person,
        payload.contact_number,
        payload.whatsapp_number,
        payload.email,
        payload.address,
        payload.city,
        payload.payment_terms,
        payload.lead_time_days,
        payload.notes,
        payload.organic_certified,
        payload.accepts_returns,
        payload.portal_enabled,
        payload.status,
        supplierId,
      ]
    );

    await syncSupplierItems(supplierId, req.body.item_ids || []);
    await syncPortalUser({
      supplierId,
      supplierName: payload.supplier_name,
      portalEnabled: !!payload.portal_enabled,
      portalEmail: safeText(req.body.portal_email),
      portalPassword: safeText(req.body.portal_password),
      status: payload.status,
    });

    clearCache();

    res.json({
      message: "Supplier updated successfully",
      supplierId,
    });
  } catch (err) {
    console.error("updateSupplier error:", err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Supplier portal email already exists",
      });
    }

    res.status(500).json({
      message: "Failed to update supplier",
      error: err.message,
    });
  }
};

const deleteSupplier = async (req, res) => {
  try {
    await ensureSupplierRuntimeSchema();

    const supplierId = Number(req.params.id || 0);
    const rows = await q(
      `SELECT id, supplier_name FROM suppliers WHERE id = ? LIMIT 1`,
      [supplierId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    const hasPurchaseOrders = await tableExists("purchase_orders");
    const hasReturns = await tableExists("returns");

    const poCount = hasPurchaseOrders
      ? await q(`SELECT COUNT(*) AS total FROM purchase_orders WHERE supplier_id = ?`, [supplierId])
      : [{ total: 0 }];

    const returnCount = hasReturns
      ? await q(`SELECT COUNT(*) AS total FROM returns WHERE supplier_id = ?`, [supplierId])
      : [{ total: 0 }];

    const relatedCount =
      Number(poCount?.[0]?.total || 0) + Number(returnCount?.[0]?.total || 0);

    if (relatedCount > 0) {
      await q(`UPDATE suppliers SET status = 'inactive' WHERE id = ?`, [supplierId]);
      return res.json({
        message:
          "Supplier has related records, so it was marked inactive instead of being deleted",
      });
    }

    if (await tableExists("supplier_items")) {
      await q(`DELETE FROM supplier_items WHERE supplier_id = ?`, [supplierId]);
    }

    if (await tableExists("users")) {
      const userCols = await getTableColumns("users");
      if (userCols.has("supplier_id")) {
        await q(`DELETE FROM users WHERE supplier_id = ?`, [supplierId]);
      }
    }

    await q(`DELETE FROM suppliers WHERE id = ?`, [supplierId]);

    clearCache();

    res.json({
      message: "Supplier deleted successfully",
    });
  } catch (err) {
    console.error("deleteSupplier error:", err);
    res.status(500).json({
      message: "Failed to delete supplier",
      error: err.message,
    });
  }
};

module.exports = {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};