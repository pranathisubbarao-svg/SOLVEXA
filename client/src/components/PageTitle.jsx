import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const PAGE_NAMES = {
  "/": "Home",
  "/login": "Login",
  "/register": "Register",
  "/forgot-password": "Reset Password",
  "/dashboard": "Dashboard",
  "/report": "Report an Issue",
  "/complaints": "My Complaints",
  "/staff": "Staff Workspace",
  "/staff/apply": "Staff Application",
  "/admin/login": "Admin Login",
  "/admin": "Dashboard",
};

// Sets the browser tab title and icon for the current page
function PageTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
    const site = isAdmin ? "SOLVEXA Admin" : "SOLVEXA";
    const page = PAGE_NAMES[pathname];

    document.title = page && pathname !== "/" ? `${page} | ${site}` : site;

    const icon = document.querySelector("link[rel='icon']");

    if (icon) {
      icon.href = isAdmin ? "/favicon-admin.svg" : "/favicon-solvexa.svg";
    }

    // Start every page at the top (e.g. Home after logout)
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default PageTitle;
