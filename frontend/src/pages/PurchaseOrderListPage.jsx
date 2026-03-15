import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

const PurchaseOrderListPage = () => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [error, setError] = useState("");

  const fetchPurchaseOrders = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await api.get("/purchase-orders", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setPurchaseOrders(res.data);
    } catch (err) {
      setError("Failed to load purchase orders");
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  return (
    <div>
      <div className="page-header-row">
        <h2>Purchase Orders</h2>
        <Link to="/purchase-orders/add" className="add-btn">
          + Create PO
        </Link>
      </div>

      {error && <div className="error-box">{error}</div>}

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
            {purchaseOrders.length > 0 ? (
              purchaseOrders.map((po) => (
                <tr key={po.id}>
                  <td>{po.id}</td>
                  <td>{po.po_number}</td>
                  <td>{po.supplier_name}</td>
                  <td>{po.expected_delivery_date || "-"}</td>
                  <td>{po.status}</td>
                  <td>{po.created_by_name || "-"}</td>
                  <td>{new Date(po.created_at).toLocaleDateString()}</td>
                  <td>
                    <Link to={`/purchase-orders/${po.id}`} className="view-link">
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
  );
};

export default PurchaseOrderListPage;