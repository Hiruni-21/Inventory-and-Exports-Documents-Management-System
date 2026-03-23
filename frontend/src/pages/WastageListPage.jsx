import { useEffect, useMemo, useState } from "react";
import api from "../utils/api";

const fmtDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const WastageListPage = () => {
  const [records, setRecords] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await api.get("/wastage", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRecords(Array.isArray(res.data) ? res.data : []);
      } catch {
        setError("Failed to load wastage records");
      }
    };

    fetchRecords();
  }, []);

  const totalQty = useMemo(() => records.reduce((sum, row) => sum + Number(row.quantity || 0), 0), [records]);

  return (
    <div>
      <div className="ib ib-w">
        <span>🗑</span>
        <div>Visible wastage quantity total: <strong>{totalQty.toFixed(2)}</strong></div>
      </div>

      {error ? <div className="ib ib-d"><span>⚠️</span><div>{error}</div></div> : null}

      <div className="tw">
        <div className="tw-h">
          <h3>Wastage Records</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Item Code</th>
              <th>Item Name</th>
              <th>Batch</th>
              <th>Quantity</th>
              <th>Reason</th>
              <th>Created By</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {records.length > 0 ? (
              records.map((row) => (
                <tr key={row.id}>
                  <td>{fmtDateTime(row.created_at)}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text3)" }}>{row.item_code}</td>
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
                <td colSpan="8" style={{ textAlign: "center", color: "var(--text3)" }}>
                  No wastage records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WastageListPage;
