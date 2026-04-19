const db = require("../config/db");

const runQuery = (conn, sql, params = []) =>
  new Promise((resolve, reject) => {
    conn.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

const ALLOWED_TARGETS = {
  purchase_orders: { pk: "id", statusColumn: "status" },
  returns: { pk: "id", statusColumn: "status" },
  wastage: { pk: "id", statusColumn: "status" },
  dispatch: { pk: "id", statusColumn: "status" },
  export_documents: { pk: "id", statusColumn: "status" },
};

const normalizePriority = (value) => {
  return String(value || "normal").toLowerCase() === "urgent"
    ? "urgent"
    : "normal";
};

const validateTarget = (targetTable, targetPk = "id") => {
  const config = ALLOWED_TARGETS[targetTable];

  if (!config) {
    throw new Error(`Unsupported approval target: ${targetTable}`);
  }

  if (targetPk !== config.pk) {
    throw new Error(`Unsupported target primary key for ${targetTable}`);
  }

  return config;
};

const createApprovalRequest = async (payload, conn = db) => {
  const {
    module_key,
    entity_id,
    request_number = null,
    title,
    summary = null,
    requested_by = null,
    requested_by_name = null,
    priority = "normal",
    target_table,
    target_pk = "id",
    approve_status = "Approved",
    reject_status = "Rejected",
    current_status = "Pending Approval",
    metadata_json = {},
  } = payload;

  if (!module_key || !entity_id || !title || !target_table) {
    throw new Error(
      "module_key, entity_id, title and target_table are required"
    );
  }

  validateTarget(target_table, target_pk);

  const pending = await runQuery(
    conn,
    `
      SELECT id
      FROM approval_requests
      WHERE module_key = ?
        AND entity_id = ?
        AND approval_status = 'pending'
      LIMIT 1
    `,
    [module_key, entity_id]
  );

  if (pending.length) {
    return pending[0].id;
  }

  const result = await runQuery(
    conn,
    `
      INSERT INTO approval_requests (
        module_key,
        entity_id,
        request_number,
        title,
        summary,
        requested_by,
        requested_by_name,
        priority,
        approval_status,
        target_table,
        target_pk,
        approve_status,
        reject_status,
        current_status,
        metadata_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)
    `,
    [
      module_key,
      entity_id,
      request_number,
      title,
      summary,
      requested_by,
      requested_by_name,
      normalizePriority(priority),
      target_table,
      target_pk,
      approve_status,
      reject_status,
      current_status,
      JSON.stringify(metadata_json || {}),
    ]
  );

  return result.insertId;
};

module.exports = {
  runQuery,
  ALLOWED_TARGETS,
  normalizePriority,
  validateTarget,
  createApprovalRequest,
};