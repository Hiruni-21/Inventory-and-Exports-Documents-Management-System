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
  if (text === "pending_verification") return "Pending Verify";
  if (text === "verified") return "Verified";
  return "Received";
};

const badgeClass = (value) => {
  const text = String(value || "received").toLowerCase();
  if (text === "pending_verification") return "badge bg-a";
  if (text === "verified") return "badge bg-b";
  return "badge bg-g";
};
const backendBase =
  (import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api").replace(/\/api\/?$/, "");

const getFileUrl = (filePath) => {
  if (!filePath) return "";
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) return filePath;
  return `${backendBase}${filePath.startsWith("/") ? filePath : `/${filePath}`}`;
};

export default function GrnDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const [grn, setGrn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  const canVerify =
    ["manager", "ops", "operation"].some((word) =>
      String(user?.role || "").toLowerCase().includes(word)
    ) && String(grn?.status || "").toLowerCase() === "pending_verification";

  const loadGrn = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get(`/grn/${id}`);
      setGrn(res.data || null);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to load GRN details");
      setGrn(null);
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
      qty: items.reduce((sum, item) => sum + Number(item.received_qty || 0), 0),
      value: items.reduce((sum, item) => sum + Number(item.line_total || 0), 0),
    };
  }, [grn]);

  const handleVerify = async () => {
    try {
      setVerifying(true);
      const res = await api.put(`/grn/${id}/verify`);
      toast.success(res.data?.message || "GRN verified successfully");
      await loadGrn();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to verify GRN");
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="content-card">
        <div className="empty-row" style={{ padding: 28 }}>
          Loading GRN details...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <>
        <div className="fb" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <button type="button" className="btn btn-s" onClick={() => navigate("/grn")}>
            <ArrowLeft size={16} /> Back
          </button>
        </div>

        <div className="content-card">
          <div className="empty-row" style={{ padding: 28, color: "#c84b2f" }}>
            {error}
          </div>
        </div>
      </>
    );
  }

  if (!grn) {
    return (
      <>
        <div className="fb" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <button type="button" className="btn btn-s" onClick={() => navigate("/grn")}>
            <ArrowLeft size={16} /> Back
          </button>
        </div>

        <div className="content-card">
          <div className="empty-row" style={{ padding: 28 }}>
            GRN not found
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="fb" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <button type="button" className="btn btn-s" onClick={() => navigate("/grn")}>
          <ArrowLeft size={16} /> Back
        </button>

        {canVerify ? (
          <button
            type="button"
            className="btn btn-confirm-grn"
            onClick={handleVerify}
            disabled={verifying}
          >
            <CheckCircle2 size={16} />
            {verifying ? "Verifying..." : "Verify GRN"}
          </button>
        ) : null}
      </div>

      <div className="krow k3">
        <div className="kc g">
          <div className="kv">{grn.grn_number}</div>
          <div className="kl">GRN Number</div>
        </div>
        <div className="kc a">
          <div className="kv">{totals.qty.toFixed(2)}</div>
          <div className="kl">Received Qty</div>
        </div>
        <div className="kc b">
          <div className="kv">{money(totals.value)}</div>
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
              <label>LINKED PO</label>
              <span>{grn.po_number || "—"}</span>
            </div>
            <div className="details-stat-card">
              <label>SUPPLIER</label>
              <span>{grn.supplier_name || "—"}</span>
            </div>
            <div className="details-stat-card">
              <label>PO DATE</label>
              <span>{fmtDate(grn.po_order_date)}</span>
            </div>
            <div className="details-stat-card">
              <label>RECEIVED DATE</label>
              <span>{fmtDate(grn.received_date)}</span>
            </div>
            <div className="details-stat-card">
              <label>SUPPLIER INVOICE NO.</label>
              <span>{grn.supplier_invoice_no || "—"}</span>
            </div>
            <div className="details-stat-card">
              <label>RECEIVED BY</label>
              <span>{grn.received_by_name || "—"}</span>
            </div>
            <div className="details-stat-card">
              <label>CONTACT</label>
              <span>{grn.contact_number || "—"}</span>
            </div>
            <div className="details-stat-card">
              <label>EMAIL</label>
              <span>{grn.email || "—"}</span>
            </div>
            <div className="details-stat-card details-stat-card-full">
              <label>REMARKS</label>
              <span>{grn.remarks || "—"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="content-card" style={{ marginBottom: 16 }}>
        <div className="card-header-row">
          <h3>Items Received</h3>
          <span className="count-pill">{(grn.items || []).length} items</span>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ITEM</th>
                <th>ORDERED</th>
                <th>RECEIVED</th>
                <th>BATCH</th>
                <th>EXPIRY</th>
                <th>QUALITY</th>
                <th>VARIANCE</th>
              </tr>
            </thead>
            <tbody>
              {grn.items?.length ? (
                grn.items.map((item) => (
                  <tr key={item.id}>
                    <td className="strong-cell">{item.item_name}</td>
                    <td>
                      {Number(item.ordered_qty || 0).toFixed(2)} {item.unit}
                    </td>
                    <td>
                      {Number(item.received_qty || 0).toFixed(2)} {item.unit}
                    </td>
                    <td>{item.batch_number || "—"}</td>
                    <td>{fmtDate(item.expiry_date)}</td>
                    <td>{item.quality_grade || "—"}</td>
                    <td className={Number(item.variance_qty || 0) === 0 ? "yes-text" : "no-text"}>
                      {Number(item.variance_qty || 0) > 0 ? "+" : ""}
                      {Number(item.variance_qty || 0).toFixed(2)} {item.unit}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="empty-row">
                    No items found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="content-card">
        <div className="card-header-row">
          <h3>Photo Evidence</h3>
          <span className="count-pill">{(grn.photos || []).length} photos</span>
        </div>

        <div className="grn-photo-gallery">
        {grn.photos?.length ? (
          grn.photos.map((photo) => {
            const fileUrl = getFileUrl(photo.file_path);

            return (
              <a
                key={photo.id}
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="grn-photo-card"
              >
                <img
                  src={fileUrl}
                  alt={photo.original_name || photo.file_name}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <span>{photo.original_name || photo.file_name}</span>
              </a>
            );
          })
        ) : (
  <div className="empty-row">No photo evidence uploaded</div>
)}        </div>
      </div>
    </>
  );
}