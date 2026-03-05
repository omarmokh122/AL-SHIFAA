import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { exportFinancialTemplateExcel, exportAnnualFinancialExcel } from "../utils/exportUtils";

const ARABIC_MONTHS = [
    { v: 1, l: "كانون الثاني" },
    { v: 2, l: "شباط" },
    { v: 3, l: "آذار" },
    { v: 4, l: "نيسان" },
    { v: 5, l: "أيار" },
    { v: 6, l: "حزيران" },
    { v: 7, l: "تموز" },
    { v: 8, l: "آب" },
    { v: 9, l: "أيلول" },
    { v: 10, l: "تشرين الأول" },
    { v: 11, l: "تشرين الثاني" },
    { v: 12, l: "كانون الأول" },
];

export default function MonthlyFinancialReport() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user"));

    const [data, setData] = useState([]);
    const [month, setMonth] = useState("");
    const [year, setYear] = useState("");
    const [selectedBranch, setSelectedBranch] = useState("All");
    const [filtered, setFiltered] = useState([]);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [fullscreen, setFullscreen] = useState(false);

    const LBP_RATE = 89000; // 1$ = 89,000 ل.ل

    /* ================= FETCH ================= */
    useEffect(() => {
        api.get("/financial")
            .then((res) => {
                const rows = res.data.data || [];
                // Debug: log first few column B values
                console.log("Col B (التاريخ) samples:", rows.slice(0, 5).map(r => r[1]));
                setData(rows);
            })
            .catch(() => alert("خطأ في جلب البيانات المالية"));
    }, []);

    /* ================= DATE PARSING ================= */
    function parseDate(dateStr) {
        if (!dateStr || typeof dateStr !== "string") return null;
        const raw = dateStr.trim();
        // MM/DD/YYYY or M/D/YYYY with optional time
        const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (m) return new Date(`${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`);
        // YYYY-MM-DD
        return new Date(raw);
    }

    /* ================= FILTER ================= */
    function generateReport() {
        if (!month || !year) { alert("اختر الشهر والسنة"); return; }

        const result = data.filter((row) => {
            const date = parseDate(row[1]); // Column B = التاريخ
            if (!date || isNaN(date.getTime())) return false;
            const matchMonth = date.getMonth() + 1 === Number(month);
            const matchYear = date.getFullYear() === Number(year);
            let matchBranch;
            if (user.role === "super") {
                matchBranch = selectedBranch === "All" ? true : (row[17] || "").includes(selectedBranch);
            } else {
                matchBranch = (row[17] || "").includes(user.branch);
            }
            return matchMonth && matchYear && matchBranch;
        });

        setFiltered(result.reverse());
        setSelectedInvoice(null);
        setFullscreen(false);
    }

    /* ================= CALCULATIONS ================= */
    let totalUSD = 0;
    let totalLBP = 0;
    const categoryTotals = {};

    filtered.forEach((row) => {
        const amount = Number(row[15]) || 0;
        const currency = row[14] || "";
        const category = row[2];
        if (currency.includes("دولار")) totalUSD += amount;
        else totalLBP += amount;
        categoryTotals[category] = (categoryTotals[category] || 0) + amount;
    });

    const monthLabel = ARABIC_MONTHS.find(m => m.v === Number(month))?.l || month;
    const branchLabel = user.role === "super" ? (selectedBranch === "All" ? "كل الفروع" : selectedBranch) : (user.branch || "");
    const supervisorName = user.name || user.username || "";
    const totalUSD_unified = totalUSD + totalLBP / LBP_RATE;

    const exportMonthlyTemplate = async () => {
        if (!month || !year) { alert("اختر الشهر والسنة"); return; }
        if (!filtered.length) { alert("لا توجد بيانات للتصدير"); return; }
        await exportFinancialTemplateExcel(
            monthLabel, year, branchLabel, supervisorName,
            filtered,
            `مصاريف_الاسعاف_${monthLabel}_${year}.xlsx`
        );
    };

    const exportAnnualTemplate = async () => {
        if (!year) { alert("اختر السنة أولاً"); return; }
        await exportAnnualFinancialExcel(
            year, branchLabel, data,
            `مصاريف_سنوي_${year}.xlsx`
        );
    };

    /* ================= DRIVE PREVIEW ================= */
    function getPreviewLink(url) {
        if (!url) return "";
        if (url.includes("/preview")) return url;
        if (url.includes("open?id=")) return `https://drive.google.com/file/d/${url.split("id=")[1]}/preview`;
        if (url.includes("/file/d/")) return `https://drive.google.com/file/d/${url.split("/file/d/")[1].split("/")[0]}/preview`;
        return url;
    }

    /* ================= UI ================= */
    return (
        <div dir="rtl" style={{ padding: "24px", width: "100%" }}>
            <div style={headerStyle}>
                <h2 style={{ margin: 0 }}>التقرير المالي الشهري</h2>
                <button onClick={() => navigate("/financial")} style={backBtn}>رجوع</button>
            </div>

            {/* ===== FILTERS ===== */}
            <div style={filterBox}>
                <select value={month} onChange={(e) => setMonth(e.target.value)}>
                    <option value="">الشهر</option>
                    {ARABIC_MONTHS.map(({ v, l }) => (
                        <option key={v} value={v}>{l}</option>
                    ))}
                </select>

                <select value={year} onChange={(e) => setYear(e.target.value)}>
                    <option value="">السنة</option>
                    {[2024, 2025, 2026, 2027].map((y) => (
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

                <button onClick={generateReport} style={btnPrimary}>إنشاء التقرير</button>
                <button onClick={exportMonthlyTemplate} style={{ ...btnSecondary, background: "#0d6efd" }}>
                    تصدير التقرير الشهري (قالب)
                </button>
                <button onClick={exportAnnualTemplate} style={{ ...btnSecondary, background: "#198754" }}>
                    تصدير التقرير السنوي (قالب)
                </button>
            </div>

            {filtered.length > 0 && (
                <>
                    {/* ===== SUMMARY CARDS ===== */}
                    <div style={cardsGrid}>
                        <div style={card}>
                            <div style={{ fontSize: '13px', color: '#555' }}>إجمالي بالدولار</div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{totalUSD.toLocaleString()} $</div>
                        </div>
                        <div style={card}>
                            <div style={{ fontSize: '13px', color: '#555' }}>إجمالي بالليرة</div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{totalLBP.toLocaleString()} ل.ل</div>
                        </div>
                        <div style={card}>
                            <div style={{ fontSize: '13px', color: '#555' }}>عدد العمليات</div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{filtered.length}</div>
                        </div>
                        <div style={{ ...card, borderColor: '#C22129', borderWidth: '2px' }}>
                            <div style={{ fontSize: '12px', color: '#C22129', fontWeight: 'bold' }}>المجموع الموحد ($)</div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#C22129' }}>{totalUSD_unified.toFixed(2)} $</div>
                            <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>(سعر الصرف: 1$ = 89,000 ل.ل)</div>
                        </div>
                    </div>

                    {Object.keys(categoryTotals).length > 0 && (
                        <div style={{ background: '#fff', padding: '14px', borderRadius: '10px', marginBottom: '16px', border: '1px solid #eee' }}>
                            <strong style={{ fontSize: '13px', color: '#555', display: 'block', marginBottom: '8px' }}>توزيع حسب الفئة:</strong>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {Object.entries(categoryTotals).map(([k, v]) => (
                                    <span key={k} style={catBadge}>{k} <strong style={{ color: '#C22129' }}>{v.toLocaleString()}</strong></span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ===== TABLE + PREVIEW ===== */}
                    <div style={layoutGrid}>
                        <div style={{ overflowX: "auto" }}>
                            <table style={table}>
                                <thead>
                                    <tr>
                                        <th>التاريخ</th>
                                        <th>الفئة</th>
                                        <th>نوع المصروف</th>
                                        <th>المبلغ</th>
                                        <th>العملة</th>
                                        <th>الفرع</th>
                                        <th>الفاتورة</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((r, i) => (
                                        <tr
                                            key={i}
                                            style={{
                                                cursor: r[16] ? "pointer" : "default",
                                                background: selectedInvoice === r[16] ? "#f5f5f5" : "transparent",
                                            }}
                                            onClick={() => r[16] && setSelectedInvoice(r[16])}
                                        >
                                            <td>{r[1]}</td>
                                            <td>{r[2]}</td>
                                            <td>{r[3]}</td>
                                            <td>
                                                {Number(r[15]).toLocaleString()}
                                                <span style={{ fontSize: '11px', color: '#888', marginRight: '4px' }}>
                                                    {(r[14] || '').includes('دولار') ? ' $' : ' ل.ل'}
                                                </span>
                                            </td>
                                            <td>{r[14]}</td>
                                            <td>{r[17]}</td>
                                            <td style={{ color: "#C22129", fontWeight: "bold" }}>
                                                {r[16] ? "معاينة" : "-"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* PREVIEW */}
                        <div style={previewBox}>
                            {selectedInvoice ? (
                                <>
                                    <div style={previewHeader}>
                                        <h4 style={{ margin: 0 }}>معاينة الفاتورة</h4>
                                        <button onClick={() => setFullscreen(true)} style={zoomBtn}>تكبير</button>
                                    </div>
                                    <iframe src={getPreviewLink(selectedInvoice)} style={iframeStyle} title="Invoice Preview" />
                                </>
                            ) : (
                                <p style={{ color: "#777", textAlign: "center", marginTop: "40px" }}>اختر صفًا لعرض الفاتورة</p>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* ===== FULLSCREEN MODAL ===== */}
            {fullscreen && selectedInvoice && (
                <div style={modalOverlay}>
                    <div style={modalContent}>
                        <button onClick={() => setFullscreen(false)} style={closeBtn}>✕</button>
                        <iframe src={getPreviewLink(selectedInvoice)} style={{ width: "100%", height: "100%", border: "none" }} title="Invoice Fullscreen" />
                    </div>
                </div>
            )}
        </div>
    );
}

/* ================= STYLES ================= */
const filterBox = { display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" };
const cardsGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' };
const card = { background: '#fff', border: '1px solid #ddd', borderRadius: '10px', padding: '16px', textAlign: 'center' };
const catBadge = { background: "#fff", border: "1px solid #ddd", borderRadius: "12px", padding: "4px 12px", fontSize: "13px", color: "#444", display: "inline-flex", gap: "6px", alignItems: "center" };
const layoutGrid = { display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px", marginTop: "20px" };
const previewBox = { background: "#fff", border: "1px solid #ddd", borderRadius: "10px", padding: "12px" };
const previewHeader = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" };
const iframeStyle = { width: "100%", height: "420px", border: "1px solid #ddd", borderRadius: "8px" };
const zoomBtn = { background: "#424443", color: "#fff", border: "none", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" };
const btnPrimary = { background: "#C22129", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", cursor: "pointer" };
const btnSecondary = { background: "#0d6efd", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "14px" };
const table = { width: "100%", borderCollapse: "collapse" };
const modalOverlay = { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center" };
const modalContent = { width: "90%", height: "90%", background: "#fff", borderRadius: "10px", position: "relative" };
const closeBtn = { position: "absolute", top: "10px", right: "10px", background: "#C22129", color: "#fff", border: "none", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer" };
const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" };
const backBtn = { background: "#C22129", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" };
