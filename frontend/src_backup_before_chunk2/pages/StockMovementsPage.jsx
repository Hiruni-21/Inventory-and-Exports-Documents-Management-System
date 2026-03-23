import { useEffect, useState } from "react";
import api from "../utils/api";

const StockMovementsPage = () => {
  const [movements, setMovements] = useState([]);
  const [error, setError] = useState("");

  const fetchMovements = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await api.get("/inventory/movements", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setMovements(res.data);
    } catch (err) {
      setError("Failed to load stock movements");
    }
  };

  useEffect(() => {
    fetchMovements();
  }, []);

  return (
    <div>
      <div className="page-header-row">
        <h2>Stock Movements</h2>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="table-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Item Code</th>
              <th>Item Name</th>
              <th>Type</th>
              <th>Reference</th>
              <th>Reference ID</th>
              <th>Quantity</th>
              <th>Notes</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {movements.length > 0 ? (
              movements.map((m) => (
                <tr key={m.id}>
                  <td>{m.id}</td>
                  <td>{m.item_code}</td>
                  <td>{m.item_name}</td>
                  <td>{m.movement_type}</td>
                  <td>{m.reference_type}</td>
                  <td>{m.reference_id}</td>
                  <td>{m.quantity}</td>
                  <td>{m.notes || "-"}</td>
                  <td>{new Date(m.created_at).toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9">No stock movements found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StockMovementsPage;