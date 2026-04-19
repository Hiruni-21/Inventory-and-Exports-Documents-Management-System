import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

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

const statusLabel = (value) => {
  const text = String(value || "received").toLowerCase();
  if (text === "pending_verification") return "Pending Verification";
  if (text === "verified") return "Verified";
  return "Received";
};

const badgeClass = (value) => {
  const text = String(value || "received").toLowerCase();
  if (text === "pending_verification") return "badge bg-a";
  if (text === "verified") return "badge bg-b";
  return "badge bg-g";
};

export default function GrnDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const [grn, setGrn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  const canVerify =
    ["manager", "ops", "operations"].some((word) =>
      String(user?.role || "").toLowerCase().includes(word)
    ) &&
    String(grn?.status || "").toLowerCase() === "pending_verification";

  const loadGrn = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/grn/${id}`);
      setGrn(res.data || null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load GRN details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGrn();
  }, [id]);

  const totals = useMemo(() => {
    const items = grn?.items || [];
    return {
      totalReceived: items.reduce((sum, item) => sum + Number(item.received_qty || 0), 0),
      totalVariance: items.reduce((sum, item) => sum + Number(item.variance_qty || 0), 0),
      totalValue: items.reduce((sum, item) => sum + Number(item.line_total || 0), 0),
    };
  }, [grn]);

  const handleVerify = async () => {
    try {
      setVerifying(true);
      const res = await api.put(`/grn/${id}/verify`);
      toast.success(res.data?.message || "GRN verified successfully");
      await loadGrn();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to verify GRN");
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return <div className="empty-row">Loading GRN details...</div>;
  }

  if (!grn) return null;

  return (
    <>
      <div className="fb" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <button type="button" className="btn btn-secondary" onClick={() => navigate("/grn")}>
          <ArrowLeft size={16} /> Back
        </button>

        {canVerify ? (
          <button type="button" className="btn btn-primary" onClick={handleVerify} disabled={verifying}>
            <CheckCircle2 size={16} /> {verifying ? "Verifying..." : "Verify GRN"}
          </button>
        ) : null}
      </div>

      {String(grn.status || "").toLowerCase() === "pending_verification" ? (
        <div className="notice-banner notice-warning" style={{ marginBottom: 16 }}>
          <span>This GRN exceeded the allowed variance threshold and is waiting for Ops verification before inventory update.</span>
        </div>
      ) : null}

      <div className="krow k3">
        <div className="kc g">
          <div className="kv">{grn.grn_number}</div>
          <div className="kl">GRN Number</div>
        </div>
        <div className="kc a">
          <div className="kv">{totals.totalReceived.toFixed(2)}</div>
          <div className="kl">Received Qty</div>
        </div>
        <div className="kc b">
          <div className="kv">{money(totals.totalValue)}</div>
          <div className="kl">Total Value</div>
        </div>
      </div>

      <div className="content-card" style={{ marginBottom: 16 }}>
        <div className="card-header-row">
          <h3>GRN Details</h3>
          <span className={badgeClass(grn.status)}>{statusLabel(grn.status)}</span>
        </div>

        <div style={{ padding: 20 }}>
          <div className="details-panel-grid">
            <div className="details-stat-card">
              <label>PO NUMBER</label>
              <span>{grn.po_number}</span>
            </div>
            <div className="details-stat-card">
              <label>RECEIVED DATE</label>
              <span>{fmtDate(grn.received_date)}</span>
            </div>
            <div className="details-stat-card">
              <label>SUPPLIER</label>
              <span>{grn.supplier_name}</span>
            </div>
            <div className="details-stat-card">
              <label>CREATED BY</label>
              <span>{grn.created_by_name || "—"}</span>
            </div>
            <div className="details-stat-card">
              <label>SUPPLIER EMAIL</label>
              <span>{grn.email || "—"}</span>
            </div>
            <div className="details-stat-card">
              <label>SUPPLIER MOBILE</label>
              <span>{grn.contact_number || "—"}</span>
            </div>
            <div className="details-stat-card">
              <label>VERIFIED BY</label>
              <span>{grn.verified_by_name || "—"}</span>
            </div>
            <div className="details-stat-card">
              <label>VERIFIED AT</label>
              <span>{fmtDate(grn.verified_at)}</span>
            </div>
            <div className="details-stat-card details-stat-card-full">
              <label>REMARKS</label>
              <span>{grn.remarks || "—"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="content-card">
        <div className="card-header-row">
          <h3>Received Items</h3>
          <span className="count-pill">{(grn.items || []).length} lines</span>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ITEM CODE</th>
                <th>ITEM NAME</th>
                <th>ORDERED</th>
                <th>RECEIVED</th>
                <th>VARIANCE</th>
                <th>%</th>
                <th>BATCH</th>
                <th>EXPIRY</th>
                <th>UNIT COST</th>
                <th>LINE TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {grn.items?.length ? (
                grn.items.map((item) => (
                  <tr key={item.id}>
                    <td className="code-cell">{item.item_code}</td>
                    <td className="strong-cell">{item.item_name}</td>
                    <td>{Number(item.ordered_qty || 0).toFixed(2)} {item.unit}</td>
                    <td>{Number(item.received_qty || 0).toFixed(2)} {item.unit}</td>
                    <td className={Number(item.verification_required || 0) === 1 ? "no-text" : "yes-text"}>
                      {Number(item.variance_qty || 0) > 0 ? "+" : ""}
                      {Number(item.variance_qty || 0).toFixed(2)}
                    </td>
                    <td>{Number(item.variance_percent || 0).toFixed(2)}%</td>
                    <td>{item.batch_number || "—"}</td>
                    <td>{fmtDate(item.expiry_date)}</td>
                    <td>{money(item.unit_cost)}</td>
                    <td>{money(item.line_total)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="empty-row">
                    No GRN items found
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