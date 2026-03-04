import jsPDF from "jspdf";
import "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import logoPng from "../assets/main_logo.png"; // We'll convert this to Base64 to embed it

/**
 * Helper to convert an image URL or import into a Base64 string for PDF/Excel.
 */
async function getBase64ImageFromUrl(imageUrl) {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => resolve(reader.result), false);
        reader.addEventListener("error", (err) => reject(err), false);
        reader.readAsDataURL(blob);
    });
}

/**
 * Standardized PDF Export
 * @param {string} title Name of the report (e.g., "التقرير الشهري للحالات")
 * @param {string} subtitle The period (e.g., "شهر كانون الثاني سنة 2026")
 * @param {string} medicName User's name generating the report
 * @param {Array} headers Columns (e.g., [['التاريخ', 'الفرع', ...]])
 * @param {Array} rows Data rows (e.g., [[c[1], c[4], ...]])
 * @param {string} filename Output file name
 */
export async function exportStyledPDF(title, subtitle, medicName, headers, rows, filename) {
    const doc = new jsPDF();

    // 1. Add Logo if reachable
    try {
        const logoBase64 = await getBase64ImageFromUrl(logoPng);
        // doc.addImage(base64, format, x, y, width, height)
        doc.addImage(logoBase64, "PNG", 10, 10, 30, 30);
    } catch (e) {
        console.warn("Could not load logo for PDF", e);
    }

    // 2. Add Header Texts (RTL adjusted roughly)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    // Since jsPDF default standard fonts don't render Arabic perfectly without a custom font file,
    // we use a generic font for now. If you have "Amiri" loaded, jspdf-autotable will use it.
    doc.text(title, 200, 20, { align: 'right' });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`التاريخ والفترة: ${subtitle}`, 200, 28, { align: 'right' });
    doc.text(`إعداد المسعف: ${medicName}`, 200, 36, { align: 'right' });

    // 3. Add Table
    doc.autoTable({
        head: headers,
        body: rows,
        startY: 45,
        styles: { font: "Amiri", direction: 'rtl', halign: 'center' },
        headStyles: { fillColor: [194, 33, 41] }, // Al-Shifaa Red (#C22129)
        margin: { top: 45 },
    });

    doc.save(filename);
}

/**
 * Standardized Excel Export using ExcelJS
 * @param {string} title Name of the report 
 * @param {string} subtitle The period
 * @param {string} medicName User's name generating the report
 * @param {Array} headers Columns (e.g., ['التاريخ', 'الفرع', ...])
 * @param {Array} rows Object mapping or array of arrays based on preference. Here we expect an array of arrays matching headers.
 * @param {string} filename Output file name
 */
export async function exportStyledExcel(title, subtitle, medicName, headers, rows, filename) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(title, { views: [{ rightToLeft: true }] }); // Set standard RTL

    // 1. Add Logo
    try {
        const logoBase64 = await getBase64ImageFromUrl(logoPng);
        const imageId = workbook.addImage({
            base64: logoBase64,
            extension: 'png',
        });

        // Place logo in top-left (A1) extending a few cells
        sheet.addImage(imageId, {
            tl: { col: 0, row: 0 },
            ext: { width: 100, height: 100 }
        });
    } catch (e) {
        console.warn("Could not load logo for Excel", e);
    }

    // Adjust row height for the logo space (Make rows 1-3 taller or just add empty space)
    sheet.getRow(1).height = 30;
    sheet.getRow(2).height = 30;
    sheet.getRow(3).height = 30;

    // 2. Add Headers/Metadata
    // Placing metadata around cell D1, D2, D3 so it doesn't overlap the logo at A1
    sheet.mergeCells('D1', 'H1');
    const titleCell = sheet.getCell('D1');
    titleCell.value = title;
    titleCell.font = { size: 16, bold: true, color: { argb: 'FFC22129' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'right' };

    sheet.mergeCells('D2', 'H2');
    const subCell = sheet.getCell('D2');
    subCell.value = `التاريخ والفترة: ${subtitle}`;
    subCell.font = { size: 12, bold: true };
    subCell.alignment = { vertical: 'middle', horizontal: 'right' };

    sheet.mergeCells('D3', 'H3');
    const medicCell = sheet.getCell('D3');
    medicCell.value = `إعداد المسعف: ${medicName}`;
    medicCell.font = { size: 12, italic: true };
    medicCell.alignment = { vertical: 'middle', horizontal: 'right' };

    // Space before table
    sheet.addRow([]);
    sheet.addRow([]);

    // 3. Add Table Headers
    const headerRow = sheet.addRow(headers);
    headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFC22129' }, // Al-Shifaa Red
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // 4. Add Data
    rows.forEach(rowData => {
        const dataRow = sheet.addRow(rowData);
        dataRow.eachCell((cell) => {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
    });

    // Handle column widths automatically
    sheet.columns.forEach(column => {
        column.width = 20;
    });

    // Generate output
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, filename);
}
