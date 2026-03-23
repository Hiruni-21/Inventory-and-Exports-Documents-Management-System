import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

const AddGrnPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [poItems, setPoItems] = useState([]);
  const [supplierId, setSupplierId] = useState("");

  const [form, setForm] = useState({
    purchase_order_id: "",
    received_date: "",
    received_time: "",
    remarks: "",
  });

  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchPurchaseOrders = async () => {
    try {
      const res = await api.get("/purchase-orders", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setPurchaseOrders(res.data);
    } catch (err) {
      setError("Failed to load purchase orders");
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  const handleFormChange = async (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    if (name === "purchase_order_id" && value) {
      try {
        const res = await api.get(`/grn/po-items/${value}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setPoItems(res.data);
        setSupplierId(res.data[0]?.supplier_id || "");
        setItems(
          res.data.map((item) => ({
            item_id: item.item_id,
            ordered_quantity: item.ordered_quantity,
            delivered_quantity: "",
            item_name: item.item_name,
            item_code: item.item_code,
            unit: item.unit,
          }))
        );
      } catch (err) {
        setError("Failed to load PO items");
      }
    }
  };

  const handleDeliveredChange = (index, value) => {
    const updatedItems = [...items];
    updatedItems[index].delivered_quantity = value;
    setItems(updatedItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await api.post(
        "/grn",
        {
          ...form,
          supplier_id: supplierId,
          items,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSuccess("GRN created successfully");

      setTimeout(() => {
        navigate("/grn");
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create GRN");
    }
  };

  return (
    <div className="form-page">
      <h2>Create Goods Receiving Note</h2>

      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box">{success}</div>}

      <form className="custom-form" onSubmit={handleSubmit}>
        <select
          name="purchase_order_id"
          value={form.purchase_order_id}
          onChange={handleFormChange}
          required
        >
          <option value="">Select Purchase Order</option>
          {purchaseOrders.map((po) => (
            <option key={po.id} value={po.id}>
              {po.po_number} - {po.supplier_name}
            </option>
          ))}
        </select>

        <input
          type="date"
          name="received_date"
          value={form.received_date}
          onChange={handleFormChange}
          required
        />

        <input
          type="time"
          name="received_time"
          value={form.received_time}
          onChange={handleFormChange}
        />

        <textarea
          name="remarks"
          placeholder="Remarks"
          rows="4"
          value={form.remarks}
          onChange={handleFormChange}
        />

        {items.length > 0 && (
          <>
            <h3>Received Items</h3>

            {items.map((item, index) => (
              <div key={index} className="item-row-grn">
                <div className="grn-item-box">
                  <strong>
                    {item.item_name} ({item.item_code})
                  </strong>
                  <p>Ordered: {item.ordered_quantity} {item.unit}</p>
                </div>

                <input
                  type="number"
                  step="0.01"
                  placeholder="Delivered Quantity"
                  value={item.delivered_quantity}
                  onChange={(e) => handleDeliveredChange(index, e.target.value)}
                  required
                />
              </div>
            ))}
          </>
        )}

        <button type="submit">Save GRN</button>
      </form>
    </div>
  );
};

export default AddGrnPage;