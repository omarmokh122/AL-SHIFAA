import { google } from "googleapis";

// =====================
// Google Auth
// =====================
const creds = process.env.GOOGLE_SHEETS_CREDENTIALS
    ? JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS)
    : null;

const auth = new google.auth.GoogleAuth({
    keyFile: creds ? undefined : "credentials.json",
    credentials: creds || undefined,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

// =====================
// Spreadsheet ID
// =====================
const SPREADSHEET_ID =
    "17gx7mbIzuPJfEOhNj0W9ah6SFd7mf6dyQnD2cZIhCbM";

// =====================
// CASES
// =====================
// =====================
// CASES
// =====================
// Helper to parse date strictly as MM/DD/YYYY if it matches that format
function parseSheetDate(str) {
    if (!str) return null;
    const s = String(str).trim();
    // Check for M/D/Y or MM/DD/YYYY
    const parts = s.split("/");
    if (parts.length === 3) {
        const m = parseInt(parts[0], 10);
        const d = parseInt(parts[1], 10);
        const y = parseInt(parts[2], 10);
        if (!isNaN(m) && !isNaN(d) && !isNaN(y)) {
            // JS months are 0-indexed
            return new Date(y, m - 1, d);
        }
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}

export async function getCases() {
    try {
        // Fetch from Cases_Raw_Data
        // Headers: [0: Timestamp, 1: التاريخ, 2: الشهر, 3: السنة, 4: الفرع, 5: الجنس, 6: نوع الحالة, 7: ملاحظات, 8: الفئة العمرية للحالة, 9: Status]
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "Cases_Raw_Data!A2:J",
        });
        const entries = res.data.values || [];

        let mapped = entries.map(r => {
            const dateVal = parseSheetDate(r[1]);
            const monthNames = [
                "كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران",
                "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"
            ];

            // Derive month/year from Date
            const derivedMonth = dateVal ? monthNames[dateVal.getMonth()] : "";
            const derivedYear = dateVal ? String(dateVal.getFullYear()) : "";

            // New Index Mapping (Raw 0-7):
            // r[0]: Timestamp, r[1]: التاريخ, r[2]: الفرع, r[3]: الجنس, r[4]: نوع الحالة, r[5]: ملاحظات, r[6]: الفئة العمرية, r[7]: Status
            return [
                r[0],       // 0: ID (Timestamp)
                r[1],       // 1: التاريخ
                derivedMonth, // 2: الشهر (Derived)
                derivedYear,  // 3: السنة (Derived)
                r[2],       // 4: الفرع
                r[3],       // 5: الجنس
                r[4],       // 6: نوع الحالة
                r[5] || "", // 7: ملاحظات
                r[0],       // 8: CreatedAt
                r[7] || "",  // 9: Status (Col H / Index 7)
                r[6] || ""   // 10: Age Group (Col G / Index 6)
            ];
        });

        // Filter out soft-deleted records (index 9)
        mapped = mapped.filter(r => r[9] !== "Deleted");

        // Sort by date (descending)
        return mapped.sort((a, b) => new Date(b[1]) - new Date(a[1]) || (b[0] > a[0] ? 1 : -1));
    } catch (error) {
        console.error("Error in getCases:", error.message);
        return [];
    }
}

// Write to Cases_Raw_Data
// Frontend provides: [Date.now(), التاريخ, الفرع, الجنس, نوع_الحالة, ملاحظات, CreatedAt, الفئة_العمرية]
export async function addCase(row) {
    const dateObj = parseSheetDate(row[1]);
    const monthNames = [
        "كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران",
        "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"
    ];
    const month = !dateObj ? "" : monthNames[dateObj.getMonth()];
    const year = !dateObj ? "" : dateObj.getFullYear();

    const rawRow = [
        row[0],     // Timestamp
        row[1],     // التاريخ
        row[2],     // الفرع
        row[3],     // الجنس
        row[4],     // نوع الحالة
        row[5],     // ملاحظات
        row[7] || "", // الفئة العمرية (index 6 in sheet / Col G)
        ""          // Status (index 7 in sheet / Col H)
    ];

    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "Cases_Raw_Data!A:H",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [rawRow] },
    });
}

