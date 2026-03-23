import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

const AddWastagePage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [inventory, setInventory] = useState([]);
  const [batches, setBatches] = useState([]);

  const [form, setForm] = useState({
    item_id: "",
    batch_id: "",
    quantity: "",
    reason: "",
    notes: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchInventory();
  }, []);

const fetchInventory = async () => {
  try {
    const res = await api.get("/inventory", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const availableItems = res.data.filter(
      (item) => Number(item.total_available_quantity) > 0
    );

    setInventory(availableItems);
  } catch {
    setError("Failed to load inventory");
  }
};
const handleChange = async (e) => {
  const { name, value } = e.target;

  const updatedForm = { ...form, [name]: value };

  if (name === "item_id") {
    updatedForm.batch_id = "";
  }

  setForm(updatedForm);

  if (name === "item_id" && value) {
    try {
      const res = await api.get(`/inventory/batches/${value}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBatches(res.data);
    } catch {
      setError("Failed to load item batches");
    }
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await api.post("/wastage", form, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccess("Wastage recorded successfully");

      setTimeout(() => {
        navigate("/wastage");
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to record wastage");
    }
  };

  return (
    <div className="form-page">
      <h2>Record Wastage</h2>

      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box">{success}</div>}

      <form className="custom-form" onSubmit={handleSubmit}>
        <select name="item_id" value={form.item_id} onChange={handleChange} required>
          <option value="">Select Item</option>
          {inventory.map((item) => (
            <option key={item.item_id} value={item.item_id}>
              {item.item_name} ({item.item_code})
            </option>
          ))}
        </select>

        <select name="batch_id" value={form.batch_id} onChange={handleChange} required>
          <option value="">Select Batch</option>

          {batches.map((batch) => (
            <option key={batch.id} value={batch.id}>
              {batch.batch_code} - Available: {batch.available_quantity} {batch.unit}
            </option>
          ))}

          {batches.length === 0 && form.item_id && (
            <option value="" disabled>No available batches</option>
          )}
        </select>

        
        <input
          type="number"
          step="0.01"
          name="quantity"
          placeholder="Wastage Quantity"
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

        <button type="submit">Save Wastage</button>
      </form>
    </div>
  );
};

export default AddWastagePage;