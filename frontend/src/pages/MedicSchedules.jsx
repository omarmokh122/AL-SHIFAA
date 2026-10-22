import { useEffect, useState, useRef } from "react";
import api from "../api";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import subLogo from "../assets/sub-logo.png";

/* ===== CONSTANTS ===== */
const DAYS_AR = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"];

const ROLES_LIST = [
    "مسعف",
    "سائق إسعاف",
    "مسعف + سايق",
    "ممرض",
    "طبيب",
    "مسؤول فريق",
    "مسؤول منطقة",
    "إداري",
    "متطوع",
    "دفاع مدني",
];

const DEFAULT_SHIFTS = [
    { id: 1, label: "الفترة الأولى", start: "10:00", end: "12:30" },
    { id: 2, label: "الفترة الثانية", start: "12:30", end: "15:00" },
    { id: 3, label: "الفترة الثالثة", start: "15:00", end: "18:00" },
    { id: 4, label: "الفترة الرابعة", start: "18:00", end: "06:00" },
];

function formatTime(t) {
    if (!t) return "";
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
    // Epoch: May 4, 2026 (Monday)
    const epoch = new Date("2026-05-04").getTime();
    const current = new Date(dateStr).getTime();
    const diffWeeks = Math.floor((current - epoch) / (7 * 24 * 60 * 60 * 1000));
    const cycle = ((diffWeeks % 5) + 5) % 5;
    const rotationMap = [0, 1, 2, 3, 5];
    return rotationMap[cycle];
}

