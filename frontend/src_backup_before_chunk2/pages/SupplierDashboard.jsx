const SupplierDashboard = () => {
  return (
    <div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <h4>Assigned Orders</h4>
          <h3>5</h3>
        </div>
        <div className="kpi-card">
          <h4>Pending Deliveries</h4>
          <h3>2</h3>
        </div>
        <div className="kpi-card">
          <h4>Returns</h4>
          <h3>1</h3>
        </div>
        <div className="kpi-card">
          <h4>Rating</h4>
          <h3>4.5</h3>
        </div>
      </div>

      <div className="dashboard-card">
        <h2>Supplier Dashboard</h2>
        <p>View assigned purchase orders, delivery expectations, and supplier updates.</p>
      </div>
    </div>
  );
};

export default SupplierDashboard;