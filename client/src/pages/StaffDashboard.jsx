import { API_URL } from "../config";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import "../staff.css";

const API = `${API_URL}/api/staff`;

const ACTIVE_STATUSES = ["Assigned", "In Progress"];

const PRIORITY_RANK = { Urgent: 0, High: 1, Medium: 2, Low: 3 };

const slug = (value = "") => value.toLowerCase().replace(/[^a-z0-9]+/g, "-");

const timeAgo = (date) => {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  const units = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];

  for (const [unit, size] of units) {
    const value = Math.floor(seconds / size);

    if (value >= 1) {
      return `${value} ${unit}${value > 1 ? "s" : ""} ago`;
    }
  }

  return "just now";
};

// =====================================
// ONE ASSIGNED REPORT
// =====================================
function WorkCard({ complaint, onUpdate, busy }) {
  const [note, setNote] = useState(complaint.resolutionDetails || "");
  const [showResolve, setShowResolve] = useState(false);

  const citizen = complaint.citizenId || {};
  const { address, latitude, longitude } = complaint.location || {};
  const hasCoordinates = latitude != null && longitude != null;
  const mapsLink = hasCoordinates
    ? `https://www.google.com/maps?q=${latitude},${longitude}`
    : address
      ? `https://www.google.com/maps/search/${encodeURIComponent(address)}`
      : null;

  const isActive = ACTIVE_STATUSES.includes(complaint.status);

  return (
    <article className={`stf-card stf-priority-${slug(complaint.priority)}`}>
      <div className="stf-card-head">
        <div>
          <span className="stf-number">{complaint.complaintNumber}</span>
          <h3>{complaint.title}</h3>
        </div>
        <div className="stf-tags">
          <span className={`stf-pill stf-pri-${slug(complaint.priority)}`}>
            {complaint.priority}
          </span>
          <span className={`stf-pill stf-st-${slug(complaint.status)}`}>
            {complaint.status}
          </span>
        </div>
      </div>

      <p className="stf-desc">{complaint.description}</p>

      <div className="stf-meta">
        <div>
          <span>Category</span>
          <strong>{complaint.category}</strong>
        </div>
        <div>
          <span>Location</span>
          <strong>{address || "Not provided"}</strong>
          {mapsLink && (
            <a href={mapsLink} target="_blank" rel="noreferrer">
              Open in Maps →
            </a>
          )}
        </div>
        <div>
          <span>Reported by</span>
          <strong>{citizen.name || "Citizen"}</strong>
          {citizen.phone && (
            <a href={`tel:${citizen.phone}`}>📞 {citizen.phone}</a>
          )}
        </div>
        <div>
          <span>Reported</span>
          <strong>{timeAgo(complaint.createdAt)}</strong>
        </div>
      </div>

      {/* Actions */}
      {complaint.status === "Assigned" && (
        <div className="stf-actions">
          <p>Ready to start? Let the citizen know work has begun.</p>
          <button
            className="stf-btn stf-btn-primary"
            disabled={busy}
            onClick={() => onUpdate(complaint, { status: "In Progress" })}
          >
            ▶ Start work
          </button>
        </div>
      )}

      {complaint.status === "In Progress" && !showResolve && (
        <div className="stf-actions">
          <p>Working on it. Mark it resolved once the problem is fixed.</p>
          <button
            className="stf-btn stf-btn-success"
            onClick={() => setShowResolve(true)}
          >
            ✓ Mark as resolved
          </button>
        </div>
      )}

      {complaint.status === "In Progress" && showResolve && (
        <form
          className="stf-resolve"
          onSubmit={(e) => {
            e.preventDefault();
            onUpdate(complaint, { status: "Resolved", resolutionDetails: note });
          }}
        >
          <label htmlFor={`note-${complaint._id}`}>
            What did you do? <small>The citizen will see this note.</small>
          </label>
          <textarea
            id={`note-${complaint._id}`}
            rows="3"
            autoFocus
            placeholder="e.g. Pothole filled and road surface levelled."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            required
          />
          <div className="stf-resolve-buttons">
            <button
              type="button"
              className="stf-btn stf-btn-ghost"
              onClick={() => setShowResolve(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="stf-btn stf-btn-success"
              disabled={busy || !note.trim()}
            >
              {busy ? "Saving…" : "Confirm resolved"}
            </button>
          </div>
        </form>
      )}

      {!isActive && (
        <div className="stf-done">
          <strong>
            {complaint.status === "Closed" ? "🔒 Closed by admin" : "✅ Resolved"}
          </strong>
          {complaint.resolutionDetails && <p>{complaint.resolutionDetails}</p>}
          {complaint.status === "Resolved" && (
            <button
              className="stf-link"
              disabled={busy}
              onClick={() => onUpdate(complaint, { status: "In Progress" })}
            >
              Not fixed yet? Reopen
            </button>
          )}
        </div>
      )}
    </article>
  );
}

// =====================================
// STAFF WORKSPACE PAGE
// =====================================
function StaffDashboard() {
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("active");
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState("");

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/", { replace: true });
  }, [navigate]);

  // =====================================
  // LOAD MY ASSIGNED REPORTS
  // =====================================
  useEffect(() => {
    if (!token || user?.role !== "staff") {
      navigate("/login", { replace: true });
      return;
    }

    axios
      .get(`${API}/complaints`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => setComplaints(response.data.complaints))
      .catch((err) => {
        console.error("Staff complaints error:", err);

        if ([401, 403].includes(err.response?.status)) {
          alert(err.response.data.message);
          logout();
        } else {
          setError("Could not load your assigned reports. Please try again.");
        }
      })
      .finally(() => setLoading(false));
  }, [token, user?.role, navigate, logout]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  // =====================================
  // UPDATE PROGRESS
  // =====================================
  const updateComplaint = async (complaint, updates) => {
    setBusyId(complaint._id);

    try {
      const response = await axios.put(
        `${API}/complaints/${complaint._id}`,
        updates,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setComplaints((current) =>
        current.map((c) => (c._id === complaint._id ? response.data.complaint : c))
      );

      setToast(`${complaint.complaintNumber} is now "${response.data.complaint.status}"`);
    } catch (err) {
      console.error("Staff update error:", err);

      alert(err.response?.data?.message || "Could not update the report.");
    } finally {
      setBusyId(null);
    }
  };

  const active = complaints
    .filter((c) => ACTIVE_STATUSES.includes(c.status))
    .sort(
      (a, b) =>
        PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
        new Date(a.createdAt) - new Date(b.createdAt)
    );

  const completed = complaints.filter((c) => !ACTIVE_STATUSES.includes(c.status));
  const inProgress = complaints.filter((c) => c.status === "In Progress").length;
  const shown = tab === "active" ? active : completed;

  return (
    <div className="stf-page">

      <header className="stf-hero">
        <div>
          <span className="stf-eyebrow">STAFF WORKSPACE</span>
          <h1>Hello, {user?.name?.split(" ")[0] || "there"} 👷</h1>
          <p>Here are the community reports assigned to you. Most urgent first.</p>
        </div>
        <button className="stf-btn stf-btn-light" onClick={logout}>
          Logout
        </button>
      </header>

      <div className="stf-stats">
        <div>
          <span>To do</span>
          <strong>{active.length - inProgress}</strong>
        </div>
        <div>
          <span>In progress</span>
          <strong>{inProgress}</strong>
        </div>
        <div>
          <span>Completed</span>
          <strong>{completed.length}</strong>
        </div>
      </div>

      <div className="stf-tabs">
        <button
          className={tab === "active" ? "active" : ""}
          onClick={() => setTab("active")}
        >
          Active work <span>{active.length}</span>
        </button>
        <button
          className={tab === "completed" ? "active" : ""}
          onClick={() => setTab("completed")}
        >
          Completed <span>{completed.length}</span>
        </button>
      </div>

      {loading ? (
        <div className="stf-empty">⏳ Loading your assigned reports…</div>
      ) : error ? (
        <div className="stf-empty stf-error">⚠️ {error}</div>
      ) : shown.length === 0 ? (
        <div className="stf-empty">
          <div>{tab === "active" ? "🎉" : "📭"}</div>
          <h3>{tab === "active" ? "Nothing assigned right now" : "No completed work yet"}</h3>
          <p>
            {tab === "active"
              ? "When an admin assigns you a report, it will appear here."
              : "Reports you resolve will be listed here."}
          </p>
        </div>
      ) : (
        <div className="stf-list">
          {shown.map((complaint) => (
            <WorkCard
              key={complaint._id}
              complaint={complaint}
              busy={busyId === complaint._id}
              onUpdate={updateComplaint}
            />
          ))}
        </div>
      )}

      {toast && (
        <div className="stf-toast" role="status">
          <span>✓</span> {toast}
        </div>
      )}
    </div>
  );
}

export default StaffDashboard;
