import { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const REPORT_CARDS = [
  {
    id: "supplier-purchase",
    title: "Supplier Purchase Report",
    description: "PO history, spend per supplier, item breakdown",
    frequency: "Monthly",
    endpoints: ["/reports/supplier-purchase", "/reports/purchase-orders", "/reports/supplier-purchases"],
  },
  {
    id: "stock-movement",
    title: "Item Stock Movement",
    description: "In/out movements per item, any period",
    frequency: "Custom",
    endpoints: ["/reports/stock-movement", "/reports/movements", "/reports/inventory-movement"],
  },
  {
    id: "wastage",
    title: "Monthly Wastage Report",
    description: "By item, batch, cause, LKR loss, trend",
    frequency: "Monthly",
    endpoints: ["/reports/wastage", "/reports/monthly-wastage"],
  },
  {
    id: "returns",
    title: "Returns Report",
    description: "Customer and supplier returns, deductions",
    frequency: "Monthly",
    endpoints: ["/reports/returns", "/reports/return-summary"],
  },
  {
    id: "valuation",
    title: "Stock Valuation Report",
    description: "LKR value of all stock by category",
    frequency: "Monthly",
    endpoints: ["/reports/valuation", "/inventory/valuation"],
  },
  {
    id: "expiry",
    title: "Expiry Report",
    description: "Expiring within 7/14/30 days + estimated loss",
    frequency: "Daily",
    endpoints: ["/reports/expiry", "/inventory/expiry"],
  },
  {
    id: "packaging",
    title: "Packaging Stock Report",
    description: "Box levels, reorder status, usage",
    frequency: "Weekly",
    endpoints: ["/reports/packaging", "/reports/packaging-stock"],
  },
  {
    id: "sup-perf",
    title: "Supplier Performance",
    description: "On-time rate, return rate, price trends",
    frequency: "Monthly",
    endpoints: ["/reports/supplier-performance", "/reports/sup-perf"],
  },
  {
    id: "dispatch",
    title: "Customer Dispatch Report",
    description: "Export volumes, top customers",
    frequency: "Monthly",
    endpoints: ["/reports/dispatch", "/reports/customer-dispatch"],
  },
  {
    id: "forecast",
    title: "Forecast Report",
    description: "Projected demand based on 3-month history",
    frequency: "Monthly",
    endpoints: ["/reports/forecast", "/reports/demand-forecast"],
  },
  {
    id: "variance",
    title: "Physical Stock Variance",
    description: "Count vs system, adjustment history",
    frequency: "After count",
    endpoints: ["/reports/variance", "/reports/stock-variance", "/reports/physical-stock-variance"],
  },
  {
    id: "batch-stock",
    title: "Batch-wise Stock Report",
    description: "Active batches, quantities, expiry order",
    frequency: "Weekly",
    endpoints: ["/reports/batch-stock", "/reports/batch-wise-stock", "/reports/batches"],
  },
];

const categories = [
  "All Categories",
  "Tropical Fruits",
  "Leafy Greens",
  "Herbs",
  "Vegetables",
  "Packaging",
];

const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(10,40,24,.48)",
  zIndex: 500,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  backdropFilter: "blur(3px)",
};

const chartCardStyle = {
  background: "var(--white)",
  borderRadius: 16,
  padding: 18,
  border: "1px solid var(--border)",
  boxShadow: "0 2px 8px rgba(10,40,24,.03)",
};

const chartWrapStyle = {
  position: "relative",
  height: 360,
  width: "100%",
};

const getDefaultFromDate = () => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), 1);
  return d.toISOString().slice(0, 10);
};

const getDefaultToDate = () => new Date().toISOString().slice(0, 10);

const formatPreviewValue = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(2);
  return String(value);
};

const monthKeyFromDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const monthLabelFromDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short" });
};

const buildFallbackDispatchSeries = () => [
  { label: "Sep", volume: 630 },
  { label: "Oct", volume: 710 },
  { label: "Nov", volume: 690 },
  { label: "Dec", volume: 840 },
  { label: "Jan", volume: 780 },
  { label: "Feb", volume: 870 },
  { label: "Mar", volume: 940 },
];

