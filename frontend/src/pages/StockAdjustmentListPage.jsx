import { useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const fmtDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
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
      result = rows.filter((row) => String(row.adjustment_type || "").toUpperCase() === "IN");
    } else if (tab === "Decrease") {
      result = rows.filter((row) => String(row.adjustment_type || "").toUpperCase() === "OUT");
    }

    const q = search.trim().toLowerCase();

    if (q) {
      result = result.filter((row) =>
        [
          row.item_code,
          row.item_name,
          row.batch_code,
          row.adjustment_type,
          row.reason,
          row.notes,
          row.created_by_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    return result;
  }, [rows, tab, search]);

  return (
    <>
      <div className="ib ib-i">
        <span>⚖️</span>
        <div>
          Stock adjustment history. Every increase or decrease updates the selected batch and the
          inventory snapshot.
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

        <div className="sw" style={{ marginLeft: "auto" }}>
          <input
            className="si"
            placeholder="Search adjustments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
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
                <td colSpan="8">Loading...</td>
              </tr>
            ) : filteredRows.length ? (
              filteredRows.map((row) => (
                <tr key={row.id}>
                  <td>{fmtDateTime(row.created_at)}</td>
                  <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{row.item_code}</td>
                  <td style={{ fontWeight: 600 }}>{row.item_name}</td>
                  <td>{row.batch_code}</td>
                  <td>
                    <span className={`badge ${String(row.adjustment_type || "").toUpperCase() === "IN" ? "bg-g" : "bg-r"}`}>
                      {String(row.adjustment_type || "").toUpperCase() === "IN" ? "Increase" : "Decrease"}
                    </span>
                  </td>
                  <td>{Number(row.quantity || 0)}</td>
                  <td>{row.reason || "—"}</td>
                  <td>{row.created_by_name || "—"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8">No stock adjustments found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default StockAdjustmentListPage;