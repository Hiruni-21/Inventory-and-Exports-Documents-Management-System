import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

const formatCompactLkr = (value) => {
  const amount = Number(value || 0);

  if (amount >= 1000000) return `LKR ${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `LKR ${Math.round(amount / 1000)}K`;

  return `LKR ${Math.round(amount).toLocaleString("en-LK")}`;
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-CA");
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
};

const normalizeStatus = (value) => String(value || "").trim().toLowerCase();

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

const getObject = async (url, options) => {
  try {
    const res = await api.get(url, options);
    return res.data || {};
  } catch {
    return {};
  }
};

const ManagerDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [valuation, setValuation] = useState({});
  const [lowStock, setLowStock] = useState([]);
  const [expiry, setExpiry] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [localCustomers, setLocalCustomers] = useState([]);
  const [globalCustomers, setGlobalCustomers] = useState([]);
  const [localDispatches, setLocalDispatches] = useState([]);
  const [globalDispatches, setGlobalDispatches] = useState([]);
  const [exportDocs, setExportDocs] = useState([]);
  const [grnList, setGrnList] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);

      const [
        statsData,
        valuationData,
        lowStockData,
        expiryData,
        adjustmentsData,
        suppliersData,
        localCustomersData,
        globalCustomersData,
        localDispatchData,
        globalDispatchData,
        exportDocsData,
        grnData,
        purchaseOrdersData,
      ] = await Promise.all([
        getObject("/dashboard/stats"),
        getObject("/inventory/valuation"),
        getArray("/inventory/low-stock"),
        getArray("/inventory/expiry", { params: { days: 14 } }),
        getArray("/stock-adjustments"),
        getArray("/suppliers"),
        getArray("/customers", { params: { type: "local" } }),
        getArray("/customers", { params: { type: "global" } }),
        getArray("/dispatch"),
        getArray("/dispatch/global"),
        getArray("/export-docs"),
        getArray("/grn"),
        getArray("/purchase-orders"),
      ]);

      setStats(statsData);
      setValuation(valuationData);
      setLowStock(lowStockData);
      setExpiry(expiryData);
      setAdjustments(adjustmentsData);
      setSuppliers(suppliersData);
      setLocalCustomers(localCustomersData);
      setGlobalCustomers(globalCustomersData);
      setLocalDispatches(localDispatchData);
      setGlobalDispatches(globalDispatchData);
      setExportDocs(exportDocsData);
      setGrnList(grnData);
      setPurchaseOrders(purchaseOrdersData);
      setLoading(false);
    };

    loadDashboard();
  }, []);

  const expiringSoon = useMemo(
    () =>
      [...expiry]
        .map((row) => ({ ...row, days_left: getDaysLeft(row.expiry_date) }))
        .sort((a, b) => Number(a.days_left ?? 9999) - Number(b.days_left ?? 9999))
        .slice(0, 4),
    [expiry]
  );

  const criticalExpiryCount = useMemo(
    () =>
      expiry.filter((row) => {
        const days = getDaysLeft(row.expiry_date);
        return days !== null && days <= 3;
      }).length,
    [expiry]
  );

  const totalCustomers = useMemo(
    () => localCustomers.length + globalCustomers.length,
    [localCustomers, globalCustomers]
  );

  const activeExportShipments = useMemo(
    () =>
      globalDispatches.filter((row) => normalizeStatus(row.status) !== "delivered").length,
    [globalDispatches]
  );

  const pendingApprovals = useMemo(
    () =>
      purchaseOrders.filter((row) => {
        const status = normalizeStatus(row.status);
        return status === "pending_approval" || status === "draft" || status.includes("await");
      }),
    [purchaseOrders]
  );

  const incompleteExportDocs = useMemo(
    () => exportDocs.filter((row) => !Number(row.all_cleared || 0)),
    [exportDocs]
  );

  const urgentActions = useMemo(() => {
    const rows = [];

    if (lowStock[0]) {
      rows.push({
        key: `low-${lowStock[0].item_id || lowStock[0].id}`,
        title: `${lowStock[0].name || lowStock[0].item_name} below reorder level`,
        subtitle: `${Number(lowStock[0].qty_available || lowStock[0].qty_on_hand || 0)} ${lowStock[0].unit || ""} available`,
        to: "/inventory/low-stock",
        color: "var(--d)",
      });
    }

    if (pendingApprovals[0]) {
      rows.push({
        key: `po-${pendingApprovals[0].id}`,
        title: `${pendingApprovals[0].po_number || "Purchase order"} awaiting approval`,
        subtitle: pendingApprovals[0].supplier_name || "Manager review needed",
        to: "/purchase-orders",
        color: "var(--a500)",
      });
    }

    if (incompleteExportDocs[0]) {
      rows.push({
        key: `docs-${incompleteExportDocs[0].id}`,
        title: `${incompleteExportDocs[0].dispatch_number || "Shipment"} documents incomplete`,
        subtitle: incompleteExportDocs[0].customer_name || "Cannot clear shipment yet",
        to: "/export-documents",
        color: "var(--d)",
      });
    }

    return rows.slice(0, 4);
  }, [lowStock, pendingApprovals, incompleteExportDocs]);

  const todaysSchedule = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    const localRows = localDispatches
      .filter((row) => String(row.dispatch_date || "").slice(0, 10) === today)
      .slice(0, 2)
      .map((row) => ({
        key: `local-${row.id}`,
        title: `${row.client_name || "Local Dispatch"} — ${row.delivery_window || formatDate(row.dispatch_date)}`,
        subtitle: `${row.dispatch_number || "Dispatch"} · ${row.status || "scheduled"}`,
        to: "/dispatch/local",
      }));

    const globalRows = globalDispatches
      .filter((row) => String(row.dispatch_date || "").slice(0, 10) === today)
      .slice(0, 1)
      .map((row) => ({
        key: `global-${row.id}`,
        title: `${row.customer_name || "Export Shipment"} — ${row.flight_no || row.airline || "Flight pending"}`,
        subtitle: `${row.dispatch_number || "Shipment"} · ${row.status || "docs_pending"}`,
        to: "/dispatch/global",
      }));

    const grnRows = grnList
      .filter((row) => String(row.received_date || "").slice(0, 10) === today)
      .slice(0, 1)
      .map((row) => ({
        key: `grn-${row.id}`,
        title: `${row.grn_number || "GRN"} goods received today`,
        subtitle: row.supplier_name || "Goods receiving entry",
        to: "/grn",
      }));

    return [...localRows, ...globalRows, ...grnRows].slice(0, 4);
  }, [localDispatches, globalDispatches, grnList]);

  const recentAdjustments = useMemo(() => adjustments.slice(0, 4), [adjustments]);

  return (
    <>
      {loading ? (
        <div className="ib ib-i">
          <span>⏳</span>
          <div>Loading dashboard...</div>
        </div>
      ) : (
        <>
          <div className="krow k3">
            <div className="kc g">
              <div className="kv">{Number(stats.items || 0)}</div>
              <div className="kl">Items in Stock</div>
            </div>

            <div className="kc r">
              <div className="kv">{Number(stats.lowStock || lowStock.length || 0)}</div>
              <div className="kl">Low Stock Items</div>
            </div>

            <div className="kc b">
              <div className="kv">{formatCompactLkr(valuation.total_inventory_value || 0)}</div>
              <div className="kl">Stock Valuation</div>
            </div>
          </div>

          <div className="krow k4">
            <div className="kc b">
              <div className="kv">{Number(stats.localDispatch || localDispatches.length || 0)}</div>
              <div className="kl">Local Dispatches</div>
            </div>

            <div className="kc a">
              <div className="kv">{activeExportShipments || Number(stats.globalDispatch || 0)}</div>
              <div className="kl">Active Export Shipments</div>
            </div>

            <div className="kc g">
              <div className="kv">
                {suppliers.filter((row) => normalizeStatus(row.status || "active") === "active").length ||
                  Number(stats.suppliers || 0)}
              </div>
              <div className="kl">Active Suppliers</div>
            </div>

            <div className="kc p">
              <div className="kv">{totalCustomers}</div>
              <div className="kl">Total Customers</div>
            </div>
          </div>

          <div className="cc">
            <h3>Urgent Actions</h3>
            <p>Needs attention now</p>

            {urgentActions.length ? (
              urgentActions.map((action) => (
                <Link
                  key={action.key}
                  to={action.to}
                  style={{
                    display: "flex",
                    gap: 8,
                    padding: "9px 10px",
                    borderRadius: 8,
                    background: "var(--ivory)",
                    borderLeft: `3px solid ${action.color}`,
                    marginBottom: 8,
                    textDecoration: "none",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--g900)" }}>
                      {action.title}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>
                      {action.subtitle}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: "var(--text3)", alignSelf: "center" }}>→</span>
                </Link>
              ))
            ) : (
              <div style={{ fontSize: 12, color: "var(--text3)" }}>No urgent actions</div>
            )}
          </div>

          <div className="g3">
            <div className="cc">
              <h3>Low Stock Preview</h3>
              <p>Sorted by urgency</p>

              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Available</th>
                    <th>Reorder</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.slice(0, 4).length ? (
                    lowStock.slice(0, 4).map((row) => (
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

            <div className="cc">
              <h3>Today&apos;s Schedule</h3>
              <p>Dispatches and goods receiving</p>

              {todaysSchedule.length ? (
                todaysSchedule.map((row, index) => (
                  <Link
                    key={row.key}
                    to={row.to}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 0",
                      borderBottom: index === todaysSchedule.length - 1 ? "none" : "1px solid var(--border)",
                      textDecoration: "none",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--g900)" }}>{row.title}</div>
                      <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>{row.subtitle}</div>
                    </div>
                    <span style={{ fontSize: 10, color: "var(--text3)" }}>→</span>
                  </Link>
                ))
              ) : (
                <div style={{ fontSize: 12, color: "var(--text3)" }}>No items scheduled today</div>
              )}
            </div>

            <div className="cc">
              <h3>Recent Stock Adjustments</h3>
              <p>Latest audit trail entries</p>

              {recentAdjustments.length ? (
                recentAdjustments.map((row, index) => (
                  <Link
                    key={row.id}
                    to="/stock-adjustments"
                    style={{
                      display: "block",
                      padding: "8px 0",
                      borderBottom: index === recentAdjustments.length - 1 ? "none" : "1px solid var(--border)",
                      textDecoration: "none",
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--g900)" }}>
                      {row.item_name || "Stock Adjustment"}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>
                      {formatDateTime(row.created_at)} · {row.reason || "Adjustment recorded"}
                    </div>
                  </Link>
                ))
              ) : (
                <div style={{ fontSize: 12, color: "var(--text3)" }}>No recent adjustments</div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default ManagerDashboard;