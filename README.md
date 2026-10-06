# SOLVEXA

A civic issue reporting platform. Citizens report community problems (potholes,
street lights, garbage, water, drainage…), admins review and assign them, and
staff resolve them — with progress tracked at every step.

## Live demo

- **App (frontend, Vercel):** https://solvexa-seven.vercel.app
- **API (backend, Render):** https://solvexa-sg6z.onrender.com

Hosted on free tiers for a demo: the API sleeps after ~15 minutes idle, so the
first request can take up to ~50 seconds. Uploaded files are not persisted.

## Features

- **Citizens** – register (email or Google), report issues, track progress on *My Complaints*
- **Admin console** – overview charts, reports table with filters, assign reports to staff,
  manage citizens, review staff job applications (details + documents), approve / reject with email
- **Staff workspace** – see assigned reports, start work, mark resolved with notes
- **Staff job applications** – multi-step form with Aadhaar, PAN, education and document uploads

## Tech stack

- **Frontend:** React 19, Vite, React Router, Recharts, Axios
- **Backend:** Node.js, Express 5, MongoDB (Mongoose), JWT, Multer, Nodemailer

## Getting started

### 1. Install

```bash
cd server
npm install

cd ../client
npm install
```

### 2. Configure

Copy `server/.env.example` to `server/.env` and fill in your values
(MongoDB connection string, JWT secret, Google Client ID, Gmail App Password).

### 3. Run (two terminals)

```bash
# Terminal 1 – backend (http://localhost:5000)
cd server
npm run dev

# Terminal 2 – frontend (http://localhost:5173)
cd client
npm run dev
```

Open http://localhost:5173

### 4. Create an admin

```bash
cd server
npm run create-admin -- admin@example.com YourPassword "Admin Name" 9876543210
```

## Project structure

```
client/          React frontend
  src/pages/     Home, Login, Register, Dashboard, Report, Staff, Admin…
  src/components/admin/   Admin console sections
server/          Express backend
  routes/        auth, complaints, admin, staff APIs
  models/        User, Complaint
  middleware/    admin / staff authentication
  utils/         staff application validation, email
  scripts/       createAdmin.js
```

Uploaded staff documents are stored privately in `server/uploads/` and are
not committed to the repository.
