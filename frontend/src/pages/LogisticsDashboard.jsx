import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-CA");
};

const normalizeStatus = (value) => String(value || "").trim().toLowerCase();

const getArray = async (url, options) => {
  try {
    const res = await api.get(url, options);
    return Array.isArray(res.data) ? res.data : [];
  } catch {
    return [];
  }
};

const LogisticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [localDispatch, setLocalDispatch] = useState([]);
  const [globalDispatch, setGlobalDispatch] = useState([]);
  const [exportDocs, setExportDocs] = useState([]);
  const [localCustomers, setLocalCustomers] = useState([]);
  const [globalCustomers, setGlobalCustomers] = useState([]);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);

      const [localData, globalData, docsData, localCustomersData, globalCustomersData] =
        await Promise.all([
          getArray("/dispatch"),
          getArray("/dispatch/global"),
          getArray("/export-docs"),
          getArray("/customers", { params: { type: "local" } }),
          getArray("/customers", { params: { type: "global" } }),
        ]);

      setLocalDispatch(localData);
      setGlobalDispatch(globalData);
      setExportDocs(docsData);
      setLocalCustomers(localCustomersData);
      setGlobalCustomers(globalCustomersData);
      setLoading(false);
    };

    loadDashboard();
  }, []);

  const pendingDocs = useMemo(
    () => exportDocs.filter((row) => !Number(row.all_cleared || 0)),
    [exportDocs]
  );

  const clearedShipments = useMemo(
    () => globalDispatch.filter((row) => normalizeStatus(row.status) === "cleared").length,
    [globalDispatch]
  );

  const activeGlobalShipments = useMemo(
    () => globalDispatch.filter((row) => normalizeStatus(row.status) !== "delivered").length,
    [globalDispatch]
  );

  return (
    <>
      {loading ? (
        <div className="ib ib-i">
          <span>⏳</span>
          <div>Loading logistics dashboard...</div>
        </div>
      ) : (
        <>
          <div className="krow k4">
            <div className="kc b">
              <span className="ki">🚚</span>
              <div className="kv">{localDispatch.length}</div>
              <div className="kl">Local Dispatches</div>
            </div>

            <div className="kc a">
              <span className="ki">✈️</span>
              <div className="kv">{activeGlobalShipments}</div>
              <div className="kl">Active Export Shipments</div>
            </div>

            <div className="kc r">
              <span className="ki">📄</span>
              <div className="kv">{pendingDocs.length}</div>
              <div className="kl">Pending Document Sets</div>
            </div>

            <div className="kc g">
              <span className="ki">✅</span>
              <div className="kv">{clearedShipments}</div>
              <div className="kl">Cleared Shipments</div>
            </div>
          </div>

          <div className="krow k4">
            <div className="kc p">
              <span className="ki">🏨</span>
              <div className="kv">{localCustomers.length}</div>
              <div className="kl">Local Customers</div>
            </div>

            <div className="kc p">
              <span className="ki">🌍</span>
              <div className="kv">{globalCustomers.length}</div>
              <div className="kl">Global Customers</div>
            </div>

            <div className="kc a">
              <span className="ki">📦</span>
              <div className="kv">
                {pendingDocs.filter((row) => String(row.packing_list_status || "").toLowerCase() !== "done").length}
              </div>
              <div className="kl">Packing Lists Pending</div>
            </div>

            <div className="kc r">
              <span className="ki">🧾</span>
              <div className="kv">
                {pendingDocs.filter((row) => String(row.commercial_invoice_status || "").toLowerCase() !== "done").length}
              </div>
              <div className="kl">Invoices Pending</div>
            </div>
          </div>

          <div className="g2">
            <div className="tw">
              <div className="tw-h">
                <h3>Recent Local Dispatches</h3>
                <Link to="/dispatch/local" className="btn btn-s btn-xs">
                  View All
                </Link>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Dispatch</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {localDispatch.slice(0, 5).length ? (
                    localDispatch.slice(0, 5).map((row) => (
                      <tr key={row.id}>
                        <td style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--g800)" }}>
                          {row.dispatch_number}
                        </td>
                        <td>{row.client_name || "—"}</td>
                        <td>{formatDate(row.dispatch_date)}</td>
                        <td>
                          <span
                            className={`badge ${
                              normalizeStatus(row.status) === "delivered" ? "bg-g" : "bg-a"
                            }`}
                          >
                            {row.status || "scheduled"}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4">No local dispatches found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="tw">
              <div className="tw-h">
                <h3>Recent Global Shipments</h3>
                <Link to="/dispatch/global" className="btn btn-s btn-xs">
                  View All
                </Link>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Shipment</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Docs</th>
                  </tr>
                </thead>
                <tbody>
                  {globalDispatch.slice(0, 5).length ? (
                    globalDispatch.slice(0, 5).map((row) => (
                      <tr key={row.id}>
                        <td style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--g800)" }}>
                          {row.dispatch_number}
                        </td>
                        <td>{row.customer_name || "—"}</td>
                        <td>{formatDate(row.dispatch_date)}</td>
                        <td>
                          <span className={`badge ${Number(row.docs_done_count || 0) >= Number(row.required_docs_count || 7) ? "bg-g" : "bg-a"}`}>
                            {Number(row.docs_done_count || 0)}/{Number(row.required_docs_count || 7)}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4">No global shipments found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="cc">
            <h3>Document Completion Queue</h3>
            <p>Shipments waiting for missing documents</p>

            {pendingDocs.slice(0, 6).length ? (
              pendingDocs.slice(0, 6).map((row, index) => (
                <Link
                  key={row.id}
                  to="/export-documents"
                  style={{
                    display: "block",
                    textDecoration: "none",
                    padding: "8px 0",
                    borderBottom: index === Math.min(pendingDocs.length, 6) - 1 ? "none" : "1px solid var(--border)",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--g900)" }}>
                    {row.dispatch_number} — {row.customer_name || "Shipment"}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>
                    Airline: {row.airline || "—"} · Flight: {row.flight_no || "—"} · Status: {row.dispatch_status || "docs_pending"}
                  </div>
                </Link>
              ))
            ) : (
              <div style={{ fontSize: 12, color: "var(--text3)" }}>All export document sets are up to date</div>
            )}
          </div>
        </>
      )}
    </>
  );
};

export default LogisticsDashboard;