import { useMemo, useState } from "react";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const REPORT_OPTIONS = [
  { value: "stock-summary", label: "Stock Summary Report" },
  { value: "low-stock", label: "Low Stock Report" },
  { value: "stock-movements", label: "Stock Movements Report" },
  { value: "dispatch", label: "Dispatch Report" },
  { value: "wastage", label: "Wastage Report" },
  { value: "returns", label: "Returns Report" },
  { value: "export-documents", label: "Export Documents Report" },
];

const DATE_FILTER_REPORTS = new Set([
  "stock-movements",
  "dispatch",
  "wastage",
  "returns",
  "export-documents",
]);

const ReportsPage = () => {
  const toast = useToast();

  const [reportType, setReportType] = useState("stock-summary");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    start_date: "",
    end_date: "",
  });

  const needsDateFilter = DATE_FILTER_REPORTS.has(reportType);

  const handleFilterChange = (e) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const loadReport = async () => {
    try {
      setLoading(true);

      const config = {};
      if (needsDateFilter && filters.start_date && filters.end_date) {
        config.params = {
          start_date: filters.start_date,
          end_date: filters.end_date,
        };
      }

      const res = await api.get(`/reports/${reportType}`, config);
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load report");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const headers = useMemo(() => {
    if (reportType === "stock-summary") {
      return ["Batch ID", "Item Code", "Item Name", "Category", "Batch Code", "Unit", "Available Qty", "Status", "Expiry Date"];
    }
    if (reportType === "low-stock") {
      return ["Item Code", "Item Name", "Category", "Unit", "Available Qty", "Reorder Level", "Shortage"];
    }
    if (reportType === "stock-movements") {
      return ["ID", "Item Code", "Item Name", "Unit", "Movement Type", "Reference Type", "Reference ID", "Quantity", "Notes", "Created At"];
    }
    if (reportType === "dispatch") {
      return ["ID", "Dispatch Number", "Client Name", "Dispatch Date", "Status", "Created By", "Remarks"];
    }
    if (reportType === "wastage") {
      return ["ID", "Item Code", "Item Name", "Batch", "Quantity", "Reason", "Notes", "Created By", "Created At"];
    }
    if (reportType === "returns") {
      return ["ID", "Supplier", "Item Code", "Item Name", "Batch", "Quantity", "Reason", "Notes", "Created By", "Created At"];
    }
    return [
      "ID",
      "Shipment",
      "Client Name",
      "Dispatch Date",
      "Airline",
      "Incoterm",
      "Shipment Status",
      "All Cleared",
      "Updated By",
      "Updated At",
    ];
  }, [reportType]);

  const bodyRows = useMemo(() => {
    if (reportType === "stock-summary") {
      return rows.map((r) => [
        r.batch_id,
        r.item_code,
        r.item_name,
        r.category_name || "-",
        r.batch_code,
        r.unit,
        r.available_quantity,
        r.status,
        r.expiry_date || "-",
      ]);
    }

    if (reportType === "low-stock") {
      return rows.map((r) => [
        r.item_code,
        r.item_name,
        r.category_name || "-",
        r.unit,
        r.available_quantity,
        r.reorder_level,
        r.shortage,
      ]);
    }

    if (reportType === "stock-movements") {
      return rows.map((r) => [
        r.id,
        r.item_code,
        r.item_name,
        r.unit,
        r.movement_type,
        r.reference_type,
        r.reference_id,
        r.quantity,
        r.notes || "-",
        new Date(r.created_at).toLocaleString(),
      ]);
    }

    if (reportType === "dispatch") {
      return rows.map((r) => [
        r.id,
        r.dispatch_number,
        r.client_name,
        r.dispatch_date,
        r.status,
        r.created_by_name || "-",
        r.remarks || "-",
      ]);
    }

    if (reportType === "wastage") {
      return rows.map((r) => [
        r.id,
        r.item_code,
        r.item_name,
        r.batch_code || "-",
        r.quantity,
        r.reason || "-",
        r.notes || "-",
        r.created_by_name || "-",
        new Date(r.created_at).toLocaleString(),
      ]);
    }

    if (reportType === "returns") {
      return rows.map((r) => [
        r.id,
        r.supplier_name,
        r.item_code,
        r.item_name,
        r.batch_code || "-",
        r.quantity,
        r.reason || "-",
        r.notes || "-",
        r.created_by_name || "-",
        new Date(r.created_at).toLocaleString(),
      ]);
    }

    return rows.map((r) => [
      r.id,
      r.dispatch_number,
      r.client_name,
      r.dispatch_date,
      r.airline,
      r.incoterm,
      r.shipment_status,
      Number(r.all_cleared || 0) === 1 ? "Yes" : "No",
      r.updated_by_name || "-",
      new Date(r.updated_at).toLocaleString(),
    ]);
  }, [rows, reportType]);

  return (
    <>
      <div className="ib ib-i">
        <span>📊</span>
        <div>
          Analytics reports using the live ERP backend. The UI stays in the same prototype system.
        </div>
      </div>

      <div className="cc">
        <h3>Reports & Analytics</h3>
        <p>Select a report, apply dates when needed, and load the latest data.</p>

        <div className="fb" style={{ marginBottom: 16 }}>
          <select className="fs" value={reportType} onChange={(e) => setReportType(e.target.value)}>
            {REPORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {needsDateFilter ? (
            <>
              <input
                className="fc"
                type="date"
                name="start_date"
                value={filters.start_date}
                onChange={handleFilterChange}
                style={{ width: 170, height: 34 }}
              />
              <input
                className="fc"
                type="date"
                name="end_date"
                value={filters.end_date}
                onChange={handleFilterChange}
                style={{ width: 170, height: 34 }}
              />
            </>
          ) : null}

          <button type="button" className="btn btn-p btn-sm" onClick={loadReport}>
            {loading ? "Loading..." : "Load Report"}
          </button>
        </div>

        <div className="tw" style={{ marginBottom: 0 }}>
          <div className="tw-h">
            <h3>{REPORT_OPTIONS.find((option) => option.value === reportType)?.label}</h3>
            <span className="badge bg-b">{bodyRows.length} rows</span>
          </div>

          <table>
            <thead>
              <tr>
                {headers.map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={headers.length}>Loading...</td>
                </tr>
              ) : bodyRows.length ? (
                bodyRows.map((row, index) => (
                  <tr key={`${reportType}-${index}`}>
                    {row.map((cell, cellIndex) => (
                      <td key={`${reportType}-${index}-${cellIndex}`}>{cell}</td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={headers.length}>No data found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default ReportsPage;