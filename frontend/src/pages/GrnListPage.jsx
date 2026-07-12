import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import AddGrnModal from "../components/AddGrnModal";

const fmtDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-CA");
};

const fmtTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
};

const GrnListPage = () => {
  const navigate = useNavigate();
  const [grnList, setGrnList] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchGrn = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/grn");
      setGrnList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load GRN records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrn();
  }, []);

  const filteredGrn = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return grnList;

    return grnList.filter((grn) =>
      [grn.grn_number, grn.po_number, grn.supplier_name, grn.created_by_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [grnList, search]);

  return (
    <div>
      <div className="fb" style={{ marginBottom: 16 }}>
        <div className="sw">
          <input
            className="si"
            placeholder="Search GRNs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ marginLeft: "auto" }}>
          <button type="button" className="btn btn-p" onClick={() => setShowCreateModal(true)}>
            + New GRN
          </button>
        </div>
      </div>

      {loading ? (
        <div className="ib ib-i">
          <span>⏳</span>
          <div>Loading GRN records...</div>
        </div>
      ) : null}

      {error ? (
        <div className="ib ib-d">
          <span></span>
          <div>{error}</div>
        </div>
      ) : null}

      <div className="tw">
        <div className="tw-h">
          <h3>Goods Received Notes</h3>
        </div>

        <table>
          <thead>
            <tr>
              <th>GRN No.</th>
              <th>Linked PO</th>
              <th>Supplier</th>
              <th>Received Date</th>
              <th>Received Time</th>
              <th>Created By</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredGrn.length > 0 ? (
              filteredGrn.map((grn) => (
                <tr key={grn.id} onClick={() => navigate(`/grn/${grn.id}`)} style={{ cursor: "pointer" }}>
                  <td style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--g800)" }}>
                    {grn.grn_number}
                  </td>
                  <td>{grn.po_number || "—"}</td>
                  <td>{grn.supplier_name || "—"}</td>
                  <td>{fmtDate(grn.received_date)}</td>
                  <td>{fmtTime(grn.created_at)}</td>
                  <td>{grn.created_by_name || "—"}</td>
                  <td>
                    <span className="badge bg-g">Recorded</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", color: "var(--text3)" }}>
                  No GRN records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <AddGrnModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchGrn();
          }}
        />
      )}
    </div>
  );
};

export default GrnListPage;