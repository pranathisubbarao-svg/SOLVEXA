import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import "../admin.css";

import AdminOverview from "../components/admin/AdminOverview";
import AdminReports from "../components/admin/AdminReports";
import AdminCitizens from "../components/admin/AdminCitizens";
import AdminStaff from "../components/admin/AdminStaff";
import ReportDrawer from "../components/admin/ReportDrawer";
import StaffApplicationDrawer from "../components/admin/StaffApplicationDrawer";
import { API, initials, isOpen } from "../components/admin/adminUtils";

const DEFAULT_FILTERS = {
  search: "",
  status: "All",
  category: "All",
  priority: "All",
  assignee: "All",
  sort: "newest",
};

const SECTIONS = {
  overview: {
    icon: "📊",
    label: "Overview",
    title: "Overview",
    subtitle: "A snapshot of community reports across SOLVEXA",
  },
  reports: {
    icon: "📋",
    label: "Reports",
    title: "Citizen Reports",
    subtitle: "Review, prioritise and update every reported issue",
  },
  staff: {
    icon: "👷",
    label: "Staff",
    title: "Staff",
    subtitle: "Approve staff accounts and balance their workload",
  },
  citizens: {
    icon: "👥",
    label: "Citizens",
    title: "Citizens",
    subtitle: "Everyone who has registered to report issues",
  },
};

