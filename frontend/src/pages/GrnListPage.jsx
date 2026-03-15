import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

const GrnListPage = () => {
  const [grnList, setGrnList] = useState([]);
  const [error, setError] = useState("");

  const fetchGrn = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await api.get("/grn", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setGrnList(res.data);
    } catch (err) {
      setError("Failed to load GRN records");
    }
  };

  useEffect(() => {
    fetchGrn();
  }, []);

  return (
    <div>
      <div className="page-header-row">
        <h2>Goods Receiving Notes</h2>
        <Link to="/grn/add" className="add-btn">
          + Create GRN
        </Link>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="table-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>GRN Number</th>
              <th>PO Number</th>
              <th>Supplier</th>
              <th>Received Date</th>
              <th>Received Time</th>
              <th>Created By</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {grnList.length > 0 ? (
              grnList.map((grn) => (
                <tr key={grn.id}>
                  <td>{grn.id}</td>
                  <td>{grn.grn_number}</td>
                  <td>{grn.po_number}</td>
                  <td>{grn.supplier_name}</td>
                  <td>{grn.received_date}</td>
                  <td>{grn.received_time || "-"}</td>
                  <td>{grn.created_by_name || "-"}</td>
                  <td>
                    <Link to={`/grn/${grn.id}`} className="view-link">
                      View
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8">No GRN records found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GrnListPage;