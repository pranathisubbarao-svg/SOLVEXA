import { useEffect, useState } from "react";

import {
  PRIORITIES,
  STATUSES,
  formatDateTime,
  initials,
  slug,
  timeAgo,
} from "./adminUtils";

function ReportDrawer({ complaint, staff = [], onClose, onSave, saving }) {
  const currentAssignee = complaint.assignedStaffId?._id || "";

  const [form, setForm] = useState({
    status: complaint.status,
    priority: complaint.priority,
    resolutionDetails: complaint.resolutionDetails || "",
    assignedStaffId: currentAssignee,
  });

  const citizen = complaint.citizenId || {};
  const currentIndex = STATUSES.indexOf(form.status);

  const hasChanges =
    form.status !== complaint.status ||
    form.priority !== complaint.priority ||
    form.resolutionDetails.trim() !== (complaint.resolutionDetails || "") ||
    form.assignedStaffId !== currentAssignee;

  // Assigning moves early reports to "Assigned"; unassigning moves them back
  const handleAssign = (staffId) => {
    let status = form.status;

    if (staffId && ["Submitted", "Under Review"].includes(status)) {
      status = "Assigned";
    }

    if (!staffId && status === "Assigned") {
      status = "Under Review";
    }

    setForm({ ...form, assignedStaffId: staffId, status });
  };

  // Keep the current assignee selectable even if their access changed
  const staffOptions =
    complaint.assignedStaffId &&
    !staff.some((member) => member._id === currentAssignee)
      ? [{ ...complaint.assignedStaffId, assignedOpen: null }, ...staff]
      : staff;

  // Close with the Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(complaint._id, {
      ...form,
      assignedStaffId: form.assignedStaffId || null,
    });
  };

  const { latitude, longitude, address } = complaint.location || {};
  const hasCoordinates = latitude != null && longitude != null;

  return (
    <div className="adm-drawer-backdrop" onClick={onClose}>
      <aside
        className="adm-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Report ${complaint.complaintNumber}`}
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="adm-drawer-head">
          <div>
            <span className="adm-report-number">
              {complaint.complaintNumber}
            </span>
            <h2>{complaint.title}</h2>
            <div className="adm-drawer-tags">
              <span className={`adm-status status-${slug(complaint.status)}`}>
                {complaint.status}
              </span>
              <span className={`adm-priority adm-priority-${slug(complaint.priority)}`}>
                {complaint.priority}
              </span>
              <span className="adm-tag">{complaint.category}</span>
            </div>
          </div>

          <button className="adm-icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="adm-drawer-body">

          {/* Progress Stepper */}
          <section>
            <h4>Progress</h4>
            <ol className="adm-stepper">
              {STATUSES.map((status, index) => (
                <li
                  key={status}
                  className={`${index <= currentIndex ? "done" : ""} ${
                    index === currentIndex ? "current" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, status })}
                    title={`Set status to ${status}`}
                  >
                    <span className="adm-step-dot">
                      {index < currentIndex ? "✓" : index + 1}
                    </span>
                    <span className="adm-step-label">{status}</span>
                  </button>
                </li>
              ))}
            </ol>
          </section>

          {/* Description */}
          <section>
            <h4>Description</h4>
            <p className="adm-drawer-text">{complaint.description}</p>
          </section>

          {/* Details Grid */}
          <section className="adm-detail-grid">
            <div>
              <h4>Citizen</h4>
              <div className="adm-cell-person">
                <span className="adm-avatar">{initials(citizen.name)}</span>
                <span>
                  <strong>{citizen.name || "Unknown"}</strong>
                  {citizen.email && (
                    <a href={`mailto:${citizen.email}`}>{citizen.email}</a>
                  )}
                  {citizen.phone && (
                    <a href={`tel:${citizen.phone}`}>{citizen.phone}</a>
                  )}
                </span>
              </div>
            </div>

            <div>
              <h4>Location</h4>
              <p className="adm-drawer-text">
                📍 {address || "Location not provided"}
              </p>
              {hasCoordinates && (
                <a
                  className="adm-link"
                  href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in Maps →
                </a>
              )}
            </div>

            <div>
              <h4>Assigned to</h4>
              {complaint.assignedStaffId ? (
                <div className="adm-cell-person">
                  <span className="adm-avatar adm-avatar-staff">
                    {initials(complaint.assignedStaffId.name)}
                  </span>
                  <span>
                    <strong>{complaint.assignedStaffId.name}</strong>
                    {complaint.assignedStaffId.phone && (
                      <a href={`tel:${complaint.assignedStaffId.phone}`}>
                        {complaint.assignedStaffId.phone}
                      </a>
                    )}
                  </span>
                </div>
              ) : (
                <p className="adm-drawer-text adm-unassigned-text">
                  Not assigned yet
                </p>
              )}
            </div>

            <div>
              <h4>Submitted</h4>
              <p className="adm-drawer-text">
                {formatDateTime(complaint.createdAt)}
                <small>{timeAgo(complaint.createdAt)}</small>
              </p>
            </div>

            <div>
              <h4>Last updated</h4>
              <p className="adm-drawer-text">
                {formatDateTime(complaint.updatedAt)}
                <small>{timeAgo(complaint.updatedAt)}</small>
              </p>
            </div>
          </section>

          {/* Images */}
          {complaint.images?.length > 0 && (
            <section>
              <h4>Photos</h4>
              <div className="adm-images">
                {complaint.images.map((src) => (
                  <a key={src} href={src} target="_blank" rel="noreferrer">
                    <img src={src} alt="Reported issue" />
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Update Form */}
        <form className="adm-drawer-form" onSubmit={handleSubmit}>
          <h4>Update report</h4>

          <label>
            Assign to staff
            <select
              value={form.assignedStaffId}
              onChange={(e) => handleAssign(e.target.value)}
            >
              <option value="">— Not assigned —</option>
              {staffOptions.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.name}
                  {member.assignedOpen != null
                    ? ` · ${member.assignedOpen} open report${member.assignedOpen === 1 ? "" : "s"}`
                    : ""}
                </option>
              ))}
            </select>
            {staff.length === 0 && (
              <small className="adm-form-hint">
                No approved staff yet — approve staff in the Staff section first.
              </small>
            )}
          </label>

          <div className="adm-form-row">
            <label>
              Status
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Priority
              <div className="adm-segmented">
                {PRIORITIES.map((priority) => (
                  <button
                    type="button"
                    key={priority}
                    className={form.priority === priority ? `active adm-seg-${slug(priority)}` : ""}
                    onClick={() => setForm({ ...form, priority })}
                  >
                    {priority}
                  </button>
                ))}
              </div>
            </label>
          </div>

          <label>
            Note to citizen / resolution details
            <textarea
              rows="3"
              placeholder="Describe the action taken — the citizen sees this on their My Complaints page."
              value={form.resolutionDetails}
              onChange={(e) =>
                setForm({ ...form, resolutionDetails: e.target.value })
              }
            />
          </label>

          <div className="adm-drawer-actions">
            <button type="button" className="adm-btn adm-btn-secondary" onClick={onClose}>
              Close
            </button>
            <button
              type="submit"
              className="adm-btn adm-btn-primary"
              disabled={!hasChanges || saving}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>

      </aside>
    </div>
  );
}

export default ReportDrawer;