const buildFallbackCustomerSeries = () => [
  { name: "Four Seasons", value: 420 },
  { name: "Hilton Maldives", value: 380 },
  { name: "Waldorf", value: 290 },
  { name: "Conrad", value: 240 },
  { name: "Other", value: 180 },
];

const pickQuantity = (row) =>
  Number(
    row.total_quantity ||
      row.total_qty ||
      row.quantity ||
      row.weight_kg ||
      row.net_weight ||
      row.qty ||
      0
  );

const pickValue = (row) =>
  Number(
    row.total_value ||
      row.value_lkr ||
      row.dispatch_value ||
      row.shipment_value ||
      row.amount ||
      row.total_amount ||
      0
  );

const pickCustomerName = (row) =>
  row.customer_name || row.client_name || row.customer || row.name || row.company_name || null;

const fetchFirstSuccess = async (endpoints, params = {}) => {
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const res = await api.get(endpoint, { params });
      return res.data;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("All endpoints failed");
};

const getReportCardStyle = (isActive) => ({
  background: "white",
  borderRadius: 20,
  padding: "22px",
  border: `1px solid ${isActive ? "var(--g300)" : "var(--border)"}`,
  boxShadow: isActive
    ? "0 10px 20px rgba(10,40,24,.08)"
    : "0 2px 8px rgba(10,40,24,.03)",
  cursor: "pointer",
  minHeight: 154,
  display: "flex",
  alignItems: "center",
  gap: 20,
  transform: isActive ? "translateY(-2px)" : "translateY(0)",
  transition: "all .18s ease",
});

const getIconBoxStyle = (isActive) => ({
  width: 84,
  height: 84,
  borderRadius: 20,
  background: isActive ? "rgba(224,242,230,1)" : "rgba(224,242,230,.78)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  transition: "all .18s ease",
});

