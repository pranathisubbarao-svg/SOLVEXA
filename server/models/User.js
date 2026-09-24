const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["citizen", "staff", "department", "admin"],
      default: "citizen",
    },

    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },

    profileImage: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // Staff accounts must be approved by an admin before they can log in
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },

    // Job-application details submitted by staff applicants.
    // Document fields hold private file names under server/uploads/staff.
    staffProfile: {
      dateOfBirth: Date,
      gender: String,
      address: String,
      city: String,
      pincode: String,
      aadhaarNumber: String,
      panNumber: String,
      qualification: String,
      institution: String,
      yearOfPassing: Number,
      experienceYears: Number,
      preferredDepartment: String,
      skills: String,
      documents: {
        photo: String,
        aadhaarCard: String,
        panCard: String,
        educationCertificate: String,
        resume: String,
      },
      appliedAt: Date,
      reviewedAt: Date,
      rejectionReason: String,
    },

    authProvider: {
      type: String,
      enum: ["email", "google"],
      default: "email",
    },

    googleId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;