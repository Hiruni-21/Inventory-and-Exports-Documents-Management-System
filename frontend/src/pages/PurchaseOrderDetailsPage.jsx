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
            <Link to={`/grn/add?po=${purchaseOrder.id}`} className="btn btn-a">
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

      <div className="krow k3">
        <div className="kc">
          <div className="ki">📄</div>
          <div className="kv" style={{ fontSize: 26 }}>
            {purchaseOrder.po_number}
          </div>
          <div className="kl">PO Number</div>
        </div>

        <div className="kc">
          <div className="ki">📦</div>
          <div className="kv">{items.length}</div>
          <div className="kl">Line Items</div>
        </div>

        <div className="kc">
          <div className="ki">⚖️</div>
          <div className="kv">{totalQty}</div>
          <div className="kl">Total Ordered Qty</div>
        </div>
      </div>

      <div className="tw">
        <div className="tw-h">
          <h3>Purchase Order Details</h3>
          <span className={getStatusClass(purchaseOrder.status)}>
            {getStatusLabel(purchaseOrder.status)}
          </span>
        </div>

        <div style={{ padding: 20 }}>
          <div className="fst">Supplier</div>

          <div style={{ fontSize: 15, fontWeight: 800 }}>
            {purchaseOrder.supplier_name || "—"}
          </div>

          <div>{purchaseOrder.contact_number || "—"}</div>
          <div>{purchaseOrder.email || "—"}</div>

          <div className="fst" style={{ marginTop: 14 }}>
            Order Info
          </div>

          <div>
            <strong>Date Placed:</strong>{" "}
            {fmtDate(purchaseOrder.order_date || purchaseOrder.created_at)}
          </div>

          <div>
            <strong>Required By:</strong>{" "}
            {fmtDate(
              purchaseOrder.expected_delivery_date ||
                purchaseOrder.required_by ||
                purchaseOrder.expected_date
            )}
          </div>

          <div>
            <strong>Created By:</strong>{" "}
            {purchaseOrder.created_by_name ||
              purchaseOrder.requested_by_name ||
              purchaseOrder.created_by ||
              "—"}
          </div>

          <div>
            <strong>Total:</strong> {money(purchaseOrder.total_amount || totalAmount)}
          </div>

          <div className="fst" style={{ marginTop: 14 }}>
            Remarks
          </div>

          <div className="ib ib-i" style={{ marginBottom: 0 }}>
            <span>📝</span>
            <div>
              {purchaseOrder.remarks ||
                purchaseOrder.notes ||
                "No remarks added for this purchase order."}
            </div>
          </div>
        </div>
      </div>

      <div className="tw">
        <div className="tw-h">
          <h3>PO Items</h3>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Item Name</th>
              <th>Unit</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Line Total</th>
            </tr>
          </thead>

          <tbody>
            {items.length > 0 ? (
              items.map((item) => {
                const qty = Number(item.quantity || item.ordered_qty || 0);
                const unitPrice = Number(item.unit_price || 0);
                const lineTotal = Number(item.line_total || qty * unitPrice || 0);

                return (
                  <tr key={item.id || item.item_id}>
                    <td style={{ fontFamily: "monospace", color: "var(--text3)" }}>
                      {item.item_code || item.code || "—"}
                    </td>
                    <td style={{ fontWeight: 700 }}>{item.item_name || item.name || "—"}</td>
                    <td>{item.unit || "—"}</td>
                    <td>{qty.toFixed(2)}</td>
                    <td>{money(unitPrice)}</td>
                    <td style={{ fontWeight: 800 }}>{money(lineTotal)}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", color: "var(--text3)" }}>
                  No items found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PurchaseOrderDetailsPage;