const renderReportIcon = (reportId, isActive) => {
  const stroke = isActive ? "#4AA35A" : "#4AA35A";
  const common = {
    stroke,
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    fill: "none",
  };

  const wrap = (children) => (
    <svg width="38" height="38" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      {children}
    </svg>
  );

  switch (reportId) {
    case "supplier-purchase":
      return wrap(
        <>
          <path d="M5 18V11" {...common} />
          <path d="M10 18V7" {...common} />
          <path d="M15 18V13" {...common} />
          <path d="M20 18V9" {...common} />
          <path d="M4 18H20" {...common} />
        </>
      );

    case "stock-movement":
      return wrap(
        <>
          <path d="M7 8H20" {...common} />
          <path d="M16.5 4.5L20 8L16.5 11.5" {...common} />
          <path d="M17 16H4" {...common} />
          <path d="M7.5 12.5L4 16L7.5 19.5" {...common} />
        </>
      );

    case "wastage":
      return wrap(
        <>
          <path d="M8 7H16" {...common} />
          <path d="M9 7V5H15V7" {...common} />
          <path d="M9 7L10 19H14L15 7" {...common} />
          <path d="M11 10V16" {...common} />
          <path d="M13 10V16" {...common} />
        </>
      );

case "returns":
  return (
    <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 6V3L3 7L7 11V8"
        {...common}
      />
      <path
        d="M7 7H13.5C17.09 7 20 9.91 20 13.5C20 17.09 17.09 20 13.5 20H10"
        {...common}
      />
      <path
        d="M12 10L16 12V16L12 18L8 16V12L12 10Z"
        {...common}
      />
      <path
        d="M8 12L12 14L16 12"
        {...common}
      />
      <path
        d="M12 14V18"
        {...common}
      />
    </svg>
  );
    case "valuation":
      return wrap(
        <>
          <circle cx="12" cy="12" r="7" {...common} />
          <path d="M12 8V16" {...common} />
          <path d="M14.2 9.8C13.8 9.2 13 8.8 12 8.8C10.7 8.8 9.8 9.5 9.8 10.5C9.8 11.4 10.5 11.9 12 12.3C13.5 12.7 14.2 13.2 14.2 14.1C14.2 15.2 13.2 16 12 16C10.9 16 10 15.5 9.6 14.7" {...common} />
        </>
      );

    case "expiry":
      return wrap(
        <>
          <circle cx="12" cy="13" r="7" {...common} />
          <path d="M12 13V9.5" {...common} />
          <path d="M12 13L14.7 15.2" {...common} />
          <path d="M9.5 3.5H14.5" {...common} />
        </>
      );

    case "packaging":
      return wrap(
        <>
          <path d="M12 4L18 7.5L12 11L6 7.5L12 4Z" {...common} />
          <path d="M6 7.5V15.5L12 19V11" {...common} />
          <path d="M18 7.5V15.5L12 19" {...common} />
        </>
      );

    case "sup-perf":
    case "forecast":
      return wrap(
        <>
          <path d="M5 16L10 11L13 14L19 8" {...common} />
          <path d="M14.5 8H19V12.5" {...common} />
        </>
      );

    case "dispatch":
      return wrap(
        <>
          <path d="M4 10H13V15H4V10Z" {...common} />
          <path d="M13 11H17L20 14V15H13V11Z" {...common} />
          <circle cx="7" cy="17" r="1.4" {...common} />
          <circle cx="17" cy="17" r="1.4" {...common} />
        </>
      );

    case "variance":
      return wrap(
        <>
          <path d="M12 5V19" {...common} />
          <path d="M7 8H17" {...common} />
          <path d="M8 8L5 13H11L8 8Z" {...common} />
          <path d="M16 8L13 13H19L16 8Z" {...common} />
        </>
      );

    case "batch-stock":
      return wrap(
        <>
          <path d="M8 8H16L19 11L16 14H8L5 11L8 8Z" {...common} />
          <path d="M9 11H12.5" {...common} />
        </>
      );

    default:
      return wrap(
        <>
          <path d="M5 16L10 11L13 14L19 8" {...common} />
          <path d="M14.5 8H19V12.5" {...common} />
        </>
      );
  }
};
const ReportsPage = () => {
  const toast = useToast();

  const [showModal, setShowModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [previewError, setPreviewError] = useState("");
  const [hoveredReport, setHoveredReport] = useState(null);

  const [filters, setFilters] = useState({
    from: getDefaultFromDate(),
    to: getDefaultToDate(),
    category: "All Categories",
    format: "excel",
  });

  const [loadingCharts, setLoadingCharts] = useState(true);
  const [dispatchSeries, setDispatchSeries] = useState(buildFallbackDispatchSeries());
  const [customerSeries, setCustomerSeries] = useState(buildFallbackCustomerSeries());

  const dispatchCanvasRef = useRef(null);
  const customerCanvasRef = useRef(null);
  const dispatchChartRef = useRef(null);
  const customerChartRef = useRef(null);

  useEffect(() => {
    const loadCharts = async () => {
      setLoadingCharts(true);

      try {
        const [globalResult, customerResult] = await Promise.allSettled([
          fetchFirstSuccess(["/dispatch/global"], {}),
          fetchFirstSuccess(["/customers"], {}),
        ]);

        const globalRows =
          globalResult.status === "fulfilled" && Array.isArray(globalResult.value)
            ? globalResult.value
            : [];
        const customerRows =
          customerResult.status === "fulfilled" && Array.isArray(customerResult.value)
            ? customerResult.value
            : [];

        const monthMap = new Map();

        const addRowsToSeries = (rows) => {
          rows.forEach((row) => {
            const rawDate =
              row.dispatch_date ||
              row.shipment_date ||
              row.created_at ||
              row.date ||
              row.etd ||
              row.eta;
            const key = monthKeyFromDate(rawDate);
            if (!key) return;

            const current = monthMap.get(key) || {
              label: monthLabelFromDate(rawDate),
              volume: 0,
            };

            current.volume += pickQuantity(row);
            monthMap.set(key, current);
          });
        };

        addRowsToSeries(globalRows);

        let nextDispatchSeries = Array.from(monthMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-7)
          .map(([, value]) => value);

        if (!nextDispatchSeries.length) {
          nextDispatchSeries = buildFallbackDispatchSeries();
        }

        const customerValueMap = new Map();

        customerRows.forEach((row) => {

          const name = pickCustomerName(row);
          if (!name) return;

          const value = pickValue(row);
          if (value <= 0) return;

          customerValueMap.set(name, (customerValueMap.get(name) || 0) + value);
        });

        if (!customerValueMap.size) {
          globalRows.forEach((row) => {
            const name = pickCustomerName(row);
            if (!name) return;

            const value = pickValue(row) || pickQuantity(row);
            if (value <= 0) return;

            customerValueMap.set(name, (customerValueMap.get(name) || 0) + value);
          });
        }

        let nextCustomerSeries = Array.from(customerValueMap.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);

        if (!nextCustomerSeries.length) {
          nextCustomerSeries = buildFallbackCustomerSeries();
        }

        setDispatchSeries(nextDispatchSeries);
        setCustomerSeries(nextCustomerSeries);
      } catch (err) {
        console.error(err);
        setDispatchSeries(buildFallbackDispatchSeries());
        setCustomerSeries(buildFallbackCustomerSeries());
      } finally {
        setLoadingCharts(false);
      }
    };

    loadCharts();
  }, []);

  useEffect(() => {
    if (!dispatchCanvasRef.current) return;

    if (dispatchChartRef.current) {
      dispatchChartRef.current.destroy();
      dispatchChartRef.current = null;
    }

    dispatchChartRef.current = new Chart(dispatchCanvasRef.current, {
      type: "bar",
      data: {
        labels: dispatchSeries.map((row) => row.label),
        datasets: [
          {
            label: "Export Volume (kg)",
            data: dispatchSeries.map((row) => Number(row.volume || 0)),
            backgroundColor: "rgba(236, 177, 62, 0.16)",
            borderColor: "#E3A72C",
            borderWidth: 2,
            borderRadius: 5,
            barPercentage: 0.78,
            categoryPercentage: 0.68,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              usePointStyle: true,
              pointStyle: "circle",
              boxWidth: 8,
              boxHeight: 8,
              color: "#6F8A7E",
              font: {
                family: "Plus Jakarta Sans",
                size: 11,
              },
            },
          },
          tooltip: {
            backgroundColor: "rgba(12, 23, 18, 0.9)",
            titleFont: { family: "Plus Jakarta Sans", size: 12 },
            bodyFont: { family: "Plus Jakarta Sans", size: 12 },
            padding: 10,
            borderColor: "rgba(255,255,255,0.08)",
            borderWidth: 1,
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
              drawBorder: false,
            },
            ticks: {
              color: "#627A70",
              font: {
                family: "Plus Jakarta Sans",
                size: 11,
              },
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(198, 220, 208, 0.55)",
              drawBorder: false,
            },
            ticks: {
              color: "#627A70",
              font: {
                family: "Plus Jakarta Sans",
                size: 11,
              },
            },
          },
        },
      },
    });

    return () => {
      if (dispatchChartRef.current) {
        dispatchChartRef.current.destroy();
        dispatchChartRef.current = null;
      }
    };
  }, [dispatchSeries]);

  useEffect(() => {
    if (!customerCanvasRef.current) return;

    if (customerChartRef.current) {
      customerChartRef.current.destroy();
      customerChartRef.current = null;
    }

    customerChartRef.current = new Chart(customerCanvasRef.current, {
      type: "bar",
      data: {
        labels: customerSeries.map((row) => row.name),
        datasets: [
          {
            data: customerSeries.map((row) => Number(row.value || 0)),
            backgroundColor: ["#0B4F27", "#287E43", "#2D9852", "#47AF72", "#6DBE90"],
            borderRadius: 4,
            borderSkipped: false,
            barPercentage: 0.7,
            categoryPercentage: 0.75,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(12, 23, 18, 0.9)",
            titleFont: { family: "Plus Jakarta Sans", size: 12 },
            bodyFont: { family: "Plus Jakarta Sans", size: 12 },
            padding: 10,
            borderColor: "rgba(255,255,255,0.08)",
            borderWidth: 1,
          },
        },
        scales: {
          y: {
            grid: {
              display: false,
              drawBorder: false,
            },
            ticks: {
              color: "#627A70",
              font: {
                family: "Plus Jakarta Sans",
                size: 11,
              },
            },
          },
          x: {
            beginAtZero: true,
            grid: {
              color: "rgba(198, 220, 208, 0.55)",
              drawBorder: false,
            },
            ticks: {
              color: "#627A70",
              callback: (value) => `LKR ${value}K`,
              font: {
                family: "Plus Jakarta Sans",
                size: 11,
              },
            },
          },
        },
      },
    });

    return () => {
      if (customerChartRef.current) {
        customerChartRef.current.destroy();
        customerChartRef.current = null;
      }
    };
  }, [customerSeries]);

  const openReportModal = (report) => {
    setSelectedReport(report);
    setPreviewRows([]);
    setPreviewError("");
    setShowModal(true);
  };

  const closeReportModal = () => {
    if (loadingPreview) return;
    setShowModal(false);
    setSelectedReport(null);
    setPreviewRows([]);
    setPreviewError("");
  };

  const handleGenerate = async () => {
    if (!selectedReport) return;

    setLoadingPreview(true);
    setPreviewError("");

    try {
      const params = {
        from: filters.from,
        to: filters.to,
      };

      if (filters.category && filters.category !== "All Categories") {
        params.category = filters.category;
      }

      const data = await fetchFirstSuccess(selectedReport.endpoints, params);

      if (Array.isArray(data)) {
        setPreviewRows(data);
      } else if (Array.isArray(data?.rows)) {
        setPreviewRows(data.rows);
      } else if (data && typeof data === "object") {
        setPreviewRows([data]);
      } else {
        setPreviewRows([]);
      }

      toast.success(`${selectedReport.title} loaded`);
    } catch (err) {
      console.error(err);
      setPreviewRows([]);
      setPreviewError(err?.response?.data?.message || "Failed to load report");
      toast.error(err?.response?.data?.message || "Failed to load report");
    } finally {
      setLoadingPreview(false);
    }
  };

  const previewColumns = useMemo(() => {
    if (!previewRows.length) return [];
    return Object.keys(previewRows[0]).slice(0, 8);
  }, [previewRows]);

  return (
    <>
      <div
        className="cg"
        style={{
          marginBottom: 22,
          gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))",
          columnGap: 16,
          rowGap: 16,
        }}
      >
        {REPORT_CARDS.map((report) => {
          const isActive = hoveredReport === report.id;

          return (
            <div
              key={report.id}
              className="ic"
              onClick={() => openReportModal(report)}
              onMouseEnter={() => setHoveredReport(report.id)}
              onMouseLeave={() => setHoveredReport(null)}
              style={getReportCardStyle(isActive)}
            >
              <div style={getIconBoxStyle(isActive)}>
                {renderReportIcon(report.id, isActive)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--g900)",
                    lineHeight: 1.35,
                    letterSpacing: "-0.2px",
                    marginBottom: 8,
                  }}
                >
                  {report.title}
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color: "#7B7B90",
                    lineHeight: 1.55,
                    marginBottom: 10,
                  }}
                >
                  {report.description}
                </div>

                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: isActive ? "var(--g700)" : "var(--text3)",
                    transition: "all .18s ease",
                  }}
                >
                  {report.frequency}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="g2">
        <div style={chartCardStyle}>
          <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                <div style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {renderReportIcon("dispatch", true)}
                </div>
                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--g900)",
                    letterSpacing: "-.2px",
                    margin: 0
                  }}
                >
                  Export Dispatch — Monthly (kg)
                </h3>
              </div>
              <p style={{ fontSize: 12, color: "var(--text3)", margin: 0, paddingLeft: 36 }}>Volume comparison</p>
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--g700)", background: "rgba(224,242,230,1)", padding: "4px 10px", borderRadius: 12 }}>
              Live Chart
            </div>
          </div>

          <div style={chartWrapStyle}>
            {loadingCharts ? (
              <div className="ib ib-i">
                <span>⏳</span>
                <div>Loading chart...</div>
              </div>
            ) : (
              <canvas ref={dispatchCanvasRef} />
            )}
          </div>
        </div>

        <div style={chartCardStyle}>
          <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                <div style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {renderReportIcon("sup-perf", true)}
                </div>
                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--g900)",
                    letterSpacing: "-.2px",
                    margin: 0
                  }}
                >
                  Top 5 Global Customers by Value
                </h3>
              </div>
              <p style={{ fontSize: 12, color: "var(--text3)", margin: 0, paddingLeft: 36 }}>This quarter (LKR thousands)</p>
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--g700)", background: "rgba(224,242,230,1)", padding: "4px 10px", borderRadius: 12 }}>
              Live Chart
            </div>
          </div>

          <div style={chartWrapStyle}>
            {loadingCharts ? (
              <div className="ib ib-i">
                <span>⏳</span>
                <div>Loading chart...</div>
              </div>
            ) : (
              <canvas ref={customerCanvasRef} />
            )}
          </div>
        </div>
      </div>

      {showModal && selectedReport ? (
        <div style={modalOverlayStyle}>
          <div className="md">
            <div className="md-h">
              <h3>Generate Report</h3>
              <button className="md-x" type="button" onClick={closeReportModal}>
                ✕
              </button>
            </div>

            <div className="md-b">
              <div
                style={{
                  background: "var(--g100)",
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 16,
                  border: "1px solid var(--g200)",
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--g900)" }}>
                  {selectedReport.title}
                </div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>
                  {selectedReport.frequency}
                </div>
              </div>

              <div className="fr">
                <div className="ff">
                  <label className="fl">
                    From Date <span className="rq">*</span>
                  </label>
                  <input
                    className="fc"
                    type="date"
                    value={filters.from}
                    onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))}
                  />
                </div>

                <div className="ff">
                  <label className="fl">
                    To Date <span className="rq">*</span>
                  </label>
                  <input
                    className="fc"
                    type="date"
                    value={filters.to}
                    onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))}
                  />
                </div>
              </div>

              <div className="ff">
                <label className="fl">Filter by Category</label>
                <select
                  className="fc"
                  value={filters.category}
                  onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ff">
                <label className="fl">Download Format</label>
                <div className="tg">
                  <button
                    type="button"
                    className={`to ${filters.format === "excel" ? "on" : ""}`}
                    onClick={() => setFilters((prev) => ({ ...prev, format: "excel" }))}
                  >
                    📊 Excel (.xlsx)
                  </button>
                  <button
                    type="button"
                    className={`to ${filters.format === "pdf" ? "on" : ""}`}
                    onClick={() => setFilters((prev) => ({ ...prev, format: "pdf" }))}
                  >
                    📄 PDF
                  </button>
                  <button
                    type="button"
                    className={`to ${filters.format === "csv" ? "on" : ""}`}
                    onClick={() => setFilters((prev) => ({ ...prev, format: "csv" }))}
                  >
                    📁 CSV
                  </button>
                </div>
              </div>

              {previewError ? (
                <div className="ib ib-d">
                  <span>⚠️</span>
                  <div>{previewError}</div>
                </div>
              ) : null}

              {previewRows.length > 0 ? (
                <div className="tw" style={{ marginTop: 14, marginBottom: 0 }}>
                  <div className="tw-h">
                    <h3>Preview</h3>
                    <span className="badge bg-b">{previewRows.length} rows</span>
                  </div>

                  <table>
                    <thead>
                      <tr>
                        {previewColumns.map((column) => (
                          <th key={column}>{column.replace(/_/g, " ")}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.slice(0, 10).map((row, index) => (
                        <tr key={index}>
                          {previewColumns.map((column) => (
                            <td key={column}>{formatPreviewValue(row[column])}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>

            <div className="md-f">
              <button className="btn btn-s" type="button" onClick={closeReportModal}>
                Cancel
              </button>
              <button
                className="btn btn-p"
                type="button"
                onClick={handleGenerate}
                disabled={loadingPreview}
              >
                {loadingPreview ? "Generating..." : "Generate Report"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default ReportsPage;