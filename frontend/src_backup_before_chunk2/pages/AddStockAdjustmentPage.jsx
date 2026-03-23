import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

const AddStockAdjustmentPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [inventory, setInventory] = useState([]);
  const [batches, setBatches] = useState([]);

  const [form, setForm] = useState({
    item_id: "",
    batch_id: "",
    adjustment_type: "IN",
    quantity: "",
    reason: "",
    notes: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchInventory = async () => {
    try {
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

  const handleChange = async (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    if (name === "item_id" && value) {
      try {
        const res = await api.get(`/inventory/batches/${value}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setBatches(res.data);
      } catch (err) {
        setError("Failed to load item batches");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await api.post("/stock-adjustments", form, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setSuccess("Stock adjustment saved successfully");

      setTimeout(() => {
        navigate("/stock-adjustments");
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save stock adjustment");
    }
  };

  return (
    <div className="form-page">
      <h2>Add Stock Adjustment</h2>

      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box">{success}</div>}

      <form className="custom-form" onSubmit={handleSubmit}>
        <select
          name="item_id"
          value={form.item_id}
          onChange={handleChange}
          required
        >
          <option value="">Select Item</option>
          {inventory.map((item) => (
            <option key={item.item_id} value={item.item_id}>
              {item.item_name} ({item.item_code})
            </option>
          ))}
        </select>

        <select
          name="batch_id"
          value={form.batch_id}
          onChange={handleChange}
          required
        >
          <option value="">Select Batch</option>
          {batches.map((batch) => (
            <option key={batch.id} value={batch.id}>
              {batch.batch_code} - Available: {batch.available_quantity} {batch.unit}
            </option>
          ))}
        </select>

        <select
          name="adjustment_type"
          value={form.adjustment_type}
          onChange={handleChange}
          required
        >
          <option value="IN">IN (Add Stock)</option>
          <option value="OUT">OUT (Remove Stock)</option>
        </select>

        <input
          type="number"
          step="0.01"
          name="quantity"
          placeholder="Quantity"
          value={form.quantity}
          onChange={handleChange}
          required
        />

        <input
          type="text"
          name="reason"
          placeholder="Reason"
          value={form.reason}
          onChange={handleChange}
          required
        />

        <textarea
          name="notes"
          placeholder="Notes"
          rows="4"
          value={form.notes}
          onChange={handleChange}
        />

        <button type="submit">Save Adjustment</button>
      </form>
    </div>
  );
};

export default AddStockAdjustmentPage;