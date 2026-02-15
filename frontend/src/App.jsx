import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

/* ===== Pages ===== */
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import Cases from "./pages/Cases";
import Financial from "./pages/Financial";
import Assets from "./pages/Assets";
import MedicalTeam from "./pages/MedicalTeam";
import Donations from "./pages/Donations";
import MonthlyCasesReport from "./pages/MonthlyCasesReport";
import MonthlyDonationsReport from "./pages/MonthlyDonationsReport";
import MonthlyFinancialReport from "./pages/MonthlyFinancialReport";
import MedicalProfile from "./pages/MedicalProfile";
import BorrowedAssets from "./pages/BorrowedAssets";


/* ===== Layout & Guards ===== */
import MainLayout from "./components/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ===== Login ===== */}
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard */}
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />

          {/* Core Modules */}
          <Route path="cases" element={<Cases />} />
          <Route path="reports/monthly-cases" element={<MonthlyCasesReport />} />
          <Route
            path="reports/monthly-donations"
            element={<MonthlyDonationsReport />}
          />
          <Route
            path="reports/monthly-financial"
            element={<MonthlyFinancialReport />}
          />
          <Route path="financial" element={<Financial />} />
          <Route path="assets" element={<Assets />} />
          <Route path="borrowed-assets" element={<BorrowedAssets />} />
          <Route path="medical-team" element={<MedicalTeam />} />
          <Route path="medical-profile" element={<MedicalProfile />} />
          <Route path="donations" element={<Donations />} />
        </Route>

        {/* ===== Fallback ===== */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
