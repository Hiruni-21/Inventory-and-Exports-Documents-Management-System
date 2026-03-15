import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../utils/api";

const PurchaseOrderDetailsPage = () => {
  const { id } = useParams();
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [error, setError] = useState("");

  const fetchPurchaseOrder = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await api.get(`/purchase-orders/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setPurchaseOrder(res.data);
    } catch (err) {
      setError("Failed to load purchase order details");
    }
  };

  useEffect(() => {
    fetchPurchaseOrder();
  }, [id]);

  if (error) return <div className="error-box">{error}</div>;
  if (!purchaseOrder) return <div>Loading...</div>;

  return (
    <div className="dashboard-card">
      <h2>Purchase Order Details</h2>

      <p><strong>PO Number:</strong> {purchaseOrder.po_number}</p>
      <p><strong>Supplier:</strong> {purchaseOrder.supplier_name}</p>
      <p><strong>Contact:</strong> {purchaseOrder.contact_number}</p>
      <p><strong>Email:</strong> {purchaseOrder.email || "-"}</p>
      <p><strong>Expected Delivery:</strong> {purchaseOrder.expected_delivery_date || "-"}</p>
      <p><strong>Status:</strong> {purchaseOrder.status}</p>
      <p><strong>Created By:</strong> {purchaseOrder.created_by_name || "-"}</p>
      <p><strong>Remarks:</strong> {purchaseOrder.remarks || "-"}</p>

      <h3 style={{ marginTop: "20px", marginBottom: "10px" }}>Items</h3>

      <div className="table-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Item Code</th>
              <th>Item Name</th>
              <th>Unit</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrder.items.length > 0 ? (
              purchaseOrder.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.item_code}</td>
                  <td>{item.item_name}</td>
                  <td>{item.unit}</td>
                  <td>{item.quantity}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5">No items found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PurchaseOrderDetailsPage;