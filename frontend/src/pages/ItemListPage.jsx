import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
      setError("Failed to load items");
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return (
    <div>
      <div className="page-header-row">
        <h2>Item Master</h2>
        <Link to="/items/add" className="add-btn">
          + Add Item
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
              <th>Category</th>
              <th>Unit</th>
              <th>Reorder Level</th>
              <th>Perishable</th>
              <th>Return Eligible</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.item_code}</td>
                  <td>{item.item_name}</td>
                  <td>{item.category_name}</td>
                  <td>{item.unit}</td>
                  <td>{item.reorder_level}</td>
                  <td>{item.is_perishable}</td>
                  <td>{item.return_eligibility}</td>
                  <td>{item.status}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9">No items found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ItemListPage;