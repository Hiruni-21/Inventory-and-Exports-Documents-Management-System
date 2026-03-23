import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

const WastageListPage = () => {
  const [records, setRecords] = useState([]);
  const [error, setError] = useState("");

  const fetchRecords = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await api.get("/wastage", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setRecords(res.data);
    } catch (err) {
      setError("Failed to load wastage records");
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  return (
    <div>
      <div className="page-header-row">
        <h2>Wastage Records</h2>
        <Link to="/wastage/add" className="add-btn">
          + Record Wastage
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
              <th>Quantity</th>
              <th>Reason</th>
              <th>Created By</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {records.length > 0 ? (
              records.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.item_code}</td>
                  <td>{r.item_name}</td>
                  <td>{r.batch_code}</td>
                  <td>{r.quantity}</td>
                  <td>{r.reason}</td>
                  <td>{r.created_by_name || "-"}</td>
                  <td>{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8">No wastage records found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WastageListPage;