import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import companyLogo from "../assets/company-logo.png";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email) {
      setError("Email address is required");
      return;
    }

    setIsLoading(true);

    try {
      const res = await api.post("/auth/forgot-password", { email });
      setMessage(res.data.message || "Password reset link has been sent to your email");
      setEmail("");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="ls">
      <div className="lcard">
        <div className="ll">
          <div className="ll-logo">
            <img src={companyLogo} alt="Fresh World logo" className="brand-logo-img" />
          </div>

          <div className="ll-title">
            Fresh World
            <br />
            Exporters
          </div>

          <div className="ll-sub">
            Inventory &amp; Export Documents Management System
          </div>

          <div className="ll-div"></div>
        </div>

        <div className="lr">
          <h2>Forgot Password</h2>
          <p className="lr-sub">Enter your email to receive a password reset link</p>

          {error && (
            <div
              style={{
                marginBottom: "14px",
                padding: "12px 14px",
                background: "var(--d100)",
                border: "1px solid rgba(200,75,47,.2)",
                borderRadius: "var(--r)",
                color: "var(--d)",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          )}

          {message && (
            <div
              style={{
                marginBottom: "14px",
                padding: "12px 14px",
                background: "#e8f7ed",
                border: "1px solid rgba(29,111,58,.2)",
                borderRadius: "var(--r)",
                color: "#1d6f3a",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="lf">
              <label htmlFor="email">Email Address</label>
              <div className="li-wrap">
                <span className="li-ico">✉</span>
                <input
                  id="email"
                  type="email"
                  className="li"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <button className="sign-btn" type="submit" disabled={isLoading}>
              {isLoading ? "Sending Link…" : "Send Reset Link"}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: "center" }}>
            <span
              style={{ color: "#2563eb", cursor: "pointer", fontSize: 13, fontWeight: 500 }}
              onClick={() => navigate("/")}
            >
              Back to Login
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
