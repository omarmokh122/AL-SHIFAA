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
  const [selectedBranch, setSelectedBranch] = useState("");

  const [cases, setCases] = useState([]);
  const [financial, setFinancial] = useState([]);
  const [assets, setAssets] = useState([]);
  const [team, setTeam] = useState([]);
  const [donations, setDonations] = useState([]);
  const [showUSD, setShowUSD] = useState(false);

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

      let matchBranch = true;
      if (user.role === "super") {
        matchBranch = selectedBranch ? (r[branchIndex] || "").includes(selectedBranch) : true;
      } else {
        matchBranch = (r[branchIndex] || "").includes(user.branch);
      }

      return matchMonth && matchYear && matchBranch;
    });
  }

  /* ================= CALCULATIONS ================= */
  // Reverse arrays to show newest data first (since Google Sheets appends to bottom)
  const sortedCases = [...cases].reverse();
  const sortedDonations = [...donations].reverse();

  const filteredCases = filterByDateAndBranch(sortedCases, 1, 2);
  const filteredDonations = filterByDateAndBranch(sortedDonations, 1, 2);

  const parseAmount = (val) => {
    if (!val) return 0;
    const num = parseFloat(String(val).replace(/,/g, ""));
    return isNaN(num) ? 0 : num;
  };

  let totalLBP = 0;
  let totalUSD = 0;
  let totalCashCount = 0;

  filteredDonations.forEach(r => {
    // r[4] is Type (نقدي means Cash)
    if (r[4] === "نقدي") {
      totalCashCount++;
      const val = parseAmount(r[6]); // Amount at index 6
      const cur = (r[7] || "").toUpperCase(); // Currency at index 7
      if (cur === "USD" || cur === "$") totalUSD += val;
      else totalLBP += val;
    }
  });

  const filteredAssets = assets.filter(a => {
    if (user.role === "super") {
      return selectedBranch ? (a[1] || "").includes(selectedBranch) : true;
    }
    return (a[1] || "").includes(user.branch);
  });

  const filteredTeam = team.filter(t => {
    if (user.role === "super") {
      return selectedBranch ? (t[2] || "").includes(selectedBranch) : true; // Branch is at index 2 now
    }
    return (t[2] || "").includes(user.branch);
  });

  /* ================= DATA FOR CHART ================= */
  const monthsNames = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];

  const chartData = monthsNames.map((name, index) => {
    const count = cases.filter(c => {
      const d = new Date(c[1]);
      const matchYear = year ? d.getFullYear() === Number(year) : true;

      let matchBranch = true;
      if (user.role === "super") {
        matchBranch = selectedBranch ? (c[2] || "").includes(selectedBranch) : true;
      } else {
        matchBranch = (c[2] || "").includes(user.branch);
      }

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
      <div style={filterBox} className="form-grid-mobile">
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

        {user.role === "super" && (
          <select
            style={{ ...selectStyle, borderColor: '#C22129', fontWeight: 'bold' }}
            value={selectedBranch}
            onChange={e => setSelectedBranch(e.target.value)}
          >
            <option value="">كل الفروع</option>
            <option value="البقاع الأوسط">البقاع الأوسط</option>
            <option value="بعلبك">بعلبك</option>
          </select>
        )}
      </div>

      {/* ===== SUMMARY CARDS ===== */}
      <div style={cardsGrid} className="dashboard-grid">
        <Card title="عدد الحالات الطبية" value={filteredCases.length} color="#C22129" />
        <Card title="عدد التبرعات النقدية" value={totalCashCount} color="#2e7d32" />
        <Card
          title="إجمالي التبرعات النقدية"
          value={showUSD
            ? `$${(totalUSD + (totalLBP / 89500)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
            : `${(totalLBP + (totalUSD * 89500)).toLocaleString()} ل.ل`
          }
          color="#2e7d32"
          onClick={() => setShowUSD(!showUSD)}
        />
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
function Card({ title, value, color, onClick }) {
  return (
    <div style={{ ...card, cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
      <div style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>{title}</div>
      <div style={{ fontSize: "24px", fontWeight: "bold", color: color }}>
        {value}
      </div>
      {onClick && <div style={{ fontSize: "10px", color: "#999", marginTop: "4px" }}>اضغط للتحويل</div>}
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
