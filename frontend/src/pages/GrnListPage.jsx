import { useEffect, useMemo, useState } from "react";
import { FolderOpen, Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const fmtDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-CA");
};

const monthKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${date.getMonth()}`;
};

const statusLabel = (value) => {
  const text = String(value || "received").toLowerCase();
  if (text === "pending_verification") return "Pending Verify";
  if (text === "verified") return "Verified";
  return "Received";
};

const badgeClass = (value) => {
  const text = String(value || "received").toLowerCase();
  if (text === "pending_verification") return "badge bg-a";
  if (text === "verified") return "badge bg-b";
  return "badge bg-g";
};

export default function GrnListPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState("this");

  const loadRows = async () => {
    try {
      setLoading(true);
      const res = await api.get("/grn");
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load GRNs");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${now.getMonth()}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = `${lastMonthDate.getFullYear()}-${lastMonthDate.getMonth()}`;

    return rows.filter((row) => {
      const textMatch =
        q === ""
          ? true
          : [
              row.grn_number,
              row.po_number,
              row.supplier_name,
              row.received_by_name,
              row.verified_by_name,
              row.status,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(q);

      const rowMonth = monthKey(row.received_date);

      const periodMatch =
        periodFilter === "history"
          ? true
          : periodFilter === "last"
          ? rowMonth === lastMonth
          : rowMonth === thisMonth;

      return textMatch && periodMatch;
    });
  }, [rows, search, periodFilter]);

  return (
    <>
      <div className="notice-banner notice-success">
        <span>
          Goods Receiving is now backend-connected. GRNs with high variance wait for Ops
          verification before stock is updated.
        </span>
      </div>

      <div className="fb grn-toolbar-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div className="fb grn-toolbar-left" style={{ marginBottom: 0, flexWrap: "wrap" }}>
          <button
            type="button"
            className={`ft ${periodFilter === "this" ? "on" : ""}`}
            onClick={() => setPeriodFilter("this")}
          >
            This Month
          </button>

          <button
            type="button"
            className={`ft ${periodFilter === "last" ? "on" : ""}`}
            onClick={() => setPeriodFilter("last")}
          >
            Last Month
          </button>

          <button
            type="button"
            className={`ft ${periodFilter === "history" ? "on" : ""}`}
            onClick={() => setPeriodFilter("history")}
          >
            <FolderOpen size={14} /> GRN History
          </button>

          <div className="search-field" style={{ minWidth: 280 }}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Search GRNs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <button
          type="button"
          className="btn btn-medium-green"
          onClick={() => navigate("/grn/add")}
        >
          <Plus size={16} /> New GRN
        </button>
      </div>

      <div className="content-card">
        <div className="card-header-row">
          <h3>Goods Receiving Notes</h3>
          <span className="count-pill">{filteredRows.length} GRNs</span>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>GRN NUMBER</th>
                <th>RECEIVED DATE</th>
                <th>PO NUMBER</th>
                <th>SUPPLIER</th>
                <th>ITEMS</th>
                <th>RECEIVED QTY</th>
                <th>STATUS</th>
                <th>CREATED BY</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="empty-row">
                    Loading GRNs...
                  </td>
                </tr>
              ) : filteredRows.length ? (
                filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate(`/grn/${row.id}`)}
                  >
                    <td className="code-cell">{row.grn_number}</td>
                    <td>{fmtDate(row.received_date)}</td>
                    <td>{row.po_number}</td>
                    <td className="strong-cell">{row.supplier_name}</td>
                    <td>{Number(row.item_count || 0)}</td>
                    <td>{Number(row.total_received_qty || 0).toFixed(2)}</td>
                    <td>
                      <span className={badgeClass(row.status)}>
                        {statusLabel(row.status)}
                      </span>
                    </td>
                    <td>{row.created_by_name || row.received_by_name || "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="empty-row">
                    No GRNs found
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