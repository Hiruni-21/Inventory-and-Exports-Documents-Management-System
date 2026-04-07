import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

const isPendingPo = (status) => {
  const value = String(status || "").toLowerCase();
  return (
    value.includes("pending") ||
    value.includes("await") ||
    value.includes("draft")
  );
};

const fmtDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-CA");
};

const OperationsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [grnList, setGrnList] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [localDispatch, setLocalDispatch] = useState([]);
  const [globalDispatch, setGlobalDispatch] = useState([]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const [
          suppliersRes,
          purchaseOrdersRes,
          grnRes,
          lowStockRes,
          localDispatchRes,
          globalDispatchRes,
        ] = await Promise.all([
          api.get("/suppliers"),
          api.get("/purchase-orders"),
          api.get("/grn"),
          api.get("/inventory/low-stock"),
          api.get("/dispatch/local"),
          api.get("/dispatch/global"),
        ]);

        setSuppliers(Array.isArray(suppliersRes.data) ? suppliersRes.data : []);
        setPurchaseOrders(Array.isArray(purchaseOrdersRes.data) ? purchaseOrdersRes.data : []);
        setGrnList(Array.isArray(grnRes.data) ? grnRes.data : []);
        setLowStock(Array.isArray(lowStockRes.data) ? lowStockRes.data : []);
        setLocalDispatch(Array.isArray(localDispatchRes.data) ? localDispatchRes.data : []);
        setGlobalDispatch(Array.isArray(globalDispatchRes.data) ? globalDispatchRes.data : []);
      } catch (err) {
        console.error(err);
        setError(err?.response?.data?.message || "Failed to load operations dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  const pendingPoCount = useMemo(
    () => purchaseOrders.filter((row) => isPendingPo(row.status)).length,
    [purchaseOrders]
  );

  const incomingDeliveries = useMemo(
    () => grnList.filter((row) => String(row.received_date || "").slice(0, 10) === today).length,
    [grnList, today]
  );

  const activeSuppliers = useMemo(
    () =>
      suppliers.filter((row) => String(row.status || "active").toLowerCase() === "active").length,
    [suppliers]
  );

  const dispatchTasks = useMemo(() => {
    const localOpen = localDispatch.filter(
      (row) => String(row.status || "").toLowerCase() !== "delivered"
    ).length;

    const globalOpen = globalDispatch.filter((row) => {
      const status = String(row.status || "").toLowerCase();
      return status !== "delivered";
    }).length;

    return localOpen + globalOpen;
  }, [localDispatch, globalDispatch]);

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
              <div className="kv">{incomingDeliveries}</div>
              <div className="kl">Today’s GRNs</div>
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
                <h3>Awaiting Purchase Orders</h3>
                <Link to="/purchase-orders" className="btn btn-s btn-xs">
                  View All
                </Link>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>PO</th>
                    <th>SUPPLIER</th>
                    <th>DATE</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.filter((row) => isPendingPo(row.status)).slice(0, 5).length ? (
                    purchaseOrders
                      .filter((row) => isPendingPo(row.status))
                      .slice(0, 5)
                      .map((row) => (
                        <tr key={row.id}>
                          <td style={{ fontFamily: "monospace", fontWeight: 700 }}>
                            {row.po_number}
                          </td>
                          <td>{row.supplier_name || "—"}</td>
                          <td>{fmtDate(row.order_date || row.created_at)}</td>
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
                    <th>ITEM</th>
                    <th>AVAILABLE</th>
                    <th>REORDER</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.slice(0, 5).length ? (
                    lowStock.slice(0, 5).map((row) => (
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
          </div>
        </>
      )}
    </>
  );
};

export default OperationsDashboard;