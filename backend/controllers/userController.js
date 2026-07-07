const db = require("../config/db");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const logActivity = require("../utils/logActivity");


const getAllUsers = (req, res) => {
  db.query(
    "SELECT id, full_name, email, role, phone, phone AS phone_number, status, department, supplier_id, created_at FROM users ORDER BY id DESC",
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
  const { full_name, email, password, role } = req.body;

  if (!full_name || !email || !password || !role) {
    return res.status(400).json({ message: "Full name, email, password, and role are required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters long" });
  }

  db.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email], async (emailErr, emailResults) => {
    if (emailErr) {
      return res.status(500).json({ message: "Database error", error: emailErr.message });
    }

    if (emailResults.length > 0) {
      return res.status(400).json({ message: "Email address is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO users (full_name, email, password, role, status)
      VALUES (?, ?, ?, ?, 'active')
    `;

    db.query(
      sql,
      [full_name, email, hashedPassword, role],
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

        const { sendNotification } = require("../utils/notificationHelper");
        sendNotification({
          role: "manager",
          title: "New User Registered",
          message: `User ${full_name} has been registered with role ${role}.`,
          type: "user_registered"
        }).catch(err => console.error("Notification error:", err.message));

        res.status(201).json({ message: "User created successfully", userId: result.insertId });
      }
    );
  });
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({ message: "Current password is required" });
    }
    if (!newPassword) {
      return res.status(400).json({ message: "New password is required" });
    }
    if (!confirmPassword) {
      return res.status(400).json({ message: "Confirm password is required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters long" });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New passwords do not match" });
    }

    db.query(
      "SELECT password FROM users WHERE id = ?",
      [req.user.id],
      async (err, results) => {
        if (err) {
          return res.status(500).json({ message: "Database error", error: err.message });
        }

        if (results.length === 0) {
          return res.status(404).json({ message: "User not found" });
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(currentPassword, user.password);

        if (!isMatch) {
          return res.status(400).json({ message: "Incorrect current password" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        db.query(
          "UPDATE users SET password = ? WHERE id = ?",
          [hashedPassword, req.user.id],
          (updateErr) => {
            if (updateErr) {
              return res.status(500).json({ message: "Database error", error: updateErr.message });
            }

            logActivity({
              user_id: req.user.id,
              user_name: req.user.name,
              module: "Users",
              action: "Changed password",
              reference_type: "user",
              reference_id: req.user.id,
              ip_address: req.ip,
            });

            return res.json({ message: "Password changed successfully" });
          }
        );
      }
    );
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateUser = (req, res) => {
  const userId = req.params.id;
  const { role, status, phone } = req.body;

  if (Number(userId) === Number(req.user.id)) {
    if (status === "inactive") {
      return res.status(400).json({ message: "You cannot deactivate your own admin account" });
    }
  }

  if (!role || !status) {
    return res.status(400).json({ message: "Role and status are required" });
  }

  db.query("SELECT phone FROM users WHERE id = ? LIMIT 1", [userId], (selectErr, results) => {
    if (selectErr) {
      return res.status(500).json({ message: "Database error", error: selectErr.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const existingPhone = results[0].phone;

    if (existingPhone && phone !== undefined && phone !== existingPhone) {
      return res.status(400).json({ message: "Phone number already set by user" });
    }

    const finalPhone = existingPhone || phone || null;

    const sql = "UPDATE users SET role = ?, status = ?, phone = ? WHERE id = ?";
    db.query(sql, [role, status, finalPhone, userId], (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err.message });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      logActivity({
        user_id: req.user.id,
        user_name: req.user.name,
        module: "Users",
        action: "Updated user details",
        reference_type: "user",
        reference_id: userId,
        ip_address: req.ip,
      });

      res.json({ message: "User updated successfully" });
    });
  });
};

const deleteUser = (req, res) => {
  const userId = req.params.id;

  if (Number(userId) === Number(req.user.id)) {
    return res.status(400).json({ message: "You cannot delete your own admin account" });
  }

  const sql = "UPDATE users SET status = 'inactive' WHERE id = ?";
  db.query(sql, [userId], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    logActivity({
      user_id: req.user.id,
      user_name: req.user.name,
      module: "Users",
      action: "Soft deleted user",
      reference_type: "user",
      reference_id: userId,
      ip_address: req.ip,
    });

    res.json({ message: "User deleted successfully" });
  });
};

module.exports = {
  getAllUsers,
  getCurrentUserProfile,
  updateCurrentUserProfile,
  updateCurrentUserProfilePhoto,
  createUser,
  changePassword,
  updateUser,
  deleteUser,
};