import { useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const fmtMoney = (value) => `LKR ${Number(value || 0).toLocaleString()}`;

const StockValuationPage = () => {
  const toast = useToast();

  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPage = async () => {
    try {
      setLoading(true);

      const [summaryRes, inventoryRes] = await Promise.all([
        api.get("/inventory/valuation"),
        api.get("/inventory"),
      ]);

      setSummary(summaryRes.data || null);
      setRows(Array.isArray(inventoryRes.data) ? inventoryRes.data : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load stock valuation");
      setSummary(null);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => Number(b.total_value || 0) - Number(a.total_value || 0));
  }, [rows]);

  const totalValue = Number(summary?.total_inventory_value || 0);

  return (
    <>
      <div className="krow k4">
        <div className="kc g">
          <span className="ki">💰</span>
          <div className="kv">{fmtMoney(summary?.total_inventory_value || 0)}</div>
          <div className="kl">Total Stock Value</div>
        </div>

        <div className="kc a">
          <span className="ki">📦</span>
          <div className="kv">{Number(summary?.total_items || 0)}</div>
          <div className="kl">Tracked Items</div>
        </div>

        <div className="kc b">
          <span className="ki">📊</span>
          <div className="kv">{Number(summary?.total_qty_on_hand || 0)}</div>
          <div className="kl">Qty On Hand</div>
        </div>

        <div className="kc r">
          <span className="ki">✅</span>
          <div className="kv">{Number(summary?.total_qty_available || 0)}</div>
          <div className="kl">Qty Available</div>
        </div>
      </div>

      <div className="tw">
        <div className="tw-h">
          <h3>Stock Valuation by Item</h3>
          <span style={{ fontSize: 11, color: "var(--text3)" }}>Based on current inventory value</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>ITEM</th>
              <th>QTY AVAILABLE</th>
              <th>UNIT</th>
              <th>AVG UNIT COST</th>
              <th>TOTAL VALUE</th>
              <th>% OF TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6">Loading...</td>
              </tr>
            ) : sortedRows.length ? (
              <>
                {sortedRows.map((row) => {
                  const value = Number(row.total_value || 0);
                  const share = totalValue > 0 ? Math.round((value / totalValue) * 100) : 0;

                  return (
                    <tr key={row.item_id || row.id}>
                      <td style={{ fontWeight: 600 }}>{row.name || row.item_name}</td>
                      <td>{Number(row.qty_available || 0)}</td>
                      <td>{row.unit}</td>
                      <td>{fmtMoney(row.avg_unit_cost || row.unit_cost || 0)}</td>
                      <td style={{ fontWeight: 700, color: "var(--g800)" }}>{fmtMoney(value)}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div
                            style={{
                              flex: 1,
                              height: 6,
                              background: "var(--border)",
                              borderRadius: 3,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                background: "var(--g400)",
                                width: `${share}%`,
                              }}
                            ></div>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, width: 28 }}>{share}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                <tr style={{ background: "var(--g100)" }}>
                  <td colSpan="4" style={{ fontWeight: 700, fontSize: 13, textAlign: "right" }}>
                    Total
                  </td>
                  <td colSpan="2" style={{ fontWeight: 800, fontSize: 16, color: "var(--g800)" }}>
                    {fmtMoney(totalValue)}
                  </td>
                </tr>
              </>
            ) : (
              <tr>
                <td colSpan="6">No valuation data found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default StockValuationPage;