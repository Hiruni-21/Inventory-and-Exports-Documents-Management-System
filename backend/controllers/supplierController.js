const db = require("../config/db");
const bcrypt = require("bcryptjs");

const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

let supplierSetupDone = false;
let supplierColumnCache = null;

const clearSupplierCache = () => {
  supplierSetupDone = false;
  supplierColumnCache = null;
};

const getTableColumns = async (tableName) => {
  if (tableName === "suppliers" && supplierColumnCache) return supplierColumnCache;

  const rows = await query(
    `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
    `,
    [tableName]
  );

  const set = new Set(rows.map((row) => row.COLUMN_NAME));

  if (tableName === "suppliers") {
    supplierColumnCache = set;
  }

  return set;
};

const tableExists = async (tableName) => {
  const rows = await query(
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
  if (supplierSetupDone) return;

  const supplierTableExists = await tableExists("suppliers");
  if (!supplierTableExists) {
    throw new Error("Suppliers table does not exist");
  }

  let cols = await getTableColumns("suppliers");
  const alterStatements = [];

  if (!cols.has("supplier_code")) alterStatements.push("ADD COLUMN supplier_code VARCHAR(30) NULL");
  if (!cols.has("contact_person")) alterStatements.push("ADD COLUMN contact_person VARCHAR(150) NULL");
  if (!cols.has("whatsapp_number")) alterStatements.push("ADD COLUMN whatsapp_number VARCHAR(30) NULL");
  if (!cols.has("city")) alterStatements.push("ADD COLUMN city VARCHAR(100) NULL");
  if (!cols.has("payment_terms")) alterStatements.push("ADD COLUMN payment_terms VARCHAR(100) NULL");
  if (!cols.has("notes")) alterStatements.push("ADD COLUMN notes TEXT NULL");
  if (!cols.has("organic_certified")) alterStatements.push("ADD COLUMN organic_certified TINYINT(1) NOT NULL DEFAULT 0");
  if (!cols.has("accepts_returns")) alterStatements.push("ADD COLUMN accepts_returns TINYINT(1) NOT NULL DEFAULT 1");
  if (!cols.has("portal_enabled")) alterStatements.push("ADD COLUMN portal_enabled TINYINT(1) NOT NULL DEFAULT 0");
  if (!cols.has("status")) alterStatements.push("ADD COLUMN status ENUM('active','inactive') NOT NULL DEFAULT 'active'");
  if (!cols.has("lead_time_days")) alterStatements.push("ADD COLUMN lead_time_days INT NOT NULL DEFAULT 0");
  if (!cols.has("created_by")) alterStatements.push("ADD COLUMN created_by INT NULL");
  if (!cols.has("created_at")) alterStatements.push("ADD COLUMN created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP");
  if (!cols.has("updated_at")) {
    alterStatements.push(
      "ADD COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    );
  }

  for (const statement of alterStatements) {
    await query(`ALTER TABLE suppliers ${statement}`);
  }

  if (alterStatements.length) {
    supplierColumnCache = null;
    cols = await getTableColumns("suppliers");
  }

  const supplierItemsExists = await tableExists("supplier_items");
  if (!supplierItemsExists) {
    await query(`
      CREATE TABLE supplier_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        supplier_id INT NOT NULL,
        item_id INT NOT NULL,
        supplier_item_code VARCHAR(50) NULL,
        last_price DECIMAL(12,2) NOT NULL DEFAULT 0,
        preferred TINYINT(1) NOT NULL DEFAULT 0,
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_supplier_item (supplier_id, item_id)
      )
    `);
  }

  const usersExists = await tableExists("users");
  if (usersExists) {
    const userCols = await getTableColumns("users");
    if (!userCols.has("supplier_id")) {
      await query("ALTER TABLE users ADD COLUMN supplier_id INT NULL");
    }
  }

  const rowsWithoutCode = await query(
    `
      SELECT id
      FROM suppliers
      WHERE supplier_code IS NULL OR TRIM(supplier_code) = ''
      ORDER BY id ASC
    `
  );

  for (const row of rowsWithoutCode) {
    const fallbackCode = `FW-SUP-${String(row.id).padStart(3, "0")}`;
    await query("UPDATE suppliers SET supplier_code = ? WHERE id = ?", [fallbackCode, row.id]);
  }

  supplierSetupDone = true;
};

const normalizeBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback ? 1 : 0;
  if (typeof value === "boolean") return value ? 1 : 0;

  const numeric = Number(value);
  if (!Number.isNaN(numeric)) return numeric === 1 ? 1 : 0;

  const text = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "y", "enabled", "active"].includes(text) ? 1 : 0;
};

