const ManagerDashboard = () => {
  return (
    <div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <h4>Current Stock Value</h4>
          <h3>LKR 250K</h3>
        </div>
        <div className="kpi-card">
          <h4>Low Stock Items</h4>
          <h3>12</h3>
        </div>
        <div className="kpi-card">
          <h4>Returns This Month</h4>
          <h3>8</h3>
        </div>
        <div className="kpi-card">
          <h4>Top Suppliers</h4>
          <h3>5</h3>
        </div>
      </div>

      <div className="dashboard-card">
        <h2>Manager Dashboard</h2>
        <p>Track stock summaries, supplier performance, returns, and reports.</p>
      </div>
    </div>
  );
};

export default ManagerDashboard;