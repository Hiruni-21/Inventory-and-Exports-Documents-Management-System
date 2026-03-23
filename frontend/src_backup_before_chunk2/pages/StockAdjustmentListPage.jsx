import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

const StockAdjustmentListPage = () => {
  const [adjustments, setAdjustments] = useState([]);
  const [error, setError] = useState("");

  const fetchAdjustments = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await api.get("/stock-adjustments", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setAdjustments(res.data);
    } catch (err) {
      setError("Failed to load stock adjustments");
    }
  };

  useEffect(() => {
    fetchAdjustments();
  }, []);

  return (
    <div>
      <div className="page-header-row">
        <h2>Stock Adjustments</h2>
        <Link to="/stock-adjustments/add" className="add-btn">
          + Add Adjustment
        </Link>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="table-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Item Code</th>
              <th>Item Name</th>
              <th>Batch</th>
              <th>Type</th>
              <th>Quantity</th>
              <th>Reason</th>
              <th>Created By</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {adjustments.length > 0 ? (
              adjustments.map((adj) => (
                <tr key={adj.id}>
                  <td>{adj.id}</td>
                  <td>{adj.item_code}</td>
                  <td>{adj.item_name}</td>
                  <td>{adj.batch_code}</td>
                  <td>{adj.adjustment_type}</td>
                  <td>{adj.quantity}</td>
                  <td>{adj.reason}</td>
                  <td>{adj.created_by_name || "-"}</td>
                  <td>{new Date(adj.created_at).toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9">No stock adjustments found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StockAdjustmentListPage;