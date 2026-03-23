const OperationsDashboard = () => {
  return (
    <div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <h4>Pending POs</h4>
          <h3>7</h3>
        </div>
        <div className="kpi-card">
          <h4>Incoming Deliveries</h4>
          <h3>4</h3>
        </div>
        <div className="kpi-card">
          <h4>Suppliers</h4>
          <h3>3</h3>
        </div>
        <div className="kpi-card">
          <h4>Dispatch Tasks</h4>
          <h3>6</h3>
        </div>
      </div>

      <div className="dashboard-card">
        <h2>Operations Executive Dashboard</h2>
        <p>Manage suppliers, purchase orders, goods receiving, and dispatch planning.</p>
      </div>
    </div>
  );
};

export default OperationsDashboard;