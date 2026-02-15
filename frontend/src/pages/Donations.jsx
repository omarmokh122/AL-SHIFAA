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

    // UI State
    const [activeTab, setActiveTab] = useState("incoming"); // "incoming" or "outgoing"
    const [showForm, setShowForm] = useState(false);

    // Form State
    const [form, setForm] = useState({
        التاريخ: new Date().toISOString().split('T')[0],
        الفرع: user.branch || "",
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
    });

    useEffect(() => {
        fetchDonations();
    }, []);

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
        if (filterMonth || filterYear) {
            const d = new Date(r[1]);
            const m = filterMonth ? d.getMonth() + 1 === parseInt(filterMonth) : true;
            const y = filterYear ? d.getFullYear() === parseInt(filterYear) : true;
            matchDate = m && y;
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

    // Data Structure Alignment (15 columns from Backend):
    // [ID, Date, Branch, Name, Type, "", Method, Amount, Currency, KindType, Quantity, Usage, Recipient, Notes, CreatedAt]
    // 0    1     2       3     4     5   6       7       8         9         10        11     12         13     14

    // Total Incoming (Cash)
    let totalIncomingUSD = 0;
    let totalIncomingLBP = 0;
    incomingData.forEach(r => {
        if (r[4] === "نقدي") {
            const val = parseAmount(r[7]);
            const cur = (r[8] || "").toUpperCase();
            if (cur === "USD" || cur === "$") totalIncomingUSD += val;
            else totalIncomingLBP += val;
        }
    });

    console.log("Debug Stats:", {
        incomingCount: incomingData.length,
        outgoingCount: outgoingData.length,
        totalIncomingUSD,
        totalIncomingLBP,
        totalOutgoingUSD,
        totalOutgoingLBP
    });

    // Total Outgoing (Usage)
    let totalOutgoingUSD = 0;
    let totalOutgoingLBP = 0;
    outgoingData.forEach(r => {
        const val = parseAmount(r[7]);
        const cur = (r[8] || "").toUpperCase();
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
            ملاحظات: form.ملاحظات || ""
        };

        // Debug Log
        console.log("Submitting Donation Payload:", payload);

        try {
            await api.post("/donations", payload);
            alert(activeTab === "incoming" ? "تم تسجيل التبرع بنجاح" : "تم تسجيل المصروف بنجاح");
            setForm({
                التاريخ: new Date().toISOString().split('T')[0],
                الفرع: user.branch || "",
                الاسم: "",
                النوع: "نقدي",
                الطريقة: "",
                المبلغ: "",
                العملة: "USD",
                تبرع_عيني: "",
                الكمية: "",
                كيفية_الصرف: "",
                جهة_الاستلام: "",
                ملاحظات: ""
            });
            setShowForm(false);
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

    return (
        <div dir="rtl" style={container}>
            {/* Header */}
            <div style={header}>
                <div>
                    <h2 style={title}>إدارة التبرعات والمصروفات</h2>
                    <p style={{ color: "#666", fontSize: "14px" }}>
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
                    onClick={() => { setActiveTab("incoming"); setShowForm(false); }}
                >
                    📥 سجل الواردات (التبرعات)
                </button>
                <button
                    style={activeTab === "outgoing" ? activeTabStyle : tabStyle}
                    onClick={() => { setActiveTab("outgoing"); setShowForm(false); }}
                >
                    📤 سجل الصادر (استخدام التبرعات)
                </button>
            </div>

            {/* Actions & Filters */}
            <div style={actionBar}>
                <button onClick={() => setShowForm(!showForm)} style={btnAdd}>
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

            {/* Add Form */}
            {showForm && (
                <div style={formBox}>
                    <h4 style={{ marginBottom: "15px", borderBottom: "1px solid #eee", paddingBottom: "10px" }}>
                        {activeTab === "incoming" ? "تسجيل تبرع جديد" : "تسجيل استخدام تبرعات (مصروف)"}
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

                        <button type="submit" style={submitBtn}>حفظ</button>
                    </form>
                </div>
            )}

            {/* Table */}
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
                            </tr>
                        )}
                    </thead>
                    <tbody>
                        {visible.length === 0 ? (
                            <tr><td colSpan="10" style={{ textAlign: "center", padding: "20px" }}>لا توجد بيانات</td></tr>
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
                                            <td>{r[7]}</td>
                                            <td>{r[8]}</td>
                                            <td>{r[9]}</td>
                                            <td>{r[10]}</td>
                                            <td>{r[13]}</td>
                                        </>
                                    ) : (
                                        <>
                                            <td>{r[11]}</td> {/* How Spent / Spending Channel */}
                                            <td style={{ color: "#dc3545", fontWeight: "bold" }}>{r[7]}</td>
                                            <td>{r[8]}</td>
                                            <td>{r[13]}</td>
                                        </>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/*Components*/
function Card({ title, value, subValue, color, icon }) {
    return (
        <div style={{ ...card, borderBottom: `4px solid ${color}` }}>
            <div style={{ fontSize: "24px", marginBottom: "10px" }}>{icon}</div>
            <div style={{ fontSize: "13px", color: "#666" }}>{title}</div>
            <div style={{ fontSize: "22px", fontWeight: "bold", color: "#333" }}>{value}</div>
            {subValue && <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>{subValue}</div>}
        </div>
    );
}

/*Styles*/
const container = { padding: "24px", width: "100%", background: "#f8f9fa", minHeight: "100vh" };
const header = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" };
const title = { margin: 0, fontSize: "24px", color: "#333" };
const btnSecondary = { background: "#6c757d", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" };
const cardsGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px", marginBottom: "25px" };
const card = { background: "#fff", padding: "20px", borderRadius: "8px", textAlign: "center", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" };
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
