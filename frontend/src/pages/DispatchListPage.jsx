import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

const DispatchListPage = () => {
  const [records, setRecords] = useState([]);
  const [error, setError] = useState("");

  const fetchRecords = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await api.get("/dispatch", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setRecords(res.data);
    } catch (err) {
      setError("Failed to load dispatch records");
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  return (
    <div>
      <div className="page-header-row">
        <h2>Dispatch Records</h2>
        <Link to="/dispatch/add" className="add-btn">
          + Create Dispatch
        </Link>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="table-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Dispatch Number</th>
              <th>Client Name</th>
              <th>Dispatch Date</th>
              <th>Created By</th>
              <th>Date Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {records.length > 0 ? (
              records.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.dispatch_number}</td>
                  <td>{r.client_name}</td>
                  <td>{r.dispatch_date}</td>
                  <td>{r.created_by_name || "-"}</td>
                  <td>{new Date(r.created_at).toLocaleString()}</td>
                  <td>
                    <Link to={`/dispatch/${r.id}`} className="view-link">
                      View
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7">No dispatch records found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DispatchListPage;