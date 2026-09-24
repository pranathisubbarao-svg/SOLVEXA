import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import "../home.css";
import HeroScene from "../components/home/HeroScene";

const ROTATING_WORDS = [
  "potholes",
  "broken street lights",
  "garbage piles",
  "water leaks",
  "blocked drains",
];

const CATEGORIES = [
  { name: "Roads & Potholes", icon: "🛣️", tint: "#fee2e2" },
  { name: "Street Lights", icon: "💡", tint: "#fef3c7" },
  { name: "Water Supply", icon: "🚰", tint: "#dbeafe" },
  { name: "Garbage & Waste", icon: "🗑️", tint: "#dcfce7" },
  { name: "Drainage", icon: "🌊", tint: "#e0f2fe" },
  { name: "Public Safety", icon: "🛡️", tint: "#ede9fe" },
  { name: "Parks & Public Spaces", icon: "🌳", tint: "#d1fae5" },
  { name: "Other", icon: "📌", tint: "#f1f5f9" },
];

const STEPS = [
  { icon: "📝", title: "Report", text: "Describe the issue, pick a category and add the location. Takes under a minute." },
  { icon: "🔍", title: "Review", text: "The admin team verifies your report and sets its priority." },
  { icon: "👷", title: "Assign", text: "It's routed to the right department and a team starts work." },
  { icon: "✅", title: "Resolve", text: "You see every update and get the resolution details when it's fixed." },
];

const FEATURES = [
  { icon: "⚡", title: "Report in seconds", text: "A short, simple form built for phones — no paperwork, no queues." },
  { icon: "📍", title: "Location aware", text: "Every report carries its location so crews know exactly where to go." },
  { icon: "📊", title: "Live tracking", text: "Follow each report through six clear stages from Submitted to Closed." },
  { icon: "🏛️", title: "Right department", text: "Reports are prioritised and routed to the team that can fix them." },
  { icon: "🔔", title: "Clear updates", text: "Read resolution notes from the team directly on your complaint." },
  { icon: "🔒", title: "Private & secure", text: "Your personal details are never shown publicly. Only admins see them." },
];

const FAQS = [
  {
    q: "Is SOLVEXA free to use?",
    a: "Yes. Creating an account and reporting issues is completely free for citizens.",
  },
  {
    q: "What kind of problems can I report?",
    a: "Civic issues in public spaces — potholes, broken street lights, garbage, water supply, drainage, public safety hazards, parks and more.",
  },
  {
    q: "How do I know my complaint is being worked on?",
    a: "Open My Complaints to see a progress tracker for each report: Submitted → Under Review → Assigned → In Progress → Resolved → Closed.",
  },
  {
    q: "Who can see my personal details?",
    a: "Only SOLVEXA administrators. The public figures on this page are anonymous totals — no names, phone numbers or addresses.",
  },
  {
    q: "Can I use SOLVEXA for emergencies?",
    a: "No. For emergencies such as fire, accidents or crime, call 112 immediately. SOLVEXA is for non-urgent civic issues.",
  },
];

const STATUS_TEXT = {
  Submitted: "was just reported",
  "Under Review": "is under review",
  Assigned: "was assigned to a team",
  "In Progress": "is being worked on",
  Resolved: "was resolved",
  Closed: "was closed",
};

const timeAgo = (date) => {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  const units = [
    ["d", 86400],
    ["h", 3600],
    ["m", 60],
  ];

  for (const [unit, size] of units) {
    if (seconds >= size) {
      return `${Math.floor(seconds / size)}${unit} ago`;
    }
  }

  return "just now";
};

const formatDuration = (hours) => {
  if (hours == null) {
    return { value: null, suffix: "" };
  }

  return hours < 48
    ? { value: hours, suffix: hours === 1 ? " hr" : " hrs" }
    : { value: Math.round(hours / 24), suffix: " days" };
};

