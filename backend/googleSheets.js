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
        // 1. Fetch from standard Cases sheet
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "Cases!A2:I",
        });
        const standardCases = res.data.values || [];

        // 2. Fetch from Cases_Raw_Data (Direct Form Responses)
        const rawRes = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "Cases_Raw_Data!A2:H",
        });
        const rawEntries = rawRes.data.values || [];

        // 3. Map Raw Entries to standard 9-column format
        // Raw: [Timestamp, التاريخ, الفرع, الجنس, نوع_الحالة, الفريق, ملاحظات]
        const mappedRaw = rawEntries.map(r => [
            r[0],      // case_id (Timestamp)
            r[1],      // التاريخ
            r[2],      // الفرع
            r[3],      // الجنس
            r[4],      // نوع_الحالة
            "",        // الوصف
            r[5],      // الفريق
            r[6] || "",// ملاحظات
            r[0]       // created_at
        ]);

        // 4. Merge and Deduplicate by ID (first column)
        const allCasesMap = new Map();

        // Add standard cases first
        standardCases.forEach(c => {
            if (c[0]) allCasesMap.set(String(c[0]), c);
        });

        // Add raw cases if they don't exist (prevents duplicates if sync happened)
        mappedRaw.forEach(r => {
            const id = String(r[0]);
            if (id && !allCasesMap.has(id)) {
                allCasesMap.set(id, r);
            }
        });

        const merged = Array.from(allCasesMap.values());

        // 5. Sort by date (descending)
        return merged.sort((a, b) => new Date(b[1]) - new Date(a[1]) || (b[0] > a[0] ? 1 : -1));
    } catch (error) {
        console.error("Error in getCases:", error.message);
        return [];
    }
}

export async function addCase(row) {
    // Write to Cases sheet as the primary storage
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
