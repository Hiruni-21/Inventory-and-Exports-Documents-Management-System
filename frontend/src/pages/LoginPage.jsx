import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import companyLogo from "../assets/company-logo.png";

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const redirectPath = await login(form.email, form.password);
      navigate(redirectPath);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password");
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
          <h2>Welcome back</h2>
          <p className="lr-sub">Sign in to your account</p>

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

          <form onSubmit={handleSubmit}>
            <div className="lf">
              <label>Email Address</label>
              <div className="li-wrap">
                <span className="li-ico">✉</span>
                <input
                  type="email"
                  className="li"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div className="lf">
              <label>Password</label>
              <div className="li-wrap">
                <span className="li-ico">🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  className="li"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter password"
                />
                <span
                  className="li-eye"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  👁
                </span>
              </div>
            </div>

            <button className="sign-btn" type="submit">
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;