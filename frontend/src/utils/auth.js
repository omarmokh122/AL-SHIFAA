export function getUser() {
    try {
        return JSON.parse(localStorage.getItem("user"));
    } catch {
        return null;
    }
}

export function isSuper(user) {
    return user?.role === "super";
}

export function isAdmin(user) {
    return user?.role === "admin";
}

export function isViewer(user) {
    return user?.role === "viewer";
}
