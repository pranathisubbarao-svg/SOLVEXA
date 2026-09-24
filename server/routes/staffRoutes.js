const express = require("express");
const Complaint = require("../models/Complaint");
const { requireStaff } = require("../middleware/auth");

const router = express.Router();

// All staff routes need a logged-in, approved staff member
router.use(requireStaff);

// Staff can move work forward, but only admins close reports
const STAFF_STATUSES = ["Assigned", "In Progress", "Resolved"];

// =====================================
// MY ASSIGNED COMPLAINTS
// =====================================
router.get("/complaints", async (req, res) => {
  try {
    const complaints = await Complaint.find({
      assignedStaffId: req.user._id,
    })
      .populate("citizenId", "name phone")
      .sort({ updatedAt: -1 });

    res.status(200).json({
      complaints,
    });
  } catch (error) {
    console.error("Staff complaints error:", error.message);

    res.status(500).json({
      message: "Server error while fetching your assigned reports",
    });
  }
});

// =====================================
// UPDATE PROGRESS ON AN ASSIGNED COMPLAINT
// =====================================
router.put("/complaints/:id", async (req, res) => {
  try {
    const { status, resolutionDetails } = req.body;

    const complaint = await Complaint.findOne({
      _id: req.params.id,
      assignedStaffId: req.user._id,
    });

    if (!complaint) {
      return res.status(404).json({
        message: "This report is not assigned to you",
      });
    }

    if (complaint.status === "Closed") {
      return res.status(400).json({
        message: "This report has been closed by the admin",
      });
    }

    if (status !== undefined) {
      if (!STAFF_STATUSES.includes(status)) {
        return res.status(400).json({
          message: "Invalid status",
        });
      }

      if (status === "Resolved" && !String(resolutionDetails || complaint.resolutionDetails).trim()) {
        return res.status(400).json({
          message: "Please describe what was done before marking it resolved",
        });
      }

      complaint.status = status;
    }

    if (resolutionDetails !== undefined) {
      complaint.resolutionDetails = String(resolutionDetails).trim();
    }

    await complaint.save();
    await complaint.populate("citizenId", "name phone");

    res.status(200).json({
      message: "Report updated",
      complaint,
    });
  } catch (error) {
    console.error("Staff update error:", error.message);

    res.status(500).json({
      message: "Server error while updating the report",
    });
  }
});

module.exports = router;
