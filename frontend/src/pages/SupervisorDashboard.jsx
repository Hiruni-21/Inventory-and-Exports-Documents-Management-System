import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

const fmtDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-CA");
};

const SupervisorDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [grnList, setGrnList] = useState([]);
  const [wastage, setWastage] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [expiry, setExpiry] = useState([]);
  const [adjustments, setAdjustments] = useState([]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const [grnRes, wastageRes, lowStockRes, expiryRes, adjustmentsRes] =
          await Promise.all([
            api.get("/grn"),
            api.get("/wastage"),
            api.get("/inventory/low-stock"),
            api.get("/inventory/expiry", { params: { days: 7 } }),
            api.get("/stock-adjustments"),
          ]);

        setGrnList(Array.isArray(grnRes.data) ? grnRes.data : []);
        setWastage(Array.isArray(wastageRes.data) ? wastageRes.data : []);
        setLowStock(Array.isArray(lowStockRes.data) ? lowStockRes.data : []);
        setExpiry(Array.isArray(expiryRes.data) ? expiryRes.data : []);
        setAdjustments(Array.isArray(adjustmentsRes.data) ? adjustmentsRes.data : []);
      } catch (err) {
        console.error(err);
        setError(err?.response?.data?.message || "Failed to load supervisor dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  const todaysGoodsReceived = useMemo(
    () => grnList.filter((row) => String(row.received_date || "").slice(0, 10) === today).length,
    [grnList, today]
  );

  const wastageRecords = useMemo(() => wastage.length, [wastage]);
  const lowStockAlerts = useMemo(() => lowStock.length, [lowStock]);
  const stockCountVariances = useMemo(() => {
    return adjustments.filter((row) => {
      const reason = String(row.reason || "").toLowerCase();
      const notes = String(row.notes || "").toLowerCase();
      return reason.includes("physical stock count") || notes.includes("physical stock count");
    }).length;
  }, [adjustments]);

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
          <div>Loading supervisor dashboard...</div>
        </div>
      ) : (
        <>
          <div className="krow k4">
            <div className="kc g">
              <span className="ki">📥</span>
              <div className="kv">{todaysGoodsReceived}</div>
              <div className="kl">Today’s Goods Received</div>
            </div>

            <div className="kc r">
              <span className="ki">🗑</span>
              <div className="kv">{wastageRecords}</div>
              <div className="kl">Wastage Records</div>
            </div>

            <div className="kc a">
              <span className="ki">⚠️</span>
              <div className="kv">{lowStockAlerts}</div>
              <div className="kl">Low Stock Alerts</div>
            </div>

            <div className="kc b">
              <span className="ki">📋</span>
              <div className="kv">{stockCountVariances}</div>
              <div className="kl">Physical Count Variances</div>
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
                  {expiry.slice(0, 5).length ? (
                    expiry.slice(0, 5).map((row) => (
                      <tr key={row.id}>
                        <td style={{ fontWeight: 600 }}>{row.name || row.item_name}</td>
                        <td>{row.batch_code || row.batch_number}</td>
                        <td>
                          <span className={`badge ${Number(row.days_left || 0) <= 3 ? "bg-r" : "bg-a"}`}>
                            {Number(row.days_left || 0)}d
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
                        <td style={{ fontWeight: 600 }}>{row.item_name}</td>
                        <td>{row.batch_code}</td>
                        <td>{Number(row.quantity || 0)}</td>
                        <td>{fmtDate(row.created_at)}</td>
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
        </>
      )}
    </>
  );
};

export default SupervisorDashboard;