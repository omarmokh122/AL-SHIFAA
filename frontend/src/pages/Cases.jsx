import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

/* ===== Constants ===== */
const CASE_TYPES = [
    "حالات طارئة",
    "أمراض قلبية",
    "جهاز تنفسي",
    "حالات عصبية",
    "حالات طبية",
    "كسور",
    "حروق",
    "جروح",
    "جراحة",
    "كورونا",
    "متابعة",
    "متابعة منزلية للمرضى",
    "علاج ميداني",
    "حادث",
    "نقل إصابات وجرحى",
    "نقل شهداء",
    "جثة",
    "دفاع مدني",
    "تأمين نازحين (عوائل)",
    "توزيع أدوية",
    "تأمين معدات طبية",
    "توزيع حليب",
    "توزيع حفاضات",
    "تلبية استهدافات",
    "انتخابات – نقل ناخبين من ذوي الاحتياجات الخاصة"
];

const MONTHS = [
    { v: "كانون الثاني", l: "كانون الثاني" }, { v: "شباط", l: "شباط" },
    { v: "آذار", l: "آذار" }, { v: "نيسان", l: "نيسان" },
    { v: "أيار", l: "أيار" }, { v: "حزيران", l: "حزيران" },
    { v: "تموز", l: "تموز" }, { v: "آب", l: "آب" },
    { v: "أيلول", l: "أيلول" }, { v: "تشرين الأول", l: "تشرين الأول" },
    { v: "تشرين الثاني", l: "تشرين الثاني" }, { v: "كانون الأول", l: "كانون الأول" },
];

