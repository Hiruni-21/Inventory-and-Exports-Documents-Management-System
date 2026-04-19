import { Link } from "react-router-dom";

const SupplierDashboard = () => {
  return (
    <>
      <div
        style={{
          background: "linear-gradient(135deg,var(--g900),var(--g700))",
          borderRadius: "var(--r-lg)",
          padding: "20px 24px",
          marginBottom: 18,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            background: "var(--a500)",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            boxShadow: "0 4px 12px rgba(232,168,56,.4)",
          }}
        >
          🌿
        </div>

        <div>
          <div style={{ fontSize: 19, fontWeight: 800, color: "white", letterSpacing: "-.3px" }}>
            Mahinda Organic Farm
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginTop: 2 }}>
            Supplier Portal · Kurunegala · Organic Certified
          </div>
        </div>
      </div>

      <div className="krow k3">
        <div className="kc a">
          <span className="ki">📋</span>
          <div className="kv">3</div>
          <div className="kl">Open Orders from Fresh World</div>
        </div>

        <div className="kc r">
          <span className="ki">↩️</span>
          <div className="kv">1</div>
          <div className="kl">Pending Return Note</div>
        </div>

        <div className="kc g">
          <span className="ki">💰</span>
          <div className="kv">LKR 48,250</div>
          <div className="kl">Latest Order Value</div>
        </div>
      </div>

      <div className="g2">
        <div className="cc">
          <h3>My Latest Orders</h3>
          <p>View delivery requirements from Fresh World</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                padding: 12,
                background: "var(--w100)",
                borderRadius: 10,
                border: "1px solid rgba(212,135,42,.2)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700, color: "var(--g800)" }}>PO-2024-115</span>
                <span className="badge bg-a">Awaiting Your Delivery</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 4 }}>
                Dragon Fruit 25 kg · Snake Gourd 30 kg
              </div>
              <div style={{ fontSize: 10, color: "var(--d)", marginTop: 3 }}>
                Required by 2024-03-17
              </div>
              <Link to="/supplier/orders" className="btn btn-s btn-xs" style={{ marginTop: 8 }}>
                View Full Details →
              </Link>
            </div>

            <div
              style={{
                padding: 12,
                background: "var(--ivory)",
                borderRadius: 10,
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700, color: "var(--g800)" }}>PO-2024-112</span>
                <span className="badge bg-g">Delivered & Closed</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 4 }}>
                8 items · LKR 64,400
              </div>
              <Link to="/supplier/orders" className="btn btn-s btn-xs" style={{ marginTop: 8 }}>
                View Details →
              </Link>
            </div>
          </div>
        </div>

        <div className="cc">
          <h3>My Return Notes</h3>
          <p>Deductions applied to the next payment</p>

          <div
            style={{
              padding: 12,
              background: "var(--d100)",
              borderRadius: 10,
              border: "1px solid rgba(200,75,47,.2)",
              marginBottom: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700, color: "var(--d)" }}>RN-2024-014</span>
              <span className="badge bg-a">Pending</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 4 }}>
              Dragon Fruit 1.2 kg — overripe
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--d)", marginTop: 4 }}>
              −LKR 1,020 from next payment
            </div>
            <Link to="/supplier/returns" className="btn btn-s btn-xs" style={{ marginTop: 8 }}>
              View Details →
            </Link>
          </div>

          <div
            style={{
              padding: 12,
              background: "var(--ivory)",
              borderRadius: 10,
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700, color: "var(--text2)" }}>RN-2024-009</span>
              <span className="badge bg-g">Deducted ✓</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 4 }}>
              Rambutan 2.5 kg — −LKR 1,875 applied
            </div>
            <Link to="/supplier/returns" className="btn btn-s btn-xs" style={{ marginTop: 8 }}>
              View Details →
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default SupplierDashboard;