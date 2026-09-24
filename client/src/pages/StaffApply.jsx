import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import "../register.css";
import "../apply.css";

const API = "http://localhost:5000/api/auth";

const MAX_FILE_MB = 5;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DOCUMENT_TYPES = [...IMAGE_TYPES, "application/pdf"];

const STEPS = [
  { key: "account", title: "Account", icon: "👤" },
  { key: "personal", title: "Personal", icon: "🏠" },
  { key: "identity", title: "Identity", icon: "🪪" },
  { key: "education", title: "Education & work", icon: "🎓" },
  { key: "review", title: "Photo & review", icon: "📸" },
];

const FALLBACK_OPTIONS = {
  qualifications: ["10th / SSC", "12th / Intermediate", "ITI", "Diploma", "Bachelor's degree", "Master's degree", "Other"],
  departments: ["Roads & Infrastructure", "Electrical & Street Lights", "Water Supply", "Sanitation & Waste", "Drainage", "Public Safety", "Parks & Public Spaces", "General Maintenance"],
  genders: ["Female", "Male", "Other", "Prefer not to say"],
};

// =====================================
// AADHAAR CHECKSUM (Verhoeff) + PAN
// =====================================
const D = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
const P = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];

const isValidAadhaar = (value) => {
  if (!/^[2-9][0-9]{11}$/.test(value)) return false;
  let check = 0;
  value.split("").reverse().forEach((digit, i) => {
    check = D[check][P[i % 8][Number(digit)]];
  });
  return check === 0;
};

const isValidPan = (value) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value);

const formatAadhaar = (value) =>
  value.replace(/\D/g, "").slice(0, 12).replace(/(\d{4})(?=\d)/g, "$1 ");

// Latest birth date allowed in the date picker (18 years ago)
const MAX_DOB = new Date(Date.now() - 18 * 365.25 * 24 * 3600 * 1000)
  .toISOString()
  .slice(0, 10);

const cleanPhone = (phone) => phone.replace(/[\s-]/g, "");

const ageFrom = (date) =>
  date ? (Date.now() - new Date(date).getTime()) / (365.25 * 24 * 3600 * 1000) : 0;

// =====================================
// VALIDATION PER STEP
// =====================================
const validateStep = (step, data, files) => {
  const errors = {};
  const year = new Date().getFullYear();

  if (step === 0) {
    if (data.name.trim().length < 2) errors.name = "Enter your full name as on Aadhaar";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) errors.email = "Enter a valid email";
    if (!/^\+?[0-9]{10,13}$/.test(cleanPhone(data.phone))) errors.phone = "Enter a valid 10-digit phone number";
    if (data.password.length < 6) errors.password = "Use at least 6 characters";
    if (data.confirmPassword !== data.password) errors.confirmPassword = "Passwords do not match";
  }

  if (step === 1) {
    const age = ageFrom(data.dateOfBirth);
    if (!data.dateOfBirth || age < 18 || age > 65) errors.dateOfBirth = "You must be between 18 and 65 years old";
    if (!data.gender) errors.gender = "Select an option";
    if (data.address.trim().length < 10) errors.address = "Enter your full address";
    if (data.city.trim().length < 2) errors.city = "Enter your city";
    if (!/^[1-9][0-9]{5}$/.test(data.pincode)) errors.pincode = "Enter a valid 6-digit PIN code";
  }

  if (step === 2) {
    if (!isValidAadhaar(data.aadhaarNumber.replace(/\s/g, ""))) errors.aadhaarNumber = "Enter a valid 12-digit Aadhaar number";
    if (!isValidPan(data.panNumber)) errors.panNumber = "Enter a valid PAN, e.g. ABCDE1234F";
    if (!files.aadhaarCard) errors.aadhaarCard = "Upload your Aadhaar card";
    if (!files.panCard) errors.panCard = "Upload your PAN card";
  }

  if (step === 3) {
    if (!data.qualification) errors.qualification = "Select your highest qualification";
    if (data.institution.trim().length < 2) errors.institution = "Enter your school, college or institute";
    const passing = Number(data.yearOfPassing);
    if (!Number.isInteger(passing) || passing < 1960 || passing > year) errors.yearOfPassing = `Enter a year between 1960 and ${year}`;
    const exp = Number(data.experienceYears);
    if (data.experienceYears === "" || !Number.isFinite(exp) || exp < 0 || exp > 50) errors.experienceYears = "Enter 0 to 50 years";
    if (!data.preferredDepartment) errors.preferredDepartment = "Select a department";
    if (!files.educationCertificate) errors.educationCertificate = "Upload your education certificate";
  }

  if (step === 4) {
    if (!files.photo) errors.photo = "Upload a clear passport-size photo";
    if (!data.declaration) errors.declaration = "Please confirm the declaration";
  }

  return errors;
};

