import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Breadcrumb from "./Breadcrumb";
import "../responsive.css";

export default function MainLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const location = useLocation();

  // Close menu on navigation
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]); // Explicitly depend on pathname

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) setIsMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <div style={{ direction: "rtl", position: "relative" }}>
      {/* Sidebar */}
      <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} isMobile={isMobile} />

      {/* Mobile Overlay */}
      {isMobile && isMenuOpen && (
        <div className="sidebar-overlay" onClick={() => setIsMenuOpen(false)} />
      )}

      {/* المحتوى الرئيسي */}
      <div
        className="main-content"
        style={{
          marginRight: isMobile ? "0" : "220px",
          transition: "margin-right 0.3s ease",
          minHeight: "100vh",
          background: "#ffffff",
        }}
      >
        <Header onMenuClick={toggleMenu} isMobile={isMobile} />

        {/* محتوى الصفحات */}
        <div
          style={{
            padding: isMobile ? "16px" : "24px 32px",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {!isMobile && <Breadcrumb />}
          <Outlet />
        </div>
      </div>
    </div>
  );
}
