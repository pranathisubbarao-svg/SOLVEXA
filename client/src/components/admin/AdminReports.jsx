import {
  PRIORITIES,
  STATUSES,
  formatDate,
  initials,
  isOpen,
  slug,
  timeAgo,
} from "./adminUtils";

const PRIORITY_RANK = { Urgent: 0, High: 1, Medium: 2, Low: 3 };

function AdminReports({ complaints, staff = [], filters, setFilters, onOpenReport }) {
  const updateFilter = (key, value) =>
    setFilters((current) => ({ ...current, [key]: value }));

  const categories = [...new Set(complaints.map((c) => c.category))].sort();

  // =====================================
  // STATUS TABS WITH COUNTS
  // =====================================
  const statusTabs = [
    { key: "All", count: complaints.length },
    { key: "Open", count: complaints.filter(isOpen).length },
    ...STATUSES.map((status) => ({
      key: status,
      count: complaints.filter((c) => c.status === status).length,
    })),
  ];

  // =====================================
  // FILTER + SORT
  // =====================================
  const query = filters.search.trim().toLowerCase();

  const rows = complaints
    .filter((complaint) => {
      const citizen = complaint.citizenId || {};

      const matchesSearch =
        !query ||
        [
          complaint.complaintNumber,
          complaint.title,
          complaint.description,
          complaint.location?.address,
          complaint.assignedStaffId?.name,
          citizen.name,
          citizen.email,
          citizen.phone,
        ].some((value) => value?.toLowerCase().includes(query));

      const matchesStatus =
        filters.status === "All" ||
        (filters.status === "Open"
          ? isOpen(complaint)
          : complaint.status === filters.status);

      const matchesCategory =
        filters.category === "All" || complaint.category === filters.category;

      const matchesPriority =
        filters.priority === "All" || complaint.priority === filters.priority;

      const assigneeId = complaint.assignedStaffId?._id || null;
      const matchesAssignee =
        filters.assignee === "All" ||
        (filters.assignee === "unassigned"
          ? !assigneeId
          : assigneeId === filters.assignee);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCategory &&
        matchesPriority &&
        matchesAssignee
      );
    })
    .sort((a, b) => {
      if (filters.sort === "oldest") {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }

      if (filters.sort === "priority") {
        return (
          PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
          new Date(b.createdAt) - new Date(a.createdAt)
        );
      }

      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  const hasFilters =
    query ||
    filters.status !== "All" ||
    filters.category !== "All" ||
    filters.priority !== "All" ||
    filters.assignee !== "All";

  const clearFilters = () =>
    setFilters({
      search: "",
      status: "All",
      category: "All",
      priority: "All",
      assignee: "All",
      sort: filters.sort,
    });

  return (
    <div className="adm-reports">

      {/* Status Tabs */}
      <div className="adm-status-tabs">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            className={filters.status === tab.key ? "active" : ""}
            onClick={() => updateFilter("status", tab.key)}
          >
            {tab.key}
            <span>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="adm-toolbar">
        <div className="adm-search">
          <span>🔍</span>
          <input
            type="text"
            placeholder="Search number, title, citizen, phone or location…"
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
          />
          {filters.search && (
            <button onClick={() => updateFilter("search", "")}>✕</button>
          )}
        </div>

        <select
          value={filters.category}
          onChange={(e) => updateFilter("category", e.target.value)}
        >
          <option value="All">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <select
          value={filters.priority}
          onChange={(e) => updateFilter("priority", e.target.value)}
        >
          <option value="All">All priorities</option>
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>

        <select
          value={filters.assignee}
          onChange={(e) => updateFilter("assignee", e.target.value)}
        >
          <option value="All">Anyone assigned</option>
          <option value="unassigned">Unassigned</option>
          {staff
            .filter((member) => member.approvalStatus !== "pending")
            .map((member) => (
              <option key={member._id} value={member._id}>
                {member.name}
              </option>
            ))}
        </select>

        <select
          value={filters.sort}
          onChange={(e) => updateFilter("sort", e.target.value)}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="priority">Highest priority</option>
        </select>
      </div>

      <div className="adm-result-line">
        <span>
          Showing <strong>{rows.length}</strong> of {complaints.length} reports
        </span>

        {hasFilters && (
          <button className="adm-link" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="adm-empty">
          <div>📭</div>
          <h3>No reports found</h3>
          <p>
            {complaints.length === 0
              ? "Citizens haven't submitted any reports yet."
              : "Try changing the search or filters."}
          </p>
          {hasFilters && (
            <button className="adm-btn adm-btn-secondary" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="adm-table-card">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Report</th>
                <th>Citizen</th>
                <th>Assigned to</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Submitted</th>
                <th aria-label="Actions"></th>
              </tr>
            </thead>

            <tbody>
              {rows.map((complaint) => {
                const citizen = complaint.citizenId || {};

                return (
                  <tr
                    key={complaint._id}
                    onClick={() => onOpenReport(complaint)}
                  >
                    <td>
                      <div className="adm-cell-report">
                        <span className="adm-report-number">
                          {complaint.complaintNumber}
                        </span>
                        <strong>{complaint.title}</strong>
                        <small>
                          {complaint.category}
                          {complaint.location?.address
                            ? ` · 📍 ${complaint.location.address}`
                            : ""}
                        </small>
                      </div>
                    </td>

                    <td>
                      <div className="adm-cell-person">
                        <span className="adm-avatar">
                          {initials(citizen.name)}
                        </span>
                        <span>
                          <strong>{citizen.name || "Unknown"}</strong>
                          <small>{citizen.phone || citizen.email}</small>
                        </span>
                      </div>
                    </td>

                    <td>
                      {complaint.assignedStaffId ? (
                        <div className="adm-cell-person adm-cell-staff">
                          <span className="adm-avatar adm-avatar-staff">
                            {initials(complaint.assignedStaffId.name)}
                          </span>
                          <span>
                            <strong>{complaint.assignedStaffId.name}</strong>
                            <small>Staff</small>
                          </span>
                        </div>
                      ) : isOpen(complaint) ? (
                        <span className="adm-unassigned">Unassigned</span>
                      ) : (
                        <span className="adm-muted">—</span>
                      )}
                    </td>

                    <td>
                      <span className={`adm-priority adm-priority-${slug(complaint.priority)}`}>
                        {complaint.priority}
                      </span>
                    </td>

                    <td>
                      <span className={`adm-status status-${slug(complaint.status)}`}>
                        {complaint.status}
                      </span>
                    </td>

                    <td>
                      <div className="adm-cell-date">
                        <span>{formatDate(complaint.createdAt)}</span>
                        <small>{timeAgo(complaint.createdAt)}</small>
                      </div>
                    </td>

                    <td className="adm-cell-action">
                      <button
                        className="adm-btn adm-btn-ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenReport(complaint);
                        }}
                      >
                        Review →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}

export default AdminReports;
