import { useState } from "react";
import { useNavigate } from "react-router-dom";
import mainLogo from "../assets/main_logo.png";

const BackgroundIcons = () => {
    const icons = [
        "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z", // Plus/First Aid
        "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z", // Heart
        "M10.5 4.5l-6 6M20 6L6 20l-4-4L16 2z", // Pill
        "M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z", // Medical Report/Briefcase
        "M20 7h-4V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM10 5h4v2h-4V5zm11 15H3V9h18v11zm-11-8H8v2h2v2h2v-2h2v-2h-2v-2h-2v2z" // First Aid Kit
    ];

    return (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
            {Array.from({ length: 20 }).map((_, i) => (
                <svg
                    key={i}
                    className="floating-icon"
                    viewBox="0 0 24 24"
                    style={{
                        left: `${(i * 7) % 100}%`,
                        bottom: `-${20 + (i * 5) % 30}%`,
                        width: `${30 + (i * 10) % 60}px`,
                        animationDuration: `${15 + (i * 3) % 20}s`,
                        animationDelay: `${i * -2}s`,
                    }}
                >
                    <path fill="#C22129" d={icons[i % icons.length]} />
                </svg>
            ))}
        </div>
    );
};

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  function login() {
    const users = {
      omar: { role: "super", branch: null, name: "Omar Mokhtar", password: "omar_shifaa_2026" },
      bekaa: { role: "admin", branch: "البقاع الأوسط", name: "Bekaa Admin", password: "bekaa_shifaa_2026" },
      baalback: { role: "admin", branch: "بعلبك", name: "Baalback Admin", password: "baalback_shifaa_2026" },
    };

    const foundUser = users[username];

    if (foundUser && password === foundUser.password) {
      localStorage.setItem("user", JSON.stringify({
        username,
        role: foundUser.role,
        branch: foundUser.branch,
        name: foundUser.name
      }));
      navigate("/dashboard");
    } else {
      setError("اسم المستخدم أو كلمة المرور غير صحيحة");
    }
  }

  return (
    <div style={wrapper}>
      <BackgroundIcons />
      <div style={card}>
        <img src={mainLogo} alt="logo" style={logo} />

        <h2 style={title}>تسجيل الدخول</h2>

        {error && <div style={errorBox}>{error}</div>}

        <div style={field}>
          <label>اسم المستخدم</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={input}
          />
        </div>

        <div style={field}>
          <label>كلمة المرور</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={input}
          />
        </div>

        <button onClick={login} style={button}>
          دخول
        </button>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const wrapper = {
  width: "100vw",
  height: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  direction: "rtl",
  background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
};

const card = {
  width: "420px",
  background: "#fff",
  padding: "40px",
  borderRadius: "18px",
  boxShadow: "0 15px 35px rgba(0,0,0,0.15)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const logo = {
  width: "160px",
  marginBottom: "24px",
};

const title = {
  marginBottom: "20px",
};

const errorBox = {
  width: "100%",
  background: "#ffeeee",
  color: "#C22129",
  padding: "10px",
  borderRadius: "6px",
  marginBottom: "16px",
  textAlign: "center",
};

const field = {
  width: "100%",
  marginBottom: "16px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const input = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #ddd",
  textAlign: "center",
};

const button = {
  width: "100%",
  padding: "12px",
  background: "#C22129",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  fontSize: "16px",
  fontWeight: "600",
  cursor: "pointer",
};
