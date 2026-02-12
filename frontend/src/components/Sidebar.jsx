import { NavLink, useNavigate } from "react-router-dom";
import subLogo from "../assets/sub-logo.png";

export default function Sidebar({ isOpen, onClose, isMobile }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  function logout() {
    localStorage.removeItem("user");
    navigate("/login");
  }

  const linkStyle = ({ isActive }) => ({
    padding: "12px 20px",
    color: "white",
    textDecoration: "none",
    background: isActive ? "#a81c22" : "transparent",
    display: "block",
    fontSize: "14px",
    borderRadius: "6px",
    margin: "4px 10px",
  });

  return (
    <div
      className={`sidebar-mobile ${isOpen ? "open" : ""}`}
      style={{
        ...sidebar,
        width: isMobile ? "260px" : "220px",
        boxShadow: isMobile && isOpen ? "-5px 0 15px rgba(0,0,0,0.1)" : "none"
      }}
    >
      {/* ===== LOGO & CLOSE BTN ===== */}
      <div style={logoBox}>
        {isMobile && (
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              left: "10px",
              top: "10px",
              background: "transparent",
              border: "none",
              color: "white",
              fontSize: "24px",
              cursor: "pointer"
            }}
          >
            ✕
          </button>
        )}
        <img
          src={subLogo}
          alt="Al Shifaa"
          style={{ width: "100px", marginBottom: "10px" }}
        />
        <div style={{ fontSize: "12px", opacity: 0.9 }}>
          جمعية الشفاء للخدمات الطبية
        </div>
      </div>

      {/* ===== NAV LINKS ===== */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <NavLink to="/dashboard" style={linkStyle}>لوحة التحكم</NavLink>
        <NavLink to="/cases" style={linkStyle}>الحالات</NavLink>

        {(user.role === "admin" || user.role === "super") && (
          <>
            <NavLink to="/financial" style={linkStyle}>المصاريف</NavLink>
            <NavLink to="/assets" style={linkStyle}>الأصول</NavLink>
          </>
        )}

        <NavLink to="/medical-team" style={linkStyle}>الفرق الطبية</NavLink>
        <NavLink to="/donations" style={linkStyle}>التبرعات</NavLink>
      </div>

      {/* ===== LOGOUT ===== */}
      <div style={{ padding: "16px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <button onClick={logout} style={logoutBtn}>
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const sidebar = {
  height: "100vh",
  background: "#C22129",
  color: "white",
  display: "flex",
  flexDirection: "column",
  position: "fixed",
  right: 0,
  top: 0,
  zIndex: 1000,
  transition: "transform 0.3s ease-in-out",
};

const logoBox = {
  textAlign: "center",
  padding: "20px 10px",
  borderBottom: "1px solid rgba(255,255,255,0.25)",
  marginBottom: "12px",
};

const logoutBtn = {
  width: "100%",
  padding: "10px",
  background: "rgba(255,255,255,0.2)",
  border: "none",
  color: "white",
  cursor: "pointer",
  borderRadius: "8px",
  fontSize: "14px",
};
