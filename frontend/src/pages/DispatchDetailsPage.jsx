import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../utils/api";

const DispatchDetailsPage = () => {
  const { id } = useParams();
  const [dispatchRecord, setDispatchRecord] = useState(null);
  const [error, setError] = useState("");

  const fetchDetails = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await api.get(`/dispatch/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setDispatchRecord(res.data);
    } catch {
      setError("Failed to load dispatch details");
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  if (error) return <div className="error-box">{error}</div>;
  if (!dispatchRecord) return <div>Loading...</div>;

  return (
    <div className="dashboard-card">
      <h2>Dispatch Details</h2>

      <div style={{ marginBottom: "15px" }}>
        <Link to={`/dispatch/${id}/print`} target="_blank">
          <button>Print / Save PDF</button>
        </Link>
      </div>

      <p><strong>Dispatch Number:</strong> {dispatchRecord.dispatch_number}</p>
      <p><strong>Client Name:</strong> {dispatchRecord.client_name}</p>
      <p><strong>Dispatch Date:</strong> {dispatchRecord.dispatch_date}</p>
      <p><strong>Created By:</strong> {dispatchRecord.created_by_name || "-"}</p>
      <p><strong>Remarks:</strong> {dispatchRecord.remarks || "-"}</p>

      <h3 style={{ marginTop: "20px", marginBottom: "10px" }}>Items</h3>

      <div className="table-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Item Code</th>
              <th>Item Name</th>
              <th>Batch</th>
              <th>Unit</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {dispatchRecord.items.length > 0 ? (
              dispatchRecord.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.item_code}</td>
                  <td>{item.item_name}</td>
                  <td>{item.batch_code}</td>
                  <td>{item.unit}</td>
                  <td>{item.quantity}</td>
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

export default DispatchDetailsPage;