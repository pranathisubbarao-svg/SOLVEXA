import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import PageTitle from "./components/PageTitle";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import StaffApply from "./pages/StaffApply";
import Dashboard from "./pages/Dashboard";
import ReportIssue from "./pages/ReportIssue";
import MyComplaints from "./pages/MyComplaints";

function App() {
  return (
    <BrowserRouter>
      <PageTitle />
      <Navbar />

      <Routes>

        {/* Home */}
        <Route
          path="/"
          element={<Home />}
        />

        {/* Authentication */}
        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        {/* Citizen Dashboard */}
        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        {/* Report Complaint */}
        <Route
          path="/report"
          element={<ReportIssue />}
        />

        {/* Track Complaints */}
        <Route
          path="/complaints"
          element={<MyComplaints />}
        />

        {/* Staff */}
        <Route
          path="/staff/apply"
          element={<StaffApply />}
        />

        <Route
          path="/staff"
          element={<StaffDashboard />}
        />

        {/* Admin */}
        <Route
          path="/admin/login"
          element={<AdminLogin />}
        />

        <Route
          path="/admin"
          element={<AdminDashboard />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;