// =====================================
// FILE PICKER WITH PREVIEW
// =====================================
function FileField({ name, label, hint, file, error, imageOnly, optional, onPick }) {
  const preview = useMemo(
    () => (file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null),
    [file]
  );

  // Free the preview URL when the file changes
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  return (
    <div className={`apl-file ${file ? "has-file" : ""} ${error ? "has-error" : ""}`}>
      <label htmlFor={`file-${name}`}>
        {preview ? (
          <img src={preview} alt="" />
        ) : (
          <span className="apl-file-icon">{file ? "📄" : "⬆️"}</span>
        )}

        <span className="apl-file-text">
          <strong>
            {label} {optional && <em>(optional)</em>}
          </strong>
          <small>
            {file
              ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`
              : hint}
          </small>
        </span>

        <span className="apl-file-action">{file ? "Change" : "Choose file"}</span>
      </label>

      <input
        id={`file-${name}`}
        type="file"
        accept={(imageOnly ? IMAGE_TYPES : DOCUMENT_TYPES).join(",")}
        onChange={(e) => onPick(name, e.target.files[0], imageOnly)}
      />

      {error && <small className="reg-error">{error}</small>}
    </div>
  );
}

function StaffApply() {
  const navigate = useNavigate();

  const [options, setOptions] = useState(FALLBACK_OPTIONS);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [shake, setShake] = useState(false);

  const [data, setData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    city: "",
    pincode: "",
    aadhaarNumber: "",
    panNumber: "",
    qualification: "",
    institution: "",
    yearOfPassing: "",
    experienceYears: "0",
    preferredDepartment: "",
    skills: "",
    declaration: false,
  });

  const [files, setFiles] = useState({
    photo: null,
    aadhaarCard: null,
    panCard: null,
    educationCertificate: null,
    resume: null,
  });

  useEffect(() => {
    axios
      .get(`${API}/staff-application/options`)
      .then((response) => setOptions(response.data))
      .catch(() => {});
  }, []);

  const set = (key, value) => {
    setData((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setServerError("");
  };

  const pickFile = (name, file, imageOnly) => {
    if (!file) {
      return;
    }

    const allowed = imageOnly ? IMAGE_TYPES : DOCUMENT_TYPES;

    if (!allowed.includes(file.type)) {
      setErrors((current) => ({
        ...current,
        [name]: imageOnly ? "Use a JPG, PNG or WEBP image" : "Use an image or PDF",
      }));
      return;
    }

    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setErrors((current) => ({ ...current, [name]: `File must be ${MAX_FILE_MB} MB or smaller` }));
      return;
    }

    setFiles((current) => ({ ...current, [name]: file }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 450);
  };

  const next = () => {
    const stepErrors = validateStep(step, data, files);

    if (Object.keys(stepErrors).length) {
      setErrors(stepErrors);
      triggerShake();
      return;
    }

    setErrors({});
    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const back = () => {
    setErrors({});
    setServerError("");
    setStep(step - 1);
  };

  // =====================================
  // SUBMIT APPLICATION
  // =====================================
  const submit = async () => {
    const stepErrors = validateStep(4, data, files);

    if (Object.keys(stepErrors).length) {
      setErrors(stepErrors);
      triggerShake();
      return;
    }

    const form = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      if (!["confirmPassword", "declaration"].includes(key)) {
        form.append(key, key === "aadhaarNumber" ? value.replace(/\s/g, "") : value);
      }
    });

    form.set("phone", cleanPhone(data.phone));

    Object.entries(files).forEach(([key, file]) => {
      if (file) form.append(key, file);
    });

    setSubmitting(true);
    setProgress(0);
    setServerError("");

    try {
      await axios.post(`${API}/register-staff`, form, {
        onUploadProgress: (event) =>
          event.total && setProgress(Math.round((event.loaded / event.total) * 100)),
      });

      setDone(true);
    } catch (error) {
      console.error("Staff application error:", error);

      setServerError(
        error.response?.data?.message || "Could not submit your application. Please try again."
      );
      triggerShake();
    } finally {
      setSubmitting(false);
    }
  };

  const field = (key, label, input) => (
    <div className={`reg-field ${errors[key] ? "has-error" : ""}`}>
      <label htmlFor={`apl-${key}`}>{label}</label>
      {input}
      {errors[key] && <small className="reg-error">{errors[key]}</small>}
    </div>
  );

  const textInput = (key, props = {}) => (
    <div className="reg-input">
      <input
        id={`apl-${key}`}
        value={data[key]}
        onChange={(e) => set(key, e.target.value)}
        {...props}
      />
    </div>
  );

  const selectInput = (key, list, placeholder) => (
    <div className="reg-input">
      <select
        id={`apl-${key}`}
        className="apl-select"
        value={data[key]}
        onChange={(e) => set(key, e.target.value)}
      >
        <option value="">{placeholder}</option>
        {list.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </div>
  );

  // =====================================
  // SUCCESS SCREEN
  // =====================================
  if (done) {
    return (
      <div className="reg-page">
        <div className="apl-card apl-done">
          <div className="reg-check">
            <svg viewBox="0 0 52 52" aria-hidden="true">
              <circle cx="26" cy="26" r="24" />
              <path d="M15 27l7 7 15-15" />
            </svg>
          </div>
          <h1>Application submitted! 🎉</h1>
          <p>
            Thank you, {data.name.split(" ")[0]}. The SOLVEXA admin team will
            review your details and documents. You'll receive an email at{" "}
            <strong>{data.email}</strong> once a decision is made.
          </p>
          <div className="apl-done-steps">
            <span>✅ Application received</span>
            <span>⏳ Admin review</span>
            <span>📧 Email with the decision</span>
            <span>👷 Log in as staff</span>
          </div>
          <button className="reg-submit" onClick={() => navigate("/")}>
            Back to home <span className="reg-arrow">→</span>
          </button>
        </div>
      </div>
    );
  }

  const current = STEPS[step];

  return (
    <div className="reg-page">
      <div className="reg-bg" aria-hidden="true">
        <span className="reg-blob reg-blob-1" />
        <span className="reg-blob reg-blob-2" />
      </div>

      <div className={`apl-card ${shake ? "reg-shake" : ""}`}>

        <div className="apl-head">
          <span className="apl-eyebrow">👷 STAFF JOB APPLICATION</span>
          <h1>Join the SOLVEXA field team</h1>
          <p>
            Fill in your details and upload your documents. An admin reviews
            every application — you'll get an email with the decision.
          </p>
        </div>

        {/* Stepper */}
        <ol className="apl-steps">
          {STEPS.map((item, index) => (
            <li
              key={item.key}
              className={`${index < step ? "done" : ""} ${index === step ? "current" : ""}`}
            >
              <span className="apl-step-dot">{index < step ? "✓" : item.icon}</span>
              <span className="apl-step-label">{item.title}</span>
            </li>
          ))}
        </ol>

        <div className="apl-progress">
          <span style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} />
        </div>

        <div className="apl-body" key={current.key}>
          <h2>
            Step {step + 1} of {STEPS.length}: {current.title}
          </h2>

          {/* ---------- STEP 1: ACCOUNT ---------- */}
          {step === 0 && (
            <>
              <div className="reg-row">
                {field("name", "Full name (as on Aadhaar)", textInput("name", { placeholder: "Ravi Kumar", autoComplete: "name" }))}
                {field("phone", "Mobile number", textInput("phone", { type: "tel", placeholder: "98765 43210", autoComplete: "tel" }))}
              </div>
              {field("email", "Email address", textInput("email", { type: "email", placeholder: "you@example.com", autoComplete: "email" }))}
              <p className="apl-hint">We'll send the approval email to this address.</p>
              <div className="reg-row">
                {field("password", "Create password", textInput("password", { type: "password", placeholder: "At least 6 characters", autoComplete: "new-password" }))}
                {field("confirmPassword", "Confirm password", textInput("confirmPassword", { type: "password", placeholder: "Re-enter password", autoComplete: "new-password" }))}
              </div>
            </>
          )}

          {/* ---------- STEP 2: PERSONAL ---------- */}
          {step === 1 && (
            <>
              <div className="reg-row">
                {field("dateOfBirth", "Date of birth", textInput("dateOfBirth", { type: "date", max: MAX_DOB }))}
                {field("gender", "Gender", selectInput("gender", options.genders, "Select"))}
              </div>
              {field(
                "address",
                "Full address",
                <div className="reg-input">
                  <textarea
                    id="apl-address"
                    className="apl-textarea"
                    rows="3"
                    placeholder="House no, street, area"
                    value={data.address}
                    onChange={(e) => set("address", e.target.value)}
                  />
                </div>
              )}
              <div className="reg-row">
                {field("city", "City", textInput("city", { placeholder: "Hyderabad" }))}
                {field("pincode", "PIN code", textInput("pincode", { inputMode: "numeric", maxLength: 6, placeholder: "500001" }))}
              </div>
            </>
          )}

          {/* ---------- STEP 3: IDENTITY ---------- */}
          {step === 2 && (
            <>
              <div className="apl-secure">
                🔒 Your Aadhaar and PAN are only visible to SOLVEXA admins for
                verification and are never shown publicly.
              </div>
              <div className="reg-row">
                {field(
                  "aadhaarNumber",
                  "Aadhaar number",
                  <div className="reg-input">
                    <input
                      id="apl-aadhaarNumber"
                      inputMode="numeric"
                      placeholder="1234 5678 9012"
                      value={data.aadhaarNumber}
                      onChange={(e) => set("aadhaarNumber", formatAadhaar(e.target.value))}
                    />
                  </div>
                )}
                {field(
                  "panNumber",
                  "PAN number",
                  <div className="reg-input">
                    <input
                      id="apl-panNumber"
                      placeholder="ABCDE1234F"
                      maxLength={10}
                      value={data.panNumber}
                      onChange={(e) => set("panNumber", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                    />
                  </div>
                )}
              </div>
              <FileField name="aadhaarCard" label="Aadhaar card" hint="Photo or PDF of the front side · max 5 MB" file={files.aadhaarCard} error={errors.aadhaarCard} onPick={pickFile} />
              <FileField name="panCard" label="PAN card" hint="Photo or PDF · max 5 MB" file={files.panCard} error={errors.panCard} onPick={pickFile} />
            </>
          )}

          {/* ---------- STEP 4: EDUCATION & WORK ---------- */}
          {step === 3 && (
            <>
              <div className="reg-row">
                {field("qualification", "Highest qualification", selectInput("qualification", options.qualifications, "Select qualification"))}
                {field("yearOfPassing", "Year of passing", textInput("yearOfPassing", { inputMode: "numeric", maxLength: 4, placeholder: "2020" }))}
              </div>
              {field("institution", "School / college / institute", textInput("institution", { placeholder: "e.g. Govt. Polytechnic, Hyderabad" }))}
              <div className="reg-row">
                {field("experienceYears", "Work experience (years)", textInput("experienceYears", { type: "number", min: 0, max: 50 }))}
                {field("preferredDepartment", "Preferred department", selectInput("preferredDepartment", options.departments, "Select department"))}
              </div>
              {field(
                "skills",
                "Skills (optional)",
                <div className="reg-input">
                  <textarea
                    id="apl-skills"
                    className="apl-textarea"
                    rows="2"
                    maxLength={500}
                    placeholder="e.g. Electrical wiring, road repair, two-wheeler licence"
                    value={data.skills}
                    onChange={(e) => set("skills", e.target.value)}
                  />
                </div>
              )}
              <FileField name="educationCertificate" label="Education certificate" hint="Marks memo or certificate · image or PDF · max 5 MB" file={files.educationCertificate} error={errors.educationCertificate} onPick={pickFile} />
              <FileField name="resume" label="Resume" optional hint="PDF or image · max 5 MB" file={files.resume} error={errors.resume} onPick={pickFile} />
            </>
          )}

          {/* ---------- STEP 5: PHOTO & REVIEW ---------- */}
          {step === 4 && (
            <>
              <FileField name="photo" label="Passport-size photo" imageOnly hint="Clear face photo · JPG or PNG · max 5 MB" file={files.photo} error={errors.photo} onPick={pickFile} />

              <div className="apl-review">
                <h3>Review your application</h3>
                <dl>
                  <div><dt>Name</dt><dd>{data.name}</dd></div>
                  <div><dt>Email</dt><dd>{data.email}</dd></div>
                  <div><dt>Mobile</dt><dd>{data.phone}</dd></div>
                  <div><dt>Date of birth</dt><dd>{data.dateOfBirth && new Date(data.dateOfBirth).toLocaleDateString("en-IN")}</dd></div>
                  <div><dt>Address</dt><dd>{data.address}, {data.city} – {data.pincode}</dd></div>
                  <div><dt>Aadhaar</dt><dd>XXXX XXXX {data.aadhaarNumber.replace(/\s/g, "").slice(-4)}</dd></div>
                  <div><dt>PAN</dt><dd>{data.panNumber}</dd></div>
                  <div><dt>Qualification</dt><dd>{data.qualification} · {data.institution} ({data.yearOfPassing})</dd></div>
                  <div><dt>Experience</dt><dd>{data.experienceYears} year(s)</dd></div>
                  <div><dt>Department</dt><dd>{data.preferredDepartment}</dd></div>
                  <div>
                    <dt>Documents</dt>
                    <dd>
                      {[
                        ["aadhaarCard", "Aadhaar"],
                        ["panCard", "PAN"],
                        ["educationCertificate", "Certificate"],
                        ["resume", "Resume"],
                      ]
                        .filter(([key]) => files[key])
                        .map(([, label]) => `✓ ${label}`)
                        .join("  ")}
                    </dd>
                  </div>
                </dl>
                <button type="button" className="apl-edit" onClick={() => setStep(0)}>
                  Edit details
                </button>
              </div>

              <label className={`apl-declare ${errors.declaration ? "has-error" : ""}`}>
                <input
                  type="checkbox"
                  checked={data.declaration}
                  onChange={(e) => set("declaration", e.target.checked)}
                />
                <span>
                  I confirm that the information and documents I have provided
                  are true and belong to me.
                </span>
              </label>
              {errors.declaration && <small className="reg-error">{errors.declaration}</small>}
            </>
          )}

          {serverError && (
            <div className="reg-alert" role="alert">
              <span>!</span>
              {serverError}
            </div>
          )}

          {submitting && (
            <div className="apl-upload">
              <span>Uploading documents… {progress}%</span>
              <div><span style={{ width: `${progress}%` }} /></div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="apl-nav">
          {step > 0 ? (
            <button type="button" className="apl-back" onClick={back} disabled={submitting}>
              ← Back
            </button>
          ) : (
            <Link to="/register" className="apl-back">
              ← Citizen sign-up
            </Link>
          )}

          {step < STEPS.length - 1 ? (
            <button type="button" className="reg-submit apl-next" onClick={next}>
              Continue <span className="reg-arrow">→</span>
            </button>
          ) : (
            <button
              type="button"
              className="reg-submit apl-next"
              onClick={submit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="reg-spinner" /> Submitting…
                </>
              ) : (
                <>
                  Submit application <span className="reg-arrow">→</span>
                </>
              )}
            </button>
          )}
        </div>

        <p className="apl-foot">
          Already approved? <Link to="/login" state={{ as: "staff" }}>Staff login</Link>
        </p>
      </div>
    </div>
  );
}

export default StaffApply;
