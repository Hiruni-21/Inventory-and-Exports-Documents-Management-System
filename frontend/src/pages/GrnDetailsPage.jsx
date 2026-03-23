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

  const totalDelivered = useMemo(() => {
    return (grn?.items || []).reduce((sum, item) => sum + Number(item.delivered_quantity || 0), 0);
  }, [grn]);

  if (error) return <div className="ib ib-d"><span>⚠️</span><div>{error}</div></div>;
  if (!grn) return <div className="tw"><div className="tw-h"><h3>Loading GRN...</h3></div></div>;

  return (
    <div>
      <div className="cg cg-3" style={{ marginBottom: 16 }}>
        <div className="kc">
          <div className="kic g">📥</div>
          <div className="kv">{grn.grn_number}</div>
          <div className="kl">GRN Number</div>
        </div>
        <div className="kc">
          <div className="kic b">📄</div>
          <div className="kv">{grn.po_number}</div>
          <div className="kl">Linked PO</div>
        </div>
        <div className="kc">
          <div className="kic a">⚖️</div>
          <div className="kv">{totalDelivered}</div>
          <div className="kl">Total Delivered Qty</div>
        </div>
      </div>

      <div className="tw" style={{ marginBottom: 16 }}>
        <div className="tw-h">
          <h3>GRN Details</h3>
          <span className="badge bg-g">Recorded</span>
        </div>
        <div className="md-b" style={{ padding: 20 }}>
          <div className="fg fg-2">
            <div>
              <div className="fst">Supplier</div>
              <p><strong>{grn.supplier_name}</strong></p>
              <p>{grn.contact_number || "—"}</p>
              <p>{grn.email || "—"}</p>
            </div>
            <div>
              <div className="fst">Receipt Info</div>
              <p><strong>Received Date:</strong> {fmtDate(grn.received_date)}</p>
              <p><strong>Received Time:</strong> {grn.received_time || "—"}</p>
              <p><strong>Created By:</strong> {grn.created_by_name || "—"}</p>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div className="fst">Remarks</div>
            <div className="ib ib-i" style={{ marginBottom: 0 }}>
              <span>📝</span>
              <div>{grn.remarks || "No remarks added for this GRN."}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="tw">
        <div className="tw-h">
          <h3>Received Items</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Item Name</th>
              <th>Unit</th>
              <th>Ordered Qty</th>
              <th>Delivered Qty</th>
              <th>Variance</th>
            </tr>
          </thead>
          <tbody>
            {grn.items?.length ? (
              grn.items.map((item) => {
                const variance = Number(item.delivered_quantity || 0) - Number(item.ordered_quantity || 0);
                return (
                  <tr key={item.id}>
                    <td style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text3)" }}>{item.item_code}</td>
                    <td style={{ fontWeight: 600 }}>{item.item_name}</td>
                    <td>{item.unit}</td>
                    <td>{item.ordered_quantity}</td>
                    <td>{item.delivered_quantity}</td>
                    <td style={{ fontWeight: 700, color: variance < 0 ? "var(--d)" : variance > 0 ? "var(--s)" : "var(--text3)" }}>
                      {variance > 0 ? "+" : ""}{variance}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", color: "var(--text3)" }}>No items found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GrnDetailsPage;
