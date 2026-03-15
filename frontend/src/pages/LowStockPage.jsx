import { useEffect, useState } from "react";
import api from "../utils/api";

const LowStockPage = () => {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  const fetchLowStock = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await api.get("/inventory/low-stock", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setItems(res.data);
    } catch (err) {
      setError("Failed to load low stock items");
    }
  };

  useEffect(() => {
    fetchLowStock();
  }, []);

  return (
    <div>
      <div className="page-header-row">
        <h2>Low Stock Alerts</h2>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="table-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Item Name</th>
              <th>Unit</th>
              <th>Reorder Level</th>
              <th>Available Qty</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item) => (
                <tr key={item.item_id}>
                  <td>{item.item_code}</td>
                  <td>{item.item_name}</td>
                  <td>{item.unit}</td>
                  <td>{item.reorder_level}</td>
                  <td>{item.total_available_quantity}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5">No low stock items found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LowStockPage;