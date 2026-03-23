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
      setError(err.response?.data?.message || "Failed to load low stock items");
    }
  };

  useEffect(() => {
    fetchLowStock();
  }, []);

  return (
    <div>
      <div className="page-header-row">
        <h2>Low Stock Items</h2>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="table-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Code</th>
              <th>Name</th>
              <th>Category</th>
              <th>Type</th>
              <th>Unit</th>
              <th>Reorder Level</th>
              <th>Qty Available</th>
              <th>Shortage</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item) => (
                <tr key={item.id}>
                  <td>{item.item_id}</td>
                  <td>{item.code}</td>
                  <td>{item.name}</td>
                  <td>{item.category_name}</td>
                  <td>{item.type}</td>
                  <td>{item.unit}</td>
                  <td>{item.reorder_level}</td>
                  <td>{item.qty_available}</td>
                  <td>{item.shortage}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9">No low stock items found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LowStockPage;