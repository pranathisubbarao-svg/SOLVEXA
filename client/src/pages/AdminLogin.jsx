import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

function AdminLogin() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);

    try {
      const response = await axios.post(
        "http://localhost:5000/api/auth/admin-login",
        {
          email: formData.email,
          password: formData.password,
        }
      );

      // Admin session is stored separately from the citizen session
      localStorage.setItem("adminToken", response.data.token);
      localStorage.setItem(
        "adminUser",
        JSON.stringify(response.data.user)
      );

      navigate("/admin");
    } catch (error) {
      console.error("Admin login error:", error);

      alert(
        error.response?.data?.message ||
          "Admin login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page admin-auth-page">
      <div className="auth-card admin-auth-card">
        <div className="admin-badge">
          🛡️ ADMIN PORTAL
        </div>

        <h1>Admin Login</h1>

        <p>Sign in to review citizen reports</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Admin Email</label>

            <input
              type="email"
              name="email"
              placeholder="Enter admin email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>

            <input
              type="password"
              name="password"
              placeholder="Enter password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Login as Admin"}
          </button>
        </form>

        <p className="auth-link">
          Not an admin?{" "}
          <Link to="/login">
            Citizen Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default AdminLogin;
