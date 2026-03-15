const db = require("../config/db");

const getAllSuppliers = (req, res) => {
  const sql = "SELECT * FROM suppliers ORDER BY id DESC";

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json(results);
  });
};

const getSupplierById = (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM suppliers WHERE id = ?";

  db.query(sql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    res.json(results[0]);
  });
};

const createSupplier = (req, res) => {
  const {
    supplier_name,
    contact_number,
    email,
    address,
    lead_time_days,
    return_eligibility,
    rating_score,
  } = req.body;

  const sql = `
    INSERT INTO suppliers
    (supplier_name, contact_number, email, address, lead_time_days, return_eligibility, rating_score)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      supplier_name,
      contact_number,
      email,
      address,
      lead_time_days || 0,
      return_eligibility || "Yes",
      rating_score || 0,
    ],
    (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err.message });
      }

      res.status(201).json({
        message: "Supplier created successfully",
        supplierId: result.insertId,
      });
    }
  );
};

const updateSupplier = (req, res) => {
  const { id } = req.params;
  const {
    supplier_name,
    contact_number,
    email,
    address,
    lead_time_days,
    return_eligibility,
    rating_score,
    status,
  } = req.body;

  const sql = `
    UPDATE suppliers
    SET supplier_name = ?, contact_number = ?, email = ?, address = ?, lead_time_days = ?, return_eligibility = ?, rating_score = ?, status = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      supplier_name,
      contact_number,
      email,
      address,
      lead_time_days,
      return_eligibility,
      rating_score,
      status,
      id,
    ],
    (err) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err.message });
      }

      res.json({ message: "Supplier updated successfully" });
    }
  );
};

const deleteSupplier = (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM suppliers WHERE id = ?";

  db.query(sql, [id], (err) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json({ message: "Supplier deleted successfully" });
  });
};

module.exports = {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};