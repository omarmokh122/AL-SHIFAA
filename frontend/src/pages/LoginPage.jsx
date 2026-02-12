import { useState } from "react";
import { useNavigate } from "react-router-dom";
import mainLogo from "../assets/main_logo.png";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  function login() {
    const users = {
      super: { role: "super", branch: null },
      bekaa: { role: "admin", branch: "البقاع الأوسط" },
      baalbeck: { role: "admin", branch: "بعلبك" },
    };

    if (users[username] && password === `${username}123`) {
      localStorage.setItem("user", JSON.stringify({
        username,
        ...users[username]
      }));
      navigate("/dashboard");
    } else {
      setError("اسم المستخدم أو كلمة المرور غير صحيحة");
    }
  }

  return (
    <div style={wrapper}>
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
