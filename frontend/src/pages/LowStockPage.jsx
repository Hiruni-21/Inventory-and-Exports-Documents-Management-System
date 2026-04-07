import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const LowStockPage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadRows = async () => {
    try {
      setLoading(true);
      const res = await api.get("/inventory/low-stock");
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load low stock items");
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

    return rows
      .filter((row) =>
        q === ""
          ? true
          : [
              row.code,
              row.name,
              row.category_name,
              row.type,
              row.unit,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(q)
      )
      .sort((a, b) => Number(b.shortage || 0) - Number(a.shortage || 0));
  }, [rows, search]);

  return (
    <>
      <div className="ib ib-d">
        <span>⚠️</span>
        <div>
          Items currently below reorder level. Use this page to spot shortages fast and jump to
          stock adjustments or the item master.
        </div>
      </div>

      <div className="fb">
        <div className="sw">
          <input
            className="si"
            placeholder="Search low stock items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="tw">
        <div className="tw-h">
          <h3>Items Below Reorder Level</h3>
          <span className="badge bg-r">{filteredRows.length} items</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>ITEM</th>
              <th>CURRENT STOCK</th>
              <th>REORDER LEVEL</th>
              <th>SHORTAGE</th>
              <th>STATUS</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6">Loading...</td>
              </tr>
            ) : filteredRows.length ? (
              filteredRows.map((row) => {
                const qty = Number(row.qty_available || 0);
                const reorder = Number(row.reorder_level || 0);
                const shortage = Math.max(0, Number(row.shortage || 0));
                const critical = qty <= 0 || qty <= reorder * 0.5;

                return (
                  <tr key={row.item_id || row.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: "var(--g900)" }}>{row.name}</div>
                      <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>
                        {row.category_name} · {row.type}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            fontSize: 17,
                            fontWeight: 800,
                            color: critical ? "var(--d)" : "var(--w)",
                          }}
                        >
                          {qty}
                        </span>
                        <div
                          style={{
                            flex: 1,
                            height: 6,
                            background: "var(--border)",
                            borderRadius: 3,
                            overflow: "hidden",
                            minWidth: 60,
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              background: critical ? "var(--d)" : "var(--a500)",
                              width: `${Math.max(
                                0,
                                Math.min(
                                  100,
                                  reorder > 0 ? Math.round((qty / reorder) * 100) : 100
                                )
                              )}%`,
                            }}
                          ></div>
                        </div>
                        <span style={{ fontSize: 11, color: "var(--text3)" }}>{row.unit}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, color: "var(--g900)" }}>
                      {reorder} {row.unit}
                    </td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--d)" }}>
                        Need {shortage} more
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${critical ? "bg-r" : "bg-a"}`}>
                        {critical ? "🔴 Critical" : "🟡 Low"}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-s btn-xs"
                        onClick={() =>
                          navigate(`/stock-adjustments/add?itemId=${row.item_id || row.id}`)
                        }
                      >
                        ⚖️ Adjust
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6">No low stock items found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default LowStockPage;