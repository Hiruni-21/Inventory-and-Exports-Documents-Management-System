import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

const moduleMeta = {
  purchase_order: {
    label: "Purchase Order",
    route: (row) => row.metadata?.route || `/purchase-orders/${row.entity_id}`,
  },
  return: {
    label: "Return",
    route: (row) => row.metadata?.route || "/returns",
  },
  wastage: {
    label: "Wastage",
    route: (row) => row.metadata?.route || "/returns",
  },
  export_release: {
    label: "Export Release",
    route: (row) => row.metadata?.route || "/dispatch/global",
  },
  dispatch_override: {
    label: "Dispatch Override",
    route: (row) => row.metadata?.route || "/dispatch/global",
  },
};

const normalizeRole = (role) => {
  const value = String(role || "manager").toLowerCase();
  if (value.includes("ops")) return "ops";
  if (value.includes("operation")) return "ops";
  if (value.includes("supervisor")) return "supervisor";
  if (value.includes("logistics")) return "logistics";
  if (value.includes("supplier")) return "supplier";
  return "manager";
};

const cardStyle = {
  background: "var(--white)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: 18,
};

const summaryValueStyle = {
  fontSize: 28,
  fontWeight: 800,
  color: "var(--g900)",
  lineHeight: 1,
  marginTop: 4,
};

const tabStyle = (active) => ({
  height: 34,
  padding: "0 14px",
  borderRadius: 12,
  border: `1px solid ${active ? "#166534" : "#CFE2D4"}`,
  background: active ? "#166534" : "#FFFFFF",
  color: active ? "#FFFFFF" : "var(--g800)",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
});

const actionBtn = (variant = "approve") => ({
  height: 32,
  padding: "0 12px",
  borderRadius: 12,
  border: `1px solid ${variant === "approve" ? "#166534" : "#E8C8C1"}`,
  background: variant === "approve" ? "#166534" : "#FFF5F2",
  color: variant === "approve" ? "#FFFFFF" : "#C84E35",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  whiteSpace: "nowrap",
});

const secondaryBtn = {
  height: 32,
  padding: "0 12px",
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "#FFFFFF",
  color: "var(--g800)",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
};

const priorityPill = (value) => {
  const urgent = String(value).toLowerCase() === "urgent";
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    background: urgent ? "#FBEED7" : "#EAF7EE",
    color: urgent ? "#D48A1B" : "#1F8B4C",
    whiteSpace: "nowrap",
  };
};

const statusPill = (value) => {
  const key = String(value || "").toLowerCase();

  if (key === "approved") {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "4px 10px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 800,
      background: "#EAF7EE",
      color: "#1F8B4C",
      whiteSpace: "nowrap",
    };
  }

  if (key === "rejected") {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "4px 10px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 800,
      background: "#FFF1EC",
      color: "#C84E35",
      whiteSpace: "nowrap",
    };
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    background: "#FBEED7",
    color: "#D48A1B",
    whiteSpace: "nowrap",
  };
};