function AdminDashboard() {
  const navigate = useNavigate();

  const admin = JSON.parse(localStorage.getItem("adminUser") || "null");
  const token = localStorage.getItem("adminToken");

  const [stats, setStats] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [citizens, setCitizens] = useState([]);
  const [staff, setStaff] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [section, setSection] = useState("overview");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [menuOpen, setMenuOpen] = useState(false);

  const [selectedId, setSelectedId] = useState(null);
  const [reviewStaffId, setReviewStaffId] = useState(null);
  const [emailConfigured, setEmailConfigured] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // =====================================
  // LOGOUT
  // =====================================
  const handleLogout = useCallback(() => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");

    // Always return to the home page after logout
    navigate("/", { replace: true });
  }, [navigate]);

  // =====================================
  // FETCH ADMIN DATA
  // =====================================
  useEffect(() => {
    if (!token) {
      navigate("/admin/login");
      return;
    }

    const fetchData = async () => {
      const headers = { Authorization: `Bearer ${token}` };

      try {
        const [statsResponse, complaintsResponse, citizensResponse, staffResponse, emailResponse] =
          await Promise.all([
            axios.get(`${API}/stats`, { headers }),
            axios.get(`${API}/complaints`, { headers }),
            axios.get(`${API}/citizens`, { headers }),
            axios.get(`${API}/staff`, { headers }),
            axios.get(`${API}/email-status`, { headers }),
          ]);

        setStats(statsResponse.data);
        setComplaints(complaintsResponse.data.complaints);
        setCitizens(citizensResponse.data.citizens);
        setStaff(staffResponse.data.staff);
        setEmailConfigured(emailResponse.data.configured);
        setLastUpdated(new Date());
      } catch (error) {
        console.error("Admin data error:", error);

        if ([401, 403].includes(error.response?.status)) {
          alert(error.response.data.message);
          handleLogout();
        } else {
          setToast({ type: "error", text: "Could not load admin data. Is the server running?" });
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    fetchData();
  }, [token, navigate, handleLogout, refreshKey]);

  // Hide toast after a few seconds
  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const refresh = () => {
    setRefreshing(true);
    setRefreshKey((key) => key + 1);
  };

  // =====================================
  // NAVIGATION
  // =====================================
  const goTo = (nextSection, nextFilters) => {
    setSection(nextSection);
    setMenuOpen(false);

    if (nextFilters) {
      setFilters({ ...DEFAULT_FILTERS, ...nextFilters });
    }
  };

  const viewCitizenReports = (citizen) =>
    goTo("reports", { search: citizen.email });

  // =====================================
  // SAVE REPORT UPDATE
  // =====================================
  const closeDrawer = () => setSelectedId(null);

  const saveReport = async (id, updates) => {
    setSaving(true);

    try {
      const response = await axios.put(`${API}/complaints/${id}`, updates, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Update the row immediately, then refresh stats in the background
      setComplaints((current) =>
        current.map((c) => (c._id === id ? response.data.complaint : c))
      );

      setSelectedId(null);
      const saved = response.data.complaint;

      setToast({
        type: "success",
        text: saved.assignedStaffId
          ? `${saved.complaintNumber} · ${saved.status} · assigned to ${saved.assignedStaffId.name}`
          : `${saved.complaintNumber} updated to "${saved.status}"`,
      });

      refresh();
    } catch (error) {
      console.error("Update report error:", error);

      setToast({
        type: "error",
        text: error.response?.data?.message || "Failed to update report.",
      });
    } finally {
      setSaving(false);
    }
  };

  // =====================================
  // APPROVE / REJECT STAFF
  // =====================================
  const updateStaffApproval = async (member, approvalStatus, reason) => {
    try {
      const response = await axios.put(
        `${API}/staff/${member._id}/approval`,
        { approvalStatus, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setToast({ type: "success", text: response.data.message });
      setReviewStaffId(null);
      refresh();
    } catch (error) {
      console.error("Staff approval error:", error);

      setToast({
        type: "error",
        text: error.response?.data?.message || "Failed to update staff member.",
      });
    }
  };

  const resendDecisionEmail = async (member) => {
    try {
      const response = await axios.post(
        `${API}/staff/${member._id}/notify`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setToast({ type: "success", text: response.data.message });
    } catch (error) {
      console.error("Resend email error:", error);

      setToast({
        type: "error",
        text: error.response?.data?.message || "Could not send the email.",
      });
    }
  };

  const viewStaffReports = (member) =>
    goTo("reports", { assignee: member._id });

  const approvedStaff = staff.filter(
    (member) => member.approvalStatus === "approved" && member.isActive !== false
  );
  const pendingStaffCount = staff.filter(
    (member) => member.approvalStatus === "pending"
  ).length;

  const selectedComplaint = complaints.find((c) => c._id === selectedId);
  const reviewedStaff = staff.find((member) => member._id === reviewStaffId);
  const openCount = complaints.filter(isOpen).length;
  const current = SECTIONS[section];

  return (
    <div className="adm-shell">

      {/* =====================================
          SIDEBAR
      ===================================== */}

      <aside className={`adm-sidebar ${menuOpen ? "open" : ""}`}>
        <div className="adm-brand">
          <span className="adm-brand-mark">S</span>
          <span>
            <strong>SOLVEXA</strong>
            <small>Admin Console</small>
          </span>
        </div>

        <div className="adm-menu" role="navigation">
          <span className="adm-menu-heading">Menu</span>

          {Object.entries(SECTIONS).map(([key, item]) => (
            <button
              key={key}
              className={section === key ? "active" : ""}
              onClick={() => goTo(key, key === "reports" ? DEFAULT_FILTERS : null)}
            >
              <span className="adm-menu-icon">{item.icon}</span>
              {item.label}
              {key === "reports" && openCount > 0 && (
                <span className="adm-menu-badge">{openCount}</span>
              )}
              {key === "staff" && pendingStaffCount > 0 && (
                <span className="adm-menu-badge adm-menu-badge-alert">
                  {pendingStaffCount}
                </span>
              )}
            </button>
          ))}

          <span className="adm-menu-heading">Quick links</span>

          <button onClick={() => goTo("reports", { status: "Open", priority: "Urgent" })}>
            <span className="adm-menu-icon">🚨</span>
            Urgent open
          </button>

          <button onClick={() => navigate("/")}>
            <span className="adm-menu-icon">🌐</span>
            Public site
          </button>
        </div>

        <div className="adm-profile">
          <span className="adm-avatar adm-avatar-light">
            {initials(admin?.name)}
          </span>
          <span className="adm-profile-text">
            <strong>{admin?.name || "Admin"}</strong>
            <small>{admin?.email}</small>
          </span>
          <button
            className="adm-icon-btn adm-logout"
            onClick={handleLogout}
            title="Logout"
            aria-label="Logout"
          >
            ⎋
          </button>
        </div>
      </aside>

      {menuOpen && (
        <div className="adm-sidebar-backdrop" onClick={() => setMenuOpen(false)} />
      )}


      {/* =====================================
          MAIN AREA
      ===================================== */}

      <div className="adm-main">
        <header className="adm-topbar">
          <button
            className="adm-icon-btn adm-menu-toggle"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>

          <div className="adm-topbar-title">
            <h1>{current.title}</h1>
            <p>{current.subtitle}</p>
          </div>

          <div className="adm-topbar-actions">
            {lastUpdated && (
              <span className="adm-updated">
                Updated {lastUpdated.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}

            <button
              className="adm-btn adm-btn-secondary"
              onClick={refresh}
              disabled={refreshing}
            >
              <span className={refreshing ? "adm-spin" : ""}>↻</span>
              {refreshing ? "Refreshing" : "Refresh"}
            </button>

            <button className="adm-btn adm-btn-dark" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <div className="adm-content">
          {loading ? (
            <div className="adm-skeleton">
              <div className="adm-skeleton-row">
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} />
                ))}
              </div>
              <div className="adm-skeleton-block" />
              <div className="adm-skeleton-block short" />
            </div>
          ) : (
            <>
              {section === "overview" && (
                <AdminOverview
                  stats={stats}
                  complaints={complaints}
                  citizens={citizens}
                  onOpenReport={(c) => setSelectedId(c._id)}
                  onGoTo={goTo}
                />
              )}

              {section === "reports" && (
                <AdminReports
                  complaints={complaints}
                  staff={staff}
                  filters={filters}
                  setFilters={setFilters}
                  onOpenReport={(c) => setSelectedId(c._id)}
                />
              )}

              {section === "staff" && (
                <AdminStaff
                  staff={staff}
                  token={token}
                  emailConfigured={emailConfigured}
                  onReview={(member) => setReviewStaffId(member._id)}
                  onViewReports={viewStaffReports}
                />
              )}

              {section === "citizens" && (
                <AdminCitizens
                  citizens={citizens}
                  onViewReports={viewCitizenReports}
                />
              )}
            </>
          )}
        </div>
      </div>


      {/* =====================================
          REPORT DRAWER + TOAST
      ===================================== */}

      {selectedComplaint && (
        <ReportDrawer
          key={selectedComplaint._id}
          complaint={selectedComplaint}
          staff={approvedStaff}
          onClose={closeDrawer}
          onSave={saveReport}
          saving={saving}
        />
      )}

      {reviewedStaff && (
        <StaffApplicationDrawer
          key={reviewedStaff._id}
          member={reviewedStaff}
          token={token}
          emailConfigured={emailConfigured}
          onClose={() => setReviewStaffId(null)}
          onDecision={updateStaffApproval}
          onResendEmail={resendDecisionEmail}
        />
      )}

      {toast && (
        <div className={`adm-toast adm-toast-${toast.type}`} role="status">
          <span>{toast.type === "success" ? "✓" : "!"}</span>
          {toast.text}
        </div>
      )}

    </div>
  );
}

export default AdminDashboard;
