import { useEffect, useState, useRef } from "react";
import api from "../api";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/* ===== CONSTANTS ===== */
const DAYS_AR = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"];

const DEFAULT_SHIFTS = [
    { id: 1, label: "الفترة الأولى", start: "10:00", end: "12:30" },
    { id: 2, label: "الفترة الثانية", start: "12:30", end: "15:00" },
    { id: 3, label: "الفترة الثالثة", start: "15:00", end: "18:00" },
    { id: 4, label: "الفترة الرابعة", start: "18:00", end: "06:00" },
];

function formatTime(t) {
    const [h, m] = t.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${h12}:${m} ${ampm}`;
}

function getWeekKey(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split("T")[0];
}

function getWeekDates(weekStart) {
    const dates = [];
    const d = new Date(weekStart);
    for (let i = 0; i < 7; i++) {
        const dd = new Date(d);
        dd.setDate(d.getDate() + i);
        dates.push(dd.toISOString().split("T")[0]);
    }
    return dates;
}

function getRotationIndex(dateStr) {
    // Epoch: Jan 5, 2026 (Monday)
    const epoch = new Date("2026-01-05").getTime();
    const current = new Date(dateStr).getTime();
    // Calculate full weeks passed since epoch
    const diffWeeks = Math.floor((current - epoch) / (7 * 24 * 60 * 60 * 1000));
    
    // 5-week cycle index (0 to 4)
    const cycle = ((diffWeeks % 5) + 5) % 5;
    
    // Map cycle to day index: Monday=0, Tuesday=1, Wednesday=2, Thursday=3, Saturday=5
    const rotationMap = [0, 1, 2, 3, 5];
    return rotationMap[cycle];
}

export default function MedicSchedules() {
    const user = JSON.parse(localStorage.getItem("user"));
    const [team, setTeam] = useState([]);
    const [shifts, setShifts] = useState(() => {
        const saved = localStorage.getItem("shifaa_shifts_config");
        return saved ? JSON.parse(saved) : DEFAULT_SHIFTS;
    });
    const [weekStart, setWeekStart] = useState(() => getWeekKey(new Date()));
    const [schedule, setSchedule] = useState({});
    const [supervisors, setSupervisors] = useState({});
    const [draggedMedic, setDraggedMedic] = useState(null);
    const [showShiftConfig, setShowShiftConfig] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [branchFilter, setBranchFilter] = useState(user.role === "super" ? "" : user.branch);
    const [isExporting, setIsExporting] = useState(false);
    const printRef = useRef(null);

    const weekDates = getWeekDates(weekStart);

    // Load team
    useEffect(() => {
        api.get("/medical-team")
            .then((res) => setTeam(res.data.data || []))
            .catch(() => alert("خطأ في جلب بيانات الفريق الطبي"));
    }, []);

    // Load schedule + supervisors from localStorage (Base Schedule)
    useEffect(() => {
        const savedSchedule = localStorage.getItem(`shifaa_base_schedule`);
        if (savedSchedule) setSchedule(JSON.parse(savedSchedule));
        else setSchedule({});

        const savedSupervisors = localStorage.getItem(`shifaa_base_supervisors`);
        if (savedSupervisors) setSupervisors(JSON.parse(savedSupervisors));
        else setSupervisors({});
    }, []);

    // Save schedule + supervisors (Base Schedule)
    useEffect(() => {
        if (Object.keys(schedule).length > 0) {
            localStorage.setItem(`shifaa_base_schedule`, JSON.stringify(schedule));
        }
    }, [schedule]);

    useEffect(() => {
        if (Object.keys(supervisors).length > 0) {
            localStorage.setItem(`shifaa_base_supervisors`, JSON.stringify(supervisors));
        }
    }, [supervisors]);

    // Save shifts config
    useEffect(() => {
        localStorage.setItem("shifaa_shifts_config", JSON.stringify(shifts));
    }, [shifts]);

    const filteredTeam = team.filter((m) => {
        const matchBranch = branchFilter ? (m[2] || "").includes(branchFilter) : true;
        const matchSearch = (m[1] || "").toLowerCase().includes(searchTerm.toLowerCase());
        return matchBranch && matchSearch;
    });

    /* ===== DRAG & DROP ===== */
    function handleDragStart(e, medicName) {
        setDraggedMedic(medicName);
        e.dataTransfer.effectAllowed = "copy";
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    }

    function handleDrop(e, dayIdx, shiftId) {
        e.preventDefault();
        if (!draggedMedic) return;
        const key = `${dayIdx}-${shiftId}`;
        const current = schedule[key] || [];
        if (!current.includes(draggedMedic)) {
            setSchedule({ ...schedule, [key]: [...current, draggedMedic] });
        }
        setDraggedMedic(null);
    }

    function removeMedicFromSlot(dayIdx, shiftId, medicName) {
        const key = `${dayIdx}-${shiftId}`;
        const current = schedule[key] || [];
        setSchedule({ ...schedule, [key]: current.filter((n) => n !== medicName) });
    }

    function clearSchedule() {
        if (confirm("هل تريد مسح جدول الدوام الأساسي بالكامل؟")) {
            setSchedule({});
            setSupervisors({});
            localStorage.removeItem(`shifaa_base_schedule`);
            localStorage.removeItem(`shifaa_base_supervisors`);
        }
    }

    /* ===== SUPERVISOR MANAGEMENT ===== */
    function setSupervisor(dayIdx, shiftId, name) {
        const key = `${dayIdx}-${shiftId}`;
        setSupervisors({ ...supervisors, [key]: name });
    }

    /* ===== SHIFT CONFIG ===== */
    function addShift() {
        const newId = shifts.length > 0 ? Math.max(...shifts.map((s) => s.id)) + 1 : 1;
        setShifts([...shifts, { id: newId, label: `فترة ${newId}`, start: "08:00", end: "12:00" }]);
    }

    function removeShift(id) {
        setShifts(shifts.filter((s) => s.id !== id));
    }

    function updateShift(id, field, value) {
        setShifts(shifts.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
    }

    /* ===== PDF EXPORT (html2canvas for Arabic support) ===== */
    async function exportPDF() {
        if (!printRef.current) return;
        setIsExporting(true);

        // Temporarily make the print container visible for html2canvas
        const container = printRef.current.parentElement;
        const origStyle = container.style.cssText;
        container.style.cssText = "position:fixed;left:0;top:0;z-index:-1;opacity:0.01;pointer-events:none;";

        try {
            await new Promise((r) => setTimeout(r, 150));

            const canvas = await html2canvas(printRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff",
                logging: false,
            });

            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

            const w = imgWidth * ratio;
            const h = imgHeight * ratio;
            const x = (pdfWidth - w) / 2;
            const y = 2;

            pdf.addImage(imgData, "PNG", x, y, w, h);
            pdf.save(`جدول_الدوامات_${weekDates[0]}.pdf`);
        } catch (err) {
            console.error("PDF export error:", err);
            alert("خطأ في تصدير PDF");
        } finally {
            container.style.cssText = origStyle;
            setIsExporting(false);
        }
    }

    /* ===== NAVIGATE WEEKS ===== */
    function prevWeek() {
        const d = new Date(weekStart);
        d.setDate(d.getDate() - 7);
        setWeekStart(d.toISOString().split("T")[0]);
    }

    function nextWeek() {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + 7);
        setWeekStart(d.toISOString().split("T")[0]);
    }

    /* ===== RENDER ===== */
    return (
        <div dir="rtl" style={page}>
            <div style={headerRow}>
                <h2 style={{ margin: 0 }}>دوامات المسعفين</h2>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button onClick={() => setShowShiftConfig(!showShiftConfig)} style={configBtn}>
                        ⚙️ إعداد الفترات
                    </button>
                    <button onClick={clearSchedule} style={{ ...actionBtn, background: "#666" }}>
                        🗑️ مسح الجدول
                    </button>
                    <button onClick={exportPDF} disabled={isExporting} style={{ ...actionBtn, opacity: isExporting ? 0.6 : 1 }}>
                        {isExporting ? "⏳ جاري التصدير..." : "📄 تصدير PDF"}
                    </button>
                </div>
            </div>

            <p style={descStyle}>
                اسحب أسماء المسعفين من القائمة وأفلتها في الخانة المناسبة لتشكيل جدول الدوامات الأسبوعي.
                يمكنك أيضاً تعيين مسؤول الدوام لكل فترة.
            </p>

            {/* SHIFT CONFIGURATION */}
            {showShiftConfig && (
                <div style={configPanel}>
                    <h4 style={{ marginTop: 0 }}>إعداد الفترات الزمنية</h4>
                    {shifts.map((shift) => (
                        <div key={shift.id} style={shiftRow}>
                            <input
                                value={shift.label}
                                onChange={(e) => updateShift(shift.id, "label", e.target.value)}
                                style={shiftInput}
                                placeholder="اسم الفترة"
                            />
                            <label style={{ fontSize: "13px" }}>من:</label>
                            <input type="time" value={shift.start} onChange={(e) => updateShift(shift.id, "start", e.target.value)} style={timeInput} />
                            <label style={{ fontSize: "13px" }}>إلى:</label>
                            <input type="time" value={shift.end} onChange={(e) => updateShift(shift.id, "end", e.target.value)} style={timeInput} />
                            <button onClick={() => removeShift(shift.id)} style={removeBtn}>✕</button>
                        </div>
                    ))}
                    <button onClick={addShift} style={addShiftBtn}>+ إضافة فترة</button>
                </div>
            )}

            {/* WEEK NAVIGATION */}
            <div style={weekNav}>
                <button onClick={prevWeek} style={navBtn}>◀ الأسبوع السابق</button>
                <div style={weekLabelStyle}>
                    <strong>الأسبوع:</strong> {weekDates[0]} — {weekDates[6]}
                </div>
                <button onClick={nextWeek} style={navBtn}>الأسبوع التالي ▶</button>
            </div>

            <div style={mainLayout}>
                {/* MEDIC LIST */}
                <div style={medicListPanel}>
                    <h4 style={{ marginTop: 0, marginBottom: "10px" }}>قائمة المسعفين</h4>
                    <input type="text" placeholder="بحث..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={searchInput} />
                    {user.role === "super" && (
                        <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} style={{ ...searchInput, marginTop: "6px" }}>
                            <option value="">كل الفروع</option>
                            <option value="البقاع الأوسط">البقاع الأوسط</option>
                            <option value="بعلبك">بعلبك</option>
                        </select>
                    )}
                    <div style={medicList}>
                        {filteredTeam.map((m, i) => (
                            <div key={i} draggable onDragStart={(e) => handleDragStart(e, m[1])} style={medicCard}>
                                <span style={{ fontSize: "16px" }}>👤</span>
                                <div>
                                    <div style={{ fontWeight: "bold", fontSize: "13px" }}>{m[1]}</div>
                                    <div style={{ fontSize: "11px", color: "#888" }}>{m[3]}</div>
                                </div>
                            </div>
                        ))}
                        {filteredTeam.length === 0 && (
                            <p style={{ textAlign: "center", color: "#999", padding: "20px" }}>لا توجد نتائج</p>
                        )}
                    </div>
                </div>

                {/* SCHEDULE GRID */}
                <div style={scheduleContainer}>
                    <div style={gridWrapper}>
                        <table style={scheduleTable}>
                            <thead>
                                <tr>
                                    <th style={thStyle}>الفترة</th>
                                    {DAYS_AR.map((day, i) => (
                                        <th key={i} style={thStyle}>
                                            {day}
                                            <div style={{ fontSize: "10px", fontWeight: "normal", opacity: 0.8 }}>{weekDates[i]}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {shifts.map((shift) => (
                                    <tr key={shift.id}>
                                        <td style={shiftLabelCell}>
                                            <div style={{ fontWeight: "bold", fontSize: "12px" }}>{shift.label}</div>
                                            <div style={{ fontSize: "11px", color: "#C22129" }}>
                                                {formatTime(shift.start)} - {formatTime(shift.end)}
                                            </div>
                                        </td>
                                        {DAYS_AR.map((_, dayIdx) => {
                                            let baseDayIdx = dayIdx;
                                            let isFrozen = false;

                                            // Friday logic: completely empty and uneditable
                                            if (dayIdx === 4) {
                                                isFrozen = true;
                                            } 
                                            // Sunday Night Shift logic: dynamically mapped from Mon/Tue/Wed/Thu/Sat
                                            else if (dayIdx === 6 && shift.start === "18:00" && shift.end === "06:00") {
                                                baseDayIdx = getRotationIndex(weekDates[0]);
                                                isFrozen = true;
                                            }

                                            const key = `${baseDayIdx}-${shift.id}`;
                                            let names = [];
                                            let supervisor = "";

                                            if (dayIdx === 4) {
                                                names = [];
                                                supervisor = "";
                                            } else {
                                                names = schedule[key] || [];
                                                supervisor = supervisors[key] || "";
                                            }

                                            return (
                                                <td 
                                                    key={dayIdx} 
                                                    style={{...dropCell, opacity: isFrozen ? 0.7 : 1}} 
                                                    onDragOver={isFrozen ? null : handleDragOver} 
                                                    onDrop={(e) => isFrozen ? e.preventDefault() : handleDrop(e, baseDayIdx, shift.id)}
                                                >
                                                    {isFrozen && dayIdx === 4 && <div style={{...emptySlot, color: "#e57373", fontSize: "12px", fontWeight: "bold"}}>فارغ</div>}
                                                    {isFrozen && dayIdx === 6 && <div style={{fontSize: "10px", color: "#666", textAlign: "center", marginBottom: "4px"}}>مجدول تلقائياً (دوري)</div>}
                                                    
                                                    {/* Supervisor Selector */}
                                                    {!isFrozen && names.length > 0 && (
                                                        <select
                                                            value={supervisor}
                                                            onChange={(e) => setSupervisor(baseDayIdx, shift.id, e.target.value)}
                                                            style={supervisorSelect}
                                                            title="مسؤول الدوام"
                                                        >
                                                            <option value="">مسؤول الدوام</option>
                                                            {names.map((n) => (
                                                                <option key={n} value={n}>{n}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                    {isFrozen && supervisor && (
                                                        <div style={{fontSize: "11px", color: "#C22129", textAlign: "center", fontWeight: "bold", marginBottom: "4px"}}>⭐ {supervisor}</div>
                                                    )}

                                                    {names.map((name, ni) => (
                                                        <div key={ni} style={nameChip}>
                                                            <span>{name}</span>
                                                            {!isFrozen && supervisor === name && <span style={{ fontSize: "10px" }}>⭐</span>}
                                                            {!isFrozen && <button onClick={() => removeMedicFromSlot(baseDayIdx, shift.id, name)} style={chipRemoveBtn}>×</button>}
                                                        </div>
                                                    ))}
                                                    {!isFrozen && names.length === 0 && <div style={emptySlot}>أفلت هنا</div>}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ===== HIDDEN PRINTABLE TABLE (for PDF export with Arabic) ===== */}
            <div style={{ position: "fixed", left: "-9999px", top: "-9999px", zIndex: -1, pointerEvents: "none" }}>
                <div ref={printRef} dir="rtl" style={{ width: "1100px", padding: "20px", background: "#fff", fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif" }}>
                    <div style={{ textAlign: "center", marginBottom: "16px" }}>
                        <h2 style={{ color: "#C22129", margin: "0 0 4px" }}>جمعية الشفاء للخدمات الطبية والإنسانية</h2>
                        <h3 style={{ margin: "0 0 4px" }}>جدول دوامات المسعفين</h3>
                        <p style={{ margin: 0, fontSize: "13px", color: "#555" }}>الأسبوع: {weekDates[0]} — {weekDates[6]}</p>
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                        <thead>
                            <tr>
                                <th style={printTh}>الفترة / الوقت</th>
                                {DAYS_AR.map((day, i) => (
                                    <th key={i} style={printTh}>{day}<br /><span style={{ fontSize: "10px", fontWeight: "normal" }}>{weekDates[i]}</span></th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {shifts.map((shift) => (
                                <tr key={shift.id}>
                                    <td style={printTdLabel}>
                                        <strong>{shift.label}</strong><br />
                                        <span style={{ color: "#C22129" }}>{formatTime(shift.start)} - {formatTime(shift.end)}</span>
                                    </td>
                                    {DAYS_AR.map((_, dayIdx) => {
                                        let baseDayIdx = dayIdx;
                                        if (dayIdx === 6 && shift.start === "18:00" && shift.end === "06:00") {
                                            baseDayIdx = getRotationIndex(weekDates[0]);
                                        }

                                        const key = `${baseDayIdx}-${shift.id}`;
                                        let names = [];
                                        let supervisor = "";

                                        if (dayIdx === 4) {
                                            names = [];
                                            supervisor = "";
                                        } else {
                                            names = schedule[key] || [];
                                            supervisor = supervisors[key] || "";
                                        }
                                        
                                        return (
                                            <td key={dayIdx} style={printTd}>
                                                {supervisor && <div style={{ fontSize: "10px", color: "#C22129", fontWeight: "bold", marginBottom: "2px", wordWrap: "break-word" }}>⭐ {supervisor}</div>}
                                                {names.filter(n => n !== supervisor).map((n, i) => (
                                                    <div key={i} style={{ wordWrap: "break-word", marginBottom: "2px" }}>{n}</div>
                                                ))}
                                                {names.length === 0 && <span style={{ color: "#ccc" }}>—</span>}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

/* ================= STYLES ================= */
const page = { padding: "0", minHeight: "100vh", overflow: "hidden" };
const headerRow = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "10px" };
const descStyle = { color: "#555", lineHeight: "1.7", marginBottom: "16px", fontSize: "14px" };
const actionBtn = { background: "#C22129", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap" };
const configBtn = { ...actionBtn, background: "#333" };
const weekNav = { display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", marginBottom: "16px", background: "#fff", padding: "12px", borderRadius: "10px", border: "1px solid #eee" };
const navBtn = { background: "#C22129", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "13px" };
const weekLabelStyle = { fontSize: "14px", fontWeight: "bold", color: "#333" };
const mainLayout = { display: "flex", gap: "16px", alignItems: "flex-start", overflow: "hidden" };
const medicListPanel = { width: "220px", minWidth: "220px", background: "#fff", borderRadius: "10px", border: "1px solid #eee", padding: "12px", maxHeight: "calc(100vh - 280px)", display: "flex", flexDirection: "column" };
const searchInput = { padding: "8px 10px", border: "1px solid #ddd", borderRadius: "6px", outline: "none", fontSize: "13px", width: "100%", boxSizing: "border-box" };
const medicList = { flex: 1, overflowY: "auto", marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" };
const medicCard = { display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", background: "#f8f9fa", borderRadius: "8px", cursor: "grab", border: "1px solid #e9ecef", transition: "all 0.15s ease", userSelect: "none" };
const scheduleContainer = { flex: 1, overflow: "auto", minWidth: 0 };
const gridWrapper = { minWidth: "700px" };
const scheduleTable = { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "10px", overflow: "hidden", border: "1px solid #ddd" };
const thStyle = { background: "#C22129", color: "#fff", padding: "10px 6px", fontSize: "13px", fontWeight: "bold", textAlign: "center", border: "1px solid #a81c22", minWidth: "90px" };
const shiftLabelCell = { padding: "10px 8px", textAlign: "center", background: "#fdf5f5", border: "1px solid #eee", minWidth: "100px", verticalAlign: "middle" };
const dropCell = { padding: "6px", border: "1px solid #eee", verticalAlign: "top", minHeight: "60px", background: "#fafbfc", transition: "background 0.2s" };
const nameChip = { display: "inline-flex", alignItems: "center", gap: "2px", background: "#e8f5e9", color: "#2e7d32", borderRadius: "10px", padding: "2px 4px 2px 2px", fontSize: "10px", fontWeight: "bold", margin: "2px", border: "1px solid #c8e6c9", maxWidth: "100%", whiteSpace: "normal", wordBreak: "break-word" };
const chipRemoveBtn = { background: "transparent", border: "none", color: "#c62828", cursor: "pointer", fontSize: "12px", fontWeight: "bold", lineHeight: 1, padding: "0 2px" };
const emptySlot = { color: "#ccc", fontSize: "10px", textAlign: "center", padding: "10px 2px", fontStyle: "italic" };
const configPanel = { background: "#fff", border: "1px solid #eee", borderRadius: "10px", padding: "16px", marginBottom: "16px" };
const shiftRow = { display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" };
const shiftInput = { padding: "8px", border: "1px solid #ddd", borderRadius: "6px", outline: "none", fontSize: "13px", width: "120px" };
const timeInput = { padding: "8px", border: "1px solid #ddd", borderRadius: "6px", outline: "none", fontSize: "13px", width: "110px" };
const removeBtn = { background: "#f44336", color: "#fff", border: "none", borderRadius: "50%", width: "28px", height: "28px", cursor: "pointer", fontWeight: "bold", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center" };
const addShiftBtn = { background: "#4caf50", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" };
const supervisorSelect = { width: "100%", padding: "3px", fontSize: "10px", border: "1px dashed #C22129", borderRadius: "4px", marginBottom: "4px", background: "#fff8f8", color: "#C22129", outline: "none" };

// Print styles
const printTh = { background: "#C22129", color: "#fff", padding: "4px 2px", border: "1px solid #a81c22", textAlign: "center", fontSize: "10px", wordBreak: "break-word" };
const printTdLabel = { padding: "4px 2px", textAlign: "center", background: "#fdf5f5", border: "1px solid #ddd", fontSize: "9px", wordBreak: "break-word" };
const printTd = { padding: "2px 2px", border: "1px solid #ddd", textAlign: "center", fontSize: "9px", verticalAlign: "top", wordBreak: "break-word", whiteSpace: "normal" };
