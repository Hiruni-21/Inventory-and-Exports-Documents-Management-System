import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../utils/api";

const formatDate = (value) => {
  if (!value) return "—";
  return String(value).slice(0, 10);
};

const getWindowStart = (value) => {
  if (!value) return "—";
  if (value.includes("–")) return value.split("–")[0].trim();
  if (value.includes("-")) return value.split("-")[0].trim();
  return value;
};

export default function DispatchPrintPage() {
  const { id } = useParams();
  const [dispatchRecord, setDispatchRecord] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDispatch = async () => {
      try {
        const res = await api.get(`/dispatch/${id}`);
        setDispatchRecord(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load dispatch details");
      }
    };

    loadDispatch();
  }, [id]);

  useEffect(() => {
    if (dispatchRecord) {
      const timer = window.setTimeout(() => window.print(), 500);
      return () => window.clearTimeout(timer);
    }
  }, [dispatchRecord]);

  const totalWeight = useMemo(() => {
    return (dispatchRecord?.items || []).reduce(
      (sum, row) => sum + Number(row.quantity || 0),
      0
    );
  }, [dispatchRecord]);

  if (error) return <div className="print-page">{error}</div>;
  if (!dispatchRecord) return <div className="print-page">Loading...</div>;

  return (
    <div className="print-page">
      <div className="print-header">
        <h1>Fresh World Exporters</h1>
        <h2>Delivery Note (DN)</h2>
      </div>

      <div className="print-section">
        <p><strong>Dispatch Number:</strong> {dispatchRecord.dispatch_number}</p>
        <p><strong>Delivery Note:</strong> {dispatchRecord.delivery_note_number || "-"}</p>
        <p><strong>Customer:</strong> {dispatchRecord.client_name}</p>
        <p><strong>Dispatch Date:</strong> {formatDate(dispatchRecord.dispatch_date)}</p>
        <p><strong>Departure Time:</strong> {getWindowStart(dispatchRecord.delivery_window)}</p>
        <p><strong>Driver:</strong> {dispatchRecord.driver_name || "-"}</p>
        <p><strong>Vehicle:</strong> {dispatchRecord.vehicle_number || "-"}</p>
        <p><strong>Status:</strong> {dispatchRecord.status || "-"}</p>
        <p><strong>Remarks:</strong> {dispatchRecord.remarks || "-"}</p>
      </div>

      <div className="print-section">
        <h3>Items</h3>
        <table className="print-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Item Code</th>
              <th>Item Name</th>
              <th>Batch</th>
              <th>Unit</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {(dispatchRecord.items || []).length ? (
              dispatchRecord.items.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>{item.item_code}</td>
                  <td>{item.item_name}</td>
                  <td>{item.batch_code || "-"}</td>
                  <td>{item.unit || "-"}</td>
                  <td>{item.quantity}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6">No items found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="print-section">
        <p><strong>Total Weight:</strong> {totalWeight.toFixed(2)} kg</p>
      </div>

      <div className="print-footer">
        <div>
          <p>Prepared By</p>
          <div className="signature-line"></div>
        </div>
        <div>
          <p>Received By</p>
          <div className="signature-line"></div>
        </div>
      </div>
    </div>
  );
}