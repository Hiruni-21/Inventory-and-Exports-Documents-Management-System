import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-CA");
};

const getDaysLeft = (value) => {
  if (!value) return null;
  const expiryDate = new Date(value);
  if (Number.isNaN(expiryDate.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiryDate.setHours(0, 0, 0, 0);

  return Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const getArray = async (url, options) => {
  try {
    const res = await api.get(url, options);
    return Array.isArray(res.data) ? res.data : [];
  } catch {
    return [];
  }
};

const SupervisorDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [grnList, setGrnList] = useState([]);
  const [wastage, setWastage] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [expiry, setExpiry] = useState([]);
  const [adjustments, setAdjustments] = useState([]);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);

      const [grnData, wastageData, lowStockData, expiryData, adjustmentsData] = await Promise.all([
        getArray("/grn"),
        getArray("/wastage"),
        getArray("/inventory/low-stock"),
        getArray("/inventory/expiry", { params: { days: 14 } }),
        getArray("/stock-adjustments"),
      ]);

      setGrnList(grnData);
      setWastage(wastageData);
      setLowStock(lowStockData);
      setExpiry(expiryData);
      setAdjustments(adjustmentsData);
      setLoading(false);
    };

    loadDashboard();
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  const todaysGoodsReceived = useMemo(
    () => grnList.filter((row) => String(row.received_date || "").slice(0, 10) === today).length,
    [grnList, today]
  );

  const lowStockAlerts = lowStock.length;
  const wastageRecords = wastage.length;

  const stockCountVariances = useMemo(
    () =>
      adjustments.filter((row) => {
        const reason = String(row.reason || "").toLowerCase();
        const notes = String(row.notes || "").toLowerCase();
        const type = String(row.adjustment_type || "").toLowerCase();
        return (
          reason.includes("physical stock count") ||
          notes.includes("physical stock count") ||
          type === "stock_count"
        );
      }).length,
    [adjustments]
  );

  const expiryRows = useMemo(
    () =>
      [...expiry]
        .map((row) => ({ ...row, days_left: getDaysLeft(row.expiry_date) }))
        .sort((a, b) => Number(a.days_left ?? 9999) - Number(b.days_left ?? 9999))
        .slice(0, 5),
    [expiry]
  );

  const recentCountAdjustments = useMemo(
    () =>
      adjustments
        .filter((row) => {
          const reason = String(row.reason || "").toLowerCase();
          const notes = String(row.notes || "").toLowerCase();
          const type = String(row.adjustment_type || "").toLowerCase();
          return (
            reason.includes("physical stock count") ||
            notes.includes("physical stock count") ||
            type === "stock_count"
          );
        })
        .slice(0, 4),
    [adjustments]
  );

  return (
    <>
      {loading ? (
        <div className="ib ib-i">
          <div>Loading supervisor dashboard...</div>
        </div>
      ) : (
        <>
          <div className="krow k4">
            <div className="kc g">
              <div className="kv">{todaysGoodsReceived}</div>
              <div className="kl">Today&apos;s Goods Received</div>
            </div>

            <div className="kc r">
              <div className="kv">{wastageRecords}</div>
              <div className="kl">Wastage Records</div>
            </div>

            <div className="kc a">
              <div className="kv">{lowStockAlerts}</div>
              <div className="kl">Low Stock Alerts</div>
            </div>

            <div className="kc b">
              <div className="kv">{stockCountVariances}</div>
              <div className="kl">Physical Count Variances</div>
            </div>
          </div>

          <div className="g2">
            <div className="tw">
              <div className="tw-h">
                <h3>Expiry Priority</h3>
                <Link to="/inventory/expiry" className="btn btn-s btn-xs">
                  View All
                </Link>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>ITEM</th>
                    <th>BATCH</th>
                    <th>DAYS LEFT</th>
                  </tr>
                </thead>
                <tbody>
                  {expiryRows.length ? (
                    expiryRows.map((row) => (
                      <tr key={row.id}>
                        <td style={{ fontWeight: 600 }}>{row.name || row.item_name}</td>
                        <td>{row.batch_code || row.batch_number}</td>
                        <td>
                          <span className={`badge ${Number(row.days_left || 0) <= 3 ? "bg-r" : "bg-a"}`}>
                            {row.days_left ?? "—"}d
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3">No expiry alerts</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="tw">
              <div className="tw-h">
                <h3>Recent Wastage</h3>
                <Link to="/wastage" className="btn btn-s btn-xs">
                  View All
                </Link>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>ITEM</th>
                    <th>BATCH</th>
                    <th>QTY</th>
                    <th>DATE</th>
                  </tr>
                </thead>
                <tbody>
                  {wastage.slice(0, 5).length ? (
                    wastage.slice(0, 5).map((row) => (
                      <tr key={row.id}>
                        <td style={{ fontWeight: 600 }}>{row.item_name || "—"}</td>
                        <td>{row.batch_code || "—"}</td>
                        <td>{Number(row.quantity || row.qty || 0)}</td>
                        <td>{formatDate(row.created_at || row.wastage_date)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4">No wastage records</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="g2">
            <div className="cc">
              <h3>Low Stock Watch</h3>
              <p>Notify operations for urgent reorders</p>

              {lowStock.slice(0, 4).length ? (
                lowStock.slice(0, 4).map((row, index) => (
                  <Link
                    key={row.item_id || row.id}
                    to="/inventory/low-stock"
                    style={{
                      display: "block",
                      textDecoration: "none",
                      padding: "8px 0",
                      borderBottom: index === 3 ? "none" : "1px solid var(--border)",
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--g900)" }}>
                      {row.name || row.item_name}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>
                      {Number(row.qty_available || row.qty_on_hand || 0)} {row.unit || ""} available · reorder at {Number(row.reorder_level || 0)} {row.unit || ""}
                    </div>
                  </Link>
                ))
              ) : (
                <div style={{ fontSize: 12, color: "var(--text3)" }}>No low stock alerts</div>
              )}
            </div>

            <div className="cc">
              <h3>Recent Count Adjustments</h3>
              <p>Physical stock count corrections</p>

              {recentCountAdjustments.length ? (
                recentCountAdjustments.map((row, index) => (
                  <Link
                    key={row.id}
                    to="/stock-adjustments"
                    style={{
                      display: "block",
                      textDecoration: "none",
                      padding: "8px 0",
                      borderBottom: index === recentCountAdjustments.length - 1 ? "none" : "1px solid var(--border)",
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--g900)" }}>
                      {row.item_name || "Adjustment"}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>
                      {String(row.adjustment_type || "").toLowerCase() === "increase" ? "Increase" : "Decrease"} · {Number(row.quantity || row.adjustment_qty || 0)} · {row.reason || "Physical stock count"}
                    </div>
                  </Link>
                ))
              ) : (
                <div style={{ fontSize: 12, color: "var(--text3)" }}>No recent count adjustments</div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default SupervisorDashboard;