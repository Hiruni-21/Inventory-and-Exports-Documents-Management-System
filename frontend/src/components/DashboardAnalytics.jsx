import { useEffect, useState } from "react";
import api from "../utils/api";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

const DashboardAnalytics = () => {
  const token = localStorage.getItem("token");

  const [summary, setSummary] = useState(null);
  const [movementData, setMovementData] = useState([]);
  const [dispatchData, setDispatchData] = useState([]);
  const [exportData, setExportData] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [summaryRes, movementRes, dispatchRes, exportRes] = await Promise.all([
        api.get("/dashboard/summary", { headers }),
        api.get("/dashboard/stock-movements-chart", { headers }),
        api.get("/dashboard/monthly-dispatch-chart", { headers }),
        api.get("/dashboard/monthly-export-chart", { headers }),
      ]);

      setSummary(summaryRes.data);
      setMovementData(movementRes.data);
      setDispatchData(dispatchRes.data);
      setExportData(exportRes.data);
    } catch (err) {
      setError("Failed to load dashboard analytics");
    }
  };

  if (error) {
    return <div className="error-box">{error}</div>;
  }

  if (!summary) {
    return <div>Loading dashboard analytics...</div>;
  }

  const summaryCards = [
    { title: "Suppliers", value: summary.totalSuppliers },
    { title: "Items", value: summary.totalItems },
    { title: "Purchase Orders", value: summary.totalPurchaseOrders },
    { title: "GRNs", value: summary.totalGrns },
    { title: "Dispatches", value: summary.totalDispatches },
    { title: "Export Documents", value: summary.totalExportDocuments },
    { title: "Low Stock Batches", value: summary.lowStockCount },
    { title: "Wastage Records", value: summary.totalWastageRecords },
    { title: "Return Records", value: summary.totalReturnRecords },
  ];

  const pieColors = ["#1f7a1f", "#2e8b57", "#4caf50", "#81c784", "#a5d6a7"];

  return (
    <div>
      <div className="analytics-summary-grid">
        {summaryCards.map((card, index) => (
          <div key={index} className="analytics-card">
            <h4>{card.title}</h4>
            <p>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="analytics-chart-grid">
        <div className="analytics-chart-card">
          <h3>Stock Movements by Type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={movementData}
                dataKey="count"
                nameKey="movement_type"
                outerRadius={100}
                label
              >
                {movementData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="analytics-chart-card">
          <h3>Monthly Dispatch Count</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dispatchData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#2e7d32" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="analytics-chart-card full-width">
          <h3>Monthly Export Document Count</h3>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={exportData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#1b5e20" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DashboardAnalytics;