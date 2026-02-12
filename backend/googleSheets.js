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
export async function getCases() {
    try {
        // 1. Fetch from standard Cases sheet (Manual Entries)
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "Cases!A2:I",
        });
        const standardCases = res.data.values || [];

        // 2. Fetch from Cases_Raw_Data (Direct Google Form Responses)
        // Order: [Timestamp, التاريخ, الفرع, الجنس, نوع_الحالة, الفريق, ملاحظات]
        const rawRes = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "Cases_Raw_Data!A2:H",
        });
        const rawEntries = rawRes.data.values || [];

        // 3. Map Raw Entries to the standard format used by the App
        // Standard Columns Expected by Frontend:
        // [0: ID/Timestamp, 1: التاريخ, 2: الفرع, 3: الجنس, 4: نوع_الحالة, 5: الوصف, 6: الفريق, 7: ملاحظات, 8: CreatedAt]
        const mappedRaw = rawEntries.map(r => [
            r[0],       // ID (Timestamp)
            r[1],       // التاريخ
            r[2],       // الفرع
            r[3],       // الجنس
            r[4],       // نوع_الحالة
            "",         // الوصف (Form doesn't have this field)
            r[5],       // الفريق
            r[6] || "", // ملاحظات
            r[0],       // CreatedAt
        ]);

        // 4. Merge samples. Note: We use a Set to avoid duplicates if data was already synced by a script.
        const allCases = [...standardCases];
        const existingIds = new Set(standardCases.map(c => String(c[0])));

        // Add raw entries if they don't already exist in the 'Cases' sheet
        mappedRaw.forEach(r => {
            if (!existingIds.has(String(r[0]))) {
                allCases.push(r);
            }
        });

        // Sort by date (descending) so newest are always first
        return allCases.sort((a, b) => new Date(b[1]) - new Date(a[1]));
    } catch (error) {
        console.error("Error in getCases:", error.message);
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "Cases!A2:I",
        });
        return res.data.values || [];
    }
}

export async function addCase(row) {
    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "Cases!A:I",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [row] },
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