export default function Cases() {
    const user = JSON.parse(localStorage.getItem("user"));
    const navigate = useNavigate();

    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingCaseId, setEditingCaseId] = useState(null);

    const [form, setForm] = useState({
        التاريخ: "",
        الفرع: user?.branch || "",
        الجنس: "",
        نوع_الحالة: "",
        ملاحظات: "",
    });

    /* ===== Fetch Cases ===== */
    async function fetchCases() {
        try {
            const res = await api.get("/cases");
            setCases(res.data.data || []);
        } catch (err) {
            console.error(err);
            alert("خطأ في جلب الحالات");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchCases();
    }, []);

    /* ===== Form Handlers ===== */
    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    async function submitCase(e) {
        e.preventDefault();
        try {
            if (editingCaseId) {
                // Update mode
                await api.put(`/cases/${editingCaseId}`, form);
                setEditingCaseId(null);
            } else {
                // Add mode
                await api.post("/cases", form);
            }
            fetchCases();
            setForm({
                التاريخ: "",
                الفرع: user?.branch || "",
                الجنس: "",
                نوع_الحالة: "",
                ملاحظات: "",
            });
        } catch (err) {
            console.error(err);
            alert("خطأ أثناء حفظ الحالة");
        }
    }

    function handleEdit(caseData) {
        setEditingCaseId(caseData[0]); // ID is at index 0
        setForm({
            ...form,
            التاريخ: caseData[1],
            الفرع: caseData[4],
            الجنس: caseData[5],
            نوع_الحالة: caseData[6],
            ملاحظات: caseData[7] || "",
            CreatedAt: caseData[8] // preserve the original created diff timing
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function handleDelete(id) {
        if (!window.confirm("هل أنت متأكد من حذف هذه الحالة؟")) return;
        try {
            await api.delete(`/cases/${id}`);
            alert("تم حذف الحالة بنجاح");
            fetchCases();
        } catch (err) {
            console.error(err);
            alert("خطأ أثناء حذف الحالة");
        }
    }

    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [branchFilter, setBranchFilter] = useState("");
    const [filterMonth, setFilterMonth] = useState("");
    const [filterYear, setFilterYear] = useState("");

    /* ===== Filtering Logic ===== */
    const sortedCases = [...cases].reverse();
    const visibleCases = sortedCases.filter((c) => {
        let matchBranch = true;
        if (user.role === "super") {
            matchBranch = branchFilter ? (c[4] || "").includes(branchFilter) : true;
        } else {
            matchBranch = (c[4] || "").includes(user.branch);
        }

        const matchType = typeFilter ? c[6] === typeFilter : true;

        let matchDate = true;
        if (filterMonth || filterYear) {
            const m = filterMonth ? c[2] === filterMonth : true;
            const y = filterYear ? String(c[3]) === String(filterYear) : true;
            matchDate = m && y;
        }

        const searchStr = `${c[7]} ${c[6]}`.toLowerCase();
        const matchSearch = searchStr.includes(searchTerm.toLowerCase());
        return matchBranch && matchType && matchSearch && matchDate;
    });

    /* ===== Stats ===== */
    const male = visibleCases.filter((c) => c[5] === "ذكر").length;
    const female = visibleCases.filter((c) => c[5] === "أنثى").length;

    const typeStats = {};
    visibleCases.forEach((c) => {
        typeStats[c[6]] = (typeStats[c[6]] || 0) + 1;
    });

    /* ===== UI ===== */
    return (
        <div dir="rtl" style={container}>

            {/* ===== TITLE & DESCRIPTION ===== */}
            <h2 style={title}>إدارة الحالات الطبية</h2>
            <p style={description}>
                يتيح هذا القسم تسجيل ومتابعة جميع الحالات الطبية التي يتم التعامل
                معها من قبل فرق الإسعاف، مع إمكانية الاطلاع على توزيع الحالات
                حسب النوع والجنس، وإنشاء تقارير شهرية تساعد الإدارة على تحليل
                حجم ونوع التدخلات الطبية.
            </p>

            {/* ===== HEADER ACTIONS ===== */}
            <div style={header}>
                <h3 style={{ margin: 0 }}>قائمة الحالات</h3>

                <button
                    onClick={() => navigate("/reports/monthly-cases")}
                    style={reportBtn}
                >
                    تقرير الحالات الشهري
                </button>
            </div>

            {/* ===== STAT CARDS ===== */}
            <div style={statsGrid}>
                <StatCard title="إجمالي الحالات (المفلترة)" value={visibleCases.length} />
                <StatCard title="ذكور" value={male} />
                <StatCard title="إناث" value={female} />
            </div>

            {/* ===== CASE TYPES ===== */}
            <section style={section}>
                <h4 style={sectionTitle}>توزيع أنواع الحالات (المفلترة)</h4>
                <div style={typeGrid}>
                    {Object.keys(typeStats).length === 0 ? (
                        <p>لا توجد بيانات</p>
                    ) : (
                        Object.entries(typeStats).map(([k, v]) => (
                            <div key={k} style={typeCard}>
                                <div>{k}</div>
                                <div style={typeValue}>{v}</div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* ===== ADD/EDIT CASE ===== */}
            <section style={section}>
                <h4 style={sectionTitle}>
                    {editingCaseId ? "تعديل الحالة" : "إضافة حالة جديدة"}
                </h4>
                <div style={formBox}>
                    <form onSubmit={submitCase} style={formGrid}>
                        <input
                            type="date"
                            name="التاريخ"
                            value={form.التاريخ}
                            onChange={handleChange}
                            required
                            style={inputStyle}
                        />

                        {user.role === "super" ? (
                            <select name="الفرع" value={form.الفرع} onChange={handleChange} required style={inputStyle}>
                                <option value="">اختر الفرع</option>
                                <option value="البقاع الأوسط">البقاع الأوسط</option>
                                <option value="بعلبك">بعلبك</option>
                            </select>
                        ) : (
                            <input name="الفرع" value={user.branch} readOnly style={{ ...inputStyle, background: '#f5f5f5' }} />
                        )}

                        <select
                            name="الجنس"
                            value={form.الجنس}
                            onChange={handleChange}
                            required
                            style={inputStyle}
                        >
                            <option value="">الجنس</option>
                            <option value="ذكر">ذكر</option>
                            <option value="أنثى">أنثى</option>
                        </select>

                        <select
                            name="نوع_الحالة"
                            value={form.نوع_الحالة}
                            onChange={handleChange}
                            required
                            style={inputStyle}
                        >
                            <option value="">نوع الحالة</option>
                            {CASE_TYPES.map((t) => (
                                <option key={t}>{t}</option>
                            ))}
                        </select>

                        <input
                            name="ملاحظات"
                            placeholder="ملاحظات"
                            value={form.ملاحظات}
                            onChange={handleChange}
                            style={inputStyle}
                        />

                        <div style={{ gridColumn: "1 / -1", display: 'flex', gap: '10px' }}>
                            <button type="submit" style={submitBtn}>
                                {editingCaseId ? "حفظ التعديلات" : "إنشاء الحالة"}
                            </button>
                            {editingCaseId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingCaseId(null);
                                        setForm({
                                            التاريخ: "",
                                            الفرع: user?.branch || "",
                                            الجنس: "",
                                            نوع_الحالة: "",
                                            ملاحظات: "",
                                        });
                                    }}
                                    style={{ ...submitBtn, background: "#6c757d", width: "auto" }}
                                >
                                    إلغاء التعديل
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </section>

            {/* ===== SEARCH & FILTER ===== */}
            <section style={section}>
                <h4 style={sectionTitle}>البحث والتصفية</h4>
                <div style={filterBar} className="form-grid-mobile">
                    <input
                        type="text"
                        placeholder="بحث في الملاحظات أو نوع الحالة..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={searchBox}
                    />
                    {user.role === "super" && (
                        <select
                            value={branchFilter}
                            onChange={(e) => setBranchFilter(e.target.value)}
                            style={{ ...filterSelect, borderColor: '#C22129', fontWeight: 'bold' }}
                        >
                            <option value="">كل الفروع</option>
                            <option value="البقاع الأوسط">البقاع الأوسط</option>
                            <option value="بعلبك">بعلبك</option>
                        </select>
                    )}
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        style={filterSelect}
                    >
                        <option value="">كل الأنواع</option>
                        {CASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>

                    <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} style={filterSelect}>
                        <option value="">كل الأشهر</option>
                        {MONTHS.map(m => (
                            <option key={m.v} value={m.v}>{m.l}</option>
                        ))}
                    </select>
                    <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} style={filterSelect}>
                        <option value="">كل السنوات</option>
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>

                {loading ? (
                    <p>جاري التحميل...</p>
                ) : (
                    <div className="table-container">
                        <table style={table}>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>التاريخ</th>
                                    <th>الشهر</th>
                                    <th>السنة</th>
                                    <th>الفرع</th>
                                    <th>الجنس</th>
                                    <th>نوع الحالة</th>
                                    <th>ملاحظات</th>
                                    <th>إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleCases.length === 0 ? (
                                    <tr><td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>لا توجد نتائج مطابقة</td></tr>
                                ) : (
                                    visibleCases.map((c, i) => {
                                        return (
                                            <tr key={i}>
                                                <td>{i + 1}</td>
                                                <td>{c[1]}</td>
                                                <td>{c[2]}</td>
                                                <td>{c[3]}</td>
                                                <td>{c[4]}</td>
                                                <td>{c[5]}</td>
                                                <td>{c[6]}</td>
                                                <td>{c[7]}</td>
                                                <td>
                                                    <div style={{ display: "flex", gap: "6px" }}>
                                                        <button
                                                            onClick={() => handleEdit(c)}
                                                            style={{ ...actionBtn, background: "#007bff" }}
                                                            title="تعديل"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(c[0])}
                                                            style={{ ...actionBtn, background: "#dc3545" }}
                                                            title="حذف"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}

/* ===== Small Components ===== */
function StatCard({ title, value }) {
    return (
        <div style={statCard}>
            <div style={{ fontSize: "14px", color: "#555" }}>{title}</div>
            <div style={{ fontSize: "26px", fontWeight: "bold", color: "#C22129" }}>
                {value}
            </div>
        </div>
    );
}

/* ===== Styles ===== */
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
    marginBottom: "24px",
};

const header = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "18px",
};

const reportBtn = {
    background: "#424443",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
};

const statsGrid = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
    marginBottom: "28px",
};

const statCard = {
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

const typeGrid = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: "12px",
};

const typeCard = {
    background: "#f9f9f9",
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "12px",
    textAlign: "center",
};

const typeValue = {
    fontWeight: "bold",
    fontSize: "18px",
    marginTop: "6px",
};

const formBox = {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "18px",
};

const formGrid = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
    gap: "14px",
};

const inputStyle = {
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "14px",
    outline: "none",
};

const filterBar = {
    display: "flex",
    gap: "12px",
    marginBottom: "18px",
};

const searchBox = {
    flex: 2,
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    outline: "none",
};

const filterSelect = {
    flex: 1,
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    outline: "none",
};

const submitBtn = {
    padding: "12px",
    background: "#C22129",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    gridColumn: "1 / -1",
};

const table = {
    width: "100%",
    borderCollapse: "collapse",
};
const actionBtn = {
    border: "none",
    borderRadius: "4px",
    padding: "4px 8px",
    cursor: "pointer",
    color: "#fff",
    fontSize: "14px",
};
