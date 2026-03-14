import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

export default function Donations() {
    const user = JSON.parse(localStorage.getItem("user"));
    const navigate = useNavigate();

    // Data & Filters
    const [data, setData] = useState([]);
    const [branchFilter, setBranchFilter] = useState("");
    const [filterMonth, setFilterMonth] = useState("");
    const [filterYear, setFilterYear] = useState("");
    const [filterDay, setFilterDay] = useState("");

    // UI State
    const [activeTab, setActiveTab] = useState("incoming"); // "incoming" or "outgoing"
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);

    // Form State
    const [form, setForm] = useState(initialFormState(user));

    useEffect(() => {
        fetchDonations();
    }, []);

    function initialFormState(u) {
        return {
            التاريخ: new Date().toISOString().split('T')[0],
            الفرع: u.branch || "",
            الاسم: "", // Donor or Recipient
            النوع: "نقدي", // Cash, Kind, or Usage (handled by logic)
            الطريقة: "", // Method
            المبلغ: "",
            العملة: "USD",
            تبرع_عيني: "",
            الكمية: "",
            كيفية_الصرف: "", // Usage Purpose
            جهة_الاستلام: "",
            ملاحظات: ""
        };
    }

    function fetchDonations() {
        api.get("/donations")
            .then((res) => setData(res.data.data || []))
            .catch(() => alert("خطأ في جلب بيانات التبرعات"));
    }

    /* ===== FILTER LOGIC ===== */
    const sortedData = [...data].reverse();

    // Split Data
    const incomingData = sortedData.filter(r => r[4] !== "صرف");
    const outgoingData = sortedData.filter(r => r[4] === "صرف");

    const currentDataSet = activeTab === "incoming" ? incomingData : outgoingData;

    const visible = currentDataSet.filter((r) => {
        let matchBranch = true;
        if (user.role === "super") {
            matchBranch = branchFilter ? (r[2] || "").includes(branchFilter) : true;
        } else {
            matchBranch = (r[2] || "").includes(user.branch);
        }

        let matchDate = true;
        if (filterMonth || filterYear || filterDay) {
            const d = new Date(r[1]); // r[1] is the date
            if (isNaN(d.getTime())) { // Check if date is valid
                matchDate = false;
            } else {
                let m = true;
                let y = true;
                let dayMatch = true;

                if (filterDay) {
                    const targetDate = new Date(filterDay);
                    if (isNaN(targetDate.getTime())) {
                        dayMatch = false;
                    } else {
                        dayMatch = d.getFullYear() === targetDate.getFullYear() &&
                            d.getMonth() === targetDate.getMonth() &&
                            d.getDate() === targetDate.getDate();
                    }
                } else { // Only apply month/year filters if filterDay is not set
                    m = filterMonth ? d.getMonth() + 1 === parseInt(filterMonth) : true;
                    y = filterYear ? d.getFullYear() === parseInt(filterYear) : true;
                }
                matchDate = m && y && dayMatch;
            }
        }

        return matchBranch && matchDate;
    });

    /* ===== CALCULATIONS ===== */
    const parseAmount = (val) => {
        if (!val) return 0;
        // Remove commas and convert to number
        const num = parseFloat(String(val).replace(/,/g, ""));
        return isNaN(num) ? 0 : num;
    };

    // Total Incoming (Cash)
    let totalIncomingUSD = 0;
    let totalIncomingLBP = 0;



    incomingData.forEach(r => {
        if (r[4] === "نقدي") {
            const val = parseAmount(r[6]);
            const cur = (r[7] || "").toUpperCase();

            // Log if we find a value to verify
            // console.log(`Row ID ${r[0]}: Val=${val}, Cur=${cur}`);

            if (cur === "USD" || cur === "$") totalIncomingUSD += val;
            else totalIncomingLBP += val;
        }
    });

    // Total Outgoing (Usage)
    let totalOutgoingUSD = 0;
    let totalOutgoingLBP = 0;
    outgoingData.forEach(r => {
        const val = parseAmount(r[6]);
        const cur = (r[7] || "").toUpperCase();
        if (cur === "USD" || cur === "$") totalOutgoingUSD += val;
        else totalOutgoingLBP += val;
    });

    // Net Balance
    const balanceUSD = totalIncomingUSD - totalOutgoingUSD;
    const balanceLBP = totalIncomingLBP - totalOutgoingLBP;

    // Total Available (Balance)
    const RATE = 89500;

    const totalAvailableUSD = (totalIncomingUSD + (totalIncomingLBP / RATE)) - (totalOutgoingUSD + (totalOutgoingLBP / RATE));
    const totalUsedUSD = totalOutgoingUSD + (totalOutgoingLBP / RATE);

    // Safety check for NaN
    const safeAvailable = isNaN(totalAvailableUSD) ? 0 : totalAvailableUSD;
    const safeUsed = isNaN(totalUsedUSD) ? 0 : totalUsedUSD;
    const safeCashUSD = isNaN(balanceUSD) ? 0 : balanceUSD;
    const safeCashLBP = isNaN(balanceLBP) ? 0 : balanceLBP;

    /* ===== HANDLERS ===== */
    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    async function handleSubmit(e) {
        e.preventDefault();

        // Prepare payload based on tab
        const payload = {
            ...form,
            الفرع: user.role === "super" ? (form.الفرع || "") : (user.branch || ""),
            النوع: activeTab === "outgoing" ? "صرف" : (form.النوع || "نقدي"),
            الاسم: activeTab === "outgoing" ? "مصاريف من التبرعات" : (form.الاسم || "-"),
            الطريقة: activeTab === "outgoing" ? "نقدي" : (form.الطريقة || "-"),
            المبلغ: form.المبلغ || "0",
            العملة: form.العملة || "USD",
            تبرع_عيني: form.تبرع_عيني || "-",
            الكمية: form.الكمية || "0",
            كيفية_الصرف: activeTab === "outgoing" ? (form.كيفية_الصرف || "-") : "-",
            جهة_الاستلام: form.جهة_الاستلام || "-",
            ملاحظات: form.ملاحظات || "",
            CreatedAt: form.CreatedAt // Preserve CreatedAt if editing
        };



        try {
            if (editingId) {
                await api.put(`/donations/${editingId}`, payload);
                alert("تم تحديث البيانات بنجاح");
            } else {
                await api.post("/donations", payload);
                alert(activeTab === "incoming" ? "تم تسجيل التبرع بنجاح" : "تم تسجيل المصروف بنجاح");
            }

            setForm(initialFormState(user));
            setShowForm(false);
            setEditingId(null);
            fetchDonations();
        } catch (err) {
            console.error("Submission Error Details:", err);
            console.error("Error Response:", err.response);
            if (err.response && err.response.data) {
                alert(`خطأ: ${JSON.stringify(err.response.data)}`);
            } else {
                alert(`حدث خطأ أثناء الحفظ: ${err.message}`);
            }
        }
    }

    function handleEdit(row) {
        // Map row array to form object
        // Row: [ID, Date, Branch, Name, Type, Method, Amount, Currency, KindType, Quantity, Usage, Recipient, Notes, CreatedAt, LastModified]
        // Idx:  0    1     2       3     4     5       6       7         8         9         10     11         12     13         14
        setEditingId(row[0]);
        setForm({
            التاريخ: row[1] || "",
            الفرع: row[2] || "",
            الاسم: row[3] || "",
            النوع: row[4] || "نقدي",
            الطريقة: row[5] || "",
            المبلغ: row[6] || "",
            العملة: row[7] || "USD",
            تبرع_عيني: row[8] || "",
            الكمية: row[9] || "",
            كيفية_الصرف: row[10] || "",
            جهة_الاستلام: row[11] || "",
            ملاحظات: row[12] || "",
            CreatedAt: row[13]
        });

        // Ensure we are on the correct form mode (though activeTab controls list, form adapts)
        // If type is "صرف", switch to outgoing tab logic implicitly or force it?
        // Actually best to stay on current tab if user clicked edit there, but ensure form fields show up.
        // Our form conditional rendering depends on `activeTab`. 
        // If editing an "outgoing" item, we must be in "outgoing" tab or force it.
        // It is safer to assume user is editing from the list they are viewing.

        setShowForm(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function handleDelete(id, type) {
        if (!window.confirm("هل أنت متأكد من حذف هذا السجل؟")) return;

        try {
            await api.delete(`/donations/${id}`, { params: { type } });
            alert("تم الحذف بنجاح");
            fetchDonations();
        } catch (err) {
            console.error("Delete Error:", err);
            const serverError = err.response?.data?.error || err.message;
            alert(`حدث خطأ أثناء الحذف: ${serverError}`);
        }
    }

    return (
        <div dir="rtl" style={container}>
            {/* Header */}
            <div style={header}>
                <div>
                    <h2 style={title}>إدارة التبرعات والمصروفات</h2>
                    <p style={{ color: "#555", fontSize: "16px", marginBottom: "26px", lineHeight: "1.7", width: "100%" }}>
                        تتبع الواردات من التبرعات وكيفية صرفها
                    </p>
                </div>
                <button
                    onClick={() => navigate("/reports/monthly-donations")}
                    style={btnSecondary}
                >
                    📊 تقرير شهري
                </button>
            </div>

            {/* Stats Cards (Simplified) */}
            <div style={cardsGrid} className="dashboard-grid">
                <Card
                    title="الرصيد المتاح (تقديري بالدولار)"
                    value={`${safeAvailable.toLocaleString(undefined, { maximumFractionDigits: 0 })} $`}
                    subValue={`(تفاصيل النقد: ${safeCashUSD.toLocaleString()} $ + ${safeCashLBP.toLocaleString()} ل.ل)`}
                    color={safeAvailable >= 0 ? "#28a745" : "#dc3545"}
                    icon="💰"
                />
                <Card
                    title="إجمالي المصروفات (بالدولار)"
                    value={`${safeUsed.toLocaleString(undefined, { maximumFractionDigits: 0 })} $`}
                    color="#ffc107"
                    icon="📤"
                />
            </div>

            {/* Tabs */}
            <div style={tabContainer}>
                <button
                    style={activeTab === "incoming" ? activeTabStyle : tabStyle}
                    onClick={() => { setActiveTab("incoming"); setShowForm(false); setEditingId(null); }}
                >
                    📥 سجل الواردات (التبرعات)
                </button>
                <button
                    style={activeTab === "outgoing" ? activeTabStyle : tabStyle}
                    onClick={() => { setActiveTab("outgoing"); setShowForm(false); setEditingId(null); }}
                >
                    📤 سجل الصادر (استخدام التبرعات)
                </button>
            </div>

            {/* Actions & Filters */}
            <div style={actionBar}>
                <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(initialFormState(user)); }} style={btnAdd}>
                    {showForm ? "إغلاق النموذج" : (activeTab === "incoming" ? "+ تسجيل تبرع جديد" : "+ تسجيل مصروف جديد")}
                </button>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {user.role === "super" && (
                        <select
                            value={branchFilter}
                            onChange={(e) => setBranchFilter(e.target.value)}
                            style={inputStyle}
                        >
                            <option value="">كل الفروع</option>
                            <option value="البقاع الأوسط">البقاع الأوسط</option>
                            <option value="بعلبك">بعلبك</option>
                        </select>
                    )}
                    <input
                        type="date"
                        value={filterDay}
                        onChange={(e) => setFilterDay(e.target.value)}
                        style={inputStyle}
                    />
                    <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} style={inputStyle}>
                        <option value="">كل الأشهر</option>
                        {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleDateString('ar', { month: 'long' })}</option>
                        ))}
                    </select>
                    <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} style={inputStyle}>
                        <option value="">كل السنوات</option>
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Add/Edit Form */}
            {showForm && (
                <div style={formBox}>
                    <h4 style={{ marginBottom: "15px", borderBottom: "1px solid #eee", paddingBottom: "10px" }}>
                        {editingId ? "تعديل البيانات" : (activeTab === "incoming" ? "تسجيل تبرع جديد" : "تسجيل استخدام تبرعات (مصروف)")}
                    </h4>
                    <form onSubmit={handleSubmit} style={formGrid}>
                        <input type="date" name="التاريخ" value={form.التاريخ} onChange={handleChange} required style={inputStyle} />

                        {user.role === "super" ? (
                            <select name="الفرع" value={form.الفرع} onChange={handleChange} required style={inputStyle}>
                                <option value="">اختر الفرع</option>
                                <option value="البقاع الأوسط">البقاع الأوسط</option>
                                <option value="بعلبك">بعلبك</option>
                            </select>
                        ) : (
                            <input value={user.branch} readOnly style={{ ...inputStyle, background: "#eee" }} />
                        )}

                        {activeTab === "incoming" && (
                            <>
                                <input name="الاسم" placeholder="اسم المتبرع" value={form.الاسم} onChange={handleChange} required style={inputStyle} />
                                <select name="النوع" value={form.النوع} onChange={handleChange} required style={inputStyle}>
                                    <option value="نقدي">تبرع نقدي</option>
                                    <option value="عيني">تبرع عيني</option>
                                </select>
                            </>
                        )}

                        {activeTab === "outgoing" && (
                            <input name="كيفية_الصرف" placeholder="بيان الصرف (أين تم استخدامها؟)" value={form.كيفية_الصرف} onChange={handleChange} required style={{ ...inputStyle, flex: 2 }} />
                        )}

                        {(activeTab === "outgoing" || form.النوع === "نقدي") && (
                            <>
                                <input type="number" name="المبلغ" placeholder="المبلغ" value={form.المبلغ} onChange={handleChange} required style={inputStyle} />
                                <select name="العملة" value={form.العملة} onChange={handleChange} style={inputStyle}>
                                    <option value="USD">دولار ($)</option>
                                    <option value="LBP">ليرة لبنانية</option>
                                </select>
                            </>
                        )}

                        {activeTab === "incoming" && form.النوع === "عيني" && (
                            <>
                                <input name="تبرع_عيني" placeholder="نوع التبرع العيني" value={form.تبرع_عيني} onChange={handleChange} required style={inputStyle} />
                                <input name="الكمية" placeholder="الكمية" value={form.الكمية} onChange={handleChange} required style={inputStyle} />
                            </>
                        )}

                        <input name="ملاحظات" placeholder="ملاحظات إضافية" value={form.ملاحظات} onChange={handleChange} style={{ ...inputStyle, gridColumn: "1 / -1" }} />

                        <button type="submit" style={submitBtn}>{editingId ? "تحديث" : "حفظ"}</button>
                    </form>
                </div>
            )}

            {/* Expand Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', marginBottom: '10px' }}>
                <h4 style={{ margin: 0 }}>
                    {activeTab === "incoming" ? "سجل التبرعات الواردة" : "سجل استخدام التبرعات"}
                </h4>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    style={{ ...btnSecondary, background: "#C22129" }}
                >
                    {isExpanded ? "إخفاء السجل ▲" : "عرض السجل ▼"}
                </button>
            </div>

            {/* Table */}
            {isExpanded && (
                <div className="table-container" style={tableBox}>
                    <table style={table}>
                        <thead>
                            {activeTab === "incoming" ? (
                                <tr>
                                    <th>#</th>
                                    <th>التاريخ</th>
                                    <th>الفرع</th>
                                    <th>اسم المتبرع</th>
                                    <th>النوع</th>
                                    <th>المبلغ</th>
                                    <th>العملة</th>
                                    <th>عيني</th>
                                    <th>الكمية</th>
                                    <th>ملاحظات</th>
                                    <th>إجراءات</th>
                                </tr>
                            ) : (
                                <tr>
                                    <th>#</th>
                                    <th>التاريخ</th>
                                    <th>الفرع</th>
                                    <th>بيان الصرف</th>
                                    <th>المبلغ المصروف</th>
                                    <th>العملة</th>
                                    <th>ملاحظات</th>
                                    <th>إجراءات</th>
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {visible.length === 0 ? (
                                <tr><td colSpan="11" style={{ textAlign: "center", padding: "20px" }}>لا توجد بيانات</td></tr>
                            ) : (
                                visible.map((r, i) => (
                                    <tr key={i}>
                                        <td>{i + 1}</td>
                                        <td>{r[1]}</td>
                                        <td>{r[2]}</td>
                                        {activeTab === "incoming" ? (
                                            <>
                                                <td>{r[3]}</td>
                                                <td>{r[4]}</td>
                                                <td>{r[6]}</td>
                                                <td>{r[7]}</td>
                                                <td>{r[8]}</td>
                                                <td>{r[9]}</td>
                                                <td>{r[12]}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td>{r[10]}</td>
                                                <td style={{ color: "#dc3545", fontWeight: "bold" }}>{r[6]}</td>
                                                <td>{r[7]}</td>
                                                <td>{r[12]}</td>
                                            </>
                                        )}
                                        <td>
                                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                                <button
                                                    onClick={() => handleEdit(r)}
                                                    title="تعديل"
                                                    style={{ ...btnAction, fontSize: "1.2em" }}
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(r[0], r[4])}
                                                    title="حذف"
                                                    style={{ ...btnAction, color: "#dc3545", fontSize: "1.2em", fontWeight: "bold" }}
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
        </div>
    );
}

/*Components*/
function Card({ title, value, subValue, color, icon }) {
    return (
        <div style={{ ...card, borderBottom: `4px solid ${color}` }}>
            <div style={{ fontSize: "24px", marginBottom: "10px" }}>{icon}</div>
            <div style={{ fontSize: "14px", color: "#555", marginBottom: "8px" }}>{title}</div>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#333" }}>{value}</div>
            {subValue && <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>{subValue}</div>}
        </div>
    );
}

/*Styles*/
const container = { padding: "24px", width: "100%", background: "#f8f9fa", minHeight: "100vh" };
const header = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" };
const title = { margin: 0, fontSize: "24px", color: "#333", marginBottom: "6px" };
const btnSecondary = { background: "#424443", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "14px" };
const cardsGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "28px" };
const card = { background: "#fff", padding: "16px", borderRadius: "10px", textAlign: "center", border: "1px solid #ddd" };
const tabContainer = { display: "flex", gap: "10px", marginBottom: "20px", borderBottom: "1px solid #ddd", paddingBottom: "1px" };
const tabStyle = { padding: "10px 20px", border: "none", background: "none", cursor: "pointer", fontSize: "16px", color: "#666" };
const activeTabStyle = { ...tabStyle, borderBottom: "3px solid #C22129", fontWeight: "bold", color: "#C22129" };
const actionBar = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" };
const btnAdd = { background: "#C22129", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" };
const inputStyle = { padding: "10px", border: "1px solid #ddd", borderRadius: "6px", outline: "none" };
const formBox = { background: "#fff", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", marginBottom: "20px" };
const formGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "15px" };
const submitBtn = { background: "#28a745", color: "#fff", border: "none", padding: "10px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", gridColumn: "1 / -1" };
const tableBox = { background: "#fff", padding: "10px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", overflowX: "auto" };
const table = { width: "100%", borderCollapse: "collapse", minWidth: "600px" };
const btnAction = { background: "none", border: "none", cursor: "pointer", fontSize: "16px", marginLeft: "10px" };
