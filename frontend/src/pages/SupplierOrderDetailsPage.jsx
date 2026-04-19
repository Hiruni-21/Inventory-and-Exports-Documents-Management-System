import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../utils/api";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-CA");
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const normalizeStatus = (value) => String(value || "").trim().toLowerCase();

const poStatusClass = (value) => {
  const s = normalizeStatus(value);

  if (s === "approved") return "bg-b";
  if (s === "sent") return "bg-a";
  if (s === "grn_created" || s === "closed" || s === "completed" || s === "delivered") return "bg-g";

  return "bg-x";
};

const poStatusText = (value) => {
  const s = normalizeStatus(value);

  if (s === "draft" || s === "pending_approval") return "Awaiting Approval";
  if (s === "approved") return "Approved";
  if (s === "sent") return "Sent";
  if (s === "grn_created" || s === "closed" || s === "completed" || s === "delivered") return "Closed";

  return value || "Draft";
};

const supplierResponseText = (value) => {
  const s = normalizeStatus(value);
  if (s === "accepted") return "Accepted";
  if (s === "rejected") return "Rejected";
  return "Pending";
};

const supplierResponseClass = (value) => {
  const s = normalizeStatus(value);
  if (s === "accepted") return "bg-g";
  if (s === "rejected") return "bg-r";
  return "bg-x";
};

const SupplierOrderDetailsPage = () => {
  const { id } = useParams();
  const [details, setDetails] = useState(null);
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const loadDetails = async () => {
    try {
      const res = await api.get(`/supplier-portal/orders/${id}`);
      const data = res.data || null;
      setDetails(data);
      setFeedbackNotes(data?.supplier_response_notes || "");
    } catch (err) {
      setDetails(null);
      setMessage({
        type: "error",
        text: err?.response?.data?.message || "Failed to load purchase order note",
      });
    }
  };

  useEffect(() => {
    loadDetails();
  }, [id]);

  const items = useMemo(() => {
    if (!details) return [];
    return Array.isArray(details.items) ? details.items : [];
  }, [details]);

  const handleRespond = async (responseStatus) => {
    try {
      setSaving(true);
      setMessage({ type: "", text: "" });

      await api.post(`/supplier-portal/orders/${id}/respond`, {
        response_status: responseStatus,
        feedback_notes: feedbackNotes,
      });

      setMessage({
        type: "success",
        text:
          responseStatus === "accepted"
            ? "Purchase order accepted successfully"
            : "Purchase order rejected successfully",
      });

      await loadDetails();
    } catch (err) {
      setMessage({
        type: "error",
        text: err?.response?.data?.message || "Failed to save supplier response",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fb" style={{ marginBottom: 14 }}>
        <div className="ib ib-s" style={{ marginBottom: 0 }}>
          <div>Review this purchase order note and send your response to Fresh World.</div>
        </div>

        <Link to="/supplier/orders" className="btn btn-s btn-sm">
          Back
        </Link>
      </div>

      {message.text ? (
        <div className={`ib ${message.type === "error" ? "ib-d" : "ib-s"}`}>
          <div>{message.text}</div>
        </div>
      ) : null}

      <div className="cc" style={{ marginBottom: 14 }}>
        <h3>Purchase Order Note</h3>
        <p>Order details sent by Fresh World</p>

        {details ? (
          <div className="fr">
            <div>
              <div className="sum-r">
                <span>PO Number</span>
                <span>{details.po_number || "—"}</span>
              </div>
              <div className="sum-r">
                <span>Date Placed</span>
                <span>{formatDate(details.order_date || details.created_at)}</span>
              </div>
              <div className="sum-r">
                <span>Required By</span>
                <span>{formatDate(details.required_date)}</span>
              </div>
              <div className="sum-r">
                <span>Payment Terms</span>
                <span>{details.payment_terms || "—"}</span>
              </div>
            </div>

            <div>
              <div className="sum-r">
                <span>Supplier</span>
                <span>{details.supplier_name || "—"}</span>
              </div>
              <div className="sum-r">
                <span>PO Status</span>
                <span>
                  <span className={`badge ${poStatusClass(details.status)}`}>
                    {poStatusText(details.status)}
                  </span>
                </span>
              </div>
              <div className="sum-r">
                <span>Your Response</span>
                <span>
                  <span className={`badge ${supplierResponseClass(details.supplier_response_status)}`}>
                    {supplierResponseText(details.supplier_response_status)}
                  </span>
                </span>
              </div>
              <div className="sum-r">
                <span>Responded At</span>
                <span>{formatDateTime(details.supplier_responded_at)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div>No purchase order note found</div>
        )}
      </div>

      <div className="cc" style={{ marginBottom: 14 }}>
        <h3>Fresh World Note</h3>
        <p>Remarks or instructions from the company</p>
        <div style={{ fontSize: 13, color: "var(--text2)" }}>
          {details?.notes || "No note available"}
        </div>
      </div>

      <div className="tw" style={{ marginBottom: 14 }}>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Code</th>
              <th>Qty</th>
              <th>Unit</th>
            </tr>
          </thead>
          <tbody>
            {items.length ? (
              items.map((item, index) => (
                <tr key={item.id || index}>
                  <td style={{ fontWeight: 600 }}>{item.item_name || "—"}</td>
                  <td>{item.item_code || "—"}</td>
                  <td>{item.quantity || "—"}</td>
                  <td>{item.unit || "—"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4">No purchase order items found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="cc">
        <h3>Supplier Response</h3>
        <p>Accept or reject this purchase order and send notes or feedback</p>

        <div className="ff">
          <label className="fl">Notes / Feedback</label>
          <textarea
            className="fc"
            rows="5"
            value={feedbackNotes}
            onChange={(e) => setFeedbackNotes(e.target.value)}
            placeholder="Add your notes, delivery comments, or rejection reason..."
          />
        </div>

        <div className="fb" style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, color: "var(--text3)" }}>
            Your latest response will be saved for Fresh World to review.
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              className="btn btn-s btn-sm"
              disabled={saving}
              onClick={() => handleRespond("rejected")}
            >
              {saving ? "Saving..." : "Reject PO"}
            </button>

            <button
              type="button"
              className="btn btn-p btn-sm"
              disabled={saving}
              onClick={() => handleRespond("accepted")}
            >
              {saving ? "Saving..." : "Accept PO"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SupplierOrderDetailsPage;