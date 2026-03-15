const LogisticsDashboard = () => {
  return (
    <div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <h4>Pending Documents</h4>
          <h3>9</h3>
        </div>
        <div className="kpi-card">
          <h4>Packing Lists</h4>
          <h3>4</h3>
        </div>
        <div className="kpi-card">
          <h4>Commercial Invoices</h4>
          <h3>3</h3>
        </div>
        <div className="kpi-card">
          <h4>Shipments</h4>
          <h3>5</h3>
        </div>
      </div>

      <div className="dashboard-card">
        <h2>Logistics Executive Dashboard</h2>
        <p>Handle shipment records, export documentation, and dispatch coordination.</p>
      </div>
    </div>
  );
};

export default LogisticsDashboard;