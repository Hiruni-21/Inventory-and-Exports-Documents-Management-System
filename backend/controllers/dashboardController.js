const db = require("../config/db");

const getDashboardStats = (req, res) => {
  const stats = {};

  const queries = {
    items: "SELECT COUNT(*) AS total FROM items WHERE status = 'active'",
    suppliers: "SELECT COUNT(*) AS total FROM suppliers WHERE status = 'active'",
    lowStock: `
      SELECT COUNT(*) AS total
      FROM items i
      JOIN inventory inv ON inv.item_id = i.id
      WHERE inv.qty_available <= i.reorder_level
    `,
    localDispatch: "SELECT COUNT(*) AS total FROM local_dispatch",
    globalDispatch: "SELECT COUNT(*) AS total FROM global_dispatch",
    notifications: "SELECT COUNT(*) AS total FROM notifications WHERE is_read = 0",
  };

  const keys = Object.keys(queries);
  let completed = 0;

  keys.forEach((key) => {
    db.query(queries[key], (err, results) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err.message });
      }

      stats[key] = results[0].total;
      completed += 1;

      if (completed === keys.length) {
        res.json(stats);
      }
    });
  });
};

module.exports = { getDashboardStats };