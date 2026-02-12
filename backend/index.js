import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

// Google Sheets
import {
  getDonations,
  getCases,
  addCase,
  getFinancialData,
  getAssets,
  addAsset,
  getMedicalTeam,
  addMedicalTeamMember,
  updateMedicalTeamMember,
} from "./googleSheets.js";

console.log("✅ index.js loaded");

const app = express();
const PORT = process.env.PORT || 5000;

// =====================
// Middleware
// =====================
app.use(cors());
app.use(express.json());

// =====================
// Test Route
// =====================
app.get("/", (req, res) => {
  res.send("Backend running");
});

// =====================
// MEDICAL TEAM ROUTES
// =====================
app.get("/medical-team", async (req, res) => {
  try {
    const data = await getMedicalTeam();
    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("GET /medical-team error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/medical-team", async (req, res) => {
  try {
    const {
      الاسم_الثلاثي,
      الفرع,
      الصفة,
      فئة_الدم,
      تاريخ_الميلاد,
      الوضع_الاجتماعي,
      عدد_الأولاد,
      المستوى_التعليمي,
      بدلة,
      رقم_الهاتف,
      بطاقة,
      رقم_البطاقة,
      image_url,
    } = req.body;

    const row = [
      Date.now(),              // الرقم (0)
      الاسم_الثلاثي,            // الاسم الثلاثي (1)
      الفرع,                    // الفرع (2)
      الصفة,                   // الصفة (3)
      فئة_الدم,
      تاريخ_الميلاد,
      الوضع_الاجتماعي,
      عدد_الأولاد,
      المستوى_التعليمي,
      بدلة,
      رقم_الهاتف,
      بطاقة,
      رقم_البطاقة,
      image_url,
    ];

    await addMedicalTeamMember(row);
    res.json({ success: true });
  } catch (error) {
    console.error("POST /medical-team error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
app.put("/medical-team/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      الاسم_الثلاثي,
      الفرع,
      الصفة,
      فئة_الدم,
      تاريخ_الميلاد,
      الوضع_الاجتماعي,
      عدد_الأولاد,
      المستوى_التعليمي,
      بدلة,
      رقم_الهاتف,
      بطاقة,
      رقم_البطاقة,
      image_url,
    } = req.body;

    const row = [
      id,                      // الرقم (0)
      الاسم_الثلاثي,            // الاسم الثلاثي (1)
      الفرع,                    // الفرع (2)
      الصفة,                   // الصفة (3)
      فئة_الدم,
      تاريخ_الميلاد,
      الوضع_الاجتماعي,
      عدد_الأولاد,
      المستوى_التعليمي,
      بدلة,
      رقم_الهاتف,
      بطاقة,
      رقم_البطاقة,
      image_url,
    ];

    await updateMedicalTeamMember(id, row);
    res.json({ success: true });
  } catch (error) {
    console.error("PUT /medical-team error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// =====================
// DONATIONS ROUTE
// =====================
app.get("/donations", async (req, res) => {
  try {
    const data = await getDonations();
    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("GET /donations error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// =====================
// CASES ROUTES
// =====================

// 🔹 GET all cases
app.get("/cases", async (req, res) => {
  try {
    const data = await getCases();
    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("GET /cases error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 🔹 ADD new case
app.post("/cases", async (req, res) => {
  try {
    const {
      التاريخ,
      الفرع,
      الجنس,
      نوع_الحالة,
      الوصف,
      الفريق,
      ملاحظات,
    } = req.body;

    const row = [
      Date.now(),                 // case_id
      التاريخ,
      الفرع,
      الجنس,
      نوع_الحالة,
      الوصف || "",
      الفريق || "",
      ملاحظات || "",
      new Date().toISOString(),   // created_at
    ];

    await addCase(row);

    res.json({ success: true });
  } catch (error) {
    console.error("POST /cases error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// =====================
// FINANCIAL ROUTES
// =====================

// 🔹 GET all financial records
app.get("/financial", async (req, res) => {
  try {
    const data = await getFinancialData();

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("GET /financial error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// =====================
// ASSETS ROUTE
// =====================
app.get("/assets", async (req, res) => {
  try {
    const data = await getAssets();
    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("GET /assets error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 🔹 ADD new asset
app.post("/assets", async (req, res) => {
  try {
    const {
      الفرع,
      نوع_الأصل,
      الفئة,
      اسم_الأصل,
      الوصف,
      الكمية,
      الحالة,
      رقم_السيارة,
      سنة_الصنع,
      الموقع,
      تاريخ_الإضافة,
      آخر_تعديل,
      ملاحظات,
    } = req.body;

    const row = [
      Date.now(),                 // asset_id
      الفرع,
      نوع_الأصل,
      الفئة || "",
      اسم_الأصل,
      الوصف || "",
      الكمية || 0,
      الحالة || "",
      رقم_السيارة || "",
      سنة_الصنع || "",
      الموقع || "",
      new Date().toISOString(),   // created_at
      new Date().toISOString(),   // updated_at
      ملاحظات || "",
    ];

    await addAsset(row);

    res.json({ success: true });
  } catch (error) {
    console.error("POST /assets error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// =====================
// Start Server
// =====================
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
