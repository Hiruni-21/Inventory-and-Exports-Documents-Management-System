import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

const AddDispatchPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [inventory, setInventory] = useState([]);
  const [batches, setBatches] = useState([]);

  const [form, setForm] = useState({
    client_name: "",
    dispatch_date: "",
    remarks: "",
  });

  const [items, setItems] = useState([
    { item_id: "", batch_id: "", quantity: "" },
  ]);

  const [batchOptions, setBatchOptions] = useState({});
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
  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

const handleItemChange = async (index, field, value) => {
  const updated = [...items];
  updated[index][field] = value;

  if (field === "item_id") {
    updated[index].batch_id = "";
  }

  setItems(updated);

  if (field === "item_id" && value) {
    try {
      const res = await api.get(`/inventory/batches/${value}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setBatchOptions((prev) => ({
        ...prev,
        [index]: res.data,
      }));
    } catch {
      setError("Failed to load item batches");
    }
  }
};
  const addItemRow = () => {
    setItems([...items, { item_id: "", batch_id: "", quantity: "" }]);
  };

  const removeItemRow = (index) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await api.post(
        "/dispatch",
        {
          ...form,
          items,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSuccess("Dispatch created successfully");

      setTimeout(() => {
        navigate("/dispatch");
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create dispatch");
    }
  };

  return (
    <div className="form-page">
      <h2>Create Dispatch</h2>

      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box">{success}</div>}

      <form className="custom-form" onSubmit={handleSubmit}>
        <input
          type="text"
          name="client_name"
          placeholder="Client Name"
          value={form.client_name}
          onChange={handleFormChange}
          required
        />

        <input
          type="date"
          name="dispatch_date"
          value={form.dispatch_date}
          onChange={handleFormChange}
          required
        />

        <textarea
          name="remarks"
          placeholder="Remarks"
          rows="4"
          value={form.remarks}
          onChange={handleFormChange}
        />

        <h3>Dispatch Items</h3>

        {items.map((row, index) => (
          <div key={index} className="dispatch-item-row">
            <select
              value={row.item_id}
              onChange={(e) => handleItemChange(index, "item_id", e.target.value)}
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
            value={row.batch_id}
            onChange={(e) => handleItemChange(index, "batch_id", e.target.value)}
            required
            >
            <option value="">Select Batch</option>

            {(batchOptions[index] || []).map((batch) => (
                <option key={batch.id} value={batch.id}>
                {batch.batch_code} - Available: {batch.available_quantity} {batch.unit}
                </option>
            ))}

            {(batchOptions[index] || []).length === 0 && row.item_id && (
                <option value="" disabled>No available batches</option>
            )}
            </select>
            <input
              type="number"
              step="0.01"
              placeholder="Quantity"
              value={row.quantity}
              onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
              required
            />

            {items.length > 1 && (
              <button
                type="button"
                className="remove-btn"
                onClick={() => removeItemRow(index)}
              >
                Remove
              </button>
            )}
          </div>
        ))}

        <button type="button" className="secondary-btn" onClick={addItemRow}>
          + Add Another Item
        </button>

        <button type="submit">Save Dispatch</button>
      </form>
    </div>
  );
};

export default AddDispatchPage;