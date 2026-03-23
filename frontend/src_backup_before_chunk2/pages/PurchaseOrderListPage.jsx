import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
};

const PurchaseOrderListPage = () => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const res = await api.get("/purchase-orders", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setPurchaseOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError("Failed to load purchase orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  const filteredPurchaseOrders = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return purchaseOrders;

    return purchaseOrders.filter((po) => {
      return (
        String(po.id).toLowerCase().includes(term) ||
        String(po.po_number || "").toLowerCase().includes(term) ||
        String(po.supplier_name || "").toLowerCase().includes(term) ||
        String(po.status || "").toLowerCase().includes(term)
      );
    });
  }, [purchaseOrders, search]);

  return (
    <div className="page-shell">
      <div className="toolbar" style={{ marginBottom: "16px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <input
          className="fc"
          style={{ maxWidth: "320px" }}
          type="text"
          placeholder="Search by PO number, supplier, or status"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Link to="/purchase-orders/add" className="btn btn-p">
          + Create Purchase Order
        </Link>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="kpi-grid" style={{ marginBottom: "18px" }}>
        <div className="dashboard-card">
          <div className="metric-value">{purchaseOrders.length}</div>
          <div className="metric-label">Total POs</div>
        </div>
        <div className="dashboard-card">
          <div className="metric-value">
            {purchaseOrders.filter((po) => (po.status || "").toLowerCase() === "pending").length}
          </div>
          <div className="metric-label">Pending</div>
        </div>
        <div className="dashboard-card">
          <div className="metric-value">
            {purchaseOrders.filter((po) => (po.status || "").toLowerCase() === "received").length}
          </div>
          <div className="metric-label">Received</div>
        </div>
      </div>

      <div className="dashboard-card">
        <div className="section-title" style={{ marginBottom: "14px" }}>
          Purchase Order Register
        </div>

        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>Expected Delivery</th>
                <th>Status</th>
                <th>Created By</th>
                <th>Created At</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8">Loading purchase orders...</td>
                </tr>
              ) : filteredPurchaseOrders.length > 0 ? (
                filteredPurchaseOrders.map((po) => (
                  <tr key={po.id}>
                    <td>{po.id}</td>
                    <td>{po.po_number}</td>
                    <td>{po.supplier_name}</td>
                    <td>{formatDate(po.expected_delivery_date)}</td>
                    <td>{po.status || "-"}</td>
                    <td>{po.created_by_name || "-"}</td>
                    <td>{formatDate(po.created_at)}</td>
                    <td>
                      <Link to={`/purchase-orders/${po.id}`} className="btn btn-s btn-sm">
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8">No purchase orders found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderListPage;