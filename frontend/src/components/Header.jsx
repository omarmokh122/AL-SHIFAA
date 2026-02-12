import { useLocation } from "react-router-dom";

export default function Header() {
  const user = JSON.parse(localStorage.getItem("user"));
  const location = useLocation();

  const today = new Date().toLocaleDateString("ar-LB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  /* ===== BREADCRUMB MAP ===== */
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
  };

  const pathSegments = location.pathname
    .split("/")
    .filter(Boolean);

  const breadcrumbs = pathSegments.map(
    (segment) => breadcrumbMap[segment] || segment
  );

  return (
    <div style={header}>
      {/* ===== RIGHT: USER INFO ===== */}
      <div>
        <div style={username}>{user?.username}</div>
        <div style={role}>
          {user?.role === "super" ? "مدير النظام" : "مسؤول فرع"} –{" "}
          {user?.role === "super" ? "جميع الفروع" : user?.branch}
        </div>
      </div>

      {/* ===== CENTER: BREADCRUMB ===== */}
      <div style={breadcrumb}>
        <span>لوحة التحكم</span>
        {breadcrumbs.map((b, i) => (
          <span key={i}>
            {" "}
            / <span style={{ fontWeight: "500" }}>{b}</span>
          </span>
        ))}
      </div>

      {/* ===== LEFT: DATE ===== */}
      <div style={date}>{today}</div>
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

const breadcrumb = {
  fontSize: "13px",
  color: "#444",
  textAlign: "center",
  whiteSpace: "nowrap",
};

const date = {
  fontSize: "13px",
  color: "#555",
  textAlign: "left",
};
