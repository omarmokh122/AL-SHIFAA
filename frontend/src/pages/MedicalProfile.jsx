import { useLocation, useNavigate } from "react-router-dom";

const DEFAULT_IMG =
    "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

export default function MedicalProfile() {
    const { state } = useLocation();
    const navigate = useNavigate();
    const m = state?.member;

    if (!m) return <p>لا توجد بيانات</p>;

    return (
        <div dir="rtl" style={page}>
            {/* ===== HEADER ===== */}
            <div style={header}>
                <button onClick={() => navigate(-1)} style={backBtn}>
                    ⬅ رجوع
                </button>
            </div>

            {/* ===== PROFILE HEADER ===== */}
            <div style={profileHeader}>
                <img
                    src={m[13] || DEFAULT_IMG}
                    alt="profile"
                    style={avatar}
                    onError={(e) => (e.target.src = DEFAULT_IMG)}
                />

                <div>
                    <h2>{m[1]}</h2>
                    <p style={{ color: "#666" }}>{m[2]}</p>
                </div>
            </div>

            {/* ===== DETAILS ===== */}
            <div style={detailsGrid}>
                <Detail title="فئة الدم" value={m[4]} />
                <Detail title="تاريخ الميلاد" value={m[5]} />
                <Detail title="الوضع الاجتماعي" value={m[6]} />
                <Detail title="عدد الأولاد" value={m[7]} />
                <Detail title="المستوى التعليمي" value={m[8]} />
                <Detail title="استلام بدلة" value={m[9]} />
                <Detail title="رقم الهاتف" value={m[10]} />
                <Detail title="استلام بطاقة" value={m[11]} />
                <Detail title="رقم البطاقة" value={m[12]} />
            </div>
        </div>
    );
}

/* ================= COMPONENT ================= */
function Detail({ title, value }) {
    return (
        <div style={card}>
            <div style={{ fontSize: "13px", color: "#666" }}>{title}</div>
            <div style={{ fontSize: "16px", fontWeight: "bold" }}>
                {value || "-"}
            </div>
        </div>
    );
}

/* ================= STYLES ================= */

const page = {
    padding: "20px",
    maxWidth: "1400px",
    margin: "0 auto",
};

const header = {
    marginBottom: "20px",
};

const backBtn = {
    background: "#C22129",
    color: "#fff",
    border: "none",
    padding: "8px 14px",
    borderRadius: "6px",
    cursor: "pointer",
};

const profileHeader = {
    display: "flex",
    gap: "20px",
    alignItems: "center",
    marginBottom: "30px",
};

const avatar = {
    width: "180px",
    height: "180px",
    objectFit: "cover",
    borderRadius: "14px",
};

const detailsGrid = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "16px",
};

const card = {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "16px",
};
