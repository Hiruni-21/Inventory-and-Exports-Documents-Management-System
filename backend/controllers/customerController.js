const db = require("../config/db");

const normalizeAirlinePreference = (value) => {
  const raw = String(value || "").trim().toUpperCase();

  if (raw === "Q2" || raw.includes("Q2") || raw.includes("MALDIV")) return "Q2";
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

const getCustomers = (req, res) => {
  const { type } = req.query;

  let sql = `
    SELECT
      c.id,
      c.customer_code,
      c.customer_type,
      c.customer_name,
      c.group_name,
      c.contact_person,
      c.phone,
      c.whatsapp_number,
      c.email,
      c.address,
      c.city,
      c.delivery_window,
      c.payment_terms,
      c.returns_policy,
      c.driver_preference,
      c.notes,
      c.location_island,
      c.airline_preference,
      c.incoterm,
      c.cold_chain_required,
      c.status,
      c.created_at,
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

  const params = [];

  if (type) {
    sql += ` WHERE LOWER(c.customer_type) = LOWER(?)`;
    params.push(type);
  }

  sql += ` ORDER BY c.customer_name ASC`;

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error("getCustomers error:", err);
      return res.status(500).json({
        message: "Failed to load customers",
        error: err.message,
      });
    }

    const normalized = rows.map((row) => ({
      ...row,
      whatsapp: row.whatsapp_number || "",
      orders_count: row.customer_type === "local" ? Number(row.shipment_count || 0) : 0,
      shipments_count: row.customer_type === "global" ? Number(row.shipment_count || 0) : 0,
    }));

    res.json(normalized);
  });
};

const getCustomerById = (req, res) => {
  const { id } = req.params;

  const customerSql = `
    SELECT
      c.id,
      c.customer_code,
      c.customer_type,
      c.customer_name,
      c.group_name,
      c.contact_person,
      c.phone,
      c.whatsapp_number,
      c.email,
      c.address,
      c.city,
      c.delivery_window,
      c.payment_terms,
      c.returns_policy,
      c.driver_preference,
      c.notes,
      c.location_island,
      c.airline_preference,
      c.incoterm,
      c.cold_chain_required,
      c.status,
      c.created_at,
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
    WHERE c.id = ?
    LIMIT 1
  `;

  db.query(customerSql, [id], (err, rows) => {
    if (err) {
      console.error("getCustomerById error:", err);
      return res.status(500).json({
        message: "Failed to load customer",
        error: err.message,
      });
    }

    if (!rows.length) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const customer = {
      ...rows[0],
      whatsapp: rows[0].whatsapp_number || "",
      orders_count: rows[0].customer_type === "local" ? Number(rows[0].shipment_count || 0) : 0,
      shipments_count: rows[0].customer_type === "global" ? Number(rows[0].shipment_count || 0) : 0,
    };

    if (customer.customer_type === "global") {
      const shipmentsSql = `
        SELECT
          gd.id,
          gd.dispatch_number,
          gd.dispatch_date,
          COALESCE(gd.flight_no, gd.airline, '—') AS flight,
          CONCAT(COALESCE(gd.total_weight, 0), ' kg') AS weight,
          CONCAT(
            COALESCE(ed.docs_done_count, 0),
            '/7'
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
      `;

      db.query(shipmentsSql, [id], (shipErr, shipmentRows) => {
        if (shipErr) {
          console.error("getCustomerById shipments error:", shipErr);
          return res.status(500).json({
            message: "Failed to load customer shipments",
            error: shipErr.message,
          });
        }

        res.json({
          ...customer,
          recent_shipments: shipmentRows,
        });
      });

      return;
    }

    res.json({
      ...customer,
      recent_shipments: [],
    });
  });
};

const createCustomer = (req, res) => {
  const userId = req.user?.id || null;

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

  const createNow = (finalCode) => {
    const sql = `
      INSERT INTO customers
      (
        customer_code,
        customer_type,
        customer_name,
        group_name,
        contact_person,
        phone,
        whatsapp_number,
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
        created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [
        finalCode,
        customer_type,
        customer_name,
        group_name || null,
        contact_person || null,
        phone || null,
        finalWhatsapp,
        email || null,
        address || null,
        city || null,
        delivery_window || null,
        payment_terms || null,
        returns_policy || null,
        driver_preference || null,
        notes || null,
        location_island || null,
        customer_type === "global" ? normalizeAirlinePreference(airline_preference) : null,
        customer_type === "global" ? (incoterm || "CIF") : null,
        cold_chain_required ? 1 : 0,
        status || "active",
        userId,
      ],
      (err, result) => {
        if (err) {
          console.error("createCustomer error:", err);
          return res.status(500).json({
            message: "Failed to create customer",
            error: err.message,
          });
        }

        res.status(201).json({
          message: "Customer created successfully",
          id: result.insertId,
        });
      }
    );
  };

  if (customer_code) {
    createNow(customer_code);
    return;
  }

  db.query(
    `SELECT customer_code FROM customers WHERE customer_type = ? ORDER BY id ASC`,
    [customer_type],
    (codeErr, codeRows) => {
      if (codeErr) {
        console.error("createCustomer code error:", codeErr);
        return res.status(500).json({
          message: "Failed to create customer code",
          error: codeErr.message,
        });
      }

      const nextCode = buildNextCustomerCode(customer_type, codeRows);
      createNow(nextCode);
    }
  );
};

const updateCustomer = (req, res) => {
  const { id } = req.params;

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

  const sql = `
    UPDATE customers
    SET
      customer_name = ?,
      group_name = ?,
      contact_person = ?,
      phone = ?,
      whatsapp_number = ?,
      email = ?,
      address = ?,
      city = ?,
      delivery_window = ?,
      payment_terms = ?,
      returns_policy = ?,
      driver_preference = ?,
      notes = ?,
      location_island = ?,
      airline_preference = ?,
      incoterm = ?,
      cold_chain_required = ?,
      status = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      customer_name,
      group_name || null,
      contact_person || null,
      phone || null,
      finalWhatsapp,
      email || null,
      address || null,
      city || null,
      delivery_window || null,
      payment_terms || null,
      returns_policy || null,
      driver_preference || null,
      notes || null,
      location_island || null,
      airline_preference ? normalizeAirlinePreference(airline_preference) : null,
      incoterm || null,
      cold_chain_required ? 1 : 0,
      status || "active",
      id,
    ],
    (err, result) => {
      if (err) {
        console.error("updateCustomer error:", err);
        return res.status(500).json({
          message: "Failed to update customer",
          error: err.message,
        });
      }

      if (!result.affectedRows) {
        return res.status(404).json({ message: "Customer not found" });
      }

      res.json({ message: "Customer updated successfully" });
    }
  );
};

const deleteCustomer = (req, res) => {
  const { id } = req.params;

  const checkSql = `
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
  `;

  db.query(checkSql, [id], (checkErr, rows) => {
    if (checkErr) {
      console.error("deleteCustomer check error:", checkErr);
      return res.status(500).json({
        message: "Failed to delete customer",
        error: checkErr.message,
      });
    }

    if (!rows.length) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const row = rows[0];
    const usedCount =
      row.customer_type === "global"
        ? Number(row.global_count || 0)
        : Number(row.local_count || 0);

    if (usedCount > 0) {
      return res.status(400).json({
        message: "Cannot delete customer because dispatch records already exist",
      });
    }

    db.query(`DELETE FROM customers WHERE id = ?`, [id], (err) => {
      if (err) {
        console.error("deleteCustomer error:", err);
        return res.status(500).json({
          message: "Failed to delete customer",
          error: err.message,
        });
      }

      res.json({ message: "Customer deleted successfully" });
    });
  });
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};