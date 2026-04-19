const db = require("../config/db");

const q = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

const normalizeAirlinePreference = (value) => {
  const raw = String(value || "").trim().toUpperCase();
  if (raw === "Q2" || raw.includes("Q2") || raw.includes("MALDIV")) return "Q2";
  if (raw === "EK" || raw.includes("EK") || raw.includes("EMIRATES")) return "EK";
  if (raw === "QR" || raw.includes("QR") || raw.includes("QATAR")) return "QR";
  if (raw === "OTHER") return "OTHER";
  return "UL";
};

const buildNextCustomerCode = (type, existingRows) => {
  const prefix = type === "global" ? "FW-CLT-G" : "FW-CLT-L";

  const maxNum = (existingRows || []).reduce((max, row) => {
    const code = String(row.customer_code || "");
    const digits = code.match(/(\d+)$/);
    const value = digits ? Number(digits[1]) : 0;
    return Math.max(max, value);
  }, 0);

  return `${prefix}${String(maxNum + 1).padStart(3, "0")}`;
};

let customerSchemaCache = null;

const getCustomerSchema = async () => {
  if (customerSchemaCache) return customerSchemaCache;

  const rows = await q(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'customers'
  `);

  const columns = new Set(rows.map((row) => row.COLUMN_NAME));

  customerSchemaCache = {
    columns,
    has(column) {
      return columns.has(column);
    },
  };

  return customerSchemaCache;
};

const selectCustomerColumn = (schema, column, fallback = `NULL AS ${column}`) =>
  schema.has(column) ? `c.${column}` : fallback;

const customerSelectSql = (schema) => `
  SELECT
    c.id,
    c.customer_code,
    c.customer_type,
    c.customer_name,
    ${selectCustomerColumn(schema, "group_name")},
    ${selectCustomerColumn(schema, "contact_person")},
    ${selectCustomerColumn(schema, "phone")},
    ${selectCustomerColumn(schema, "whatsapp_number")},
    ${selectCustomerColumn(schema, "email")},
    ${selectCustomerColumn(schema, "address")},
    ${selectCustomerColumn(schema, "city")},
    ${selectCustomerColumn(schema, "delivery_window")},
    ${selectCustomerColumn(schema, "payment_terms")},
    ${selectCustomerColumn(schema, "returns_policy")},
    ${selectCustomerColumn(schema, "driver_preference")},
    ${selectCustomerColumn(schema, "notes")},
    ${selectCustomerColumn(schema, "location_island")},
    ${selectCustomerColumn(schema, "airline_preference")},
    ${selectCustomerColumn(schema, "incoterm")},
    ${schema.has("cold_chain_required") ? "c.cold_chain_required" : "0 AS cold_chain_required"},
    ${schema.has("status") ? "c.status" : "'active' AS status"},
    ${selectCustomerColumn(schema, "created_at")},
    CASE
      WHEN c.customer_type = 'global' THEN COALESCE(gs.shipment_count, 0)
      ELSE COALESCE(ls.dispatch_count, 0)
    END AS shipment_count
  FROM customers c
  LEFT JOIN (
    SELECT customer_id, COUNT(*) AS shipment_count
    FROM global_dispatch
    GROUP BY customer_id
  ) gs ON gs.customer_id = c.id
  LEFT JOIN (
    SELECT customer_id, COUNT(*) AS dispatch_count
    FROM local_dispatch
    GROUP BY customer_id
  ) ls ON ls.customer_id = c.id
`;

const normalizeCustomerRow = (row) => ({
  ...row,
  whatsapp: row.whatsapp_number || "",
  orders_count: row.customer_type === "local" ? Number(row.shipment_count || 0) : 0,
  shipments_count: row.customer_type === "global" ? Number(row.shipment_count || 0) : 0,
});

const getCustomers = async (req, res) => {
  try {
    const { type } = req.query;
    const schema = await getCustomerSchema();

    let sql = customerSelectSql(schema);
    const params = [];

    if (type) {
      sql += ` WHERE LOWER(c.customer_type) = LOWER(?)`;
      params.push(type);
    }

    sql += ` ORDER BY c.customer_name ASC`;

    const rows = await q(sql, params);
    res.json(rows.map(normalizeCustomerRow));
  } catch (err) {
    console.error("getCustomers error:", err);
    res.status(500).json({
      message: "Failed to load customers",
      error: err.message,
    });
  }
};

const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const schema = await getCustomerSchema();

    const rows = await q(
      `
      ${customerSelectSql(schema)}
      WHERE c.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const customer = normalizeCustomerRow(rows[0]);

    if (customer.customer_type !== "global") {
      return res.json({
        ...customer,
        recent_shipments: [],
      });
    }

    const recentShipments = await q(
      `
      SELECT
        gd.id,
        gd.dispatch_number,
        gd.dispatch_date,
        CASE
          WHEN UPPER(COALESCE(gd.airline, '')) = 'Q2' THEN 'Maldivian (Q2)'
          WHEN UPPER(COALESCE(gd.airline, '')) = 'EK' THEN 'Emirates (EK)'
          WHEN UPPER(COALESCE(gd.airline, '')) = 'QR' THEN 'Qatar Airways (QR)'
          ELSE 'SriLankan Airlines (UL)'
        END AS flight,
        CONCAT(COALESCE(it.total_weight, 0), ' kg') AS weight,
        CONCAT(
          COALESCE(ed.docs_done_count, 0),
          '/',
          CASE
            WHEN UPPER(COALESCE(gd.incoterm, '')) = 'CIF' THEN 7
            ELSE 6
          END
        ) AS docs,
        CASE
          WHEN gd.status = 'delivered' THEN 'Delivered'
          WHEN gd.status = 'cleared' THEN 'Cleared'
          ELSE 'Docs Pending'
        END AS status
      FROM global_dispatch gd
      LEFT JOIN (
        SELECT
          global_dispatch_id,
          COALESCE(SUM(qty), 0) AS total_weight
        FROM global_dispatch_items
        GROUP BY global_dispatch_id
      ) it ON it.global_dispatch_id = gd.id
      LEFT JOIN (
        SELECT
          global_dispatch_id,
          (
            (commercial_invoice_status = 'done') +
            (packing_list_status = 'done') +
            (phytosanitary_certificate_status = 'done') +
            (airway_bill_status = 'done') +
            (certificate_of_origin_status = 'done') +
            (health_certificate_status = 'done') +
            (insurance_certificate_status = 'done')
          ) AS docs_done_count
        FROM export_documents
      ) ed ON ed.global_dispatch_id = gd.id
      WHERE gd.customer_id = ?
      ORDER BY gd.id DESC
      LIMIT 5
      `,
      [id]
    );

    res.json({
      ...customer,
      recent_shipments: recentShipments,
    });
  } catch (err) {
    console.error("getCustomerById error:", err);
    res.status(500).json({
      message: "Failed to load customer",
      error: err.message,
    });
  }
};