export async function updateCase(id, updatedRow) {
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Cases_Raw_Data!A:J",
    });

    const rows = res.data.values || [];
    const rowIndex = rows.findIndex((r) => String(r[0]) === String(id));

    if (rowIndex === -1) throw new Error("Case not found");

    const dateObj = parseSheetDate(updatedRow[1]);
    const monthNames = [
        "كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران",
        "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"
    ];
    const month = !dateObj ? "" : monthNames[dateObj.getMonth()];
    const year = !dateObj ? "" : dateObj.getFullYear();

    // New Raw Format: [Timestamp, التاريخ, الفرع, الجنس, نوع الحالة, ملاحظات, الفئة العمرية, Status]
    const rawRow = [
        updatedRow[0],     // Timestamp
        updatedRow[1],     // التاريخ
        updatedRow[2],     // الفرع
        updatedRow[3],     // الجنس
        updatedRow[4],     // نوع الحالة
        updatedRow[5],     // ملاحظات
        updatedRow[10] || "", // الفئة العمرية (mapped index 10)
        updatedRow[9] || ""   // Status (mapped index 9)
    ];

    const sheetRowNumber = rowIndex + 1;

    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Cases_Raw_Data!A${sheetRowNumber}:H${sheetRowNumber}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
            values: [rawRow],
        },
    });
}

export async function deleteCase(id) {
    // Soft delete: Find row and set Status (column H) to "Deleted"
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Cases_Raw_Data!A:G",
    });

    const rows = res.data.values || [];
    const rowIndex = rows.findIndex((r) => String(r[0]) === String(id));

    if (rowIndex === -1) throw new Error("Case not found");

    const sheetRowNumber = rowIndex + 1; // 1-indexed

    // Only updating the Status column (H)
    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Cases_Raw_Data!H${sheetRowNumber}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
            values: [["Deleted"]],
        },
    });
}

// =====================
// FINANCIAL
// =====================
export async function getFinancialData() {
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Financial_Raw_Data!A2:R",
    });
    return res.data.values || [];
}

// =====================
// DONATIONS (RECEIVED)
// =====================
export async function getDonationsReceived() {
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Donations_Received!A2:P",
    });
    const rows = res.data.values || [];
    // Filter out soft-deleted
    return rows.filter(r => r[15] !== "Deleted");
}

export async function addDonationReceived(row) {
    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "Donations_Received!A:O",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [row] },
    });
}

export async function getDonationsSpent() {
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Donations_Spent!A2:P",
    });
    const rows = res.data.values || [];
    // Filter out soft-deleted
    return rows.filter(r => r[15] !== "Deleted");
}

export async function addDonationSpent(row) {
    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "Donations_Spent!A:O",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [row] },
    });
}

// =====================
// GENERIC DONATION UPDATE/DELETE
// =====================
async function getSheetIdAndRangeByType(type) {
    // Return Sheet Name and Range based on type
    if (type === "صرف") {
        return { sheetName: "Donations_Spent", range: "Donations_Spent!A2:O" };
    }
    return { sheetName: "Donations_Received", range: "Donations_Received!A2:O" };
}

export async function updateDonation(id, newData, type) {
    const { sheetName, range } = await getSheetIdAndRangeByType(type);

    // 1. Get all data
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: range,
    });

    const rows = res.data.values || [];
    const rowIndex = rows.findIndex(r => r[0] === String(id)); // Assuming ID is at index 0

    if (rowIndex === -1) throw new Error("Donation not found");

    // 2. Update specific row (A is column 0, O is column 14)
    // Row in sheet is (rowIndex + 2) because we started at A2 (index 0 corresponds to A2)
    const sheetRowNumber = rowIndex + 2;
    const updateRange = `${sheetName}!A${sheetRowNumber}`;
    // We update the whole row starting from A

    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: updateRange,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [newData] },
    });
}

export async function deleteDonation(id, type) {
    const { sheetName, range } = await getSheetIdAndRangeByType(type);

    // 1. Get all data to find index
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: range,
    });

    const rows = res.data.values || [];
    const rowIndex = rows.findIndex(r => r[0] === String(id));

    if (rowIndex === -1) throw new Error("Donation not found");

    // 2. Resolve numeric sheetId for Hard Delete
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheetObj = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
    if (!sheetObj) throw new Error(`Google Sheet tab '${sheetName}' not found`);

    const sheetId = sheetObj.properties.sheetId;

    // 3. Hard Delete (remove the row completely)
    // Note: Since range is A2:O, rowIndex 0 is row 2, which requires startIndex=1 in the API (0-based)
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
            requests: [
                {
                    deleteDimension: {
                        range: {
                            sheetId: sheetId,
                            dimension: "ROWS",
                            startIndex: rowIndex + 1,
                            endIndex: rowIndex + 2,
                        }
                    }
                }
            ]
        }
    });

    console.log(`Hard deleted donation ${id} from ${sheetName} at row ${rowIndex + 2}`);
}
// =====================
// ASSETS
// =====================
export async function getAssets() {
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Assets!A2:O",
    });
    return res.data.values || [];
}

