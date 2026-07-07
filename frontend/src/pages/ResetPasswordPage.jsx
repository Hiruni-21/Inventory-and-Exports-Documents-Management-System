import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../utils/api";
import companyLogo from "../assets/company-logo.png";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Reset token is missing from the URL. Please request a new link.");
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("Reset token is missing. Please request a new link.");
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError("All password fields are required");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const res = await api.post("/auth/reset-password", {
        token,
        newPassword,
        confirmPassword,
      });
      setMessage(res.data.message || "Password has been reset successfully.");
      setNewPassword("");
      setConfirmPassword("");
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
          <h2>Reset Password</h2>
          <p className="lr-sub">Enter and confirm your new password below</p>

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

          {!message && (
            <form onSubmit={handleSubmit}>
              <div className="lf">
                <label htmlFor="newPassword">New Password</label>
                <div className="li-wrap">
                  <span className="li-ico">🔒</span>
                  <input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    className="li"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                  <span
                    className="li-eye"
                    onClick={() => setShowPassword((prev) => !prev)}
                    style={{ cursor: "pointer" }}
                  >
                    👁
                  </span>
                </div>
              </div>

              <div className="lf">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="li-wrap">
                  <span className="li-ico">🔒</span>
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    className="li"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <button className="sign-btn" type="submit" disabled={isLoading || !token}>
                {isLoading ? "Resetting…" : "Reset Password"}
              </button>
            </form>
          )}

          <div style={{ marginTop: 20, textAlign: "center" }}>
            <span
              style={{ color: "#2563eb", cursor: "pointer", fontSize: 13, fontWeight: 500 }}
              onClick={() => navigate("/")}
            >
              Go to Login
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
