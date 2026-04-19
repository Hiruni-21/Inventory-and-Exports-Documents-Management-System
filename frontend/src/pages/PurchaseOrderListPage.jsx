import { useEffect, useMemo, useState } from "react";
import { CheckCheck, Eye, Plus, Search, Send } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const fmtDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-CA");
};

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const roleOf = (role) => String(role || "").toLowerCase();

const statusLabel = (status) => {
  const value = String(status || "draft").toLowerCase();
  if (value === "pending_approval") return "Awaiting Approval";
  if (value === "approved") return "Approved";
  if (value === "sent") return "Sent to Supplier";
  if (value === "grn_created") return "GRN Created";
  if (value === "closed") return "Closed";
  return "Draft";
};

const statusClass = (status) => {
  const value = String(status || "draft").toLowerCase();
  if (value === "approved") return "tag-pill yes-text";
  if (value === "sent" || value === "grn_created" || value === "closed") {
    return "tag-pill tag-soft";
  }
  if (value === "draft") return "tag-pill tag-soft";
  return "tag-pill tag-orange";
};

export default function PurchaseOrderListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [actionId, setActionId] = useState(null);

  const canApprove = roleOf(user?.role).includes("manager");
  const canSend =
    roleOf(user?.role).includes("manager") ||
    roleOf(user?.role).includes("operation") ||
    roleOf(user?.role).includes("ops");

  const loadRows = async () => {
    try {
      setLoading(true);
      const res = await api.get("/purchase-orders");
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load purchase orders");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  const counts = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        const value = String(row.status || "draft").toLowerCase();
        acc.all += 1;
        if (value === "draft") acc.draft += 1;
        if (value === "pending_approval") acc.awaiting += 1;
        if (value === "approved") acc.approved += 1;
        if (value === "sent") acc.sent += 1;
        if (value === "grn_created" || value === "closed") acc.closed += 1;
        return acc;
      },
      { all: 0, draft: 0, awaiting: 0, approved: 0, sent: 0, closed: 0 }
    );
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      const status = String(row.status || "draft").toLowerCase();

      const matchesSearch =
        !q ||
        [
          row.po_number,
          row.supplier_name,
          row.requested_by_name,
          row.approved_by_name,
          row.sent_by_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);

      const matchesFilter =
        filter === "all" ||
        (filter === "draft" && status === "draft") ||
        (filter === "awaiting" && status === "pending_approval") ||
        (filter === "approved" && status === "approved") ||
        (filter === "sent" && status === "sent") ||
        (filter === "closed" &&
          (status === "grn_created" || status === "closed"));

      return matchesSearch && matchesFilter;
    });
  }, [rows, search, filter]);

  const approvePo = async (e, id) => {
    e.stopPropagation();

    try {
      setActionId(id);
      await api.put(`/purchase-orders/${id}/approve`);
      toast.success("Purchase order approved");
      await loadRows();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to approve purchase order");
    } finally {
      setActionId(null);
    }
  };

  const sendPo = async (e, row) => {
    e.stopPropagation();

    try {
      setActionId(row.id);
      const res = await api.put(`/purchase-orders/${row.id}/send`);
      toast.success("Purchase order marked as sent");

      if (res.data?.whatsapp_link) {
        window.open(res.data.whatsapp_link, "_blank", "noopener,noreferrer");
      } else if (res.data?.email_link) {
        window.open(res.data.email_link, "_blank", "noopener,noreferrer");
      }

      await loadRows();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to send purchase order");
    } finally {
      setActionId(null);
    }
  };

  return (
    <>
      <div className="notice-banner notice-success">
        <span>📋</span>
        <span>Create, approve, send, and track purchase orders from this page.</span>
      </div>

      <div
        className="fb"
        style={{
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 16,
          paddingLeft: 4,
          paddingRight: 4,
        }}
      >
        <div
          className="fb"
          style={{
            marginBottom: 0,
            gap: 10,
            flex: "1 1 auto",
            minWidth: 0,
            flexWrap: "wrap",
          }}
        >
          <div className="search-field" style={{ minWidth: 260 }}>
            <Search size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search POs..."
            />
          </div>

          <button
            type="button"
            className={`ft ${filter === "all" ? "on" : ""}`}
            onClick={() => setFilter("all")}
          >
            All ({counts.all})
          </button>

          <button
            type="button"
            className={`ft ${filter === "awaiting" ? "on" : ""}`}
            onClick={() => setFilter("awaiting")}
          >
            Awaiting Approval ({counts.awaiting})
          </button>

          <button
            type="button"
            className={`ft ${filter === "approved" ? "on" : ""}`}
            onClick={() => setFilter("approved")}
          >
            Approved ({counts.approved})
          </button>

          <button
            type="button"
            className={`ft ${filter === "sent" ? "on" : ""}`}
            onClick={() => setFilter("sent")}
          >
            Sent ({counts.sent})
          </button>

          <button
            type="button"
            className={`ft ${filter === "closed" ? "on" : ""}`}
            onClick={() => setFilter("closed")}
          >
            Closed ({counts.closed})
          </button>
        </div>

        <div
          className="fb"
          style={{
            marginBottom: 0,
            marginLeft: "auto",
            flexShrink: 0,
            gap: 10,
          }}
        >
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate("/purchase-orders/add")}
          >
            <Plus size={16} /> Create PO
          </button>
        </div>
      </div>

      <div className="content-card">

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>PO NUMBER</th>
                <th>SUPPLIER</th>
                <th>DATE PLACED</th>
                <th>REQUIRED BY</th>
                <th>ITEMS</th>
                <th>TOTAL</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="empty-row">
                    Loading purchase orders...
                  </td>
                </tr>
              ) : filtered.length ? (
                filtered.map((row) => {
                  const status = String(row.status || "draft").toLowerCase();

                  return (
                    <tr
                      key={row.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => navigate(`/purchase-orders/${row.id}`)}
                    >
                      <td className="code-cell">{row.po_number}</td>
                      <td className="strong-cell">{row.supplier_name || "—"}</td>
                      <td>{fmtDate(row.order_date || row.created_at)}</td>
                      <td>{fmtDate(row.expected_date)}</td>
                      <td>{Number(row.item_count || 0)}</td>
                      <td>{formatMoney(row.total_amount)}</td>
                      <td>
                        <span className={statusClass(row.status)}>
                          {statusLabel(row.status)}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <Link
                            to={`/purchase-orders/${row.id}`}
                            className="table-icon-btn"
                            title="View PO"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Eye size={15} />
                          </Link>

                          {canApprove &&
                          (status === "pending_approval" || status === "draft") ? (
                            <button
                              type="button"
                              className="table-icon-btn"
                              title="Approve PO"
                              onClick={(e) => approvePo(e, row.id)}
                              disabled={actionId === row.id}
                            >
                              <CheckCheck size={15} />
                            </button>
                          ) : null}

                          {canSend && status === "approved" ? (
                            <button
                              type="button"
                              className="table-icon-btn"
                              title="Send to supplier"
                              onClick={(e) => sendPo(e, row)}
                              disabled={actionId === row.id}
                            >
                              <Send size={15} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="empty-row">
                    No purchase orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}