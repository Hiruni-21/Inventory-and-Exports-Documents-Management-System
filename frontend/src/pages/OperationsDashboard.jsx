import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

const normalizeStatus = (value) => String(value || "").trim().toLowerCase();

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-CA");
};

const getArray = async (url, options) => {
  try {
    const res = await api.get(url, options);
    return Array.isArray(res.data) ? res.data : [];
  } catch {
    return [];
  }
};

const OperationsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [grnList, setGrnList] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [localDispatch, setLocalDispatch] = useState([]);
  const [globalDispatch, setGlobalDispatch] = useState([]);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);

      const [
        suppliersData,
        purchaseOrdersData,
        grnData,
        lowStockData,
        localDispatchData,
        globalDispatchData,
      ] = await Promise.all([
        getArray("/suppliers"),
        getArray("/purchase-orders"),
        getArray("/grn"),
        getArray("/inventory/low-stock"),
        getArray("/dispatch"),
        getArray("/dispatch/global"),
      ]);

      setSuppliers(suppliersData);
      setPurchaseOrders(purchaseOrdersData);
      setGrnList(grnData);
      setLowStock(lowStockData);
      setLocalDispatch(localDispatchData);
      setGlobalDispatch(globalDispatchData);
      setLoading(false);
    };

    loadDashboard();
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  const pendingPoCount = useMemo(
    () =>
      purchaseOrders.filter((row) => {
        const status = normalizeStatus(row.status);
        return status === "pending_approval" || status === "draft" || status.includes("await");
      }).length,
    [purchaseOrders]
  );

  const todaysGrns = useMemo(
    () => grnList.filter((row) => String(row.received_date || "").slice(0, 10) === today).length,
    [grnList, today]
  );

  const activeSuppliers = useMemo(
    () => suppliers.filter((row) => normalizeStatus(row.status || "active") === "active").length,
    [suppliers]
  );

  const dispatchTasks = useMemo(() => {
    const localOpen = localDispatch.filter(
      (row) => normalizeStatus(row.status || "scheduled") !== "delivered"
    ).length;

    const globalOpen = globalDispatch.filter(
      (row) => normalizeStatus(row.status || "created") !== "delivered"
    ).length;

    return localOpen + globalOpen;
  }, [localDispatch, globalDispatch]);

  return (
    <>
      {loading ? (
        <div className="ib ib-i">
          <span>⏳</span>
          <div>Loading operations dashboard...</div>
        </div>
      ) : (
        <>
          <div className="krow k4">
            <div className="kc a">
              <span className="ki">📝</span>
              <div className="kv">{pendingPoCount}</div>
              <div className="kl">Pending POs</div>
            </div>

            <div className="kc g">
              <span className="ki">📥</span>
              <div className="kv">{todaysGrns}</div>
              <div className="kl">Today&apos;s GRNs</div>
            </div>

            <div className="kc b">
              <span className="ki">🌿</span>
              <div className="kv">{activeSuppliers}</div>
              <div className="kl">Active Suppliers</div>
            </div>

            <div className="kc r">
              <span className="ki">🚚</span>
              <div className="kv">{dispatchTasks}</div>
              <div className="kl">Dispatch Tasks</div>
            </div>
          </div>

          <div className="g2">
            <div className="tw">
              <div className="tw-h">
                <h3>Awaiting Purchase Orders</h3>
                <Link to="/purchase-orders" className="btn btn-s btn-xs">
                  View All
                </Link>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>PO</th>
                    <th>Supplier</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders
                    .filter((row) => {
                      const status = normalizeStatus(row.status);
                      return status === "pending_approval" || status === "draft" || status.includes("await");
                    })
                    .slice(0, 5).length ? (
                    purchaseOrders
                      .filter((row) => {
                        const status = normalizeStatus(row.status);
                        return status === "pending_approval" || status === "draft" || status.includes("await");
                      })
                      .slice(0, 5)
                      .map((row) => (
                        <tr key={row.id}>
                          <td style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--g800)" }}>
                            {row.po_number}
                          </td>
                          <td>{row.supplier_name || "—"}</td>
                          <td>{formatDate(row.order_date || row.created_at)}</td>
                          <td>
                            <span className="badge bg-a">Awaiting</span>
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan="4">No pending purchase orders</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="tw">
              <div className="tw-h">
                <h3>Low Stock Items</h3>
                <Link to="/inventory/low-stock" className="btn btn-s btn-xs">
                  View All
                </Link>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Available</th>
                    <th>Reorder</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.slice(0, 5).length ? (
                    lowStock.slice(0, 5).map((row) => (
                      <tr key={row.item_id || row.id}>
                        <td style={{ fontWeight: 600 }}>{row.name || row.item_name}</td>
                        <td>{Number(row.qty_available || row.qty_on_hand || 0)} {row.unit || ""}</td>
                        <td>{Number(row.reorder_level || 0)} {row.unit || ""}</td>
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
          </div>

          <div className="g2">
            <div className="cc">
              <h3>GRN Verification Queue</h3>
              <p>Needs operations review</p>

              {grnList
                .filter((row) => {
                  const status = normalizeStatus(row.status);
                  return status.includes("pending") || status.includes("verify");
                })
                .slice(0, 5).length ? (
                grnList
                  .filter((row) => {
                    const status = normalizeStatus(row.status);
                    return status.includes("pending") || status.includes("verify");
                  })
                  .slice(0, 5)
                  .map((row, index) => (
                    <Link
                      key={row.id}
                      to="/grn"
                      style={{
                        display: "block",
                        textDecoration: "none",
                        padding: "8px 0",
                        borderBottom: index === 4 ? "none" : "1px solid var(--border)",
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--g900)" }}>
                        {row.grn_number || `GRN-${row.id}`}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>
                        {row.supplier_name || "Supplier pending verification"} · {row.status || "pending_verify"}
                      </div>
                    </Link>
                  ))
              ) : (
                <div style={{ fontSize: 12, color: "var(--text3)" }}>No GRNs awaiting verification</div>
              )}
            </div>

            <div className="cc">
              <h3>Open Dispatch Tasks</h3>
              <p>Local and export work queue</p>

              {[...localDispatch, ...globalDispatch].slice(0, 5).length ? (
                [...localDispatch, ...globalDispatch].slice(0, 5).map((row, index) => (
                  <div
                    key={`${row.id}-${index}`}
                    style={{
                      padding: "8px 0",
                      borderBottom: index === 4 ? "none" : "1px solid var(--border)",
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--g900)" }}>
                      {row.client_name || row.customer_name || row.dispatch_number || "Dispatch Task"}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>
                      {(row.dispatch_number || "—")} · {row.status || "scheduled"}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 12, color: "var(--text3)" }}>No active dispatch tasks</div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default OperationsDashboard;