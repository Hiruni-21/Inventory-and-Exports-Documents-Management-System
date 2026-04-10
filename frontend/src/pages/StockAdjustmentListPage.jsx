import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const fmtDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
};

const normalizeType = (value) => {
  const raw = String(value || "").toLowerCase();
  if (["in", "increase"].includes(raw)) return "increase";
  if (["out", "decrease"].includes(raw)) return "decrease";
  if (["stock_count", "variance"].includes(raw)) return raw;
  return raw;
};

const typeBadge = (value) => {
  const type = normalizeType(value);
  if (type === "increase") return { cls: "bg-g", label: "Increase" };
  if (type === "decrease") return { cls: "bg-r", label: "Decrease" };
  if (type === "stock_count") return { cls: "bg-b", label: "Stock Count" };
  return { cls: "bg-a", label: "Variance" };
};

const StockAdjustmentListPage = () => {
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("All");

  const loadRows = async () => {
    try {
      setLoading(true);
      const res = await api.get("/stock-adjustments");
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load stock adjustments");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  const filteredRows = useMemo(() => {
    let result = rows;

    if (tab === "Increase") {
      result = rows.filter((row) => normalizeType(row.adjustment_type) === "increase");
    } else if (tab === "Decrease") {
      result = rows.filter((row) => normalizeType(row.adjustment_type) === "decrease");
    } else if (tab === "Stock Count") {
      result = rows.filter((row) => normalizeType(row.adjustment_type) === "stock_count");
    }

    const q = search.trim().toLowerCase();
    if (!q) return result;

    return result.filter((row) =>
      [
        row.adjustment_number,
        row.item_code,
        row.item_name,
        row.batch_code,
        row.reason,
        row.notes,
        row.created_by_name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [rows, tab, search]);

  return (
    <>
      <div className="ib ib-i">
        <span>📋</span>
        <div>
          Stock adjustment history. This keeps the existing prototype layout and only stabilizes the
          data source and type handling.
        </div>
      </div>

      <div className="fb">
        <button type="button" className={`ft ${tab === "All" ? "on" : ""}`} onClick={() => setTab("All")}>
          All
        </button>
        <button
          type="button"
          className={`ft ${tab === "Increase" ? "on" : ""}`}
          onClick={() => setTab("Increase")}
        >
          Increase
        </button>
        <button
          type="button"
          className={`ft ${tab === "Decrease" ? "on" : ""}`}
          onClick={() => setTab("Decrease")}
        >
          Decrease
        </button>
        <button
          type="button"
          className={`ft ${tab === "Stock Count" ? "on" : ""}`}
          onClick={() => setTab("Stock Count")}
        >
          Stock Count
        </button>

        <div className="sw" style={{ marginLeft: "auto" }}>
          <input
            className="si"
            placeholder="Search adjustments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Link to="/stock-adjustments/add" className="btn btn-p btn-sm">
          + New Adjustment
        </Link>
      </div>

      <div className="tw">
        <div className="tw-h">
          <h3>Stock Adjustments</h3>
          <span className="badge bg-b">{filteredRows.length} records</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>DATE</th>
              <th>ADJ. NO.</th>
              <th>ITEM CODE</th>
              <th>ITEM NAME</th>
              <th>BATCH</th>
              <th>TYPE</th>
              <th>QTY</th>
              <th>REASON</th>
              <th>CREATED BY</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9">Loading...</td>
              </tr>
            ) : filteredRows.length ? (
              filteredRows.map((row) => {
                const badge = typeBadge(row.adjustment_type);
                return (
                  <tr key={row.id}>
                    <td>{fmtDateTime(row.created_at)}</td>
                    <td style={{ fontFamily: "monospace", fontWeight: 700 }}>
                      {row.adjustment_number || "—"}
                    </td>
                    <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{row.item_code}</td>
                    <td style={{ fontWeight: 600 }}>{row.item_name}</td>
                    <td>{row.batch_code || "—"}</td>
                    <td>
                      <span className={`badge ${badge.cls}`}>{badge.label}</span>
                    </td>
                    <td>{Number(row.quantity || row.adjustment_qty || 0)}</td>
                    <td>{row.reason || "—"}</td>
                    <td>{row.created_by_name || "—"}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="9">No stock adjustments found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default StockAdjustmentListPage;