const normalizeStatus = (value) => {
  const text = String(value || "active").trim().toLowerCase();
  return text === "inactive" ? "inactive" : "active";
};

const cleanNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normalizeItemIds = (value) => {
  if (Array.isArray(value)) {
    return [...new Set(value.map((itemId) => Number(itemId)).filter((itemId) => Number.isInteger(itemId) && itemId > 0))];
  }

  if (value === undefined || value === null || value === "") return [];

  return [...new Set(
    String(value)
      .split(",")
      .map((itemId) => Number(String(itemId).trim()))
      .filter((itemId) => Number.isInteger(itemId) && itemId > 0)
  )];
};

const generateNextSupplierCode = async () => {
  const rows = await query(`SELECT supplier_code FROM suppliers WHERE supplier_code IS NOT NULL`);

  let maxNo = 0;
  for (const row of rows) {
    const match = String(row.supplier_code || "").match(/(\d+)$/);
    if (!match) continue;
    const current = Number(match[1]);
    if (Number.isFinite(current) && current > maxNo) {
      maxNo = current;
    }
  }

  return `FW-SUP-${String(maxNo + 1).padStart(3, "0")}`;
};

const syncSupplierItems = async (supplierId, itemIds) => {
  if (!(await tableExists("supplier_items"))) return;

  await query("DELETE FROM supplier_items WHERE supplier_id = ?", [supplierId]);

  const cleaned = normalizeItemIds(itemIds);
  if (!cleaned.length) return;

  const values = cleaned.map((itemId) => [supplierId, itemId]);
  await query("INSERT INTO supplier_items (supplier_id, item_id) VALUES ?", [values]);
};

const upsertSupplierPortalUser = async ({
  supplierId,
  supplierName,
  phone,
  portalEnabled,
  portalEmail,
  portalPassword,
}) => {
  if (!(await tableExists("users"))) {
    return { portal_user_id: null, portal_user_email: null, portal_temp_password: null };
  }

  const finalPortalEnabled = normalizeBoolean(portalEnabled, false);
  const cleanedEmail = String(portalEmail || "").trim().toLowerCase();

  const existingRows = await query(
    `
      SELECT id, email
      FROM users
      WHERE supplier_id = ? OR (? <> '' AND email = ?)
      ORDER BY id DESC
      LIMIT 1
    `,
    [supplierId, cleanedEmail, cleanedEmail]
  );

  const existing = existingRows[0] || null;

  if (!finalPortalEnabled) {
    if (existing) {
      await query(
        `
          UPDATE users
          SET status = 'inactive', supplier_id = NULL
          WHERE id = ?
        `,
        [existing.id]
      );
    }

    return { portal_user_id: null, portal_user_email: null, portal_temp_password: null };
  }

  if (!cleanedEmail) {
    return { portal_user_id: existing?.id || null, portal_user_email: null, portal_temp_password: null };
  }

  const tempPassword = String(portalPassword || phone || "supplier123").trim();
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  if (existing) {
    if (portalPassword) {
      await query(
        `
          UPDATE users
          SET full_name = ?, email = ?, role = 'supplier', phone = ?, status = 'active', supplier_id = ?, password = ?
          WHERE id = ?
        `,
        [supplierName, cleanedEmail, phone || null, supplierId, hashedPassword, existing.id]
      );
    } else {
      await query(
        `
          UPDATE users
          SET full_name = ?, email = ?, role = 'supplier', phone = ?, status = 'active', supplier_id = ?
          WHERE id = ?
        `,
        [supplierName, cleanedEmail, phone || null, supplierId, existing.id]
      );
    }

    return {
      portal_user_id: existing.id,
      portal_user_email: cleanedEmail,
      portal_temp_password: portalPassword ? tempPassword : null,
    };
  }

  const result = await query(
    `
      INSERT INTO users (full_name, email, password, role, phone, status, supplier_id)
      VALUES (?, ?, ?, 'supplier', ?, 'active', ?)
    `,
    [supplierName, cleanedEmail, hashedPassword, phone || null, supplierId]
  );

  return {
    portal_user_id: result.insertId,
    portal_user_email: cleanedEmail,
    portal_temp_password: tempPassword,
  };
};

