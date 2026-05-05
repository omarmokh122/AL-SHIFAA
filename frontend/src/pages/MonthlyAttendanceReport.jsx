import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { exportMonthlyAttendanceExcel } from "../utils/exportUtils";

export default function MonthlyAttendanceReport() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user"));

    const [records, setRecords] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [generated, setGenerated] = useState(false);

    const [month, setMonth] = useState("");
    const [year, setYear] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedBranch, setSelectedBranch] = useState(
        user.role === "super" ? "All" : user.branch
    );
    const [isExpanded, setIsExpanded] = useState(false);

    const [stats, setStats] = useState({
        totalRecords: 0,
        totalMedics: 0,
        presentCount: 0,
        absentCount: 0,
        attendanceRate: 0,
        shifts: {},
        medicStats: [],
    });

    /* ================= LOAD DATA ================= */
    useEffect(() => {
        api.get("/attendance")
            .then((res) => setRecords(res.data.data || []))
            .catch(() => console.warn("Could not load attendance records"));
    }, []);

    const months = [
        { v: "01", l: "كانون الثاني" }, { v: "02", l: "شباط" },
        { v: "03", l: "آذار" }, { v: "04", l: "نيسان" },
        { v: "05", l: "أيار" }, { v: "06", l: "حزيران" },
        { v: "07", l: "تموز" }, { v: "08", l: "آب" },
        { v: "09", l: "أيلول" }, { v: "10", l: "تشرين الأول" },
        { v: "11", l: "تشرين الثاني" }, { v: "12", l: "كانون الأول" },
    ];

    const years = [2024, 2025, 2026, 2027];

    /* ================= GENERATE REPORT ================= */
    const generateReport = () => {
        if ((!month || !year) && (!startDate || !endDate)) {
            alert("يرجى اختيار الشهر والسنة، أو تحديد فترة زمنية (من - إلى)");
            return;
        }

        const base = records.filter((r) => {
            const dateStr = r[1]; // YYYY-MM-DD
            const matchBranch = user.role === "super"
                ? (selectedBranch === "All" ? true : (r[2] || "").includes(selectedBranch))
                : (r[2] || "").includes(user.branch);

            if (!matchBranch) return false;

            if (startDate && endDate) {
                return dateStr >= startDate && dateStr <= endDate;
            } else {
                // Match by month/year — date is YYYY-MM-DD
                return dateStr?.startsWith(`${year}-${month}`);
            }
        });

        // Compute stats
        const presentCount = base.filter((r) => r[5] === "حاضر").length;
        const absentCount = base.filter((r) => r[5] === "غائب").length;
        const uniqueMedics = new Set(base.map((r) => r[4])).size;
        const shifts = {};
        const medicDetails = {};

        base.forEach((r) => {
            const shift = r[3] || "غير محدد";
            shifts[shift] = (shifts[shift] || 0) + 1;

            const medicName = r[4];
            const status = r[5];
            if (!medicDetails[medicName]) {
                medicDetails[medicName] = { present: 0, absent: 0, total: 0 };
            }
            medicDetails[medicName].total += 1;
            if (status === "حاضر") medicDetails[medicName].present += 1;
            if (status === "غائب") medicDetails[medicName].absent += 1;
        });

        const medicStatsArray = Object.entries(medicDetails).map(([name, data]) => ({
            name,
            ...data,
            rate: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0
        })).sort((a, b) => b.rate - a.rate);

        setFiltered(base);
        setStats({
            totalRecords: base.length,
            totalMedics: uniqueMedics,
            presentCount,
            absentCount,
            attendanceRate: base.length > 0 ? Math.round((presentCount / base.length) * 100) : 0,
            shifts,
            medicStats: medicStatsArray,
        });
        setGenerated(true);
    };

    /* ================= EXPORT ================= */
    const exportExcel = async () => {
        if (!generated) {
            alert("يرجى إنشاء التقرير أولاً");
            return;
        }
        const branchName = user.role === "super"
            ? (selectedBranch === "All" ? "كل الفروع" : selectedBranch)
            : user.branch;

        const monthLabel = month ? months.find((m) => m.v === month)?.l || month : "";
        const range = (startDate && endDate) ? { start: startDate, end: endDate } : null;
        const fileName = range
            ? `تقرير_الحضور_من_${startDate}_إلى_${endDate}.xlsx`
            : `تقرير_الحضور_${monthLabel}_${year}.xlsx`;

        await exportMonthlyAttendanceExcel(filtered, branchName, year, monthLabel, fileName, range);
    };

    const getMonthLabel = () => {
        if (month) return months.find((m) => m.v === month)?.l || month;
        return "";
    };

    /* ================= UI ================= */
    return (
        <div dir="rtl" style={page}>
            <div style={header}>
                <h2 style={pageTitle}>التقرير الشهري للحضور</h2>
                <button onClick={() => navigate("/attendance-tracker")} style={backBtn}>
                    رجوع
                </button>
            </div>

            <div style={filterBox}>
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

                {user.role === "super" && (
                    <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} style={selectMini}>
                        <option value="All">كل الفروع</option>
                        <option value="البقاع الأوسط">البقاع الأوسط</option>
                        <option value="بعلبك">بعلبك</option>
                    </select>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <label style={{ fontSize: "12px", whiteSpace: "nowrap" }}>من:</label>
                    <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setMonth(""); setYear(""); }} style={selectMini} />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <label style={{ fontSize: "12px", whiteSpace: "nowrap" }}>إلى:</label>
                    <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setMonth(""); setYear(""); }} style={selectMini} />
                </div>

                <button
                    onClick={() => {
                        setMonth(""); setYear(""); setStartDate(""); setEndDate("");
                        if (user.role === "super") setSelectedBranch("All");
                        setGenerated(false);
                    }}
                    title="إلغاء الفلاتر"
                    style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: "8px" }}
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="#C22129" xmlns="http://www.w3.org/2000/svg"><path d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 .77 1.64l-6.27 7.53V19a1 1 0 0 1-1.45.89l-4-2A1 1 0 0 1 9 17v-3.83L3.23 5.64A1 1 0 0 1 3 5V4z"/></svg>
                </button>

                <button onClick={generateReport} style={primaryBtn}>
                    إنشاء التقرير
                </button>

                {generated && (
                    <button onClick={exportExcel} style={secondaryBtn}>
                        تحميل Excel
                    </button>
                )}
            </div>

            {generated && (
                <>
                    {/* Summary */}
                    <div style={summary}>
                        <h4>ملخص تنفيذي</h4>
                        <p>
                            يعرض هذا التقرير سجلات حضور المسعفين
                            {startDate && endDate ? (
                                <> من تاريخ <strong>{startDate}</strong> إلى <strong>{endDate}</strong> </>
                            ) : (
                                <> خلال شهر <strong>{getMonthLabel()}</strong> من سنة <strong>{year}</strong> </>
                            )}
                            في <strong>{user.role === "super" ? (selectedBranch === "All" ? "جميع الفروع" : selectedBranch) : user.branch}</strong>.
                        </p>
                        <div style={{ display: "flex", gap: "15px", marginTop: "15px", flexWrap: "wrap" }}>
                            <div style={statPill}><strong>إجمالي السجلات:</strong> {stats.totalRecords}</div>
                            <div style={statPill}><strong>عدد المسعفين:</strong> {stats.totalMedics}</div>
                            <div style={{ ...statPill, borderColor: "#c8e6c9" }}><strong>حاضر:</strong> <span style={{ color: "#2e7d32" }}>{stats.presentCount}</span></div>
                            <div style={{ ...statPill, borderColor: "#ffcdd2" }}><strong>غائب:</strong> <span style={{ color: "#c62828" }}>{stats.absentCount}</span></div>
                            <div style={{ ...statPill, borderColor: "#bbdefb" }}><strong>نسبة الحضور:</strong> <span style={{ color: "#1565c0" }}>{stats.attendanceRate}%</span></div>
                        </div>

                        {Object.keys(stats.shifts).length > 0 && (
                            <div style={{ marginTop: "14px", borderTop: "1px solid #eee", paddingTop: "10px" }}>
                                <strong style={{ fontSize: "13px", color: "#555", display: "block", marginBottom: "8px" }}>توزيع حسب الدوام:</strong>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                    {Object.entries(stats.shifts).map(([k, v]) => (
                                        <span key={k} style={{ ...typeBadge, background: "#f8f9fa" }}>{k} <strong style={{ color: "#1565c0" }}>{v}</strong></span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Medic Attendance Summary Table */}
                    {stats.medicStats && stats.medicStats.length > 0 && (
                        <div style={tableBox}>
                            <h4 style={{ margin: "0 0 10px 0" }}>ملخص حضور المسعفين</h4>
                            <table style={table}>
                                <thead>
                                    <tr>
                                        <th style={th}>المسعف</th>
                                        <th style={th}>أيام الحضور</th>
                                        <th style={th}>أيام الغياب</th>
                                        <th style={th}>إجمالي الأيام المجدولة</th>
                                        <th style={th}>نسبة الحضور</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.medicStats.map((m, i) => (
                                        <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                                            <td style={td}><strong>{m.name}</strong></td>
                                            <td style={{...td, color: "#2e7d32", fontWeight: "bold"}}>{m.present}</td>
                                            <td style={{...td, color: "#c62828", fontWeight: "bold"}}>{m.absent}</td>
                                            <td style={td}>{m.total}</td>
                                            <td style={{
                                                ...td,
                                                fontWeight: "bold",
                                                color: m.rate >= 80 ? "#2e7d32" : m.rate >= 50 ? "#e65100" : "#c62828"
                                            }}>
                                                {m.rate}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Details Toggle */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", marginBottom: "10px" }}>
                        <h4 style={{ margin: 0 }}>تفاصيل الحضور</h4>
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
                                        <th style={th}>التاريخ</th>
                                        <th style={th}>الفرع</th>
                                        <th style={th}>الدوام</th>
                                        <th style={th}>المسعف</th>
                                        <th style={th}>الحالة</th>
                                        <th style={th}>المسجِّل</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((r, i) => (
                                        <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                                            <td style={td}>{r[1]}</td>
                                            <td style={td}>{r[2]}</td>
                                            <td style={td}>{r[3]}</td>
                                            <td style={td}>{r[4]}</td>
                                            <td style={{
                                                ...td,
                                                color: r[5] === "حاضر" ? "#2e7d32" : "#c62828",
                                                fontWeight: "bold",
                                            }}>
                                                {r[5] === "حاضر" ? "✅ حاضر" : "❌ غائب"}
                                            </td>
                                            <td style={td}>{r[6]}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

/* ================= Styles ================= */
const page = { padding: "24px", background: "#f9f9f9", width: "100%", minHeight: "100vh" };
const pageTitle = { marginBottom: "20px" };
const header = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" };
const backBtn = { background: "#C22129", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" };

const filterBox = {
    display: "flex", gap: "10px", background: "#fff", padding: "12px",
    borderRadius: "8px", alignItems: "center", flexWrap: "nowrap", overflowX: "auto",
};

const selectMini = { padding: "8px", borderRadius: "6px", border: "1px solid #ddd", outline: "none", minWidth: "100px" };

const summary = { background: "#fff", padding: "16px", borderRadius: "8px", marginTop: "16px" };

const statPill = {
    background: "#f4f6f8", padding: "7px 16px", borderRadius: "20px",
    fontSize: "14px", color: "#333", border: "1px solid #e1e4e8",
    display: "flex", gap: "6px", alignItems: "center",
};

const typeBadge = {
    background: "#fff", border: "1px solid #ddd", borderRadius: "12px",
    padding: "4px 12px", fontSize: "13px", color: "#444",
    display: "inline-flex", gap: "6px", alignItems: "center",
};

const tableBox = { marginTop: "20px", background: "#fff", padding: "12px", borderRadius: "8px", overflowX: "auto" };
const table = { width: "100%", borderCollapse: "collapse" };
const th = { background: "#C22129", color: "#fff", padding: "10px 12px", border: "1px solid #a81c22", fontSize: "13px", textAlign: "center" };
const td = { padding: "10px 12px", border: "1px solid #eee", fontSize: "13px", textAlign: "center" };

const primaryBtn = { background: "#C22129", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "8px", cursor: "pointer", fontSize: "14px" };
const secondaryBtn = { background: "#424443", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "8px", cursor: "pointer", fontSize: "14px", whiteSpace: "nowrap" };
