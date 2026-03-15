const AdminDashboard = () => {
  return (
    <div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <h4>Total Users</h4>
          <h3>6</h3>
        </div>
        <div className="kpi-card">
          <h4>Total Suppliers</h4>
          <h3>3</h3>
        </div>
        <div className="kpi-card">
          <h4>Active Roles</h4>
          <h3>6</h3>
        </div>
        <div className="kpi-card">
          <h4>System Status</h4>
          <h3>Live</h3>
        </div>
      </div>

      <div className="dashboard-card">
        <h2>Admin Dashboard</h2>
        <p>Manage users, roles, suppliers, and system settings from here.</p>
      </div>
    </div>
  );
};

export default AdminDashboard;