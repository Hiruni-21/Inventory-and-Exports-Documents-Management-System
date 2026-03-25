import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../utils/api";

const fmtDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-CA");
};

const fmtDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const DispatchDetailsPage = () => {
  const { id } = useParams();
  const [dispatchRecord, setDispatchRecord] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await api.get(`/dispatch/${id}`);
        setDispatchRecord(res.data);
      } catch {
        setError("Failed to load dispatch details");
      }
    };

    fetchDetails();
  }, [id]);

  const totalQty = useMemo(() => {
    return (dispatchRecord?.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }, [dispatchRecord]);

  if (error) {
    return (
      <div className="ib ib-d">
        <span>⚠️</span>
        <div>{error}</div>
      </div>
    );
  }

  if (!dispatchRecord) {
    return (
      <div className="ib ib-i">
        <span>⏳</span>
        <div>Loading dispatch details...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="fb">
        <div className="ib ib-s" style={{ marginBottom: 0 }}>
          <span>🚚</span>
          <div>
            Dispatch created successfully. Inventory was deducted from the selected source batches.
          </div>
        </div>

        <Link to={`/dispatch/print/${id}`} className="btn btn-p btn-sm" target="_blank">
          🖨 Print
        </Link>
      </div>

      <div className="cc">
        <h3>Dispatch Details</h3>
        <p>Dispatch header and line breakdown</p>

        <div className="fr">
          <div>
            <div className="sum-r">
              <span>Dispatch Number</span>
              <span>{dispatchRecord.dispatch_number}</span>
            </div>
            <div className="sum-r">
              <span>Customer</span>
              <span>{dispatchRecord.client_name}</span>
            </div>
            <div className="sum-r">
              <span>Dispatch Date</span>
              <span>{fmtDate(dispatchRecord.dispatch_date)}</span>
            </div>
          </div>

          <div>
            <div className="sum-r">
              <span>Created By</span>
              <span>{dispatchRecord.created_by_name || "—"}</span>
            </div>
            <div className="sum-r">
              <span>Created At</span>
              <span>{fmtDateTime(dispatchRecord.created_at)}</span>
            </div>
            <div className="sum-r">
              <span>Total Quantity</span>
              <span>{totalQty.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <strong>Remarks:</strong> {dispatchRecord.remarks || "—"}
        </div>
      </div>

      <div className="tw">
        <div className="tw-h">
          <h3>Dispatch Items</h3>
        </div>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Item Code</th>
              <th>Item Name</th>
              <th>Batch</th>
              <th>Unit</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {dispatchRecord.items?.length > 0 ? (
              dispatchRecord.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 11 }}>{item.item_code}</td>
                  <td style={{ fontWeight: 600 }}>{item.item_name}</td>
                  <td>{item.batch_code}</td>
                  <td>{item.unit}</td>
                  <td>{item.quantity}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", color: "var(--text3)" }}>
                  No items found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DispatchDetailsPage;