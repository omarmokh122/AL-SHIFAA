import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

export default function Donations() {
    const user = JSON.parse(localStorage.getItem("user"));
    const navigate = useNavigate();
    const [data, setData] = useState([]);

    useEffect(() => {
        api
            .get("/donations")
            .then((res) => setData(res.data.data || []))
            .catch(() => alert("خطأ في جلب بيانات التبرعات"));
    }, []);

    /* ===== FILTER BY BRANCH ===== */
    const sortedData = [...data].reverse();
    const visible =
        user.role === "super"
            ? sortedData
            : sortedData.filter((r) => (r[2] || "").includes(user.branch));

    /* ===== CALCULATIONS ===== */
    let totalCash = 0;
    let totalInKind = 0;

    visible.forEach((r) => {
        if (r[4] === "مادي") totalCash += Number(r[6] || 0);
        if (r[4] === "عيني") totalInKind += Number(r[9] || 0);
    });

    return (
        <div dir="rtl" style={container}>

            {/* ===== TITLE & DESCRIPTION ===== */}
            <h2 style={title}>إدارة التبرعات</h2>
            <p style={description}>
                يتيح هذا القسم توثيق ومتابعة جميع التبرعات الواردة إلى الجمعية،
                سواء كانت تبرعات نقدية أو عينية، مع إمكانية مراجعة تفاصيل
                كل تبرع حسب الفرع، المتبرع، ونوع التبرع.
                كما يمكن إنشاء تقارير شهرية تساعد الإدارة على
                تحليل مصادر الدعم وآلية توزيعها.
            </p>

            {/* ===== HEADER ACTION ===== */}
            <div style={header}>
                <h3 style={{ margin: 0 }}>سجل التبرعات</h3>

                <button
                    onClick={() => navigate("/reports/monthly-donations")}
                    style={btnSecondary}
                >
                    تقرير التبرعات الشهري
                </button>
            </div>

            {/* ===== SUMMARY CARDS ===== */}
            <div style={cardsGrid}>
                <Card title="عدد التبرعات" value={visible.length} />
                <Card title="إجمالي التبرعات النقدية" value={totalCash} />
                <Card title="إجمالي التبرعات العينية (كمية)" value={totalInKind} />
            </div>

            {/* ===== TABLE ===== */}
            <section style={section}>
                <h4 style={sectionTitle}>تفاصيل التبرعات</h4>

                <div style={{ overflowX: "auto" }}>
                    <table style={table}>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>التاريخ</th>
                                <th>الفرع</th>
                                <th>اسم المتبرع</th>
                                <th>نوع التبرع</th>
                                <th>طريقة التبرع</th>
                                <th>المبلغ</th>
                                <th>العملة</th>
                                <th>التبرع العيني</th>
                                <th>الكمية</th>
                                <th>كيفية الصرف</th>
                                <th>جهة الاستلام</th>
                                <th>ملاحظات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map((r, i) => (
                                <tr key={i}>
                                    <td>{i + 1}</td>
                                    <td>{r[1]}</td>
                                    <td>{r[2]}</td>
                                    <td>{r[3]}</td>
                                    <td>{r[4]}</td>
                                    <td>{r[5]}</td>
                                    <td>{r[6]}</td>
                                    <td>{r[7]}</td>
                                    <td>{r[8]}</td>
                                    <td>{r[9]}</td>
                                    <td>{r[10]}</td>
                                    <td>{r[11]}</td>
                                    <td>{r[12]}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

/* ================= COMPONENT ================= */
function Card({ title, value }) {
    return (
        <div style={card}>
            <div style={{ fontSize: "14px", color: "#555" }}>{title}</div>
            <div style={{ fontSize: "18px", fontWeight: "bold" }}>{value}</div>
        </div>
    );
}

/* ================= STYLES ================= */
const container = {
    padding: "24px",
    width: "100%",
};

const title = {
    marginBottom: "6px",
};

const description = {
    maxWidth: "900px",
    color: "#555",
    lineHeight: "1.7",
    marginBottom: "26px",
};

const header = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "18px",
};

const section = {
    marginBottom: "32px",
};

const sectionTitle = {
    marginBottom: "12px",
};

const cardsGrid = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
    marginBottom: "26px",
};

const card = {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "16px",
    textAlign: "center",
};

const table = {
    width: "100%",
    borderCollapse: "collapse",
};

const btnSecondary = {
    background: "#424443",
    color: "#fff",
    border: "none",
    padding: "10px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
};
