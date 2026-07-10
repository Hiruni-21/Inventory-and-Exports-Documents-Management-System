import { useEffect, useMemo, useState } from "react";
import api from "../utils/api";

const PRIMARY_GREEN = "#166534";
const PRIMARY_GREEN_HOVER = "#14532D";

const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(10,40,24,.42)",
  backdropFilter: "blur(3px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  zIndex: 500,
};

const modalCardStyle = {
  width: "100%",
  maxWidth: "850px",
  background: "var(--white)",
  borderRadius: "16px",
  boxShadow: "0 18px 48px rgba(10,40,24,.24), 0 6px 14px rgba(10,40,24,.12)",
  overflow: "hidden",
  border: "1px solid rgba(216,232,223,.9)",
  display: "flex",
  flexDirection: "column",
  maxHeight: "90vh",
};

const modalHeaderStyle = {
  padding: "16px 22px",
  borderBottom: "1px solid var(--border)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexShrink: 0,
};

const modalBodyStyle = {
  padding: "20px 22px 18px",
  overflowY: "auto",
};

const modalFooterStyle = {
  padding: "16px 22px",
  borderTop: "1px solid var(--border)",
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  flexShrink: 0,
};

const labelStyle = {
  display: "block",
  fontSize: "10px",
  fontWeight: 700,
  color: "var(--text2)",
  textTransform: "uppercase",
  letterSpacing: ".07em",
  marginBottom: "6px",
};

const inputStyle = {
  width: "100%",
  height: "40px",
  padding: "0 14px",
  border: "1.5px solid var(--border)",
  borderRadius: "10px",
  background: "var(--white)",
  color: "var(--text)",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: "12px",
  outline: "none",
};

const textareaStyle = {
  ...inputStyle,
  height: "80px",
  padding: "12px 14px",
  resize: "vertical",
};

const footerBtnSecondary = {
  height: "36px",
  padding: "0 18px",
  borderRadius: "10px",
  border: "1.5px solid var(--border)",
  background: "var(--white)",
  color: "var(--g700)",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: "12px",
  fontWeight: 700,
  cursor: "pointer",
};

const footerBtnPrimary = {
  height: "36px",
  padding: "0 18px",
  borderRadius: "10px",
  border: `1px solid ${PRIMARY_GREEN}`,
  background: PRIMARY_GREEN,
  color: "var(--white)",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: "12px",
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "none",
};

