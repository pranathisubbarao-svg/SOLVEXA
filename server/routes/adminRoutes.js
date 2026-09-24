const express = require("express");
const Complaint = require("../models/Complaint");
const User = require("../models/User");
const path = require("path");
const { requireAdmin } = require("../middleware/auth");
const { sendStaffDecisionEmail, isMailConfigured } = require("../utils/mailer");
const {
  UPLOAD_DIR,
  DOCUMENT_FIELDS,
  publicStaffProfile,
} = require("../utils/staffApplication");

const router = express.Router();

// All admin routes need a logged-in admin
router.use(requireAdmin);

const STATUSES = [
  "Submitted",
  "Under Review",
  "Assigned",
  "In Progress",
  "Resolved",
  "Closed",
];

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

// =====================================
// OVERALL STATISTICS
// =====================================
router.get("/stats", async (req, res) => {
  try {
    const [total, pending, resolved, closed, urgent, citizens, staff, pendingStaff, unassigned] =
      await Promise.all([
        Complaint.countDocuments(),
        Complaint.countDocuments({
          status: { $nin: ["Resolved", "Closed"] },
        }),
        Complaint.countDocuments({ status: "Resolved" }),
        Complaint.countDocuments({ status: "Closed" }),
        Complaint.countDocuments({
          priority: "Urgent",
          status: { $nin: ["Resolved", "Closed"] },
        }),
        User.countDocuments({ role: "citizen" }),
        User.countDocuments({ role: "staff", approvalStatus: { $nin: ["pending", "rejected"] } }),
        User.countDocuments({ role: "staff", approvalStatus: "pending" }),
        Complaint.countDocuments({
          assignedStaffId: null,
          status: { $nin: ["Resolved", "Closed"] },
        }),
      ]);

    res.status(200).json({
      total,
      pending,
      resolved,
      closed,
      urgent,
      citizens,
      staff,
      pendingStaff,
      unassigned,
    });
  } catch (error) {
    console.error("Admin stats error:", error.message);

    res.status(500).json({
      message: "Server error while fetching statistics",
    });
  }
});

// =====================================
// ALL COMPLAINTS (with citizen details)
// =====================================
router.get("/complaints", async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate("citizenId", "name email phone")
      .populate("assignedStaffId", "name email phone")
      .sort({ createdAt: -1 });

    res.status(200).json({
      complaints,
    });
  } catch (error) {
    console.error("Admin complaints error:", error.message);

    res.status(500).json({
      message: "Server error while fetching complaints",
    });
  }
});

// =====================================
// UPDATE COMPLAINT STATUS / PRIORITY
// =====================================
router.put("/complaints/:id", async (req, res) => {
  try {
    const { status, priority, resolutionDetails, assignedStaffId } = req.body;

    const updates = {};

    if (status !== undefined) {
      if (!STATUSES.includes(status)) {
        return res.status(400).json({
          message: "Invalid status",
        });
      }
      updates.status = status;
    }

    if (priority !== undefined) {
      if (!PRIORITIES.includes(priority)) {
        return res.status(400).json({
          message: "Invalid priority",
        });
      }
      updates.priority = priority;
    }

    if (assignedStaffId !== undefined) {
      if (assignedStaffId === null || assignedStaffId === "") {
        updates.assignedStaffId = null;
      } else {
        const staffMember = await User.findOne({
          _id: assignedStaffId,
          role: "staff",
          // Older staff accounts have no approvalStatus saved; treat them as approved
          approvalStatus: { $nin: ["pending", "rejected"] },
          isActive: true,
        });

        if (!staffMember) {
          return res.status(400).json({
            message: "Please choose an approved, active staff member",
          });
        }

        updates.assignedStaffId = staffMember._id;
      }
    }

    if (resolutionDetails !== undefined) {
      updates.resolutionDetails = String(resolutionDetails).trim();
    }

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
      .populate("citizenId", "name email phone")
      .populate("assignedStaffId", "name email phone");

    if (!complaint) {
      return res.status(404).json({
        message: "Complaint not found",
      });
    }

    res.status(200).json({
      message: "Complaint updated successfully",
      complaint,
    });
  } catch (error) {
    console.error("Admin update complaint error:", error.message);

    res.status(500).json({
      message: "Server error while updating complaint",
    });
  }
});

// =====================================
// ALL CITIZENS (with complaint counts)
// =====================================
router.get("/citizens", async (req, res) => {
  try {
    const citizens = await User.find({ role: "citizen" })
      .select("name email phone isActive createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const counts = await Complaint.aggregate([
      {
        $group: {
          _id: "$citizenId",
          total: { $sum: 1 },
          open: {
            $sum: {
              $cond: [
                { $in: ["$status", ["Resolved", "Closed"]] },
                0,
                1,
              ],
            },
          },
        },
      },
    ]);

    const countMap = new Map(
      counts.map((c) => [String(c._id), c])
    );

    res.status(200).json({
      citizens: citizens.map((citizen) => ({
        ...citizen,
        totalComplaints: countMap.get(String(citizen._id))?.total || 0,
        openComplaints: countMap.get(String(citizen._id))?.open || 0,
      })),
    });
  } catch (error) {
    console.error("Admin citizens error:", error.message);

    res.status(500).json({
      message: "Server error while fetching citizens",
    });
  }
});

