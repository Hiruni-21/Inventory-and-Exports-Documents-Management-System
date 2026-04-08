import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

const fmtMoney = (value) => `LKR ${Number(value || 0).toLocaleString()}`;

const fmtDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-CA");
};

const fmtDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
};

const ManagerDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [stats, setStats] = useState(null);
  const [valuation, setValuation] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [expiry, setExpiry] = useState([]);
  const [adjustments, setAdjustments] = useState([]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const [statsRes, valuationRes, lowStockRes, expiryRes, adjustmentsRes] =
          await Promise.all([
            api.get("/dashboard/stats"),
            api.get("/inventory/valuation"),
            api.get("/inventory/low-stock"),
            api.get("/inventory/expiry", { params: { days: 7 } }),
            api.get("/stock-adjustments"),
          ]);

        setStats(statsRes.data || {});
        setValuation(valuationRes.data || {});
        setLowStock(Array.isArray(lowStockRes.data) ? lowStockRes.data : []);
        setExpiry(Array.isArray(expiryRes.data) ? expiryRes.data : []);
        setAdjustments(Array.isArray(adjustmentsRes.data) ? adjustmentsRes.data : []);
      } catch (err) {
        console.error(err);
        setError(err?.response?.data?.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const recentAdjustments = useMemo(() => adjustments.slice(0, 5), [adjustments]);
  const expiringSoon = useMemo(() => expiry.slice(0, 5), [expiry]);
  const lowStockPreview = useMemo(() => lowStock.slice(0, 5), [lowStock]);

  return (
    <>
      {error ? (
        <div className="ib ib-d">
          <span>⚠️</span>
          <div>{error}</div>
        </div>
      ) : null}

      {loading ? (
        <div className="ib ib-i">
          <span>⏳</span>
          <div>Loading dashboard...</div>
        </div>
      ) : (
        <>
          <div className="krow k4">
            <div className="kc g">
              <span className="ki">📦</span>
              <div className="kv">{Number(stats?.items || 0)}</div>
              <div className="kl">Active Items</div>
            </div>

            <div className="kc a">
              <span className="ki">🌿</span>
              <div className="kv">{Number(stats?.suppliers || 0)}</div>
              <div className="kl">Active Suppliers</div>
            </div>

            <div className="kc r">
              <span className="ki">⚠️</span>
              <div className="kv">{Number(stats?.lowStock || 0)}</div>
              <div className="kl">Low Stock Alerts</div>
            </div>

            <div className="kc b">
              <span className="ki">💰</span>
              <div className="kv">{fmtMoney(valuation?.total_inventory_value || 0)}</div>
              <div className="kl">Stock Value</div>
            </div>
          </div>

          <div className="krow k4" style={{ marginTop: 16 }}>
            <div className="kc a">
              <span className="ki">🚚</span>
              <div className="kv">{Number(stats?.localDispatch || 0)}</div>
              <div className="kl">Local Dispatches</div>
            </div>

            <div className="kc b">
              <span className="ki">✈️</span>
              <div className="kv">{Number(stats?.globalDispatch || 0)}</div>
              <div className="kl">Global Shipments</div>
            </div>

            <div className="kc r">
              <span className="ki">⏱</span>
              <div className="kv">{expiry.length}</div>
              <div className="kl">Expiring in 7 Days</div>
            </div>

            <div className="kc g">
              <span className="ki">⚖️</span>
              <div className="kv">{adjustments.length}</div>
              <div className="kl">Stock Adjustments</div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginTop: 16,
            }}
          >
            <div className="tw">
              <div className="tw-h">
                <h3>Low Stock Preview</h3>
                <Link to="/inventory/low-stock" className="btn btn-s btn-xs">
                  View All
                </Link>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>ITEM</th>
                    <th>AVAILABLE</th>
                    <th>REORDER</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockPreview.length ? (
                    lowStockPreview.map((row) => (
                      <tr key={row.item_id || row.id}>
                        <td style={{ fontWeight: 600 }}>{row.name || row.item_name}</td>
                        <td>{Number(row.qty_available || 0)} {row.unit}</td>
                        <td>{Number(row.reorder_level || 0)} {row.unit}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3">No low stock items</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="tw">
              <div className="tw-h">
                <h3>Expiry Preview</h3>
                <Link to="/inventory/expiry" className="btn btn-s btn-xs">
                  View All
                </Link>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>ITEM</th>
                    <th>BATCH</th>
                    <th>EXPIRY</th>
                  </tr>
                </thead>
                <tbody>
                  {expiringSoon.length ? (
                    expiringSoon.map((row) => (
                      <tr key={row.id}>
                        <td style={{ fontWeight: 600 }}>{row.name || row.item_name}</td>
                        <td>{row.batch_code || row.batch_number}</td>
                        <td>{fmtDate(row.expiry_date)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3">No batches expiring soon</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="tw" style={{ marginTop: 16 }}>
            <div className="tw-h">
              <h3>Recent Stock Adjustments</h3>
              <Link to="/stock-adjustments" className="btn btn-s btn-xs">
                View All
              </Link>
            </div>

            <table>
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>ITEM</th>
                  <th>BATCH</th>
                  <th>TYPE</th>
                  <th>QTY</th>
                  <th>REASON</th>
                </tr>
              </thead>
              <tbody>
                {recentAdjustments.length ? (
                  recentAdjustments.map((row) => (
                    <tr key={row.id}>
                      <td>{fmtDateTime(row.created_at)}</td>
                      <td style={{ fontWeight: 600 }}>{row.item_name}</td>
                      <td>{row.batch_code}</td>
                      <td>
                        <span className={`badge ${row.adjustment_type === "IN" ? "bg-g" : "bg-r"}`}>
                          {row.adjustment_type === "IN" ? "Increase" : "Decrease"}
                        </span>
                      </td>
                      <td>{Number(row.quantity || 0)}</td>
                      <td>{row.reason || "—"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6">No stock adjustments yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
};

export default ManagerDashboard;