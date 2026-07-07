const db = require("../config/db");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
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

const getCurrentUserProfile = async (req, res) => {
  try {
   

    db.query(
      `SELECT id, full_name, email, role, phone, department, profile_photo, status, supplier_id, created_at, updated_at
       FROM users
       WHERE id = ?`,
      [req.user.id],
      (err, results) => {
        if (err) {
          return res.status(500).json({ message: "Database error", error: err.message });
        }

        if (results.length === 0) {
          return res.status(404).json({ message: "User profile not found" });
        }

        return res.json({ user: results[0] });
      }
    );
  } catch (error) {
    return res.status(500).json({ message: "Database error", error: error.message });
  }
};

const updateCurrentUserProfile = async (req, res) => {
  try {
    
  

    const { phone } = req.body;

    if (phone === undefined) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    db.query(
      `UPDATE users SET phone = ? WHERE id = ?`,
      [phone || null, req.user.id],
      (err) => {
        if (err) {
          return res.status(500).json({ message: "Database error", error: err.message });
        }

        return res.json({ message: "Profile updated successfully" });
      }
    );
  } catch (error) {
    return res.status(500).json({ message: "Database error", error: error.message });
  }
};

const updateCurrentUserProfilePhoto = async (req, res) => {
  try {
   

    if (!req.file) {
      return res.status(400).json({ message: "Profile picture is required" });
    }

    const uploadDir = path.join(__dirname, "..", "uploads", "profile-photos");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${Date.now()}-${req.file.originalname.replace(/\s+/g, "-")}`;
    const targetPath = path.join(uploadDir, fileName);
    fs.renameSync(req.file.path, targetPath);

    const profilePhotoPath = `/uploads/profile-photos/${fileName}`;

    db.query(
      `UPDATE users SET profile_photo = ? WHERE id = ?`,
      [profilePhotoPath, req.user.id],
      (err) => {
        if (err) {
          return res.status(500).json({ message: "Database error", error: err.message });
        }

        return res.json({ message: "Profile picture updated successfully", profilePhoto: profilePhotoPath });
      }
    );
  } catch (error) {
    return res.status(500).json({ message: "Database error", error: error.message });
  }
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
  getCurrentUserProfile,
  updateCurrentUserProfile,
  updateCurrentUserProfilePhoto,
  createUser,
};