// =====================================
// ALL STAFF (with workload)
// =====================================
router.get("/staff", async (req, res) => {
  try {
    const staff = await User.find({ role: "staff" })
      .select("name email phone isActive approvalStatus createdAt staffProfile")
      .sort({ createdAt: -1 })
      .lean();

    const workload = await Complaint.aggregate([
      { $match: { assignedStaffId: { $ne: null } } },
      {
        $group: {
          _id: "$assignedStaffId",
          total: { $sum: 1 },
          open: {
            $sum: {
              $cond: [
                { $in: ["$status", ["Resolved", "Closed"]] },
                0,
                1,
              ],
            },
          },
        },
      },
    ]);

    const workloadMap = new Map(
      workload.map((w) => [String(w._id), w])
    );

    res.status(200).json({
      staff: staff.map((member) => {
        const load = workloadMap.get(String(member._id));

        return {
          ...member,
          // ID numbers are masked; documents are only flags here
          staffProfile: publicStaffProfile(member.staffProfile),
          approvalStatus: member.approvalStatus || "approved",
          assignedTotal: load?.total || 0,
          assignedOpen: load?.open || 0,
          assignedDone: (load?.total || 0) - (load?.open || 0),
        };
      }),
    });
  } catch (error) {
    console.error("Admin staff error:", error.message);

    res.status(500).json({
      message: "Server error while fetching staff",
    });
  }
});

// =====================================
// APPROVE / REJECT A STAFF ACCOUNT
// =====================================
router.put("/staff/:id/approval", async (req, res) => {
  try {
    const { approvalStatus, reason } = req.body;

    if (!["approved", "rejected"].includes(approvalStatus)) {
      return res.status(400).json({
        message: "Invalid approval status",
      });
    }

    const member = await User.findOne({
      _id: req.params.id,
      role: "staff",
    });

    if (!member) {
      return res.status(404).json({
        message: "Staff member not found",
      });
    }

    if (approvalStatus === "rejected") {
      const openAssigned = await Complaint.countDocuments({
        assignedStaffId: member._id,
        status: { $nin: ["Resolved", "Closed"] },
      });

      if (openAssigned > 0) {
        return res.status(400).json({
          message: `Reassign ${member.name}'s ${openAssigned} open report(s) before removing access`,
        });
      }
    }

    const wasPending = member.approvalStatus === "pending";

    member.approvalStatus = approvalStatus;

    if (member.staffProfile) {
      member.staffProfile.reviewedAt = new Date();
      member.staffProfile.rejectionReason =
        approvalStatus === "rejected" ? String(reason || "").trim().slice(0, 500) : "";
    }

    await member.save();

    // Let the applicant know by email
    const email = await sendStaffDecisionEmail(
      member,
      approvalStatus,
      member.staffProfile?.rejectionReason
    );

    const action =
      approvalStatus === "approved"
        ? `${member.name} can now log in as staff`
        : wasPending
          ? `${member.name}'s application was rejected`
          : `${member.name}'s staff access was removed`;

    res.status(200).json({
      message: email.sent
        ? `${action}. Email sent to ${member.email}.`
        : `${action}. No email sent: ${email.reason}.`,
      emailSent: email.sent,
    });
  } catch (error) {
    console.error("Admin staff approval error:", error.message);

    res.status(500).json({
      message: "Server error while updating staff",
    });
  }
});

// =====================================
// VIEW A STAFF APPLICANT'S DOCUMENT
// (private files - admins only)
// =====================================
router.get("/staff/:id/documents/:document", async (req, res) => {
  try {
    const { document } = req.params;

    if (!DOCUMENT_FIELDS[document]) {
      return res.status(404).json({ message: "Unknown document" });
    }

    const member = await User.findOne({ _id: req.params.id, role: "staff" })
      .select("staffProfile.documents")
      .lean();

    const fileName = member?.staffProfile?.documents?.[document];

    if (!fileName) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Only ever serve files from inside the private upload folder
    const filePath = path.join(UPLOAD_DIR, path.basename(fileName));

    res.setHeader("Cache-Control", "private, no-store");
    res.sendFile(filePath, (error) => {
      if (error && !res.headersSent) {
        res.status(404).json({ message: "Document file is missing" });
      }
    });
  } catch (error) {
    console.error("Staff document error:", error.message);

    res.status(500).json({
      message: "Server error while loading the document",
    });
  }
});

// =====================================
// RE-SEND THE DECISION EMAIL
// (e.g. approved before email was set up)
// =====================================
router.post("/staff/:id/notify", async (req, res) => {
  try {
    const member = await User.findOne({ _id: req.params.id, role: "staff" });

    if (!member) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    const status = member.approvalStatus || "approved";

    if (status === "pending") {
      return res.status(400).json({
        message: "Approve or reject this application first",
      });
    }

    const email = await sendStaffDecisionEmail(
      member,
      status,
      member.staffProfile?.rejectionReason
    );

    if (!email.sent) {
      return res.status(400).json({
        message: `No email sent: ${email.reason}`,
      });
    }

    res.status(200).json({
      message: `${status === "approved" ? "Approval" : "Rejection"} email sent to ${member.email}`,
    });
  } catch (error) {
    console.error("Staff notify error:", error.message);

    res.status(500).json({
      message: "Server error while sending the email",
    });
  }
});

// =====================================
// IS EMAIL SET UP? (shown in the admin UI)
// =====================================
router.get("/email-status", (req, res) => {
  res.status(200).json({ configured: isMailConfigured() });
});

module.exports = router;
