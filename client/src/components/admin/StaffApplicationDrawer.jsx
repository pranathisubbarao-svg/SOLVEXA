import { useEffect, useState } from "react";
import axios from "axios";

import { API, formatDate, formatDateTime, initials, timeAgo } from "./adminUtils";

const DOCUMENTS = [
  { key: "aadhaarCard", label: "Aadhaar card", icon: "🪪" },
  { key: "panCard", label: "PAN card", icon: "💳" },
  { key: "educationCertificate", label: "Education certificate", icon: "🎓" },
  { key: "resume", label: "Resume", icon: "📄" },
];

const STATUS_LABELS = {
  pending: "Waiting for review",
  approved: "Approved",
  rejected: "Rejected",
};

const documentUrl = (memberId, key) => `${API}/staff/${memberId}/documents/${key}`;

// Loads a private document with the admin's token and returns a local URL
const fetchDocument = async (memberId, key, token) => {
  const response = await axios.get(documentUrl(memberId, key), {
    headers: { Authorization: `Bearer ${token}` },
    responseType: "blob",
  });

  return URL.createObjectURL(response.data);
};

// =====================================
// PRIVATE PHOTO (loaded with auth)
// =====================================
export function StaffPhoto({ member, token, size = 44 }) {
  const [loaded, setLoaded] = useState({ id: null, url: null });
  const hasPhoto = Boolean(member.staffProfile?.documents?.photo);

  useEffect(() => {
    if (!hasPhoto) {
      return;
    }

    let objectUrl = null;
    let cancelled = false;

    fetchDocument(member._id, "photo", token)
      .then((url) => {
        objectUrl = url;
        if (!cancelled) setLoaded({ id: member._id, url });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [member._id, hasPhoto, token]);

  const url = loaded.id === member._id ? loaded.url : null;

  return url ? (
    <img
      className="adm-staff-photo"
      src={url}
      alt={`${member.name}`}
      style={{ width: size, height: size }}
    />
  ) : (
    <span className="adm-avatar" style={{ width: size, height: size }}>
      {initials(member.name)}
    </span>
  );
}

function StaffApplicationDrawer({ member, token, emailConfigured, onClose, onDecision, onResendEmail }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [docError, setDocError] = useState("");

  const profile = member.staffProfile;

  // Close with the Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const openDocument = async (key) => {
    setDocError("");

    // Open the tab right away so the browser doesn't block it
    const tab = window.open("", "_blank");

    if (!tab) {
      setDocError("Your browser blocked the new tab. Allow pop-ups for this site and try again.");
      return;
    }

    try {
      const url = await fetchDocument(member._id, key, token);

      tab.location.href = url;

      // Give the new tab time to load before freeing the URL
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      tab?.close();
      setDocError("Could not open that document. Please try again.");
    }
  };

  const decide = async (status) => {
    setBusy(true);
    await onDecision(member, status, status === "rejected" ? reason : "");
    setBusy(false);
  };

  const age = profile?.dateOfBirth
    ? Math.floor(
        (new Date() - new Date(profile.dateOfBirth)) / (365.25 * 24 * 3600 * 1000)
      )
    : null;

  const row = (label, value) => (
    <div>
      <dt>{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );

  return (
    <div className="adm-drawer-backdrop" onClick={onClose}>
      <aside
        className="adm-drawer adm-app-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Staff application from ${member.name}`}
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="adm-drawer-head">
          <div className="adm-app-head">
            <StaffPhoto member={member} token={token} size={72} />
            <div>
              <span className="adm-report-number">STAFF APPLICATION</span>
              <h2>{member.name}</h2>
              <div className="adm-drawer-tags">
                <span className={`adm-approval adm-approval-${member.approvalStatus}`}>
                  {STATUS_LABELS[member.approvalStatus]}
                </span>
                {profile?.preferredDepartment && (
                  <span className="adm-tag">{profile.preferredDepartment}</span>
                )}
              </div>
            </div>
          </div>

          <button className="adm-icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="adm-drawer-body">

          {!profile ? (
            <div className="adm-app-legacy">
              This staff account was created before job applications were
              introduced, so there are no application details or documents.
              <dl className="adm-app-list">
                {row("Email", member.email)}
                {row("Phone", member.phone)}
                {row("Joined", formatDate(member.createdAt))}
              </dl>
            </div>
          ) : (
            <>
              <p className="adm-app-applied">
                Applied {timeAgo(profile.appliedAt || member.createdAt)} ·{" "}
                {formatDateTime(profile.appliedAt || member.createdAt)}
              </p>

              {member.approvalStatus === "rejected" && profile.rejectionReason && (
                <div className="adm-app-reason">
                  <strong>Rejection reason:</strong> {profile.rejectionReason}
                </div>
              )}

              <section>
                <h4>Contact</h4>
                <dl className="adm-app-list">
                  {row("Email", <a href={`mailto:${member.email}`}>{member.email}</a>)}
                  {row("Mobile", <a href={`tel:${member.phone}`}>{member.phone}</a>)}
                </dl>
              </section>

              <section>
                <h4>Personal details</h4>
                <dl className="adm-app-list">
                  {row(
                    "Date of birth",
                    profile.dateOfBirth && `${formatDate(profile.dateOfBirth)} (${age} yrs)`
                  )}
                  {row("Gender", profile.gender)}
                  {row("Address", profile.address)}
                  {row("City / PIN", `${profile.city || ""} – ${profile.pincode || ""}`)}
                </dl>
              </section>

              <section>
                <h4>Identity</h4>
                <dl className="adm-app-list">
                  {row("Aadhaar", <span className="adm-mono">{profile.aadhaarNumber}</span>)}
                  {row("PAN", <span className="adm-mono">{profile.panNumber}</span>)}
                </dl>
                <p className="adm-app-note">
                  🔒 Numbers are masked. Compare the last digits with the
                  uploaded cards below.
                </p>
              </section>

              <section>
                <h4>Education &amp; work</h4>
                <dl className="adm-app-list">
                  {row("Qualification", profile.qualification)}
                  {row("Institution", profile.institution)}
                  {row("Year of passing", profile.yearOfPassing)}
                  {row(
                    "Experience",
                    profile.experienceYears != null &&
                      `${profile.experienceYears} year${profile.experienceYears === 1 ? "" : "s"}`
                  )}
                  {row("Department", profile.preferredDepartment)}
                  {row("Skills", profile.skills)}
                </dl>
              </section>

              <section>
                <h4>Documents</h4>
                <div className="adm-app-docs">
                  {DOCUMENTS.map((doc) =>
                    profile.documents?.[doc.key] ? (
                      <button
                        key={doc.key}
                        type="button"
                        className="adm-app-doc"
                        onClick={() => openDocument(doc.key)}
                      >
                        <span>{doc.icon}</span>
                        <strong>{doc.label}</strong>
                        <small>Open ↗</small>
                      </button>
                    ) : (
                      <div key={doc.key} className="adm-app-doc is-missing">
                        <span>{doc.icon}</span>
                        <strong>{doc.label}</strong>
                        <small>Not provided</small>
                      </div>
                    )
                  )}
                </div>
                {docError && <p className="adm-app-error">{docError}</p>}
              </section>
            </>
          )}
        </div>

        {/* Decision */}
        <div className="adm-drawer-form">
          {rejecting ? (
            <>
              <label>
                Reason for rejection (sent to the applicant)
                <textarea
                  rows="3"
                  autoFocus
                  placeholder="e.g. Aadhaar card image is not readable. Please apply again with a clear copy."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <div className="adm-drawer-actions">
                <button
                  className="adm-btn adm-btn-secondary"
                  onClick={() => setRejecting(false)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  className="adm-btn adm-btn-reject"
                  onClick={() => decide("rejected")}
                  disabled={busy || !reason.trim()}
                >
                  {busy ? "Rejecting…" : "Reject & email applicant"}
                </button>
              </div>
            </>
          ) : (
            <div className="adm-drawer-actions adm-app-actions">
              {member.approvalStatus !== "pending" && (
                <button
                  className="adm-btn adm-btn-secondary"
                  disabled={busy || !emailConfigured}
                  title={
                    emailConfigured
                      ? `Email the ${member.approvalStatus === "approved" ? "approval" : "rejection"} to ${member.email}`
                      : "Set up email in server/.env first"
                  }
                  onClick={async () => {
                    setBusy(true);
                    await onResendEmail(member);
                    setBusy(false);
                  }}
                >
                  📧 Send {member.approvalStatus === "approved" ? "approval" : "rejection"} email again
                </button>
              )}
              {member.approvalStatus !== "rejected" && (
                <button
                  className="adm-btn adm-btn-secondary adm-btn-danger"
                  onClick={() => setRejecting(true)}
                  disabled={busy}
                >
                  {member.approvalStatus === "approved" ? "Remove access" : "Reject"}
                </button>
              )}
              {member.approvalStatus !== "approved" && (
                <button
                  className="adm-btn adm-btn-approve"
                  onClick={() => decide("approved")}
                  disabled={busy}
                >
                  {busy ? "Approving…" : "✓ Approve & email applicant"}
                </button>
              )}
            </div>
          )}
        </div>

      </aside>
    </div>
  );
}

export default StaffApplicationDrawer;
