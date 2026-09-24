import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Dashboard() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    resolved: 0,
    closed: 0,
  });

  const [complaints, setComplaints] = useState([]);

  const [loading, setLoading] = useState(true);

  // =====================================
  // FETCH DASHBOARD DATA
  // =====================================
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const statsResponse = await axios.get(
          `http://localhost:5000/api/complaints/stats/${user.id}`
        );

        const complaintsResponse = await axios.get(
          `http://localhost:5000/api/complaints/citizen/${user.id}`
        );

        setStats(statsResponse.data);

        setComplaints(
          complaintsResponse.data.complaints
        );
      } catch (error) {
        console.error(
          "Dashboard data error:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.id]);


  // =====================================
  // LOGOUT
  // =====================================
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // Always return to the home page after logout
    navigate("/", { replace: true });
  };


  return (
    <div className="dashboard-page">

      {/* =====================================
          DASHBOARD HEADER
      ===================================== */}

      <div className="dashboard-header">

        <div>

          <p className="dashboard-welcome">
            WELCOME BACK
          </p>

          <h1>
            Hello, {user?.name || "Citizen"} 👋
          </h1>

          <p className="dashboard-subtitle">
            Manage your community complaints and track
            their progress.
          </p>

        </div>

        <button
          className="logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>

      </div>


      {/* =====================================
          STATISTICS
      ===================================== */}

      <div className="dashboard-stats">

        {/* Total */}
        <div className="stat-card">

          <div className="stat-icon">
            📋
          </div>

          <div>

            <h2>
              {loading ? "..." : stats.total}
            </h2>

            <p>
              Total Complaints
            </p>

          </div>

        </div>


        {/* Pending */}
        <div className="stat-card">

          <div className="stat-icon">
            ⏳
          </div>

          <div>

            <h2>
              {loading ? "..." : stats.pending}
            </h2>

            <p>
              Pending Complaints
            </p>

          </div>

        </div>


        {/* Resolved */}
        <div className="stat-card">

          <div className="stat-icon">
            ✅
          </div>

          <div>

            <h2>
              {loading ? "..." : stats.resolved}
            </h2>

            <p>
              Resolved Complaints
            </p>

          </div>

        </div>


        {/* Closed */}
        <div className="stat-card">

          <div className="stat-icon">
            🔒
          </div>

          <div>

            <h2>
              {loading ? "..." : stats.closed}
            </h2>

            <p>
              Closed Complaints
            </p>

          </div>

        </div>

      </div>


      {/* =====================================
          QUICK ACTIONS
      ===================================== */}

      <section className="dashboard-section">

        <div className="section-heading">

          <h2>
            Quick Actions
          </h2>

          <p>
            What would you like to do today?
          </p>

        </div>


        <div className="dashboard-actions">

          {/* Report */}
          <div className="action-card">

            <div className="action-icon">
              📝
            </div>

            <h3>
              Report an Issue
            </h3>

            <p>
              Report a community problem with details,
              images, and location.
            </p>

            <button
              onClick={() => navigate("/report")}
            >
              Report Issue →
            </button>

          </div>


          {/* Track */}
          <div className="action-card">

            <div className="action-icon">
              📍
            </div>

            <h3>
              Track Complaints
            </h3>

            <p>
              View your complaints and check their
              current progress.
            </p>

            <button
              onClick={() => navigate("/complaints")}
            >
              View Complaints →
            </button>

          </div>


          {/* Notifications */}
          <div className="action-card">

            <div className="action-icon">
              🔔
            </div>

            <h3>
              Notifications
            </h3>

            <p>
              Stay updated about complaint progress
              and important announcements.
            </p>

            <button
              onClick={() =>
                alert(
                  "Notifications feature coming soon!"
                )
              }
            >
              View Notifications →
            </button>

          </div>

        </div>

      </section>


      {/* =====================================
          RECENT COMPLAINTS
      ===================================== */}

      <section
        className="recent-section"
        id="recent-complaints"
      >

        <div className="section-heading">

          <h2>
            Recent Complaints
          </h2>

          <p>
            Your latest submitted complaints.
          </p>

        </div>


        {loading ? (

          <div className="empty-complaints">

            <div className="empty-icon">
              ⏳
            </div>

            <h3>
              Loading Complaints...
            </h3>

            <p>
              Please wait while we load your complaints.
            </p>

          </div>

        ) : complaints.length === 0 ? (

          <div className="empty-complaints">

            <div className="empty-icon">
              📋
            </div>

            <h3>
              No Complaints Yet
            </h3>

            <p>
              You haven't reported any community
              issues yet.
            </p>

            <button
              onClick={() => navigate("/report")}
            >
              Report Your First Issue
            </button>

          </div>

        ) : (

          <div className="complaints-list">

            {complaints.slice(0, 5).map((complaint) => (

              <div
                className="complaint-card"
                key={complaint._id}
              >

                <div className="complaint-main">

                  <div>

                    <span className="complaint-number">
                      {complaint.complaintNumber}
                    </span>

                    <h3>
                      {complaint.title}
                    </h3>

                    <p>
                      {complaint.description}
                    </p>

                  </div>

                  <div className="complaint-meta">

                    <span className="complaint-category">
                      {complaint.category}
                    </span>

                    <span
                      className={`complaint-status status-${complaint.status
                        .toLowerCase()
                        .replace(/\s+/g, "-")}`}
                    >
                      {complaint.status}
                    </span>

                  </div>

                </div>

              </div>

            ))}

          </div>

        )}

      </section>

    </div>
  );
}

export default Dashboard;