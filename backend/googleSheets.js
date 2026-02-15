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
export async function getCases() {
    try {
        // Fetch exclusively from Cases_Raw_Data (Direct Form Responses)
        // Headers: [0: Timestamp, 1: التاريخ, 2: الشهر, 3: السنة, 4: الفرع, 5: الجنس, 6: نوع الحالة, 7: ملاحظات]
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "Cases_Raw_Data!A2:H",
        });
        const entries = res.data.values || [];

        // Map to standard 9-column format used by the App
        // Standard: [ID, Date, Branch, Gender, Type, Description, Team, Notes, CreatedAt]
        const mapped = entries.map(r => [
            r[0],       // ID (Timestamp)
            r[1],       // التاريخ
            r[4],       // الفرع
            r[5],       // الجنس
            r[6],       // نوع الحالة
            "",         // الوصف
            "",         // الفريق
            r[7] || "", // ملاحظات
            r[0],       // CreatedAt
        ]);

        // Sort by date (descending)
        return mapped.sort((a, b) => new Date(b[1]) - new Date(a[1]) || (b[0] > a[0] ? 1 : -1));
    } catch (error) {
        console.error("Error in getCases:", error.message);
        return [];
    }
}

export async function addCase(row) {
    // Write only to Cases_Raw_Data to maintain one source of truth
    // Frontend provides: [Date.now(), التاريخ, الفرع, الجنس, نوع_الحالة, الوصف, الفريق, ملاحظات, CreatedAt]
    // Raw Sheet expects: [Timestamp, التاريخ, الشهر, السنة, الفرع, الجنس, نوع الحالة, ملاحظات]

    const dateObj = new Date(row[1]);
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();

    const rawRow = [
        row[0],     // Timestamp
        row[1],     // التاريخ
        month,      // الشهر
        year,       // السنة
        row[2],     // الفرع
        row[3],     // الجنس
        row[4],     // نوع الحالة
        row[7],     // ملاحظات
    ];

    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "Cases_Raw_Data!A:H",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [rawRow] },
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
        range: "Donations_Received!A2:O",
    });
    return res.data.values || [];
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
        range: "Donations_Spent!A2:O",
    });
    return res.data.values || [];
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


    // Fetch sheet metadata to find sheetId
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheet = meta.data.sheets.find((s) => s.properties.title === sheetName);
    if (!sheet) throw new Error("Sheet not found");
    const sheetId = sheet.properties.sheetId;

    // Row index for batchUpdate is 0-based from the very first row.
    // Our data starts at A2.
    // rowIndex 0 (from valyes.get A2:O) -> corresponds to Sheet Row 2 -> Index 1.
    const sheetRowIndex = rowIndex + 1;

    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
            requests: [{
                deleteDimension: {
                    range: {
                        sheetId: sheetId,
                        dimension: "ROWS",
                        startIndex: sheetRowIndex,
                        endIndex: sheetRowIndex + 1
                    }
                }
            }]
        }
    });
}

export async function addDonationReceived(row) {
    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "Donations_Received!A:O",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [row] },
    });
}

// =====================
// DONATIONS (SPENT - EXPENSES)
// =====================
export async function getDonationsSpent() {
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Donations_Spent!A2:O",
    });
    return res.data.values || [];
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
