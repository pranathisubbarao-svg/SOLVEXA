import { useState } from "react";

import { formatDate, initials } from "./adminUtils";

function AdminCitizens({ citizens, onViewReports }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");

  const query = search.trim().toLowerCase();

  const rows = citizens
    .filter(
      (citizen) =>
        !query ||
        [citizen.name, citizen.email, citizen.phone].some((value) =>
          value?.toLowerCase().includes(query)
        )
    )
    .sort((a, b) => {
      if (sort === "reports") {
        return b.totalComplaints - a.totalComplaints;
      }

      if (sort === "name") {
        return a.name.localeCompare(b.name);
      }

      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  const activeReporters = citizens.filter((c) => c.totalComplaints > 0).length;

  return (
    <div className="adm-citizens">

      <div className="adm-mini-stats">
        <div>
          <span>Registered citizens</span>
          <strong>{citizens.length}</strong>
        </div>
        <div>
          <span>Have reported issues</span>
          <strong>{activeReporters}</strong>
        </div>
        <div>
          <span>With open reports</span>
          <strong>{citizens.filter((c) => c.openComplaints > 0).length}</strong>
        </div>
      </div>

      <div className="adm-toolbar">
        <div className="adm-search">
          <span>🔍</span>
          <input
            type="text"
            placeholder="Search by name, email or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch("")}>✕</button>}
        </div>

        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Newest members</option>
          <option value="reports">Most reports</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <div className="adm-empty">
          <div>👥</div>
          <h3>No citizens found</h3>
          <p>
            {citizens.length === 0
              ? "No citizens have registered yet."
              : "Try a different search."}
          </p>
        </div>
      ) : (
        <div className="adm-table-card">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Citizen</th>
                <th>Phone</th>
                <th>Joined</th>
                <th>Reports</th>
                <th aria-label="Actions"></th>
              </tr>
            </thead>

            <tbody>
              {rows.map((citizen) => (
                <tr
                  key={citizen._id}
                  className={citizen.totalComplaints ? "" : "adm-row-static"}
                  onClick={() =>
                    citizen.totalComplaints && onViewReports(citizen)
                  }
                >
                  <td>
                    <div className="adm-cell-person">
                      <span className="adm-avatar">{initials(citizen.name)}</span>
                      <span>
                        <strong>{citizen.name}</strong>
                        <small>{citizen.email}</small>
                      </span>
                    </div>
                  </td>

                  <td>{citizen.phone || "—"}</td>

                  <td>{formatDate(citizen.createdAt)}</td>

                  <td>
                    <div className="adm-report-counts">
                      <span className="adm-count-total">
                        {citizen.totalComplaints} total
                      </span>
                      {citizen.openComplaints > 0 && (
                        <span className="adm-count-open">
                          {citizen.openComplaints} open
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="adm-cell-action">
                    {citizen.totalComplaints > 0 ? (
                      <button
                        className="adm-btn adm-btn-ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewReports(citizen);
                        }}
                      >
                        View reports →
                      </button>
                    ) : (
                      <span className="adm-muted">No reports</span>
                    )}
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

export default AdminCitizens;
