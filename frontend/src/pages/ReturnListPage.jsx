import { useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import AddReturnModal from "../components/AddReturnModal";
import AddWastageModal from "../components/AddWastageModal";

const fmtDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const ReturnListPage = () => {
  const [activeTab, setActiveTab] = useState("returns");
  const [returnsData, setReturnsData] = useState([]);
  const [wastageData, setWastageData] = useState([]);
  const [error, setError] = useState("");
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isWastageModalOpen, setIsWastageModalOpen] = useState(false);
  const [sendingId, setSendingId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [returnsRes, wastageRes] = await Promise.all([
          api.get("/returns"),
          api.get("/wastage"),
        ]);

        setReturnsData(Array.isArray(returnsRes.data) ? returnsRes.data : []);
        setWastageData(Array.isArray(wastageRes.data) ? wastageRes.data : []);
      } catch {
        setError("Failed to load returns and wastage records");
      }
    };

    fetchData();
  }, [isReturnModalOpen, isWastageModalOpen]);

  const handleSendNote = async (id) => {
    setSendingId(id);
    try {
      await api.post(`/returns/${id}/send`);
      setReturnsData((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "sent" } : r))
      );
    } catch (err) {
      alert(err.response?.data?.message || "Failed to send return note");
    } finally {
      setSendingId(null);
    }
  };

  const wastageLossEstimate = useMemo(() => {
    return wastageData.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  }, [wastageData]);

  return (
    <div>
      {error ? (
        <div className="ib ib-d">
          <span>⚠️</span>
          <div>{error}</div>
        </div>
      ) : null}

      <div className="tab-bar">
        <button
          className={`tbb ${activeTab === "returns" ? "on" : ""}`}
          onClick={() => setActiveTab("returns")}
        >
          ↩️ Returns ({returnsData.length})
        </button>
        <button
          className={`tbb ${activeTab === "wastage" ? "on" : ""}`}
          onClick={() => setActiveTab("wastage")}
        >
          🗑 Wastage Records ({wastageData.length})
        </button>
      </div>

      {activeTab === "returns" ? (
        <div className="tw">
          <div className="tw-h" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3>Return Notes</h3>
            <button className="btn btn-p btn-sm" onClick={() => setIsReturnModalOpen(true)}>
              + Record Return
            </button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Return No.</th>
                <th>Supplier</th>
                <th>Date</th>
                <th>Item</th>
                <th>Batch</th>
                <th>Qty</th>
                <th>Reason</th>
                <th>Recorded By</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {returnsData.length ? (
                returnsData.map((row) => (
                  <tr key={row.id}>
                    <td
                      style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "var(--d)",
                      }}
                    >
                      RN-{String(row.id).padStart(4, "0")}
                    </td>
                    <td>{row.supplier_name}</td>
                    <td>{fmtDateTime(row.created_at)}</td>
                    <td style={{ fontWeight: 600 }}>{row.item_name}</td>
                    <td>{row.batch_code}</td>
                    <td>{row.quantity}</td>
                    <td>{row.reason}</td>
                    <td>{row.created_by_name || "—"}</td>
                    <td>
                      <span className={`badge ${row.status === "sent" ? "badge-g" : "badge-y"}`}>
                        {row.status || "draft"}
                      </span>
                    </td>
                    <td>
                      {(!row.status || row.status === "draft") && (
                        <button
                          className="btn btn-s btn-sm"
                          onClick={() => handleSendNote(row.id)}
                          disabled={sendingId === row.id}
                        >
                          {sendingId === row.id ? "Sending..." : "Send Note"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" style={{ textAlign: "center", color: "var(--text3)" }}>
                    No returns found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div>
          <div className="ib ib-w">
            <span>🗑</span>
            <div>
              Total wastage quantity recorded so far in this view:{" "}
              <strong>{wastageLossEstimate.toFixed(2)}</strong>
            </div>
          </div>

          <div className="tw">
            <div className="tw-h" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3>Wastage Records</h3>
              <button className="btn btn-p btn-sm" onClick={() => setIsWastageModalOpen(true)}>
                + Record Wastage
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Item</th>
                  <th>Batch</th>
                  <th>Qty</th>
                  <th>Cause</th>
                  <th>Recorded By</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {wastageData.length ? (
                  wastageData.map((row) => (
                    <tr key={row.id}>
                      <td>{fmtDateTime(row.created_at)}</td>
                      <td style={{ fontWeight: 600 }}>{row.item_name}</td>
                      <td>{row.batch_code}</td>
                      <td>{row.quantity}</td>
                      <td>{row.reason}</td>
                      <td>{row.created_by_name || "—"}</td>
                      <td>{row.notes || "—"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", color: "var(--text3)" }}>
                      No wastage records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isReturnModalOpen && (
        <AddReturnModal
          onClose={() => setIsReturnModalOpen(false)}
          onSave={() => setIsReturnModalOpen(false)}
        />
      )}

      {isWastageModalOpen && (
        <AddWastageModal
          onClose={() => setIsWastageModalOpen(false)}
          onSave={() => setIsWastageModalOpen(false)}
        />
      )}
    </div>
  );
};

export default ReturnListPage;