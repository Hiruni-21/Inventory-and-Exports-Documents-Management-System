import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../utils/api";

const DispatchPrintPage = () => {
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

  useEffect(() => {
    if (dispatchRecord) {
      setTimeout(() => window.print(), 500);
    }
  }, [dispatchRecord]);

  if (error) return <div className="print-page">{error}</div>;
  if (!dispatchRecord) return <div className="print-page">Loading...</div>;

  return (
    <div className="print-page">
      <div className="print-header">
        <h1>Fresh World Exporters</h1>
        <h2>Local Dispatch Note</h2>
      </div>

      <div className="print-section">
        <p><strong>Dispatch Number:</strong> {dispatchRecord.dispatch_number}</p>
        <p><strong>Customer:</strong> {dispatchRecord.client_name}</p>
        <p><strong>Dispatch Date:</strong> {dispatchRecord.dispatch_date}</p>
        <p><strong>Created By:</strong> {dispatchRecord.created_by_name || "-"}</p>
        <p><strong>Remarks:</strong> {dispatchRecord.remarks || "-"}</p>
      </div>

      <div className="print-section">
        <h3>Items</h3>
        <table className="print-table">
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
                  <td>{item.item_code}</td>
                  <td>{item.item_name}</td>
                  <td>{item.batch_code}</td>
                  <td>{item.unit}</td>
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

      <div className="print-footer">
        <div>
          <p>Prepared By</p>
          <div className="signature-line"></div>
        </div>
        <div>
          <p>Approved By</p>
          <div className="signature-line"></div>
        </div>
      </div>
    </div>
  );
};

export default DispatchPrintPage;