const buildSupplierListSql = () => `
  SELECT
    s.id,
    s.supplier_code,
    s.supplier_name,
    s.contact_person,
    s.contact_number,
    s.whatsapp_number,
    s.email,
    s.address,
    s.city,
    s.payment_terms,
    s.lead_time_days,
    s.notes,
    s.status,
    COALESCE(s.organic_certified, 0) AS organic_certified,
    COALESCE(s.accepts_returns, 1) AS accepts_returns,
    COALESCE(s.portal_enabled, 0) AS portal_enabled,
    s.created_at,
    s.updated_at,
    COALESCE((SELECT COUNT(*) FROM supplier_items si WHERE si.supplier_id = s.id), 0) AS item_count,
    COALESCE((SELECT GROUP_CONCAT(i.name ORDER BY i.name SEPARATOR ', ') FROM supplier_items si JOIN items i ON i.id = si.item_id WHERE si.supplier_id = s.id), '') AS item_names,
    COALESCE((SELECT COUNT(*) FROM purchase_orders po WHERE po.supplier_id = s.id), 0) AS total_purchase_orders,
    COALESCE((SELECT COUNT(*) FROM \`returns\` r WHERE r.supplier_id = s.id), 0) AS total_return_notes,
    (SELECT MAX(po.created_at) FROM purchase_orders po WHERE po.supplier_id = s.id) AS last_order_at,
    (SELECT u.id FROM users u WHERE u.supplier_id = s.id AND u.role = 'supplier' ORDER BY u.id DESC LIMIT 1) AS portal_user_id,
    (SELECT u.email FROM users u WHERE u.supplier_id = s.id AND u.role = 'supplier' ORDER BY u.id DESC LIMIT 1) AS portal_user_email
  FROM suppliers s
  ORDER BY
    CASE WHEN COALESCE(s.status, 'active') = 'active' THEN 0 ELSE 1 END,
    CAST(SUBSTRING_INDEX(s.supplier_code, '-', -1) AS UNSIGNED) ASC,
    s.supplier_name ASC
`;
const getAllSuppliers = async (req, res) => {
  try {
    await ensureSupplierRuntimeSchema();
    const results = await query(buildSupplierListSql());
    res.json(results);
  } catch (err) {
    console.error("getAllSuppliers error:", err);
    res.status(500).json({ message: "Failed to load suppliers", error: err.message });
  }
};

