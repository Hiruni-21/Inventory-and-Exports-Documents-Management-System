import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const formatDate = (value) => {
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

const backendBase =
  (import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api").replace(/\/api\/?$/, "");

const getFileUrl = (filePath) => {
  if (!filePath) return "";
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) return filePath;
  return `${backendBase}${filePath.startsWith("/") ? filePath : `/${filePath}`}`;
};

export default function WastageDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadRecord = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/wastage/${id}`);
      setRecord(res.data || null);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load wastage record");
      setRecord(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecord();
  }, [id]);

  const totals = useMemo(() => {
    const items = record?.items || [];
    return {
      qty: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      value: items.reduce((sum, item) => sum + Number(item.line_total || 0), 0),
    };
  }, [record]);

  if (loading) {
    return <div className="content-card"><div className="empty-row" style={{ padding: 28 }}>Loading wastage details...</div></div>;
  }

  if (!record) {
    return <div className="content-card"><div className="empty-row" style={{ padding: 28 }}>Wastage record not found</div></div>;
  }

  return (
    <>
      <div className="fb" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <button type="button" className="btn btn-secondary" onClick={() => navigate("/wastage")}>
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      <div className="krow k3">
        <div className="kc g">
          <div className="kv">{record.wastage_number}</div>
          <div className="kl">Wastage Number</div>
        </div>
        <div className="kc a">
          <div className="kv">{totals.qty.toFixed(2)}</div>
          <div className="kl">Total Qty</div>
        </div>
        <div className="kc b">
          <div className="kv">{money(totals.value)}</div>
          <div className="kl">Total Value</div>
        </div>
      </div>

      <div className="content-card" style={{ marginBottom: 16 }}>
        <div className="card-header-row">
          <h3>Wastage Details</h3>
          <span className="badge bg-a">{record.reason || "Wastage"}</span>
        </div>

        <div style={{ padding: 20 }}>
          <div className="details-panel-grid">
            <div className="details-stat-card"><label>DATE</label><span>{formatDate(record.wastage_date)}</span></div>
            <div className="details-stat-card"><label>REPORTED BY</label><span>{record.reported_by_name || "—"}</span></div>
            <div className="details-stat-card details-stat-card-full"><label>REMARKS</label><span>{record.remarks || "—"}</span></div>
          </div>
        </div>
      </div>

      <div className="content-card" style={{ marginBottom: 16 }}>
        <div className="card-header-row">
          <h3>Wastage Items</h3>
          <span className="count-pill">{(record.items || []).length} items</span>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ITEM</th>
                <th>QTY</th>
                <th>BATCH</th>
                <th>UNIT COST</th>
                <th>LINE TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {record.items?.length ? (
                record.items.map((item) => (
                  <tr key={item.id}>
                    <td className="strong-cell">{item.item_name}</td>
                    <td>{Number(item.quantity || 0).toFixed(2)} {item.unit}</td>
                    <td>{item.batch_number || "—"}</td>
                    <td>{money(item.unit_cost)}</td>
                    <td>{money(item.line_total)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="empty-row">No items found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="content-card">
        <div className="card-header-row">
          <h3>Photo Evidence</h3>
          <span className="count-pill">{(record.photos || []).length} photos</span>
        </div>

        <div className="rw-photo-gallery">
          {record.photos?.length ? (
            record.photos.map((photo) => {
              const fileUrl = getFileUrl(photo.file_path);
              return (
                <a
                  key={photo.id}
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rw-photo-card"
                >
                  <img src={fileUrl} alt={photo.original_name || photo.file_name} />
                  <span>{photo.original_name || photo.file_name}</span>
                </a>
              );
            })
          ) : (
            <div className="empty-row">No photo evidence uploaded</div>
          )}
        </div>
      </div>
    </>
  );
}