const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  QUALIFICATIONS,
  DEPARTMENTS,
  GENDERS,
  uploadStaffDocuments,
  removeUploadedFiles,
  validateStaffApplication,
} = require("../utils/staffApplication");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9]{10,13}$/;

const router = express.Router();

// ===============================
// REGISTER USER
// ===============================
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    // Check required fields
    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        message: "Please fill all required fields",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    // Staff must apply with full details and documents
    if (role === "staff") {
      return res.status(400).json({
        message: "Please use the staff application form to apply as staff",
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      // Admin accounts are created only via scripts/createAdmin.js
      // Staff apply through /register-staff
      role: "citizen",
    });

    // Send response
    res.status(201).json({
      message:
        user.role === "staff"
          ? "Staff account created. An admin must approve it before you can log in."
          : "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    res.status(500).json({
      message: "Server error during registration",
    });
  }
});

// ===============================
// STAFF APPLICATION: FORM OPTIONS
// ===============================
router.get("/staff-application/options", (req, res) => {
  res.status(200).json({
    qualifications: QUALIFICATIONS,
    departments: DEPARTMENTS,
    genders: GENDERS,
  });
});

// ===============================
// STAFF APPLICATION: SUBMIT
// (multipart form with documents)
// ===============================
router.post("/register-staff", uploadStaffDocuments, async (req, res) => {
  const fail = (status, message) => {
    removeUploadedFiles(req.files);
    return res.status(status).json({ message });
  };

  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").toLowerCase().trim();
    const phone = String(req.body.phone || "").replace(/[\s-]/g, "");
    const password = String(req.body.password || "");

    if (name.length < 2) {
      return fail(400, "Please enter your full name");
    }

    if (!EMAIL_PATTERN.test(email)) {
      return fail(400, "Enter a valid email address");
    }

    if (!PHONE_PATTERN.test(phone)) {
      return fail(400, "Enter a valid 10-digit phone number");
    }

    if (password.length < 6) {
      return fail(400, "Password must be at least 6 characters");
    }

    const { errors, profile } = validateStaffApplication(req.body, req.files);

    if (errors.length > 0) {
      return fail(400, errors[0]);
    }

    if (await User.findOne({ email })) {
      return fail(400, "Email already registered");
    }

    await User.create({
      name,
      email,
      phone,
      password: await bcrypt.hash(password, 10),
      role: "staff",
      approvalStatus: "pending",
      staffProfile: profile,
    });

    res.status(201).json({
      message:
        "Application submitted. An admin will review it and you'll get an email once it's approved.",
    });
  } catch (error) {
    console.error("Staff application error:", error.message);
    return fail(500, "Server error while submitting your application");
  }
});

// ===============================
// LOGIN USER
// ===============================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check required fields
    if (!email || !password) {
      return res.status(400).json({
        message: "Please enter email and password",
      });
    }

    // Find user
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Check password
    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Check account status
    if (!user.isActive) {
      return res.status(403).json({
        message: "Your account has been deactivated",
      });
    }

    // Staff need admin approval first
    if (user.role === "staff" && user.approvalStatus !== "approved") {
      return res.status(403).json({
        message:
          user.approvalStatus === "rejected"
            ? "Your staff account request was not approved. Please contact the admin."
            : "Your staff account is waiting for admin approval. Please try again later.",
      });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    // Send response
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    res.status(500).json({
      message: "Server error during login",
    });
  }
});

// ===============================
// GOOGLE SIGN-IN CONFIG
// ===============================
router.get("/google-config", (req, res) => {
  res.status(200).json({
    clientId: process.env.GOOGLE_CLIENT_ID || null,
  });
});

// ===============================
// GOOGLE SIGN-UP / SIGN-IN
// ===============================
const verifyGoogleCredential = async (credential) => {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
  );

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();

  const validIssuer = [
    "accounts.google.com",
    "https://accounts.google.com",
  ].includes(payload.iss);

  if (
    !validIssuer ||
    payload.aud !== process.env.GOOGLE_CLIENT_ID ||
    payload.email_verified !== "true"
  ) {
    return null;
  }

  return payload;
};

const createLoginResponse = (user) => {
  const token = jwt.sign(
    {
      userId: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
  };
};

router.post("/google", async (req, res) => {
  try {
    const { credential, phone } = req.body;

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({
        message: "Google sign-in is not configured on the server",
      });
    }

    if (!credential) {
      return res.status(400).json({
        message: "Missing Google credential",
      });
    }

    const google = await verifyGoogleCredential(credential);

    if (!google) {
      return res.status(401).json({
        message: "Google sign-in failed. Please try again.",
      });
    }

    const email = google.email.toLowerCase();
    let user = await User.findOne({ email });

    // Existing account: link Google and log in
    if (user) {
      if (!user.isActive) {
        return res.status(403).json({
          message: "Your account has been deactivated",
        });
      }

      if (user.role === "staff" && user.approvalStatus !== "approved") {
        return res.status(403).json({
          message: "Your staff account is waiting for admin approval. Please try again later.",
        });
      }

      if (!user.googleId) {
        user.googleId = google.sub;
        await user.save();
      }

      return res.status(200).json({
        message: "Login successful",
        ...createLoginResponse(user),
      });
    }

    // New account: a phone number is needed to finish sign-up
    if (!phone || !phone.trim()) {
      return res.status(200).json({
        needsPhone: true,
        name: google.name,
        email,
        picture: google.picture,
      });
    }

    // Google accounts get a random password; they can set one via Forgot Password
    const randomPassword = crypto.randomBytes(32).toString("hex");

    user = await User.create({
      name: google.name || email.split("@")[0],
      email,
      phone: phone.trim(),
      password: await bcrypt.hash(randomPassword, 10),
      role: "citizen",
      authProvider: "google",
      googleId: google.sub,
      profileImage: google.picture || "",
    });

    res.status(201).json({
      message: "Account created successfully",
      ...createLoginResponse(user),
    });
  } catch (error) {
    console.error("Google sign-in error:", error.message);

    res.status(500).json({
      message: "Server error during Google sign-in",
    });
  }
});

// ===============================
// ADMIN LOGIN
// ===============================
router.post("/admin-login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Please enter email and password",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    const isPasswordCorrect =
      user && (await bcrypt.compare(password, user.password));

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (user.role !== "admin") {
      return res.status(403).json({
        message: "This account does not have admin access",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "Your account has been deactivated",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.status(200).json({
      message: "Admin login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error.message);

    res.status(500).json({
      message: "Server error during admin login",
    });
  }
});

// ===============================
// FORGOT PASSWORD
// ===============================
router.post("/forgot-password", async (req, res) => {
  try {
    const { email, phone, newPassword } = req.body;

    // Check required fields
    if (!email || !phone || !newPassword) {
      return res.status(400).json({
        message: "Please fill all required fields",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    // Verify identity with registered email and phone
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user || user.phone.trim() !== phone.trim()) {
      return res.status(400).json({
        message: "Email and phone number do not match any account",
      });
    }

    // Hash and save new password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Forgot password error:", error.message);

    res.status(500).json({
      message: "Server error during password reset",
    });
  }
});

module.exports = router;