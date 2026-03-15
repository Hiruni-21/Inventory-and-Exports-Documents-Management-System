import { useEffect, useState } from "react";
import api from "../utils/api";

const InventoryListPage = () => {
  const [inventory, setInventory] = useState([]);
  const [error, setError] = useState("");

  const fetchInventory = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await api.get("/inventory", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setInventory(res.data);
    } catch (err) {
      setError("Failed to load inventory");
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  return (
    <div>
      <div className="page-header-row">
        <h2>Inventory</h2>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="table-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Item Name</th>
              <th>Category</th>
              <th>Unit</th>
              <th>Reorder Level</th>
              <th>Available Qty</th>
              <th>Perishable</th>
              <th>Return Eligible</th>
            </tr>
          </thead>
          <tbody>
            {inventory.length > 0 ? (
              inventory.map((item) => (
                <tr key={item.item_id}>
                  <td>{item.item_code}</td>
                  <td>{item.item_name}</td>
                  <td>{item.category_name}</td>
                  <td>{item.unit}</td>
                  <td>{item.reorder_level}</td>
                  <td>{item.total_available_quantity}</td>
                  <td>{item.is_perishable}</td>
                  <td>{item.return_eligibility}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8">No inventory found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryListPage;