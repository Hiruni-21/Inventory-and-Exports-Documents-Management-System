const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendPasswordResetEmail } = require("../services/emailService");

const loginUser = (req, res) => {
  const { email, password } = req.body;

  const sql = `
    SELECT id, full_name, email, password, role, status, supplier_id
    FROM users
    WHERE email = ?
    LIMIT 1
  `;

  db.query(sql, [email], async (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = results[0];

    if (user.status !== "active") {
      return res.status(403).json({ message: "User account is inactive" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: user.role,
        supplier_id: user.supplier_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: user.role,
        supplier_id: user.supplier_id,
      },
    });
  });
};

const getMe = (req, res) => {
  return res.json({ user: req.user });
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const sql = "SELECT id FROM users WHERE email = ? LIMIT 1";
  db.query(sql, [email], async (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (results.length === 0) {
      return res.status(400).json({ message: "No account found with this email address" });
    }

    const user = results[0];
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const updateSql = "UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?";
    db.query(updateSql, [resetToken, expiresAt, user.id], async (updateErr) => {
      if (updateErr) {
        return res.status(500).json({ message: "Database error", error: updateErr.message });
      }

      const resetLink = `${process.env.APP_BASE_URL || "http://localhost:5173"}/reset-password?token=${resetToken}`;

      try {
        await sendPasswordResetEmail(email, resetToken, resetLink);
        return res.json({ message: "Password reset link has been sent to your email" });
      } catch (emailErr) {
        return res.status(500).json({ message: "Error sending email", error: emailErr.message });
      }
    });
  });
};

const resetPassword = async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;

  if (!token) {
    return res.status(400).json({ message: "Reset token is required" });
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

  const sql = "SELECT id, reset_token_expires FROM users WHERE reset_token = ? LIMIT 1";
  db.query(sql, [token], async (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (results.length === 0) {
      return res.status(400).json({ message: "Invalid or expired password reset token" });
    }

    const user = results[0];
    const expiryTime = new Date(user.reset_token_expires).getTime();

    if (Date.now() > expiryTime) {
      db.query("UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = ?", [user.id], (cleanupErr) => {
        if (cleanupErr) {
          return res.status(500).json({ message: "Database error during cleanup", error: cleanupErr.message });
        }
        return res.status(400).json({ message: "Invalid or expired password reset token" });
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updateSql = "UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?";
    db.query(updateSql, [hashedPassword, user.id], (updateErr) => {
      if (updateErr) {
        return res.status(500).json({ message: "Database error", error: updateErr.message });
      }

      return res.json({ message: "Password has been reset successfully" });
    });
  });
};

module.exports = {
  loginUser,
  getMe,
  forgotPassword,
  resetPassword,
};