// =====================================
// COUNT-UP NUMBER (starts when visible)
// =====================================
function CountUp({ value, suffix = "" }) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const element = ref.current;

    if (value == null || !element) {
      return;
    }

    let frame;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) {
        return;
      }

      observer.disconnect();

      const start = performance.now();
      const duration = 1400;

      const tick = (now) => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);

        setDisplay(Math.round(value * eased));

        if (progress < 1) {
          frame = requestAnimationFrame(tick);
        }
      };

      frame = requestAnimationFrame(tick);
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <span ref={ref}>
      {value == null ? "—" : `${display.toLocaleString("en-IN")}${suffix}`}
    </span>
  );
}

function Home() {
  const navigate = useNavigate();
  const pageRef = useRef(null);

  const isLoggedIn = Boolean(localStorage.getItem("token"));

  const [summary, setSummary] = useState(null);
  const [summaryFailed, setSummaryFailed] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);

  // =====================================
  // LOAD PUBLIC SUMMARY
  // =====================================
  useEffect(() => {
    axios
      .get("http://localhost:5000/api/complaints/public/summary")
      .then((response) => setSummary(response.data))
      .catch((error) => {
        console.error("Home summary error:", error);
        setSummaryFailed(true);
      });
  }, []);

  // =====================================
  // ROTATING HEADLINE WORD
  // =====================================
  useEffect(() => {
    const timer = setInterval(
      () => setWordIndex((index) => (index + 1) % ROTATING_WORDS.length),
      2400
    );

    return () => clearInterval(timer);
  }, []);

  // =====================================
  // REVEAL SECTIONS ON SCROLL
  // =====================================
  useEffect(() => {
    const elements = pageRef.current?.querySelectorAll("[data-reveal]") || [];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [summary]);

  const goReport = (category) => {
    if (!isLoggedIn) {
      navigate("/register");
      return;
    }

    navigate("/report", category ? { state: { category } } : undefined);
  };

  const goTrack = () => navigate(isLoggedIn ? "/complaints" : "/login");

  const categoryCount = (name) =>
    summary?.categories.find((c) => c.category === name)?.count || 0;

  const avgTime = formatDuration(summary?.avgResolutionHours);
  const loadingValue = (value) => (summaryFailed ? null : summary ? value : null);

  const stats = [
    { icon: "📋", label: "Issues reported", value: loadingValue(summary?.total) },
    { icon: "✅", label: "Issues resolved", value: loadingValue(summary?.resolved) },
    { icon: "📈", label: "Resolution rate", value: loadingValue(summary?.resolutionRate), suffix: "%" },
    { icon: "⏱️", label: "Avg. time to resolve", value: loadingValue(avgTime.value), suffix: avgTime.suffix },
    { icon: "👥", label: "Citizens joined", value: loadingValue(summary?.citizens) },
  ];

  return (
    <div className="home" ref={pageRef}>

      {/* =====================================
          HERO
      ===================================== */}

      <section className="home-hero">
        <div className="home-hero-bg" aria-hidden="true">
          <span className="home-orb home-orb-1" />
          <span className="home-orb home-orb-2" />
          <span className="home-grid" />
        </div>

        <div className="home-hero-inner">
          <div className="home-hero-copy">
            <span className="home-badge">
              <span className="home-live-dot" />
              Live civic reporting for your city
            </span>

            <h1>
              Spot it. Report it.
              <span className="home-gradient-text"> Get it fixed.</span>
            </h1>

            <p className="home-hero-text">
              SOLVEXA helps citizens report{" "}
              <span className="home-rotator">
                <span key={wordIndex} className="home-rotator-word">
                  {ROTATING_WORDS[wordIndex]}
                </span>
              </span>
              <br />
              and other community issues — then track them until
              they're resolved.
            </p>

            <div className="home-hero-actions">
              <button className="home-btn home-btn-primary" onClick={() => goReport()}>
                Report an Issue
                <span>→</span>
              </button>

              <button className="home-btn home-btn-ghost" onClick={goTrack}>
                Track a Complaint
              </button>
            </div>

            <div className="home-hero-proof">
              <div className="home-proof-item">
                <strong>
                  <CountUp value={loadingValue(summary?.total)} />
                </strong>
                <span>reports filed</span>
              </div>
              <span className="home-proof-divider" />
              <div className="home-proof-item">
                <strong>
                  <CountUp value={loadingValue(summary?.resolutionRate)} suffix="%" />
                </strong>
                <span>resolved</span>
              </div>
              <span className="home-proof-divider" />
              <div className="home-proof-item">
                <strong>Free</strong>
                <span>for citizens</span>
              </div>
            </div>
          </div>

          <div className="home-hero-visual">
            <HeroScene />
          </div>
        </div>
      </section>


      {/* =====================================
          LIVE STATS
      ===================================== */}

      <section className="home-stats-wrap">
        <div className="home-stats" data-reveal>
          {stats.map((stat, index) => (
            <div className="home-stat" key={stat.label} style={{ "--i": index }}>
              <span className="home-stat-icon">{stat.icon}</span>
              <strong>
                <CountUp value={stat.value} suffix={stat.suffix} />
              </strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
        <p className="home-stats-note">
          {summaryFailed
            ? "Live figures are unavailable right now."
            : "Live figures from SOLVEXA — updated every time you visit."}
        </p>
      </section>


      {/* =====================================
          HOW IT WORKS
      ===================================== */}

      <section className="home-section">
        <div className="home-section-head" data-reveal>
          <span className="home-eyebrow">HOW IT WORKS</span>
          <h2>From report to resolved in four steps</h2>
          <p>Every complaint follows a transparent path you can watch in real time.</p>
        </div>

        <div className="home-steps" data-reveal>
          {STEPS.map((step, index) => (
            <div className="home-step" key={step.title} style={{ "--i": index }}>
              <div className="home-step-icon">
                {step.icon}
                <span>{index + 1}</span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          ))}
        </div>
      </section>


      {/* =====================================
          CATEGORIES + LIVE ACTIVITY
      ===================================== */}

      <section className="home-section home-section-tinted">
        <div className="home-split">

          <div data-reveal>
            <div className="home-section-head home-head-left">
              <span className="home-eyebrow">WHAT YOU CAN REPORT</span>
              <h2>Pick a category and get started</h2>
              <p>Tap a category to report an issue in it right away.</p>
            </div>

            <div className="home-categories">
              {CATEGORIES.map((category, index) => (
                <button
                  key={category.name}
                  className="home-category"
                  style={{ "--tint": category.tint, "--i": index }}
                  onClick={() => goReport(category.name)}
                >
                  <span className="home-category-icon">{category.icon}</span>
                  <strong>{category.name}</strong>
                  <small>
                    {summary
                      ? `${categoryCount(category.name)} report${categoryCount(category.name) === 1 ? "" : "s"}`
                      : "Report now"}
                  </small>
                </button>
              ))}
            </div>
          </div>

          <div className="home-activity" data-reveal>
            <div className="home-activity-head">
              <h3>
                <span className="home-live-dot" />
                Live activity
              </h3>
              <small>Anonymous · latest updates</small>
            </div>

            {!summary || summary.recent.length === 0 ? (
              <div className="home-activity-empty">
                {summaryFailed
                  ? "Activity is unavailable right now."
                  : summary
                    ? "No reports yet — be the first to report an issue!"
                    : "Loading activity…"}
              </div>
            ) : (
              <ul>
                {summary.recent.map((item, index) => {
                  const category =
                    CATEGORIES.find((c) => c.name === item.category) ||
                    CATEGORIES[CATEGORIES.length - 1];

                  return (
                    <li key={`${item.updatedAt}-${index}`} style={{ "--i": index }}>
                      <span className="home-activity-icon" style={{ background: category.tint }}>
                        {category.icon}
                      </span>
                      <div>
                        <p>
                          A <strong>{item.category}</strong> issue{" "}
                          {STATUS_TEXT[item.status] || "was updated"}
                        </p>
                        <small>{timeAgo(item.updatedAt)}</small>
                      </div>
                      <span className={`home-activity-status s-${item.status.toLowerCase().replace(/\s+/g, "-")}`}>
                        {item.status}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            <button className="home-btn home-btn-primary home-btn-block" onClick={() => goReport()}>
              Report an issue near you
            </button>
          </div>

        </div>
      </section>


      {/* =====================================
          FEATURES
      ===================================== */}

      <section className="home-section">
        <div className="home-section-head" data-reveal>
          <span className="home-eyebrow">WHY SOLVEXA</span>
          <h2>Built to make fixing your city simple</h2>
          <p>Everything citizens and service teams need, in one place.</p>
        </div>

        <div className="home-features" data-reveal>
          {FEATURES.map((feature, index) => (
            <div className="home-feature" key={feature.title} style={{ "--i": index }}>
              <span className="home-feature-icon">{feature.icon}</span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </div>
          ))}
        </div>
      </section>


      {/* =====================================
          FAQ
      ===================================== */}

      <section className="home-section home-section-tinted">
        <div className="home-faq-wrap">
          <div className="home-section-head home-head-left" data-reveal>
            <span className="home-eyebrow">FAQ</span>
            <h2>Questions, answered</h2>
            <p>
              Still unsure? <Link to="/register">Create a free account</Link> and
              try reporting your first issue.
            </p>
          </div>

          <div className="home-faq" data-reveal>
            {FAQS.map((faq) => (
              <details key={faq.q}>
                <summary>
                  {faq.q}
                  <span className="home-faq-icon" />
                </summary>
                <p>{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>


      {/* =====================================
          CTA + EMERGENCY
      ===================================== */}

      <section className="home-cta-wrap">
        <div className="home-cta" data-reveal>
          <div>
            <h2>Seen something that needs fixing?</h2>
            <p>Report it now — it takes less than a minute.</p>
          </div>
          <div className="home-cta-actions">
            <button className="home-btn home-btn-white" onClick={() => goReport()}>
              Report an Issue →
            </button>
            {!isLoggedIn && (
              <Link className="home-cta-link" to="/login">
                I already have an account
              </Link>
            )}
          </div>
        </div>

        <div className="home-emergency" data-reveal>
          <span>🚨</span>
          <p>
            <strong>Emergency?</strong> Don't use SOLVEXA — call{" "}
            <a href="tel:112">112</a> (Emergency) ·{" "}
            <a href="tel:108">108</a> (Ambulance) ·{" "}
            <a href="tel:101">101</a> (Fire)
          </p>
        </div>
      </section>


      {/* =====================================
          FOOTER
      ===================================== */}

      <footer className="home-footer">
        <div className="home-footer-inner">
          <div className="home-footer-brand">
            <div className="home-logo">
              <span>S</span>
              SOLVEXA
            </div>
            <p>
              Connecting citizens with service departments to build
              cleaner, safer communities.
            </p>
          </div>

          <div>
            <h4>Citizens</h4>
            <button onClick={() => goReport()}>Report an issue</button>
            <button onClick={goTrack}>Track complaints</button>
            <Link to="/register">Create account</Link>
            <Link to="/login">Login</Link>
          </div>

          <div>
            <h4>Administration</h4>
            <Link to="/admin/login">Admin login</Link>
            <Link to="/forgot-password">Reset password</Link>
          </div>

          <div>
            <h4>Emergency</h4>
            <a href="tel:112">112 · Emergency</a>
            <a href="tel:108">108 · Ambulance</a>
            <a href="tel:101">101 · Fire</a>
          </div>
        </div>

        <div className="home-footer-bottom">
          © {new Date().getFullYear()} SOLVEXA · Built for better communities
        </div>
      </footer>

    </div>
  );
}

export default Home;
