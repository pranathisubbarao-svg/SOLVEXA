const jwt = require("jsonwebtoken");
const User = require("../models/User");

// =====================================
// VERIFY LOGGED-IN ADMIN
// =====================================
const requireAdmin = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ")
      ? header.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({
        message: "Please login as admin",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Re-check role in the database so revoked admins lose access
    const user = await User.findById(decoded.userId);

    if (!user || user.role !== "admin" || !user.isActive) {
      return res.status(403).json({
        message: "Admin access only",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Session expired. Please login again",
    });
  }
};

// =====================================
// VERIFY LOGGED-IN, APPROVED STAFF
// =====================================
const requireStaff = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ")
      ? header.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({
        message: "Please login as staff",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (
      !user ||
      user.role !== "staff" ||
      !user.isActive ||
      user.approvalStatus !== "approved"
    ) {
      return res.status(403).json({
        message: "Staff access only",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Session expired. Please login again",
    });
  }
};

module.exports = { requireAdmin, requireStaff };
