import { useEffect, useMemo, useState } from "react";
import { Mail, Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-CA");
};

const money = (value) =>
  Number(value || 0).toLocaleString("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const monthKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${date.getMonth()}`;
};

export default function ReturnListPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState("this");

  const loadRows = async () => {
    try {
      setLoading(true);
      const res = await api.get("/returns");
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load return notes");
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
              row.return_number,
              row.po_number,
              row.supplier_name,
              row.reason,
              row.status,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(q);

      const rowMonth = monthKey(row.return_date);

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
        <span>Record supplier return notes, upload photos, and send return notes by email from this page.</span>
      </div>

      <div className="fb" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div className="fb" style={{ marginBottom: 0, gap: 12, flexWrap: "wrap" }}>
          <button type="button" className={`ft ${periodFilter === "this" ? "on" : ""}`} onClick={() => setPeriodFilter("this")}>
            This Month
          </button>
          <button type="button" className={`ft ${periodFilter === "last" ? "on" : ""}`} onClick={() => setPeriodFilter("last")}>
            Last Month
          </button>
          <button type="button" className={`ft ${periodFilter === "history" ? "on" : ""}`} onClick={() => setPeriodFilter("history")}>
            Return History
          </button>

          <div className="search-field" style={{ minWidth: 280 }}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Search return notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <button type="button" className="btn btn-primary" onClick={() => navigate("/returns/add")}>
          <Plus size={16} /> New Return
        </button>
      </div>

      <div className="content-card">
        <div className="card-header-row">
          <h3>Return Notes</h3>
          <span className="count-pill">{filteredRows.length} returns</span>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>RETURN NO</th>
                <th>DATE</th>
                <th>PO NUMBER</th>
                <th>SUPPLIER</th>
                <th>ITEMS</th>
                <th>TOTAL QTY</th>
                <th>AMOUNT</th>
                <th>EMAIL</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="empty-row">Loading return notes...</td>
                </tr>
              ) : filteredRows.length ? (
                filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate(`/returns/${row.id}`)}
                  >
                    <td className="code-cell">{row.return_number}</td>
                    <td>{formatDate(row.return_date)}</td>
                    <td>{row.po_number || "—"}</td>
                    <td className="strong-cell">{row.supplier_name}</td>
                    <td>{Number(row.item_count || 0)}</td>
                    <td>{Number(row.total_qty || 0).toFixed(2)}</td>
                    <td>{money(row.total_amount)}</td>
                    <td>
                      {row.email_sent_at ? (
                        <span className="badge bg-b"><Mail size={12} /> Sent</span>
                      ) : (
                        <span className="badge">Draft</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="empty-row">No return notes found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}