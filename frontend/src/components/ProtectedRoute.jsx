import { Navigate } from "react-router-dom";

/**
 * @param {ReactNode} children
 * @param {Array} allowedRoles - اختياري: ["admin", "super"]
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const storedUser = localStorage.getItem("user");

  // غير مسجّل دخول
  if (!storedUser) {
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(storedUser);

  // في حال الصفحة تتطلب أدوار محددة
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
