import { useEffect, useState } from "react";
import api from "../utils/api";

const ItemListPage = () => {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await api.get("/items", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setItems(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load items");
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return (
    <div>
      <div className="page-header-row">
        <h2>Items</h2>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="table-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Code</th>
              <th>Name</th>
              <th>Botanical Name</th>
              <th>Category</th>
              <th>Type</th>
              <th>Unit</th>
              <th>Reorder Level</th>
              <th>Unit Cost</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.code}</td>
                  <td>{item.name}</td>
                  <td>{item.botanical_name || "-"}</td>
                  <td>{item.category_name}</td>
                  <td>{item.type}</td>
                  <td>{item.unit}</td>
                  <td>{item.reorder_level}</td>
                  <td>{item.unit_cost}</td>
                  <td>{item.status}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10">No items found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ItemListPage;