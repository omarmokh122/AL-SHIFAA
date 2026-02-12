import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Breadcrumb from "./Breadcrumb";

export default function MainLayout() {
  return (
    <div style={{ direction: "rtl" }}>
      {/* Sidebar ثابت */}
      <Sidebar />

      {/* المحتوى الرئيسي */}
      <div
        style={{
          marginRight: "220px",   // عرض الـ Sidebar
          minHeight: "100vh",
          background: "#ffffff",  // ✅ خلفية بيضاء كاملة
        }}
      >
        <Header />

        {/* محتوى الصفحات */}
        <div
          style={{
            padding: "24px 32px",
            width: "100%",        // ✅ Full width
            boxSizing: "border-box",
          }}
        >
          <Breadcrumb />
          <Outlet />
        </div>
      </div>
    </div>
  );
}
