import { useState, useEffect } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

export default function ActivityLogs() {
    const user = JSON.parse(localStorage.getItem("user"));
    const navigate = useNavigate();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        // Double check super admin
        if (user.role !== "super") {
            navigate("/dashboard");
            return;
        }

        api.get("/logs")
            .then(res => {
                if (res.data.success) {
                    // Reverse to show newest first
                    setLogs(res.data.data.reverse());
                }
            })
            .catch(err => console.error("Error fetching logs:", err))
            .finally(() => setLoading(false));
    }, [user.role, navigate]);

    const filteredLogs = logs.filter(log => {
        const text = log.join(" ").toLowerCase();
        return text.includes(searchTerm.toLowerCase());
    });

    if (user.role !== "super") return null;

    return (
        <div dir="rtl" style={page}>
            <h2 style={{ marginBottom: "20px", color: "#C22129" }}>سجل نشاطات النظام</h2>
            <p style={desc}>
                يمكنك هنا مراقبة جميع تحركات المدراء على المنصة، بما في ذلك تسجيلات الدخول والأنشطة المهمة.
            </p>

            <input 
                type="text" 
                placeholder="بحث في السجل..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={searchInput}
            />

            <div style={tableContainer}>
                {loading ? (
                    <div style={{ padding: "40px", textAlign: "center" }}>⏳ جاري تحميل السجل...</div>
                ) : (
                    <table style={table}>
                        <thead>
                            <tr>
                                <th style={th}>التاريخ والوقت</th>
                                <th style={th}>المدير</th>
                                <th style={th}>الفرع</th>
                                <th style={th}>النشاط</th>
                                <th style={th}>التفاصيل</th>
                                <th style={th}>الجهاز / المتصفح</th>
                                <th style={th}>IP Address</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.map((log, i) => (
                                <tr key={i} style={tr}>
                                    <td style={td}>{new Date(log[0]).toLocaleString("ar-EG")}</td>
                                    <td style={td}><strong>{log[1]}</strong></td>
                                    <td style={td}>{log[3]}</td>
                                    <td style={td}><span style={{ ...badge, background: log[2] === "تسجيل دخول" ? "#e8f5e9" : "#e3f2fd", color: log[2] === "تسجيل دخول" ? "#2e7d32" : "#1565c0" }}>{log[2]}</span></td>
                                    <td style={td}>{log[4]}</td>
                                    <td style={td} title={log[5]}>{log[5] && log[5].substring(0, 30)}...</td>
                                    <td style={td} dir="ltr">{log[6]}</td>
                                </tr>
                            ))}
                            {filteredLogs.length === 0 && (
                                <tr>
                                    <td colSpan="7" style={{ padding: "30px", textAlign: "center", color: "#666" }}>
                                        لا توجد نشاطات مسجلة
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

const page = {
    padding: "24px",
    width: "100%",
};

const desc = {
    color: "#555",
    lineHeight: "1.7",
    marginBottom: "20px",
};

const searchInput = {
    padding: "12px",
    width: "100%",
    maxWidth: "400px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    outline: "none",
    marginBottom: "20px",
    fontSize: "14px",
};

const tableContainer = {
    overflowX: "auto",
    background: "#fff",
    borderRadius: "10px",
    border: "1px solid #eee",
};

const table = {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
};

const th = {
    background: "#f8f9fa",
    padding: "14px 16px",
    textAlign: "right",
    borderBottom: "2px solid #ddd",
    color: "#333",
    whiteSpace: "nowrap",
};

const tr = {
    borderBottom: "1px solid #eee",
    transition: "background 0.2s",
};

const td = {
    padding: "12px 16px",
    color: "#555",
};

const badge = {
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "bold",
    whiteSpace: "nowrap",
};
