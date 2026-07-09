import { useEffect, useMemo, useState } from "react";
import api from "../utils/api";

const AddGrnModal = ({ onClose, onSuccess }) => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    purchase_order_id: "",
    received_date: new Date().toISOString().split("T")[0],
    remarks: "",
  });
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchPurchaseOrders = async () => {
      setLoadingOrders(true);
      setError("");
      try {
        const res = await api.get("/purchase-orders");

        const rows = Array.isArray(res.data) ? res.data : [];

        const sentPurchaseOrders = rows.filter(
          (po) => String(po.status || "").toLowerCase() === "sent"
        );

        setPurchaseOrders(sentPurchaseOrders);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load purchase orders");
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchPurchaseOrders();
  }, []);

  useEffect(() => {
    if (!form.purchase_order_id) return;

    const loadPoItems = async () => {
      setLoadingItems(true);
      setError("");
      setSuccess("");

      try {
        const res = await api.get(`/grn/po-items/${form.purchase_order_id}`);
        const rows = Array.isArray(res.data) ? res.data : [];

        setItems(
          rows.map((item) => ({
            purchase_order_item_id: item.purchase_order_item_id || null,
            item_id: item.item_id,
            ordered_quantity: Number(item.ordered_quantity || 0),
            delivered_quantity: Number(item.ordered_quantity || 0),
            item_name: item.item_name || "Unnamed Item",
            item_code: item.item_code || "—",
            unit: item.unit || "",
          }))
        );

        setSupplierId(rows?.[0]?.supplier_id || "");
        const selectedPo = purchaseOrders.find(
          (po) => String(po.id) === String(form.purchase_order_id)
        );
        setSupplierName(selectedPo?.supplier_name || "");
      } catch (err) {
        setError(err.response?.data?.error || err.response?.data?.message || "Failed to load PO items");
      } finally {
        setLoadingItems(false);
      }
    };

    loadPoItems();
  }, [form.purchase_order_id, purchaseOrders]);

  const totalVariance = useMemo(() => {
    return items.reduce(
      (sum, item) =>
        sum + (Number(item.delivered_quantity || 0) - Number(item.ordered_quantity || 0)),
      0
    );
  }, [items]);

  const handleHeaderChange = (e) => {
    const { name, value } = e.target;

    if (name === "purchase_order_id") {
      setItems([]);
      setSupplierId("");
      setSupplierName("");
      setError("");
      setSuccess("");
    }

    if (name === "received_date") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(value);
      if (!Number.isNaN(selected.getTime()) && selected < today) {
        setError("Received date cannot be before today.");
        return;
      }
      setError("");
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDeliveredChange = (index, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        delivered_quantity: value,
      };
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const cleanItems = items
      .map((item) => ({
        purchase_order_item_id: item.purchase_order_item_id
          ? Number(item.purchase_order_item_id)
          : null,
        item_id: Number(item.item_id),
        ordered_quantity: Number(item.ordered_quantity || 0),
        delivered_quantity: Number(item.delivered_quantity || 0),
      }))
      .filter((item) => item.item_id && item.delivered_quantity > 0);

    if (!form.purchase_order_id || !supplierId || !form.received_date || cleanItems.length === 0) {
      setError("Purchase order, received date, and at least one delivered line are required");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const receivedDate = new Date(form.received_date);

    if (!Number.isNaN(receivedDate.getTime()) && receivedDate < today) {
      setError("Received date cannot be before today.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/grn", {
        purchase_order_id: Number(form.purchase_order_id),
        supplier_id: Number(supplierId),
        received_date: form.received_date,
        remarks: form.remarks,
        items: cleanItems,
      });

      setSuccess("GRN created successfully");
      setTimeout(() => {
        onSuccess();
      }, 800);
    } catch (err) {
      const backendMessage = err.response?.data?.message || err.response?.data?.error;
      setError(backendMessage || "Failed to create GRN");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="md md-lg" onClick={(e) => e.stopPropagation()} style={{ width: "95%", maxWidth: 850 }}>
        <div className="md-h">
          <h3>📥 Create Goods Receiving Note</h3>
          <button type="button" className="md-x" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="md-b" style={{ maxHeight: "calc(85vh - 120px)", overflowY: "auto" }}>
            <div className="ib ib-s">
              <span>📦</span>
              <div>
                Enter the actual delivered quantity for each PO line. Current total variance:{" "}
                <strong>{totalVariance.toFixed(2)}</strong>
              </div>
            </div>

            {loadingOrders ? (
              <div className="ib ib-i">
                <span>⏳</span>
                <div>Loading purchase orders...</div>
              </div>
            ) : null}

            {loadingItems ? (
              <div className="ib ib-i">
                <span>⏳</span>
                <div>Loading PO items...</div>
              </div>
            ) : null}

            {error ? (
              <div className="ib ib-d">
                <span>⚠️</span>
                <div>{error}</div>
              </div>
            ) : null}

            {success ? (
              <div className="ib ib-s">
                <span>✅</span>
                <div>{success}</div>
              </div>
            ) : null}

            <div className="fs2">
              <div className="fst">GRN Header</div>

              <div className="fr">
                <div className="ff">
                  <label className="fl">Purchase Order</label>
                  <select
                    className="fc"
                    name="purchase_order_id"
                    value={form.purchase_order_id}
                    onChange={handleHeaderChange}
                  >
                    <option value="">Select purchase order</option>
                    {purchaseOrders.map((po) => (
                      <option key={po.id} value={po.id}>
                        {po.po_number} - {po.supplier_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ff">
                  <label className="fl">Received Date</label>
                  <input
                    className="fc"
                    type="date"
                    name="received_date"
                    value={form.received_date}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={handleHeaderChange}
                  />
                </div>
              </div>

              <div className="fr">
                <div className="ff">
                  <label className="fl">Supplier</label>
                  <input className="fc" value={supplierName || "Will populate from PO"} readOnly />
                </div>

                <div className="ff">
                  <label className="fl">Remarks</label>
                  <textarea
                    className="fc"
                    name="remarks"
                    value={form.remarks}
                    onChange={handleHeaderChange}
                    placeholder="Condition, temperature, packaging notes..."
                  />
                </div>
              </div>
            </div>

            {items.length > 0 ? (
              <div className="fs2">
                <div className="fst">Received Items</div>

                <div style={{ overflowX: "auto" }}>
                  <table className="it">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Code</th>
                        <th>Ordered Qty</th>
                        <th>Delivered Qty</th>
                        <th>Variance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => {
                        const variance =
                          Number(item.delivered_quantity || 0) - Number(item.ordered_quantity || 0);

                        return (
                          <tr key={`${item.item_id}-${index}`}>
                            <td>{item.item_name}</td>
                            <td>{item.item_code}</td>
                            <td>
                              {item.ordered_quantity} {item.unit}
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.delivered_quantity}
                                onChange={(e) => handleDeliveredChange(index, e.target.value)}
                              />
                            </td>
                            <td
                              style={{
                                fontWeight: 700,
                                color:
                                  variance < 0
                                    ? "var(--d)"
                                    : variance > 0
                                    ? "var(--s)"
                                    : "var(--text3)",
                              }}
                            >
                              {variance > 0 ? "+" : ""}
                              {variance.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>

          <div className="md-f">
            <button type="button" className="btn btn-s" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-p" disabled={saving}>
              {saving ? "Saving..." : "Save GRN"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddGrnModal;