const pushInsertField = (schema, columns, values, column, value, transform = (v) => v) => {
  if (!schema.has(column)) return;
  columns.push(column);
  values.push(transform(value));
};

const createCustomer = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const schema = await getCustomerSchema();

    const {
      customer_code,
      customer_type,
      customer_name,
      group_name,
      contact_person,
      phone,
      whatsapp_number,
      whatsapp,
      email,
      address,
      city,
      delivery_window,
      payment_terms,
      returns_policy,
      driver_preference,
      notes,
      location_island,
      airline_preference,
      incoterm,
      cold_chain_required,
      status,
    } = req.body;

    if (!customer_type || !customer_name) {
      return res.status(400).json({
        message: "Customer type and customer name are required",
      });
    }

    const finalWhatsapp = whatsapp_number || whatsapp || phone || null;

    let finalCode = customer_code;

    if (!finalCode) {
      const codeRows = await q(
        `SELECT customer_code FROM customers WHERE customer_type = ? ORDER BY id ASC`,
        [customer_type]
      );
      finalCode = buildNextCustomerCode(customer_type, codeRows);
    }

    const columns = [];
    const values = [];

    pushInsertField(schema, columns, values, "customer_code", finalCode);
    pushInsertField(schema, columns, values, "customer_type", customer_type);
    pushInsertField(schema, columns, values, "customer_name", customer_name);
    pushInsertField(schema, columns, values, "group_name", group_name || null);
    pushInsertField(schema, columns, values, "contact_person", contact_person || null);
    pushInsertField(schema, columns, values, "phone", phone || null);
    pushInsertField(schema, columns, values, "whatsapp_number", finalWhatsapp);
    pushInsertField(schema, columns, values, "email", email || null);
    pushInsertField(schema, columns, values, "address", address || null);
    pushInsertField(schema, columns, values, "city", city || null);
    pushInsertField(schema, columns, values, "delivery_window", delivery_window || null);
    pushInsertField(schema, columns, values, "payment_terms", payment_terms || null);
    pushInsertField(schema, columns, values, "returns_policy", returns_policy || null);
    pushInsertField(schema, columns, values, "driver_preference", driver_preference || null);
    pushInsertField(schema, columns, values, "notes", notes || null);
    pushInsertField(schema, columns, values, "location_island", location_island || null);
    pushInsertField(
      schema,
      columns,
      values,
      "airline_preference",
      customer_type === "global" ? airline_preference : null,
      (value) => (value ? normalizeAirlinePreference(value) : null)
    );
    pushInsertField(
      schema,
      columns,
      values,
      "incoterm",
      customer_type === "global" ? incoterm || "CIF" : null
    );
    pushInsertField(schema, columns, values, "cold_chain_required", cold_chain_required ? 1 : 0);
    pushInsertField(schema, columns, values, "status", status || "active");
    pushInsertField(schema, columns, values, "created_by", userId);

    const sql = `
      INSERT INTO customers (${columns.join(", ")})
      VALUES (${columns.map(() => "?").join(", ")})
    `;

    const result = await q(sql, values);

    res.status(201).json({
      message: "Customer created successfully",
      id: result.insertId,
    });
  } catch (err) {
    console.error("createCustomer error:", err);
    res.status(500).json({
      message: "Failed to create customer",
      error: err.message,
    });
  }
};

