import { useLocation } from "react-router-dom";

export default function Header({ onMenuClick, isMobile }) {
  const user = JSON.parse(localStorage.getItem("user"));
  const location = useLocation();

  const today = new Date().toLocaleDateString("ar-LB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const breadcrumbMap = {
    dashboard: "لوحة التحكم",
    cases: "الحالات",
    financial: "المصاريف",
    assets: "الأصول",
    "medical-team": "الفرق الطبية",
    donations: "التبرعات",
    reports: "التقارير",
    "monthly-cases": "تقرير الحالات الشهري",
    "monthly-financial": "التقرير المالي الشهري",
    "monthly-donations": "تقرير التبرعات الشهري",
    "medical-profile": "ملف عضو طبي",
    "medic-schedules": "جدول الدوامات",
    "attendance-tracker": "سجل الحضور",
    "monthly-attendance": "تقرير الحضور الشهري",
    "borrowed-assets": "الأصول المعارة",
  };

  const pathSegments = location.pathname.split("/").filter(Boolean);
  const breadcrumbs = pathSegments.map((segment) => breadcrumbMap[segment] || segment);

  return (
    <div style={{ ...header, ... (isMobile && { gridTemplateColumns: "auto 1fr auto", padding: "0 16px" }) }}>
      {/* ===== RIGHT: USER INFO / MENU ===== */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {isMobile && (
          <button
            onClick={onMenuClick}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
              padding: "0",
              color: "#C22129",
            }}
          >
            ☰
          </button>
        )}
        <div>
          <div style={username}>{isMobile ? user?.username?.split(" ")[0] : user?.username}</div>
          {!isMobile && (
            <div style={role}>
              {user?.role === "super" ? "مدير النظام" : "مسؤول فرع"} –{" "}
              {user?.role === "super" ? "جميع الفروع" : user?.branch}
            </div>
          )}
        </div>
      </div>

      {/* ===== CENTER: BRANDING / PAGE TITLE ===== */}
      <div style={{ ...brandingContainer, display: isMobile ? "none" : "flex" }}>
        <span style={brandTitle}>AL SHIFAA</span>
        {breadcrumbs.length > 0 && (
          <span style={pageIndicator}>
            <span style={{ margin: "0 10px", color: "#ccc" }}>|</span>
            {breadcrumbs[breadcrumbs.length - 1]}
          </span>
        )}
      </div>

      {/* ===== LEFT: DATE ===== */}
      <div style={{ ...date, fontSize: isMobile ? "11px" : "13px" }}>
        {isMobile ? new Date().toLocaleDateString("ar-LB") : today}
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const header = {
  height: "72px",
  background: "#ffffff",
  borderBottom: "1px solid #e0e0e0",
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  alignItems: "center",
  padding: "0 32px",
  boxSizing: "border-box",
};

const username = {
  fontWeight: "bold",
  fontSize: "15px",
};

const role = {
  fontSize: "12px",
  color: "#666",
};

const brandingContainer = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "4px",
};

const brandTitle = {
  fontSize: "20px",
  fontWeight: "900",
  color: "#C22129",
  letterSpacing: "1px",
};

const pageIndicator = {
  fontSize: "18px",
  fontWeight: "bold",
  color: "#444",
};

const date = {
  fontSize: "13px",
  color: "#555",
  textAlign: "left",
};
