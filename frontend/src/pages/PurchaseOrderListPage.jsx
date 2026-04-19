import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const money = (value) =>
  Number(value || 0).toLocaleString("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-CA");
};

const normalizeStatus = (value) => {
  const text = String(value || "draft").toLowerCase();
  if (text === "pending_approval") return "pending_approval";
  if (text === "approved") return "approved";
  if (text === "sent" || text === "sent_to_supplier") return "sent";
  if (text === "closed") return "closed";
  return "draft";
};

const statusLabel = (value) => {
  const text = normalizeStatus(value);
  if (text === "pending_approval") return "Awaiting Approval";
  if (text === "approved") return "Approved";
  if (text === "sent") return "Sent to Supplier";
  if (text === "closed") return "Closed";
  return "Draft";
};

const statusClass = (value) => {
  const text = normalizeStatus(value);
  if (text === "pending_approval") return "badge bg-a";
  if (text === "approved") return "badge bg-b";
  if (text === "sent") return "badge bg-g";
  if (text === "closed") return "badge";
  return "badge";
};

const normalizeOrder = (row = {}) => ({
  id: Number(row.id || 0),
  po_number: row.po_number || row.poNumber || "—",
  supplier_name: row.supplier_name || row.supplier?.supplier_name || "—",
  order_date: row.order_date || row.date_placed || row.created_at || "",
  required_by: row.required_by || "",
  item_count: Number(row.item_count || row.items || 0),
  total_amount: Number(row.total_amount || row.total || 0),
  status: normalizeStatus(row.status),
});

export default function PurchaseOrderListPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadRows = async () => {
    try {
      setLoading(true);
      const res = await api.get("/purchase-orders");
      const list = Array.isArray(res.data) ? res.data.map(normalizeOrder) : [];
      setRows(list);
    } catch (err) {
      console.error(err);
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
    return {
      all: rows.length,
      pending_approval: rows.filter((row) => row.status === "pending_approval").length,
      approved: rows.filter((row) => row.status === "approved").length,
      sent: rows.filter((row) => row.status === "sent").length,
      closed: rows.filter((row) => row.status === "closed").length,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        q === ""
          ? true
          : [row.po_number, row.supplier_name, row.order_date, row.required_by, row.status]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(q);

      const matchesStatus = statusFilter === "all" ? true : row.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  return (
    <>
      <div className="notice-banner notice-success">
        <span>Create, approve, send, and track purchase orders from this page.</span>
      </div>

      <div className="fb" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div className="fb" style={{ marginBottom: 0 }}>
          <div className="search-field" style={{ minWidth: 270 }}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Search POs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            type="button"
            className={`ft ${statusFilter === "all" ? "on" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            All ({counts.all})
          </button>

          <button
            type="button"
            className={`ft ${statusFilter === "pending_approval" ? "on" : ""}`}
            onClick={() => setStatusFilter("pending_approval")}
          >
            Awaiting Approval ({counts.pending_approval})
          </button>

          <button
            type="button"
            className={`ft ${statusFilter === "approved" ? "on" : ""}`}
            onClick={() => setStatusFilter("approved")}
          >
            Approved ({counts.approved})
          </button>

          <button
            type="button"
            className={`ft ${statusFilter === "sent" ? "on" : ""}`}
            onClick={() => setStatusFilter("sent")}
          >
            Sent ({counts.sent})
          </button>

          <button
            type="button"
            className={`ft ${statusFilter === "closed" ? "on" : ""}`}
            onClick={() => setStatusFilter("closed")}
          >
            Closed ({counts.closed})
          </button>
        </div>

        <button
          type="button"
          className="btn btn-medium-green"
          onClick={() => navigate("/purchase-orders/add")}
        >
          <Plus size={16} /> Create PO
        </button>
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
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="empty-row">
                    Loading purchase orders...
                  </td>
                </tr>
              ) : filteredRows.length ? (
                filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate(`/purchase-orders/${row.id}`)}
                  >
                    <td className="code-cell">{row.po_number}</td>
                    <td className="strong-cell">{row.supplier_name}</td>
                    <td>{formatDate(row.order_date)}</td>
                    <td>{formatDate(row.required_by)}</td>
                    <td>{row.item_count}</td>
                    <td>{money(row.total_amount)}</td>
                    <td>
                      <span className={statusClass(row.status)}>{statusLabel(row.status)}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="empty-row">
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