const getSupplierById = async (req, res) => {
  try {
    await ensureSupplierRuntimeSchema();

    const { id } = req.params;
    const rows = await query(
      `SELECT * FROM (${buildSupplierListSql()}) supplier_rows WHERE supplier_rows.id = ? LIMIT 1`,
      [id]
    );
    const supplier = rows[0];

    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    const items = await query(
      `
        SELECT
          si.id,
          si.item_id,
          i.code AS item_code,
          i.name AS item_name,
          i.unit,
          si.last_price,
          si.preferred,
          si.notes
        FROM supplier_items si
        JOIN items i ON i.id = si.item_id
        WHERE si.supplier_id = ?
        ORDER BY i.name ASC
      `,
      [id]
    );

    const purchaseOrders = await query(
      `
        SELECT
          po.id,
          po.po_number,
          po.order_date,
          po.expected_date,
          po.total_amount,
          po.status,
          COUNT(poi.id) AS item_count
        FROM purchase_orders po
        LEFT JOIN po_items poi ON poi.purchase_order_id = po.id
        WHERE po.supplier_id = ?
        GROUP BY po.id, po.po_number, po.order_date, po.expected_date, po.total_amount, po.status
        ORDER BY po.order_date DESC, po.id DESC
        LIMIT 6
      `,
      [id]
    );

    const returns = await query(
      `
        SELECT
          r.id,
          r.return_number,
          r.return_type,
          r.return_date,
          r.reason,
          r.deducted_from_supplier_payment,
          COUNT(ri.id) AS item_count,
          COALESCE(SUM(ri.qty), 0) AS total_qty
        FROM \`returns\` r
        LEFT JOIN return_items ri ON ri.return_id = r.id
        WHERE r.supplier_id = ?
        GROUP BY r.id, r.return_number, r.return_type, r.return_date, r.reason, r.deducted_from_supplier_payment
        ORDER BY r.return_date DESC, r.id DESC
        LIMIT 6
      `,
      [id]
    );

    res.json({
      ...supplier,
      items,
      purchase_orders: purchaseOrders,
      return_notes: returns,
    });
  } catch (err) {
    console.error("getSupplierById error:", err);
    res.status(500).json({ message: "Failed to load supplier details", error: err.message });
  }
};

const createSupplier = async (req, res) => {
  try {
    await ensureSupplierRuntimeSchema();

    const {
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
      portal_email,
      portal_password,
      item_ids,
      status,
    } = req.body;

    const cleanName = String(supplier_name || "").trim();
    const cleanContact = String(contact_number || "").trim();

    if (!cleanName || !cleanContact) {
      return res.status(400).json({ message: "Supplier name and contact number are required" });
    }

    const finalCode = String(supplier_code || "").trim() || (await generateNextSupplierCode());

    const existingCode = await query(
      "SELECT id FROM suppliers WHERE supplier_code = ? LIMIT 1",
      [finalCode]
    );
    if (existingCode.length) {
      return res.status(409).json({ message: "Supplier code already exists" });
    }

    const result = await query(
      `
        INSERT INTO suppliers
        (
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
          status,
          created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        finalCode,
        cleanName,
        String(contact_person || "").trim() || null,
        cleanContact,
        String(whatsapp_number || contact_number || "").trim() || null,
        String(email || "").trim() || null,
        String(address || "").trim() || null,
        String(city || "").trim() || null,
        String(payment_terms || "").trim() || null,
        cleanNumber(lead_time_days, 0),
        String(notes || "").trim() || null,
        normalizeBoolean(organic_certified, false),
        normalizeBoolean(accepts_returns, true),
        normalizeBoolean(portal_enabled, false),
        normalizeStatus(status),
        Number(req.user?.id || 0) || null,
      ]
    );

    const supplierId = result.insertId;

    await syncSupplierItems(supplierId, item_ids);
    const portalInfo = await upsertSupplierPortalUser({
      supplierId,
      supplierName: cleanName,
      phone: cleanContact,
      portalEnabled: portal_enabled,
      portalEmail: portal_email || email,
      portalPassword: portal_password,
    });

    clearSupplierCache();

    res.status(201).json({
      message: "Supplier created successfully",
      supplierId,
      supplier_code: finalCode,
      ...portalInfo,
    });
  } catch (err) {
    console.error("createSupplier error:", err);
    res.status(500).json({ message: "Failed to create supplier", error: err.message });
  }
};

const updateSupplier = async (req, res) => {
  try {
    await ensureSupplierRuntimeSchema();

    const { id } = req.params;
    const {
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
      portal_email,
      portal_password,
      item_ids,
      status,
    } = req.body;

    const existing = await query("SELECT id, supplier_code FROM suppliers WHERE id = ? LIMIT 1", [id]);
    if (!existing.length) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    const cleanName = String(supplier_name || "").trim();
    const cleanContact = String(contact_number || "").trim();

    if (!cleanName || !cleanContact) {
      return res.status(400).json({ message: "Supplier name and contact number are required" });
    }

    const finalCode = String(supplier_code || "").trim() || existing[0].supplier_code || `FW-SUP-${String(id).padStart(3, "0")}`;

    const duplicateCode = await query(
      "SELECT id FROM suppliers WHERE supplier_code = ? AND id <> ? LIMIT 1",
      [finalCode, id]
    );

    if (duplicateCode.length) {
      return res.status(409).json({ message: "Supplier code already exists" });
    }

    await query(
      `
        UPDATE suppliers
        SET
          supplier_code = ?,
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
        finalCode,
        cleanName,
        String(contact_person || "").trim() || null,
        cleanContact,
        String(whatsapp_number || contact_number || "").trim() || null,
        String(email || "").trim() || null,
        String(address || "").trim() || null,
        String(city || "").trim() || null,
        String(payment_terms || "").trim() || null,
        cleanNumber(lead_time_days, 0),
        String(notes || "").trim() || null,
        normalizeBoolean(organic_certified, false),
        normalizeBoolean(accepts_returns, true),
        normalizeBoolean(portal_enabled, false),
        normalizeStatus(status),
        id,
      ]
    );

    await syncSupplierItems(Number(id), item_ids);
    const portalInfo = await upsertSupplierPortalUser({
      supplierId: Number(id),
      supplierName: cleanName,
      phone: cleanContact,
      portalEnabled: portal_enabled,
      portalEmail: portal_email || email,
      portalPassword: portal_password,
    });

    clearSupplierCache();

    res.json({
      message: "Supplier updated successfully",
      supplierId: Number(id),
      supplier_code: finalCode,
      ...portalInfo,
    });
  } catch (err) {
    console.error("updateSupplier error:", err);
    res.status(500).json({ message: "Failed to update supplier", error: err.message });
  }
};

