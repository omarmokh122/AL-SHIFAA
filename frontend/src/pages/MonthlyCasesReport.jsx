import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { exportStyledExcel, exportYearlyCasesTemplateExcel, exportMonthlyCasesTemplateExcel } from "../utils/exportUtils";

const CASE_TYPES = [
    "كسور",
    "حادث",
    "أمراض قلبية",
    "جهاز تنفسي",
    "حالات طبية",
    "جراحة",
    "جثة",
    "حروق",
    "جروح",
    "كورونا",
    "متابعة",
    "دفاع مدني",
    "حالات عصبية",
    "حالات طارئة",
    "نقل إصابات وجرحى",
    "نقل شهداء",
    "علاج ميداني",
    "تأمين نازحين (عوائل)",
    "توزيع أدوية",
    "تأمين معدات طبية",
    "توزيع حليب",
    "توزيع حفاضات",
    "تلبية استهدافات",
    "انتخابات – نقل ناخبين من ذوي الاحتياجات الخاصة",
    "متابعة منزلية للمرضى"
];

export default function MonthlyCasesReport() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user"));

    const [cases, setCases] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [generated, setGenerated] = useState(false);

    const [month, setMonth] = useState("");
    const [year, setYear] = useState("");
    const [selectedType, setSelectedType] = useState("ALL");
    const [selectedBranch, setSelectedBranch] = useState("All");

    const [stats, setStats] = useState({
        total: 0,
        male: 0,
        female: 0,
        types: {},
    });

    /* ================= LOAD DATA ================= */
    useEffect(() => {
        api.get("/cases").then((res) => {
            setCases(res.data.data || []);
        });
    }, []);

    const months = [
        { v: "كانون الثاني", l: "كانون الثاني" }, { v: "شباط", l: "شباط" },
        { v: "آذار", l: "آذار" }, { v: "نيسان", l: "نيسان" },
        { v: "أيار", l: "أيار" }, { v: "حزيران", l: "حزيران" },
        { v: "تموز", l: "تموز" }, { v: "آب", l: "آب" },
        { v: "أيلول", l: "أيلول" }, { v: "تشرين الأول", l: "تشرين الأول" },
        { v: "تشرين الثاني", l: "تشرين الثاني" }, { v: "كانون الأول", l: "كانون الأول" },
    ];

    const years = [2024, 2025, 2026, 2027];

    /* ================= GENERATE REPORT ================= */
    const generateReport = () => {
        if (!month || !year) {
            alert("يرجى اختيار الشهر والسنة");
            return;
        }

        const base = cases.filter((c) => {
            const matchMonth = c[2] === month;
            const matchYear = String(c[3]) === String(year);
            const matchBranch = user.role === "super"
                ? (selectedBranch === "All" ? true : (c[4] || "").includes(selectedBranch))
                : (c[4] || "").includes(user.branch);

            return matchMonth && matchYear && matchBranch;
        });

        applyTypeFilter(base, selectedType);
        setGenerated(true);
    };

    const applyTypeFilter = (data, type) => {
        const result = type === "ALL" ? data : data.filter((c) => c[6] === type);

        const maleCases = result.filter((c) => c[5] === "ذكر").length;
        const femaleCases = result.filter((c) => c[5] === "أنثى").length;

        const types = {};
        data.forEach((c) => {
            types[c[6]] = (types[c[6]] || 0) + 1;
        });

        setFiltered(result);
        setStats({
            total: result.length,
            male: maleCases,
            female: femaleCases,
            types,
        });
    };

    const handleTypeChange = (v) => {
        setSelectedType(v);
        const base = cases.filter((c) => {
            const matchMonth = c[2] === month;
            const matchYear = String(c[3]) === String(year);
            const matchBranch = user.role === "super"
                ? (selectedBranch === "All" ? true : (c[4] || "").includes(selectedBranch))
                : (c[4] || "").includes(user.branch);

            return matchMonth && matchYear && matchBranch;
        });
        applyTypeFilter(base, v);
    };

    const exportExcel = async () => {
        if (!month || !year) {
            alert("يرجى إنشاء التقرير أولاً");
            return;
        }
        const branchName = user.role === "super"
            ? (selectedBranch === "All" ? "كل الفروع" : selectedBranch)
            : user.branch;

        await exportMonthlyCasesTemplateExcel(year, month, branchName, cases, `تقرير_الحالات_${month}_${year}.xlsx`);
    };

    const exportYearlyExcel = async () => {
        if (!year) {
            alert("يرجى اختيار السنة لتصدير التقرير السنوي");
            return;
        }
        const branchName = user.role === "super"
            ? (selectedBranch === "All" ? "كل الفروع" : selectedBranch)
            : user.branch;

        await exportYearlyCasesTemplateExcel(year, branchName, cases, `التقرير_السنوي_للحالات_${year}.xlsx`);
    };

    /* ================= UI ================= */
    return (
        <div dir="rtl" style={page}>
            <div style={header}>
                <h2 style={pageTitle}>التقرير الشهري للحالات</h2>
                <button onClick={() => navigate("/cases")} style={backBtn}>
                    رجوع
                </button>
            </div>

            {/* Filters */}
            <div style={filterBox}>
                <select value={month} onChange={(e) => setMonth(e.target.value)}>
                    <option value="">الشهر</option>
                    {months.map((m) => (
                        <option key={m.v} value={m.v}>{m.l}</option>
                    ))}
                </select>

                <select value={year} onChange={(e) => setYear(e.target.value)}>
                    <option value="">السنة</option>
                    {years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>

                {user.role === "super" && (
                    <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
                        <option value="All">كل الفروع</option>
                        <option value="البقاع الأوسط">البقاع الأوسط</option>
                        <option value="بعلبك">بعلبك</option>
                    </select>
                )}

                <button onClick={generateReport} style={primaryBtn}>
                    إنشاء التقرير
                </button>
            </div>

            {generated && (
                <>
                    {/* Type Filter */}
                    <div style={typeFilter}>
                        <label>نوع الحالة:</label>
                        <select value={selectedType} onChange={(e) => handleTypeChange(e.target.value)}>
                            <option value="ALL">كل الحالات</option>
                            {CASE_TYPES.map((t) => (
                                <option key={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    {/* Executive Summary */}
                    <div style={summary}>
                        <h4>ملخص تنفيذي</h4>
                        <p>
                            يعرض هذا التقرير الحالات الطبية المسجّلة خلال شهر{" "}
                            <strong>{month}</strong> من سنة{" "}
                            <strong>{year}</strong> في{" "}
                            <strong>{user.role === "super" ? (selectedBranch === "All" ? "جميع الفروع" : selectedBranch) : user.branch}</strong>.
                        </p>
                        <p><strong>إجمالي الحالات:</strong> {stats.total}</p>
                    </div>

                    {/* Cards */}
                    <div style={cards}>
                        <Card title="إجمالي الحالات" value={stats.total} />
                        <Card title="ذكور" value={stats.male} />
                        <Card title="إناث" value={stats.female} />
                    </div>

                    {/* Table */}
                    <div style={tableBox}>
                        <table style={table}>
                            <thead>
                                <tr>
                                    <th>التاريخ</th>
                                    <th>الفرع</th>
                                    <th>الجنس</th>
                                    <th>نوع الحالة</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((c, i) => (
                                    <tr key={i}>
                                        <td>{c[1]}</td>
                                        <td>{c[4]}</td>
                                        <td>{c[5]}</td>
                                        <td>{c[6]}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button onClick={exportYearlyExcel} style={{ ...secondaryBtn, background: "#198754" }}>
                            تصدير التقرير السنوي (قالب اكسيل)
                        </button>
                        <button onClick={exportExcel} style={{ ...secondaryBtn, background: "#0d6efd" }}>
                            تصدير التقرير الشهري (قالب اكسيل)
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

/* ================= Components ================= */
function Card({ title, value }) {
    return (
        <div style={card}>
            <span>{title}</span>
            <strong>{value}</strong>
        </div>
    );
}

/* ================= Styles ================= */
const page = {
    padding: "24px",
    background: "#f9f9f9",
    width: "100%",
    minHeight: "100vh",
};

const pageTitle = {
    marginBottom: "20px",
};

const filterBox = {
    display: "flex",
    gap: "12px",
    background: "#fff",
    padding: "12px",
    borderRadius: "8px",
};

const typeFilter = {
    marginTop: "16px",
};

const summary = {
    background: "#fff",
    padding: "16px",
    borderRadius: "8px",
    marginTop: "16px",
};

const cards = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
    marginBottom: "28px",
    marginTop: "16px",
};

const card = {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "16px",
    textAlign: "center",
};

const tableBox = {
    marginTop: "20px",
    background: "#fff",
    padding: "12px",
    borderRadius: "8px",
};

const table = {
    width: "100%",
    borderCollapse: "collapse",
};

const primaryBtn = {
    background: "#C22129",
    color: "#fff",
    border: "none",
    padding: "10px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
};

const secondaryBtn = {
    background: "#424443",
    color: "#fff",
    border: "none",
    padding: "10px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
};

const header = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
};

const backBtn = {
    background: "#C22129",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
};
