import { API_URL } from "../config";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function MyComplaints() {
  const navigate = useNavigate();

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const statuses = [
    "Submitted",
    "Under Review",
    "Assigned",
    "In Progress",
    "Resolved",
    "Closed",
  ];

  // =====================================
  // GET LOGGED-IN USER
  // =====================================
  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  };

  // =====================================
  // FETCH COMPLAINTS
  // =====================================
  useEffect(() => {
    const fetchComplaints = async () => {
      const user = getUser();

      if (!user?.id) {
        setError("Please login to view your complaints.");
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(
          `${API_URL}/api/complaints/citizen/${user.id}`
        );

        setComplaints(response.data.complaints || []);
      } catch (error) {
        console.error("Fetch complaints error:", error);

        setError(
          error.response?.data?.message ||
            "Unable to load your complaints."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchComplaints();
  }, []);

  // =====================================
  // STATUS INDEX
  // =====================================
  const getStatusIndex = (status) => {
    const index = statuses.indexOf(status);

    return index === -1 ? 0 : index;
  };

  // =====================================
  // FORMAT DATE
  // =====================================
  const formatDate = (date) => {
    if (!date) {
      return "Not available";
    }

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // =====================================
  // PRIORITY CLASS
  // =====================================
  const getPriorityClass = (priority) => {
    return `priority-${(priority || "Medium").toLowerCase()}`;
  };

  // =====================================
  // STATUS CLASS
  // =====================================
  const getStatusClass = (status) => {
    return `status-${(status || "Submitted")
      .toLowerCase()
      .replace(/\s+/g, "-")}`;
  };

  return (
    <div className="complaints-page">

      {/* =====================================
          HEADER
      ===================================== */}

      <div className="complaints-header">

        <div>
          <p className="complaints-label">
            COMPLAINT TRACKING
          </p>

          <h1>
            My Complaints
          </h1>

          <p>
            Track the progress of your submitted
            community issues.
          </p>
        </div>

        <div className="complaints-header-buttons">

          <button
            className="back-button"
            onClick={() => navigate("/dashboard")}
          >
            ← Dashboard
          </button>

          <button
            className="new-complaint-button"
            onClick={() => navigate("/report")}
          >
            + Report Issue
          </button>

        </div>

      </div>


      {/* =====================================
          LOADING
      ===================================== */}

      {loading && (
        <div className="complaints-message">

          <div className="message-icon">
            ⏳
          </div>

          <h2>
            Loading Complaints...
          </h2>

          <p>
            Please wait while we fetch your complaints.
          </p>

        </div>
      )}


      {/* =====================================
          ERROR
      ===================================== */}

      {!loading && error && (
        <div className="complaints-message error-message">

          <div className="message-icon">
            ⚠️
          </div>

          <h2>
            Unable to Load Complaints
          </h2>

          <p>
            {error}
          </p>

          <button
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>

        </div>
      )}


      {/* =====================================
          EMPTY STATE
      ===================================== */}

      {!loading &&
        !error &&
        complaints.length === 0 && (
          <div className="complaints-message">

            <div className="message-icon">
              📋
            </div>

            <h2>
              No Complaints Yet
            </h2>

            <p>
              You haven't submitted any community
              issues yet.
            </p>

            <button
              onClick={() => navigate("/report")}
            >
              Report Your First Issue
            </button>

          </div>
        )}


      {/* =====================================
          COMPLAINT LIST
      ===================================== */}

      {!loading &&
        !error &&
        complaints.length > 0 && (

          <div className="complaints-container">

            {/* Summary */}

            <div className="complaints-summary">

              <div>
                <span>
                  Total Complaints
                </span>

                <strong>
                  {complaints.length}
                </strong>
              </div>

              <div>
                <span>
                  Active
                </span>

                <strong>
                  {
                    complaints.filter(
                      (complaint) =>
                        complaint.status !== "Resolved" &&
                        complaint.status !== "Closed"
                    ).length
                  }
                </strong>
              </div>

              <div>
                <span>
                  Resolved
                </span>

                <strong>
                  {
                    complaints.filter(
                      (complaint) =>
                        complaint.status === "Resolved" ||
                        complaint.status === "Closed"
                    ).length
                  }
                </strong>
              </div>

            </div>


            {/* Individual Complaints */}

            {complaints.map((complaint) => {

              const currentStatusIndex =
                getStatusIndex(complaint.status);

              return (
                <div
                  className="complaint-detail-card"
                  key={complaint._id}
                >

                  {/* Complaint Header */}

                  <div className="complaint-detail-header">

                    <div>

                      <span className="detail-complaint-number">
                        {complaint.complaintNumber}
                      </span>

                      <h2>
                        {complaint.title}
                      </h2>

                    </div>

                    <span
                      className={`detail-status ${getStatusClass(
                        complaint.status
                      )}`}
                    >
                      {complaint.status}
                    </span>

                  </div>


                  {/* Complaint Information */}

                  <div className="complaint-information">

                    <div className="information-item">

                      <span>
                        Category
                      </span>

                      <strong>
                        {complaint.category}
                      </strong>

                    </div>


                    <div className="information-item">

                      <span>
                        Priority
                      </span>

                      <strong
                        className={getPriorityClass(
                          complaint.priority
                        )}
                      >
                        {complaint.priority}
                      </strong>

                    </div>


                    <div className="information-item">

                      <span>
                        Submitted On
                      </span>

                      <strong>
                        {formatDate(
                          complaint.createdAt
                        )}
                      </strong>

                    </div>


                    <div className="information-item">

                      <span>
                        Handled by
                      </span>

                      <strong>
                        {complaint.assignedStaffId?.name
                          ? `👷 ${complaint.assignedStaffId.name}`
                          : "Not assigned yet"}
                      </strong>

                    </div>


                    <div className="information-item">

                      <span>
                        Location
                      </span>

                      <strong>
                        {complaint.location?.address ||
                          "Location not provided"}
                      </strong>

                    </div>

                  </div>


                  {/* Description */}

                  <div className="complaint-description">

                    <h3>
                      Issue Description
                    </h3>

                    <p>
                      {complaint.description}
                    </p>

                  </div>


                  {/* Progress */}

                  <div className="status-timeline-section">

                    <h3>
                      Complaint Progress
                    </h3>

                    <div className="status-timeline">

                      {statuses.map(
                        (status, index) => {

                          const completed =
                            index <= currentStatusIndex;

                          const current =
                            index === currentStatusIndex;

                          return (
                            <div
                              className={`timeline-item ${
                                completed
                                  ? "completed"
                                  : ""
                              } ${
                                current
                                  ? "current"
                                  : ""
                              }`}
                              key={status}
                            >

                              <div className="timeline-marker">
                                {completed
                                  ? "✓"
                                  : index + 1}
                              </div>

                              <div className="timeline-content">

                                <strong>
                                  {status}
                                </strong>

                                {current && (
                                  <span>
                                    Current Status
                                  </span>
                                )}

                              </div>

                              {index <
                                statuses.length - 1 && (
                                <div
                                  className={`timeline-line ${
                                    index <
                                    currentStatusIndex
                                      ? "completed-line"
                                      : ""
                                  }`}
                                />
                              )}

                            </div>
                          );
                        }
                      )}

                    </div>

                  </div>


                  {/* Resolution Details */}

                  {complaint.resolutionDetails && (
                    <div className="resolution-section">

                      <h3>
                        Resolution Details
                      </h3>

                      <p>
                        {complaint.resolutionDetails}
                      </p>

                    </div>
                  )}

                </div>
              );
            })}

          </div>
        )}

    </div>
  );
}

export default MyComplaints;