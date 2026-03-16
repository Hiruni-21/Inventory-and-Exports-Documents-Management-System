import { useState } from "react";
import api from "../utils/api";

const ReportsPage = () => {
  const token = localStorage.getItem("token");

  const [reportType, setReportType] = useState("stock-summary");
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    start_date: "",
    end_date: "",
  });

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const loadReport = async () => {
    setError("");
    setRows([]);
    setLoading(true);

    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };

      const needsDateFilter = [
        "stock-movements",
        "dispatch",
        "wastage",
        "returns",
        "export-documents",
      ].includes(reportType);

      if (needsDateFilter && filters.start_date && filters.end_date) {
        config.params = {
          start_date: filters.start_date,
          end_date: filters.end_date,
        };
      }

      const res = await api.get(`/reports/${reportType}`, config);
      setRows(res.data);
    } catch (err) {
      setError("Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  const needsDateFilter = [
    "stock-movements",
    "dispatch",
    "wastage",
    "returns",
    "export-documents",
  ].includes(reportType);

  const renderRows = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan="20">Loading...</td>
        </tr>
      );
    }

    if (error) {
      return (
        <tr>
          <td colSpan="20">{error}</td>
        </tr>
      );
    }

    if (rows.length === 0) {
      return (
        <tr>
          <td colSpan="20">No data found</td>
        </tr>
      );
    }

    if (reportType === "stock-summary") {
      return rows.map((r) => (
        <tr key={r.batch_id}>
          <td>{r.batch_id}</td>
          <td>{r.item_code}</td>
          <td>{r.item_name}</td>
          <td>{r.category_name || "-"}</td>
          <td>{r.batch_code}</td>
          <td>{r.unit}</td>
          <td>{r.available_quantity}</td>
          <td>{r.status}</td>
          <td>{r.expiry_date || "-"}</td>
        </tr>
      ));
    }

    if (reportType === "low-stock") {
      return rows.map((r) => (
        <tr key={r.batch_id}>
          <td>{r.batch_id}</td>
          <td>{r.item_code}</td>
          <td>{r.item_name}</td>
          <td>{r.batch_code}</td>
          <td>{r.unit}</td>
          <td>{r.available_quantity}</td>
          <td>{r.status}</td>
        </tr>
      ));
    }

    if (reportType === "stock-movements") {
      return rows.map((r) => (
        <tr key={r.id}>
          <td>{r.id}</td>
          <td>{r.item_code}</td>
          <td>{r.item_name}</td>
          <td>{r.unit}</td>
          <td>{r.movement_type}</td>
          <td>{r.reference_type}</td>
          <td>{r.reference_id}</td>
          <td>{r.quantity}</td>
          <td>{r.notes || "-"}</td>
          <td>{new Date(r.created_at).toLocaleString()}</td>
        </tr>
      ));
    }

    if (reportType === "dispatch") {
      return rows.map((r) => (
        <tr key={r.id}>
          <td>{r.id}</td>
          <td>{r.dispatch_number}</td>
          <td>{r.client_name}</td>
          <td>{r.dispatch_date}</td>
          <td>{r.created_by_name || "-"}</td>
          <td>{r.remarks || "-"}</td>
        </tr>
      ));
    }

    if (reportType === "wastage") {
      return rows.map((r) => (
        <tr key={r.id}>
          <td>{r.id}</td>
          <td>{r.wastage_number}</td>
          <td>{r.wastage_date}</td>
          <td>{r.reason || "-"}</td>
          <td>{r.remarks || "-"}</td>
          <td>{r.created_by_name || "-"}</td>
        </tr>
      ));
    }

    if (reportType === "returns") {
      return rows.map((r) => (
        <tr key={r.id}>
          <td>{r.id}</td>
          <td>{r.return_number}</td>
          <td>{r.return_date}</td>
          <td>{r.return_type || "-"}</td>
          <td>{r.reference_number || "-"}</td>
          <td>{r.remarks || "-"}</td>
          <td>{r.created_by_name || "-"}</td>
        </tr>
      ));
    }

    if (reportType === "export-documents") {
      return rows.map((r) => (
        <tr key={r.id}>
          <td>{r.id}</td>
          <td>{r.document_number}</td>
          <td>{r.document_type}</td>
          <td>{r.document_date}</td>
          <td>{r.dispatch_number}</td>
          <td>{r.client_name}</td>
          <td>{r.consignee_name}</td>
          <td>{r.destination_country || "-"}</td>
          <td>{r.created_by_name || "-"}</td>
        </tr>
      ));
    }

    return null;
  };

  const renderHeaders = () => {
    if (reportType === "stock-summary") {
      return (
        <tr>
          <th>Batch ID</th>
          <th>Item Code</th>
          <th>Item Name</th>
          <th>Category</th>
          <th>Batch Code</th>
          <th>Unit</th>
          <th>Available Qty</th>
          <th>Status</th>
          <th>Expiry Date</th>
        </tr>
      );
    }

    if (reportType === "low-stock") {
      return (
        <tr>
          <th>Batch ID</th>
          <th>Item Code</th>
          <th>Item Name</th>
          <th>Batch Code</th>
          <th>Unit</th>
          <th>Available Qty</th>
          <th>Status</th>
        </tr>
      );
    }

    if (reportType === "stock-movements") {
      return (
        <tr>
          <th>ID</th>
          <th>Item Code</th>
          <th>Item Name</th>
          <th>Unit</th>
          <th>Movement Type</th>
          <th>Reference Type</th>
          <th>Reference ID</th>
          <th>Quantity</th>
          <th>Notes</th>
          <th>Created At</th>
        </tr>
      );
    }

    if (reportType === "dispatch") {
      return (
        <tr>
          <th>ID</th>
          <th>Dispatch Number</th>
          <th>Client Name</th>
          <th>Dispatch Date</th>
          <th>Created By</th>
          <th>Remarks</th>
        </tr>
      );
    }

    if (reportType === "wastage") {
      return (
        <tr>
          <th>ID</th>
          <th>Wastage Number</th>
          <th>Wastage Date</th>
          <th>Reason</th>
          <th>Remarks</th>
          <th>Created By</th>
        </tr>
      );
    }

    if (reportType === "returns") {
      return (
        <tr>
          <th>ID</th>
          <th>Return Number</th>
          <th>Return Date</th>
          <th>Return Type</th>
          <th>Reference Number</th>
          <th>Remarks</th>
          <th>Created By</th>
        </tr>
      );
    }

    if (reportType === "export-documents") {
      return (
        <tr>
          <th>ID</th>
          <th>Document Number</th>
          <th>Type</th>
          <th>Date</th>
          <th>Dispatch Number</th>
          <th>Client Name</th>
          <th>Consignee</th>
          <th>Destination</th>
          <th>Created By</th>
        </tr>
      );
    }

    return null;
  };

  return (
    <div>
      <div className="page-header-row">
        <h2>Reports</h2>
      </div>

      <div className="dashboard-card" style={{ marginBottom: "20px" }}>
        <div style={{ display: "grid", gap: "12px" }}>
          <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
            <option value="stock-summary">Stock Summary Report</option>
            <option value="low-stock">Low Stock Report</option>
            <option value="stock-movements">Stock Movements Report</option>
            <option value="dispatch">Dispatch Report</option>
            <option value="wastage">Wastage Report</option>
            <option value="returns">Returns Report</option>
            <option value="export-documents">Export Documents Report</option>
          </select>

          {needsDateFilter && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <input
                type="date"
                name="start_date"
                value={filters.start_date}
                onChange={handleFilterChange}
              />
              <input
                type="date"
                name="end_date"
                value={filters.end_date}
                onChange={handleFilterChange}
              />
            </div>
          )}

          <button onClick={loadReport}>Load Report</button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="custom-table">
          <thead>{renderHeaders()}</thead>
          <tbody>{renderRows()}</tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportsPage;