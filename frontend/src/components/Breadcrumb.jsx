import { Link, useLocation } from "react-router-dom";

const LABELS = {
    dashboard: "لوحة التحكم",
    cases: "الحالات",
    financial: "الإدارة المالية",
    assets: "الأصول",
    "medical-team": "الفريق الطبي",
    donations: "التبرعات",
    reports: "التقارير",
    "monthly-cases": "تقرير الحالات الشهري",
    "monthly-financial": "التقرير المالي الشهري",
    "monthly-donations": "تقرير التبرعات الشهري",
};

export default function Breadcrumb() {
    const location = useLocation();
    const parts = location.pathname.split("/").filter(Boolean);

    return (
        <div
            style={{
                fontSize: "13px",
                color: "#666",
                marginBottom: "16px",
            }}
        >
            <Link to="/dashboard" style={linkStyle}>
                لوحة التحكم
            </Link>

            {parts.map((part, index) => {
                const path = "/" + parts.slice(0, index + 1).join("/");
                const label = LABELS[part] || part;

                return (
                    <span key={index}>
                        {" / "}
                        <Link to={path} style={linkStyle}>
                            {label}
                        </Link>
                    </span>
                );
            })}
        </div>
    );
}

const linkStyle = {
    color: "#555",
    textDecoration: "none",
};
