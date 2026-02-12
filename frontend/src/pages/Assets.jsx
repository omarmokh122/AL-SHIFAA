import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../api";

/* ===== ASSET OPTIONS ===== */
const MARKAZ_ASSETS = [
    "مولد كهرباء",
    "منظومة طاقة شمسية",
    "بطاريات",
    "أثاث مكتبي",
    "مكيف هواء",
    "ثلاجة",
    "كمبيوتر",
    "طابعة",
    "راوتر / شبكة",
    "خزان مياه",
    "معدات إسعاف",
    "أدوات كهربائية",
    "بيت جاهز",
    "أخرى",
];

const AMBULANCE_ASSETS = ["سيارة إسعاف"];

const AMBULANCE_CONTENTS = [
    "نقالة",
    "كرسي مريض",
    "جهاز أوكسجين",
    "اسطوانة أوكسجين",
    "جهاز شفط",
    "جهاز صدمات (Defibrillator)",
    "جهاز مراقبة",
    "حقيبة إسعافات أولية",
    "ضمادات",
    "قفازات طبية",
    "كمامات",
    "أدوية إسعافية",
    "مقص طبي",
    "جهاز ضغط",
    "جهاز سكر",
    "أخرى",
];

export default function Assets() {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
        return <Navigate to="/login" replace />;
    }

    const user = JSON.parse(storedUser);
    const [assets, setAssets] = useState([]);
    const [assetType, setAssetType] = useState("");
    const [selectedAmbulance, setSelectedAmbulance] = useState("");

    const [form, setForm] = useState({
        الفرع: user.branch || "",
        نوع_الأصل: "",
        الفئة: "",
        اسم_الأصل: "",
        الوصف: "",
        الكمية: "",
        الحالة: "",
        رقم_السيارة: "",
        سنة_الصنع: "",
        الموقع: "",
        ملاحظات: "",
    });

    useEffect(() => {
        fetchAssets();
    }, []);

    function fetchAssets() {
        api
            .get("/assets")
            .then((res) => setAssets(res.data.data || []))
            .catch((err) => {
                console.error(err);
                alert("خطأ في جلب بيانات الأصول");
            });
    }

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    async function submitAsset(e) {
        e.preventDefault();

        if (!assetType || !form.اسم_الأصل) {
            alert("يرجى تعبئة الحقول المطلوبة");
            return;
        }

        try {
            await api.post("/assets", {
                ...form,
                نوع_الأصل: assetType,
            });
            alert("تمت إضافة الأصل بنجاح");
            fetchAssets();
        } catch {
            alert("خطأ أثناء إضافة الأصل");
        }
    }

    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState("");

    const visible = assets.filter((a) => {
        const matchBranch = user.role === "super" ? true : a[1] === user.branch;
        const matchType = filter ? a[2] === filter : true;

        const searchStr = `${a[4]} ${a[8]} ${a[13]}`.toLowerCase();
        const matchSearch = searchStr.includes(searchTerm.toLowerCase());

        return matchBranch && matchType && matchSearch;
    });

    const ambulances = visible.filter((a) => a[2] === "سيارة إسعاف");

    const ambulanceInventory = visible.filter(
        (a) =>
            a[2] === "محتويات سيارة إسعاف" &&
            a[8] === selectedAmbulance
    );

    /* ===== OPTIONS BASED ON TYPE ===== */
    let assetNameOptions = [];
    if (assetType === "مركز") assetNameOptions = MARKAZ_ASSETS;
    if (assetType === "سيارة إسعاف") assetNameOptions = AMBULANCE_ASSETS;
    if (assetType === "محتويات سيارة إسعاف")
        assetNameOptions = AMBULANCE_CONTENTS;

    return (
        <div dir="rtl" style={container}>

            {/* ===== TITLE & DESCRIPTION ===== */}
            <h2 style={title}>إدارة الأصول</h2>
            <p style={description}>
                يتيح هذا القسم توثيق وإدارة جميع الأصول التابعة للمراكز
                وسيارات الإسعاف، بما يشمل المعدات، التجهيزات، والمحتويات
                التشغيلية. يساعد هذا السجل الإدارة على متابعة حالة الأصول
                وكمياتها ومواقعها بشكل منظم ودقيق.
            </p>

            {/* ===== ADD ASSET ===== */}
            <section style={section}>
                <h4 style={sectionTitle}>إضافة أصل جديد</h4>

                <div style={formBox}>
                    <select
                        value={assetType}
                        onChange={(e) => {
                            setAssetType(e.target.value);
                            setForm({ ...form, اسم_الأصل: "", رقم_السيارة: "" });
                        }}
                        style={select}
                        required
                    >
                        <option value="">اختر نوع الإضافة</option>
                        <option value="مركز">أصول المركز</option>
                        <option value="سيارة إسعاف">سيارة إسعاف</option>
                        <option value="محتويات سيارة إسعاف">محتويات سيارة إسعاف</option>
                    </select>

                    {assetType && (
                        <form onSubmit={submitAsset}>
                            <div style={formGrid}>
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
                                    name="اسم_الأصل"
                                    value={form.اسم_الأصل}
                                    onChange={handleChange}
                                    required
                                    style={inputStyle}
                                >
                                    <option value="">اسم الأصل</option>
                                    {assetNameOptions.map((opt) => (
                                        <option key={opt}>{opt}</option>
                                    ))}
                                </select>

                                <input name="الفئة" placeholder="الفئة" value={form.الفئة} onChange={handleChange} style={inputStyle} />
                                <input name="الوصف" placeholder="الوصف" value={form.الوصف} onChange={handleChange} style={inputStyle} />
                                <input name="الكمية" type="number" placeholder="الكمية" value={form.الكمية} onChange={handleChange} style={inputStyle} />
                                <input name="الحالة" placeholder="الحالة" value={form.الحالة} onChange={handleChange} style={inputStyle} />

                                {(assetType === "سيارة إسعاف" ||
                                    assetType === "محتويات سيارة إسعاف") && (
                                        <input
                                            name="رقم_السيارة"
                                            placeholder="رقم سيارة الإسعاف"
                                            value={form.رقم_السيارة}
                                            onChange={handleChange}
                                            required
                                            style={inputStyle}
                                        />
                                    )}

                                {assetType === "سيارة إسعاف" && (
                                    <input
                                        name="سنة_الصنع"
                                        placeholder="سنة الصنع"
                                        value={form.سنة_الصنع}
                                        onChange={handleChange}
                                        style={inputStyle}
                                    />
                                )}

                                <input name="الموقع" placeholder="الموقع" value={form.الموقع} onChange={handleChange} style={inputStyle} />
                                <input name="ملاحظات" placeholder="ملاحظات" value={form.ملاحظات} onChange={handleChange} style={inputStyle} />
                            </div>

                            <button type="submit" style={submitBtn}>
                                حفظ الأصل
                            </button>
                        </form>
                    )}
                </div>
            </section>

            {/* ===== ASSETS TABLE ===== */}
            <section style={section}>
                <h4 style={sectionTitle}>سجل الأصول</h4>

                {/* Search & Filter */}
                <div style={filterBar}>
                    <input
                        type="text"
                        placeholder="بحث في الاسم، رقم السيارة، أو الملاحظات..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={searchBox}
                    />
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        style={filterSelect}
                    >
                        <option value="">كل أنواع الأصول</option>
                        <option value="مركز">أصول المركز</option>
                        <option value="سيارة إسعاف">سيارات إسعاف</option>
                        <option value="محتويات سيارة إسعاف">محتويات سيارة إسعاف</option>
                    </select>
                </div>

                <div style={{ overflowX: "auto" }}>
                    <table style={table}>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>الفرع</th>
                                <th>نوع الأصل</th>
                                <th>اسم الأصل</th>
                                <th>الكمية</th>
                                <th>الحالة</th>
                                <th>رقم السيارة</th>
                                <th>الموقع</th>
                                <th>ملاحظات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map((a, i) => (
                                <tr key={i}>
                                    <td>{i + 1}</td>
                                    <td>{a[1]}</td>
                                    <td>{a[2]}</td>
                                    <td>{a[4]}</td>
                                    <td>{a[6]}</td>
                                    <td>{a[7]}</td>
                                    <td>{a[8]}</td>
                                    <td>{a[10]}</td>
                                    <td>{a[13]}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* ===== AMBULANCE INVENTORY ===== */}
            <section style={section}>
                <h4 style={sectionTitle}>محتويات سيارات الإسعاف</h4>

                <select
                    value={selectedAmbulance}
                    onChange={(e) => setSelectedAmbulance(e.target.value)}
                    style={selectWide}
                >
                    <option value="">اختر سيارة إسعاف</option>
                    {ambulances.map((a, i) => (
                        <option key={i} value={a[8]}>
                            سيارة رقم {a[8]}
                        </option>
                    ))}
                </select>

                {selectedAmbulance && (
                    <table style={table}>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>اسم المعدّة</th>
                                <th>الكمية</th>
                                <th>الحالة</th>
                                <th>ملاحظات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ambulanceInventory.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: "center" }}>
                                        لا توجد محتويات لهذه السيارة
                                    </td>
                                </tr>
                            ) : (
                                ambulanceInventory.map((a, i) => (
                                    <tr key={i}>
                                        <td>{i + 1}</td>
                                        <td>{a[4]}</td>
                                        <td>{a[6]}</td>
                                        <td>{a[7]}</td>
                                        <td>{a[13]}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </section>
        </div>
    );
}

/* ===== STYLES ===== */
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

const section = {
    marginBottom: "34px",
};

const sectionTitle = {
    marginBottom: "12px",
};

const formBox = {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "18px",
};

const formGrid = {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
    marginTop: "10px",
};

const inputStyle = {
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "14px",
    outline: "none",
};

const submitBtn = {
    marginTop: "14px",
    padding: "12px",
    background: "#C22129",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
};

const select = {
    width: "100%",
    padding: "10px",
    marginBottom: "10px",
};

const selectWide = {
    width: "320px",
    padding: "10px",
    marginBottom: "16px",
};

const table = {
    width: "100%",
    borderCollapse: "collapse",
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