const deleteSupplier = async (req, res) => {
  try {
    await ensureSupplierRuntimeSchema();

    const { id } = req.params;
    const existing = await query("SELECT id, supplier_name FROM suppliers WHERE id = ? LIMIT 1", [id]);
    if (!existing.length) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    const linkedRows = await query(
      `
        SELECT
          (
            COALESCE((SELECT COUNT(*) FROM purchase_orders WHERE supplier_id = ?), 0)
            + COALESCE((SELECT COUNT(*) FROM grn WHERE supplier_id = ?), 0)
            + COALESCE((SELECT COUNT(*) FROM \`returns\` WHERE supplier_id = ?), 0)
          ) AS total_links
      `,
      [id, id, id]
    );

    const totalLinks = Number(linkedRows?.[0]?.total_links || 0);

    if (totalLinks > 0) {
      await query("UPDATE suppliers SET status = 'inactive', portal_enabled = 0 WHERE id = ?", [id]);
      await query(
        "UPDATE users SET status = 'inactive', supplier_id = NULL WHERE supplier_id = ? AND role = 'supplier'",
        [id]
      );

      clearSupplierCache();

      return res.json({
        message: "Supplier has linked procurement records, so it was marked inactive instead of being deleted",
        softDeleted: true,
      });
    }

    await query("DELETE FROM supplier_items WHERE supplier_id = ?", [id]);
    await query("UPDATE users SET supplier_id = NULL, status = 'inactive' WHERE supplier_id = ? AND role = 'supplier'", [id]);
    await query("DELETE FROM suppliers WHERE id = ?", [id]);

    clearSupplierCache();

    res.json({ message: "Supplier deleted successfully" });
  } catch (err) {
    console.error("deleteSupplier error:", err);
    res.status(500).json({ message: "Failed to delete supplier", error: err.message });
  }
};

module.exports = {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};