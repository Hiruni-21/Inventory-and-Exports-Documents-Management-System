import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

const AddItemPage = () => {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    item_code: "",
    item_name: "",
    category_id: "",
    unit: "",
    reorder_level: "",
    is_perishable: "Yes",
    return_eligibility: "Yes",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await api.get("/categories", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setCategories(res.data);
    } catch (err) {
      setError("Failed to load categories");
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");

      await api.post("/items", form, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setSuccess("Item added successfully");

      setTimeout(() => {
        navigate("/items");
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add item");
    }
  };

  return (
    <div className="form-page">
      <h2>Add Item</h2>

      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box">{success}</div>}

      <form className="custom-form" onSubmit={handleSubmit}>
        <input
          type="text"
          name="item_code"
          placeholder="Item Code"
          value={form.item_code}
          onChange={handleChange}
          required
        />

        <input
          type="text"
          name="item_name"
          placeholder="Item Name"
          value={form.item_name}
          onChange={handleChange}
          required
        />

        <select
          name="category_id"
          value={form.category_id}
          onChange={handleChange}
          required
        >
          <option value="">Select Category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.category_name}
            </option>
          ))}
        </select>

        <input
          type="text"
          name="unit"
          placeholder="Unit (kg, pcs, bunch, box)"
          value={form.unit}
          onChange={handleChange}
          required
        />

        <input
          type="number"
          step="0.01"
          name="reorder_level"
          placeholder="Reorder Level"
          value={form.reorder_level}
          onChange={handleChange}
        />

        <select
          name="is_perishable"
          value={form.is_perishable}
          onChange={handleChange}
        >
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>

        <select
          name="return_eligibility"
          value={form.return_eligibility}
          onChange={handleChange}
        >
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>

        <button type="submit">Save Item</button>
      </form>
    </div>
  );
};

export default AddItemPage;