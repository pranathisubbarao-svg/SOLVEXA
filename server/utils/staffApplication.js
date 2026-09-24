const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

// Private folder - NOT served statically. Admins download files through
// an authenticated route only.
const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "staff");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DOCUMENT_TYPES = [...IMAGE_TYPES, "application/pdf"];

const EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

const DOCUMENT_FIELDS = {
  photo: { label: "Passport photo", types: IMAGE_TYPES, required: true },
  aadhaarCard: { label: "Aadhaar card", types: DOCUMENT_TYPES, required: true },
  panCard: { label: "PAN card", types: DOCUMENT_TYPES, required: true },
  educationCertificate: { label: "Education certificate", types: DOCUMENT_TYPES, required: true },
  resume: { label: "Resume", types: DOCUMENT_TYPES, required: false },
};

const QUALIFICATIONS = [
  "10th / SSC",
  "12th / Intermediate",
  "ITI",
  "Diploma",
  "Bachelor's degree",
  "Master's degree",
  "Other",
];

const DEPARTMENTS = [
  "Roads & Infrastructure",
  "Electrical & Street Lights",
  "Water Supply",
  "Sanitation & Waste",
  "Drainage",
  "Public Safety",
  "Parks & Public Spaces",
  "General Maintenance",
];

const GENDERS = ["Female", "Male", "Other", "Prefer not to say"];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

// =====================================
// UPLOAD HANDLER
// =====================================
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) =>
      cb(null, `${crypto.randomUUID()}${EXTENSIONS[file.mimetype] || ""}`),
  }),
  limits: { fileSize: MAX_FILE_SIZE, files: 5 },
  fileFilter: (req, file, cb) => {
    const field = DOCUMENT_FIELDS[file.fieldname];

    if (!field) {
      return cb(new Error("Unexpected file"));
    }

    if (!field.types.includes(file.mimetype)) {
      return cb(
        new Error(
          `${field.label} must be ${
            field.types === IMAGE_TYPES ? "a JPG, PNG or WEBP image" : "an image or PDF"
          }`
        )
      );
    }

    cb(null, true);
  },
}).fields(
  Object.keys(DOCUMENT_FIELDS).map((name) => ({ name, maxCount: 1 }))
);

// Wrap multer so its errors become friendly 400 responses
const uploadStaffDocuments = (req, res, next) => {
  upload(req, res, (error) => {
    if (!error) {
      return next();
    }

    removeUploadedFiles(req.files);

    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Each file must be 5 MB or smaller"
        : error.message || "File upload failed";

    res.status(400).json({ message });
  });
};

const removeUploadedFiles = (files) => {
  Object.values(files || {})
    .flat()
    .forEach((file) => fs.unlink(file.path, () => {}));
};

// =====================================
// AADHAAR (Verhoeff checksum) + PAN
// =====================================
const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

const isValidAadhaar = (value) => {
  if (!/^[2-9][0-9]{11}$/.test(value)) {
    return false;
  }

  let check = 0;
  value
    .split("")
    .reverse()
    .forEach((digit, index) => {
      check = VERHOEFF_D[check][VERHOEFF_P[index % 8][Number(digit)]];
    });

  return check === 0;
};

const isValidPan = (value) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value);

const maskAadhaar = (value = "") =>
  value ? `XXXX XXXX ${value.slice(-4)}` : "";

const maskPan = (value = "") =>
  value ? `${value.slice(0, 2)}XXXXX${value.slice(-3)}` : "";

// =====================================
// VALIDATE THE APPLICATION FORM
// =====================================
const validateStaffApplication = (body, files) => {
  const errors = [];
  const text = (key) => String(body[key] || "").trim();

  const aadhaarNumber = text("aadhaarNumber").replace(/\s/g, "");
  const panNumber = text("panNumber").toUpperCase();
  const dateOfBirth = new Date(text("dateOfBirth"));
  const yearOfPassing = Number(text("yearOfPassing"));
  const experienceYears = Number(text("experienceYears") || 0);
  const currentYear = new Date().getFullYear();

  const age = Number.isNaN(dateOfBirth.getTime())
    ? null
    : (Date.now() - dateOfBirth.getTime()) / (365.25 * 24 * 3600 * 1000);

  if (age === null || age < 18 || age > 65) {
    errors.push("Applicants must be between 18 and 65 years old");
  }

  if (!GENDERS.includes(text("gender"))) {
    errors.push("Please select a gender option");
  }

  if (text("address").length < 10) {
    errors.push("Please enter your full address");
  }

  if (text("city").length < 2) {
    errors.push("Please enter your city");
  }

  if (!/^[1-9][0-9]{5}$/.test(text("pincode"))) {
    errors.push("Enter a valid 6-digit PIN code");
  }

  if (!isValidAadhaar(aadhaarNumber)) {
    errors.push("Enter a valid 12-digit Aadhaar number");
  }

  if (!isValidPan(panNumber)) {
    errors.push("Enter a valid PAN (e.g. ABCDE1234F)");
  }

  if (!QUALIFICATIONS.includes(text("qualification"))) {
    errors.push("Please select your highest qualification");
  }

  if (text("institution").length < 2) {
    errors.push("Please enter your school, college or institute");
  }

  if (!Number.isInteger(yearOfPassing) || yearOfPassing < 1960 || yearOfPassing > currentYear) {
    errors.push("Enter a valid year of passing");
  }

  if (!Number.isFinite(experienceYears) || experienceYears < 0 || experienceYears > 50) {
    errors.push("Experience must be between 0 and 50 years");
  }

  if (!DEPARTMENTS.includes(text("preferredDepartment"))) {
    errors.push("Please select a preferred department");
  }

  Object.entries(DOCUMENT_FIELDS).forEach(([name, field]) => {
    if (field.required && !files?.[name]?.[0]) {
      errors.push(`Please upload your ${field.label.toLowerCase()}`);
    }
  });

  const documents = {};
  Object.keys(DOCUMENT_FIELDS).forEach((name) => {
    if (files?.[name]?.[0]) {
      documents[name] = files[name][0].filename;
    }
  });

  return {
    errors,
    profile: {
      dateOfBirth,
      gender: text("gender"),
      address: text("address"),
      city: text("city"),
      pincode: text("pincode"),
      aadhaarNumber,
      panNumber,
      qualification: text("qualification"),
      institution: text("institution"),
      yearOfPassing,
      experienceYears,
      preferredDepartment: text("preferredDepartment"),
      skills: text("skills").slice(0, 500),
      documents,
      appliedAt: new Date(),
    },
  };
};

// Profile safe to send to admins: ID numbers masked
const publicStaffProfile = (profile) => {
  if (!profile) {
    return null;
  }

  const plain = typeof profile.toObject === "function" ? profile.toObject() : profile;

  return {
    ...plain,
    aadhaarNumber: maskAadhaar(plain.aadhaarNumber),
    panNumber: maskPan(plain.panNumber),
    documents: Object.fromEntries(
      Object.keys(DOCUMENT_FIELDS).map((name) => [name, Boolean(plain.documents?.[name])])
    ),
  };
};

module.exports = {
  UPLOAD_DIR,
  DOCUMENT_FIELDS,
  QUALIFICATIONS,
  DEPARTMENTS,
  GENDERS,
  uploadStaffDocuments,
  removeUploadedFiles,
  validateStaffApplication,
  publicStaffProfile,
};
