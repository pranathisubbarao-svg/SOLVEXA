import { API_URL } from "../config";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

function ReportIssue() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));

  // Category can be pre-selected from the home page
  const location = useLocation();

  const [formData, setFormData] = useState({
    title: "",
    category: location.state?.category || "",
    priority: "Medium",
    description: "",
    address: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user?.id) {
      alert("Please login before submitting a complaint.");
      navigate("/login");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/complaints`,
        {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          priority: formData.priority,
          citizenId: user.id,
          location: {
            address: formData.address,
            latitude: null,
            longitude: null,
          },
        }
      );

      alert(
        `Complaint submitted successfully!\n\nComplaint Number: ${response.data.complaint.complaintNumber}`
      );

      navigate("/dashboard");
    } catch (error) {
      console.error("Complaint submission error:", error);

      alert(
        error.response?.data?.message ||
          "Failed to submit complaint. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="report-page">

      <div className="report-header">
        <p className="report-label">COMMUNITY SERVICE</p>

        <h1>Report an Issue</h1>

        <p>
          Help improve your community by reporting a problem
          that needs attention.
        </p>
      </div>

      <div className="report-card">

        <form onSubmit={handleSubmit}>

          {/* Issue Title */}
          <div className="form-group">
            <label>Issue Title</label>

            <input
              type="text"
              name="title"
              placeholder="Example: Large pothole near main road"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>

          {/* Category */}
          <div className="form-group">
            <label>Category</label>

            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
            >
              <option value="">Select a category</option>
              <option value="Roads & Potholes">
                Roads & Potholes
              </option>
              <option value="Street Lights">
                Street Lights
              </option>
              <option value="Water Supply">
                Water Supply
              </option>
              <option value="Garbage & Waste">
                Garbage & Waste
              </option>
              <option value="Drainage">
                Drainage
              </option>
              <option value="Public Safety">
                Public Safety
              </option>
              <option value="Parks & Public Spaces">
                Parks & Public Spaces
              </option>
              <option value="Other">
                Other
              </option>
            </select>
          </div>

          {/* Priority */}
          <div className="form-group">
            <label>Priority</label>

            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          {/* Description */}
          <div className="form-group">
            <label>Issue Description</label>

            <textarea
              name="description"
              placeholder="Describe the problem in detail..."
              value={formData.description}
              onChange={handleChange}
              rows="6"
              required
            />
          </div>

          {/* Location */}
          <div className="form-group">
            <label>Location</label>

            <input
              type="text"
              name="address"
              placeholder="Enter the location of the issue"
              value={formData.address}
              onChange={handleChange}
              required
            />
          </div>

          {/* Buttons */}
          <div className="report-buttons">

            <button
              type="button"
              className="cancel-button"
              onClick={() => navigate("/dashboard")}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="submit-complaint-button"
              disabled={loading}
            >
              {loading
                ? "Submitting..."
                : "Submit Complaint"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}

export default ReportIssue;