import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

const AddItemPage = () => {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    code: "",
    name: "",
    botanical_name: "",
    category_id: "",
    type: "Perishable",
    unit: "kg",
    shelf_life_days: "",
    reorder_level: "",
    storage_temp: "",
    unit_cost: "",
    returnable: 1,
    description: "",
    status: "active",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await api.get("/items/categories", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setCategories(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load categories");
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleChange = (e) => {
    const value =
      e.target.name === "returnable"
        ? Number(e.target.value)
        : e.target.value;

    setForm((prev) => ({
      ...prev,
      [e.target.name]: value,
    }));
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

      setSuccess("Item created successfully");

      setTimeout(() => {
        navigate("/items");
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create item");
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
          name="code"
          placeholder="Item Code"
          value={form.code}
          onChange={handleChange}
          required
        />

        <input
          type="text"
          name="name"
          placeholder="Item Name"
          value={form.name}
          onChange={handleChange}
          required
        />

        <input
          type="text"
          name="botanical_name"
          placeholder="Botanical Name"
          value={form.botanical_name}
          onChange={handleChange}
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

        <select
          name="type"
          value={form.type}
          onChange={handleChange}
        >
          <option value="Perishable">Perishable</option>
          <option value="Non-Perishable">Non-Perishable</option>
        </select>

        <input
          type="text"
          name="unit"
          placeholder="Unit (e.g. kg, pcs)"
          value={form.unit}
          onChange={handleChange}
          required
        />

        <input
          type="number"
          name="shelf_life_days"
          placeholder="Shelf Life (days)"
          value={form.shelf_life_days}
          onChange={handleChange}
        />

        <input
          type="number"
          step="0.01"
          name="reorder_level"
          placeholder="Reorder Level"
          value={form.reorder_level}
          onChange={handleChange}
        />

        <input
          type="text"
          name="storage_temp"
          placeholder="Storage Temperature"
          value={form.storage_temp}
          onChange={handleChange}
        />

        <input
          type="number"
          step="0.01"
          name="unit_cost"
          placeholder="Unit Cost"
          value={form.unit_cost}
          onChange={handleChange}
        />

        <select
          name="returnable"
          value={form.returnable}
          onChange={handleChange}
        >
          <option value={1}>Returnable</option>
          <option value={0}>Not Returnable</option>
        </select>

        <textarea
          name="description"
          placeholder="Description"
          value={form.description}
          onChange={handleChange}
          rows="4"
        />

        <select
          name="status"
          value={form.status}
          onChange={handleChange}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <button type="submit">Save Item</button>
      </form>
    </div>
  );
};

export default AddItemPage;