import { useEffect, useState } from "react";
import api from "../utils/api";

const InventoryListPage = () => {
  const [inventory, setInventory] = useState([]);
  const [valuation, setValuation] = useState(null);
  const [filters, setFilters] = useState({
    category: "",
    type: "",
  });
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  const fetchInventory = async () => {
    try {
      const params = {};

      if (filters.category) params.category = filters.category;
      if (filters.type) params.type = filters.type;

      const res = await api.get("/inventory", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params,
      });

      setInventory(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load inventory");
    }
  };

  const fetchValuation = async () => {
    try {
      const res = await api.get("/inventory/valuation", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setValuation(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load valuation");
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchValuation();
  }, [filters.category, filters.type]);

  const handleFilterChange = (e) => {
    setFilters((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div>
      <div className="page-header-row">
        <h2>Inventory</h2>
      </div>

      {error && <div className="error-box">{error}</div>}

      {valuation && (
        <div className="cards-grid" style={{ marginBottom: "20px" }}>
          <div className="dashboard-card">
            <h3>Total Items</h3>
            <p>{valuation.total_items}</p>
          </div>

          <div className="dashboard-card">
            <h3>Qty On Hand</h3>
            <p>{valuation.total_qty_on_hand}</p>
          </div>

          <div className="dashboard-card">
            <h3>Qty Available</h3>
            <p>{valuation.total_qty_available}</p>
          </div>

          <div className="dashboard-card">
            <h3>Total Inventory Value</h3>
            <p>{valuation.total_inventory_value}</p>
          </div>
        </div>
      )}

      <div className="filter-bar" style={{ marginBottom: "20px" }}>
        <select
          name="type"
          value={filters.type}
          onChange={handleFilterChange}
        >
          <option value="">All Types</option>
          <option value="Perishable">Perishable</option>
          <option value="Non-Perishable">Non-Perishable</option>
        </select>

        <input
          type="text"
          name="category"
          placeholder="Filter by category id"
          value={filters.category}
          onChange={handleFilterChange}
        />
      </div>

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
              <th>Qty On Hand</th>
              <th>Qty Reserved</th>
              <th>Qty Available</th>
              <th>Avg Cost</th>
              <th>Total Value</th>
            </tr>
          </thead>
          <tbody>
            {inventory.length > 0 ? (
              inventory.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.code}</td>
                  <td>{item.name}</td>
                  <td>{item.category_name}</td>
                  <td>{item.type}</td>
                  <td>{item.unit}</td>
                  <td>{item.reorder_level}</td>
                  <td>{item.qty_on_hand}</td>
                  <td>{item.qty_reserved}</td>
                  <td>{item.qty_available}</td>
                  <td>{item.avg_unit_cost}</td>
                  <td>{item.total_value}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="12">No inventory records found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryListPage;