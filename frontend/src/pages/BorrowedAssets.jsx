import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import api from "../api";

const BORROWABLE_ITEMS = ["كراسي معاقين", "ووكر متحرك", "فرشات هوا", "تخوت مرضى", "جهاز أوكسجين", "عكازات"];

const ITEM_ICONS = {
    "كراسي معاقين": "♿",
    "ووكر متحرك": "🚶‍♂️",
    "فرشات هوا": "🛏️",
    "تخوت مرضى": "🏥",
    "جهاز أوكسجين": "🫁",
    "عكازات": "🦯"
};

export default function BorrowedAssets() {
    const storedUser = localStorage.getItem("user");
    const navigate = useNavigate();

    if (!storedUser) {
        return <Navigate to="/login" replace />;
    }

    const user = JSON.parse(storedUser);
    const [assets, setAssets] = useState([]);

    const [totalInventory, setTotalInventory] = useState({
        "كراسي معاقين": 15,
        "ووكر متحرك": 10,
        "فرشات هوا": 5,
        "تخوت مرضى": 5,
        "جهاز أوكسجين": 10,
        "عكازات": 30
    });
    const [editingInventory, setEditingInventory] = useState(false);
    const [isSavingInventory, setIsSavingInventory] = useState(false);
    const [filterMonth, setFilterMonth] = useState("");
    const [filterYear, setFilterYear] = useState("");
    const [filterDay, setFilterDay] = useState("");
    const [isExpanded, setIsExpanded] = useState(false);

    const [form, setForm] = useState({
        الفرع: user.branch || "",
        اسم_الأصل: "",
        لمن: "",
        رقم_الهاتف: "",
        الموقع: "",
        التاريخ: "",
        الكمية: "",
        الحالة: "",
        ملاحظات: "",
    });

    useEffect(() => {
        fetchAssets();
        fetchInventory();
    }, [user.branch]);

    function fetchInventory() {
        api.get("/inventory")
            .then((res) => {
                const data = res.data.data || [];
                const branchRow = data.find(r => r[0] === user.branch);
                if (branchRow) {
                    setTotalInventory({
                        "كراسي معاقين": parseInt(branchRow[1]) || 0,
                        "ووكر متحرك": parseInt(branchRow[2]) || 0,
                        "فرشات هوا": parseInt(branchRow[3]) || 0,
                        "تخوت مرضى": parseInt(branchRow[4]) || 0,
                        "جهاز أوكسجين": parseInt(branchRow[5]) || 0,
                        "عكازات": parseInt(branchRow[6]) || 0,
                    });
                }
            })
            .catch(err => console.error("Error fetching inventory", err));
    }

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

    // Calculate inventory with total, borrowed (not returned), and available
    const inventory = BORROWABLE_ITEMS.map((itemName) => {
        const borrowed = borrowedAssets.filter((a) => a[4] === itemName && a[7] !== "مرتجع");
        const totalBorrowed = borrowed.reduce((sum, a) => sum + (parseInt(a[6]) || 0), 0);
        const total = totalInventory[itemName] || 0;
        const available = total - totalBorrowed;
        return {
            name: itemName,
            total,
            borrowed: totalBorrowed,
            available,
            borrowedCount: borrowed.length
        };
    });

    // Filter by month/year/day
    const filteredBorrowedAssets = borrowedAssets.filter((a) => {
        if (!filterMonth && !filterYear && !filterDay) return true;
        const date = a[3]; // الفئة contains the date
        if (!date) return false;
        const itemDate = new Date(date);
        let dayMatch = true;
        if (filterDay) {
            const targetDate = new Date(filterDay);
            dayMatch = itemDate.getFullYear() === targetDate.getFullYear() &&
                itemDate.getMonth() === targetDate.getMonth() &&
                itemDate.getDate() === targetDate.getDate();
        }
        const matchMonth = filterMonth ? itemDate.getMonth() + 1 === parseInt(filterMonth) : true;
        const matchYear = filterYear ? itemDate.getFullYear() === parseInt(filterYear) : true;
        return matchDay && matchMonth && matchYear;
    });

    function updateInventory(itemName, newTotal) {
        const value = parseInt(newTotal);
        if (isNaN(value) || value < 0) return;
        setTotalInventory(prev => ({ ...prev, [itemName]: value }));
    }

    async function handleSaveInventory() {
        if (!editingInventory) {
            setEditingInventory(true);
            return;
        }

        setIsSavingInventory(true);
        try {
            await api.post("/inventory", {
                branch: user.branch,
                inventory: totalInventory
            });
            setEditingInventory(false);
            alert("تم حفظ المخزون بنجاح");
        } catch (err) {
            console.error(err);
            alert("خطأ أثناء حفظ المخزون");
        } finally {
            setIsSavingInventory(false);
        }
    }

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    async function submitBorrow(e) {
        e.preventDefault();

        if (!form.اسم_الأصل || !form.لمن || !form.الموقع || !form.التاريخ) {
            alert("يرجى تعبئة جميع الحقول المطلوبة");
            return;
        }

        // Check if enough available
        const item = inventory.find(i => i.name === form.اسم_الأصل);
        const requestedQty = parseInt(form.الكمية) || 0;
        if (item && requestedQty > item.available) {
            alert(`الكمية المتاحة فقط ${item.available} من ${form.اسم_الأصل}`);
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
                رقم_السيارة: form.رقم_الهاتف,
                سنة_الصنع: "",
                الموقع: form.الموقع,
                ملاحظات: form.ملاحظات,
            });
            alert("تمت إضافة الإعارة بنجاح");
            setForm({
                الفرع: user.branch || "",
                اسم_الأصل: "",
                لمن: "",
                رقم_الهاتف: "",
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

    async function markAsReturned(asset) {
        if (!window.confirm("هل تم استرجاع هذه الأصول؟")) return;

        try {
            await api.put(`/assets/${asset[0]}`, {
                الفرع: asset[1],
                نوع_الأصل: asset[2],
                الفئة: asset[3],
                اسم_الأصل: asset[4],
                الوصف: asset[5],
                الكمية: asset[6],
                الحالة: "مرتجع", // Mark as returned
                رقم_السيارة: asset[8],
                سنة_الصنع: asset[9],
                الموقع: asset[10],
                تاريخ_الإضافة: asset[11],
                ملاحظات: asset[13],
            });
            alert("تم تسجيل الاسترجاع بنجاح");
            fetchAssets();
        } catch (err) {
            console.error(err);
            alert("خطأ أثناء تسجيل الاسترجاع");
        }
    }

    return (
        <div dir="rtl" style={container}>
            {/* Header */}
            <div style={header}>
                <h2 style={title}>الأصول المعارة</h2>
                <button onClick={() => navigate("/assets")} style={backBtn}>
                    ← رجوع للأصول
                </button>
            </div>

            <p style={description}>
                نظام إدارة الأصول المعارة يتيح لك تتبع الأدوات والمعدات المستعارة خارجيًا.
                الكروت أدناه تعرض الكميات المتاحة والمعارة لكل نوع من الأصول.
            </p>

            {/* Inventory Cards */}
            <section style={section}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <h4 style={{ margin: 0 }}>المخزون المتاح</h4>
                    <button
                        onClick={handleSaveInventory}
                        style={editInventoryBtn}
                        disabled={isSavingInventory}
                    >
                        {isSavingInventory ? "جاري الحفظ..." : (editingInventory ? "✓ حفظ" : "✏️ تعديل المخزون")}
                    </button>
                </div>
                <div style={cardsContainer} className="form-grid-mobile">
                    {inventory.map((item) => (
                        <div key={item.name} style={inventoryCard}>
                            <div style={cardIcon}>{ITEM_ICONS[item.name] || "📦"}</div>
                            <div style={cardTitle}>{item.name}</div>

                            {editingInventory ? (
                                <div style={{ margin: "10px 0" }}>
                                    <input
                                        type="number"
                                        value={item.total}
                                        onChange={(e) => updateInventory(item.name, e.target.value)}
                                        style={inventoryInput}
                                        min="0"
                                    />
                                    <div style={cardSubLabel}>إجمالي المخزون</div>
                                </div>
                            ) : (
                                <>
                                    <div style={{ ...cardCount, color: item.available > 0 ? "#28a745" : "#dc3545" }}>
                                        {item.available}
                                    </div>
                                    <div style={cardLabel}>متاح للإعارة</div>
                                    <div style={cardStats}>
                                        <span>الإجمالي: {item.total}</span>
                                        <span style={{ color: "#C22129" }}>المعار: {item.borrowed}</span>
                                    </div>
                                    <div style={cardSubLabel}>{item.borrowedCount} إعارة</div>
                                </>
                            )}
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
                        <input name="رقم_الهاتف" placeholder="رقم الهاتف *" value={form.رقم_الهاتف} onChange={handleChange} required style={{ ...inputStyle, direction: "rtl" }} />
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', marginBottom: '10px' }}>
                    <h4 style={{ margin: 0 }}>سجل الإعارات ({filteredBorrowedAssets.length})</h4>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        style={{ ...reportBtn, background: "#C22129" }}
                    >
                        {isExpanded ? "إخفاء السجل ▲" : "عرض السجل ▼"}
                    </button>
                </div>

                {isExpanded && (
                    <div style={{ display: "flex", gap: "12px", marginBottom: "18px", flexWrap: "wrap" }}>
                        <input
                            type="date"
                            value={filterDay}
                            onChange={(e) => setFilterDay(e.target.value)}
                            style={filterSelect}
                        />
                        <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} style={filterSelect}>
                            <option value="">كل الأشهر</option>
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleDateString('ar', { month: 'long' })}</option>
                            ))}
                        </select>
                        <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} style={filterSelect}>
                            <option value="">كل السنوات</option>
                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                )}

                {isExpanded && (
                    <div className="table-container">
                        <table style={table}>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>الفرع</th>
                                    <th>اسم الأصل</th>
                                    <th>لمن (المستلم)</th>
                                    <th>رقم الهاتف</th>
                                    <th>الموقع (أين)</th>
                                    <th>التاريخ</th>
                                    <th>الكمية</th>
                                    <th>الحالة</th>
                                    <th>ملاحظات</th>
                                    <th>إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBorrowedAssets.length === 0 ? (
                                    <tr>
                                        <td colSpan="10" style={{ textAlign: "center", padding: "20px", color: "#999" }}>
                                            لا توجد إعارات مسجلة
                                        </td>
                                    </tr>
                                ) : (
                                    filteredBorrowedAssets.map((a, i) => (
                                        <tr key={i} style={a[7] === "مرتجع" ? returnedRowStyle : {}}>
                                            <td>{i + 1}</td>
                                            <td>{a[1]}</td>
                                            <td>{a[4]}</td>
                                            <td>{a[5]}</td>
                                            <td dir="ltr" style={{ textAlign: "right" }}>{a[8]}</td>
                                            <td>{a[10]}</td>
                                            <td>{a[3]}</td>
                                            <td>{a[6]}</td>
                                            <td>
                                                <span style={a[7] === "مرتجع" ? returnedBadge : activeBadge}>
                                                    {a[7] || "معار"}
                                                </span>
                                            </td>
                                            <td>{a[13]}</td>
                                            <td>
                                                <div style={{ display: "flex", gap: "10px", justifyContent: 'center' }}>
                                                    {a[7] !== "مرتجع" && (
                                                        <>
                                                            <button
                                                                onClick={() => markAsReturned(a)}
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#17a2b8' }}
                                                                title="تسجيل الاسترجاع"
                                                            >
                                                                ✓
                                                            </button>
                                                            <button
                                                                onClick={() => updateQuantity(a)}
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
                                                                title="تعديل الكمية"
                                                            >
                                                                🔢
                                                            </button>
                                                        </>
                                                    )}
                                                    <button
                                                        onClick={() => deleteAsset(a[0])}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#dc3545', fontWeight: 'bold' }}
                                                        title="حذف"
                                                    >
                                                        ❌
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
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

const header = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
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
    width: "100%",
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
    gridTemplateColumns: "repeat(6, 1fr)",
    gap: "12px",
};

const inventoryCard = {
    background: "#fff",
    border: "2px solid #C22129",
    borderRadius: "12px",
    padding: "16px 8px",
    textAlign: "center",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    transition: "transform 0.2s",
};

const cardIcon = {
    fontSize: "24px",
    marginBottom: "4px",
};

const cardTitle = {
    fontSize: "14px",
    fontWeight: "bold",
    color: "#333",
    marginBottom: "12px",
};

const cardCount = {
    fontSize: "28px",
    fontWeight: "bold",
    color: "#C22129",
    marginBottom: "2px",
};

const cardLabel = {
    fontSize: "12px",
    color: "#666",
    marginBottom: "4px",
};

const cardStats = {
    display: "flex",
    justifyContent: "space-around",
    fontSize: "11px",
    color: "#777",
    marginTop: "8px",
    paddingTop: "8px",
    borderTop: "1px solid #eee",
};

const cardSubLabel = {
    fontSize: "11px",
    color: "#999",
    marginTop: "4px",
};

const editInventoryBtn = {
    padding: "8px 16px",
    background: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
};

const inventoryInput = {
    width: "100%",
    padding: "8px",
    border: "2px solid #C22129",
    borderRadius: "6px",
    fontSize: "18px",
    fontWeight: "bold",
    textAlign: "center",
    outline: "none",
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

const itemIcon = {
    fontSize: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
};

const filterSelect = {
    padding: "8px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "14px",
    outline: "none",
    minWidth: "120px",
};

const reportBtn = {
    padding: "8px 16px",
    background: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    gap: "6px",
};

const returnedRowStyle = {
    background: "#f8f9fa",
    color: "#6c757d",
};

const badge = {
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: "bold",
    display: "inline-block",
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
