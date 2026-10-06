import { API_URL } from "../config";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import "../register.css";
import GoogleAuthButton from "../components/GoogleAuthButton";

const API = `${API_URL}/api/auth`;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9]{10,13}$/;

const cleanPhone = (phone) => phone.replace(/[\s-]/g, "");

// =====================================
// PASSWORD STRENGTH (0-4)
// =====================================
const getPasswordStrength = (password) => {
  if (!password) {
    return { score: 0, label: "" };
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (password.length < 6) {
    score = Math.min(score, 1);
  }

  const labels = ["Too weak", "Weak", "Fair", "Good", "Strong"];

  return { score, label: labels[score] };
};

// =====================================
// FIELD VALIDATION
// =====================================
const validate = (data) => {
  const errors = {};

  if (data.name.trim().length < 2) {
    errors.name = "Please enter your full name";
  }

  if (!EMAIL_PATTERN.test(data.email.trim())) {
    errors.email = "Enter a valid email address";
  }

  if (!PHONE_PATTERN.test(cleanPhone(data.phone))) {
    errors.phone = "Enter a valid 10-digit phone number";
  }

  if (data.password.length < 6) {
    errors.password = "Use at least 6 characters";
  }

  if (!data.confirmPassword || data.confirmPassword !== data.password) {
    errors.confirmPassword = "Passwords do not match";
  }

  return errors;
};

const HERO_POINTS = [
  { icon: "📍", title: "Report in seconds", text: "Potholes, street lights, garbage, water — pin it and send it." },
  { icon: "📈", title: "Track every step", text: "See your issue move from Submitted to Resolved in real time." },
  { icon: "🤝", title: "Build a better city", text: "Your reports help local teams prioritise what matters." },
];

function Register() {
  const navigate = useNavigate();

  const [view, setView] = useState("form");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "citizen",
  });

  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [shake, setShake] = useState(false);

  const [googleData, setGoogleData] = useState(null);
  const [googlePhone, setGooglePhone] = useState("");
  const [success, setSuccess] = useState(null);

  const errors = validate(formData);
  const strength = getPasswordStrength(formData.password);

  const handleChange = (e) => {
    setServerError("");
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleBlur = (e) =>
    setTouched({ ...touched, [e.target.name]: true });

  const fieldState = (name) => {
    if (!touched[name]) {
      return "";
    }

    return errors[name] ? "has-error" : "is-valid";
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  // =====================================
  // EMAIL SIGN-UP
  // =====================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    setTouched({
      name: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true,
    });

    if (Object.keys(errors).length > 0) {
      triggerShake();
      return;
    }

    setLoading(true);
    setServerError("");

    try {
      await axios.post(`${API}/register`, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phone: cleanPhone(formData.phone),
        role: formData.role,
      });

      const isStaffSignup = formData.role === "staff";

      setSuccess({
        name: formData.name.trim().split(" ")[0],
        text: isStaffSignup
          ? "Your staff account request was sent. An admin will review it — you can log in once it's approved."
          : "Your account is ready. Log in to start reporting issues.",
        action: isStaffSignup ? "home" : "login",
      });
      setView("success");

      // Staff wait for approval, so they stay on this screen
      if (isStaffSignup) {
        return;
      }

      setTimeout(
        () =>
          navigate("/login", {
            state: { email: formData.email.trim(), registered: true },
          }),
        2600
      );
    } catch (error) {
      console.error("Registration error:", error);

      setServerError(
        error.response?.data?.message ||
          "Registration failed. Please try again."
      );
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  // =====================================
  // GOOGLE SIGN-UP
  // =====================================
  const finishGoogleLogin = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    setSuccess({
      name: data.user.name.split(" ")[0],
      text: "You're signed in with Google. Taking you to your dashboard…",
      action: "dashboard",
    });
    setView("success");

    setTimeout(
      () => navigate(data.user.role === "staff" ? "/staff" : "/dashboard"),
      2200
    );
  };

  const handleGoogleCredential = async (credential) => {
    setServerError("");
    setLoading(true);

    try {
      const { data } = await axios.post(`${API}/google`, { credential });

      if (data.needsPhone) {
        setGoogleData({ ...data, credential });
        setView("google-phone");
      } else {
        finishGoogleLogin(data);
      }
    } catch (error) {
      console.error("Google sign-up error:", error);

      setServerError(
        error.response?.data?.message || "Google sign-up failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGooglePhoneSubmit = async (e) => {
    e.preventDefault();

    if (!PHONE_PATTERN.test(cleanPhone(googlePhone))) {
      setServerError("Enter a valid 10-digit phone number");
      triggerShake();
      return;
    }

    setLoading(true);
    setServerError("");

    try {
      const { data } = await axios.post(`${API}/google`, {
        credential: googleData.credential,
        phone: cleanPhone(googlePhone),
      });

      finishGoogleLogin(data);
    } catch (error) {
      console.error("Google sign-up error:", error);

      setServerError(
        error.response?.data?.message || "Could not finish sign-up. Please try again."
      );
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reg-page">

      {/* Animated background */}
      <div className="reg-bg" aria-hidden="true">
        <span className="reg-blob reg-blob-1" />
        <span className="reg-blob reg-blob-2" />
        <span className="reg-blob reg-blob-3" />
      </div>

      <div className="reg-shell">

        {/* =====================================
            LEFT: BRAND PANEL
        ===================================== */}

        <aside className="reg-hero">
          <div className="reg-hero-brand">
            <span className="reg-logo">S</span>
            SOLVEXA
          </div>

          <h2>
            Report. Track.
            <span> Resolve.</span>
          </h2>

          <p className="reg-hero-text">
            Join thousands of citizens making their neighbourhood
            cleaner, safer and better — one report at a time.
          </p>

          <ul className="reg-points">
            {HERO_POINTS.map((point, index) => (
              <li key={point.title} style={{ animationDelay: `${0.35 + index * 0.12}s` }}>
                <span className="reg-point-icon">{point.icon}</span>
                <span>
                  <strong>{point.title}</strong>
                  <small>{point.text}</small>
                </span>
              </li>
            ))}
          </ul>

          {/* Floating live-status card */}
          <div className="reg-float-card" aria-hidden="true">
            <div className="reg-float-head">
              <span>SOL-2026-0142</span>
              <em>In Progress</em>
            </div>
            <strong>Street light not working</strong>
            <div className="reg-float-track">
              <span />
            </div>
            <small>Assigned to Electrical Dept · 2h ago</small>
          </div>
        </aside>


        {/* =====================================
            RIGHT: FORM CARD
        ===================================== */}

        <section className={`reg-card ${shake ? "reg-shake" : ""}`}>

          {/* ---------- EMAIL + GOOGLE FORM ---------- */}
          {view === "form" && (
            <div className="reg-view" key="form">
              <div className="reg-card-head">
                <h1>Create your account</h1>
                <p>
                  Already have an account?{" "}
                  <Link to="/login">Log in</Link>
                </p>
              </div>

              <GoogleAuthButton
                text="signup_with"
                onCredential={handleGoogleCredential}
                disabled={loading}
              />

              <div className="reg-divider">
                <span>or sign up with email</span>
              </div>

              {serverError && (
                <div className="reg-alert" role="alert">
                  <span>!</span>
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>

                <div className="reg-row">
                  <div className={`reg-field ${fieldState("name")}`}>
                    <label htmlFor="reg-name">Full name</label>
                    <div className="reg-input">
                      <span className="reg-input-icon">👤</span>
                      <input
                        id="reg-name"
                        type="text"
                        name="name"
                        placeholder="Pranathi Rao"
                        autoComplete="name"
                        value={formData.name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                    </div>
                    {touched.name && errors.name && (
                      <small className="reg-error">{errors.name}</small>
                    )}
                  </div>

                  <div className={`reg-field ${fieldState("phone")}`}>
                    <label htmlFor="reg-phone">Phone number</label>
                    <div className="reg-input">
                      <span className="reg-input-icon">📱</span>
                      <input
                        id="reg-phone"
                        type="tel"
                        name="phone"
                        placeholder="98765 43210"
                        autoComplete="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                    </div>
                    {touched.phone && errors.phone && (
                      <small className="reg-error">{errors.phone}</small>
                    )}
                  </div>
                </div>

                <div className={`reg-field ${fieldState("email")}`}>
                  <label htmlFor="reg-email">Email address</label>
                  <div className="reg-input">
                    <span className="reg-input-icon">✉️</span>
                    <input
                      id="reg-email"
                      type="email"
                      name="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                  </div>
                  {touched.email && errors.email && (
                    <small className="reg-error">{errors.email}</small>
                  )}
                </div>

                <div className={`reg-field ${fieldState("password")}`}>
                  <label htmlFor="reg-password">Password</label>
                  <div className="reg-input">
                    <span className="reg-input-icon">🔒</span>
                    <input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="At least 6 characters"
                      autoComplete="new-password"
                      value={formData.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    <button
                      type="button"
                      className="reg-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>

                  {formData.password && (
                    <div className={`reg-strength reg-strength-${strength.score}`}>
                      <div className="reg-strength-bars">
                        {[1, 2, 3, 4].map((bar) => (
                          <span key={bar} className={bar <= strength.score ? "on" : ""} />
                        ))}
                      </div>
                      <small>{strength.label}</small>
                    </div>
                  )}

                  {touched.password && errors.password && (
                    <small className="reg-error">{errors.password}</small>
                  )}
                </div>

                <div className={`reg-field ${fieldState("confirmPassword")}`}>
                  <label htmlFor="reg-confirm">Confirm password</label>
                  <div className="reg-input">
                    <span className="reg-input-icon">🔁</span>
                    <input
                      id="reg-confirm"
                      type={showPassword ? "text" : "password"}
                      name="confirmPassword"
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    {formData.confirmPassword &&
                      formData.confirmPassword === formData.password && (
                        <span className="reg-match">✓</span>
                      )}
                  </div>
                  {touched.confirmPassword && errors.confirmPassword && (
                    <small className="reg-error">{errors.confirmPassword}</small>
                  )}
                </div>

                <div className="reg-field">
                  <label>I am joining as</label>
                  <div className="reg-roles">
                    {[
                      { value: "citizen", icon: "🏠", title: "Citizen", text: "Report & track issues" },
                      { value: "staff", icon: "🛠️", title: "Staff", text: "Apply for a staff job →" },
                    ].map((role) => (
                      <button
                        type="button"
                        key={role.value}
                        className={formData.role === role.value ? "active" : ""}
                        onClick={() =>
                          role.value === "staff"
                            ? navigate("/staff/apply")
                            : setFormData({ ...formData, role: role.value })
                        }
                      >
                        <span className="reg-role-icon">{role.icon}</span>
                        <span>
                          <strong>{role.title}</strong>
                          <small>{role.text}</small>
                        </span>
                        <span className="reg-role-check">✓</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit" className="reg-submit" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="reg-spinner" />
                      Creating account…
                    </>
                  ) : (
                    <>
                      Create account
                      <span className="reg-arrow">→</span>
                    </>
                  )}
                </button>

                <p className="reg-terms">
                  By signing up you agree to use SOLVEXA responsibly and
                  report genuine community issues.
                </p>
              </form>
            </div>
          )}


          {/* ---------- GOOGLE: ADD PHONE ---------- */}
          {view === "google-phone" && googleData && (
            <div className="reg-view" key="google-phone">
              <button
                type="button"
                className="reg-back"
                onClick={() => {
                  setView("form");
                  setServerError("");
                }}
              >
                ← Back
              </button>

              <div className="reg-google-user">
                {googleData.picture ? (
                  <img src={googleData.picture} alt="" referrerPolicy="no-referrer" />
                ) : (
                  <span className="reg-google-avatar">
                    {googleData.name?.[0] || "G"}
                  </span>
                )}
                <div>
                  <strong>{googleData.name}</strong>
                  <small>{googleData.email}</small>
                </div>
              </div>

              <div className="reg-card-head">
                <h1>One last step</h1>
                <p>
                  Add your phone number so local teams can reach you
                  about your reports.
                </p>
              </div>

              {serverError && (
                <div className="reg-alert" role="alert">
                  <span>!</span>
                  {serverError}
                </div>
              )}

              <form onSubmit={handleGooglePhoneSubmit} noValidate>
                <div className="reg-field">
                  <label htmlFor="reg-google-phone">Phone number</label>
                  <div className="reg-input">
                    <span className="reg-input-icon">📱</span>
                    <input
                      id="reg-google-phone"
                      type="tel"
                      placeholder="98765 43210"
                      autoComplete="tel"
                      autoFocus
                      value={googlePhone}
                      onChange={(e) => {
                        setGooglePhone(e.target.value);
                        setServerError("");
                      }}
                    />
                  </div>
                </div>

                <button type="submit" className="reg-submit" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="reg-spinner" />
                      Finishing sign-up…
                    </>
                  ) : (
                    <>
                      Finish sign-up
                      <span className="reg-arrow">→</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}


          {/* ---------- SUCCESS ---------- */}
          {view === "success" && success && (
            <div className="reg-view reg-success" key="success">
              <div className="reg-check">
                <svg viewBox="0 0 52 52" aria-hidden="true">
                  <circle cx="26" cy="26" r="24" />
                  <path d="M15 27l7 7 15-15" />
                </svg>
              </div>

              <h1>Welcome, {success.name}! 🎉</h1>
              <p>{success.text}</p>

              <button
                type="button"
                className="reg-submit"
                onClick={() =>
                  success.action === "login"
                    ? navigate("/login", {
                        state: { email: formData.email.trim(), registered: true },
                      })
                    : success.action === "home"
                      ? navigate("/")
                      : navigate("/dashboard")
                }
              >
                {success.action === "login"
                  ? "Go to login"
                  : success.action === "home"
                    ? "Back to home"
                    : "Open dashboard"}
                <span className="reg-arrow">→</span>
              </button>

              <div className="reg-confetti" aria-hidden="true">
                {Array.from({ length: 14 }, (_, i) => (
                  <span key={i} style={{ "--i": i }} />
                ))}
              </div>
            </div>
          )}

        </section>
      </div>
    </div>
  );
}

export default Register;
