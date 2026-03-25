import { useEffect, useMemo, useState } from "react";
import api from "../utils/api";

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
  }, []);

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
          <div className="tw-h">
            <h3>Return Notes</h3>
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
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", color: "var(--text3)" }}>
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
            <div className="tw-h">
              <h3>Wastage Records</h3>
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
    </div>
  );
};

export default ReturnListPage;