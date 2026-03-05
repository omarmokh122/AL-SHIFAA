import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { exportStyledExcel, exportStyledPDF } from "../utils/exportUtils";

export default function MonthlyFinancialReport() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user"));

    const [data, setData] = useState([]);
    const [month, setMonth] = useState("");
    const [year, setYear] = useState("");
    const [filtered, setFiltered] = useState([]);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [fullscreen, setFullscreen] = useState(false);

    /* ================= FETCH ================= */
    useEffect(() => {
        api.get("/financial")
            .then((res) => {
                const rows = res.data.data || [];
                console.log("Sample financial rows (col B = التاريخ):", rows.slice(0, 3).map(r => r[1]));
                setData(rows);
            })
            .catch(() => alert("خطأ في جلب البيانات المالية"));
    }, []);

    /* ================= FILTER ================= */
    function parseDate(dateStr) {
        if (!dateStr || typeof dateStr !== "string") return null;
        const raw = dateStr.trim();

        // Handle M/D/YYYY or MM/DD/YYYY — potentially with time component "3/15/2025 14:30:00"
        const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (slashMatch) {
            const m = slashMatch[1].padStart(2, "0");
            const d = slashMatch[2].padStart(2, "0");
            const y = slashMatch[3];
            return new Date(`${y}-${m}-${d}`);
        }

        // Handle YYYY-MM-DD or ISO
        return new Date(raw);
    }

    function generateReport() {
        if (!month || !year) {
            alert("اختر الشهر والسنة");
            return;
        }

        const result = data.filter((row) => {
            const dateStr = row[1]; // Column B = التاريخ
            const date = parseDate(dateStr);
            if (!date || isNaN(date.getTime())) return false;
            const matchMonth = date.getMonth() + 1 === Number(month);
            const matchYear = date.getFullYear() === Number(year);
            const matchBranch =
                user.role === "super" ? true : (row[17] || "").includes(user.branch);
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

    const exportExcel = async () => {
        const title = "التقرير المالي الشهري";
        const subtitle = `شهر ${month} سنة ${year}`;
        const medicName = user.name || user.username || "غير محدد";
        const headers = ["التاريخ", "الفئة", "نوع المصروف", "المبلغ", "العملة", "الفرع", "الفاتورة"];
        const rows = filtered.map(r => [r[1], r[2], r[3], r[15], r[14], r[17], r[16] ? "يوجد" : "لا يوجد"]);

        await exportStyledExcel(title, subtitle, medicName, headers, rows, `تقرير_مالي_${month}_${year}.xlsx`);
    };

    const exportPDF = async () => {
        const title = "التقرير المالي الشهري";
        const subtitle = `شهر ${month} سنة ${year}`;
        const medicName = user.name || user.username || "غير محدد";
        const headers = [['التاريخ', 'الفئة', 'النوع', 'المبلغ', 'العملة']];
        const rows = filtered.map(r => [r[1], r[2], r[3], r[15], r[14]]);

        await exportStyledPDF(title, subtitle, medicName, headers, rows, `تقرير_مالي_${month}_${year}.pdf`);
    };

    /* ================= DRIVE PREVIEW ================= */
    function getPreviewLink(url) {
        if (!url) return "";
        if (url.includes("/preview")) return url;

        if (url.includes("open?id=")) {
            const id = url.split("id=")[1];
            return `https://drive.google.com/file/d/${id}/preview`;
        }

        if (url.includes("/file/d/")) {
            const id = url.split("/file/d/")[1].split("/")[0];
            return `https://drive.google.com/file/d/${id}/preview`;
        }

        return url;
    }

    /* ================= UI ================= */
    return (
        <div dir="rtl" style={{ padding: "24px", width: "100%" }}>
            <div style={headerStyle}>
                <h2 style={{ margin: 0 }}>التقرير المالي الشهري</h2>
                <button onClick={() => navigate("/financial")} style={backBtn}>
                    رجوع
                </button>
            </div>

            {/* ===== FILTERS ===== */}
            <div style={filterBox}>
                <select value={month} onChange={(e) => setMonth(e.target.value)}>
                    <option value="">الشهر</option>
                    {[
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
                    ].map(({ v, l }) => (
                        <option key={v} value={v}>{l}</option>
                    ))}
                </select>

                <select value={year} onChange={(e) => setYear(e.target.value)}>
                    <option value="">السنة</option>
                    {[2024, 2025, 2026, 2027].map((y) => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>

                <button onClick={generateReport} style={btnPrimary}>
                    إنشاء التقرير
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={exportExcel} style={btnSecondary}>
                        تصدير Excel (XLSX)
                    </button>
                    <button onClick={exportPDF} style={btnSecondary}>
                        تصدير PDF
                    </button>
                </div>
            </div>

            {filtered.length > 0 && (
                <>
                    {/* ===== SUMMARY ===== */}
                    <div style={cardsGrid}>
                        <Card title="إجمالي بالدولار" value={`${totalUSD} $`} />
                        <Card title="إجمالي بالليرة" value={`${totalLBP} ل.ل`} />
                        <Card title="عدد العمليات" value={filtered.length} />
                    </div>

                    <h4>تفصيل حسب فئة المصروف</h4>
                    <div style={cardsGrid}>
                        {Object.entries(categoryTotals).map(([k, v]) => (
                            <Card key={k} title={k} value={v} />
                        ))}
                    </div>

                    {/* ===== TABLE + PREVIEW ===== */}
                    <div style={layoutGrid}>
                        {/* TABLE */}
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
                                                background:
                                                    selectedInvoice === r[16] ? "#f5f5f5" : "transparent",
                                            }}
                                            onClick={() => r[16] && setSelectedInvoice(r[16])}
                                        >
                                            <td>{r[1]}</td>
                                            <td>{r[2]}</td>
                                            <td>{r[3]}</td>
                                            <td>{r[15]}</td>
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
                                        <button
                                            onClick={() => setFullscreen(true)}
                                            style={zoomBtn}
                                        >
                                            تكبير
                                        </button>
                                    </div>

                                    <iframe
                                        src={getPreviewLink(selectedInvoice)}
                                        style={iframeStyle}
                                        title="Invoice Preview"
                                    />
                                </>
                            ) : (
                                <p style={{ color: "#777", textAlign: "center", marginTop: "40px" }}>
                                    اختر صفًا لعرض الفاتورة
                                </p>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* ===== FULLSCREEN MODAL ===== */}
            {fullscreen && selectedInvoice && (
                <div style={modalOverlay}>
                    <div style={modalContent}>
                        <button
                            onClick={() => setFullscreen(false)}
                            style={closeBtn}
                        >
                            ✕
                        </button>

                        <iframe
                            src={getPreviewLink(selectedInvoice)}
                            style={{ width: "100%", height: "100%", border: "none" }}
                            title="Invoice Fullscreen"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

/* ================= COMPONENTS ================= */
function Card({ title, value }) {
    return (
        <div style={card}>
            <div style={{ fontSize: "14px", color: "#555" }}>{title}</div>
            <div style={{ fontSize: "18px", fontWeight: "bold" }}>{value}</div>
        </div>
    );
}

/* ================= STYLES ================= */
const filterBox = {
    display: "flex",
    gap: "10px",
    marginBottom: "16px",
};

const cardsGrid = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
    marginBottom: "28px",
};

const layoutGrid = {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "16px",
    marginTop: "20px",
};

const card = {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "16px",
    textAlign: "center",
};

const previewBox = {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "12px",
};

const previewHeader = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "6px",
};

const iframeStyle = {
    width: "100%",
    height: "420px",
    border: "1px solid #ddd",
    borderRadius: "8px",
};

const zoomBtn = {
    background: "#424443",
    color: "#fff",
    border: "none",
    padding: "4px 10px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
};

const btnPrimary = {
    background: "#C22129",
    color: "#fff",
    border: "none",
    padding: "8px 14px",
    borderRadius: "6px",
};

const btnSecondary = {
    background: "#424443",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
};

const table = {
    width: "100%",
    borderCollapse: "collapse",
};

const modalOverlay = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "rgba(0,0,0,0.7)",
    zIndex: 1000,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
};

const modalContent = {
    width: "90%",
    height: "90%",
    background: "#fff",
    borderRadius: "10px",
    position: "relative",
};

const closeBtn = {
    position: "absolute",
    top: "10px",
    right: "10px",
    background: "#C22129",
    color: "#fff",
    border: "none",
    borderRadius: "50%",
    width: "32px",
    height: "32px",
    cursor: "pointer",
};

const headerStyle = {
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
