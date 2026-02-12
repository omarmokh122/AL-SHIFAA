import axios from "axios";

const api = axios.create({
    baseURL:
        window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
            ? "http://127.0.0.1:5000"
            : "https://al-shifaa-backend.onrender.com",
});

export default api;
