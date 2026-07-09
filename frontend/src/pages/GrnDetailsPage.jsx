import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../utils/api";

const fmtDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-CA");
};

const formatCurrency = (value) => {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `LKR ${Number(value).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const GrnDetailsPage = () => {
  const { id } = useParams();
  const [grn, setGrn] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGrn = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        const res = await api.get(`/grn/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setGrn(res.data);
      } catch {
        setError("Failed to load GRN details");
      } finally {
        setLoading(false);
      }
    };

    fetchGrn();
  }, [id]);

  const totalItems = useMemo(() => grn?.items?.length || 0, [grn]);

  const totalOrdered = useMemo(
    () => (grn?.items || []).reduce((sum, item) => sum + Number(item.ordered_quantity || 0), 0),
    [grn]
  );

  const totalReceived = useMemo(
    () => (grn?.items || []).reduce((sum, item) => sum + Number(item.delivered_quantity || 0), 0),
    [grn]
  );

  const totalLineValue = useMemo(
    () => (grn?.items || []).reduce((sum, item) => sum + Number(item.line_total || 0), 0),
    [grn]
  );

  if (error) {
    return (
      <div className="ib ib-d" style={{ padding: 24 }}>
        <span>⚠️</span>
        <div>{error}</div>
      </div>
    );
  }

  if (loading || !grn) {
    return (
      <div className="tw" style={{ minHeight: 360, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="tw-h">
          <h3>Loading GRN details...</h3>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 32, maxWidth: 1360, margin: "0 auto" }}>
      <div style={{ marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link to="/grn" className="btn btn-s" style={{ textDecoration: "none" }}>
          ← Back
        </Link>
        <div style={{ display: "flex", gap: 12 }}>
          <button style={{ borderRadius: 999, border: "1px solid #E5E7EB", background: "#FFFFFF", color: "#111827", padding: "10px 18px", fontWeight: 700, cursor: "pointer" }}>
            Print GRN
          </button>
          <button style={{ borderRadius: 999, border: "none", background: "#2563EB", color: "#FFFFFF", padding: "10px 18px", fontWeight: 700, cursor: "pointer" }}>
            Export PDF
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 16, boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)", padding: "22px 24px", minHeight: 140 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6B7280", marginBottom: 12 }}>
            GRN Number
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#111827", lineHeight: 1.2, wordBreak: "break-word" }}>{grn.grn_number || "—"}</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 10 }}>Goods Receiving Note reference</div>
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 16, boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)", padding: "22px 24px", minHeight: 140 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6B7280", marginBottom: 12 }}>
            Purchase Order
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>
            {grn.purchase_order_id ? (
              <Link to={`/purchase-orders/${grn.purchase_order_id}`} style={{ color: "#2563EB", textDecoration: "none" }}>
                {grn.po_number || "—"}
              </Link>
            ) : (
              grn.po_number || "—"
            )}
          </div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 10 }}>Linked purchase order reference</div>
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 16, boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)", padding: "22px 24px", minHeight: 140 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6B7280", marginBottom: 12 }}>
            Total Items
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>{totalItems}</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 10 }}>Received item lines</div>
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 16, boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)", padding: "22px 24px", minHeight: 140 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6B7280", marginBottom: 12 }}>
            Quantity Received
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>{totalReceived}</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 10 }}>Total delivered quantity</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, marginBottom: 24 }}>
        <section style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 16, boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)" }}>
          <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid #E5E7EB" }}>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#111827" }}>Supplier Information</h3>
          </div>
          <div style={{ padding: "20px 24px", display: "grid", gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280", marginBottom: 6 }}>Company Name</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>{grn.supplier_name || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280", marginBottom: 6 }}>Contact Number</div>
              <div style={{ fontSize: 15, color: "#111827" }}>{grn.contact_number || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280", marginBottom: 6 }}>Email</div>
              <div style={{ fontSize: 15, color: "#111827" }}>{grn.email || "—"}</div>
            </div>
          </div>
        </section>

        <section style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 16, boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)" }}>
          <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid #E5E7EB" }}>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#111827" }}>Receipt Details</h3>
          </div>
          <div style={{ padding: "20px 24px", display: "grid", gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280", marginBottom: 6 }}>Received Date</div>
              <div style={{ fontSize: 15, color: "#111827" }}>{fmtDate(grn.received_date)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280", marginBottom: 6 }}>Created By</div>
              <div style={{ fontSize: 15, color: "#111827" }}>{grn.created_by_name || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280", marginBottom: 6 }}>Remarks</div>
              <div style={{ fontSize: 15, color: "#111827", lineHeight: 1.7 }}>{grn.remarks || "No remarks added for this GRN."}</div>
            </div>
          </div>
        </section>
      </div>

      <section style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 16, boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)", overflow: "hidden", marginBottom: 24 }}>
        <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#111827" }}>Received Items</h3>
            <p style={{ margin: "8px 0 0", color: "#6B7280", fontSize: 13 }}>All items on this GRN, with requested, delivered, and financial details.</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", padding: "8px 14px", borderRadius: 999, background: "#EEF2FF", color: "#4338CA", fontSize: 13, fontWeight: 700 }}>
              {totalItems} Item Lines
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", padding: "8px 14px", borderRadius: 999, background: "#ECFDF5", color: "#047857", fontSize: 13, fontWeight: 700 }}>
              {totalReceived} Received
            </span>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 940, borderCollapse: "collapse" }}>
            <thead style={{ background: "#F8FAFC", position: "sticky", top: 0, zIndex: 1 }}>
              <tr>
                <th style={{ textAlign: "left", padding: "16px 18px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6B7280", whiteSpace: "nowrap" }}>Item Code</th>
                <th style={{ textAlign: "left", padding: "16px 18px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6B7280", whiteSpace: "nowrap" }}>Item Name</th>
                <th style={{ textAlign: "left", padding: "16px 18px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6B7280", whiteSpace: "nowrap" }}>Unit</th>
                <th style={{ textAlign: "right", padding: "16px 18px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6B7280", whiteSpace: "nowrap" }}>Ordered Qty</th>
                <th style={{ textAlign: "right", padding: "16px 18px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6B7280", whiteSpace: "nowrap" }}>Received Qty</th>
                <th style={{ textAlign: "right", padding: "16px 18px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6B7280", whiteSpace: "nowrap" }}>Variance</th>
                <th style={{ textAlign: "right", padding: "16px 18px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6B7280", whiteSpace: "nowrap" }}>Unit Cost</th>
                <th style={{ textAlign: "right", padding: "16px 18px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6B7280", whiteSpace: "nowrap" }}>Line Total</th>
                <th style={{ textAlign: "left", padding: "16px 18px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6B7280", whiteSpace: "nowrap" }}>Batch Number</th>
              </tr>
            </thead>
            <tbody>
              {grn.items?.length ? (
                grn.items.map((item, index) => {
                  const ordered = Number(item.ordered_quantity || 0);
                  const delivered = Number(item.delivered_quantity || 0);
                  const variance = delivered - ordered;
                  const varianceColor = variance > 0 ? "#047857" : variance < 0 ? "#B91C1C" : "#6B7280";
                  const varianceLabel = variance > 0 ? `+${variance}` : `${variance}`;

                  return (
                    <tr key={item.id ?? index} style={{ background: index % 2 === 0 ? "#FFFFFF" : "#F8FAFC", transition: "background 0.2s ease" }}>
                      <td style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace", fontSize: 12, color: "#475569", padding: "16px 18px" }}>{item.item_code || "—"}</td>
                      <td style={{ fontWeight: 600, padding: "16px 18px", color: "#0F172A" }}>{item.item_name || "—"}</td>
                      <td style={{ padding: "16px 18px", color: "#0F172A" }}>{item.unit || "—"}</td>
                      <td style={{ padding: "16px 18px", textAlign: "right", color: "#0F172A" }}>{ordered}</td>
                      <td style={{ padding: "16px 18px", textAlign: "right", color: "#0F172A" }}>{delivered}</td>
                      <td style={{ padding: "16px 18px", textAlign: "right", color: varianceColor, fontWeight: 700 }}>{varianceLabel}</td>
                      <td style={{ padding: "16px 18px", textAlign: "right", color: "#0F172A" }}>{formatCurrency(item.unit_cost)}</td>
                      <td style={{ padding: "16px 18px", textAlign: "right", color: "#0F172A" }}>{formatCurrency(item.line_total)}</td>
                      <td style={{ padding: "16px 18px", color: "#0F172A" }}>{item.batch_number || "—"}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", color: "#6B7280", padding: 24 }}>
                    No items available for this GRN.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 16, boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)" }}>
        <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid #E5E7EB" }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#111827" }}>Inventory Summary</h3>
        </div>
        <div style={{ padding: "20px 24px", display: "grid", gap: 14, maxWidth: 680 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E5E7EB", paddingBottom: 12 }}>
            <span style={{ fontSize: 14, color: "#475569" }}>Items Updated</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{totalItems}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E5E7EB", paddingBottom: 12 }}>
            <span style={{ fontSize: 14, color: "#475569" }}>Ordered Quantity</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{totalOrdered}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E5E7EB", paddingBottom: 12 }}>
            <span style={{ fontSize: 14, color: "#475569" }}>Received Quantity</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{totalReceived}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, color: "#475569" }}>Line Total Value</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{formatCurrency(totalLineValue)}</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default GrnDetailsPage;
