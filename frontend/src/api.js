import axios from "axios";

const backendURL = "https://al-shifaa-backend.onrender.com";
console.log("Using API BaseURL:", backendURL);

const api = axios.create({
    baseURL: backendURL,
});

export default api;
