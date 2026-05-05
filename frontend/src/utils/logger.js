import api from "../api";

/**
 * Logs an admin action to the backend.
 * Automatically fetches the user from localStorage and browser info.
 * @param {string} action The short action name (e.g. "تسجيل دخول")
 * @param {string} details Optional detailed info (e.g. "تم تعديل جدول بعلبك")
 */
export async function logAction(action, details = "") {
    try {
        const userStr = localStorage.getItem("user");
        if (!userStr) return; // Silent return if not logged in

        const user = JSON.parse(userStr);
        const device = navigator.userAgent; // Basic device/browser info

        await api.post("/logs", {
            adminName: user.name || user.username,
            branch: user.branch || "All",
            action,
            details,
            device
        });
    } catch (err) {
        console.error("Failed to log action:", err);
    }
}
