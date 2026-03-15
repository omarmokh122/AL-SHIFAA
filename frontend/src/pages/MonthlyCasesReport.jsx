import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { exportStyledExcel, exportYearlyCasesTemplateExcel, exportMonthlyCasesTemplateExcel } from "../utils/exportUtils";

const CASE_TYPES = [
    "كسور", "حادث", "أمراض قلبية", "جهاز تنفسي", "حالات طبية", "جراحة", "جثة", "حروق", "جروح", "كورونا", "متابعة",
    "دفاع مدني", "حالات عصبية", "حالات طارئة", "نقل إصابات وجرحى", "نقل شهداء", "علاج ميداني", "تأمين نازحين (عوائل)",
    "توزيع أدوية", "تأمين معدات طبية", "توزيع حليب", "توزيع حفاضات", "تلبية استهدافات", "انتخابات – نقل ناخبين من ذوي الاحتياجات الخاصة", "متابعة منزلية للمرضى"
];

const AGE_GROUPS = [
    "\u0623\u0642\u0644 \u0645\u0646 \u0633\u0646\u0629", "1 \u2013 5", "6 \u2013 12", "13 \u2013 17", "18 \u2013 35", "36 \u2013 60", "\u0623\u0643\u062b\u0631 \u0645\u0646 60", "\u063a\u064a\u0631 \u0645\u062d\u062f\u062f"
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
    const [isExpanded, setIsExpanded] = useState(false);

    const [stats, setStats] = useState({
        total: 0,
        male: 0,
        female: 0,
        types: {},
        ages: {},
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

    // Helper to parse date
    const parseSheetDate = (str) => {
        if (!str) return null;
        const s = String(str).trim();

        // Handle YYYY-MM-DD
        if (s.includes("-")) {
            const parts = s.split("-");
            if (parts.length === 3) {
                const y = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10);
                const d = parseInt(parts[2], 10);
                if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
                    return new Date(y, m - 1, d);
                }
            }
        }

        // Handle MM/DD/YYYY
        if (s.includes("/")) {
            const parts = s.split("/");
            if (parts.length === 3) {
                const m = parseInt(parts[0], 10);
                const d = parseInt(parts[1], 10);
                const y = parseInt(parts[2], 10);
                if (!isNaN(m) && !isNaN(d) && !isNaN(y)) {
                    return new Date(y, m - 1, d);
                }
            }
        }

        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
    };

    /* ================= GENERATE REPORT ================= */
    const generateReport = () => {
        if (!month || !year) {
            alert("يرجى اختيار الشهر والسنة");
            return;
        }

        const base = cases.filter((c) => {
            const d = parseSheetDate(c[1]);
            const monthNames = [
                "كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران",
                "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"
            ];

            const rowMonth = d ? monthNames[d.getMonth()] : "";
            const rowYear = d ? String(d.getFullYear()) : "";

            const matchMonth = rowMonth === month;
            const matchYear = rowYear === String(year);
            const matchBranch = user.role === "super"
                ? (selectedBranch === "All" ? true : (c[4] || "").includes(selectedBranch))
                : (c[4] || "").includes(user.branch);

            return matchMonth && matchYear && matchBranch;
        });

        applyTypeFilter(base, selectedType);
        setGenerated(true);
    };

    const applyTypeFilter = (data, type) => {
        const result = type === "ALL" ? data : data.filter((c) => c[5] === type);

        let maleCases = 0;
        let femaleCases = 0;
        const types = {};
        const ages = {};

        data.forEach((c) => {
            types[c[5]] = (types[c[5]] || 0) + 1;
        });

        result.forEach((c) => {
            let count = parseInt(c[6]) || 1;
            for (let i = 0; i < count; i++) {
                const gender = c[7 + (i * 2)];
                const ageKey = c[8 + (i * 2)] || "غير محدد";

                if (gender === "ذكر") maleCases++;
                else if (gender === "أنثى") femaleCases++;

                ages[ageKey] = (ages[ageKey] || 0) + 1;
            }
        });

        setFiltered(result);
        setStats({
            total: result.length,
            male: maleCases,
            female: femaleCases,
            types,
            ages,
        });
    };

    const handleTypeChange = (v) => {
        setSelectedType(v);
        const base = cases.filter((c) => {
            const d = parseSheetDate(c[1]);
            const monthNames = [
                "كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران",
                "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"
            ];

            const rowMonth = d ? monthNames[d.getMonth()] : "";
            const rowYear = d ? String(d.getFullYear()) : "";

            const matchMonth = rowMonth === month;
            const matchYear = rowYear === String(year);
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

            <div style={filterBox} className="dashboard-grid">
                <select value={month} onChange={(e) => setMonth(e.target.value)} style={selectMini}>
                    <option value="">الشهر</option>
                    {months.map((m) => (
                        <option key={m.v} value={m.v}>{m.l}</option>
                    ))}
                </select>

                <select value={year} onChange={(e) => setYear(e.target.value)} style={selectMini}>
                    <option value="">السنة</option>
                    {years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>

                {
                    user.role === "super" && (
                        <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} style={selectMini}>
                            <option value="All">كل الفروع</option>
                            <option value="البقاع الأوسط">البقاع الأوسط</option>
                            <option value="بعلبك">بعلبك</option>
                        </select>
                    )
                }

                <button
                    onClick={() => {
                        setMonth("");
                        setYear("");
                        if (user.role === "super") setSelectedBranch("All");
                        setGenerated(false);
                    }}
                    title="إلغاء الفلاتر"
                    style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: "8px" }}
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C22129" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                <button onClick={generateReport} style={primaryBtn}>
                    إنشاء التقرير
                </button>

                {
                    generated && (
                        <>
                            <button onClick={exportExcel} style={secondaryBtn}>
                                تقرير شهري
                            </button>
                        </>
                    )
                }
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
                        <div style={{ display: 'flex', gap: '15px', marginTop: '15px', flexWrap: 'wrap' }}>
                            <div style={statPill}><strong>إجمالي الحالات:</strong> {stats.total}</div>
                            <div style={statPill}><strong>ذكور:</strong> {stats.male}</div>
                            <div style={statPill}><strong>إناث:</strong> {stats.female}</div>
                        </div>

                        {Object.keys(stats.ages).length > 0 && (
                            <div style={{ marginTop: '14px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                                <strong style={{ fontSize: '13px', color: '#555', display: 'block', marginBottom: '8px' }}>توزيع الفئات العمرية:</strong>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {Object.entries(stats.ages).filter(([, v]) => v > 0).map(([k, v]) => (
                                        <span key={k} style={{ ...typeBadge, background: '#f8f9fa' }}>{k} <strong style={{ color: '#28a745' }}>{v}</strong></span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Table Header with Expand Toggle */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', marginBottom: '10px' }}>
                        <h4 style={{ margin: 0 }}>تفاصيل الحالات</h4>
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            style={{ ...secondaryBtn, background: "#C22129" }}
                        >
                            {isExpanded ? "إخفاء التفاصيل ▲" : "عرض التفاصيل ▼"}
                        </button>
                    </div>

                    {/* Table */}
                    {isExpanded && (
                        <div style={tableBox}>
                            <table style={table}>
                                <thead>
                                    <tr>
                                        <th>التاريخ</th>
                                        <th>الفرع</th>
                                        <th>نوع الحالة</th>
                                        <th>الجنس</th>
                                        <th>الفئة العمرية</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.flatMap((c, i) => {
                                        const count = parseInt(c[6]) || 1;
                                        return Array.from({ length: count }).map((_, idx) => (
                                            <tr key={`${i}-${idx}`}>
                                                <td>{c[1]}</td>
                                                <td>{c[4]}</td>
                                                <td>{c[5]}</td>
                                                <td>{c[7 + (idx * 2)] || "-"}</td>
                                                <td>{c[8 + (idx * 2)] || "-"}</td>
                                            </tr>
                                        ));
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )
            }
        </div >
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
    gap: "10px",
    background: "#fff",
    padding: "12px",
    borderRadius: "8px",
    alignItems: "center",
    flexWrap: "nowrap", // Keep them together as requested
    overflowX: "auto",  // Allow scroll if tiny screen
};

const selectMini = {
    padding: "8px",
    borderRadius: "6px",
    border: "1px solid #ddd",
    outline: "none",
    minWidth: "100px",
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

const statPill = {
    background: "#f4f6f8",
    padding: "7px 16px",
    borderRadius: "20px",
    fontSize: "14px",
    color: "#333",
    border: "1px solid #e1e4e8",
    display: "flex",
    gap: "6px",
    alignItems: "center",
};

const typeBadge = {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "12px",
    padding: "4px 12px",
    fontSize: "13px",
    color: "#444",
    display: "inline-flex",
    gap: "6px",
    alignItems: "center",
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
    whiteSpace: "nowrap",
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
