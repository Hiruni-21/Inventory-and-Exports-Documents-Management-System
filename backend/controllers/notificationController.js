const db = require("../config/db");
const { ensureNotificationTable } = require("../utils/notificationHelper");

const getNotifications = async (req, res) => {
  try {
    await ensureNotificationTable();
    const userId = req.user.id;

    const sql = `
      SELECT id, user_id, role, title, message, type, is_read, created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY id DESC
    `;
    db.query(sql, [userId], (err, results) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err.message });
      }
      res.json(results);
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    await ensureNotificationTable();
    const { id } = req.params;
    const userId = req.user.id;

    const sql = "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?";
    db.query(sql, [id, userId], (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err.message });
      }
      res.json({ message: "Notification marked as read" });
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await ensureNotificationTable();
    const userId = req.user.id;

    const sql = "UPDATE notifications SET is_read = 1 WHERE user_id = ?";
    db.query(sql, [userId], (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err.message });
      }
      res.json({ message: "All notifications marked as read" });
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
};
