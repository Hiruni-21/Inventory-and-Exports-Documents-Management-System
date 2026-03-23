import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../utils/api";

const GrnDetailsPage = () => {
  const { id } = useParams();
  const [grn, setGrn] = useState(null);
  const [error, setError] = useState("");

  const fetchGrn = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await api.get(`/grn/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setGrn(res.data);
    } catch (err) {
      setError("Failed to load GRN details");
    }
  };

  useEffect(() => {
    fetchGrn();
  }, [id]);

  if (error) return <div className="error-box">{error}</div>;
  if (!grn) return <div>Loading...</div>;

  return (
    <div className="dashboard-card">
      <h2>GRN Details</h2>

      <p><strong>GRN Number:</strong> {grn.grn_number}</p>
      <p><strong>PO Number:</strong> {grn.po_number}</p>
      <p><strong>Supplier:</strong> {grn.supplier_name}</p>
      <p><strong>Contact:</strong> {grn.contact_number}</p>
      <p><strong>Email:</strong> {grn.email || "-"}</p>
      <p><strong>Received Date:</strong> {grn.received_date}</p>
      <p><strong>Received Time:</strong> {grn.received_time || "-"}</p>
      <p><strong>Created By:</strong> {grn.created_by_name || "-"}</p>
      <p><strong>Remarks:</strong> {grn.remarks || "-"}</p>

      <h3 style={{ marginTop: "20px", marginBottom: "10px" }}>Items</h3>

      <div className="table-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Item Code</th>
              <th>Item Name</th>
              <th>Unit</th>
              <th>Ordered Qty</th>
              <th>Delivered Qty</th>
            </tr>
          </thead>
          <tbody>
            {grn.items.length > 0 ? (
              grn.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.item_code}</td>
                  <td>{item.item_name}</td>
                  <td>{item.unit}</td>
                  <td>{item.ordered_quantity}</td>
                  <td>{item.delivered_quantity}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6">No items found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GrnDetailsPage;