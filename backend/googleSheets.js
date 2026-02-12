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
        // Fetch only from Cases_Raw_Data (Direct Form Responses & App Additions)
        // Expected Order from Sheet: [Timestamp, التاريخ, الفرع, الجنس, نوع_الحالة, الفريق, ملاحظات]
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "Cases_Raw_Data!A2:H", // fetching up to H just in case
        });
        const entries = res.data.values || [];

        // Map to standard format used by Frontend:
        // [0: ID, 1: التاريخ, 2: الفرع, 3: الجنس, 4: نوع_الحالة, 5: الوصف, 6: الفريق, 7: ملاحظات, 8: CreatedAt]
        const mapped = entries.map(r => [
            r[0],       // ID (Timestamp)
            r[1],       // التاريخ
            r[2],       // الفرع
            r[3],       // الجنس
            r[4],       // نوع_الحالة
            "",         // الوصف (Empty for now)
            r[5],       // الفريق
            r[6] || "", // ملاحظات
            r[0],       // CreatedAt
        ]);

        // Sort by date (descending) so newest are always first
        // We use the 'التاريخ' (r[1]) or 'Timestamp' (r[0]) for sorting
        return mapped.sort((a, b) => new Date(b[1]) - new Date(a[1]) || b[0] - a[0]);
    } catch (error) {
        console.error("Error in getCases:", error.message);
        return [];
    }
}

export async function addCase(row) {
    // Write only to Cases_Raw_Data to keep one source of truth
    // Frontend provides: [Date.now(), التاريخ, الفرع, الجنس, نوع_الحالة, الوصف, الفريق, ملاحظات, CreatedAt]
    // Sheet expects: [Timestamp, التاريخ, الفرع, الجنس, نوع_الحالة, الفريق, ملاحظات]
    const rawRow = [
        row[0], // Timestamp
        row[1], // التاريخ
        row[2], // الفرع
        row[3], // الجنس
        row[4], // نوع_الحالة
        row[6], // الفريق
        row[7], // ملاحظات
    ];

    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "Cases_Raw_Data!A:G",
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
// DONATIONS
// =====================
export async function getDonations() {
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Donations!A2:O",
    });
    return res.data.values || [];
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

// =======================================================
// MEDICAL TEAM
// Sheet: Medical_Team
// =======================================================

export async function getMedicalTeam() {
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Medical_Team!A2:M",
    });

    return response.data.values || [];
}

export async function addMedicalTeamMember(row) {
    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "Medical_Team!A:M",
        valueInputOption: "USER_ENTERED",
        requestBody: {
            values: [row],
        },
    });
}
