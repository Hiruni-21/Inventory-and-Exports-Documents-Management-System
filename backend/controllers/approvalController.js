const db = require("../config/db");
const {
  runQuery,
  ALLOWED_TARGETS,
  createApprovalRequest,
} = require("../utils/approvalHelper");

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
};

const userNameFromReq = (req) =>
  req.user?.name ||
  req.user?.full_name ||
  req.user?.username ||
  req.user?.email ||
  "User";

const roleFromReq = (req) => String(req.user?.role || "").toLowerCase();

const isManager = (req) => roleFromReq(req).includes("manager");
const canViewApprovals = (req) => {
  const role = roleFromReq(req);
  return role.includes("manager") || role.includes("ops") || role.includes("operation");
};

const beginTransaction = () =>
  new Promise((resolve, reject) => {
    db.beginTransaction((err) => {
      if (err) return reject(err);
      resolve();
    });
  });

const commitTransaction = () =>
  new Promise((resolve, reject) => {
    db.commit((err) => {
      if (err) return reject(err);
      resolve();
    });
  });

const rollbackTransaction = () =>
  new Promise((resolve) => {
    db.rollback(() => resolve());
  });

const listApprovals = async (req, res) => {
  try {
    if (!canViewApprovals(req)) {
      return res.status(403).json({ message: "Not allowed to view approvals" });
    }

    const status = String(req.query.status || "pending").toLowerCase();
    const moduleKey = String(req.query.module_key || "all").toLowerCase();

    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid approval status" });
    }

    let sql = `
      SELECT *
      FROM approval_requests
      WHERE approval_status = ?
    `;
    const params = [status];

    if (moduleKey !== "all") {
      sql += ` AND module_key = ? `;
      params.push(moduleKey);
    }

    sql += `
      ORDER BY
        CASE priority WHEN 'urgent' THEN 0 ELSE 1 END,
        created_at DESC
    `;

    const rows = await runQuery(db, sql, params);

    res.json(
      rows.map((row) => ({
        ...row,
        metadata: safeJsonParse(row.metadata_json),
      }))
    );
  } catch (err) {
    res.status(500).json({
      message: "Failed to load approvals",
      error: err.message,
    });
  }
};

const getApprovalCounts = async (req, res) => {
  try {
    if (!canViewApprovals(req)) {
      return res.status(403).json({ message: "Not allowed to view approval counts" });
    }

    const rows = await runQuery(
      db,
      `
        SELECT module_key, COUNT(*) AS total
        FROM approval_requests
        WHERE approval_status = 'pending'
        GROUP BY module_key
      `
    );

    const byModule = {};
    let total = 0;

    rows.forEach((row) => {
      const count = Number(row.total || 0);
      byModule[row.module_key] = count;
      total += count;
    });

    res.json({ total, byModule });
  } catch (err) {
    res.status(500).json({
      message: "Failed to load approval counts",
      error: err.message,
    });
  }
};

const createApproval = async (req, res) => {
  try {
    const role = roleFromReq(req);
    const allowed =
      role.includes("manager") ||
      role.includes("ops") ||
      role.includes("operation") ||
      role.includes("logistics") ||
      role.includes("supervisor");

    if (!allowed) {
      return res.status(403).json({ message: "Not allowed to request approval" });
    }

    const id = await createApprovalRequest({
      ...req.body,
      requested_by: req.user?.id || null,
      requested_by_name: userNameFromReq(req),
    });

    res.status(201).json({
      message: "Approval request created",
      id,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to create approval request",
      error: err.message,
    });
  }
};

const decideApproval = async (req, res, decision) => {
  const id = Number(req.params.id);

  if (!isManager(req)) {
    return res.status(403).json({ message: "Manager access only" });
  }

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid approval request id" });
  }

  try {
    await beginTransaction();

    const rows = await runQuery(
      db,
      `
        SELECT *
        FROM approval_requests
        WHERE id = ?
          AND approval_status = 'pending'
        LIMIT 1
      `,
      [id]
    );

    if (!rows.length) {
      await rollbackTransaction();
      return res.status(404).json({ message: "Pending approval request not found" });
    }

    const request = rows[0];
    const target = ALLOWED_TARGETS[request.target_table];

    if (!target) {
      await rollbackTransaction();
      return res.status(400).json({
        message: `Unsupported target table: ${request.target_table}`,
      });
    }

    const nextStatus =
      decision === "approved" ? request.approve_status : request.reject_status;

    const updateEntitySql = `
      UPDATE ${request.target_table}
      SET ${target.statusColumn} = ?
      WHERE ${target.pk} = ?
    `;

    const entityResult = await runQuery(db, updateEntitySql, [
      nextStatus,
      request.entity_id,
    ]);

    if (!entityResult.affectedRows) {
      await rollbackTransaction();
      return res.status(404).json({
        message: `Target record not found in ${request.target_table}`,
      });
    }

    await runQuery(
      db,
      `
        UPDATE approval_requests
        SET
          approval_status = ?,
          decided_by = ?,
          decided_by_name = ?,
          decision_note = ?,
          decided_at = NOW()
        WHERE id = ?
      `,
      [
        decision,
        req.user?.id || null,
        userNameFromReq(req),
        req.body?.note || null,
        id,
      ]
    );

    await commitTransaction();

    if (request.target_table === "purchase_orders") {
      db.query("SELECT supplier_id, po_number FROM purchase_orders WHERE id = ? LIMIT 1", [request.entity_id], (poErr, poRows) => {
        if (!poErr && poRows.length > 0) {
          const { supplier_id, po_number } = poRows[0];
          const { sendNotification } = require("../utils/notificationHelper");

          // Notify Supplier
          sendNotification({
            role: "supplier",
            supplierId: supplier_id,
            title: "PO Status Updated",
            message: `Purchase Order ${po_number} has been ${decision}.`,
            type: "po_status"
          }).catch(e => console.error("Supplier PO status notification error:", e.message));

          // If approved, notify Operations
          if (decision === "approved") {
            sendNotification({
              role: "ops",
              title: "New Purchase Order Needing Action",
              message: `Purchase Order ${po_number} has been approved and is ready for action.`,
              type: "po_approved"
            }).catch(e => console.error("Operations PO action notification error:", e.message));
          }
        }
      });
    }

    res.json({
      message: `Approval request ${decision}`,
      next_status: nextStatus,
    });
  } catch (err) {
    await rollbackTransaction();
    res.status(500).json({
      message: "Failed to update approval request",
      error: err.message,
    });
  }
};

const approveApproval = (req, res) => decideApproval(req, res, "approved");
const rejectApproval = (req, res) => decideApproval(req, res, "rejected");

module.exports = {
  listApprovals,
  getApprovalCounts,
  createApproval,
  approveApproval,
  rejectApproval,
};