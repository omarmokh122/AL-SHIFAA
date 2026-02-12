import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api";

import api from "../api";
import { compressAndResizeImage } from "../utils/image";

const ROLES = ["مسعف", "ممرض", "طبيب", "سائق إسعاف", "إداري", "متطوع"];

const DEFAULT_IMG =
    "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

export default function MedicalProfile() {
    const { state } = useLocation();
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user"));
    const m = state?.member;

    const [isEditing, setIsEditing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        الاسم_الثلاثي: m ? m[1] : "",
        الفرع: m ? m[2] : "",
        الصفة: m ? m[3] : "",
        فئة_الدم: m ? m[4] : "",
        تاريخ_الميلاد: m ? m[5] : "",
        الوضع_الاجتماعي: m ? m[6] : "",
        عدد_الأولاد: m ? m[7] : "",
        المستوى_التعليمي: m ? m[8] : "",
        بدلة: m ? m[9] : "",
        رقم_الهاتف: m ? m[10] : "",
        بطاقة: m ? m[11] : "",
        رقم_البطاقة: m ? m[12] : "",
        image_url: m ? m[13] : "",
    });

    if (!m) return <p style={{ textAlign: "center", padding: "50px" }}>لا توجد بيانات</p>;

    function handleChange(e) {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    }

    async function handleFileChange(e) {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            // New Resizing & Compression logic (No Cloudinary needed)
            const base64 = await compressAndResizeImage(file);
            console.log("Image resized to Base64 (length):", base64.length);

            setFormData(prev => ({ ...prev, image_url: base64 }));
            alert("✅ تم تجهيز الصورة بنجاح (معالجة محلية)");
        } catch (err) {
            console.error("Image Processing Error:", err);
            alert("❌ خطأ أثناء معالجة الصورة");
        } finally {
            setIsUploading(false);
        }
    }

    async function handleSave() {
        if (isSaving) return;
        setIsSaving(true);
        try {
            await api.put(`/medical-team/${m[0]}`, formData);
            alert("✅ تم حفظ التعديلات بنجاح");
            setIsEditing(false);
            navigate("/medical-team"); // Go back to list to see updates
        } catch (err) {
            alert("❌ فشل حفظ التعديلات");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div dir="rtl" style={page}>
            {/* ===== HEADER ===== */}
            <div style={header}>
                <button onClick={() => navigate(-1)} style={backBtn}>
                    ⬅ رجوع
                </button>

                {(user.role === "admin" || user.role === "super") && (
                    <button
                        onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                        disabled={isSaving}
                        style={{
                            ...backBtn,
                            background: isEditing ? "#2e7d32" : "#424443",
                            marginRight: "10px",
                            opacity: isSaving ? 0.7 : 1
                        }}
                    >
                        {isSaving ? "⏳ جاري الحفظ..." : (isEditing ? "💾 حفظ التعديلات" : "✏️ تعديل الملف")}
                    </button>
                )}
                {isEditing && (
                    <button onClick={() => setIsEditing(false)} style={{ ...backBtn, background: "#777", marginRight: "10px" }}>
                        إلغاء
                    </button>
                )}
            </div>

            {/* ===== PROFILE HEADER ===== */}
            <div style={profileHeader}>
                <div style={{ position: "relative" }}>
                    <img
                        src={formData.image_url || DEFAULT_IMG}
                        alt="profile"
                        style={avatar}
                        onError={(e) => (e.target.src = DEFAULT_IMG)}
                    />
                    {isEditing && (
                        <label style={uploadLabel}>
                            {isUploading ? "..." : "📷"}
                            <input type="file" hidden onChange={handleFileChange} />
                        </label>
                    )}
                </div>

                <div>
                    {isEditing ? (
                        <input
                            name="الاسم_الثلاثي"
                            value={formData.الاسم_الثلاثي}
                            onChange={handleChange}
                            style={editInput}
                        />
                    ) : (
                        <h2>{formData.الاسم_الثلاثي}</h2>
                    )}
                    <p style={{ color: "#666" }}>{formData.الفرع}</p>
                </div>
            </div>

            {/* ===== DETAILS ===== */}
            <div style={detailsGrid}>
                {isEditing ? (
                    <>
                        <EditItem title="الصفة">
                            <select name="الصفة" value={formData.الصفة} onChange={handleChange} style={editInput}>
                                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </EditItem>
                        <EditItem title="فئة الدم">
                            <input name="فئة_الدم" value={formData.فئة_الدم} onChange={handleChange} style={editInput} />
                        </EditItem>
                        <EditItem title="تاريخ الميلاد">
                            <input type="date" name="تاريخ_الميلاد" value={formData.تاريخ_الميلاد} onChange={handleChange} style={editInput} />
                        </EditItem>
                        <EditItem title="الوضع الاجتماعي">
                            <input name="الوضع_الاجتماعي" value={formData.الوضع_الاجتماعي} onChange={handleChange} style={editInput} />
                        </EditItem>
                        <EditItem title="عدد الأولاد">
                            <input type="number" name="عدد_الأولاد" value={formData.عدد_الأولاد} onChange={handleChange} style={editInput} />
                        </EditItem>
                        <EditItem title="رقم الهاتف">
                            <input name="رقم_الهاتف" value={formData.رقم_الهاتف} onChange={handleChange} style={editInput} />
                        </EditItem>
                        <EditItem title="المستوى التعليمي">
                            <input name="المستوى_التعليمي" value={formData.المستوى_التعليمي} onChange={handleChange} style={editInput} />
                        </EditItem>
                        <EditItem title="رقم البطاقة">
                            <input name="رقم_البطاقة" value={formData.رقم_البطاقة} onChange={handleChange} style={editInput} />
                        </EditItem>
                    </>
                ) : (
                    <>
                        <Detail title="الصفة" value={formData.الصفة} />
                        <Detail title="فئة الدم" value={formData.فئة_الدم} />
                        <Detail title="تاريخ الميلاد" value={formData.تاريخ_الميلاد} />
                        <Detail title="الوضع الاجتماعي" value={formData.الوضع_الاجتماعي} />
                        <Detail title="عدد الأولاد" value={formData.عدد_الأولاد} />
                        <Detail title="المستوى التعليمي" value={formData.المستوى_التعليمي} />
                        <Detail title="استلام بدلة" value={formData.بدلة} />
                        <Detail title="رقم الهاتف" value={formData.رقم_الهاتف} />
                        <Detail title="استلام بطاقة" value={formData.بطاقة} />
                        <Detail title="رقم البطاقة" value={formData.رقم_البطاقة} />
                    </>
                )}
            </div>
        </div>
    );
}

