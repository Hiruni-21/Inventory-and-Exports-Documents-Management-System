import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Eye, FileText, Mail, MessageCircle } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const API_ROOT =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5001/api";

const BACKEND_BASE_URL = API_ROOT.replace(/\/api\/?$/, "");

const fmtDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-CA");
};

const money = (value) =>
  Number(value || 0).toLocaleString("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const roleOf = (role) => String(role || "").toLowerCase();

const statusBadgeClass = (status) => {
  const value = String(status || "draft").toLowerCase();
  if (value === "approved") return "badge bg-g";
  if (value === "sent") return "badge bg-b";
  if (value === "grn_created" || value === "closed") return "badge bg-p";
  if (value === "draft") return "badge bg-x";
  return "badge bg-a";
};

const statusLabel = (status) => {
  const value = String(status || "draft").toLowerCase();
  if (value === "pending_approval") return "Awaiting Approval";
  if (value === "grn_created") return "GRN Created";
  return value.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
};

export default function PurchaseOrderDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [lastPdfUrl, setLastPdfUrl] = useState("");

  const canSend =
    roleOf(user?.role).includes("manager") ||
    roleOf(user?.role).includes("operation") ||
    roleOf(user?.role).includes("ops");

  const loadPo = async () => {
    try {
      setLoading(true);
      setPageError("");
      const res = await api.get(`/purchase-orders/${id}`);
      setPurchaseOrder(res.data || null);
    } catch (err) {
      setPageError(err?.response?.data?.message || "Failed to load purchase order details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPo();
  }, [id]);

  const totalQty = useMemo(() => {
    return (purchaseOrder?.items || []).reduce(
      (sum, item) => sum + Number(item.ordered_qty || 0),
      0
    );
  }, [purchaseOrder]);

  const status = String(purchaseOrder?.status || "draft").toLowerCase();
  const sendAllowed = canSend && ["approved", "sent", "grn_created", "closed"].includes(status);

  const buildAbsoluteFileUrl = (fileUrl) => {
    if (!fileUrl) return "";
    if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
    return `${BACKEND_BASE_URL}${fileUrl}`;
  };

  const renderPdf = async (openAfterRender = false) => {
    try {
      setActionLoading(openAfterRender ? "view-pdf" : "render-pdf");

      const res = await api.post(`/purchase-orders/${id}/render-pdf`);
      const url =
        res.data?.downloadUrl ||
        buildAbsoluteFileUrl(res.data?.fileUrl || `/uploads/purchase-orders/${purchaseOrder?.po_number}.pdf`);

      if (url) {
        setLastPdfUrl(url);
      }

      toast.success("Purchase order PDF generated");

      if (openAfterRender && url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to generate PDF");
    } finally {
      setActionLoading("");
    }
  };

  const viewPdf = async () => {
    if (lastPdfUrl) {
      window.open(lastPdfUrl, "_blank", "noopener,noreferrer");
      return;
    }

    await renderPdf(true);
  };

  const sendEmail = async () => {
    try {
      setActionLoading("send-email");
      const res = await api.post(`/purchase-orders/${id}/send-email`);

      if (res.data?.fileUrl) {
        setLastPdfUrl(buildAbsoluteFileUrl(res.data.fileUrl));
      }

      toast.success(res.data?.message || "Purchase order email sent");
      await loadPo();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to send purchase order email");
    } finally {
      setActionLoading("");
    }
  };

  const sendWhatsapp = async () => {
    try {
      setActionLoading("send-whatsapp");
      const res = await api.post(`/purchase-orders/${id}/send-whatsapp`);

      if (res.data?.fileUrl) {
        setLastPdfUrl(buildAbsoluteFileUrl(res.data.fileUrl));
      }

      toast.success(res.data?.message || "Purchase order WhatsApp message sent");
      await loadPo();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to send purchase order WhatsApp");
    } finally {
      setActionLoading("");
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

  if (!purchaseOrder) return null;

  return (
    <>
      <div
        className="fb"
        style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}
      >
        <div className="fb" style={{ marginBottom: 0, gap: 10 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/purchase-orders")}
          >
            <ArrowLeft size={16} /> Back
          </button>
        </div>

        <div className="fb" style={{ marginBottom: 0, gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => renderPdf(false)}
            disabled={actionLoading === "render-pdf"}
          >
            <FileText size={16} /> {actionLoading === "render-pdf" ? "Rendering..." : "Render PDF"}
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={viewPdf}
            disabled={actionLoading === "view-pdf"}
          >
            <Eye size={16} /> {actionLoading === "view-pdf" ? "Opening..." : "View PDF"}
          </button>

          {sendAllowed ? (
            <>
              <button
                type="button"
                className="btn btn-primary"
                onClick={sendEmail}
                disabled={actionLoading === "send-email"}
              >
                <Mail size={16} /> {actionLoading === "send-email" ? "Sending..." : "Send Email"}
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={sendWhatsapp}
                disabled={actionLoading === "send-whatsapp"}
              >
                <MessageCircle size={16} /> {actionLoading === "send-whatsapp" ? "Sending..." : "Send WhatsApp"}
              </button>
            </>
          ) : null}

          {(status === "sent" || status === "grn_created") ? (
            <Link to={`/grn/add?po=${purchaseOrder.id}`} className="btn btn-secondary">
              Create GRN
            </Link>
          ) : null}
        </div>
      </div>

      {status === "pending_approval" ? (
        <div className="ib ib-w">
          <span>⚠️</span>
          <div>
            This PO is waiting for manager approval. Send actions will appear after approval.
          </div>
        </div>
      ) : null}

      {status === "approved" ? (
        <div className="ib ib-s">
          <span>✅</span>
          <div>
            This PO is approved and ready to be sent to the supplier.
          </div>
        </div>
      ) : null}

      <div className="krow k3">
        <div className="kc g">
          <div className="kv" style={{ fontSize: 22 }}>
            {purchaseOrder.po_number}
          </div>
          <div className="kl">PO Number</div>
        </div>
        <div className="kc a">
          <div className="kv">{purchaseOrder.item_count || purchaseOrder.items?.length || 0}</div>
          <div className="kl">Line Items</div>
        </div>
        <div className="kc b">
          <div className="kv">{money(purchaseOrder.total_amount)}</div>
          <div className="kl">Total Value</div>
        </div>
      </div>

      <div className="content-card" style={{ marginBottom: 16 }}>
        <div className="card-header-row">
          <h3>Purchase Order Details</h3>
          <span className={statusBadgeClass(purchaseOrder.status)}>
            {statusLabel(purchaseOrder.status)}
          </span>
        </div>

        <div style={{ padding: 20 }}>
          <div className="details-panel-grid" style={{ marginBottom: 14 }}>
            <div className="details-stat-card">
              <label>SUPPLIER</label>
              <span>{purchaseOrder.supplier_name}</span>
            </div>

            <div className="details-stat-card">
              <label>REQUIRED BY</label>
              <span>{fmtDate(purchaseOrder.expected_date)}</span>
            </div>

            <div className="details-stat-card">
              <label>DATE PLACED</label>
              <span>{fmtDate(purchaseOrder.order_date || purchaseOrder.created_at)}</span>
            </div>

            <div className="details-stat-card">
              <label>PAYMENT TERMS</label>
              <span>{purchaseOrder.payment_terms || "—"}</span>
            </div>

            <div className="details-stat-card">
              <label>REQUESTED BY</label>
              <span>{purchaseOrder.requested_by_name || "—"}</span>
            </div>

            <div className="details-stat-card">
              <label>APPROVED BY</label>
              <span>{purchaseOrder.approved_by_name || "—"}</span>
            </div>

            <div className="details-stat-card">
              <label>SUPPLIER EMAIL</label>
              <span>{purchaseOrder.email || "—"}</span>
            </div>

            <div className="details-stat-card">
              <label>WHATSAPP</label>
              <span>{purchaseOrder.whatsapp_number || purchaseOrder.contact_number || "—"}</span>
            </div>

            <div className="details-stat-card details-stat-card-full">
              <label>NOTES</label>
              <span>{purchaseOrder.notes || "—"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="content-card" style={{ marginBottom: 16 }}>
        <div className="card-header-row">
          <h3>PO Items</h3>
          <span className="count-pill">{totalQty.toFixed(2)} total qty</span>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ITEM CODE</th>
                <th>ITEM NAME</th>
                <th>UNIT</th>
                <th>ORDERED QTY</th>
                <th>UNIT PRICE</th>
                <th>LINE TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrder.items?.length ? (
                purchaseOrder.items.map((item) => (
                  <tr key={item.id}>
                    <td className="code-cell">{item.item_code}</td>
                    <td className="strong-cell">{item.item_name}</td>
                    <td>{item.unit || "—"}</td>
                    <td>{Number(item.ordered_qty || 0).toFixed(2)}</td>
                    <td>{money(item.unit_price)}</td>
                    <td>{money(item.line_total)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="empty-row">
                    No line items found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="content-card">
        <div className="card-header-row">
          <h3>Supplier Communication Log</h3>
          <span className="count-pill">
            {purchaseOrder.communications?.length || 0} messages
          </span>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>TYPE</th>
                <th>SUBJECT</th>
                <th>SENT BY</th>
                <th>STATUS</th>
                <th>SENT AT</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrder.communications?.length ? (
                purchaseOrder.communications.map((msg) => (
                  <tr key={msg.id}>
                    <td>{msg.message_type}</td>
                    <td>{msg.subject}</td>
                    <td>{msg.sent_by}</td>
                    <td>{msg.status}</td>
                    <td>{fmtDate(msg.created_at)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="empty-row">
                    No supplier communication logged for this PO yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}