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

  const handleViewPdf = async (id) => {
    try {
      const res = await api.post(`/returns/${id}/render-pdf`);
      if (res.data?.documentUrl) {
        window.open(res.data.documentUrl, "_blank");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to view return note PDF");
    }
  };

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
                <th>Item Coverage</th>
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
                    <td>
                      {(() => {
                        const rec = Number(row.total_received_for_item || 0);
                        const ret = Number(row.total_returned_for_item || 0);
                        if (ret <= 0) return <span className="badge" style={{background: "#F3F4F6", color: "#6B7280"}}>Not Returned</span>;
                        if (ret < rec) return <span className="badge badge-y">Partial ({ret} of {rec})</span>;
                        return <span className="badge badge-g">Fully Returned</span>;
                      })()}
                    </td>
                    <td>{row.reason}</td>
                    <td>{row.created_by_name || "—"}</td>
                    <td>
                      <span className={`badge ${row.status === "sent" ? "badge-g" : "badge-y"}`}>
                        {row.status || "draft"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {(!row.status || row.status === "draft") ? (
                          <button
                            className="btn btn-s btn-sm"
                            onClick={() => handleSendNote(row.id)}
                            disabled={sendingId === row.id}
                          >
                            {sendingId === row.id ? "Sending..." : "Send Note"}
                          </button>
                        ) : (
                          <>
                            <button
                              className="btn btn-s btn-sm"
                              onClick={() => handleViewPdf(row.id)}
                            >
                              View
                            </button>
                            <button
                              className="btn btn-s btn-sm"
                              onClick={() => handleSendNote(row.id)}
                              disabled={sendingId === row.id}
                            >
                              {sendingId === row.id ? "Sending..." : "Resend"}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" style={{ textAlign: "center", color: "var(--text3)" }}>
                    No returns found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div>
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