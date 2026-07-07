const db = require("../config/db");

const ensureNotificationTable = () => {
  return new Promise((resolve, reject) => {
    const sql = `
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        role VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        is_read TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    db.query(sql, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
};

const sendNotification = async ({ role, supplierId, title, message, type }) => {
  await ensureNotificationTable();

  // Normalize role
  const targetRole = String(role || "").toLowerCase();

  let sql = "SELECT id, role FROM users WHERE LOWER(role) = ?";
  const params = [targetRole];

  if (targetRole === "supplier" && supplierId) {
    sql += " AND supplier_id = ?";
    params.push(supplierId);
  }

  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, users) => {
      if (err) return reject(err);

      if (!users.length) return resolve();

      const insertSql = `
        INSERT INTO notifications (user_id, role, title, message, type, is_read)
        VALUES ?
      `;
      const values = users.map((user) => [
        user.id,
        user.role,
        title,
        message,
        type,
        0,
      ]);

      db.query(insertSql, [values], (insertErr) => {
        if (insertErr) return reject(insertErr);
        resolve();
      });
    });
  });
};

const triggerLowStockCheck = async (itemId) => {
  await ensureNotificationTable();

  const sql = `
    SELECT
      i.name,
      i.code,
      i.reorder_level,
      inv.qty_on_hand
    FROM items i
    JOIN inventory inv ON i.id = inv.item_id
    WHERE i.id = ?
    LIMIT 1
  `;
  db.query(sql, [itemId], (err, results) => {
    if (err || !results.length) return;

    const { name, code, reorder_level, qty_on_hand } = results[0];
    const qty = Number(qty_on_hand || 0);
    const reorder = Number(reorder_level || 0);

    if (qty <= reorder) {
      // Trigger manager low stock alert
      sendNotification({
        role: "manager",
        title: "Low Stock Alert",
        message: `Item ${name} (${code}) is below its safety threshold. Current stock: ${qty}.`,
        type: "low_stock"
      }).catch(e => console.error("Low stock alert error:", e.message));

      // Trigger operations inventory below threshold alert
      sendNotification({
        role: "ops",
        title: "Inventory Below Threshold",
        message: `Item ${name} (${code}) is below safety threshold. Current stock: ${qty}.`,
        type: "low_stock"
      }).catch(e => console.error("Below threshold alert error:", e.message));
    }
  });
};

module.exports = {
  ensureNotificationTable,
  sendNotification,
  triggerLowStockCheck,
};
