import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "https://al-shifaa-backend.onrender.com",
});

export default api;
