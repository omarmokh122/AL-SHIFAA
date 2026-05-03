import { useEffect, useState } from "react";
import api from "../api";

export default function AttendanceTracker() {
    const user = JSON.parse(localStorage.getItem("user"));
    const [records, setRecords] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
    const [selectedBranch, setSelectedBranch] = useState(
        user.role === "super" ? "" : user.branch
    );
    const [searchTerm, setSearchTerm] = useState("");
    const [showLinks, setShowLinks] = useState(false);

    const appUrl = window.location.origin;

    const branches = ["البقاع الأوسط", "بعلبك"];

    useEffect(() => {
        api.get("/attendance")
            .then((res) => setRecords(res.data.data || []))
            .catch(() => console.warn("Could not load attendance records"));
    }, []);

    // Filter records by month and branch
    const filteredRecords = records.filter((r) => {
        const matchMonth = r[1]?.startsWith(selectedMonth);
        const matchBranch = selectedBranch ? (r[2] || "").includes(selectedBranch) : true;
        return matchMonth && matchBranch;
    });

    // Build attendance matrix: medicName -> { date: status }
    const attendanceMap = {};
    filteredRecords.forEach((r) => {
        const name = r[4]; // MedicName
        const date = r[1]; // Date
        const status = r[5]; // Status
        if (!attendanceMap[name]) attendanceMap[name] = {};
        attendanceMap[name][date] = status;
    });

    // Get unique dates sorted
    const uniqueDates = [...new Set(filteredRecords.map((r) => r[1]))].sort();

    // Filter by search
    const medicNames = Object.keys(attendanceMap).filter((name) =>
        name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Stats
    const medicStats = medicNames.map((name) => {
        const present = Object.values(attendanceMap[name]).filter((s) => s === "حاضر").length;
        const absent = Object.values(attendanceMap[name]).filter((s) => s === "غائب").length;
        const rate = (present + absent) > 0 ? Math.round((present / (present + absent)) * 100) : 0;
        return { name, present, absent, rate };
    });

    const avgRate = medicStats.length > 0
        ? Math.round(medicStats.reduce((s, m) => s + m.rate, 0) / medicStats.length)
        : 0;

    const perfectAttendance = medicStats.filter((m) => m.rate === 100).length;

    return (
        <div dir="rtl" style={page}>
            <div style={headerRow}>
                <h2 style={{ margin: 0 }}>حضور المسعفين</h2>
                <button onClick={() => setShowLinks(!showLinks)} style={actionBtn}>
                    {showLinks ? "إخفاء الروابط" : "🔗 روابط تسجيل الحضور"}
                </button>
            </div>

            <p style={descStyle}>
                متابعة حضور المسعفين. يقوم مسؤول الدوام بفتح رابط تسجيل الحضور الخاص بالفرع لتسجيل الحضور.
            </p>

            {/* Attendance Links */}
            {showLinks && (
                <div style={linksPanel}>
                    <h4 style={{ marginTop: 0 }}>روابط تسجيل الحضور لكل فرع</h4>
                    <p style={{ fontSize: "12px", color: "#666", marginBottom: "12px" }}>
                        شارك هذه الروابط مع مسؤولي الدوام. عند فتح الرابط، سيظهر نموذج تسجيل الحضور مباشرة.
                    </p>
                    {branches.map((branch) => {
                        const link = `${appUrl}/attendance?branch=${encodeURIComponent(branch)}`;
                        return (
                            <div key={branch} style={linkRow}>
                                <div style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "4px" }}>{branch}</div>
                                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                    <code style={urlCode}>{link}</code>
                                    <button
                                        onClick={() => { navigator.clipboard.writeText(link); alert("تم نسخ الرابط!"); }}
                                        style={copyBtn}
                                    >
                                        📋 نسخ
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    <div style={{ marginTop: "12px", padding: "10px", background: "#fff3e0", borderRadius: "8px", fontSize: "12px", color: "#e65100" }}>
                        💡 يمكن لمسؤول الدوام فتح الرابط من هاتفه لتسجيل الحضور. المسعفون المجدولون سيظهرون تلقائياً بناءً على جدول الدوامات.
                    </div>
                </div>
            )}

            {/* Filters */}
            <div style={filterBar}>
                <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    style={selectStyle}
                />
                {user.role === "super" && (
                    <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        style={selectStyle}
                    >
                        <option value="">كل الفروع</option>
                        {branches.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                )}
                <input
                    type="text"
                    placeholder="بحث باسم المسعف..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ ...selectStyle, flex: 1 }}
                />
            </div>

            {/* Stats Summary */}
            <div style={statsRow}>
                <div style={statCard}>
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "#C22129" }}>{medicNames.length}</div>
                    <div style={{ fontSize: "12px", color: "#666" }}>عدد المسعفين</div>
                </div>
                <div style={statCard}>
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "#2e7d32" }}>{uniqueDates.length}</div>
                    <div style={{ fontSize: "12px", color: "#666" }}>أيام مسجلة</div>
                </div>
                <div style={statCard}>
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "#1565c0" }}>{avgRate}%</div>
                    <div style={{ fontSize: "12px", color: "#666" }}>معدل الحضور</div>
                </div>
                <div style={statCard}>
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "#4caf50" }}>{perfectAttendance}</div>
                    <div style={{ fontSize: "12px", color: "#666" }}>حضور كامل</div>
                </div>
            </div>

            {/* Attendance Table */}
            {medicNames.length > 0 ? (
                <div style={tableBox}>
                    <div style={{ overflowX: "auto" }}>
                        <table style={tableStyle}>
                            <thead>
                                <tr>
                                    <th style={thFixed}>المسعف</th>
                                    {uniqueDates.map((d) => (
                                        <th key={d} style={thDate}>
                                            {d.split("-").slice(1).join("/")}
                                        </th>
                                    ))}
                                    <th style={thFixed}>النسبة</th>
                                </tr>
                            </thead>
                            <tbody>
                                {medicNames.map((name) => {
                                    const stat = medicStats.find((s) => s.name === name);
                                    return (
                                        <tr key={name}>
                                            <td style={tdName}>{name}</td>
                                            {uniqueDates.map((d) => {
                                                const status = attendanceMap[name]?.[d];
                                                return (
                                                    <td key={d} style={{
                                                        ...tdCell,
                                                        background: status === "حاضر" ? "#e8f5e9"
                                                            : status === "غائب" ? "#ffebee" : "#f5f5f5",
                                                    }}>
                                                        {status === "حاضر" ? "✅" : status === "غائب" ? "❌" : "—"}
                                                    </td>
                                                );
                                            })}
                                            <td style={{
                                                ...tdCell,
                                                fontWeight: "bold",
                                                color: stat?.rate >= 80 ? "#2e7d32" : stat?.rate >= 50 ? "#e65100" : "#c62828",
                                            }}>
                                                {stat?.rate || 0}%
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div style={emptyState}>
                    <div style={{ fontSize: "50px", marginBottom: "16px" }}>📋</div>
                    <h3 style={{ color: "#666" }}>لا توجد سجلات حضور</h3>
                    <p style={{ color: "#999", fontSize: "14px" }}>
                        لم يتم تسجيل أي حضور لهذه الفترة. استخدم روابط تسجيل الحضور لبدء التسجيل.
                    </p>
                </div>
            )}
        </div>
    );
}

/* ================= STYLES ================= */
const page = { padding: "24px", width: "100%", minHeight: "100vh" };

const headerRow = {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: "8px", flexWrap: "wrap", gap: "10px",
};

const descStyle = { color: "#555", lineHeight: "1.7", marginBottom: "16px", fontSize: "14px" };

const actionBtn = {
    background: "#C22129", color: "#fff", border: "none", padding: "10px 18px",
    borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "bold",
};

const linksPanel = {
    background: "#fff", border: "1px solid #eee", borderRadius: "10px",
    padding: "20px", marginBottom: "20px",
};

const linkRow = {
    padding: "12px", background: "#fafbfc", borderRadius: "8px",
    marginBottom: "8px", border: "1px solid #eee",
};

const urlCode = {
    display: "inline-block", padding: "6px 12px", background: "#f5f5f5",
    borderRadius: "6px", fontSize: "11px", wordBreak: "break-all",
    color: "#333", border: "1px solid #ddd", direction: "ltr", flex: 1,
};

const copyBtn = {
    background: "#333", color: "#fff", border: "none", padding: "8px 12px",
    borderRadius: "6px", cursor: "pointer", fontSize: "12px", whiteSpace: "nowrap",
};

const filterBar = {
    display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap",
};

const selectStyle = {
    padding: "10px", border: "1px solid #ddd", borderRadius: "8px",
    outline: "none", fontSize: "13px", minWidth: "140px",
};

const statsRow = {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "12px", marginBottom: "20px",
};

const statCard = {
    background: "#fff", borderRadius: "10px", padding: "16px",
    textAlign: "center", border: "1px solid #eee",
};

const tableBox = {
    background: "#fff", borderRadius: "10px", border: "1px solid #eee",
    padding: "12px",
};

const tableStyle = {
    width: "100%", borderCollapse: "collapse", fontSize: "13px",
};

const thFixed = {
    background: "#C22129", color: "#fff", padding: "10px 12px",
    fontWeight: "bold", textAlign: "center", border: "1px solid #a81c22",
    position: "sticky", left: 0, zIndex: 1,
};

const thDate = {
    background: "#C22129", color: "#fff", padding: "10px 6px",
    fontWeight: "bold", textAlign: "center", border: "1px solid #a81c22",
    fontSize: "11px", minWidth: "50px",
};

const tdName = {
    padding: "10px 12px", fontWeight: "bold", background: "#fdf5f5",
    border: "1px solid #eee", whiteSpace: "nowrap",
};

const tdCell = {
    padding: "8px 6px", textAlign: "center", border: "1px solid #eee",
    fontSize: "14px",
};

const emptyState = {
    textAlign: "center", padding: "60px 20px", background: "#fff",
    borderRadius: "10px", border: "1px solid #eee",
};
