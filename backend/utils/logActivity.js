const db = require("../config/db");

const logActivity = ({
  user_id = null,
  user_name,
  module,
  action,
  reference_type = null,
  reference_id = null,
  details = null,
  ip_address = null,
}) => {
  const sql = `
    INSERT INTO activity_log
    (user_id, user_name, module, action, reference_type, reference_id, details, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [
    user_id,
    user_name,
    module,
    action,
    reference_type,
    reference_id,
    details ? JSON.stringify(details) : null,
    ip_address,
  ]);
};

module.exports = logActivity;