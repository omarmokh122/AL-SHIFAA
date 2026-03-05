import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { exportStyledExcel, exportStyledPDF } from "../utils/exportUtils";

export default function MonthlyDonationsReport() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user"));

    const [data, setData] = useState([]);
    const [month, setMonth] = useState("");
    const [year, setYear] = useState("");
    const [selectedBranch, setSelectedBranch] = useState("All");

    const ARABIC_MONTHS = [
        { v: "كانون الثاني", l: "كانون الثاني" }, { v: "شباط", l: "شباط" },
        { v: "آذار", l: "آذار" }, { v: "نيسان", l: "نيسان" },
        { v: "أيار", l: "أيار" }, { v: "حزيران", l: "حزيران" },
        { v: "تموز", l: "تموز" }, { v: "آب", l: "آب" },
        { v: "أيلول", l: "أيلول" }, { v: "تشرين الأول", l: "تشرين الأول" },
        { v: "تشرين الثاني", l: "تشرين الثاني" }, { v: "كانون الأول", l: "كانون الأول" },
    ];

    // Helper to parse date strictly as MM/DD/YYYY if it matches that format
    const parseSheetDate = (str) => {
        if (!str) return null;
        const s = String(str).trim();
        const parts = s.split("/");
        if (parts.length === 3) {
            const m = parseInt(parts[0], 10);
            const d = parseInt(parts[1], 10);
            const y = parseInt(parts[2], 10);
            if (!isNaN(m) && !isNaN(d) && !isNaN(y)) {
                return new Date(y, m - 1, d);
            }
        }
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
    };

    // Split filtered data
    const [incoming, setIncoming] = useState([]);
    const [outgoing, setOutgoing] = useState([]);
    const [generated, setGenerated] = useState(false);

    useEffect(() => {
        api.get("/donations")
            .then((res) => setData(res.data.data || []))
            .catch(() => alert("خطأ في جلب بيانات التبرعات"));
    }, []);

    function generateReport() {
        if (!month || !year) {
            alert("اختر الشهر والسنة");
            return;
        }

        const filtered = data.filter((r) => {
            const date = parseSheetDate(r[1]);
            if (!date) return false;
            const monthNames = [
                "كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران",
                "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"
            ];
            const rowMonth = monthNames[date.getMonth()];
            const rowYear = String(date.getFullYear());

            const matchMonth = rowMonth === month;
            const matchYear = rowYear === String(year);

            let matchBranch = true;
            if (user.role === "super") {
                matchBranch = selectedBranch === "All" ? true : (r[2] || "").includes(selectedBranch);
            } else {
                matchBranch = (r[2] || "").includes(user.branch);
            }

            return matchMonth && matchYear && matchBranch;
        });

        setIncoming(filtered.filter(r => r[4] !== "صرف"));
        setOutgoing(filtered.filter(r => r[4] === "صرف"));
        setGenerated(true);
    }

    /* ===== CALCULATIONS ===== */
    // Incoming
    let inUSD = 0;
    let inLBP = 0;
    let inCashCount = 0;
    let inKindQty = 0;

    incoming.forEach((r) => {
        if (r[4] === "نقدي") {
            inCashCount++;
            const val = Number(r[6] || 0);
            const cur = (r[7] || "").toUpperCase();
            if (cur === "USD" || cur === "$") inUSD += val;
            else inLBP += val;
        }
        if (r[4] === "عيني") {
            const val = parseFloat(String(r[9] || "0").replace(/[^0-9.]/g, ""));
            inKindQty += isNaN(val) ? 0 : val;
        }
    });

    // Outgoing
    let outUSD = 0;
    let outLBP = 0;
    outgoing.forEach((r) => {
        const val = Number(r[6] || 0);
        const cur = (r[7] || "").toUpperCase();
        if (cur === "USD" || cur === "$") outUSD += val;
        else outLBP += val;
    });

    // Net for this month (Note: This is just monthly net, not total accumulated balance)
    const netUSD = inUSD - outUSD;
    const netLBP = inLBP - outLBP;

    /* ===== EXPORT ===== */
    const exportExcel = async () => {
        const title = "تقرير التبرعات والمصاريف الشهري";
        const subtitle = `شهر ${month} سنة ${year}`;
        const medicName = user.name || user.username || "غير محدد";
        const headers = ["التاريخ", "الفرع", "النوع", "المتبرع / البيان", "المبلغ", "العملة", "ملاحظات"];

        // Merge incoming and outgoing for a single cohesive report
        const inRows = incoming.map(r => [r[1], r[2], "واردات", r[3] || "غير محدد", r[6], r[7] || "", r[12] || ""]);
        const outRows = outgoing.map(r => [r[1], r[2], "مصروفات", r[10] || "غير محدد", r[6], r[7] || "", r[12] || ""]);
        const rows = [...inRows, ...outRows];

        await exportStyledExcel(title, subtitle, medicName, headers, rows, `تقرير_تبرعات_${month}_${year}.xlsx`);
    };

    const exportPDF = async () => {
        const title = "تقرير التبرعات والمصاريف الشهري";
        const subtitle = `شهر ${month} سنة ${year}`;
        const medicName = user.name || user.username || "غير محدد";
        const headers = [["التاريخ", "الفرع", "النوع", "المتبرع / البيان", "المبلغ", "العملة", "ملاحظات"]];

        const inRows = incoming.map(r => [r[1], r[2], "واردات", r[3] || "غير محدد", r[6], r[7] || "", r[12] || ""]);
        const outRows = outgoing.map(r => [r[1], r[2], "مصروفات", r[10] || "غير محدد", r[6], r[7] || "", r[12] || ""]);
        const rows = [...inRows, ...outRows];

        await exportStyledPDF(title, subtitle, medicName, headers, rows, `تقرير_تبرعات_${month}_${year}.pdf`);
    };

    return (
        <div dir="rtl" style={{ padding: "24px", width: "100%" }}>
            <div style={header}>
                <h2 style={{ margin: 0 }}>تقرير التبرعات والمصروفات الشهري</h2>
                <button onClick={() => navigate("/donations")} style={backBtn}>
                    رجوع
                </button>
            </div>

            <div style={filterBox}>
                <select value={month} onChange={(e) => setMonth(e.target.value)} style={select}>
                    <option value="">الشهر</option>
                    {ARABIC_MONTHS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
                </select>

                <select value={year} onChange={(e) => setYear(e.target.value)} style={select}>
                    <option value="">السنة</option>
                    {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
                </select>

                {user.role === "super" && (
                    <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} style={select}>
                        <option value="All">كل الفروع</option>
                        <option value="البقاع الأوسط">البقاع الأوسط</option>
                        <option value="بعلبك">بعلبك</option>
                    </select>
                )}

                <button onClick={generateReport} style={btnPrimary}>
                    إنشاء التقرير
                </button>
            </div>

            {generated && (
                <>
                    {/* Summary Cards */}
                    <div style={cardsGrid}>
                        <Card title="إجمالي الواردات (USD)" value={`${inUSD.toLocaleString()} $`} color="#17a2b8" />
                        <Card title="إجمالي المصروفات (USD)" value={`${outUSD.toLocaleString()} $`} color="#ffc107" />
                        <Card
                            title="صافي حركة الشهر (USD)"
                            value={`${netUSD.toLocaleString()} $`}
                            color={netUSD >= 0 ? "#28a745" : "#dc3545"}
                        />
                        <Card title="عدد التبرعات النقدية" value={inCashCount} color="#6c757d" />
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                        <button onClick={exportExcel} style={btnSecondary}>تصدير Excel</button>
                        <button onClick={exportPDF} style={btnSecondary}>تصدير PDF</button>
                    </div>

                    {/* Tables */}
                    <div style={{ display: "grid", gap: "20px" }}>
                        <SectionTable title="سجل الواردات" data={incoming} type="in" />
                        <SectionTable title="سجل المصروفات" data={outgoing} type="out" />
                    </div>
                </>
            )}
        </div>
    );
}

