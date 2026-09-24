import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

import GoogleAuthButton from "../components/GoogleAuthButton";

const LOGIN_TYPES = {
  citizen: {
    icon: "🏠",
    label: "Citizen",
    title: "Welcome Back",
    subtitle: "Login to report and track community issues",
    button: "Login",
  },
  staff: {
    icon: "👷",
    label: "Staff",
    title: "Staff Login",
    subtitle: "Login to see the reports assigned to you",
    button: "Login as Staff",
  },
};

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  // Email is passed along after a successful sign-up
  const justRegistered = location.state?.registered;

  const [loginType, setLoginType] = useState(
    location.state?.as === "staff" ? "staff" : "citizen"
  );

  // Clicking "Login" or "Staff" in the navbar while already here switches tabs
  const [lastLocationKey, setLastLocationKey] = useState(location.key);

  if (location.key !== lastLocationKey) {
    setLastLocationKey(location.key);

    if (location.state?.as) {
      setLoginType(location.state.as === "staff" ? "staff" : "citizen");
    }
  }

  const [formData, setFormData] = useState({
    email: location.state?.email || "",
    password: "",
  });

  const type = LOGIN_TYPES[loginType];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // =====================================
  // SAVE SESSION + GO TO THE RIGHT PAGE
  // =====================================
  const finishLogin = (data) => {
    const role = data.user.role;

    // Staff tab used with a citizen account
    if (loginType === "staff" && role !== "staff") {
      alert(
        "This account is not a staff account. Please use the Citizen tab, or ask the admin to approve your staff account."
      );
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    // Staff work from their own workspace
    navigate(role === "staff" ? "/staff" : "/dashboard");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(
        "http://localhost:5000/api/auth/login",
        {
          email: formData.email,
          password: formData.password,
        }
      );

      finishLogin(response.data);
    } catch (error) {
      console.error("Login error:", error);

      alert(
        error.response?.data?.message ||
          "Login failed. Please try again."
      );
    }
  };

  // =====================================
  // GOOGLE LOGIN
  // =====================================
  const handleGoogleCredential = async (credential) => {
    try {
      const response = await axios.post(
        "http://localhost:5000/api/auth/google",
        { credential }
      );

      // New Google users finish sign-up (phone number) on the register page
      if (response.data.needsPhone) {
        alert("No account found for this Google email. Please sign up first.");
        navigate("/register");
        return;
      }

      finishLogin(response.data);
    } catch (error) {
      console.error("Google login error:", error);

      alert(
        error.response?.data?.message ||
          "Google login failed. Please try again."
      );
    }
  };

  return (
    <div className="auth-page">
      <div className={`auth-card login-card login-${loginType}`}>

        {/* Citizen / Staff switch */}
        <div className="login-switch" role="tablist" aria-label="Login as">
          {Object.entries(LOGIN_TYPES).map(([key, item]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={loginType === key}
              className={loginType === key ? "active" : ""}
              onClick={() => setLoginType(key)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        <h1>{type.title}</h1>

        <p>{type.subtitle}</p>

        {justRegistered && (
          <div className="auth-success">
            🎉 Account created! Log in with your new password.
          </div>
        )}

        {loginType === "staff" && (
          <div className="login-staff-note">
            New staff member?{" "}
            <Link to="/staff/apply">Apply for a staff job</Link>. You can log
            in once an admin approves your application — we'll email you.
          </div>
        )}

        <GoogleAuthButton
          key={loginType}
          onCredential={handleGoogleCredential}
        />

        <div className="auth-divider">
          <span>or login with email</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{loginType === "staff" ? "Staff Email" : "Email"}</label>

            <input
              type="email"
              name="email"
              placeholder={
                loginType === "staff"
                  ? "Enter your staff email"
                  : "Enter your email"
              }
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
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="forgot-link">
            <Link to="/forgot-password">
              Forgot password?
            </Link>
          </div>

          <button type="submit">
            {type.button}
          </button>
        </form>

        <p className="auth-link">
          Don't have an account?{" "}
          <Link to="/register">
            Register here
          </Link>
        </p>

        <p className="auth-link login-admin-link">
          Are you an administrator?{" "}
          <Link to="/admin/login">
            Admin login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
