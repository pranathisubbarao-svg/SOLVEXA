const express = require("express");
const Complaint = require("../models/Complaint");
const User = require("../models/User");

const router = express.Router();

// =====================================
// CREATE A NEW COMPLAINT
// =====================================
router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      citizenId,
      priority,
      location,
    } = req.body;

    if (!title || !description || !category || !citizenId) {
      return res.status(400).json({
        message: "Please fill all required fields",
      });
    }

    const count = await Complaint.countDocuments();

    const complaintNumber =
      `SOL-${new Date().getFullYear()}-` +
      String(count + 1).padStart(4, "0");

    const complaint = await Complaint.create({
      complaintNumber,
      title,
      description,
      category,
      citizenId,
      priority: priority || "Medium",
      location: location || {},
    });

    res.status(201).json({
      message: "Complaint submitted successfully",
      complaint,
    });
  } catch (error) {
    console.error("Create complaint error:", error.message);

    res.status(500).json({
      message: "Server error while creating complaint",
    });
  }
});


// =====================================
// GET ALL COMPLAINTS OF A CITIZEN
// =====================================
router.get("/citizen/:citizenId", async (req, res) => {
  try {
    const complaints = await Complaint.find({
      citizenId: req.params.citizenId,
    })
      // Citizens see who is handling their report (name only)
      .populate("assignedStaffId", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      complaints,
    });
  } catch (error) {
    console.error("Get complaints error:", error.message);

    res.status(500).json({
      message: "Server error while fetching complaints",
    });
  }
});


// =====================================
// GET COMPLAINT STATISTICS OF A CITIZEN
// =====================================
router.get("/stats/:citizenId", async (req, res) => {
  try {
    const complaints = await Complaint.find({
      citizenId: req.params.citizenId,
    });

    const total = complaints.length;

    const pending = complaints.filter(
      (complaint) =>
        complaint.status !== "Resolved" &&
        complaint.status !== "Closed"
    ).length;

    const resolved = complaints.filter(
      (complaint) => complaint.status === "Resolved"
    ).length;

    const closed = complaints.filter(
      (complaint) => complaint.status === "Closed"
    ).length;

    res.status(200).json({
      total,
      pending,
      resolved,
      closed,
    });
  } catch (error) {
    console.error("Get complaint stats error:", error.message);

    res.status(500).json({
      message: "Server error while fetching complaint statistics",
    });
  }
});


// =====================================
// PUBLIC SUMMARY (HOME PAGE)
// Anonymous totals only - no names, titles or addresses
// =====================================
router.get("/public/summary", async (req, res) => {
  try {
    const CLOSED = ["Resolved", "Closed"];

    const [total, resolved, citizens, categories, resolvedTimes, recent] =
      await Promise.all([
        Complaint.countDocuments(),
        Complaint.countDocuments({ status: { $in: CLOSED } }),
        User.countDocuments({ role: "citizen" }),
        Complaint.aggregate([
          { $group: { _id: "$category", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        Complaint.aggregate([
          { $match: { status: { $in: CLOSED } } },
          {
            $group: {
              _id: null,
              avgMs: { $avg: { $subtract: ["$updatedAt", "$createdAt"] } },
            },
          },
        ]),
        Complaint.find()
          .select("category status priority createdAt updatedAt -_id")
          .sort({ updatedAt: -1 })
          .limit(6)
          .lean(),
      ]);

    const avgMs = resolvedTimes[0]?.avgMs;

    res.status(200).json({
      total,
      resolved,
      open: total - resolved,
      citizens,
      resolutionRate: total ? Math.round((resolved / total) * 100) : 0,
      avgResolutionHours: avgMs ? Math.max(1, Math.round(avgMs / 3600000)) : null,
      categories: categories.map((c) => ({
        category: c._id,
        count: c.count,
      })),
      recent,
    });
  } catch (error) {
    console.error("Public summary error:", error.message);

    res.status(500).json({
      message: "Server error while fetching summary",
    });
  }
});


// =====================================
// GET SINGLE COMPLAINT
// =====================================
router.get("/:id", async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        message: "Complaint not found",
      });
    }

    res.status(200).json({
      complaint,
    });
  } catch (error) {
    console.error("Get complaint error:", error.message);

    res.status(500).json({
      message: "Server error while fetching complaint",
    });
  }
});


module.exports = router;