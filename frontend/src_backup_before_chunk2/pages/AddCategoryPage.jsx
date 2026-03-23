import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

const AddCategoryPage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    category_name: "",
    description: "",
    status: "active",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");

      await api.post("/items/categories", form, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setSuccess("Category created successfully");

      setTimeout(() => {
        navigate("/categories");
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create category");
    }
  };

  return (
    <div className="form-page">
      <h2>Add Category</h2>

      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box">{success}</div>}

      <form className="custom-form" onSubmit={handleSubmit}>
        <input
          type="text"
          name="category_name"
          placeholder="Category Name"
          value={form.category_name}
          onChange={handleChange}
          required
        />

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

        <button type="submit">Save Category</button>
      </form>
    </div>
  );
};

export default AddCategoryPage;