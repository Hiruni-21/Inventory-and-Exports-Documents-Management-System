import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../utils/api";

const fmtDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-CA");
};

const money = (value) =>
  `LKR ${Number(value || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

const getStatusLabel = (status) => {
  const value = String(status || "").toLowerCase();

  if (value.includes("pending") || value.includes("await")) return "Awaiting Approval";
  if (value.includes("approved")) return "Approved";
  if (value.includes("sent")) return "Sent";
  if (value.includes("accepted")) return "Accepted";
  if (value.includes("closed") || value.includes("received")) return "Closed";
  if (value.includes("draft")) return "Draft";

  return status || "Draft";
};

const getStatusClass = (status) => {
  const value = String(status || "").toLowerCase();

  if (value.includes("approved")) return "badge bg-g";
  if (value.includes("sent")) return "badge bg-b";
  if (value.includes("accepted")) return "badge bg-a";
  if (value.includes("closed") || value.includes("received")) return "badge bg-p";
  if (value.includes("draft")) return "badge bg-x";

  return "badge bg-a";
};

const PurchaseOrderDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [sending, setSending] = useState(false);

  const loadPurchaseOrder = async () => {
    setLoading(true);
    setPageError("");

    try {
      const res = await api.get(`/purchase-orders/${id}`);
      setPurchaseOrder(res.data || null);
    } catch (err) {
      setPageError(err.response?.data?.message || "Failed to load purchase order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPurchaseOrder();
  }, [id]);

  const items = purchaseOrder?.items || [];

  const totalQty = useMemo(() => {
    return items.reduce((sum, item) => {
      return sum + Number(item.quantity || item.ordered_qty || 0);
    }, 0);
  }, [items]);

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      const qty = Number(item.quantity || item.ordered_qty || 0);
      const price = Number(item.unit_price || 0);
      const lineTotal = Number(item.line_total || qty * price || 0);
      return sum + lineTotal;
    }, 0);
  }, [items]);

  const status = String(purchaseOrder?.status || "").toLowerCase();

  const canSend = status === "approved";

  const canCreateGrn =
    status === "sent" ||
    status === "accepted" ||
    status === "closed" ||
    status === "received";

  const handleSendPurchaseOrder = async () => {
    const confirmed = window.confirm(
      "Do you want to email this purchase order PDF to the supplier?"
    );

    if (!confirmed) return;

    setSending(true);
    setActionMessage("");
    setActionError("");

    try {
      const res = await api.post(`/purchase-orders/${id}/send-email`);

      setActionMessage(res.data?.message || "Purchase order PDF emailed successfully");

      if (res.data?.documentUrl) {
        window.open(res.data.documentUrl, "_blank");
      }

      await loadPurchaseOrder();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to email purchase order PDF");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="ib ib-i">
        <span>⏳</span>
        <div>Loading purchase order...</div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="ib ib-d">
        <span>⚠️</span>
        <div>{pageError}</div>
      </div>
    );
  }

  if (!purchaseOrder) {
    return (
      <div className="ib ib-d">
        <span>⚠️</span>
        <div>Purchase order not found</div>
      </div>
    );
  }

  return (
    <div>
      <div className="fb" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <button type="button" className="btn btn-s" onClick={() => navigate("/purchase-orders")}>
          ← Back
        </button>

        <div className="fb" style={{ marginBottom: 0 }}>
          {canSend ? (
            <button
              type="button"
              className="btn btn-p"
              onClick={handleSendPurchaseOrder}
              disabled={sending}
            >
              {sending ? "Sending..." : "Send PO"}
            </button>
          ) : null}

          {canCreateGrn ? (
            <Link to={`/grn/add?po=${purchaseOrder.id}`} className="btn btn-p">
              Create GRN
            </Link>
          ) : null}
        </div>
      </div>

      {actionMessage ? (
        <div className="ib ib-s">
          <span>✅</span>
          <div>{actionMessage}</div>
        </div>
      ) : null}

      {actionError ? (
        <div className="ib ib-d">
          <span>⚠️</span>
          <div>{actionError}</div>
        </div>
      ) : null}

      {status === "pending_approval" ? (
        <div className="ib ib-w">
          <span>⚠️</span>
          <div>This purchase order is waiting for manager approval. Send button appears after approval.</div>
        </div>
      ) : null}

      {status === "approved" ? (
        <div className="ib ib-s">
          <span>✅</span>
          <div>This purchase order is approved. You can now send it to the supplier.</div>
        </div>
      ) : null}

      {status === "sent" ? (
        <div className="ib ib-i">
          <span>📨</span>
          <div>This purchase order has been sent to the supplier. You can create the GRN after receiving goods.</div>
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 16, boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)", padding: "22px 24px", minHeight: 140 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6B7280", marginBottom: 12 }}>
            PO Number
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#111827", lineHeight: 1.2, wordBreak: "break-word" }}>{purchaseOrder.po_number || "—"}</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 10 }}>Purchase Order reference</div>
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 16, boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)", padding: "22px 24px", minHeight: 140 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6B7280", marginBottom: 12 }}>
            Total Items
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>{items.length}</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 10 }}>Ordered item lines</div>
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 16, boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)", padding: "22px 24px", minHeight: 140 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6B7280", marginBottom: 12 }}>
            Quantity Ordered
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>{totalQty}</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 10 }}>Total ordered quantity</div>
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 16, boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)", padding: "22px 24px", minHeight: 140 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6B7280", marginBottom: 12 }}>
            Total Amount
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>{money(purchaseOrder.total_amount || totalAmount)}</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 10 }}>Total estimated order value</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
        <section style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 16, boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)" }}>
          <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid #E5E7EB" }}>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#111827" }}>Supplier Information</h3>
          </div>
          <div style={{ padding: "20px 24px", display: "grid", gap: 14 }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280" }}>Company Name</span>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginTop: 4 }}>{purchaseOrder.supplier_name}</div>
            </div>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280" }}>Contact Number</span>
              <div style={{ fontSize: 15, color: "#374151", marginTop: 4 }}>{purchaseOrder.contact_number || "—"}</div>
            </div>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280" }}>Email</span>
              <div style={{ fontSize: 15, color: "#374151", marginTop: 4 }}>{purchaseOrder.email || "—"}</div>
            </div>
          </div>
        </section>

        <section style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 16, boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)" }}>
          <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#111827" }}>Order Details</h3>
            <span className={getStatusClass(purchaseOrder.status)}>
              {getStatusLabel(purchaseOrder.status)}
            </span>
          </div>
          <div style={{ padding: "20px 24px", display: "grid", gap: 14 }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280" }}>Date Placed</span>
              <div style={{ fontSize: 15, color: "#374151", marginTop: 4 }}>
                {fmtDate(purchaseOrder.order_date || purchaseOrder.created_at)}
              </div>
            </div>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280" }}>Required By</span>
              <div style={{ fontSize: 15, color: "#374151", marginTop: 4 }}>
                {fmtDate(
                  purchaseOrder.expected_delivery_date ||
                    purchaseOrder.required_by ||
                    purchaseOrder.expected_date
                )}
              </div>
            </div>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280" }}>Created By</span>
              <div style={{ fontSize: 15, color: "#374151", marginTop: 4 }}>
                {purchaseOrder.created_by_name ||
                  purchaseOrder.requested_by_name ||
                  purchaseOrder.created_by ||
                  "—"}
              </div>
            </div>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280" }}>Remarks</span>
              <div style={{ fontSize: 15, color: "#374151", marginTop: 4 }}>
                {purchaseOrder.remarks ||
                  purchaseOrder.notes ||
                  "No remarks added for this purchase order."}
              </div>
            </div>
          </div>
        </section>
      </div>

      <section style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 16, boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)", marginBottom: 24 }}>
        <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#111827" }}>Ordered Items</h3>
            <p style={{ margin: 0, fontSize: 13, color: "#6B7280" }}>All items on this purchase order with quantity and unit cost details.</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ borderRadius: 999, background: "#EEF2F6", color: "#4F46E5", padding: "6px 12px", fontSize: 12, fontWeight: 700 }}>
              {items.length} Item Lines
            </span>
            <span style={{ borderRadius: 999, background: "#ECFDF5", color: "#059669", padding: "6px 12px", fontSize: 12, fontWeight: 700 }}>
              {totalQty} Ordered
            </span>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #E5E7EB", background: "#F9FAFB" }}>
                <th style={{ padding: "14px 18px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#475569" }}>Item Code</th>
                <th style={{ padding: "14px 18px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#475569" }}>Item Name</th>
                <th style={{ padding: "14px 18px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#475569" }}>Unit</th>
                <th style={{ padding: "14px 18px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#475569", textAlign: "right" }}>Quantity</th>
                <th style={{ padding: "14px 18px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#475569", textAlign: "right" }}>Unit Price</th>
                <th style={{ padding: "14px 18px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#475569", textAlign: "right" }}>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item, index) => {
                  const qty = Number(item.quantity || item.ordered_qty || 0);
                  const unitPrice = Number(item.unit_price || 0);
                  const lineTotal = Number(item.line_total || qty * unitPrice || 0);

                  return (
                    <tr key={item.id || item.item_id} style={{ background: index % 2 === 0 ? "#FFFFFF" : "#F8FAFC", transition: "background 0.2s ease" }}>
                      <td style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace", fontSize: 12, color: "#475569", padding: "16px 18px" }}>
                        {item.item_code || item.code || "—"}
                      </td>
                      <td style={{ fontWeight: 600, padding: "16px 18px", color: "#0F172A" }}>{item.item_name || item.name || "—"}</td>
                      <td style={{ padding: "16px 18px", color: "#0F172A" }}>{item.unit || "—"}</td>
                      <td style={{ padding: "16px 18px", textAlign: "right", color: "#0F172A" }}>{qty.toFixed(2)}</td>
                      <td style={{ padding: "16px 18px", textAlign: "right", color: "#0F172A" }}>{money(unitPrice)}</td>
                      <td style={{ padding: "16px 18px", textAlign: "right", color: "#0F172A", fontWeight: 800 }}>{money(lineTotal)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", color: "#6B7280", padding: 24 }}>
                    No items found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default PurchaseOrderDetailsPage;