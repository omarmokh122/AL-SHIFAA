import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function MonthlyDonationsReport() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user"));

    const [data, setData] = useState([]);
    const [month, setMonth] = useState("");
    const [year, setYear] = useState("");
    const [filtered, setFiltered] = useState([]);

    useEffect(() => {
        api
            .get("/donations")
            .then((res) => setData(res.data.data || []))
            .catch(() => alert("خطأ في جلب بيانات التبرعات"));
    }, []);

    function generateReport() {
        if (!month || !year) {
            alert("اختر الشهر والسنة");
            return;
        }

        const result = data.filter((r) => {
            const date = new Date(r[1]);
            const matchMonth = date.getMonth() + 1 === Number(month);
            const matchYear = date.getFullYear() === Number(year);
            const matchBranch =
                user.role === "super" ? true : (r[2] || "").includes(user.branch);

            return matchMonth && matchYear && matchBranch;
        });

        setFiltered(result);
    }

    /* ===== CALCULATIONS ===== */
    let cashCount = 0;
    let usdSum = 0;
    let lbpSum = 0;
    let inKind = 0;

    filtered.forEach((r) => {
        if (r[4] === "نقدي") {
            cashCount++;
            const val = Number(r[6] || 0);
            const cur = (r[7] || "").toUpperCase();
            if (cur === "USD" || cur === "$") usdSum += val;
            else lbpSum += val;
        }
        if (r[4] === "عيني") {
            const val = parseFloat(String(r[9] || "0").replace(/[^0-9.]/g, ""));
            inKind += isNaN(val) ? 0 : val;
        }
    });

    const exportExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(filtered.map(r => ({
            "التاريخ": r[1],
            "الفرع": r[2],
            "اسم المتبرع": r[3],
            "نوع التبرع": r[4],
            "طريقة التبرع": r[5],
            "المبلغ": r[6],
            "العملة": r[7],
            "التبرع العيني": r[8],
            "الكمية": r[9]
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Donations");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const blobData = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        saveAs(blobData, `تقرير_التبرعات_${month}_${year}.xlsx`);
    };

    const exportPDF = () => {
        const doc = new jsPDF();
        doc.text(`تقرير التبرعات - شهر ${month} سنة ${year}`, 10, 10);
        doc.autoTable({
            head: [['التاريخ', 'الاسم', 'النوع', 'المبلغ', 'العملة']],
            body: filtered.map(r => [r[1], r[3], r[4], r[6], r[7]]),
            startY: 20
        });
        doc.save(`تقرير_التبرعات_${month}_${year}.pdf`);
    };

    return (
        <div dir="rtl" style={{ padding: "20px" }}>
            <div style={header}>
                <h2 style={{ margin: 0 }}>تقرير التبرعات الشهري</h2>
                <button onClick={() => navigate("/donations")} style={backBtn}>
                    رجوع
                </button>
            </div>

            <div style={filterBox}>
                <select value={month} onChange={(e) => setMonth(e.target.value)}>
                    <option value="">الشهر</option>
                    {[...Array(12)].map((_, i) => (
                        <option key={i} value={i + 1}>{i + 1}</option>
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
                <div style={cardsGrid}>
                    <Card title="عدد التبرعات الكلي" value={filtered.length} />
                    <Card title="عدد التبرعات النقدية" value={cashCount} />
                    <Card title="إجمالي المبالغ" value={`${usdSum.toLocaleString()}$ + ${lbpSum.toLocaleString()} ل.ل`} />
                    <Card title="إجمالي عيني (كمية)" value={inKind} />
                </div>
            )}
        </div>
    );
}

/* ===== COMPONENT ===== */
function Card({ title, value }) {
    return (
        <div style={card}>
            <div style={{ fontSize: "14px", color: "#555" }}>{title}</div>
            <div style={{ fontSize: "18px", fontWeight: "bold" }}>{value}</div>
        </div>
    );
}

/* ===== STYLES ===== */
const filterBox = {
    display: "flex",
    gap: "10px",
    marginBottom: "16px",
};

const cardsGrid = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "14px",
    marginBottom: "20px",
};

const card = {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "16px",
    textAlign: "center",
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
    padding: "8px 14px",
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