export default function ManagerApprovalsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const roleKey = normalizeRole(user?.role);
  const isManager = roleKey === "manager";

  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({ total: 0, byModule: {} });
  const [loading, setLoading] = useState(true);
  const [moduleTab, setModuleTab] = useState("all");
  const [statusTab, setStatusTab] = useState(isManager ? "pending" : "approved");
  const [decisionModal, setDecisionModal] = useState(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);

      const params = {
        status: statusTab,
      };

      if (moduleTab !== "all") {
        params.module_key = moduleTab;
      }

      const [listRes, countRes] = await Promise.all([
        api.get("/approvals", { params }),
        api.get("/approvals/counts"),
      ]);

      setRows(Array.isArray(listRes.data) ? listRes.data : []);
      setCounts(countRes.data || { total: 0, byModule: {} });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load approvals");
      setRows([]);
      setCounts({ total: 0, byModule: {} });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [moduleTab, statusTab]);

  useEffect(() => {
    setStatusTab(isManager ? "pending" : "approved");
  }, [isManager]);

  const urgentCount = useMemo(
    () => rows.filter((row) => row.priority === "urgent").length,
    [rows]
  );

  const openDecision = (row, action) => {
    setDecisionModal({ row, action });
    setDecisionNote("");
  };

  const closeDecision = () => {
    setDecisionModal(null);
    setDecisionNote("");
  };

  const submitDecision = async () => {
    if (!decisionModal) return;

    try {
      setSubmitting(true);

      const endpoint =
        decisionModal.action === "approve"
          ? `/approvals/${decisionModal.row.id}/approve`
          : `/approvals/${decisionModal.row.id}/reject`;

      await api.post(endpoint, { note: decisionNote });

      toast.success(
        decisionModal.action === "approve"
          ? "Approval completed"
          : "Request rejected"
      );

      closeDecision();
      loadData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to update approval");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 14,
          marginBottom: 16,
        }}
      >
        <div style={cardStyle}>
          <div
            style={{
              fontSize: 11,
              color: "var(--text2)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".06em",
            }}
          >
            Pending Total
          </div>
          <div style={summaryValueStyle}>{counts.total || 0}</div>
        </div>

        <div style={cardStyle}>
          <div
            style={{
              fontSize: 11,
              color: "var(--text2)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".06em",
            }}
          >
            On This Screen
          </div>
          <div style={summaryValueStyle}>{rows.length}</div>
        </div>

        <div style={cardStyle}>
          <div
            style={{
              fontSize: 11,
              color: "var(--text2)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".06em",
            }}
          >
            Urgent
          </div>
          <div style={summaryValueStyle}>{urgentCount}</div>
        </div>

        <div style={cardStyle}>
          <div
            style={{
              fontSize: 11,
              color: "var(--text2)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".06em",
            }}
          >
            Purchase Orders
          </div>
          <div style={summaryValueStyle}>
            {counts.byModule?.purchase_order || 0}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <button
          style={tabStyle(statusTab === "pending")}
          onClick={() => setStatusTab("pending")}
        >
          Pending
        </button>
        <button
          style={tabStyle(statusTab === "approved")}
          onClick={() => setStatusTab("approved")}
        >
          Approved
        </button>
        <button
          style={tabStyle(statusTab === "rejected")}
          onClick={() => setStatusTab("rejected")}
        >
          Rejected
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <button style={tabStyle(moduleTab === "all")} onClick={() => setModuleTab("all")}>
          All
        </button>
        <button
          style={tabStyle(moduleTab === "purchase_order")}
          onClick={() => setModuleTab("purchase_order")}
        >
          PO
        </button>
        <button
          style={tabStyle(moduleTab === "return")}
          onClick={() => setModuleTab("return")}
        >
          Returns
        </button>
        <button
          style={tabStyle(moduleTab === "wastage")}
          onClick={() => setModuleTab("wastage")}
        >
          Wastage
        </button>
        <button
          style={tabStyle(moduleTab === "export_release")}
          onClick={() => setModuleTab("export_release")}
        >
          Export Release
        </button>
        <button
          style={tabStyle(moduleTab === "dispatch_override")}
          onClick={() => setModuleTab("dispatch_override")}
        >
          Dispatch Override
        </button>
      </div>

      <div className="tw">
        <div className="tw-h">
          <h3>{isManager ? "Manager Approval Queue" : "Approval Decisions"}</h3>
          <span style={{ fontSize: 11, color: "var(--text3)" }}>
            {isManager ? "Manager review queue" : "Read manager decisions and notes"}
          </span>
        </div>

        <table>
          <thead>
            <tr>
              <th>REQUEST</th>
              <th>MODULE</th>
              <th>SUMMARY</th>
              <th>REQUESTED BY</th>
              <th>PRIORITY</th>
              <th>STATUS</th>
              <th>MANAGER NOTE</th>
              <th>DECIDED BY</th>
              <th>CREATED</th>
              <th>ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10">Loading...</td>
              </tr>
            ) : rows.length ? (
              rows.map((row) => {
                const meta = moduleMeta[row.module_key] || {
                  label: row.module_key,
                  route: () => "/dashboard",
                };

                return (
                  <tr key={row.id}>
                    <td>
                      <div style={{ fontWeight: 800, color: "var(--g900)" }}>
                        {row.request_number || `REQ-${row.id}`}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text3)",
                          marginTop: 2,
                        }}
                      >
                        {row.title}
                      </div>
                    </td>

                    <td>{meta.label}</td>

                    <td style={{ maxWidth: 240 }}>
                      <div style={{ fontSize: 12, color: "var(--text)" }}>
                        {row.summary || "—"}
                      </div>
                    </td>

                    <td>{row.requested_by_name || "—"}</td>

                    <td>
                      <span style={priorityPill(row.priority)}>{row.priority}</span>
                    </td>

                    <td>
                      <span style={statusPill(row.approval_status)}>
                        {row.approval_status}
                      </span>
                    </td>

                    <td style={{ minWidth: 180 }}>
                      <div style={{ fontSize: 12, color: "var(--text)" }}>
                        {row.decision_note || "—"}
                      </div>
                    </td>

                    <td>{row.decided_by_name || "—"}</td>

                    <td style={{ fontSize: 11 }}>
                      {String(row.created_at || "").slice(0, 16).replace("T", " ")}
                    </td>

                    <td>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          style={secondaryBtn}
                          onClick={() => navigate(meta.route(row))}
                        >
                          View
                        </button>

                        {isManager && statusTab === "pending" ? (
                          <>
                            <button
                              type="button"
                              style={actionBtn("approve")}
                              onClick={() => openDecision(row, "approve")}
                            >
                              Approve
                            </button>

                            <button
                              type="button"
                              style={actionBtn("reject")}
                              onClick={() => openDecision(row, "reject")}
                            >
                              Reject
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="10">No records found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {decisionModal ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10,40,24,.48)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 500,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 520,
              background: "var(--white)",
              borderRadius: 16,
              border: "1px solid var(--border)",
              boxShadow: "0 16px 48px rgba(10,40,24,.22)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "18px 20px 14px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
                {decisionModal.action === "approve"
                  ? "Approve Request"
                  : "Reject Request"}
              </h3>

              <button
                type="button"
                onClick={closeDecision}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
                {decisionModal.row.title}
              </div>

              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--text2)",
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                  marginBottom: 6,
                }}
              >
                Decision Note
              </label>

              <textarea
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                placeholder="Optional manager note..."
                style={{
                  width: "100%",
                  minHeight: 110,
                  padding: 12,
                  borderRadius: 10,
                  border: "1.5px solid var(--border)",
                  resize: "vertical",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 13,
                }}
              />
            </div>

            <div
              style={{
                padding: "14px 20px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <button type="button" style={secondaryBtn} onClick={closeDecision}>
                Cancel
              </button>

              <button
                type="button"
                style={actionBtn(
                  decisionModal.action === "approve" ? "approve" : "reject"
                )}
                onClick={submitDecision}
                disabled={submitting}
              >
                {submitting
                  ? "Saving..."
                  : decisionModal.action === "approve"
                  ? "Approve"
                  : "Reject"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}