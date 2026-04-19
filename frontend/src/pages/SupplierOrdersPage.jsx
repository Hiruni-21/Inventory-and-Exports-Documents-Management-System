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
  width: "min(980px, 82vw)",
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

const detailSectionTitleStyle = {
  fontSize: 12,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  color: "var(--text3)",
  marginBottom: 14,
};

const detailRowStyle = {
  display: "flex",
  gap: 6,
  alignItems: "baseline",
  marginBottom: 8,
  fontSize: 13,
  lineHeight: 1.5,
  color: "var(--text)",
};

const detailLabelStyle = {
  fontWeight: 800,
  color: "var(--text)",
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-CA");
};

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return `LKR ${amount.toLocaleString("en-LK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

const normalizeStatus = (value) => String(value || "").trim().toLowerCase();

const getListStatus = (row) => {
  const poStatus = normalizeStatus(row.status);
  const supplierStatus = normalizeStatus(row.supplier_response_status);

  if (supplierStatus === "accepted") {
    if (
      poStatus === "grn_created" ||
      poStatus === "closed" ||
      poStatus === "completed" ||
      poStatus === "delivered"
    ) {
      return { text: "Delivered & Closed", cls: "bg-g" };
    }
    return { text: "Accepted", cls: "bg-g" };
  }

  if (supplierStatus === "rejected") {
    return { text: "Rejected", cls: "bg-r" };
  }

  if (
    poStatus === "grn_created" ||
    poStatus === "closed" ||
    poStatus === "completed" ||
    poStatus === "delivered"
  ) {
    return { text: "Delivered & Closed", cls: "bg-g" };
  }

  return { text: "Action Required", cls: "bg-a" };
};

const poStatusText = (value) => {
  const s = normalizeStatus(value);
  if (s === "draft" || s === "pending_approval") return "Awaiting Approval";
  if (s === "approved") return "Approved";
  if (s === "sent") return "Sent";
  if (s === "grn_created" || s === "closed" || s === "completed" || s === "delivered") {
    return "Delivered & Closed";
  }
  return value || "—";
};

const responseText = (value) => {
  const s = normalizeStatus(value);
  if (s === "accepted") return "Accepted";
  if (s === "rejected") return "Rejected";
  return "Pending";
};

const responseClass = (value) => {
  const s = normalizeStatus(value);
  if (s === "accepted") return "bg-g";
  if (s === "rejected") return "bg-r";
  return "bg-x";
};

const parseItemPreview = (value) => {
  return String(value || "")
    .split("~~~")
    .filter(Boolean)
    .map((entry) => {
      const [name, qty, unit] = entry.split("||");
      return { name, qty, unit };
    });
};

const SupplierOrdersPage = () => {
  const [rows, setRows] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [acceptHover, setAcceptHover] = useState(false);
  const [rejectHover, setRejectHover] = useState(false);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get("/supplier-portal/orders");
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const counts = useMemo(() => {
    const next = { all: rows.length, awaiting: 0, approved: 0, sent: 0, closed: 0 };

    rows.forEach((row) => {
      const s = normalizeStatus(row.status);
      if (s === "draft" || s === "pending_approval") next.awaiting += 1;
      else if (s === "approved") next.approved += 1;
      else if (s === "sent") next.sent += 1;
      else if (s === "grn_created" || s === "closed" || s === "completed" || s === "delivered") {
        next.closed += 1;
      }
    });

    return next;
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const s = normalizeStatus(row.status);

      if (activeTab === "all") return true;
      if (activeTab === "awaiting") return s === "draft" || s === "pending_approval";
      if (activeTab === "approved") return s === "approved";
      if (activeTab === "sent") return s === "sent";
      if (activeTab === "closed") {
        return s === "grn_created" || s === "closed" || s === "completed" || s === "delivered";
      }
      return true;
    });
  }, [rows, activeTab]);

  const tabs = [
    { key: "all", label: `All (${counts.all})` },
    { key: "awaiting", label: `Awaiting Approval (${counts.awaiting})` },
    { key: "approved", label: `Approved (${counts.approved})` },
    { key: "sent", label: `Sent (${counts.sent})` },
    { key: "closed", label: `Closed (${counts.closed})` },
  ];

  const openOrder = async (id) => {
    try {
      setSelectedOrderId(id);
      setLoadingDetails(true);
      setMessage({ type: "", text: "" });
      setAcceptHover(false);
      setRejectHover(false);

      const res = await api.get(`/supplier-portal/orders/${id}`);
      const data = res.data || null;
      setSelectedOrder(data);
      setNote(data?.supplier_response_notes || "");
    } catch (err) {
      setMessage({
        type: "error",
        text: err?.response?.data?.message || "Failed to load purchase order note",
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeOrder = () => {
    setSelectedOrderId(null);
    setSelectedOrder(null);
    setMessage({ type: "", text: "" });
    setNote("");
    setAcceptHover(false);
    setRejectHover(false);
  };

  const handleRespond = async (responseStatus) => {
    if (!selectedOrderId) return;

    try {
      setSaving(true);
      setMessage({ type: "", text: "" });

      await api.post(`/supplier-portal/orders/${selectedOrderId}/respond`, {
        response_status: responseStatus,
        feedback_notes: note,
      });

      const detailRes = await api.get(`/supplier-portal/orders/${selectedOrderId}`);
      setSelectedOrder(detailRes.data || null);

      await loadOrders();

      setMessage({
        type: "success",
        text:
          responseStatus === "accepted"
            ? "Purchase order accepted successfully"
            : "Purchase order rejected successfully",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err?.response?.data?.message || "Failed to save supplier response",
      });
    } finally {
      setSaving(false);
    }
  };

  const isClosedOrder = useMemo(() => {
    const s = normalizeStatus(selectedOrder?.status);
    return s === "grn_created" || s === "closed" || s === "completed" || s === "delivered";
  }, [selectedOrder]);

  return (
    <>
      <div className="fb" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`btn btn-sm ${activeTab === tab.key ? "btn-p" : "btn-s"}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>PO Number</th>
              <th>Date Placed</th>
              <th>Required By</th>
              <th>Items</th>
              <th>Total Value</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6">Loading...</td>
              </tr>
            ) : filteredRows.length ? (
              filteredRows.map((row) => {
                const items = parseItemPreview(row.item_preview);
                const status = getListStatus(row);

                return (
                  <tr key={row.id} style={{ cursor: "pointer" }} onClick={() => openOrder(row.id)}>
                    <td style={{ fontWeight: 800, color: "var(--text)" }}>{row.po_number}</td>
                    <td>{formatDate(row.order_date || row.created_at)}</td>
                    <td style={{ color: status.text === "Action Required" ? "var(--d)" : "var(--text)" }}>
                      {formatDate(row.required_date)}
                    </td>
                    <td>
                      {items.length ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          {items.slice(0, 2).map((item, index) => (
                            <div key={index} style={{ lineHeight: 1.3 }}>
                              <div>{item.name}</div>
                              <div style={{ color: "var(--text2)" }}>
                                {item.qty} {item.unit}
                              </div>
                            </div>
                          ))}
                          {items.length > 2 ? <div style={{ color: "var(--text2)" }}>Multiple items</div> : null}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td style={{ fontWeight: 800, color: "var(--text)" }}>{formatCurrency(row.total_amount)}</td>
                    <td>
                      <span className={`badge ${status.cls}`}>{status.text}</span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6">No purchase orders found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedOrderId ? (
        <div style={overlayStyle} onClick={closeOrder}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                padding: "18px 26px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>
                {selectedOrder?.po_number || "Purchase Order"} — Purchase Order
              </div>

              <button type="button" className="btn btn-s btn-sm" onClick={closeOrder} style={closeBtnStyle}>
                ×
              </button>
            </div>

            {loadingDetails ? (
              <div className="cc">Loading purchase order details...</div>
            ) : (
              <>
                <div style={{ padding: 24 }}>
                  {message.text ? (
                    <div className={`ib ${message.type === "error" ? "ib-d" : "ib-s"}`}>
                      <div>{message.text}</div>
                    </div>
                  ) : null}

                  <div
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      overflow: "hidden",
                      marginBottom: 18,
                    }}
                  >
                    <div
                      style={{
                        padding: "20px 22px",
                        textAlign: "center",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          letterSpacing: ".18em",
                          color: "var(--text3)",
                          textTransform: "uppercase",
                        }}
                      >
                        Purchase Order
                      </div>
                      <div style={{ fontSize: 21, fontWeight: 800, color: "var(--text)", marginTop: 6 }}>
                        Fresh World Export (Pvt) Ltd
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 4 }}>
                        No 101/2 Malapalla, Pannipitiya, Sri Lanka
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <div style={{ padding: 22, borderRight: "1px solid var(--border)" }}>
                        <div style={detailSectionTitleStyle}>Supplier Details</div>

                        <div style={detailRowStyle}>
                          <span style={detailLabelStyle}>Name:</span>
                          <span>{selectedOrder?.supplier_name || "—"}</span>
                        </div>
                        <div style={detailRowStyle}>
                          <span style={detailLabelStyle}>Address:</span>
                          <span>{selectedOrder?.address || "—"}</span>
                        </div>
                        <div style={detailRowStyle}>
                          <span style={detailLabelStyle}>Contact:</span>
                          <span>{selectedOrder?.contact_number || "—"}</span>
                        </div>
                        <div style={detailRowStyle}>
                          <span style={detailLabelStyle}>Email:</span>
                          <span>{selectedOrder?.email || "—"}</span>
                        </div>
                      </div>

                      <div style={{ padding: 22 }}>
                        <div style={detailSectionTitleStyle}>Order Details</div>

                        <div style={detailRowStyle}>
                          <span style={detailLabelStyle}>PO No:</span>
                          <span>{selectedOrder?.po_number || "—"}</span>
                        </div>
                        <div style={detailRowStyle}>
                          <span style={detailLabelStyle}>PO Date:</span>
                          <span>{formatDate(selectedOrder?.order_date || selectedOrder?.created_at)}</span>
                        </div>
                        <div style={detailRowStyle}>
                          <span style={detailLabelStyle}>Required By:</span>
                          <span>{formatDate(selectedOrder?.required_date)}</span>
                        </div>
                        <div style={detailRowStyle}>
                          <span style={detailLabelStyle}>Payment Terms:</span>
                          <span>{selectedOrder?.payment_terms || "—"}</span>
                        </div>
                        <div style={detailRowStyle}>
                          <span style={detailLabelStyle}>Status:</span>
                          <span>
                            <span className={`badge ${responseClass(selectedOrder?.supplier_response_status)}`}>
                              {responseText(selectedOrder?.supplier_response_status)}
                            </span>
                          </span>
                        </div>
                        <div style={detailRowStyle}>
                          <span style={detailLabelStyle}>PO Status:</span>
                          <span>{poStatusText(selectedOrder?.status)}</span>
                        </div>
                      </div>
                    </div>

                    <table style={{ width: "100%" }}>
                      <thead>
                        <tr>
                          <th style={{ textTransform: "uppercase" }}>S.No</th>
                          <th style={{ textTransform: "uppercase" }}>Code</th>
                          <th style={{ textTransform: "uppercase" }}>Product Name</th>
                          <th style={{ textTransform: "uppercase" }}>Qty</th>
                          <th style={{ textTransform: "uppercase" }}>Unit</th>
                          <th style={{ textTransform: "uppercase" }}>Rate (LKR)</th>
                          <th style={{ textTransform: "uppercase" }}>Amount (LKR)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedOrder?.items || []).map((item, index) => (
                          <tr key={item.id || index}>
                            <td>{index + 1}</td>
                            <td>{item.item_code || "—"}</td>
                            <td style={{ fontWeight: 700 }}>{item.item_name || "—"}</td>
                            <td>{item.quantity || "—"}</td>
                            <td>{item.unit || "—"}</td>
                            <td>{formatCurrency(item.unit_price || 0)}</td>
                            <td style={{ fontWeight: 700 }}>
                              {formatCurrency(Number(item.quantity || 0) * Number(item.unit_price || 0))}
                            </td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan="5"></td>
                          <td style={{ color: "var(--text3)" }}>Grand Total</td>
                          <td style={{ fontWeight: 800 }}>{formatCurrency(selectedOrder?.total_amount || 0)}</td>
                        </tr>
                      </tbody>
                    </table>

                    <div style={{ padding: 22, borderTop: "1px solid var(--border)" }}>
                      <div style={detailSectionTitleStyle}>Instructions from Fresh World</div>
                      <div style={{ color: "var(--text2)", fontSize: 13 }}>
                        {selectedOrder?.notes || "No instructions available"}
                      </div>
                    </div>

                    <div style={{ padding: 22, borderTop: "1px solid var(--border)" }}>
                      <div style={detailSectionTitleStyle}>Terms & Conditions</div>
                      <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8, color: "var(--text2)", fontSize: 13 }}>
                        <li>Fresh World reserves the right to reject goods not meeting agreed specifications.</li>
                        <li>Delivery must be completed within the required-by date.</li>
                      </ol>
                    </div>
                  </div>

                  {isClosedOrder ? (
                    <div
                      style={{
                        padding: "20px 22px",
                        border: "1px solid rgba(39,143,85,.24)",
                        background: "rgba(39,143,85,.10)",
                        color: "var(--g700)",
                        borderRadius: 14,
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      <span style={{ fontSize: 22, lineHeight: 1 }}>✓</span>
                      <span>This PO has been fulfilled and closed. No further action required.</span>
                    </div>
                  ) : (
                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 14,
                        padding: 22,
                      }}
                    >
                      <div style={detailSectionTitleStyle}>Your Response</div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 12,
                          marginBottom: 16,
                        }}
                      >
                        <button
                          type="button"
                          className="btn btn-p btn-sm"
                          disabled={saving}
                          onClick={() => handleRespond("accepted")}
                          onMouseEnter={() => !saving && setAcceptHover(true)}
                          onMouseLeave={() => setAcceptHover(false)}
                          style={{
                            width: "100%",
                            background: acceptHover ? "var(--g700)" : "var(--g900)",
                            color: "var(--white)",
                            border: "1px solid rgba(39,143,85,.45)",
                            boxShadow: "none",
                            transition: "all .18s ease",
                          }}
                        >
                          {saving ? "Saving..." : "Accept PO"}
                        </button>

                        <button
                          type="button"
                          className="btn btn-s btn-sm"
                          disabled={saving}
                          onClick={() => handleRespond("rejected")}
                          onMouseEnter={() => !saving && setRejectHover(true)}
                          onMouseLeave={() => setRejectHover(false)}
                          style={{
                            width: "100%",
                            background: rejectHover ? "var(--d)" : "var(--white)",
                            color: rejectHover ? "var(--white)" : "var(--d)",
                            border: "1px solid rgba(200,75,47,.28)",
                            boxShadow: "none",
                            transition: "all .18s ease",
                          }}
                        >
                          {saving ? "Saving..." : "Reject PO"}
                        </button>
                      </div>

                      <div className="ff" style={{ marginBottom: 0 }}>
                        <label className="fl">Special Note (Optional)</label>
                        <textarea
                          className="fc"
                          rows="4"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Add any notes, partial delivery info, or delivery date confirmation..."
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    padding: "16px 24px",
                    borderTop: "1px solid var(--border)",
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <button type="button" className="btn btn-s btn-sm" onClick={closeOrder}>
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

export default SupplierOrdersPage;