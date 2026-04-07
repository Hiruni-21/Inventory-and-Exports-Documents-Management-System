import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

const fmtDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-CA");
};

const LogisticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [localDispatch, setLocalDispatch] = useState([]);
  const [globalDispatch, setGlobalDispatch] = useState([]);
  const [exportDocs, setExportDocs] = useState([]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const [localRes, globalRes, docsRes] = await Promise.all([
          api.get("/dispatch/local"),
          api.get("/dispatch/global"),
          api.get("/export-docs"),
        ]);

        setLocalDispatch(Array.isArray(localRes.data) ? localRes.data : []);
        setGlobalDispatch(Array.isArray(globalRes.data) ? globalRes.data : []);
        setExportDocs(Array.isArray(docsRes.data) ? docsRes.data : []);
      } catch (err) {
        console.error(err);
        setError(err?.response?.data?.message || "Failed to load logistics dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const pendingDocs = useMemo(
    () => exportDocs.filter((row) => !Number(row.all_cleared || 0)).length,
    [exportDocs]
  );

  const packingPending = useMemo(
    () => exportDocs.filter((row) => String(row.packing_list_status || "") !== "done").length,
    [exportDocs]
  );

  const invoicePending = useMemo(
    () => exportDocs.filter((row) => String(row.commercial_invoice_status || "") !== "done").length,
    [exportDocs]
  );

  const shipmentCount = useMemo(
    () => localDispatch.length + globalDispatch.length,
    [localDispatch, globalDispatch]
  );

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
          <div>Loading logistics dashboard...</div>
        </div>
      ) : (
        <>
          <div className="krow k4">
            <div className="kc a">
              <span className="ki">📄</span>
              <div className="kv">{pendingDocs}</div>
              <div className="kl">Pending Documents</div>
            </div>

            <div className="kc b">
              <span className="ki">📦</span>
              <div className="kv">{packingPending}</div>
              <div className="kl">Packing Lists Pending</div>
            </div>

            <div className="kc r">
              <span className="ki">🧾</span>
              <div className="kv">{invoicePending}</div>
              <div className="kl">Invoices Pending</div>
            </div>

            <div className="kc g">
              <span className="ki">✈️</span>
              <div className="kv">{shipmentCount}</div>
              <div className="kl">Total Dispatches</div>
            </div>
          </div>

          <div className="tw" style={{ marginTop: 16 }}>
            <div className="tw-h">
              <h3>Recent Global Shipments</h3>
              <Link to="/dispatch/global" className="btn btn-s btn-xs">
                View All
              </Link>
            </div>

            <table>
              <thead>
                <tr>
                  <th>SHIPMENT</th>
                  <th>CUSTOMER</th>
                  <th>DATE</th>
                  <th>STATUS</th>
                  <th>DOCS</th>
                </tr>
              </thead>
              <tbody>
                {globalDispatch.slice(0, 6).length ? (
                  globalDispatch.slice(0, 6).map((row) => (
                    <tr key={row.id}>
                      <td style={{ fontFamily: "monospace", fontWeight: 700 }}>
                        {row.dispatch_number}
                      </td>
                      <td>{row.customer_name || "—"}</td>
                      <td>{fmtDate(row.dispatch_date)}</td>
                      <td>
                        <span className={`badge ${
                          String(row.status || "").toLowerCase() === "delivered"
                            ? "bg-g"
                            : String(row.status || "").toLowerCase() === "cleared"
                            ? "bg-b"
                            : "bg-a"
                        }`}>
                          {row.status || "docs_pending"}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-a">
                          {Number(row.docs_done_count || 0)}/{Number(row.required_docs_count || 7)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5">No global shipments found</td>
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

export default LogisticsDashboard;