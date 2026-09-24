import { useState } from "react";

import { formatDate, timeAgo } from "./adminUtils";
import { StaffPhoto } from "./StaffApplicationDrawer";

const APPROVAL_LABELS = {
  approved: "Approved",
  pending: "Pending review",
  rejected: "Rejected",
};

function AdminStaff({ staff, token, emailConfigured, onReview, onViewReports }) {
  const [search, setSearch] = useState("");
  const [view, setView] = useState("team");

  const pending = staff.filter((member) => member.approvalStatus === "pending");
  const approved = staff.filter((member) => member.approvalStatus === "approved");
  const rejected = staff.filter((member) => member.approvalStatus === "rejected");

  const query = search.trim().toLowerCase();

  const rows = (view === "team" ? approved : rejected)
    .filter(
      (member) =>
        !query ||
        [member.name, member.email, member.phone, member.staffProfile?.preferredDepartment]
          .some((value) => value?.toLowerCase().includes(query))
    )
    .sort((a, b) => b.assignedOpen - a.assignedOpen);

  const maxLoad = Math.max(1, ...approved.map((member) => member.assignedOpen));

  return (
    <div className="adm-citizens">

      {!emailConfigured && (
        <div className="adm-email-banner">
          📧 <strong>Emails are off.</strong> Approve / reject still works, but
          applicants won't be emailed until SMTP is set up in <code>server/.env</code>.
        </div>
      )}

      <div className="adm-mini-stats">
        <div>
          <span>Active staff</span>
          <strong>{approved.length}</strong>
        </div>
        <div>
          <span>New applications</span>
          <strong className={pending.length ? "adm-text-alert" : ""}>
            {pending.length}
          </strong>
        </div>
        <div>
          <span>Open reports assigned</span>
          <strong>
            {approved.reduce((sum, member) => sum + member.assignedOpen, 0)}
          </strong>
        </div>
      </div>

      {/* New applications */}
      <section className="adm-panel adm-pending-panel">
        <div className="adm-panel-head">
          <div>
            <h3>📥 New staff applications</h3>
            <p>
              Review each applicant's details and documents before approving.
              Approved staff can see citizens' names and phone numbers on
              assigned reports.
            </p>
          </div>
        </div>

        {pending.length === 0 ? (
          <div className="adm-empty-small">
            No new applications. Applicants apply from the “Staff” card on the
            Register page.
          </div>
        ) : (
          <div className="adm-pending-list">
            {pending.map((member) => {
              const profile = member.staffProfile;

              return (
                <div className="adm-pending-card" key={member._id}>
                  <div className="adm-cell-person">
                    <StaffPhoto member={member} token={token} size={52} />
                    <span>
                      <strong>{member.name}</strong>
                      <small>
                        {profile?.preferredDepartment || "No department"} ·{" "}
                        {profile?.qualification || "No details"}
                        {profile?.experienceYears != null &&
                          ` · ${profile.experienceYears} yr exp`}
                      </small>
                      <small>
                        {profile?.city ? `${profile.city} · ` : ""}applied{" "}
                        {timeAgo(profile?.appliedAt || member.createdAt)}
                      </small>
                    </span>
                  </div>

                  <button
                    className="adm-btn adm-btn-primary"
                    onClick={() => onReview(member)}
                  >
                    Review application →
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Team / rejected */}
      <div className="adm-toolbar">
        <div className="adm-status-tabs adm-staff-tabs">
          <button
            className={view === "team" ? "active" : ""}
            onClick={() => setView("team")}
          >
            Staff team <span>{approved.length}</span>
          </button>
          <button
            className={view === "rejected" ? "active" : ""}
            onClick={() => setView("rejected")}
          >
            Rejected <span>{rejected.length}</span>
          </button>
        </div>

        <div className="adm-search">
          <span>🔍</span>
          <input
            type="text"
            placeholder="Search by name, email, phone or department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch("")}>✕</button>}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="adm-empty">
          <div>{view === "team" ? "👷" : "🗂️"}</div>
          <h3>
            {view === "team"
              ? query ? "No staff found" : "No approved staff yet"
              : "No rejected applications"}
          </h3>
          <p>
            {view === "team"
              ? query
                ? "Try a different search."
                : "Approve applications above to build your team."
              : "Applications you reject will be listed here."}
          </p>
        </div>
      ) : (
        <div className="adm-table-card">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Staff member</th>
                <th>Department</th>
                <th>Access</th>
                {view === "team" && <th>Workload (open)</th>}
                {view === "team" && <th>Completed</th>}
                <th>{view === "team" ? "Joined" : "Reviewed"}</th>
                <th aria-label="Actions"></th>
              </tr>
            </thead>

            <tbody>
              {rows.map((member) => (
                <tr key={member._id} onClick={() => onReview(member)}>
                  <td>
                    <div className="adm-cell-person">
                      <StaffPhoto member={member} token={token} size={36} />
                      <span>
                        <strong>{member.name}</strong>
                        <small>{member.phone || member.email}</small>
                      </span>
                    </div>
                  </td>

                  <td>{member.staffProfile?.preferredDepartment || "—"}</td>

                  <td>
                    <span className={`adm-approval adm-approval-${member.approvalStatus}`}>
                      {APPROVAL_LABELS[member.approvalStatus]}
                    </span>
                  </td>

                  {view === "team" && (
                    <td>
                      <div className="adm-workload">
                        <span className="adm-workload-track">
                          <span
                            style={{ width: `${(member.assignedOpen / maxLoad) * 100}%` }}
                          />
                        </span>
                        <strong>{member.assignedOpen}</strong>
                      </div>
                    </td>
                  )}

                  {view === "team" && <td>{member.assignedDone}</td>}

                  <td>
                    {formatDate(
                      view === "team"
                        ? member.createdAt
                        : member.staffProfile?.reviewedAt || member.createdAt
                    )}
                  </td>

                  <td className="adm-cell-action" onClick={(e) => e.stopPropagation()}>
                    {view === "team" && member.assignedTotal > 0 && (
                      <button
                        className="adm-btn adm-btn-ghost"
                        onClick={() => onViewReports(member)}
                      >
                        Reports →
                      </button>
                    )}
                    <button
                      className="adm-btn adm-btn-ghost"
                      onClick={() => onReview(member)}
                    >
                      Application
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}

export default AdminStaff;
