import { useEffect, useState } from "react";
import api from "../api";
import { useSearchParams } from "react-router-dom";

/**
 * PUBLIC attendance form — accessed via direct link.
 * URL params: ?branch=البقاع الأوسط
 * No login required.
 */

const DAYS_AR = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"];

function getWeekKey(dateStr) {
    const d = new Date(dateStr);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split("T")[0];
}

function getDayIndex(dateStr) {
    const d = new Date(dateStr);
    const day = d.getDay();
    // Monday=0 ... Sunday=6
    return day === 0 ? 6 : day - 1;
}

function getRotationIndex(dateStr) {
    // Epoch: May 4, 2026 (Monday)
    const epoch = new Date("2026-05-04").getTime();
    const current = new Date(dateStr).getTime();
    const diffWeeks = Math.floor((current - epoch) / (7 * 24 * 60 * 60 * 1000));
    const cycle = ((diffWeeks % 5) + 5) % 5;
    const rotationMap = [0, 1, 2, 3, 5];
    return rotationMap[cycle];
}

export default function AttendanceForm() {
    const [searchParams] = useSearchParams();
    const branchParam = searchParams.get("branch") || "";

    const [team, setTeam] = useState([]);
    const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [shift, setShift] = useState("");
    const [recordedBy, setRecordedBy] = useState("");
    const [attendance, setAttendance] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    // Schedule & supervisor data from localStorage
    const [scheduledMedics, setScheduledMedics] = useState([]);
    const [supervisorsList, setSupervisorsList] = useState([]);

    const shifts = JSON.parse(localStorage.getItem("shifaa_shifts_config") || "null") || [
        { id: 1, label: "الفترة الأولى", start: "10:00", end: "12:30" },
        { id: 2, label: "الفترة الثانية", start: "12:30", end: "15:00" },
        { id: 3, label: "الفترة الثالثة", start: "15:00", end: "18:00" },
        { id: 4, label: "الفترة الرابعة", start: "18:00", end: "06:00" },
    ];

    // Load team
    useEffect(() => {
        api.get("/medical-team")
            .then((res) => setTeam(res.data.data || []))
            .catch(() => {});
    }, []);

    // When date or shift changes, load scheduled medics for that day/shift from localStorage
    useEffect(() => {
        if (!date || !shift) {
            setScheduledMedics([]);
            setSupervisorsList([]);
            return;
        }

        const weekKey = getWeekKey(date);
        const dayIdx = getDayIndex(date);

        // Find the shift ID matching the selected shift label
        const selectedShift = shifts.find((s) => s.label === shift);
        if (!selectedShift) {
            setScheduledMedics([]);
            setSupervisorsList([]);
            return;
        }

        // Friday logic
        if (dayIdx === 4) {
            setScheduledMedics([]);
            setSupervisorsList([]);
            return;
        }

        // Load base schedule from localStorage
        const savedSchedule = localStorage.getItem(`shifaa_base_schedule`);
        const savedSupervisors = localStorage.getItem(`shifaa_base_supervisors`);
        const schedule = savedSchedule ? JSON.parse(savedSchedule) : {};
        const supervisorsMap = savedSupervisors ? JSON.parse(savedSupervisors) : {};

        let baseDayIdx = dayIdx;
        if (dayIdx === 6 && selectedShift.start === "18:00" && selectedShift.end === "06:00") {
            baseDayIdx = getRotationIndex(weekKey);
        }

        const key = `${baseDayIdx}-${selectedShift.id}`;
        const medicsInSlot = schedule[key] || [];
        setScheduledMedics(medicsInSlot);

        // Build list of supervisors for this day across all shifts
        const supers = [];
        shifts.forEach((s) => {
            let sBaseDayIdx = dayIdx;
            if (dayIdx === 6 && s.start === "18:00" && s.end === "06:00") {
                sBaseDayIdx = getRotationIndex(weekKey);
            }
            const supKey = `${sBaseDayIdx}-${s.id}`;
            if (supervisorsMap[supKey]) {
                supers.push(supervisorsMap[supKey]);
            }
        });
        setSupervisorsList([...new Set(supers)]);

        // Default all scheduled medics to "حاضر"
        const defaultAtt = {};
        medicsInSlot.forEach((name) => { defaultAtt[name] = "حاضر"; });
        setAttendance(defaultAtt);
    }, [date, shift]);

    function toggleAttendance(name) {
        setAttendance({
            ...attendance,
            [name]: attendance[name] === "حاضر" ? "غائب" : "حاضر",
        });
    }

    async function handleSubmit() {
        if (!shift) { alert("يرجى اختيار الفترة"); return; }
        if (!recordedBy.trim()) { alert("يرجى اختيار مسؤول الدوام"); return; }
        if (scheduledMedics.length === 0) { alert("لا يوجد مسعفين مجدولين لهذه الفترة"); return; }

        setLoading(true);
        try {
            const records = scheduledMedics.map((name) => ({
                date,
                branch: branchParam || "",
                shift,
                medicName: name,
                status: attendance[name] || "غائب",
                recordedBy: recordedBy.trim(),
            }));

            await api.post("/attendance", { records });
            setSubmitted(true);
        } catch (err) {
            alert("خطأ أثناء تسجيل الحضور: " + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    }

    if (submitted) {
        return (
            <div dir="rtl" style={successPage}>
                <div style={successCard}>
                    <div style={{ fontSize: "60px", marginBottom: "16px" }}>✅</div>
                    <h2 style={{ margin: "0 0 8px 0", color: "#2e7d32" }}>تم تسجيل الحضور بنجاح</h2>
                    <p style={{ color: "#555", marginBottom: "20px" }}>
                        شكراً لك، {recordedBy}. تم تسجيل حضور فريق {branchParam} لفترة {shift}.
                    </p>
                    <button onClick={() => { setSubmitted(false); }} style={primaryBtn}>
                        تسجيل حضور جديد
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div dir="rtl" style={formPage}>
            {/* Header */}
            <div style={formHeader}>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#C22129" }}>الشِفاء</div>
                <div style={{ fontSize: "12px", color: "#666" }}>تسجيل حضور المسعفين</div>
            </div>

            {/* Info Bar */}
            <div style={infoBar}>
                <div><strong>الفرع:</strong> {branchParam || "غير محدد"}</div>
                <div><strong>اليوم:</strong> {DAYS_AR[getDayIndex(date)] || ""}</div>
            </div>

            {/* Date Picker */}
            <div style={fieldGroup}>
                <label style={labelStyle}>التاريخ</label>
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={inputField}
                />
            </div>

            {/* Shift Selector */}
            <div style={fieldGroup}>
                <label style={labelStyle}>الفترة</label>
                <select value={shift} onChange={(e) => setShift(e.target.value)} style={inputField}>
                    <option value="">اختر الفترة</option>
                    {shifts.map((s) => (
                        <option key={s.id} value={s.label}>{s.label}</option>
                    ))}
                </select>
            </div>

            {/* مسؤول الدوام dropdown */}
            <div style={fieldGroup}>
                <label style={labelStyle}>مسؤول الدوام</label>
                {supervisorsList.length > 0 ? (
                    <select value={recordedBy} onChange={(e) => setRecordedBy(e.target.value)} style={inputField}>
                        <option value="">اختر مسؤول الدوام</option>
                        {supervisorsList.map((s, i) => (
                            <option key={i} value={s}>{s}</option>
                        ))}
                    </select>
                ) : (
                    <input
                        type="text"
                        value={recordedBy}
                        onChange={(e) => setRecordedBy(e.target.value)}
                        placeholder="أدخل اسم مسؤول الدوام"
                        style={inputField}
                    />
                )}
                {supervisorsList.length === 0 && shift && (
                    <div style={{ fontSize: "11px", color: "#e65100", marginTop: "4px" }}>
                        ⚠️ لم يتم تعيين مسؤول دوام لهذا اليوم في جدول الدوامات
                    </div>
                )}
            </div>

            {/* Medics List */}
            <div style={fieldGroup}>
                <label style={labelStyle}>
                    المسعفون المجدولون ({scheduledMedics.length})
                </label>
                {!shift ? (
                    <div style={emptyHint}>اختر الفترة أولاً لعرض المسعفين المجدولين</div>
                ) : scheduledMedics.length === 0 ? (
                    <div style={emptyHint}>لا يوجد مسعفين مجدولين لهذه الفترة في هذا اليوم</div>
                ) : (
                    <div style={attendanceList}>
                        {scheduledMedics.map((name, i) => {
                            const isPresent = attendance[name] === "حاضر";
                            return (
                                <div
                                    key={i}
                                    onClick={() => toggleAttendance(name)}
                                    style={{
                                        ...attendanceRow,
                                        background: isPresent ? "#e8f5e9" : "#ffebee",
                                        borderColor: isPresent ? "#81c784" : "#ef9a9a",
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <span style={{ fontSize: "22px" }}>{isPresent ? "✅" : "❌"}</span>
                                        <div>
                                            <div style={{ fontWeight: "bold", fontSize: "14px" }}>{name}</div>
                                        </div>
                                    </div>
                                    <div style={{
                                        fontSize: "12px", fontWeight: "bold",
                                        color: isPresent ? "#2e7d32" : "#c62828",
                                    }}>
                                        {isPresent ? "حاضر" : "غائب"}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Submit */}
            <button
                onClick={handleSubmit}
                disabled={loading || scheduledMedics.length === 0}
                style={{ ...primaryBtn, opacity: (loading || scheduledMedics.length === 0) ? 0.5 : 1 }}
            >
                {loading ? "⏳ جاري التسجيل..." : "تسجيل الحضور"}
            </button>
        </div>
    );
}

/* ================= STYLES ================= */
const formPage = {
    maxWidth: "500px", margin: "0 auto", padding: "16px",
    minHeight: "100vh", background: "#f9f9f9",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
};

const formHeader = {
    textAlign: "center", padding: "20px 0 12px", marginBottom: "12px",
    borderBottom: "2px solid #C22129",
};

const infoBar = {
    display: "flex", justifyContent: "space-between", padding: "10px 14px",
    background: "#fff", borderRadius: "8px", fontSize: "13px", marginBottom: "14px",
    border: "1px solid #eee",
};

const fieldGroup = { marginBottom: "14px" };

const labelStyle = {
    display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "6px", color: "#333",
};

const inputField = {
    width: "100%", padding: "12px", border: "1px solid #ddd", borderRadius: "8px",
    fontSize: "14px", outline: "none", boxSizing: "border-box", background: "#fff",
};

const attendanceList = {
    display: "flex", flexDirection: "column", gap: "6px",
};

const attendanceRow = {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "12px 14px", borderRadius: "10px", cursor: "pointer",
    border: "2px solid", transition: "all 0.2s",
};

const primaryBtn = {
    width: "100%", padding: "14px", background: "#C22129", color: "#fff",
    border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "bold",
    cursor: "pointer", marginTop: "10px",
};

const successPage = {
    display: "flex", justifyContent: "center", alignItems: "center",
    minHeight: "100vh", background: "#f9f9f9", padding: "20px",
};

const successCard = {
    textAlign: "center", background: "#fff", borderRadius: "16px",
    padding: "40px 30px", maxWidth: "400px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
};

const emptyHint = {
    textAlign: "center", color: "#999", padding: "20px", background: "#fff",
    borderRadius: "8px", border: "1px dashed #ddd", fontSize: "13px",
};