export default function MedicSchedules() {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const [isUnlocked, setIsUnlocked] = useState(() => sessionStorage.getItem("schedule_unlocked") === "true");
    const [team, setTeam] = useState([]);
    const [shifts, setShifts] = useState(() => {
        const saved = localStorage.getItem("shifaa_shifts_config");
        return saved ? JSON.parse(saved) : DEFAULT_SHIFTS;
    });
    const [weekStart, setWeekStart] = useState(() => getWeekKey(new Date()));
    const [schedule, setSchedule] = useState({});
    const [supervisors, setSupervisors] = useState({});
    const [draggedMedic, setDraggedMedic] = useState(null);
    const [activeDropKey, setActiveDropKey] = useState(null);

    // Filter & Search
    const [searchTerm, setSearchTerm] = useState("");
    const [branchFilter, setBranchFilter] = useState(user.role === "super" ? "البقاع الأوسط" : (user.branch || "البقاع الأوسط"));

    // Save & Loading states
    const [saveStatus, setSaveStatus] = useState("idle"); // "idle" | "saving" | "saved" | "error"
    const [isExporting, setIsExporting] = useState(false);
    const [showShiftConfig, setShowShiftConfig] = useState(false);

    // Add Member Modal
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [newMemberName, setNewMemberName] = useState("");
    const [newMemberRole, setNewMemberRole] = useState("مسعف");
    const [newMemberBranch, setNewMemberBranch] = useState(user.role === "super" ? "البقاع الأوسط" : (user.branch || "البقاع الأوسط"));
    const [newMemberPhone, setNewMemberPhone] = useState("");
    const [isSubmittingMember, setIsSubmittingMember] = useState(false);

    // Quick Add to Slot Modal
    const [slotModalData, setSlotModalData] = useState(null); // { dayIdx, shiftId, dayName, shiftLabel }
    const [slotSearchTerm, setSlotSearchTerm] = useState("");

    const printRef = useRef(null);
    const weekDates = getWeekDates(weekStart);

    // 1. Load team
    const fetchTeam = () => {
        api.get("/medical-team")
            .then((res) => setTeam(res.data.data || []))
            .catch(() => console.error("خطأ في جلب بيانات الفريق الطبي"));
    };

    useEffect(() => {
        fetchTeam();
    }, []);

    // 2. Load schedule + supervisors from backend based on branch
    useEffect(() => {
        if (!branchFilter) return;
        setSaveStatus("idle");
        api.get(`/schedules?branch=${encodeURIComponent(branchFilter)}`)
            .then((res) => {
                if (res.data.success) {
                    let backendSchedule = res.data.schedule || {};
                    let backendSupervisors = res.data.supervisors || {};

                    // Restore from local storage if backend is empty
                    if (Object.keys(backendSchedule).length === 0) {
                        const localSched = localStorage.getItem(`shifaa_base_schedule_${branchFilter}`);
                        const localSups = localStorage.getItem(`shifaa_base_supervisors_${branchFilter}`);
                        if (localSched) {
                            backendSchedule = JSON.parse(localSched);
                            backendSupervisors = localSups ? JSON.parse(localSups) : {};
                            api.post("/schedules", {
                                branch: branchFilter,
                                schedule: backendSchedule,
                                supervisors: backendSupervisors,
                                shifts: res.data.shifts || shifts
                            });
                        }
                    }

                    setSchedule(backendSchedule);
                    setSupervisors(backendSupervisors);
                    if (res.data.shifts && res.data.shifts.length > 0) {
                        setShifts(res.data.shifts);
                    }
                } else {
                    setSchedule({});
                    setSupervisors({});
                }
            })
            .catch((err) => {
                console.error("Error loading schedule:", err);
                setSchedule({});
                setSupervisors({});
            });
    }, [branchFilter]);

    // Save to backend helper with visual status
    function saveToBackend(newSched, newSups, newShifts) {
        if (!branchFilter) return;
        setSaveStatus("saving");

        // Keep local backup
        localStorage.setItem(`shifaa_base_schedule_${branchFilter}`, JSON.stringify(newSched));
        localStorage.setItem(`shifaa_base_supervisors_${branchFilter}`, JSON.stringify(newSups));

        api.post("/schedules", {
            branch: branchFilter,
            schedule: newSched,
            supervisors: newSups,
            shifts: newShifts || shifts
        })
        .then(() => {
            setSaveStatus("saved");
            setTimeout(() => setSaveStatus("idle"), 2500);
        })
        .catch(err => {
            console.error("Error saving schedule:", err);
            setSaveStatus("error");
            setTimeout(() => setSaveStatus("idle"), 3500);
        });
    }

    function handleManualSave() {
        saveToBackend(schedule, supervisors, shifts);
    }

    function updateSchedule(newSched) {
        setSchedule(newSched);
        saveToBackend(newSched, supervisors, shifts);
    }

    function updateSupervisors(newSups) {
        setSupervisors(newSups);
        saveToBackend(schedule, newSups, shifts);
    }

    // Save shifts config to local storage when it changes
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

    function handleDragOver(e, key) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        if (activeDropKey !== key) {
            setActiveDropKey(key);
        }
    }

    function handleDragLeave() {
        setActiveDropKey(null);
    }

    function handleDrop(e, dayIdx, shiftId) {
        e.preventDefault();
        setActiveDropKey(null);
        if (!draggedMedic) return;
        addMedicToSlot(dayIdx, shiftId, draggedMedic);
        setDraggedMedic(null);
    }

    /* ===== SLOT MANIPULATION ===== */
    function addMedicToSlot(dayIdx, shiftId, medicName) {
        const key = `${dayIdx}-${shiftId}`;
        const current = schedule[key] || [];
        if (!current.includes(medicName)) {
            const updated = { ...schedule, [key]: [...current, medicName] };
            updateSchedule(updated);
        }
    }

    function removeMedicFromSlot(dayIdx, shiftId, medicName) {
        const key = `${dayIdx}-${shiftId}`;
        const current = schedule[key] || [];
        const updatedNames = current.filter((n) => n !== medicName);
        const updatedSchedule = { ...schedule, [key]: updatedNames };

        // If the removed member was the supervisor, clear supervisor
        let updatedSupervisors = { ...supervisors };
        if (supervisors[key] === medicName) {
            delete updatedSupervisors[key];
            setSupervisors(updatedSupervisors);
        }

        setSchedule(updatedSchedule);
        saveToBackend(updatedSchedule, updatedSupervisors, shifts);
    }

    function toggleSupervisor(dayIdx, shiftId, medicName) {
        const key = `${dayIdx}-${shiftId}`;
        const currentSupervisor = supervisors[key];
        const newSupervisor = currentSupervisor === medicName ? "" : medicName;
        updateSupervisors({ ...supervisors, [key]: newSupervisor });
    }

    function clearSchedule() {
        if (!isUnlocked) return;
        const code = prompt("لأسباب أمنية، الرجاء إدخال رمز المرور (Passcode) لمسح الجدول بالكامل:");
        if (code === "2026") {
            if (confirm(`تحذير: هل أنت متأكد من مسح جميع شفتات جدول (${branchFilter}) بالكامل؟`)) {
                updateSchedule({});
                updateSupervisors({});
            }
        } else if (code !== null) {
            alert("رمز المرور غير صحيح! لن يتم مسح الجدول.");
        }
    }

    /* ===== ADD MEMBER TO TEAM MODAL ===== */
    async function handleAddNewMember(e) {
        e.preventDefault();
        if (!newMemberName.trim()) {
            alert("يرجى إدخال اسم المسعف الثلاثي");
            return;
        }

        setIsSubmittingMember(true);
        try {
            const memberData = {
                الاسم_الثلاثي: newMemberName.trim(),
                الفرع: newMemberBranch,
                الصفة: newMemberRole || "مسعف",
                رقم_الهاتف: newMemberPhone.trim() || "",
            };

            await api.post("/medical-team", memberData);

            // Immediately update local team state for instant use
            const newRow = [
                Date.now(),
                newMemberName.trim(),
                newMemberBranch,
                newMemberRole || "مسعف",
                "", "", "", "", "", "",
                newMemberPhone.trim() || "",
                "", "", ""
            ];
            setTeam(prev => [newRow, ...prev]);

            // Reset modal form
            setNewMemberName("");
            setNewMemberPhone("");
            setShowAddMemberModal(false);
            alert(`✅ تمت إضافة المسعف (${memberData.الاسم_الثلاثي}) بنجاح ويمكنك جدولته الآن!`);
        } catch (err) {
            console.error("Error adding new member:", err);
            alert("❌ خطأ أثناء إضافة العضو: " + (err.response?.data?.error || err.message));
        } finally {
            setIsSubmittingMember(false);
        }
    }

    /* ===== SHIFT CONFIG ===== */
    function addShift() {
        const newId = shifts.length > 0 ? Math.max(...shifts.map((s) => s.id)) + 1 : 1;
        const updated = [...shifts, { id: newId, label: `فترة ${newId}`, start: "08:00", end: "12:00" }];
        setShifts(updated);
        saveToBackend(schedule, supervisors, updated);
    }

    function removeShift(id) {
        if (shifts.length <= 1) {
            alert("يجب أن تبقى فترة واحدة على الأقل في الجدول");
            return;
        }
        if (confirm("هل أنت متأكد من حذف هذه الفترة؟")) {
            const updated = shifts.filter((s) => s.id !== id);
            setShifts(updated);
            saveToBackend(schedule, supervisors, updated);
        }
    }

    function updateShift(id, field, value) {
        const updated = shifts.map((s) => (s.id === id ? { ...s, [field]: value } : s));
        setShifts(updated);
    }

    /* ===== PDF EXPORT ===== */
    async function exportPDF() {
        if (!printRef.current) return;
        setIsExporting(true);

        const container = printRef.current.parentElement;
        const origStyle = container.style.cssText;
        container.style.cssText = "position:fixed;left:0;top:0;z-index:-1;opacity:0.01;pointer-events:none;";

        try {
            await new Promise((r) => setTimeout(r, 200));

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
            pdf.save(`جدول_الدوامات_${branchFilter}_${weekDates[0]}.pdf`);
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

    function currentWeek() {
        setWeekStart(getWeekKey(new Date()));
    }

    /* ===== UNLOCK Logic ===== */
    function handleUnlock() {
        const code = prompt("الرجاء إدخال رمز المرور (Passcode) للوصول إلى جدول الدوامات وتعديله:");
        if (code === "2026") {
            sessionStorage.setItem("schedule_unlocked", "true");
            setIsUnlocked(true);
        } else if (code !== null) {
            alert("رمز المرور غير صحيح!");
        }
    }

    if (!isUnlocked) {
        return (
            <div dir="rtl" style={{ ...pageStyle, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
                <div style={passcodeCard}>
                    <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔒</div>
                    <h2 style={{ margin: "0 0 8px 0", color: "#1e293b", fontSize: "20px" }}>جدول الدوامات محمي برمز مرور</h2>
                    <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "24px", lineHeight: "1.6" }}>
                        لأسباب أمنية وتنظيمية، يتطلب الوصول إلى وتعديل جدول الدوامات إدخال رمز المرور المعتمد.
                    </p>
                    <button onClick={handleUnlock} style={primaryActionBtn}>
                        🔑 إدخال رمز المرور للوصول
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div dir="rtl" style={pageStyle}>
            {/* ===== HEADER BAR ===== */}
            <div style={headerContainer}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "800", color: "#0f172a" }}>
                            دوامات المسعفين
                        </h2>
                        {/* Branch badge for current view */}
                        <span style={branchBadge}>
                            🏢 {branchFilter}
                        </span>
                    </div>
                    <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                        إدارة وجدولة وتوزيع مهام المسعفين أسبوعياً ومسؤولي الفترات لكافة الفروع
                    </p>
                </div>

                {/* Main Action Buttons */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    {/* Manual Save Button */}
                    <button
                        onClick={handleManualSave}
                        disabled={saveStatus === "saving"}
                        style={{
                            ...primaryActionBtn,
                            background: saveStatus === "saved" ? "#16a34a" : saveStatus === "error" ? "#dc2626" : "#C22129",
                        }}
                    >
                        {saveStatus === "saving" && "⏳ جاري الحفظ..."}
                        {saveStatus === "saved" && "✅ تم الحفظ!"}
                        {saveStatus === "error" && "⚠️ خطأ في الحفظ"}
                        {saveStatus === "idle" && "💾 حفظ الجدول"}
                    </button>

                    {/* Add Member Button */}
                    <button onClick={() => setShowAddMemberModal(true)} style={secondaryActionBtn}>
                        ➕ إضافة مسعف جديد
                    </button>

                    {/* Shift Config Button */}
                    <button onClick={() => setShowShiftConfig(!showShiftConfig)} style={secondaryActionBtn}>
                        ⚙️ إعداد الفترات
                    </button>

                    {/* PDF Export Button */}
                    <button onClick={exportPDF} disabled={isExporting} style={secondaryActionBtn}>
                        {isExporting ? "⏳ جاري التصدير..." : "📄 تصدير PDF"}
                    </button>

                    {/* Clear Schedule Button */}
                    <button onClick={clearSchedule} style={dangerActionBtn}>
                        🗑️ مسح
                    </button>
                </div>
            </div>

            {/* ===== SUPER ADMIN BRANCH SELECTOR ===== */}
            {user.role === "super" && (
                <div style={branchSelectorCard}>
                    <span style={{ fontSize: "13px", fontWeight: "bold", color: "#475569" }}>اختر الفرع للجدولة:</span>
                    <div style={{ display: "flex", gap: "6px" }}>
                        {["البقاع الأوسط", "بعلبك"].map((b) => (
                            <button
                                key={b}
                                onClick={() => setBranchFilter(b)}
                                style={{
                                    ...branchTabBtn,
                                    background: branchFilter === b ? "#C22129" : "#fff",
                                    color: branchFilter === b ? "#fff" : "#475569",
                                    border: branchFilter === b ? "1px solid #a81c22" : "1px solid #cbd5e1",
                                    fontWeight: branchFilter === b ? "700" : "500",
                                }}
                            >
                                🏢 {b}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ===== SHIFT CONFIGURATION PANEL (Collapsible) ===== */}
            {showShiftConfig && (
                <div style={configPanelCard}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <h4 style={{ margin: 0, fontSize: "15px", color: "#1e293b" }}>⚙️ إعداد وتعديل أوقات الفترات (الشفتات)</h4>
                        <button onClick={() => setShowShiftConfig(false)} style={closeIconBtn}>✕</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "10px", marginBottom: "14px" }}>
                        {shifts.map((shift) => (
                            <div key={shift.id} style={shiftRowBox}>
                                <input
                                    value={shift.label}
                                    onChange={(e) => updateShift(shift.id, "label", e.target.value)}
                                    style={shiftInputText}
                                    placeholder="اسم الفترة"
                                />
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <span style={{ fontSize: "11px", color: "#64748b" }}>من:</span>
                                    <input
                                        type="time"
                                        value={shift.start}
                                        onChange={(e) => updateShift(shift.id, "start", e.target.value)}
                                        style={timeInputBox}
                                    />
                                    <span style={{ fontSize: "11px", color: "#64748b" }}>إلى:</span>
                                    <input
                                        type="time"
                                        value={shift.end}
                                        onChange={(e) => updateShift(shift.id, "end", e.target.value)}
                                        style={timeInputBox}
                                    />
                                    <button onClick={() => removeShift(shift.id)} title="حذف الفترة" style={shiftDeleteBtn}>
                                        ✕
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <button onClick={addShift} style={addShiftButton}>+ إضافة فترة جديدة</button>
                        <button onClick={handleManualSave} style={{ ...primaryActionBtn, padding: "6px 14px", fontSize: "12px" }}>حفظ تعديلات الفترات</button>
                    </div>
                </div>
            )}

            {/* ===== WEEK NAVIGATION BAR ===== */}
            <div style={weekNavContainer}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button onClick={prevWeek} style={weekNavBtn} title="الأسبوع السابق">
                        ◀ الأسبوع السابق
                    </button>
                    <button onClick={currentWeek} style={currentWeekBtn}>
                        📅 الأسبوع الحالي
                    </button>
                    <button onClick={nextWeek} style={weekNavBtn} title="الأسبوع التالي">
                        الأسبوع التالي ▶
                    </button>
                </div>
                <div style={weekDateRangePill}>
                    <span style={{ color: "#64748b" }}>تاريخ الأسبوع:</span>
                    <strong style={{ color: "#0f172a" }}>{weekDates[0]}</strong>
                    <span style={{ color: "#94a3b8" }}>—</span>
                    <strong style={{ color: "#0f172a" }}>{weekDates[6]}</strong>
                </div>
            </div>

            {/* ===== MAIN WORKSPACE (SIDEBAR + GRID) ===== */}
            <div style={workspaceLayout}>
                {/* 1. MEDIC LIST SIDEBAR */}
                <div style={sidebarPanel}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#1e293b" }}>فريق المسعفين</h4>
                            <span style={countPill}>{filteredTeam.length}</span>
                        </div>
                        <button
                            onClick={() => setShowAddMemberModal(true)}
                            title="إضافة مسعف جديد"
                            style={quickAddHeaderBtn}
                        >
                            + إضافة
                        </button>
                    </div>

                    {/* Search box */}
                    <div style={{ position: "relative", marginBottom: "10px" }}>
                        <input
                            type="text"
                            placeholder="بحث بالاسم أو الصفة..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={searchInputStyle}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                style={clearSearchBtn}
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "8px", textAlign: "center" }}>
                        💡 اسحب الاسم وأفلته في أي شفت، أو اضغط <strong>+</strong> في الخانة
                    </div>

                    {/* Scrollable Medics List */}
                    <div style={sidebarMedicsScroll}>
                        {filteredTeam.map((m, i) => (
                            <div
                                key={i}
                                draggable
                                onDragStart={(e) => handleDragStart(e, m[1])}
                                style={medicDraggableCard}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                                    <div style={medicAvatar}>
                                        {(m[1] || "").trim().charAt(0) || "👤"}
                                    </div>
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <div style={medicNameText}>{m[1]}</div>
                                        <div style={medicRoleText}>{m[3] || "مسعف"}</div>
                                    </div>
                                </div>
                                <span style={dragHandleIcon} title="اسحب إلى الجدول">⋮⋮</span>
                            </div>
                        ))}

                        {filteredTeam.length === 0 && (
                            <div style={{ textAlign: "center", color: "#94a3b8", padding: "30px 10px", fontSize: "12px" }}>
                                لا توجد نتائج مطابقة
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. SCHEDULE GRID TABLE */}
                <div style={tableContainer}>
                    <div style={tableWrapper}>
                        <table style={scheduleTableStyle}>
                            <thead>
                                <tr>
                                    <th style={shiftHeaderTh}>الفترة / التوقيت</th>
                                    {DAYS_AR.map((day, i) => (
                                        <th key={i} style={dayHeaderTh}>
                                            <div style={{ fontSize: "14px", fontWeight: "800" }}>{day}</div>
                                            <div style={{ fontSize: "11px", fontWeight: "normal", opacity: 0.9, marginTop: "2px" }}>
                                                {weekDates[i]}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {shifts.map((shift) => (
                                    <tr key={shift.id}>
                                        {/* Shift label column */}
                                        <td style={shiftCellTd}>
                                            <div style={{ fontWeight: "800", fontSize: "13px", color: "#0f172a" }}>
                                                {shift.label}
                                            </div>
                                            <div style={{ fontSize: "11px", color: "#C22129", fontWeight: "700", marginTop: "3px" }}>
                                                {formatTime(shift.start)} - {formatTime(shift.end)}
                                            </div>
                                        </td>

                                        {/* 7 Days columns (Mon - Sun, with Friday OPEN) */}
                                        {DAYS_AR.map((dayName, dayIdx) => {
                                            let baseDayIdx = dayIdx;
                                            let isFrozen = false;

                                            // Sunday Night Shift logic: dynamically mapped from Mon/Tue/Wed/Thu/Sat
                                            if (dayIdx === 6 && shift.start === "18:00" && shift.end === "06:00") {
                                                baseDayIdx = getRotationIndex(weekDates[0]);
                                                isFrozen = true;
                                            }

                                            const key = `${baseDayIdx}-${shift.id}`;
                                            const names = schedule[key] || [];
                                            const supervisor = supervisors[key] || "";
                                            const isDragOver = activeDropKey === key;

                                            return (
                                                <td
                                                    key={dayIdx}
                                                    style={{
                                                        ...cellTd,
                                                        background: isDragOver ? "#fef2f2" : isFrozen ? "#f8fafc" : "#ffffff",
                                                        borderColor: isDragOver ? "#C22129" : "#e2e8f0",
                                                    }}
                                                    onDragOver={isFrozen ? null : (e) => handleDragOver(e, key)}
                                                    onDragLeave={handleDragLeave}
                                                    onDrop={(e) => isFrozen ? e.preventDefault() : handleDrop(e, baseDayIdx, shift.id)}
                                                >
                                                    {/* Cell Header: Count & Quick Add button */}
                                                    <div style={cellHeaderRow}>
                                                        <span style={{ fontSize: "11px", fontWeight: "700", color: names.length > 0 ? "#0f172a" : "#94a3b8" }}>
                                                            {names.length > 0 ? `👥 ${names.length}` : ""}
                                                        </span>
                                                        {!isFrozen && (
                                                            <button
                                                                onClick={() => {
                                                                    setSlotModalData({
                                                                        dayIdx: baseDayIdx,
                                                                        shiftId: shift.id,
                                                                        dayName,
                                                                        shiftLabel: shift.label,
                                                                    });
                                                                    setSlotSearchTerm("");
                                                                }}
                                                                style={quickAddSlotBtn}
                                                                title="إضافة مسعف لهذه الفترة"
                                                            >
                                                                + إضافة
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Sunday Night Auto-rotation notice */}
                                                    {isFrozen && dayIdx === 6 && (
                                                        <div style={autoScheduleBanner}>
                                                            🔄 دوام دوري تلقائي
                                                        </div>
                                                    )}

                                                    {/* Names Container with smooth max-height to handle multiple names cleanly */}
                                                    <div style={namesScrollContainer}>
                                                        {names.map((name, ni) => {
                                                            const isSup = supervisor === name;
                                                            return (
                                                                <div
                                                                    key={ni}
                                                                    style={{
                                                                        ...memberBadge,
                                                                        background: isSup ? "#fffbeb" : "#f1f5f9",
                                                                        borderColor: isSup ? "#f59e0b" : "#e2e8f0",
                                                                    }}
                                                                >
                                                                    <div style={{ display: "flex", alignItems: "center", gap: "4px", minWidth: 0, flex: 1 }}>
                                                                        {/* Star toggle button for supervisor */}
                                                                        {!isFrozen ? (
                                                                            <button
                                                                                onClick={() => toggleSupervisor(baseDayIdx, shift.id, name)}
                                                                                title={isSup ? "إلغاء تعيين مسؤول الدوام" : "تعيين كمسؤول دوام"}
                                                                                style={{
                                                                                    ...starBtn,
                                                                                    color: isSup ? "#d97706" : "#cbd5e1",
                                                                                }}
                                                                            >
                                                                                ★
                                                                            </button>
                                                                        ) : (
                                                                            isSup && <span style={{ color: "#d97706", fontSize: "11px" }}>★</span>
                                                                        )}
                                                                        <span
                                                                            style={{
                                                                                fontSize: "11px",
                                                                                fontWeight: isSup ? "700" : "500",
                                                                                color: isSup ? "#92400e" : "#1e293b",
                                                                                whiteSpace: "nowrap",
                                                                                overflow: "hidden",
                                                                                textOverflow: "ellipsis",
                                                                            }}
                                                                            title={name}
                                                                        >
                                                                            {name}
                                                                        </span>
                                                                    </div>

                                                                    {/* Remove button */}
                                                                    {!isFrozen && (
                                                                        <button
                                                                            onClick={() => removeMedicFromSlot(baseDayIdx, shift.id, name)}
                                                                            title="إزالة من الفترة"
                                                                            style={removeBadgeBtn}
                                                                        >
                                                                            ✕
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}

                                                        {/* Empty Drop Slot Placeholder */}
                                                        {!isFrozen && names.length === 0 && (
                                                            <div
                                                                onClick={() => {
                                                                    setSlotModalData({
                                                                        dayIdx: baseDayIdx,
                                                                        shiftId: shift.id,
                                                                        dayName,
                                                                        shiftLabel: shift.label,
                                                                    });
                                                                    setSlotSearchTerm("");
                                                                }}
                                                                style={emptyDropZone}
                                                            >
                                                                + اسحب أو اضغط للإضافة
                                                            </div>
                                                        )}
                                                    </div>
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

            {/* ===== MODAL 1: ADD NEW MEMBER TO TEAM ===== */}
            {showAddMemberModal && (
                <div style={modalOverlay}>
                    <div style={modalCard}>
                        <div style={modalHeader}>
                            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>
                                ➕ إضافة مسعف جديد للفريق
                            </h3>
                            <button onClick={() => setShowAddMemberModal(false)} style={closeIconBtn}>✕</button>
                        </div>
                        <form onSubmit={handleAddNewMember}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "16px" }}>
                                <div>
                                    <label style={formLabel}>الاسم الثلاثي *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="مثال: أحمد محمد علي"
                                        value={newMemberName}
                                        onChange={(e) => setNewMemberName(e.target.value)}
                                        style={formInput}
                                    />
                                </div>

                                <div>
                                    <label style={formLabel}>الصفة / المنصب</label>
                                    <select
                                        value={newMemberRole}
                                        onChange={(e) => setNewMemberRole(e.target.value)}
                                        style={formInput}
                                    >
                                        {ROLES_LIST.map((r) => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={formLabel}>الفرع</label>
                                    <select
                                        value={newMemberBranch}
                                        onChange={(e) => setNewMemberBranch(e.target.value)}
                                        style={formInput}
                                    >
                                        <option value="البقاع الأوسط">البقاع الأوسط</option>
                                        <option value="بعلبك">بعلبك</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={formLabel}>رقم الهاتف (اختياري)</label>
                                    <input
                                        type="text"
                                        placeholder="مثال: 70123456"
                                        value={newMemberPhone}
                                        onChange={(e) => setNewMemberPhone(e.target.value)}
                                        style={formInput}
                                    />
                                </div>

                                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "10px" }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddMemberModal(false)}
                                        style={secondaryActionBtn}
                                    >
                                        إلغاء
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingMember}
                                        style={primaryActionBtn}
                                    >
                                        {isSubmittingMember ? "جاري الإضافة..." : "حفظ وإضافة للجدول"}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ===== MODAL 2: QUICK ASSIGN MEMBER TO SLOT ===== */}
            {slotModalData && (
                <div style={modalOverlay}>
                    <div style={{ ...modalCard, maxWidth: "420px" }}>
                        <div style={modalHeader}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>
                                    إضافة مسعف إلى الفترة
                                </h3>
                                <div style={{ fontSize: "12px", color: "#C22129", fontWeight: "700", marginTop: "2px" }}>
                                    {slotModalData.dayName} — {slotModalData.shiftLabel}
                                </div>
                            </div>
                            <button onClick={() => setSlotModalData(null)} style={closeIconBtn}>✕</button>
                        </div>
                        <div style={{ padding: "14px" }}>
                            <input
                                type="text"
                                placeholder="ابحث عن اسم المسعف..."
                                value={slotSearchTerm}
                                onChange={(e) => setSlotSearchTerm(e.target.value)}
                                style={{ ...formInput, marginBottom: "10px" }}
                                autoFocus
                            />

                            <div style={{ maxHeight: "260px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                                {filteredTeam
                                    .filter((m) => {
                                        const slotKey = `${slotModalData.dayIdx}-${slotModalData.shiftId}`;
                                        const alreadyIn = (schedule[slotKey] || []).includes(m[1]);
                                        const matchSlotSearch = (m[1] || "").toLowerCase().includes(slotSearchTerm.toLowerCase());
                                        return !alreadyIn && matchSlotSearch;
                                    })
                                    .map((m, i) => (
                                        <div
                                            key={i}
                                            onClick={() => {
                                                addMedicToSlot(slotModalData.dayIdx, slotModalData.shiftId, m[1]);
                                                setSlotModalData(null);
                                            }}
                                            style={quickPickCard}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                <div style={medicAvatar}>
                                                    {(m[1] || "").trim().charAt(0) || "👤"}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>{m[1]}</div>
                                                    <div style={{ fontSize: "11px", color: "#64748b" }}>{m[3] || "مسعف"}</div>
                                                </div>
                                            </div>
                                            <span style={addIconPill}>+ اختيار</span>
                                        </div>
                                    ))}

                                {filteredTeam.filter((m) => {
                                    const slotKey = `${slotModalData.dayIdx}-${slotModalData.shiftId}`;
                                    return !(schedule[slotKey] || []).includes(m[1]) && (m[1] || "").toLowerCase().includes(slotSearchTerm.toLowerCase());
                                }).length === 0 && (
                                    <div style={{ textAlign: "center", color: "#94a3b8", padding: "20px", fontSize: "12px" }}>
                                        جميع المسعفين مسجلون بالفعل في هذه الفترة أو لا توجد نتائج مطابقة
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== HIDDEN PRINTABLE TABLE (for PDF export with Arabic) ===== */}
            <div style={{ position: "fixed", left: "-9999px", top: "-9999px", zIndex: -1, pointerEvents: "none" }}>
                <div ref={printRef} dir="rtl" style={{ width: "1100px", padding: "20px", background: "#fff", fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif" }}>
                    <div style={{ textAlign: "center", marginBottom: "16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <img src={subLogo} alt="Al Shifaa Logo" style={{ width: "80px", marginBottom: "8px" }} />
                        <h2 style={{ color: "#C22129", margin: "0 0 4px" }}>جمعية الشفاء للخدمات الطبية والإنسانية</h2>
                        <h3 style={{ margin: "0 0 4px" }}>جدول دوامات المسعفين - {branchFilter}</h3>
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
                                        const names = schedule[key] || [];
                                        const supervisor = supervisors[key] || "";

                                        return (
                                            <td key={dayIdx} style={printTd}>
                                                {supervisor && (
                                                    <div style={{ fontSize: "10px", color: "#C22129", fontWeight: "bold", marginBottom: "3px", wordWrap: "break-word" }}>
                                                        ⭐ {supervisor} (مسؤول)
                                                    </div>
                                                )}
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
const pageStyle = {
    padding: "4px 8px",
    minHeight: "100vh",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const headerContainer = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
    flexWrap: "wrap",
    gap: "12px",
    paddingBottom: "12px",
    borderBottom: "1px solid #e2e8f0",
};

const branchBadge = {
    background: "#fee2e2",
    color: "#b91c1c",
    padding: "3px 10px",
    borderRadius: "16px",
    fontSize: "12px",
    fontWeight: "700",
};

const primaryActionBtn = {
    background: "#C22129",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "700",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    transition: "all 0.2s ease",
};

const secondaryActionBtn = {
    background: "#f1f5f9",
    color: "#334155",
    border: "1px solid #cbd5e1",
    padding: "8px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
};

const dangerActionBtn = {
    background: "#fff1f2",
    color: "#e11d48",
    border: "1px solid #fecdd3",
    padding: "8px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
};

const branchSelectorCard = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "12px",
    background: "#f8fafc",
    padding: "8px 14px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
};

const branchTabBtn = {
    padding: "6px 14px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
    transition: "all 0.15s ease",
};

const weekNavContainer = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px",
    marginBottom: "14px",
    background: "#ffffff",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
};

const weekNavBtn = {
    background: "#f8fafc",
    color: "#334155",
    border: "1px solid #cbd5e1",
    padding: "6px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
};

const currentWeekBtn = {
    background: "#fee2e2",
    color: "#b91c1c",
    border: "1px solid #fecaca",
    padding: "6px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "700",
};

const weekDateRangePill = {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
};

const workspaceLayout = {
    display: "flex",
    gap: "14px",
    alignItems: "flex-start",
};

const sidebarPanel = {
    width: "230px",
    minWidth: "230px",
    background: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    padding: "12px",
    maxHeight: "calc(100vh - 210px)",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
};

const countPill = {
    background: "#f1f5f9",
    color: "#475569",
    padding: "2px 7px",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: "700",
};

const quickAddHeaderBtn = {
    background: "#fee2e2",
    color: "#b91c1c",
    border: "none",
    padding: "3px 8px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: "700",
};

const searchInputStyle = {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
    fontSize: "12px",
    outline: "none",
    boxSizing: "border-box",
};

const clearSearchBtn = {
    position: "absolute",
    left: "8px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "transparent",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: "12px",
    padding: "2px",
};

const sidebarMedicsScroll = {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    paddingLeft: "2px",
};

const medicDraggableCard = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "6px 8px",
    background: "#f8fafc",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    cursor: "grab",
    userSelect: "none",
    transition: "all 0.15s ease",
};

const medicAvatar = {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    background: "#e2e8f0",
    color: "#475569",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: "bold",
    flexShrink: 0,
};

const medicNameText = {
    fontSize: "12px",
    fontWeight: "700",
    color: "#1e293b",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
};

const medicRoleText = {
    fontSize: "10px",
    color: "#64748b",
};

const dragHandleIcon = {
    color: "#cbd5e1",
    fontSize: "14px",
    cursor: "grab",
};

const tableContainer = {
    flex: 1,
    minWidth: 0,
    background: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
};

const tableWrapper = {
    overflowX: "auto",
    width: "100%",
};

const scheduleTableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12px",
    minWidth: "750px",
};

const dayHeaderTh = {
    background: "#C22129",
    color: "#ffffff",
    padding: "10px 6px",
    textAlign: "center",
    border: "1px solid #a81c22",
    width: "12.5%",
};

const shiftHeaderTh = {
    background: "#991b1b",
    color: "#ffffff",
    padding: "10px 8px",
    textAlign: "center",
    border: "1px solid #7f1d1d",
    width: "12.5%",
    fontSize: "12px",
    fontWeight: "800",
};

const shiftCellTd = {
    padding: "10px 6px",
    textAlign: "center",
    background: "#fef2f2",
    border: "1px solid #fee2e2",
    verticalAlign: "middle",
};

const cellTd = {
    padding: "6px",
    border: "1px solid #e2e8f0",
    verticalAlign: "top",
    transition: "background 0.15s ease",
    minWidth: "95px",
};

const cellHeaderRow = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
    minHeight: "18px",
};

const quickAddSlotBtn = {
    background: "transparent",
    border: "none",
    color: "#C22129",
    fontSize: "10px",
    fontWeight: "700",
    cursor: "pointer",
    padding: "1px 4px",
    borderRadius: "4px",
};

const autoScheduleBanner = {
    fontSize: "10px",
    color: "#475569",
    background: "#f1f5f9",
    padding: "2px 4px",
    borderRadius: "4px",
    textAlign: "center",
    marginBottom: "4px",
    fontWeight: "600",
};

const namesScrollContainer = {
    maxHeight: "145px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    paddingRight: "1px",
};

const memberBadge = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "4px",
    padding: "3px 6px",
    borderRadius: "6px",
    border: "1px solid #e2e8f0",
    transition: "all 0.15s ease",
};

const starBtn = {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: "12px",
    padding: 0,
    lineHeight: 1,
};

const removeBadgeBtn = {
    background: "transparent",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: "bold",
    lineHeight: 1,
    padding: "0 2px",
};

const emptyDropZone = {
    color: "#94a3b8",
    fontSize: "10px",
    textAlign: "center",
    padding: "14px 4px",
    border: "1px dashed #cbd5e1",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.15s ease",
};

const configPanelCard = {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "14px",
    marginBottom: "12px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
};

const shiftRowBox = {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    background: "#f8fafc",
    padding: "8px 10px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
};

const shiftInputText = {
    padding: "6px 8px",
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
    fontSize: "12px",
    outline: "none",
};

const timeInputBox = {
    padding: "4px 6px",
    border: "1px solid #cbd5e1",
    borderRadius: "4px",
    fontSize: "11px",
    outline: "none",
};

const shiftDeleteBtn = {
    background: "#fee2e2",
    color: "#b91c1c",
    border: "none",
    borderRadius: "4px",
    padding: "4px 8px",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: "bold",
};

const addShiftButton = {
    background: "#f1f5f9",
    color: "#334155",
    border: "1px dashed #94a3b8",
    padding: "6px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
};

const modalOverlay = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(15, 23, 42, 0.4)",
    backdropFilter: "blur(2px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "16px",
};

const modalCard = {
    background: "#ffffff",
    borderRadius: "14px",
    width: "100%",
    maxWidth: "460px",
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
};

const modalHeader = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 16px",
    borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc",
};

const closeIconBtn = {
    background: "transparent",
    border: "none",
    color: "#64748b",
    fontSize: "16px",
    cursor: "pointer",
    padding: "2px 6px",
};

const formLabel = {
    display: "block",
    fontSize: "12px",
    fontWeight: "700",
    color: "#334155",
    marginBottom: "4px",
};

const formInput = {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box",
};

const quickPickCard = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 10px",
    background: "#f8fafc",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    cursor: "pointer",
    transition: "all 0.15s ease",
};

const addIconPill = {
    fontSize: "11px",
    fontWeight: "700",
    color: "#C22129",
    background: "#fee2e2",
    padding: "3px 8px",
    borderRadius: "6px",
};

const passcodeCard = {
    background: "#fff",
    padding: "32px",
    borderRadius: "14px",
    textAlign: "center",
    maxWidth: "420px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)",
};

// Print styles
const printTh = { background: "#C22129", color: "#fff", padding: "6px 4px", border: "1px solid #a81c22", textAlign: "center", fontSize: "11px" };
const printTdLabel = { padding: "6px 4px", textAlign: "center", background: "#fdf5f5", border: "1px solid #ddd", fontSize: "10px" };
const printTd = { padding: "4px 4px", border: "1px solid #ddd", textAlign: "center", fontSize: "10px", verticalAlign: "top" };
