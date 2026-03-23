import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../utils/api";

const ExportDocumentPrintPage = () => {
  const { id } = useParams();
  const [record, setRecord] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await api.get(`/export-documents/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setRecord(res.data);
      } catch (err) {
        setError("Failed to load export document details");
      }
    };

    fetchDetails();
  }, [id]);

  useEffect(() => {
    if (record) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [record]);

  if (error) return <div className="print-page">{error}</div>;
  if (!record) return <div className="print-page">Loading...</div>;

  return (
    <div className="print-page">
      <div className="print-header">
        <h1>Fresh World</h1>
        <h2>Export Document</h2>
      </div>

      <div className="print-section">
        <p><strong>Document Number:</strong> {record.document_number}</p>
        <p><strong>Document Type:</strong> {record.document_type}</p>
        <p><strong>Dispatch Number:</strong> {record.dispatch_number}</p>
        <p><strong>Client Name:</strong> {record.client_name}</p>
        <p><strong>Document Date:</strong> {record.document_date}</p>
        <p><strong>Consignee Name:</strong> {record.consignee_name}</p>
        <p><strong>Destination Country:</strong> {record.destination_country || "-"}</p>
        <p><strong>Port of Loading:</strong> {record.port_of_loading || "-"}</p>
        <p><strong>Port of Discharge:</strong> {record.port_of_discharge || "-"}</p>
        <p><strong>Created By:</strong> {record.created_by_name || "-"}</p>
        <p><strong>Remarks:</strong> {record.remarks || "-"}</p>
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
              <th>Unit Price</th>
              <th>Total Value</th>
            </tr>
          </thead>
          <tbody>
            {record.items.length > 0 ? (
              record.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.item_code}</td>
                  <td>{item.item_name}</td>
                  <td>{item.batch_code}</td>
                  <td>{item.unit}</td>
                  <td>{item.quantity}</td>
                  <td>{item.unit_price}</td>
                  <td>{item.total_value}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8">No items found</td>
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

export default ExportDocumentPrintPage;