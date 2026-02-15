import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import api from "../api";

const BORROWABLE_ITEMS = ["أدوات طبية", "جهاز أوكسجين", "كرسي متحرك", "عكازات", "أخرى"];

export default function BorrowedAssets() {
    const storedUser = localStorage.getItem("user");
    const navigate = useNavigate();

    if (!storedUser) {
        return <Navigate to="/login" replace />;
    }

    const user = JSON.parse(storedUser);
    const [assets, setAssets] = useState([]);
    const [form, setForm] = useState({
        الفرع: user.branch || "",
        اسم_الأصل: "",
        لمن: "",
        الموقع: "",
        التاريخ: "",
        الكمية: "",
        الحالة: "",
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

    // Filter borrowed assets
    const borrowedAssets = assets.filter((a) => a[2] === "اعاره للاصول المعاره");

    // Calculate inventory: available quantities by asset type
    const inventory = BORROWABLE_ITEMS.map((itemName) => {
        const borrowed = borrowedAssets.filter((a) => a[4] === itemName);
        const totalBorrowed = borrowed.reduce((sum, a) => sum + (parseInt(a[6]) || 0), 0);
        return { name: itemName, borrowed: totalBorrowed, borrowedCount: borrowed.length };
    });

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    async function submitBorrow(e) {
        e.preventDefault();

        if (!form.اسم_الأصل || !form.لمن || !form.الموقع || !form.التاريخ) {
            alert("يرجى تعبئة جميع الحقول المطلوبة");
            return;
        }

        try {
            await api.post("/assets", {
                الفرع: form.الفرع,
                نوع_الأصل: "اعاره للاصول المعاره",
                الفئة: form.التاريخ, // Date stored in الفئة
                اسم_الأصل: form.اسم_الأصل,
                الوصف: form.لمن, // "لمن" stored in الوصف
                الكمية: form.الكمية,
                الحالة: form.الحالة,
                رقم_السيارة: "",
                سنة_الصنع: "",
                الموقع: form.الموقع,
                ملاحظات: form.ملاحظات,
            });
            alert("تمت إضافة الإعارة بنجاح");
            setForm({
                الفرع: user.branch || "",
                اسم_الأصل: "",
                لمن: "",
                الموقع: "",
                التاريخ: "",
                الكمية: "",
                الحالة: "",
                ملاحظات: "",
            });
            fetchAssets();
        } catch {
            alert("خطأ أثناء إضافة الإعارة");
        }
    }

    async function updateQuantity(asset) {
        const newQty = prompt("أدخل الكمية الجديدة:", asset[6]);
        if (newQty === null || newQty === asset[6]) return;

        try {
            await api.put(`/assets/${asset[0]}`, {
                الفرع: asset[1],
                نوع_الأصل: asset[2],
                الفئة: asset[3],
                اسم_الأصل: asset[4],
                الوصف: asset[5],
                الكمية: newQty,
                الحالة: asset[7],
                رقم_السيارة: asset[8],
                سنة_الصنع: asset[9],
                الموقع: asset[10],
                تاريخ_الإضافة: asset[11],
                ملاحظات: asset[13],
            });
            alert("تم تحديث الكمية بنجاح");
            fetchAssets();
        } catch (err) {
            console.error(err);
            alert("خطأ أثناء تحديث الكمية");
        }
    }

    async function deleteAsset(id) {
        if (!window.confirm("هل أنت متأكد من حذف هذه الإعارة؟")) return;

        try {
            await api.delete(`/assets/${id}`);
            alert("تم حذف الإعارة بنجاح");
            fetchAssets();
        } catch (err) {
            console.error(err);
            alert("خطأ أثناء حذف الإعارة");
        }
    }

    return (
        <div dir="rtl" style={container}>
            {/* Header */}
            <div style={header}>
                <button onClick={() => navigate("/assets")} style={backBtn}>
                    ← رجوع للأصول
                </button>
                <h2 style={title}>الأصول المعارة (Borrowed Assets)</h2>
            </div>

            <p style={description}>
                نظام إدارة الأصول المعارة يتيح لك تتبع الأدوات والمعدات المستعارة خارجيًا.
                الكروت أدناه تعرض إجمالي الكميات المعارة لكل نوع من الأصول.
            </p>

            {/* Inventory Cards */}
            <section style={section}>
                <h4 style={sectionTitle}>المخزون المعار</h4>
                <div style={cardsContainer} className="form-grid-mobile">
                    {inventory.map((item) => (
                        <div key={item.name} style={inventoryCard}>
                            <div style={cardIcon}>📦</div>
                            <div style={cardTitle}>{item.name}</div>
                            <div style={cardCount}>{item.borrowed}</div>
                            <div style={cardLabel}>إجمالي المعار</div>
                            <div style={cardSubLabel}>{item.borrowedCount} إعارة</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Add Borrowed Asset Form */}
            <section style={section}>
                <h4 style={sectionTitle}>إضافة إعارة جديدة</h4>
                <form onSubmit={submitBorrow} style={formBox}>
                    <div style={formGrid} className="form-grid-mobile">
                        {user.role === "super" ? (
                            <select name="الفرع" value={form.الفرع} onChange={handleChange} required style={inputStyle}>
                                <option value="">اختر الفرع</option>
                                <option value="البقاع الأوسط">البقاع الأوسط</option>
                                <option value="بعلبك">بعلبك</option>
                            </select>
                        ) : (
                            <input name="الفرع" value={user.branch} readOnly style={{ ...inputStyle, background: '#f5f5f5' }} />
                        )}

                        <select name="اسم_الأصل" value={form.اسم_الأصل} onChange={handleChange} required style={inputStyle}>
                            <option value="">اختر نوع الأصل</option>
                            {BORROWABLE_ITEMS.map((item) => (
                                <option key={item} value={item}>{item}</option>
                            ))}
                        </select>

                        <input name="لمن" placeholder="لمن (المستلم) *" value={form.لمن} onChange={handleChange} required style={inputStyle} />
                        <input name="الموقع" placeholder="الموقع (أين) *" value={form.الموقع} onChange={handleChange} required style={inputStyle} />
                        <input name="التاريخ" type="date" placeholder="التاريخ *" value={form.التاريخ} onChange={handleChange} required style={inputStyle} />
                        <input name="الكمية" type="number" placeholder="الكمية *" value={form.الكمية} onChange={handleChange} required style={inputStyle} />
                        <input name="الحالة" placeholder="الحالة" value={form.الحالة} onChange={handleChange} style={inputStyle} />
                        <input name="ملاحظات" placeholder="ملاحظات" value={form.ملاحظات} onChange={handleChange} style={inputStyle} />
                    </div>

                    <button type="submit" style={submitBtn}>
                        إضافة الإعارة
                    </button>
                </form>
            </section>

            {/* Borrowed Assets Table */}
            <section style={section}>
                <h4 style={sectionTitle}>سجل الإعارات ({borrowedAssets.length})</h4>
                <div className="table-container">
                    <table style={table}>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>الفرع</th>
                                <th>اسم الأصل</th>
                                <th>لمن (المستلم)</th>
                                <th>الموقع (أين)</th>
                                <th>التاريخ</th>
                                <th>الكمية</th>
                                <th>الحالة</th>
                                <th>ملاحظات</th>
                                <th>إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {borrowedAssets.length === 0 ? (
                                <tr>
                                    <td colSpan="10" style={{ textAlign: "center", padding: "20px", color: "#999" }}>
                                        لا توجد إعارات مسجلة
                                    </td>
                                </tr>
                            ) : (
                                borrowedAssets.map((a, i) => (
                                    <tr key={i}>
                                        <td>{i + 1}</td>
                                        <td>{a[1]}</td>
                                        <td>{a[4]}</td>
                                        <td>{a[5]}</td>
                                        <td>{a[10]}</td>
                                        <td>{a[3]}</td>
                                        <td>{a[6]}</td>
                                        <td>{a[7]}</td>
                                        <td>{a[13]}</td>
                                        <td>
                                            <div style={{ display: "flex", gap: "6px" }}>
                                                <button
                                                    onClick={() => updateQuantity(a)}
                                                    style={{ ...actionBtn, background: "#28a745" }}
                                                    title="تعديل الكمية"
                                                >
                                                    🔢
                                                </button>
                                                <button
                                                    onClick={() => deleteAsset(a[0])}
                                                    style={{ ...actionBtn, background: "#dc3545" }}
                                                    title="حذف"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

/* ===== STYLES ===== */
const container = {
    padding: "24px",
    width: "100%",
};

const header = {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "12px",
};

const backBtn = {
    padding: "10px 20px",
    background: "#6c757d",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
};

const title = {
    margin: 0,
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
    marginBottom: "16px",
};

const cardsContainer = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "16px",
};

const inventoryCard = {
    background: "#fff",
    border: "2px solid #C22129",
    borderRadius: "12px",
    padding: "24px",
    textAlign: "center",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    transition: "transform 0.2s",
};

const cardIcon = {
    fontSize: "32px",
    marginBottom: "8px",
};

const cardTitle = {
    fontSize: "14px",
    fontWeight: "bold",
    color: "#333",
    marginBottom: "12px",
};

const cardCount = {
    fontSize: "36px",
    fontWeight: "bold",
    color: "#C22129",
    marginBottom: "5px",
};

const cardLabel = {
    fontSize: "12px",
    color: "#666",
    marginBottom: "4px",
};

const cardSubLabel = {
    fontSize: "11px",
    color: "#999",
};

const formBox = {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "18px",
};

const formGrid = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "12px",
    marginBottom: "14px",
};

const inputStyle = {
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "14px",
    outline: "none",
};

const submitBtn = {
    width: "100%",
    padding: "12px",
    background: "#C22129",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
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
