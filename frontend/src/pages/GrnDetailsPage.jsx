import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../utils/api";

const fmtDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-CA");
};

const GrnDetailsPage = () => {
  const { id } = useParams();
  const [grn, setGrn] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchGrn = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await api.get(`/grn/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setGrn(res.data);
      } catch {
        setError("Failed to load GRN details");
      }
    };

    fetchGrn();
  }, [id]);

  const totalItems = useMemo(() => {
    return grn?.items?.length || 0;
  }, [grn]);

  const totalReceived = useMemo(() => {
    return (grn?.items || []).reduce(
      (sum, item) => sum + Number(item.delivered_quantity || 0),
      0
    );
  }, [grn]);

  if (error) return <div className="ib ib-d"><span>⚠️</span><div>{error}</div></div>;
  if (!grn) return <div className="tw"><div className="tw-h"><h3>Loading GRN...</h3></div></div>;

  return (
    <div>
      <div className="fb" style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22 }}>Goods Receiving Note</h2>
          <p style={{ margin: "6px 0 0", color: "var(--text3)", fontSize: 14 }}>
            Review received goods, supplier details, and remarks.
          </p>
        </div>
      </div>

      <div className="krow k4" style={{ marginBottom: 20 }}>
        <div className="kc g">
          <div className="ki">📥</div>
          <div className="kv">{grn.grn_number || "—"}</div>
          <div className="kl">GRN Number</div>
        </div>

        <div className="kc b">
          <div className="ki">📄</div>
          <div className="kv">{grn.po_number || "—"}</div>
          <div className="kl">PO Number</div>
        </div>

        <div className="kc a">
          <div className="ki">📦</div>
          <div className="kv">{totalItems}</div>
          <div className="kl">Total Items</div>
        </div>

        <div className="kc p">
          <div className="ki">⚖️</div>
          <div className="kv">{totalReceived}</div>
          <div className="kl">Total Received Qty</div>
        </div>
      </div>

      <div className="fg fg-2" style={{ gap: 20, marginBottom: 20 }}>
        <div className="tw">
          <div className="tw-h">
            <h3>Supplier Information</h3>
          </div>
          <div className="md-b" style={{ padding: 22 }}>
            <div style={{ marginBottom: 14 }}>
              <div className="fst">Supplier</div>
              <div style={{ fontSize: 16, fontWeight: 800, marginTop: 6 }}>{grn.supplier_name || "—"}</div>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div className="fst">Contact Number</div>
                <div>{grn.contact_number || "—"}</div>
              </div>
              <div>
                <div className="fst">Email</div>
                <div>{grn.email || "—"}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="tw">
          <div className="tw-h">
            <h3>Receipt Information</h3>
          </div>
          <div className="md-b" style={{ padding: 22 }}>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div className="fst">Received Date</div>
                <div>{fmtDate(grn.received_date)}</div>
              </div>
              <div>
                <div className="fst">Received Time</div>
                <div>{grn.received_time || "—"}</div>
              </div>
              <div>
                <div className="fst">Created By</div>
                <div>{grn.created_by_name || "—"}</div>
              </div>
              <div>
                <div className="fst">Status</div>
                <div>{grn.status || "Recorded"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="tw" style={{ marginBottom: 20 }}>
        <div className="tw-h">
          <h3>Remarks</h3>
        </div>
        <div className="md-b" style={{ padding: 22 }}>
          <p style={{ margin: 0, lineHeight: 1.7, color: "var(--text)" }}>
            {grn.remarks || "No remarks added for this GRN."}
          </p>
        </div>
      </div>

      <div className="tw">
        <div className="tw-h">
          <h3>Received Items</h3>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 980, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "12px 10px", whiteSpace: "nowrap" }}>Item Code</th>
                <th style={{ textAlign: "left", padding: "12px 10px", whiteSpace: "nowrap" }}>Item Name</th>
                <th style={{ textAlign: "left", padding: "12px 10px", whiteSpace: "nowrap" }}>Unit</th>
                <th style={{ textAlign: "right", padding: "12px 10px", whiteSpace: "nowrap" }}>Ordered Quantity</th>
                <th style={{ textAlign: "right", padding: "12px 10px", whiteSpace: "nowrap" }}>Received Quantity</th>
                <th style={{ textAlign: "right", padding: "12px 10px", whiteSpace: "nowrap" }}>Variance</th>
                <th style={{ textAlign: "right", padding: "12px 10px", whiteSpace: "nowrap" }}>Unit Cost</th>
                <th style={{ textAlign: "right", padding: "12px 10px", whiteSpace: "nowrap" }}>Line Total</th>
                <th style={{ textAlign: "left", padding: "12px 10px", whiteSpace: "nowrap" }}>Batch Number</th>
              </tr>
            </thead>
            <tbody>
              {grn.items?.length ? (
                grn.items.map((item) => {
                  const variance = Number(item.delivered_quantity || 0) - Number(item.ordered_quantity || 0);
                  const varianceColor = variance > 0 ? "var(--s)" : variance < 0 ? "var(--d)" : "var(--text3)";
                  const varianceLabel = variance > 0 ? `+${variance}` : `${variance}`;

                  return (
                    <tr key={item.id}>
                      <td style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text3)", padding: "12px 10px" }}>{item.item_code || "—"}</td>
                      <td style={{ fontWeight: 600, padding: "12px 10px" }}>{item.item_name || "—"}</td>
                      <td style={{ padding: "12px 10px" }}>{item.unit || "—"}</td>
                      <td style={{ padding: "12px 10px", textAlign: "right" }}>{item.ordered_quantity ?? 0}</td>
                      <td style={{ padding: "12px 10px", textAlign: "right" }}>{item.delivered_quantity ?? 0}</td>
                      <td style={{ padding: "12px 10px", textAlign: "right", fontWeight: 700, color: varianceColor }}>
                        {varianceLabel}
                      </td>
                      <td style={{ padding: "12px 10px", textAlign: "right" }}>
                        {item.unit_cost != null ? Number(item.unit_cost).toLocaleString("en-LK") : "—"}
                      </td>
                      <td style={{ padding: "12px 10px", textAlign: "right" }}>
                        {item.line_total != null ? Number(item.line_total).toLocaleString("en-LK") : "—"}
                      </td>
                      <td style={{ padding: "12px 10px" }}>{item.batch_number || "—"}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", color: "var(--text3)", padding: 16 }}>
                    No items found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="tw" style={{ marginTop: 20 }}>
        <div className="tw-h">
          <h3>Inventory Summary</h3>
        </div>
        <div className="md-b" style={{ padding: 22 }}>
          <div className="krow k3" style={{ marginBottom: 0 }}>
            <div className="kc a">
              <div className="ki">📦</div>
              <div className="kv">{totalItems}</div>
              <div className="kl">Total Items Updated</div>
            </div>

            <div className="kc b">
              <div className="ki">⚖️</div>
              <div className="kv">{totalReceived}</div>
              <div className="kl">Total Quantity Received</div>
            </div>

            <div className="kc g">
              <div className="ki">✅</div>
              <div className="kv" style={{ fontSize: 18 }}>Inventory Updated Successfully</div>
              <div className="kl">Inventory Status</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GrnDetailsPage;
