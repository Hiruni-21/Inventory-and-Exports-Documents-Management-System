import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const roleConfig = {
  manager: {
    label: "Manager",
    email: "manager@freshworld.lk",
    password: "manager123",
  },
  ops: {
    label: "Operations Executive",
    email: "ops@freshworld.lk",
    password: "ops123",
  },
  supervisor: {
    label: "Supervisor",
    email: "nishantha@freshworld.lk",
    password: "supervisor123",
  },
  logistics: {
    label: "Logistics Executive",
    email: "dilani@freshworld.lk",
    password: "logistics123",
  },
  supplier: {
    label: "Supplier Portal",
    email: "mahinda@organicfarm.lk",
    password: "supplier123",
  },
};

const roles = ["manager", "ops", "supervisor", "logistics", "supplier"];

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState("manager");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    email: roleConfig.manager.email,
    password: roleConfig.manager.password,
  });
  const [error, setError] = useState("");

  const currentRole = useMemo(() => roleConfig[selectedRole], [selectedRole]);

  const pickRole = (roleKey) => {
    setSelectedRole(roleKey);
    setForm({
      email: roleConfig[roleKey].email,
      password: roleConfig[roleKey].password,
    });
    setError("");
  };

  const onRoleSelect = (roleKey) => {
    pickRole(roleKey);
  };

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
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password");
    }
  };

  return (
    <div id="ls">
      <div className="lcard">
        <div className="ll">
          <div className="ll-logo">
            <svg viewBox="0 0 40 40">
              <path d="M20 4C10 4 4 12 4 20c0 10 8 16 16 16s16-6 16-16c0-8-6-16-16-16zM16 14c2-4 6-6 10-4-4 2-6 6-6 10 0-4-2-8-4-6zm-2 6c-2-4 0-10 4-12 0 4-2 8-2 12-2-2-4 0-2 0zm6 0c0 4-2 8-6 10 0-4 2-8 6-10zm0 0c0 4 2 8 6 10 0-4-2-8-6-10z" />
            </svg>
          </div>

          <div className="ll-title">
            Fresh World
            <br />
            Exporters
          </div>

          <div className="ll-sub">
            Inventory &amp; Export Documents Management System · Manning Market,
            Colombo · Est. 2005
          </div>

          <div className="ll-div"></div>

          <div className="ll-roles-lbl">Select your role to demo</div>

          <div className="ll-pills">
            {roles.map((roleKey) => (
              <div
                key={roleKey}
                className={`lp ${selectedRole === roleKey ? "active" : ""}`}
                data-r={roleKey}
                onClick={() => pickRole(roleKey)}
              >
                <span className="dot"></span>
                {roleConfig[roleKey].label}
              </div>
            ))}
          </div>
        </div>

        <div className="lr">
          <h2>Welcome back</h2>
          <p className="lr-sub">
            Sign in to your <strong>{currentRole.label}</strong> account
          </p>

          {error && (
            <div
              style={{
                marginBottom: 14,
                padding: "12px 14px",
                background: "var(--d100)",
                border: "1px solid rgba(200,75,47,.2)",
                borderRadius: "var(--r)",
                color: "var(--d)",
                fontSize: 12,
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
                  type="text"
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

            <div className="lf">
              <label>Role</label>
              <div className="li-wrap">
                <span className="li-ico">👤</span>
                <select
                  className="li"
                  value={selectedRole}
                  onChange={(e) => onRoleSelect(e.target.value)}
                >
                  <option value="manager">Manager</option>
                  <option value="ops">Operations Executive</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="logistics">Logistics Executive</option>
                  <option value="supplier">Supplier Portal</option>
                </select>
                <span className="li-arr">▾</span>
              </div>
            </div>

            <button type="submit" className="sign-btn">
              Sign In
            </button>
          </form>

          <div className="demo-box">
            <strong>Demo:</strong> Use role name + 123{" "}
            <code>manager123</code> <code>ops123</code>{" "}
            <code>supervisor123</code> <code>logistics123</code>{" "}
            <code>supplier123</code> or just <code>demo123</code> for any role
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;