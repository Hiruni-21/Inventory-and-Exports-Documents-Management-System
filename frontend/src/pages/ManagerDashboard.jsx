import { useEffect, useState } from "react";
import api from "../utils/api";

const ManagerDashboard = () => {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await api.get("/dashboard/stats", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setStats(res.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load dashboard analytics");
      }
    };

    fetchStats();
  }, []);

  return (
    <div>
      <h2>Manager Dashboard</h2>

      {error && <div className="error-box">{error}</div>}

      {stats && (
        <div className="cards-grid">
          <div className="dashboard-card">
            <h3>Total Items</h3>
            <p>{stats.items}</p>
          </div>

          <div className="dashboard-card">
            <h3>Total Suppliers</h3>
            <p>{stats.suppliers}</p>
          </div>

          <div className="dashboard-card">
            <h3>Low Stock Items</h3>
            <p>{stats.lowStock}</p>
          </div>

          <div className="dashboard-card">
            <h3>Local Dispatch</h3>
            <p>{stats.localDispatch}</p>
          </div>

          <div className="dashboard-card">
            <h3>Global Dispatch</h3>
            <p>{stats.globalDispatch}</p>
          </div>

          <div className="dashboard-card">
            <h3>Unread Notifications</h3>
            <p>{stats.notifications}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;