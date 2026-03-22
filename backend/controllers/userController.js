const db = require("../config/db");
const bcrypt = require("bcryptjs");
const logActivity = require("../utils/logActivity");

const getAllUsers = (req, res) => {
  db.query(
    "SELECT id, full_name, email, role, phone, status, supplier_id, created_at FROM users ORDER BY id DESC",
    (err, results) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err.message });
      }
      res.json(results);
    }
  );
};

const createUser = async (req, res) => {
  const { full_name, email, password, role, phone, status, supplier_id } = req.body;

  if (!full_name || !email || !password || !role) {
    return res.status(400).json({ message: "Full name, email, password, and role are required" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const sql = `
    INSERT INTO users (full_name, email, password, role, phone, status, supplier_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [full_name, email, hashedPassword, role, phone || null, status || "active", supplier_id || null],
    (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err.message });
      }

      logActivity({
        user_id: req.user.id,
        user_name: req.user.name,
        module: "Users",
        action: "Created user",
        reference_type: "user",
        reference_id: result.insertId,
        ip_address: req.ip,
      });

      res.status(201).json({ message: "User created successfully", userId: result.insertId });
    }
  );
};

module.exports = {
  getAllUsers,
  createUser,
};