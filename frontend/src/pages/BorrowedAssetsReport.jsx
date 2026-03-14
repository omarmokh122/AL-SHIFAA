import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function BorrowedAssetsReport() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user"));

    const [assets, setAssets] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [generated, setGenerated] = useState(false);

    const [month, setMonth] = useState("");
    const [year, setYear] = useState("");
    const [day, setDay] = useState("");

    const [stats, setStats] = useState({
        totalTransactions: 0,
        totalItemsBorrowed: 0,
        returnedCount: 0,
        itemTypes: {},
    });

    /* ================= LOAD DATA ================= */
    useEffect(() => {
        api.get("/assets").then((res) => {
            const allAssets = res.data.data || [];
            // Filter only borrowed assets logic
            const borrowedOnly = allAssets.filter(a => a[2] === "اعاره للاصول المعاره");
            setAssets(borrowedOnly);
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

        const result = assets.filter((a) => {
            const dateStr = a[3]; // Date field for borrowed assets
            if (!dateStr) return false;
            const d = new Date(dateStr);

            return (
                (day ? d.getDate() === Number(day) : true) &&
                d.getMonth() + 1 === Number(month) &&
                d.getFullYear() === Number(year) &&
                (user.role === "super" || (a[1] || "").includes(user.branch))
            );
        });

        // Calculate stats
        let totalQty = 0;
        let returned = 0;
        const types = {};

        result.forEach(a => {
            const qty = parseInt(a[6]) || 0;
            totalQty += qty;
            if (a[7] === "مرتجع") returned++;

            const type = a[4]; // Asset Name
            types[type] = (types[type] || 0) + qty;
        });

        setFiltered(result);
        setStats({
            totalTransactions: result.length,
            totalItemsBorrowed: totalQty,
            returnedCount: returned,
            itemTypes: types,
        });
        setGenerated(true);
    };

    const exportExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(filtered.map(a => ({
            "التاريخ": a[3],
            "الفرع": a[1],
            "اسم الأصل": a[4],
            "المستلم": a[5],
            "رقم الهاتف": a[8],
            "الموقع": a[10],
            "الكمية": a[6],
            "الحالة": a[7] || "معار",
            "ملاحظات": a[13]
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "BorrowedAssets");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        saveAs(data, `تقرير_الاعارات_${month}_${year}.xlsx`);
    };

    const exportPDF = () => {
        const doc = new jsPDF();
        doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
        doc.setFont("Amiri"); // If Arabic font supported, otherwise English fallback

        doc.text(`تقرير الأصول المعارة - شهر ${month} سنة ${year}`, 10, 10);

        const tableBody = filtered.map(a => [
            a[3], // Date
            a[4], // Item Name
            a[5], // Recipient
            a[8], // Phone number
            a[6], // Qty
            a[7] || "معار", // Status
            a[10] // Location
        ]);

        doc.autoTable({
            head: [['التاريخ', 'اسم الأصل', 'المستلم', 'رقم الهاتف', 'الكمية', 'الحالة', 'الموقع']],
            body: tableBody,
            startY: 20,
            styles: { font: "helvetica", halign: 'right' }, // Using standard font to avoid issues if custom font not loaded
            headStyles: { halign: 'right' }
        });
        doc.save(`تقرير_الاعارات_${month}_${year}.pdf`);
    };

    /* ================= UI ================= */
    return (
        <div dir="rtl" style={page}>
            <div style={header}>
                <h2 style={title}>تقرير الأصول المعارة الشهري</h2>
                <button onClick={() => navigate("/borrowed-assets")} style={backBtn}>
                    رجوع
                </button>
            </div>

            {/* Filters */}
            <div style={filterBox}>
                <select value={day} onChange={(e) => setDay(e.target.value)} style={select}>
                    <option value="">اليوم</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d}>{d}</option>
                    ))}
                </select>
                <select value={month} onChange={(e) => setMonth(e.target.value)} style={select}>
                    <option value="">الشهر</option>
                    {months.map((m) => (
                        <option key={m.v} value={m.v}>{m.l}</option>
                    ))}
                </select>

                <select value={year} onChange={(e) => setYear(e.target.value)} style={select}>
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
                    {/* Executive Summary */}
                    <div style={summary}>
                        <h4>ملخص التقرير</h4>
                        <p>
                            يعرض هذا التقرير حركة استعارة الأصول خلال شهر{" "}
                            <strong>{month}</strong> سنة{" "}
                            <strong>{year}</strong> في{" "}
                            <strong>{user.role === "super" ? "جميع الفروع" : user.branch}</strong>.
                        </p>
                    </div>

                    {/* Cards */}
                    <div style={cards}>
                        <Card title="عدد عمليات الإعارة" value={stats.totalTransactions} icon="📝" />
                        <Card title="إجمالي المواد المعارة" value={stats.totalItemsBorrowed} icon="📦" />
                        <Card title="تم استرجاعها" value={stats.returnedCount} icon="↩️" />
                        <Card title="أنواع المواد" value={Object.keys(stats.itemTypes).length} icon="📊" />
                    </div>

                    {/* Breakdown by Type */}
                    {Object.keys(stats.itemTypes).length > 0 && (
                        <div style={breakdown}>
                            <h4>توزيع المواد المعارة:</h4>
                            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                                {Object.entries(stats.itemTypes).map(([type, qty]) => (
                                    <span key={type} style={tag}>
                                        {type}: <strong>{qty}</strong>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    <div className="table-container" style={tableBox}>
                        <table style={table}>
                            <thead>
                                <tr>
                                    <th>التاريخ</th>
                                    <th>الفرع</th>
                                    <th>اسم الأصل</th>
                                    <th>المستلم (لمن)</th>
                                    <th>رقم الهاتف</th>
                                    <th>الموقع</th>
                                    <th>الكمية</th>
                                    <th>الحالة</th>
                                    <th>ملاحظات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: "center", padding: "20px" }}>لا توجد بيانات لهذا الشهر</td>
                                    </tr>
                                ) : (
                                    filtered.map((a, i) => (
                                        <tr key={i} style={a[7] === "مرتجع" ? returnedRow : {}}>
                                            <td>{a[3]}</td>
                                            <td>{a[1]}</td>
                                            <td>{a[4]}</td>
                                            <td>{a[5]}</td>
                                            <td dir="ltr" style={{ textAlign: "right" }}>{a[8]}</td>
                                            <td>{a[10]}</td>
                                            <td>{a[6]}</td>
                                            <td>
                                                <span style={a[7] === "مرتجع" ? returnedBadge : activeBadge}>
                                                    {a[7] || "معار"}
                                                </span>
                                            </td>
                                            <td>{a[13]}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
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
function Card({ title, value, icon }) {
    return (
        <div style={card}>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>{icon}</div>
            <div style={{ color: "#666", fontSize: "12px" }}>{title}</div>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#333" }}>{value}</div>
        </div>
    );
}

/* ================= Styles ================= */
const page = {
    padding: "24px",
    background: "#f4f6f8",
    minHeight: "100vh",
};

const header = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
};

const title = {
    margin: 0,
    fontSize: "24px",
    color: "#333",
};

const backBtn = {
    background: "#6c757d",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
};

const filterBox = {
    display: "flex",
    gap: "12px",
    background: "#fff",
    padding: "16px",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    marginBottom: "20px",
};

const select = {
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    minWidth: "150px",
};

const primaryBtn = {
    background: "#C22129",
    color: "#fff",
    border: "none",
    padding: "10px 20px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
};

const summary = {
    background: "#fff",
    padding: "16px",
    borderRadius: "8px",
    marginBottom: "16px",
    borderRight: "4px solid #C22129",
};

const cards = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "16px",
    marginBottom: "20px",
};

const card = {
    background: "#fff",
    padding: "20px",
    borderRadius: "8px",
    textAlign: "center",
    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
};

const breakdown = {
    background: "#fff",
    padding: "16px",
    borderRadius: "8px",
    marginBottom: "20px",
};

const tag = {
    background: "#e9ecef",
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "14px",
    color: "#495057",
};

const tableBox = {
    background: "#fff",
    padding: "16px",
    borderRadius: "8px",
    overflowX: "auto",
};

const table = {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "800px",
};

const returnedRow = {
    background: "#f8f9fa",
    color: "#adb5bd",
};

const badge = {
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: "bold",
};

const activeBadge = {
    ...badge,
    background: "#fff3cd",
    color: "#856404",
};

const returnedBadge = {
    ...badge,
    background: "#d4edda",
    color: "#155724",
};

const secondaryBtn = {
    background: "#424443",
    color: "#fff",
    border: "none",
    padding: "10px 20px",
    borderRadius: "6px",
    cursor: "pointer",
};
