import { useEffect, useState } from "react";
import api from "../api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const [cases, setCases] = useState([]);
  const [financial, setFinancial] = useState([]);
  const [assets, setAssets] = useState([]);
  const [team, setTeam] = useState([]);
  const [donations, setDonations] = useState([]);

  /* ================= FETCH ALL ================= */
  useEffect(() => {
    api.get("/cases").then(res => setCases(res.data.data || []));
    api.get("/financial").then(res => setFinancial(res.data.data || []));
    api.get("/assets").then(res => setAssets(res.data.data || []));
    api.get("/medical-team").then(res => setTeam(res.data.data || []));
    api.get("/donations").then(res => setDonations(res.data.data || []));
  }, []);

  /* ================= FILTER HELPERS ================= */
  function filterByDateAndBranch(rows, dateIndex, branchIndex) {
    return rows.filter(r => {
      const date = new Date(r[dateIndex]);
      const matchMonth = month ? date.getMonth() + 1 === Number(month) : true;
      const matchYear = year ? date.getFullYear() === Number(year) : true;
      const matchBranch = user.role === "super" ? true : r[branchIndex] === user.branch;
      return matchMonth && matchYear && matchBranch;
    });
  }

  /* ================= CALCULATIONS ================= */
  const filteredCases = filterByDateAndBranch(cases, 1, 2);
  const filteredDonations = filterByDateAndBranch(donations, 1, 2);

  const totalCashDonations = filteredDonations.reduce((sum, r) => {
    if (r[4] === "مادي") return sum + Number(r[6] || 0);
    return sum;
  }, 0);

  const filteredAssets =
    user.role === "super" ? assets : assets.filter(a => a[1] === user.branch);

  const filteredTeam =
    user.role === "super" ? team : team.filter(t => t[1] === user.branch);

  /* ================= DATA FOR CHART ================= */
  const monthsNames = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];

  const chartData = monthsNames.map((name, index) => {
    const count = cases.filter(c => {
      const d = new Date(c[1]);
      const matchYear = year ? d.getFullYear() === Number(year) : true;
      const matchBranch = user.role === "super" ? true : c[2] === user.branch;
      return d.getMonth() === index && matchYear && matchBranch;
    }).length;
    return { name, cases: count };
  });

  /* ================= UI ================= */
  return (
    <div dir="rtl" style={{ padding: "24px", width: "100%", background: "#f9f9f9", minHeight: "100vh" }}>
      <h2 style={{ color: "#333", marginBottom: "8px" }}>لوحة التحكم</h2>

      <p style={{ color: "#666", maxWidth: "900px", marginBottom: "24px", lineHeight: "1.6" }}>
        تتيح لك لوحة التحكم متابعة الأداء العام للجمعية بشكل سريع ومركزي، من
        خلال عرض ملخص الحالات الطبية، التبرعات، الأصول، والفريق الطبي حسب
        الفترة الزمنية المختارة والفرع.
      </p>

      {/* ===== FILTERS ===== */}
      <div style={filterBox}>
        <select style={selectStyle} value={month} onChange={e => setMonth(e.target.value)}>
          <option value="">الشهر</option>
          {[...Array(12)].map((_, i) => (
            <option key={i} value={i + 1}>{i + 1}</option>
          ))}
        </select>

        <select style={selectStyle} value={year} onChange={e => setYear(e.target.value)}>
          <option value="">السنة</option>
          {[2024, 2025, 2026, 2027].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* ===== SUMMARY CARDS ===== */}
      <div style={cardsGrid}>
        <Card title="عدد الحالات الطبية" value={filteredCases.length} color="#C22129" />
        <Card title="إجمالي التبرعات النقدية" value={`${totalCashDonations.toLocaleString()} ل.س`} color="#2e7d32" />
        <Card title="عدد الأصول" value={filteredAssets.length} color="#1976d2" />
        <Card title="عدد الفريق الطبي" value={filteredTeam.length} color="#ed6c02" />
      </div>

      {/* ===== CHART SECTION ===== */}
      <div style={chartSection}>
        <h3 style={{ marginBottom: "20px", fontSize: "18px" }}>توزيع الحالات الطبية خلال العام</h3>
        <div style={{ width: "100%", height: 350 }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="cases" name="عدد الحالات" fill="#C22129" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ================= COMPONENT ================= */
function Card({ title, value, color }) {
  return (
    <div style={card}>
      <div style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>{title}</div>
      <div style={{ fontSize: "24px", fontWeight: "bold", color: color }}>
        {value}
      </div>
    </div>
  );
}

/* ================= STYLES ================= */
const filterBox = {
  display: "flex",
  gap: "12px",
  marginBottom: "24px",
};

const selectStyle = {
  padding: "8px 12px",
  borderRadius: "8px",
  border: "1px solid #ddd",
  background: "#fff",
  minWidth: "120px",
  outline: "none",
};

const cardsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "20px",
  marginBottom: "32px",
};

const card = {
  background: "#fff",
  border: "1px solid #eee",
  borderRadius: "16px",
  padding: "24px",
  textAlign: "center",
  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  transition: "transform 0.2s ease",
};

const chartSection = {
  background: "#fff",
  padding: "24px",
  borderRadius: "16px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  border: "1px solid #eee",
};
