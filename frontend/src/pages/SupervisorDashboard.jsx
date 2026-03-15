const SupervisorDashboard = () => {
  return (
    <div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <h4>Today’s Goods Received</h4>
          <h3>18</h3>
        </div>
        <div className="kpi-card">
          <h4>Wastage Records</h4>
          <h3>3</h3>
        </div>
        <div className="kpi-card">
          <h4>Low Stock Alerts</h4>
          <h3>6</h3>
        </div>
        <div className="kpi-card">
          <h4>Pending Stock Count</h4>
          <h3>2</h3>
        </div>
      </div>

      <div className="dashboard-card">
        <h2>Supervisor Dashboard</h2>
        <p>Monitor warehouse flow, stock alerts, wastage, and daily operational tasks.</p>
      </div>
    </div>
  );
};

export default SupervisorDashboard;