const pushUpdateField = (schema, sets, values, column, value, transform = (v) => v) => {
  if (!schema.has(column)) return;
  sets.push(`${column} = ?`);
  values.push(transform(value));
};

const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const schema = await getCustomerSchema();

    const {
      customer_name,
      group_name,
      contact_person,
      phone,
      whatsapp_number,
      whatsapp,
      email,
      address,
      city,
      delivery_window,
      payment_terms,
      returns_policy,
      driver_preference,
      notes,
      location_island,
      airline_preference,
      incoterm,
      cold_chain_required,
      status,
    } = req.body;

    const finalWhatsapp = whatsapp_number || whatsapp || phone || null;

    const sets = [];
    const values = [];

    pushUpdateField(schema, sets, values, "customer_name", customer_name);
    pushUpdateField(schema, sets, values, "group_name", group_name || null);
    pushUpdateField(schema, sets, values, "contact_person", contact_person || null);
    pushUpdateField(schema, sets, values, "phone", phone || null);
    pushUpdateField(schema, sets, values, "whatsapp_number", finalWhatsapp);
    pushUpdateField(schema, sets, values, "email", email || null);
    pushUpdateField(schema, sets, values, "address", address || null);
    pushUpdateField(schema, sets, values, "city", city || null);
    pushUpdateField(schema, sets, values, "delivery_window", delivery_window || null);
    pushUpdateField(schema, sets, values, "payment_terms", payment_terms || null);
    pushUpdateField(schema, sets, values, "returns_policy", returns_policy || null);
    pushUpdateField(schema, sets, values, "driver_preference", driver_preference || null);
    pushUpdateField(schema, sets, values, "notes", notes || null);
    pushUpdateField(schema, sets, values, "location_island", location_island || null);
    pushUpdateField(
      schema,
      sets,
      values,
      "airline_preference",
      airline_preference,
      (value) => (value ? normalizeAirlinePreference(value) : null)
    );
    pushUpdateField(schema, sets, values, "incoterm", incoterm || null);
    pushUpdateField(schema, sets, values, "cold_chain_required", cold_chain_required ? 1 : 0);
    pushUpdateField(schema, sets, values, "status", status || "active");

    values.push(id);

    const sql = `
      UPDATE customers
      SET ${sets.join(", ")}
      WHERE id = ?
    `;

    const result = await q(sql, values);

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json({ message: "Customer updated successfully" });
  } catch (err) {
    console.error("updateCustomer error:", err);
    res.status(500).json({
      message: "Failed to update customer",
      error: err.message,
    });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const rows = await q(
      `
      SELECT
        c.customer_type,
        COALESCE(gs.shipment_count, 0) AS global_count,
        COALESCE(ls.dispatch_count, 0) AS local_count
      FROM customers c
      LEFT JOIN (
        SELECT customer_id, COUNT(*) AS shipment_count
        FROM global_dispatch
        GROUP BY customer_id
      ) gs ON gs.customer_id = c.id
      LEFT JOIN (
        SELECT customer_id, COUNT(*) AS dispatch_count
        FROM local_dispatch
        GROUP BY customer_id
      ) ls ON ls.customer_id = c.id
      WHERE c.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const row = rows[0];
    const hasLinkedRecords =
      Number(row.global_count || 0) > 0 || Number(row.local_count || 0) > 0;

    if (hasLinkedRecords) {
      return res.status(400).json({
        message: "Cannot delete customer with linked dispatch history",
      });
    }

    await q(`DELETE FROM customers WHERE id = ?`, [id]);

    res.json({ message: "Customer deleted successfully" });
  } catch (err) {
    console.error("deleteCustomer error:", err);
    res.status(500).json({
      message: "Failed to delete customer",
      error: err.message,
    });
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};