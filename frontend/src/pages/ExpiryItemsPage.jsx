import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const ExpiryItemsPage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("All");

  const loadRows = async () => {
    try {
      setLoading(true);
      const res = await api.get("/inventory/expiry", { params: { days: 14 } });
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load expiry items");
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

    if (tab === "Critical") {
      result = rows.filter((row) => Number(row.days_left || 0) <= 3);
    } else if (tab === "Warning") {
      result = rows.filter(
        (row) => Number(row.days_left || 0) > 3 && Number(row.days_left || 0) <= 7
      );
    } else if (tab === "Safe") {
      result = rows.filter((row) => Number(row.days_left || 0) > 7);
    }

    return [...result].sort((a, b) => Number(a.days_left || 999) - Number(b.days_left || 999));
  }, [rows, tab]);

  const priorityLabel = (index) => {
    if (index === 0) return "#1 Use Now";
    if (index === 1) return "#2 Use Next";
    return `#${index + 1}`;
  };

  const priorityClass = (row) => {
    const days = Number(row.days_left || 0);
    if (days <= 3) return "bg-r";
    if (days <= 7) return "bg-a";
    return "bg-g";
  };

  return (
    <>
      <div className="ib ib-d">
        <span>⏱</span>
        <div>
          FEFO page. These batches are expiring within 14 days and should be dispatched before
          newer stock.
        </div>
      </div>

      <div className="fb">
        <button type="button" className={`ft ${tab === "All" ? "on" : ""}`} onClick={() => setTab("All")}>
          All Batches
        </button>
        <button
          type="button"
          className={`ft ${tab === "Critical" ? "on" : ""}`}
          onClick={() => setTab("Critical")}
        >
          🔴 Critical (≤3d)
        </button>
        <button
          type="button"
          className={`ft ${tab === "Warning" ? "on" : ""}`}
          onClick={() => setTab("Warning")}
        >
          🟡 Warning (≤7d)
        </button>
        <button type="button" className={`ft ${tab === "Safe" ? "on" : ""}`} onClick={() => setTab("Safe")}>
          ✅ Safe
        </button>
      </div>

      <div className="tw">
        <div className="tw-h">
          <h3>Expiry Items — All Active Batches</h3>
          <span style={{ fontSize: 11, color: "var(--text3)" }}>FEFO applied automatically</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>BATCH NO.</th>
              <th>ITEM</th>
              <th>QTY IN STOCK</th>
              <th>RECEIVED</th>
              <th>EXPIRY DATE</th>
              <th>DAYS LEFT</th>
              <th>FEFO PRIORITY</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8">Loading...</td>
              </tr>
            ) : filteredRows.length ? (
              filteredRows.map((row, index) => {
                const days = Number(row.days_left || 0);
                const color =
                  days <= 3 ? "var(--d)" : days <= 7 ? "var(--w)" : "var(--s)";

                return (
                  <tr key={row.id}>
                    <td style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "var(--g800)" }}>
                      {row.batch_code || row.batch_number}
                    </td>
                    <td style={{ fontWeight: 600 }}>{row.name || row.item_name}</td>
                    <td>{row.qty_remaining || row.available_quantity || 0} {row.unit}</td>
                    <td style={{ fontSize: 11 }}>{String(row.received_date || "").slice(0, 10)}</td>
                    <td style={{ fontSize: 11 }}>{String(row.expiry_date || "").slice(0, 10)}</td>
                    <td>
                      <span style={{ fontSize: 18, fontWeight: 800, color }}>{days}d</span>
                    </td>
                    <td>
                      <span className={`badge ${priorityClass(row)}`}>{priorityLabel(index)}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          className="btn btn-s btn-xs"
                          onClick={() => navigate(`/dispatch/local`)}
                        >
                          📦 Plan Dispatch
                        </button>
                        <button
                          type="button"
                          className="btn btn-s btn-xs"
                          onClick={() =>
                            navigate(`/stock-adjustments/add?itemId=${row.item_id}`)
                          }
                        >
                          ⚖️ Adjust
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="8">No expiring batches found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default ExpiryItemsPage;