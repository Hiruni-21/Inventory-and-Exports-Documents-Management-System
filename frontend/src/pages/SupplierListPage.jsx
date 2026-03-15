import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

const SupplierListPage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [error, setError] = useState("");

  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await api.get("/suppliers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setSuppliers(res.data);
    } catch (err) {
      setError("Failed to load suppliers");
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  return (
    <div>
      <div className="page-header-row">
        <h2>Supplier Management</h2>
        <Link to="/suppliers/add" className="add-btn">
          + Add Supplier
        </Link>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="table-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Supplier Name</th>
              <th>Contact Number</th>
              <th>Email</th>
              <th>Lead Time</th>
              <th>Return Eligibility</th>
              <th>Rating</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.length > 0 ? (
              suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td>{supplier.id}</td>
                  <td>{supplier.supplier_name}</td>
                  <td>{supplier.contact_number}</td>
                  <td>{supplier.email || "-"}</td>
                  <td>{supplier.lead_time_days} days</td>
                  <td>{supplier.return_eligibility}</td>
                  <td>{supplier.rating_score}</td>
                  <td>{supplier.status}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8">No suppliers found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SupplierListPage;