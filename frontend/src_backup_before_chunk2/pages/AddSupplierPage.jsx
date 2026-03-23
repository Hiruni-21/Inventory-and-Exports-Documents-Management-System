import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

const AddSupplierPage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    supplier_name: "",
    contact_number: "",
    email: "",
    address: "",
    lead_time_days: "",
    return_eligibility: "Yes",
    rating_score: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");

      await api.post("/suppliers", form, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setSuccess("Supplier added successfully");

      setTimeout(() => {
        navigate("/suppliers");
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add supplier");
    }
  };

  return (
    <div className="form-page">
      <h2>Add Supplier</h2>

      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box">{success}</div>}

      <form className="custom-form" onSubmit={handleSubmit}>
        <input
          type="text"
          name="supplier_name"
          placeholder="Supplier Name"
          value={form.supplier_name}
          onChange={handleChange}
          required
        />

        <input
          type="text"
          name="contact_number"
          placeholder="Contact Number"
          value={form.contact_number}
          onChange={handleChange}
          required
        />

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
        />

        <textarea
          name="address"
          placeholder="Address"
          value={form.address}
          onChange={handleChange}
          rows="4"
        />

        <input
          type="number"
          name="lead_time_days"
          placeholder="Lead Time (days)"
          value={form.lead_time_days}
          onChange={handleChange}
        />

        <select
          name="return_eligibility"
          value={form.return_eligibility}
          onChange={handleChange}
        >
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>

        <input
          type="number"
          step="0.01"
          name="rating_score"
          placeholder="Rating Score"
          value={form.rating_score}
          onChange={handleChange}
        />

        <button type="submit">Save Supplier</button>
      </form>
    </div>
  );
};

export default AddSupplierPage;