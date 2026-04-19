import { useEffect, useState } from "react";
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

const feedbackText = (value) => {
  const s = normalizeStatus(value);
  if (s === "acknowledged") return "Acknowledged";
  if (s === "disputed") return "Disputed";
  return "Pending";
};

const feedbackBadge = (value) => {
  const s = normalizeStatus(value);
  if (s === "acknowledged") return "bg-g";
  if (s === "disputed") return "bg-r";
  return "bg-x";
};

const SupplierReturnDetailsPage = () => {
  const { id } = useParams();
  const [details, setDetails] = useState(null);
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const loadDetails = async () => {
    try {
      const res = await api.get(`/supplier-portal/returns/${id}`);
      const data = res.data || null;
      setDetails(data);
      setFeedbackNotes(data?.supplier_response_notes || "");
    } catch (err) {
      setDetails(null);
      setMessage({
        type: "error",
        text: err?.response?.data?.message || "Failed to load return note",
      });
    }
  };

  useEffect(() => {
    loadDetails();
  }, [id]);

  const handleRespond = async (responseStatus) => {
    try {
      setSaving(true);
      setMessage({ type: "", text: "" });

      await api.post(`/supplier-portal/returns/${id}/respond`, {
        response_status: responseStatus,
        feedback_notes: feedbackNotes,
      });

      setMessage({
        type: "success",
        text:
          responseStatus === "acknowledged"
            ? "Return note acknowledged successfully"
            : "Return note disputed successfully",
      });

      await loadDetails();
    } catch (err) {
      setMessage({
        type: "error",
        text: err?.response?.data?.message || "Failed to save return feedback",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fb" style={{ marginBottom: 14 }}>
        <div className="ib ib-s" style={{ marginBottom: 0 }}>
          <div>Review this return note and send your feedback to Fresh World.</div>
        </div>

        <Link to="/supplier/returns" className="btn btn-s btn-sm">
          Back
        </Link>
      </div>

      {message.text ? (
        <div className={`ib ${message.type === "error" ? "ib-d" : "ib-s"}`}>
          <div>{message.text}</div>
        </div>
      ) : null}

      <div className="cc" style={{ marginBottom: 14 }}>
        <h3>Return Note</h3>
        <p>Details sent by Fresh World</p>

        {details ? (
          <div className="fr">
            <div>
              <div className="sum-r">
                <span>Return Note</span>
                <span>{details.return_number || `RN-${details.id}`}</span>
              </div>
              <div className="sum-r">
                <span>Date</span>
                <span>{formatDate(details.created_at)}</span>
              </div>
              <div className="sum-r">
                <span>Item</span>
                <span>{details.item_name || "—"}</span>
              </div>
              <div className="sum-r">
                <span>Batch</span>
                <span>{details.batch_code || "—"}</span>
              </div>
            </div>

            <div>
              <div className="sum-r">
                <span>Quantity</span>
                <span>{details.quantity || "—"}</span>
              </div>
              <div className="sum-r">
                <span>Reason</span>
                <span>{details.reason || "—"}</span>
              </div>
              <div className="sum-r">
                <span>Your Feedback</span>
                <span>
                  <span className={`badge ${feedbackBadge(details.supplier_response_status)}`}>
                    {feedbackText(details.supplier_response_status)}
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
          <div>No return note found</div>
        )}
      </div>

      <div className="cc" style={{ marginBottom: 14 }}>
        <h3>Fresh World Note</h3>
        <p>Reason and notes from the company</p>
        <div style={{ fontSize: 13, color: "var(--text2)" }}>
          {details?.notes || "No note available"}
        </div>
      </div>

      <div className="cc">
        <h3>Supplier Feedback</h3>
        <p>Acknowledge this return note or dispute it with your notes</p>

        <div className="ff">
          <label className="fl">Notes / Feedback</label>
          <textarea
            className="fc"
            rows="5"
            value={feedbackNotes}
            onChange={(e) => setFeedbackNotes(e.target.value)}
            placeholder="Add your feedback, clarification, or dispute reason..."
          />
        </div>

        <div className="fb" style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, color: "var(--text3)" }}>
            Your latest feedback will be saved for Fresh World to review.
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              className="btn btn-s btn-sm"
              disabled={saving}
              onClick={() => handleRespond("disputed")}
            >
              {saving ? "Saving..." : "Dispute Return"}
            </button>

            <button
              type="button"
              className="btn btn-p btn-sm"
              disabled={saving}
              onClick={() => handleRespond("acknowledged")}
            >
              {saving ? "Saving..." : "Acknowledge Return"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SupplierReturnDetailsPage;