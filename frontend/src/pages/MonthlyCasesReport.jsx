import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function MonthlyCasesReport() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user"));

    const [cases, setCases] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [generated, setGenerated] = useState(false);

    const [month, setMonth] = useState("");
    const [year, setYear] = useState("");
    const [selectedType, setSelectedType] = useState("ALL");

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
        { v: 1, l: "يناير" }, { v: 2, l: "فبراير" },
        { v: 3, l: "مارس" }, { v: 4, l: "أبريل" },
        { v: 5, l: "مايو" }, { v: 6, l: "يونيو" },
        { v: 7, l: "يوليو" }, { v: 8, l: "أغسطس" },
        { v: 9, l: "سبتمبر" }, { v: 10, l: "أكتوبر" },
        { v: 11, l: "نوفمبر" }, { v: 12, l: "ديسمبر" },
    ];

    const years = [2024, 2025, 2026, 2027];

    /* ================= GENERATE REPORT ================= */
    const generateReport = () => {
        if (!month || !year) {
            alert("يرجى اختيار الشهر والسنة");
            return;
        }

        const base = cases.filter((c) => {
            const d = new Date(c[1]);
            return (
                d.getMonth() + 1 === Number(month) &&
                d.getFullYear() === Number(year) &&
                (user.role === "super" || c[2] === user.branch)
            );
        });

        applyTypeFilter(base, selectedType);
        setGenerated(true);
    };

    const applyTypeFilter = (data, type) => {
        const result = type === "ALL" ? data : data.filter((c) => c[4] === type);

        const maleCases = result.filter((c) => c[3] === "ذكر").length;
        const femaleCases = result.filter((c) => c[3] === "أنثى").length;

        const types = {};
        data.forEach((c) => {
            types[c[4]] = (types[c[4]] || 0) + 1;
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
        // We filter from the already month-filtered 'cases' logic if we want to be correct
        const base = cases.filter((c) => {
            const d = new Date(c[1]);
            return (
                d.getMonth() + 1 === Number(month) &&
                d.getFullYear() === Number(year) &&
                (user.role === "super" || c[2] === user.branch)
            );
        });
        applyTypeFilter(base, v);
    };

    const exportExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(filtered.map(c => ({
            "التاريخ": c[1],
            "الفرع": c[2],
            "الجنس": c[3],
            "نوع الحالة": c[4],
            "الفريق": c[5],
            "ملاحظات": c[6]
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Cases");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        saveAs(data, `تقرير_الحالات_${month}_${year}.xlsx`);
    };

    const exportPDF = () => {
        const doc = new jsPDF();
        doc.text(`تقرير الحالات الطبية - شهر ${month} سنة ${year}`, 10, 10);
        doc.autoTable({
            head: [['التاريخ', 'الفرع', 'الجنس', 'نوع الحالة', 'الفريق']],
            body: filtered.map(c => [c[1], c[2], c[3], c[4], c[5]]),
            startY: 20,
            styles: { font: "Amiri", direction: 'rtl' } // Assuming a font for Arabic if needed, or stick to simple
        });
        doc.save(`تقرير_الحالات_${month}_${year}.pdf`);
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
                            {Object.keys(stats.types).map((t) => (
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
                            <strong>{user.role === "super" ? "جميع الفروع" : user.branch}</strong>.
                        </p>
                        <p><strong>إجمالي الحالات:</strong> {stats.total}</p>
                    </div>

                    {/* Cards */}
                    <div style={cards}>
                        <Card title="إجمالي الحالات" value={stats.total} />
                        <Card title="ذكور" value={stats.male} />
                        <Card title="إناث" value={stats.female} />
                        <Card title="أنواع الحالات" value={Object.keys(stats.types).length} />
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
                                        <td>{c[2]}</td>
                                        <td>{c[3]}</td>
                                        <td>{c[4]}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={exportExcel} style={secondaryBtn}>
                            تصدير Excel (XLSX)
                        </button>
                        <button onClick={exportPDF} style={secondaryBtn}>
                            تصدير PDF
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
    background: "#f4f6f8",
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
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
    marginTop: "16px",
};

const card = {
    background: "#fff",
    padding: "16px",
    borderRadius: "8px",
    textAlign: "center",
    boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
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
    padding: "8px 16px",
    borderRadius: "6px",
};

const secondaryBtn = {
    marginTop: "16px",
    background: "#424443",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
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