const AddGrnModal = ({ onClose, onSuccess, initialPoId = "" }) => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    purchase_order_id: initialPoId,
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

        // Allow sent, received, closed POs depending on backend, for now matching existing filter
        const validPurchaseOrders = rows.filter(
          (po) => String(po.status || "").toLowerCase() === "sent" || String(po.status || "").toLowerCase() === "accepted" || String(po.status || "").toLowerCase() === "closed" || String(po.status || "").toLowerCase() === "received" || po.id === Number(initialPoId)
        );

        setPurchaseOrders(validPurchaseOrders);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load purchase orders");
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchPurchaseOrders();
  }, [initialPoId]);

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
        if (selectedPo) {
          setSupplierName(selectedPo.supplier_name || "");
        }
      } catch (err) {
        setError(err.response?.data?.error || err.response?.data?.message || "Failed to load PO items");
      } finally {
        setLoadingItems(false);
      }
    };

    if (purchaseOrders.length > 0 || initialPoId) {
      loadPoItems();
    }
  }, [form.purchase_order_id, purchaseOrders, initialPoId]);

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
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "var(--g900)" }}>
            📥 Create Goods Receiving Note
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: "1.5px solid var(--border)",
              background: "var(--white)",
              color: "var(--text2)",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={modalBodyStyle}>
            <div className="ib ib-s" style={{ marginBottom: 16 }}>
              <span>📦</span>
              <div>
                Enter the actual delivered quantity for each PO line. Current total variance:{" "}
                <strong>{totalVariance.toFixed(2)}</strong>
              </div>
            </div>

            {loadingOrders && (
              <div className="ib ib-i" style={{ marginBottom: 12 }}>
                <span>⏳</span>
                <div>Loading purchase orders...</div>
              </div>
            )}

            {loadingItems && (
              <div className="ib ib-i" style={{ marginBottom: 12 }}>
                <span>⏳</span>
                <div>Loading PO items...</div>
              </div>
            )}

            {error && (
              <div className="ib ib-d" style={{ marginBottom: 12 }}>
                <span>⚠️</span>
                <div>{error}</div>
              </div>
            )}

            {success && (
              <div className="ib ib-s" style={{ marginBottom: 12 }}>
                <span>✅</span>
                <div>{success}</div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Purchase Order <span className="rq">*</span></label>
                <select
                  style={inputStyle}
                  name="purchase_order_id"
                  value={form.purchase_order_id}
                  onChange={handleHeaderChange}
                  disabled={!!initialPoId}
                >
                  <option value="">Select purchase order</option>
                  {purchaseOrders.map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.po_number} - {po.supplier_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Received Date <span className="rq">*</span></label>
                <input
                  style={inputStyle}
                  type="date"
                  name="received_date"
                  value={form.received_date}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={handleHeaderChange}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
              <div>
                <label style={labelStyle}>Supplier</label>
                <input style={inputStyle} value={supplierName || "Will populate from PO"} readOnly />
              </div>

              <div>
                <label style={labelStyle}>Remarks</label>
                <textarea
                  style={{ ...textareaStyle, height: "40px" }}
                  name="remarks"
                  value={form.remarks}
                  onChange={handleHeaderChange}
                  placeholder="Condition, packaging notes..."
                />
              </div>
            </div>

            {items.length > 0 && (
              <div>
                <label style={labelStyle}>Received Items</label>
                <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 10 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
                        <th style={{ padding: "10px 14px", fontWeight: 700, color: "var(--text2)" }}>Item</th>
                        <th style={{ padding: "10px 14px", fontWeight: 700, color: "var(--text2)" }}>Code</th>
                        <th style={{ padding: "10px 14px", fontWeight: 700, color: "var(--text2)", textAlign: "right" }}>Ordered</th>
                        <th style={{ padding: "10px 14px", fontWeight: 700, color: "var(--text2)", textAlign: "center" }}>Delivered</th>
                        <th style={{ padding: "10px 14px", fontWeight: 700, color: "var(--text2)", textAlign: "right" }}>Variance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => {
                        const variance = Number(item.delivered_quantity || 0) - Number(item.ordered_quantity || 0);
                        return (
                          <tr key={`${item.item_id}-${index}`} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td style={{ padding: "10px 14px", fontWeight: 600, color: "var(--g900)" }}>{item.item_name}</td>
                            <td style={{ padding: "10px 14px", color: "var(--text2)" }}>{item.item_code}</td>
                            <td style={{ padding: "10px 14px", textAlign: "right", color: "var(--g900)" }}>
                              {item.ordered_quantity} {item.unit}
                            </td>
                            <td style={{ padding: "6px 14px", textAlign: "center" }}>
                              <input
                                style={{ ...inputStyle, width: "100px", textAlign: "right" }}
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.delivered_quantity}
                                onChange={(e) => handleDeliveredChange(index, e.target.value)}
                              />
                            </td>
                            <td
                              style={{
                                padding: "10px 14px",
                                textAlign: "right",
                                fontWeight: 700,
                                color: variance < 0 ? "var(--d)" : variance > 0 ? "var(--s)" : "var(--text3)",
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
            )}
          </div>

          <div style={modalFooterStyle}>
            <button type="button" style={footerBtnSecondary} onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              style={footerBtnPrimary}
              disabled={saving}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = PRIMARY_GREEN_HOVER;
                e.currentTarget.style.borderColor = PRIMARY_GREEN_HOVER;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = PRIMARY_GREEN;
                e.currentTarget.style.borderColor = PRIMARY_GREEN;
              }}
            >
              {saving ? "Saving..." : "Save GRN"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddGrnModal;
