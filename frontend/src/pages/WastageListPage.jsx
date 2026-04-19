import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
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

export default function WastageListPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadRows = async () => {
    try {
      setLoading(true);
      const res = await api.get("/wastage");
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load wastage records");
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

    return rows.filter((row) =>
      q === ""
        ? true
        : [row.wastage_number, row.reason, row.reported_by_name]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q)
    );
  }, [rows, search]);

  return (
    <>
      <div className="notice-banner notice-success">
        <span>Record wastage with real photos and save wastage records to the backend from this page.</span>
      </div>

      <div className="fb" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div className="search-field" style={{ minWidth: 280 }}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Search wastage records..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button type="button" className="btn btn-primary" onClick={() => navigate("/wastage/add")}>
          <Plus size={16} /> Record Wastage
        </button>
      </div>

      <div className="content-card">
        <div className="card-header-row">
          <h3>Wastage Records</h3>
          <span className="count-pill">{filteredRows.length} records</span>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>WASTAGE NO</th>
                <th>DATE</th>
                <th>REASON</th>
                <th>ITEMS</th>
                <th>TOTAL QTY</th>
                <th>AMOUNT</th>
                <th>REPORTED BY</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="empty-row">Loading wastage records...</td></tr>
              ) : filteredRows.length ? (
                filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate(`/wastage/${row.id}`)}
                  >
                    <td className="code-cell">{row.wastage_number}</td>
                    <td>{formatDate(row.wastage_date)}</td>
                    <td>{row.reason || "—"}</td>
                    <td>{Number(row.item_count || 0)}</td>
                    <td>{Number(row.total_qty || 0).toFixed(2)}</td>
                    <td>{money(row.total_amount)}</td>
                    <td>{row.reported_by_name || "—"}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="7" className="empty-row">No wastage records found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}