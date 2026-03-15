import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Fresh World</h1>
        <p>Inventory & Export Documents Management System</p>

        {error && <div className="error-box">{error}</div>}

        <input
          type="email"
          name="email"
          placeholder="Enter email"
          value={form.email}
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Enter password"
          value={form.password}
          onChange={handleChange}
          required
        />

        <button type="submit">Login</button>

        <div className="demo-users">
          <p><strong>Demo Users</strong></p>
          <p>admin@freshworld.com / admin123</p>
          <p>manager@freshworld.com / admin123</p>
          <p>operations@freshworld.com / admin123</p>
          <p>logistics@freshworld.com / admin123</p>
          <p>supervisor@freshworld.com / admin123</p>
          <p>supplier@freshworld.com / admin123</p>
        </div>
      </form>
    </div>
  );
};

export default LoginPage;