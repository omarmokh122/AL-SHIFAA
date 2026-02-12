import { useNavigate } from "react-router-dom";

export default function Financial() {
  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();

  return (
    <div dir="rtl" style={container}>

      {/* ===== TITLE & DESCRIPTION ===== */}
      <h2 style={title}>الإدارة المالية</h2>
      <p style={description}>
        يتيح هذا القسم إدارة ومراجعة المصروفات المالية الخاصة بالمركز،
        مع إمكانية إنشاء تقارير مالية شهرية مفصلة حسب الفئات المختلفة
        (صيانة، محروقات، اتصالات، تجهيزات إسعافية وغيرها).
        تساعد هذه التقارير الإدارة على متابعة الإنفاق وتحليل المصاريف
        بشكل منظم ودقيق.
      </p>

      {/* ===== HEADER ACTION ===== */}
      <div style={header}>
        <h3 style={{ margin: 0 }}>نظرة عامة مالية</h3>

        <button
          onClick={() => navigate("/reports/monthly-financial")}
          style={btnPrimary}
        >
          التقرير المالي الشهري
        </button>
      </div>

      {/* ===== PREVIEW CARDS ===== */}
      <div style={cardsGrid}>
        <InfoCard title="نوع التقرير" value="تقرير مالي شهري" />
        <InfoCard
          title="الفرع"
          value={user.role === "super" ? "جميع الفروع" : user.branch}
        />
        <InfoCard title="العملات المعتمدة" value="دولار / ليرة لبنانية" />
      </div>

      {/* ===== INFO SECTION ===== */}
      <section style={section}>
        <h4 style={sectionTitle}>كيفية استخدام هذا القسم</h4>
        <div style={infoBox}>
          <p>
            من خلال هذا القسم يمكنك الانتقال إلى صفحة التقرير المالي الشهري
            لاختيار الشهر والسنة المطلوبة، ثم الاطلاع على ملخص شامل للمصاريف
            وتفاصيلها حسب فئة المصروف.
          </p>

          <p>
            يتم عرض البيانات تلقائيًا حسب صلاحيات المستخدم،
            حيث يمكن لمسؤول الفرع الاطلاع على بيانات فرعه فقط،
            بينما يستطيع المدير العام مراجعة جميع الفروع.
          </p>

          <p>
            استخدم زر <strong>التقرير المالي الشهري</strong> أعلاه
            لبدء عملية إنشاء التقرير.
          </p>
        </div>
      </section>
    </div>
  );
}

/* ================= COMPONENTS ================= */
function InfoCard({ title, value }) {
  return (
    <div style={card}>
      <div style={{ fontSize: "14px", color: "#555" }}>{title}</div>
      <div style={{ fontSize: "18px", fontWeight: "bold" }}>{value}</div>
    </div>
  );
}

/* ================= STYLES ================= */
const container = {
  padding: "24px",
  width: "100%",
};

const title = {
  marginBottom: "6px",
};

const description = {
  maxWidth: "900px",
  color: "#555",
  lineHeight: "1.7",
  marginBottom: "26px",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "18px",
};

const cardsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "14px",
  marginBottom: "28px",
};

const card = {
  background: "#fff",
  border: "1px solid #ddd",
  borderRadius: "10px",
  padding: "16px",
  textAlign: "center",
};

const section = {
  marginBottom: "32px",
};

const sectionTitle = {
  marginBottom: "12px",
};

const infoBox = {
  background: "#f9f9f9",
  border: "1px solid #ddd",
  borderRadius: "10px",
  padding: "18px",
  lineHeight: "1.8",
};

const btnPrimary = {
  background: "#C22129",
  color: "#fff",
  border: "none",
  padding: "10px 18px",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "14px",
};
