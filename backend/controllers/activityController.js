const db = require("../config/db");

const getActivities = (req, res) => {
  const { module, startDate, endDate, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT 
      id, user_id, user_name, module, action, reference_type, reference_id, details, ip_address, created_at
    FROM activity_log
    WHERE 1=1
  `;
  const params = [];

  if (module) {
    query += ` AND module = ?`;
    params.push(module);
  }

  if (startDate) {
    query += ` AND created_at >= ?`;
    params.push(`${startDate} 00:00:00`);
  }

  if (endDate) {
    query += ` AND created_at <= ?`;
    params.push(`${endDate} 23:59:59`);
  }

  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));

  db.query(query, params, (err, results) => {
    if (err) {
      console.error("Error fetching activities:", err);
      return res.status(500).json({ message: "Failed to fetch activities" });
    }

    let countQuery = `SELECT COUNT(*) as total FROM activity_log WHERE 1=1`;
    const countParams = [];

    if (module) {
      countQuery += ` AND module = ?`;
      countParams.push(module);
    }
    if (startDate) {
      countQuery += ` AND created_at >= ?`;
      countParams.push(`${startDate} 00:00:00`);
    }
    if (endDate) {
      countQuery += ` AND created_at <= ?`;
      countParams.push(`${endDate} 23:59:59`);
    }

    db.query(countQuery, countParams, (countErr, countResults) => {
      if (countErr) {
        console.error("Error counting activities:", countErr);
        return res.status(500).json({ message: "Failed to count activities" });
      }

      res.json({
        data: results,
        pagination: {
          total: countResults[0].total,
          page: Number(page),
          limit: Number(limit)
        }
      });
    });
  });
};

module.exports = {
  getActivities
};