export async function addAsset(row) {
    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "Assets!A:N",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [row] },
    });
}

export async function updateAsset(id, updatedRow) {
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Assets!A:A",
    });
    const rows = res.data.values || [];
    const rowIndex = rows.findIndex((r) => r[0] == id);
    if (rowIndex === -1) throw new Error("Asset not found");
    const sheetRowNumber = rowIndex + 1;
    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Assets!A${sheetRowNumber}:N${sheetRowNumber}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [updatedRow] },
    });
}

export async function deleteAsset(id) {
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Assets!A:A",
    });
    const rows = res.data.values || [];
    const rowIndex = rows.findIndex((r) => r[0] == id);
    if (rowIndex === -1) throw new Error("Asset not found");
    const sheetRowNumber = rowIndex + 1;

    // To delete a row in Google Sheets API v4, we use batchUpdate with deleteDimension
    // However, a simpler way often used in these scripts is to clear the row or use batchUpdate
    // Let's use batchUpdate to actually release the space
    const sheetRes = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
    });
    const assetSheet = sheetRes.data.sheets.find(s => s.properties.title === "Assets");
    const sheetId = assetSheet.properties.sheetId;

    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
            requests: [
                {
                    deleteDimension: {
                        range: {
                            sheetId: sheetId,
                            dimension: "ROWS",
                            startIndex: rowIndex,
                            endIndex: rowIndex + 1,
                        },
                    },
                },
            ],
        },
    });
}

// =======================================================
// MEDICAL TEAM
// Sheet: Medical_Team
// =======================================================

export async function getMedicalTeam() {
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Medical_Team!A2:N",
    });

    const data = (response.data.values || []).map(row => {
        const padded = [...row];
        while (padded.length < 14) padded.push("");
        return padded;
    });
    console.log("Fetched Medical Team Row Count:", data.length);
    return data;
}

export async function addMedicalTeamMember(row) {
    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "Medical_Team!A:N",
        valueInputOption: "USER_ENTERED",
        requestBody: {
            values: [row],
        },
    });
}
export async function updateMedicalTeamMember(id, updatedRow) {
    // 1. Get all IDs to find the row index
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Medical_Team!A:A",
    });

    const rows = res.data.values || [];
    const rowIndex = rows.findIndex((r) => r[0] == id); // Index 0 is the ID

    if (rowIndex === -1) throw new Error("Member not found");

    const sheetRowNumber = rowIndex + 1; // 1-indexed

    console.log(`Updating Medical Member ID: ${id} at row ${sheetRowNumber}`);
    console.log("Updated Row Data length:", updatedRow.length);
    console.log("Image URL being saved:", updatedRow[13]);

    // 2. Update the specific row
    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Medical_Team!A${sheetRowNumber}:N${sheetRowNumber}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
            values: [updatedRow],
        },
    });
}

// =======================================================
// INVENTORY
// Sheet: Inventory
// =======================================================

export async function getInventory() {
    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "Inventory!A2:G",
        });
        return res.data.values || [];
    } catch (e) {
        console.error("Error fetching inventory:", e.message);
        return [];
    }
}

export async function updateBranchInventory(branch, inventoryObj) {
    let rows = [];
    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "Inventory!A:G",
        });
        rows = res.data.values || [];
    } catch (e) {
        console.error("Inventory check error:", e.message);
    }

    const rowIndex = rows.findIndex(r => r[0] === branch);

    const rowToSave = [
        branch,
        inventoryObj["كراسي معاقين"] || 0,
        inventoryObj["ووكر متحرك"] || 0,
        inventoryObj["فرشات هوا"] || 0,
        inventoryObj["تخوت مرضى"] || 0,
        inventoryObj["جهاز أوكسجين"] || 0,
        inventoryObj["عكازات"] || 0
    ];

    if (rowIndex === -1) {
        // Appending new branch
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: "Inventory!A:G",
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [rowToSave] },
        });
    } else {
        // Updating existing branch
        const sheetRowNumber = rowIndex + 1;
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `Inventory!A${sheetRowNumber}:G${sheetRowNumber}`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [rowToSave] },
        });
    }
}
