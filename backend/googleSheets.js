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
        // Headers: [Timestamp, التاريخ, الشهر, السنة, الفرع, الجنس, نوع_الحالة, ملاحظات]
        const rawRes = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "Cases_Raw_Data!A2:H",
        });
        const rawEntries = rawRes.data.values || [];

        // 3. Identify Missing Rows
        const existingIds = new Set(standardCases.map(c => String(c[0])));
        const missingRowsToMove = [];
        const repairedRows = [...standardCases];

        rawEntries.forEach(r => {
            const id = String(r[0]);
            if (id && !existingIds.has(id)) {
                // Map Raw to Standard: [ID, Date, Branch, Gender, Type, Desc, Team, Notes, CreatedAt]
                const mappedRow = [
                    r[0],      // ID (Timestamp)
                    r[1],      // التاريخ
                    r[4],      // الفرع
                    r[5],      // الجنس
                    r[6],      // نوع الحالة
                    "",        // الوصف
                    "",        // الفريق
                    r[7] || "",// ملاحظات
                    r[0]       // CreatedAt
                ];
                missingRowsToMove.push(mappedRow);
                repairedRows.push(mappedRow);
            }
        });

        // 4. Self-Healing: If missing rows found, append them to 'Cases' sheet automatically
        if (missingRowsToMove.length > 0) {
            console.log(`Auto-Sync: Moving ${missingRowsToMove.length} rows to Cases sheet.`);
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: "Cases!A:I",
                valueInputOption: "USER_ENTERED",
                requestBody: { values: missingRowsToMove },
            });
        }

        // 5. Sort by date (descending)
        return repairedRows.sort((a, b) => new Date(b[1]) - new Date(a[1]) || (b[0] > a[0] ? 1 : -1));
    } catch (error) {
        console.error("Error in getCases:", error.message);
        return [];
    }
}

export async function addCase(row) {
    // Write directly to Cases (the self-healing will check Raw if needed later)
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
