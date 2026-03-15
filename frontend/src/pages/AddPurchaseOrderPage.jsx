import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

const AddPurchaseOrderPage = () => {
  const navigate = useNavigate();

  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([
    { item_id: "", quantity: "" },
  ]);

  const [form, setForm] = useState({
    supplier_id: "",
    expected_delivery_date: "",
    remarks: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchSuppliers();
    fetchItems();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await api.get("/suppliers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuppliers(res.data);
    } catch (err) {
      setError("Failed to load suppliers");
    }
  };

  const fetchItems = async () => {
    try {
      const res = await api.get("/items", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(res.data);
    } catch (err) {
      setError("Failed to load items");
    }
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...selectedItems];
    updatedItems[index][field] = value;
    setSelectedItems(updatedItems);
  };

  const addItemRow = () => {
    setSelectedItems([...selectedItems, { item_id: "", quantity: "" }]);
  };

  const removeItemRow = (index) => {
    const updatedItems = selectedItems.filter((_, i) => i !== index);
    setSelectedItems(updatedItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await api.post(
        "/purchase-orders",
        {
          ...form,
          items: selectedItems,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSuccess("Purchase order created successfully");

      setTimeout(() => {
        navigate("/purchase-orders");
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create purchase order");
    }
  };

  return (
    <div className="form-page">
      <h2>Create Purchase Order</h2>

      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box">{success}</div>}

      <form className="custom-form" onSubmit={handleSubmit}>
        <select
          name="supplier_id"
          value={form.supplier_id}
          onChange={handleFormChange}
          required
        >
          <option value="">Select Supplier</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.supplier_name}
            </option>
          ))}
        </select>

        <input
          type="date"
          name="expected_delivery_date"
          value={form.expected_delivery_date}
          onChange={handleFormChange}
        />

        <textarea
          name="remarks"
          placeholder="Remarks"
          rows="4"
          value={form.remarks}
          onChange={handleFormChange}
        />

        <h3>PO Items</h3>

        {selectedItems.map((row, index) => (
          <div key={index} className="item-row">
            <select
              value={row.item_id}
              onChange={(e) => handleItemChange(index, "item_id", e.target.value)}
              required
            >
              <option value="">Select Item</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.item_name} ({item.item_code})
                </option>
              ))}
            </select>

            <input
              type="number"
              step="0.01"
              placeholder="Quantity"
              value={row.quantity}
              onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
              required
            />

            {selectedItems.length > 1 && (
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

        <button type="submit">Save Purchase Order</button>
      </form>
    </div>
  );
};

export default AddPurchaseOrderPage;