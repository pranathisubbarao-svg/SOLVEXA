import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [scrolled, setScrolled] = useState(false);

  // Add a shadow once the page is scrolled
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // The admin console has its own sidebar layout
  if (
    pathname === "/admin" ||
    (pathname.startsWith("/admin/") && pathname !== "/admin/login")
  ) {
    return null;
  }

  // Re-read on every route change so login/logout is reflected
  const isLoggedIn = Boolean(localStorage.getItem("token"));
  const isStaff = (() => {
    try {
      return JSON.parse(localStorage.getItem("user"))?.role === "staff";
    } catch {
      return false;
    }
  })();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // Always return to the home page after logout
    navigate("/", { replace: true });
  };

  return (
    <nav className={`site-nav ${scrolled ? "is-scrolled" : ""}`}>
      <div>
        <Link to="/" className="site-logo">
          <span>S</span>
          <h2>SOLVEXA</h2>
        </Link>
      </div>

      <div>
        <NavLink to="/" end>Home</NavLink>

        {isLoggedIn ? (
          <>
            {isStaff ? (
              <NavLink to="/staff">My Work</NavLink>
            ) : (
              <>
                <NavLink to="/dashboard">Dashboard</NavLink>
                <NavLink to="/complaints">My Complaints</NavLink>
              </>
            )}
            <button className="site-nav-text" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login" end state={{ as: "citizen" }}>Login</NavLink>
            <NavLink to="/register">Register</NavLink>
            <Link
              to="/login"
              state={{ as: "staff" }}
              className="site-nav-staff"
            >
              Staff
            </Link>
            <NavLink to="/admin/login">Admin</NavLink>
          </>
        )}

        <button onClick={() => navigate(isLoggedIn ? "/report" : "/register")}>
          Report an Issue
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
