import { Link } from "react-router-dom";

const cardLinkStyle = {
  display: "block",
  textDecoration: "none",
  color: "inherit",
};

const SupplierDashboard = () => {
  return (
    <>
      <div
        style={{
          background: "linear-gradient(135deg,var(--g900),var(--g700))",
          borderRadius: "var(--r-lg)",
          padding: "22px 26px",
          marginBottom: 18,
          border: "1px solid rgba(255,255,255,.06)",
        }}
      >
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.55)", marginBottom: 6 }}>
          Supplier Portal
        </div>
        <div style={{ fontSize: 32, fontWeight: 800, color: "white", letterSpacing: "-.4px", lineHeight: 1.1 }}>
          Mahinda Organic Farm
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)", marginTop: 6 }}>
          Kurunegala · Organic Certified
        </div>
      </div>

      <div className="krow k3">
        <div className="kc a">
          <div className="kv">3</div>
          <div className="kl">Open Orders from Fresh World</div>
        </div>

        <div className="kc r">
          <div className="kv">1</div>
          <div className="kl">Pending Return Note</div>
        </div>

        <div className="kc g">
          <div className="kv">LKR 48,250</div>
          <div className="kl">Latest Order Value</div>
        </div>
      </div>

      <div className="g2">
        <div className="cc">
          <h3>My Latest Orders</h3>
          <p>View delivery requirements from Fresh World</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Link to="/supplier/orders" style={cardLinkStyle}>
              <div
                style={{
                  padding: 18,
                  background: "var(--ivory)",
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                  transition: "transform .15s ease, box-shadow .15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 19, fontWeight: 800, color: "var(--g900)" }}>PO-2024-115</div>
                    <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 6 }}>
                      Dragon Fruit 25 kg · Snake Gourd 30 kg
                    </div>
                    <div style={{ fontSize: 11, color: "var(--a600)", marginTop: 4, fontWeight: 700 }}>
                      Required by 2024-03-17
                    </div>
                  </div>

                  <span className="badge bg-a">Awaiting Your Delivery</span>
                </div>
              </div>
            </Link>

            <Link to="/supplier/orders" style={cardLinkStyle}>
              <div
                style={{
                  padding: 18,
                  background: "white",
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                  transition: "transform .15s ease, box-shadow .15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 19, fontWeight: 800, color: "var(--g900)" }}>PO-2024-112</div>
                    <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 6 }}>
                      8 items · LKR 64,400
                    </div>
                  </div>

                  <span className="badge bg-g">Delivered & Closed</span>
                </div>
              </div>
            </Link>
          </div>
        </div>

        <div className="cc">
          <h3>My Return Notes</h3>
          <p>Deductions applied to the next payment</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Link to="/supplier/returns" style={cardLinkStyle}>
              <div
                style={{
                  padding: 18,
                  background: "var(--ivory)",
                  borderRadius: 14,
                  border: "1px solid rgba(200,75,47,.18)",
                  cursor: "pointer",
                  transition: "transform .15s ease, box-shadow .15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 19, fontWeight: 800, color: "var(--d)" }}>RN-2024-014</div>
                    <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 6 }}>
                      Dragon Fruit 1.2 kg — overripe
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "var(--d)", marginTop: 6 }}>
                      −LKR 1,020 from next payment
                    </div>
                  </div>

                  <span className="badge bg-a">Pending</span>
                </div>
              </div>
            </Link>

            <Link to="/supplier/returns" style={cardLinkStyle}>
              <div
                style={{
                  padding: 18,
                  background: "white",
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                  transition: "transform .15s ease, box-shadow .15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 19, fontWeight: 800, color: "var(--g900)" }}>RN-2024-009</div>
                    <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 6 }}>
                      Rambutan 2.5 kg — −LKR 1,875 applied
                    </div>
                  </div>

                  <span className="badge bg-g">Deducted ✓</span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default SupplierDashboard;