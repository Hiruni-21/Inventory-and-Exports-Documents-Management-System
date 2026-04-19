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
  width: "min(1280px, 96vw)",
  maxHeight: "92vh",
  overflow: "auto",
  background: "var(--white)",
  borderRadius: 18,
  border: "1px solid var(--border)",
  boxShadow: "0 26px 70px rgba(0,0,0,.16)",
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

const acknowledgeBtnStyle = {
  width: "100%",
  background: "var(--white)",
  color: "var(--g700)",
  border: "1px solid rgba(39,143,85,.45)",
  boxShadow: "none",
};

const disputeBtnStyle = {
  width: "100%",
  color: "var(--d)",
  borderColor: "rgba(200,75,47,.28)",
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-CA");
};

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return `-LKR ${Math.abs(amount).toLocaleString("en-LK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

const normalizeStatus = (value) => String(value || "").trim().toLowerCase();

const returnStatus = (value) => {
  const s = normalizeStatus(value);
  if (s === "acknowledged") return { text: "Acknowledged", cls: "bg-g" };
  if (s === "disputed") return { text: "Disputed", cls: "bg-r" };
  return { text: "Response Required", cls: "bg-a" };
};

const SupplierReturnsPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReturnId, setSelectedReturnId] = useState(null);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const loadReturns = async () => {
    try {
      setLoading(true);
      const res = await api.get("/supplier-portal/returns");
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReturns();
  }, []);

  const openReturn = async (id) => {
    try {
      setSelectedReturnId(id);
      setLoadingDetails(true);
      setMessage({ type: "", text: "" });

      const res = await api.get(`/supplier-portal/returns/${id}`);
      const data = res.data || null;
      setSelectedReturn(data);
      setNote(data?.supplier_response_notes || "");
    } catch (err) {
      setMessage({
        type: "error",
        text: err?.response?.data?.message || "Failed to load return note",
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeReturn = () => {
    setSelectedReturnId(null);
    setSelectedReturn(null);
    setNote("");
    setMessage({ type: "", text: "" });
  };

  const handleRespond = async (responseStatus) => {
    if (!selectedReturnId) return;

    try {
      setSaving(true);
      setMessage({ type: "", text: "" });

      await api.post(`/supplier-portal/returns/${selectedReturnId}/respond`, {
        response_status: responseStatus,
        feedback_notes: note,
      });

      const detailRes = await api.get(`/supplier-portal/returns/${selectedReturnId}`);
      setSelectedReturn(detailRes.data || null);

      await loadReturns();

      setMessage({
        type: "success",
        text:
          responseStatus === "acknowledged"
            ? "Return note acknowledged successfully"
            : "Return note disputed successfully",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err?.response?.data?.message || "Failed to save return feedback",
      });
    } finally {
      setSaving(false);
    }
  };

  const preparedRows = useMemo(() => rows, [rows]);

  return (
    <>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Return Note</th>
              <th>Linked PO</th>
              <th>Date</th>
              <th>Item</th>
              <th>Qty</th>
              <th>Reason</th>
              <th>Deduction</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8">Loading...</td>
              </tr>
            ) : preparedRows.length ? (
              preparedRows.map((row) => {
                const status = returnStatus(row.supplier_response_status);
                return (
                  <tr key={row.id} style={{ cursor: "pointer" }} onClick={() => openReturn(row.id)}>
                    <td style={{ fontWeight: 800, color: "var(--d)" }}>{row.return_number}</td>
                    <td>{row.linked_po_number || "—"}</td>
                    <td>{formatDate(row.created_at)}</td>
                    <td style={{ fontWeight: 800, color: "var(--text)" }}>{row.item_name || "—"}</td>
                    <td>{row.quantity} kg</td>
                    <td>{row.reason || "—"}</td>
                    <td style={{ fontWeight: 800, color: "var(--d)" }}>{formatCurrency(row.deduction_amount)}</td>
                    <td>
                      <span className={`badge ${status.cls}`}>{status.text}</span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="8">No return notes found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedReturnId ? (
        <div style={overlayStyle} onClick={closeReturn}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                padding: "18px 30px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>
                {selectedReturn?.return_number || "Return Note"} — Return Note
              </div>

              <button type="button" className="btn btn-s btn-sm" onClick={closeReturn} style={closeBtnStyle}>
                ×
              </button>
            </div>

            {loadingDetails ? (
              <div className="cc">Loading return note...</div>
            ) : (
              <>
                <div style={{ padding: 30 }}>
                  {message.text ? (
                    <div className={`ib ${message.type === "error" ? "ib-d" : "ib-s"}`}>
                      <div>{message.text}</div>
                    </div>
                  ) : null}

                  <div
                    className="ib ib-w"
                    style={{
                      marginBottom: 20,
                      background: "var(--a100)",
                      borderColor: "rgba(232,168,56,.35)",
                      color: "var(--a600)",
                    }}
                  >
                    <div>
                      This return note was raised against <strong>{selectedReturn?.linked_po_number || "the linked PO"}</strong>. The stated deduction of{" "}
                      <strong>{formatCurrency(selectedReturn?.deduction_amount)}</strong> will be applied to your next payment unless disputed.
                    </div>
                  </div>

                  <div
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      overflow: "hidden",
                      marginBottom: 22,
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <div style={{ padding: 24 }}>
                        <div
                          style={{
                            fontSize: 12,
                            letterSpacing: ".12em",
                            textTransform: "uppercase",
                            color: "var(--text3)",
                            marginBottom: 12,
                          }}
                        >
                          Return Note
                        </div>
                        <div style={{ lineHeight: 1.8 }}>
                          <div>
                            <strong>{selectedReturn?.return_number || "—"}</strong>
                          </div>
                          <div>
                            <strong>Linked PO:</strong> {selectedReturn?.linked_po_number || "—"}
                          </div>
                        </div>
                      </div>

                      <div style={{ padding: 24 }}>
                        <div
                          style={{
                            fontSize: 12,
                            letterSpacing: ".12em",
                            textTransform: "uppercase",
                            color: "var(--text3)",
                            marginBottom: 12,
                          }}
                        >
                          Summary
                        </div>
                        <div style={{ lineHeight: 1.8 }}>
                          <div>
                            <strong>Date Raised:</strong> {formatDate(selectedReturn?.created_at)}
                          </div>
                          <div>
                            <strong>Total Deduction:</strong>{" "}
                            <span style={{ color: "var(--d)", fontWeight: 800 }}>
                              {formatCurrency(selectedReturn?.deduction_amount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <table style={{ width: "100%", borderTop: "1px solid var(--border)" }}>
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Quantity</th>
                          <th>Reason</th>
                          <th>Deduction</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ fontWeight: 700 }}>{selectedReturn?.item_name || "—"}</td>
                          <td>{selectedReturn?.quantity} kg</td>
                          <td>{selectedReturn?.reason || "—"}</td>
                          <td style={{ color: "var(--d)", fontWeight: 800 }}>
                            {formatCurrency(selectedReturn?.deduction_amount)}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <div style={{ padding: 24, borderTop: "1px solid var(--border)" }}>
                      <div
                        style={{
                          fontSize: 12,
                          letterSpacing: ".12em",
                          textTransform: "uppercase",
                          color: "var(--text3)",
                          marginBottom: 10,
                        }}
                      >
                        Fresh World&apos;s Note
                      </div>
                      <div style={{ color: "var(--text2)" }}>{selectedReturn?.notes || "No note available"}</div>
                    </div>
                  </div>

                  <div
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      padding: 24,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        letterSpacing: ".12em",
                        textTransform: "uppercase",
                        color: "var(--text3)",
                        marginBottom: 16,
                      }}
                    >
                      Your Response
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                      <button
                        type="button"
                        className="btn btn-s btn-sm"
                        onClick={() => handleRespond("acknowledged")}
                        disabled={saving}
                        style={acknowledgeBtnStyle}
                      >
                        {saving ? "Saving..." : "Acknowledge Deduction"}
                      </button>

                      <button
                        type="button"
                        className="btn btn-s btn-sm"
                        onClick={() => handleRespond("disputed")}
                        disabled={saving}
                        style={disputeBtnStyle}
                      >
                        {saving ? "Saving..." : "Dispute Return"}
                      </button>
                    </div>

                    <div className="ff">
                      <label className="fl">Additional Note to Fresh World</label>
                      <textarea
                        className="fc"
                        rows="4"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Any additional comments..."
                      />
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: "18px 30px",
                    borderTop: "1px solid var(--border)",
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <button type="button" className="btn btn-s btn-sm" onClick={closeReturn}>
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
};

export default SupplierReturnsPage;