/* ================= COMPONENT ================= */
function Detail({ title, value }) {
    return (
        <div style={card}>
            <div style={{ fontSize: "13px", color: "#666" }}>{title}</div>
            <div style={{ fontSize: "16px", fontWeight: "bold" }}>
                {value || "-"}
            </div>
        </div>
    );
}

function EditItem({ title, children }) {
    return (
        <div style={card}>
            <div style={{ fontSize: "13px", color: "#666", marginBottom: "5px" }}>{title}</div>
            {children}
        </div>
    );
}

/* ================= STYLES ================= */

const page = {
    padding: "20px",
    maxWidth: "1400px",
    margin: "0 auto",
};

const header = {
    marginBottom: "20px",
};

const backBtn = {
    background: "#C22129",
    color: "#fff",
    border: "none",
    padding: "8px 14px",
    borderRadius: "6px",
    cursor: "pointer",
};

const profileHeader = {
    display: "flex",
    gap: "20px",
    alignItems: "center",
    marginBottom: "30px",
};

const avatar = {
    width: "180px",
    height: "180px",
    objectFit: "cover",
    borderRadius: "14px",
};

const detailsGrid = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "16px",
};

const card = {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "16px",
};

const editInput = {
    width: "100%",
    padding: "8px",
    border: "1px solid #C22129",
    borderRadius: "6px",
    fontSize: "15px",
    boxSizing: "border-box",
    outline: "none",
};

const uploadLabel = {
    position: "absolute",
    bottom: "5px",
    right: "5px",
    background: "#C22129",
    color: "#fff",
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
};
