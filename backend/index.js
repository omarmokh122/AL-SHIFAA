import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

// Google Sheets
import {
  getDonationsReceived,
  addDonationReceived,
  getDonationsSpent,
  addDonationSpent,
  getCases,
  addCase,
  updateCase,
  deleteCase,
  getFinancialData,
  getAssets,
  addAsset,
  updateAsset,
  deleteAsset,
  getMedicalTeam,
  addMedicalTeamMember,
  updateMedicalTeamMember,
  getInventory,
  updateBranchInventory
} from "./googleSheets.js";

console.log("✅ index.js loaded");

const app = express();
const PORT = process.env.PORT || 5000;

// =====================
// Middleware
// =====================
app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

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
// =====================
// DONATIONS ROUTE
// =====================
app.get("/donations", async (req, res) => {
  try {
    const received = await getDonationsReceived();
    const spent = await getDonationsSpent();

    // To avoid breaking frontend which expects one array, we can combine them.
    // However, to distinguish, we can flag them or ensure 'Type' is correct.
    // getDonationsReceived rows likely don't have 'Type' column populated with "Received" unless form does it.
    // Frontend form sends "نقدي" or "عيني" for received, and "صرف" for spent.
    // So combining them is safe if the rows contain the type.
    // The rows from sheets are just arrays of values.
    // A concern: if sheets became empty, how do we know which column is which?
    // We assume strict column mapping.

    // Let's add a small marker if needed, but for now exact same structure is expected.
    const allData = [...received, ...spent];

    // 🔹 NORMALIZATION: Handle mixed data formats
    // Old Format: [..., Type, "", Method, Amount, ...] (Empty col at 5)
    // New Format: [..., Type, Method, Amount, ...] (No empty col)
    // We detect Old Format if index 6 is NOT a number (e.g. Method string or empty) AND index 7 IS a number (Amount).
    // If detected, we remove index 5 to align with New Format.

    const normalizedData = allData.map(row => {
      // Ensure row has enough columns to be potentially old format
      if (!row || row.length < 8) return row;

      const val6 = parseFloat(String(row[6] || "").replace(/,/g, ""));
      const val7 = parseFloat(String(row[7] || "").replace(/,/g, ""));

      // Check if row[6] is NaN (likely text Method) and row[7] is Number (Amount)
      // detailed check: row[6] might be empty string -> NaN. row[7] is amount.
      if (isNaN(val6) && !isNaN(val7)) {
        // Likely Old Format with shift. Remove index 5.
        const newRow = [...row];
        newRow.splice(5, 1); // Remove the empty placeholder
        return newRow;
      }
      return row;
    });

    res.json({
      success: true,
      count: normalizedData.length,
      data: normalizedData,
    });
  } catch (error) {
    console.error("GET /donations error:", error.message);
    res.status(500).json({
      success: false,
      error: `Error fetching data. Check backend logs: ${error.message}`,
    });
  }
});

app.post("/donations", async (req, res) => {
  try {
    const {
      التاريخ,
      الفرع,
      الاسم,
      النوع,
      الطريقة,
      المبلغ,
      العملة,
      تبرع_عيني,
      الكمية,
      كيفية_الصرف,
      جهة_الاستلام,
      ملاحظات
    } = req.body;

    const row = [
      Date.now(),           // ID
      التاريخ,
      الفرع,
      الاسم,
      النوع,
      الطريقة || "",
      المبلغ || 0,
      العملة || "USD",
      تبرع_عيني || "",
      الكمية || 0,
      كيفية_الصرف || "",
      جهة_الاستلام || "",
      ملاحظات || "",
      new Date().toISOString() // CreatedAt
    ];

    if (النوع === "صرف") {
      await addDonationSpent(row);
    } else {
      await addDonationReceived(row);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("POST /donations error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 🔹 DELETE /donations/:id?type=...
app.delete("/donations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query; // "صرف" or "نقدي"/"عيني" (anything else is received)

    // We need to know which sheet to delete from.
    // The frontend must send the type or we search both (slower).
    // Let's require type for now as it's cleaner.

    await deleteDonation(id, type);
    res.json({ success: true });
  } catch (error) {
    console.error("DELETE /donations error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🔹 PUT /donations/:id
app.put("/donations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    // We expect the full row object/body similar to POST, 
    // but we need to format it into the array row structure.

    const {
      التاريخ, الفرع, الاسم, النوع, الطريقة, المبلغ, العملة,
      تبرع_عيني, الكمية, كيفية_الصرف, جهة_الاستلام, ملاحظات, CreatedAt
    } = req.body;

    const row = [
      id, // Keep original ID
      التاريخ,
      الفرع,
      الاسم,
      النوع,
      الطريقة || "",
      المبلغ || 0,
      العملة || "USD",
      تبرع_عيني || "",
      الكمية || 0,
      كيفية_الصرف || "",
      جهة_الاستلام || "",
      ملاحظات || "",
      CreatedAt || new Date().toISOString()
    ];

    await updateDonation(id, row, النوع);
    res.json({ success: true });

  } catch (error) {
    console.error("PUT /donations error:", error.message);
    res.status(500).json({ success: false, error: error.message });
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
      ملاحظات,
    } = req.body;

    const row = [
      Date.now(),                 // case_id
      التاريخ,
      الفرع,
      الجنس,
      نوع_الحالة,
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

// 🔹 UPDATE case
app.put("/cases/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      التاريخ,
      الفرع,
      الجنس,
      نوع_الحالة,
      ملاحظات,
      CreatedAt
    } = req.body;

    const row = [
      id,                         // case_id
      التاريخ,
      الفرع,
      الجنس,
      نوع_الحالة,
      ملاحظات || "",
      CreatedAt || new Date().toISOString(),
      ""                          // Status
    ];

    await updateCase(id, row);
    res.json({ success: true });
  } catch (error) {
    console.error("PUT /cases error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 🔹 DELETE case (Soft Delete)
app.delete("/cases/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await deleteCase(id);
    res.json({ success: true });
  } catch (error) {
    console.error("DELETE /cases error:", error.message);
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

app.put("/assets/:id", async (req, res) => {
  try {
    const { id } = req.params;
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
      ملاحظات,
    } = req.body;

    const row = [
      id,
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
      تاريخ_الإضافة,
      new Date().toISOString(),   // updated_at
      ملاحظات || "",
    ];

    await updateAsset(id, row);
    res.json({ success: true });
  } catch (error) {
    console.error("PUT /assets error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.delete("/assets/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await deleteAsset(id);
    res.json({ success: true });
  } catch (error) {
    console.error("DELETE /assets error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 🔹 GET all inventory
app.get("/inventory", async (req, res) => {
  try {
    const data = await getInventory();
    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("GET /inventory error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 🔹 POST update inventory for a branch
app.post("/inventory", async (req, res) => {
  try {
    const { branch, inventory } = req.body;

    // inventory is expected to be an object: { "كراسي معاقين": 15, "ووكر متحرك": 10, ... }
    await updateBranchInventory(branch, inventory);

    res.json({ success: true });
  } catch (error) {
    console.error("POST /inventory error:", error.message);
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
