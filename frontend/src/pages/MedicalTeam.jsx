import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

const DEFAULT_IMG =
    "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

/* ===== DROPDOWN OPTIONS ===== */
const ROLES = [
    "مسعف",
    "ممرض",
    "طبيب",
    "سائق إسعاف",
    "إداري",
    "متطوع",
];

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const MARITAL_STATUS = ["أعزب", "متزوج", "مطلق", "أرمل"];

const YES_NO = ["نعم", "لا"];

export default function MedicalTeam() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user"));
    const [team, setTeam] = useState([]);
    const [form, setForm] = useState({ الفرع: user.branch || "" });
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("");

    const filteredTeam = team.filter((m) => {
        const matchRole = roleFilter ? m[3] === roleFilter : true;
        const matchBranch = user.role === "super" ? true : (m[1] || "").includes(user.branch);
        const searchStr = `${m[2]} ${m[10]}`.toLowerCase(); // Name and Phone
        const matchSearch = searchStr.includes(searchTerm.toLowerCase());
        return matchRole && matchBranch && matchSearch;
    });

    /* ===== FETCH DATA ===== */
    useEffect(() => {
        api
            .get("/medical-team")
            .then((res) => setTeam(res.data.data || []))
            .catch(() => alert("خطأ في جلب بيانات الفريق الطبي"));
    }, []);

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    return (
        <div dir="rtl" style={page}>
            <h2 style={{ marginBottom: "20px" }}>الفريق الطبي</h2>

            <p style={desc}>
                يعرض هذا القسم جميع أعضاء الفريق الطبي، مع إمكانية الضغط على أي عضو
                للاطلاع على ملفه الكامل وتفاصيله الشخصية.
            </p>

            {/* ===== ADD MEMBER FORM ===== */}
            <div style={formBox}>
                <h3>إضافة عضو جديد</h3>

                <form
                    onSubmit={async (e) => {
                        e.preventDefault();
                        try {
                            await api.post("/medical-team", form);
                            alert("تمت إضافة العضو بنجاح");
                            window.location.reload();
                        } catch {
                            alert("خطأ أثناء الإضافة");
                        }
                    }}
                    style={formGrid}
                >
                    <input
                        name="الاسم_الثلاثي"
                        placeholder="الاسم الثلاثي"
                        onChange={handleChange}
                        required
                        style={inputStyle}
                    />

                    {user.role === "super" ? (
                        <select name="الفرع" onChange={handleChange} required style={inputStyle}>
                            <option value="">اختر الفرع</option>
                            <option value="البقاع الأوسط">البقاع الأوسط</option>
                            <option value="بعلبك">بعلبك</option>
                        </select>
                    ) : (
                        <input name="الفرع" value={user.branch} readOnly style={{ ...inputStyle, background: '#f5f5f5' }} />
                    )}

                    {/* الصفة */}
                    <select name="الصفة" onChange={handleChange} required style={inputStyle}>
                        <option value="">اختر الصفة</option>
                        {ROLES.map((r) => (
                            <option key={r}>{r}</option>
                        ))}
                    </select>

                    {/* فئة الدم */}
                    <select name="فئة_الدم" onChange={handleChange} style={inputStyle}>
                        <option value="">فئة الدم</option>
                        {BLOOD_TYPES.map((b) => (
                            <option key={b}>{b}</option>
                        ))}
                    </select>

                    <input
                        type="date"
                        name="تاريخ_الميلاد"
                        onChange={handleChange}
                        style={inputStyle}
                    />

                    {/* الوضع الاجتماعي */}
                    <select name="الوضع_الاجتماعي" onChange={handleChange} style={inputStyle}>
                        <option value="">الوضع الاجتماعي</option>
                        {MARITAL_STATUS.map((s) => (
                            <option key={s}>{s}</option>
                        ))}
                    </select>

                    <input
                        type="number"
                        name="عدد_الأولاد"
                        placeholder="عدد الأولاد"
                        onChange={handleChange}
                        style={inputStyle}
                    />

                    <input
                        name="المستوى_التعليمي"
                        placeholder="المستوى التعليمي"
                        onChange={handleChange}
                        style={inputStyle}
                    />

                    {/* استلام بدلة */}
                    <select name="بدلة" onChange={handleChange} style={inputStyle}>
                        <option value="">استلام بدلة</option>
                        {YES_NO.map((v) => (
                            <option key={v}>{v}</option>
                        ))}
                    </select>

                    <input
                        name="رقم_الهاتف"
                        placeholder="رقم الهاتف"
                        onChange={handleChange}
                        style={inputStyle}
                    />

                    {/* استلام بطاقة */}
                    <select name="بطاقة" onChange={handleChange} style={inputStyle}>
                        <option value="">استلام بطاقة</option>
                        {YES_NO.map((v) => (
                            <option key={v}>{v}</option>
                        ))}
                    </select>

                    <input
                        name="رقم_البطاقة"
                        placeholder="رقم البطاقة"
                        onChange={handleChange}
                        style={inputStyle}
                    />

                    <input
                        name="image_url"
                        placeholder="Image URL"
                        onChange={handleChange}
                        style={inputStyle}
                    />

                    <button type="submit" style={submitBtn}>
                        إضافة
                    </button>
                </form>
            </div>

            {/* ===== SEARCH & FILTER ===== */}
            <div style={filterBar}>
                <input
                    type="text"
                    placeholder="بحث في الاسم أو رقم الهاتف..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={searchBox}
                />
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    style={filterSelect}
                >
                    <option value="">كل الصفات</option>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
            </div>

            {/* ===== TEAM GRID ===== */}
            <div style={grid}>
                {filteredTeam.length === 0 ? (
                    <p style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>لا توجد نتائج مطابقة</p>
                ) : (
                    filteredTeam.map((m, i) => (
                        <div
                            key={i}
                            style={card}
                            onClick={() =>
                                navigate("/medical-profile", { state: { member: m } })
                            }
                        >
                            <img
                                src={m[13] || DEFAULT_IMG}
                                alt="member"
                                style={image}
                                onError={(e) => (e.target.src = DEFAULT_IMG)}
                            />

                            <div style={name}>{m[2]}</div>
                            <div style={roleStyle}>{m[3]}</div>
                            {user.role === "super" && <div style={{ fontSize: '11px', color: '#999' }}>{m[1]}</div>}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

/* ================= STYLES ================= */

const page = {
    padding: "20px",
    maxWidth: "1400px",
    margin: "0 auto",
};

const desc = {
    color: "#555",
    marginBottom: "24px",
    lineHeight: "1.8",
};

const grid = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "20px",
};

const card = {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "14px",
    padding: "14px",
    textAlign: "center",
    cursor: "pointer",
};

const image = {
    width: "100%",
    height: "200px",
    objectFit: "cover",
    borderRadius: "10px",
    marginBottom: "10px",
};

const name = {
    fontWeight: "bold",
    fontSize: "15px",
};

const roleStyle = {
    fontSize: "13px",
    color: "#777",
};

const filterBar = {
    display: "flex",
    gap: "12px",
    marginBottom: "20px",
};

const searchBox = {
    flex: 2,
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    outline: "none",
};

const filterSelect = {
    flex: 1,
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    outline: "none",
};

const inputStyle = {
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "14px",
    outline: "none",
};

const formBox = {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "16px",
    marginBottom: "30px",
};

const formGrid = {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "10px",
};

const submitBtn = {
    gridColumn: "span 3",
    padding: "10px",
    background: "#C22129",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
};
