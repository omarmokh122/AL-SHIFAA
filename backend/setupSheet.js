import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

const creds = process.env.GOOGLE_SHEETS_CREDENTIALS
    ? JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS)
    : null;

const auth = new google.auth.GoogleAuth({
    keyFile: creds ? undefined : "credentials.json",
    credentials: creds || undefined,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });
const SPREADSHEET_ID = "17gx7mbIzuPJfEOhNj0W9ah6SFd7mf6dyQnD2cZIhCbM";

async function run() {
    try {
        const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
        const existingSheet = meta.data.sheets.find((s) => s.properties.title === "Inventory");

        if (!existingSheet) {
            console.log("Sheet 'Inventory' not found. Creating...");
            const addSheetResponse = await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                requestBody: {
                    requests: [{
                        addSheet: {
                            properties: { title: "Inventory" }
                        }
                    }]
                }
            });
            console.log("Sheet created.");

            console.log("Setting headers...");
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: "Inventory!A1:G1",
                valueInputOption: "USER_ENTERED",
                requestBody: {
                    values: [["الفرع", "كراسي معاقين", "ووكر متحرك", "فرشات هوا", "تخوت مرضى", "جهاز أوكسجين", "عكازات"]]
                }
            });
            console.log("Headers set successfully.");
        } else {
            console.log("Sheet 'Inventory' already exists.");
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}

run();