function SectionTable({ title, data, type }) {
    return (
        <div style={sectionStyle}>
            <h4 style={{ marginBottom: "10px", color: type === "in" ? "#17a2b8" : "#ffc107" }}>{title}</h4>
            <div className="table-container">
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ background: "#eee" }}>
                            <th>التاريخ</th>
                            <th>{type === "in" ? "المتبرع" : "بيان الصرف"}</th>
                            <th>المبلغ</th>
                            <th>العملة</th>
                            <th>ملاحظات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.length === 0 ? (
                            <tr><td colSpan="5" style={{ textAlign: "center", padding: "10px" }}>لا توجد بيانات</td></tr>
                        ) : (
                            data.map((r, i) => (
                                <tr key={i} style={{ borderBottom: "1px solid #ddd" }}>
                                    <td style={{ padding: "8px" }}>{r[1]}</td>
                                    <td style={{ padding: "8px" }}>{type === "in" ? r[3] : r[10]}</td>
                                    <td style={{ padding: "8px", fontWeight: "bold" }}>{r[6]}</td>
                                    <td style={{ padding: "8px" }}>{r[7]}</td>
                                    <td style={{ padding: "8px" }}>{r[12]}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function Card({ title, value, color }) {
    return (
        <div style={{ ...card, borderBottom: `4px solid ${color}` }}>
            <div style={{ fontSize: "12px", color: "#666" }}>{title}</div>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#333" }}>{value}</div>
        </div>
    );
}

const select = { padding: "8px", borderRadius: "6px", border: "1px solid #ddd" };
const filterBox = { display: "flex", gap: "10px", marginBottom: "20px", background: "#fff", padding: "15px", borderRadius: "8px" };
const cardsGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "28px" };
const card = { background: "#fff", border: "1px solid #ddd", padding: "16px", borderRadius: "10px", textAlign: "center" };
const btnPrimary = { background: "#C22129", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" };
const btnSecondary = { background: "#424443", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "14px" };
const header = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" };
const backBtn = { background: "#C22129", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" };
const sectionStyle = { background: "#fff", padding: "15px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" };
