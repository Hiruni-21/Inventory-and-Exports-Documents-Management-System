import { useEffect, useMemo, useState } from "react";
import api from "../utils/api";

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(10,40,24,.18)",
  zIndex: 2000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};

const modalStyle = {
  width: "min(920px, 78vw)",
  background: "var(--white)",
  borderRadius: 18,
  border: "1px solid var(--border)",
  boxShadow: "0 26px 70px rgba(0,0,0,.16)",
  overflow: "hidden",
};

const closeBtnStyle = {
  width: 46,
  height: 46,
  minWidth: 46,
  padding: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1,
  fontSize: 24,
};

const greenBtnStyle = {
  background: "var(--g700)",
  border: "1px solid var(--g700)",
  color: "var(--white)",
  boxShadow: "none",
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-CA");
};

const previewText = (text) => {
  const value = String(text || "");
  if (value.length <= 48) return value;
  return `${value.slice(0, 48)}...`;
};

const typeBadge = (value) => {
  const v = String(value || "").toLowerCase();
  if (v.includes("delivery")) return "bg-b";
  if (v.includes("complaint")) return "bg-r";
  if (v.includes("feedback")) return "bg-a";
  return "bg-x";
};

const statusBadge = (value) => {
  const v = String(value || "").toLowerCase();
  if (v.includes("received")) return "bg-g";
  if (v.includes("replied")) return "bg-b";
  return "bg-x";
};

const SupplierMessagesPage = () => {
  const [messages, setMessages] = useState([]);
  const [orders, setOrders] = useState([]);
  const [returns, setReturns] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    message_type: "General Note",
    subject: "",
    message_body: "",
    linked_value: "none",
  });
  const [message, setMessage] = useState({ type: "", text: "" });

  const loadData = async () => {
    try {
      const [messagesRes, ordersRes, returnsRes] = await Promise.all([
        api.get("/supplier-portal/messages"),
        api.get("/supplier-portal/orders"),
        api.get("/supplier-portal/returns"),
      ]);

      setMessages(Array.isArray(messagesRes.data) ? messagesRes.data : []);
      setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
      setReturns(Array.isArray(returnsRes.data) ? returnsRes.data : []);
    } catch {
      setMessages([]);
      setOrders([]);
      setReturns([]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handler = () => setOpenModal(true);
    window.addEventListener("fw-open-supplier-message-modal", handler);
    return () => window.removeEventListener("fw-open-supplier-message-modal", handler);
  }, []);

  const linkedOptions = useMemo(() => {
    return [
      { value: "none", label: "Not linked to a specific order" },
      ...orders.map((row) => ({
        value: `order:${row.id}`,
        label: row.po_number,
      })),
      ...returns.map((row) => ({
        value: `return:${row.id}`,
        label: row.return_number,
      })),
    ];
  }, [orders, returns]);

  const resetForm = () => {
    setForm({
      message_type: "General Note",
      subject: "",
      message_body: "",
      linked_value: "none",
    });
  };

  const closeModal = () => {
    setOpenModal(false);
    resetForm();
    setMessage({ type: "", text: "" });
  };

  const handleSend = async () => {
    try {
      setSaving(true);
      setMessage({ type: "", text: "" });

      let linked_kind = "none";
      let linked_record_id = null;

      if (form.linked_value !== "none") {
        const [kind, id] = String(form.linked_value).split(":");
        linked_kind = kind;
        linked_record_id = Number(id);
      }

      await api.post("/supplier-portal/messages", {
        message_type: form.message_type,
        subject: form.subject,
        message_body: form.message_body,
        linked_kind,
        linked_record_id,
      });

      await loadData();
      closeModal();
    } catch (err) {
      setMessage({
        type: "error",
        text: err?.response?.data?.message || "Failed to send message",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fb" style={{ marginBottom: 14 }}>
        <div />
        <button
          type="button"
          className="btn btn-sm"
          style={greenBtnStyle}
          onClick={() => setOpenModal(true)}
        >
          + New Message
        </button>
      </div>

      <div
        style={{
          padding: 22,
          border: "1px solid rgba(38,102,210,.24)",
          background: "rgba(38,102,210,.06)",
          color: "var(--blue)",
          borderRadius: 14,
          marginBottom: 18,
          fontSize: 15,
          lineHeight: 1.6,
        }}
      >
        Messages and notes exchanged with Fresh World. Click New Message above to send a new enquiry, feedback, or special note.
      </div>

      <div className="tw">
        <div style={{ padding: "22px 28px 12px", fontSize: 18, fontWeight: 800, color: "var(--text)" }}>
          Message History
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Subject</th>
              <th>Preview</th>
              <th>From</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {messages.length ? (
              messages.map((row) => (
                <tr key={row.id}>
                  <td>{formatDate(row.created_at)}</td>
                  <td>
                    <span className={`badge ${typeBadge(row.message_type)}`}>{row.message_type}</span>
                  </td>
                  <td style={{ fontWeight: 800, color: "var(--text)" }}>{row.subject}</td>
                  <td style={{ color: "var(--text2)" }}>{previewText(row.message_body)}</td>
                  <td>{row.sent_by || "You"}</td>
                  <td>
                    <span className={`badge ${statusBadge(row.status)}`}>{row.status || "Sent"}</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6">No messages found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {openModal ? (
        <div style={overlayStyle} onClick={closeModal}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                padding: "18px 28px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>
                Send Message to Fresh World
              </div>

              <button
                type="button"
                className="btn btn-s btn-sm"
                onClick={closeModal}
                style={closeBtnStyle}
              >
                ×
              </button>
            </div>

            <div style={{ padding: 28 }}>
              {message.text ? (
                <div className={`ib ${message.type === "error" ? "ib-d" : "ib-s"}`}>
                  <div>{message.text}</div>
                </div>
              ) : null}

              <div className="ff">
                <label className="fl">Message Type</label>
                <select
                  className="fc"
                  value={form.message_type}
                  onChange={(e) => setForm((prev) => ({ ...prev, message_type: e.target.value }))}
                >
                  <option>General Note</option>
                  <option>Feedback / Compliment</option>
                  <option>Complaint</option>
                  <option>Delivery Update</option>
                  <option>Pricing Enquiry</option>
                </select>
              </div>

              <div className="ff">
                <label className="fl">Subject</label>
                <input
                  className="fc"
                  value={form.subject}
                  onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                  placeholder="Brief subject of your message"
                />
              </div>

              <div className="ff">
                <label className="fl">Message *</label>
                <textarea
                  className="fc"
                  rows="6"
                  value={form.message_body}
                  onChange={(e) => setForm((prev) => ({ ...prev, message_body: e.target.value }))}
                  placeholder="Write your message, feedback, or special note to Fresh World..."
                />
              </div>

              <div className="ff">
                <label className="fl">Linked To (Optional)</label>
                <select
                  className="fc"
                  value={form.linked_value}
                  onChange={(e) => setForm((prev) => ({ ...prev, linked_value: e.target.value }))}
                >
                  {linkedOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div
              style={{
                padding: "18px 28px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                justifyContent: "flex-end",
                gap: 12,
              }}
            >
              <button type="button" className="btn btn-s btn-sm" onClick={closeModal}>
                Cancel
              </button>

              <button
                type="button"
                className="btn btn-sm"
                style={greenBtnStyle}
                onClick={handleSend}
                disabled={saving}
              >
                {saving ? "Sending..." : "Send Message"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default SupplierMessagesPage;