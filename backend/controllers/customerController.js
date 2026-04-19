const db = require("../config/db");

const getCustomers = (req, res) => {
  const { type } = req.query;

  let sql = `
    SELECT
      id,
      customer_code,
      customer_name,
      contact_person,
      phone,
      whatsapp_number,
      email,
      address,
      city,
      location_island,
      customer_type,
      airline_preference,
      incoterm,
      cold_chain_required,
      status
    FROM customers
  `;
  const params = [];

  if (type) {
    sql += ` WHERE LOWER(customer_type) = LOWER(?)`;
    params.push(type);
  }

  sql += ` ORDER BY customer_name ASC`;

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error("getCustomers error:", err);
      return res.status(500).json({
        message: "Failed to load customers",
        error: err.message,
      });
    }

    res.json(rows);
  });
};

module.exports = {
  getCustomers,
};