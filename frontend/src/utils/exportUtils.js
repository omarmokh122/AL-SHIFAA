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
 * @param {Array} summaryData Optional summary data (e.g., [{label: "Total", value: 10}])
 */
export async function exportStyledPDF(title, subtitle, medicName, headers, rows, filename, summaryData = []) {
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

    if (summaryData && summaryData.length > 0) {
        const finalY = doc.lastAutoTable.finalY + 10;

        // Use autoTable for the summary to guarantee Arabic text rendering support
        doc.autoTable({
            body: summaryData.map(item => [item.label, item.value]),
            startY: finalY,
            styles: { font: "Amiri", direction: 'rtl', halign: 'right', fontSize: 12, fontStyle: 'bold' },
            theme: 'plain', // No grid or backgrounds
            tableWidth: 80, // Keep it compact on the right side
            margin: { right: 14 },
        });
    }

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
 * @param {Array} summaryData Optional summary data (e.g., [{label: "Total", value: 10}])
 */
export async function exportStyledExcel(title, subtitle, medicName, headers, rows, filename, summaryData = []) {
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

    // 5. Add Summary Data
    if (summaryData && summaryData.length > 0) {
        sheet.addRow([]); // empty row
        summaryData.forEach(item => {
            const sumRow = sheet.addRow([item.label, item.value]);
            sumRow.getCell(1).font = { bold: true };
            sumRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
            sumRow.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
        });
    }

    // Generate output
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, filename);
}

export async function exportYearlyCasesTemplateExcel(year, branch, cases, filename) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`تقرير ${year}`, { views: [{ rightToLeft: true }] });

    // 1. Columns Setup
    sheet.columns = [
        { width: 18 }, // A: Category
        { width: 25 }, // B: Sub-category
        { width: 8 },  // C: ك2 (1)
        { width: 8 },  // D: شباط (2)
        { width: 8 },  // E: اذار (3)
        { width: 8 },  // F: نيسان (4)
        { width: 8 },  // G: ايار (5)
        { width: 8 },  // H: حزيران (6)
        { width: 8 },  // I: تموز (7)
        { width: 8 },  // J: اب (8)
        { width: 8 },  // K: ايلول (9)
        { width: 8 },  // L: ت1 (10)
        { width: 8 },  // M: ت2 (11)
        { width: 8 }   // N: ك1 (12)
    ];

    // Array of Arabic month names as stored in the DB
    const monthNamesDB = [
        "كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران",
        "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"
    ];
    // Short names for header
    const shortMonths = [
        "ك2", "شباط", "اذار", "نيسان", "ايار", "حزيران",
        "تموز", "اب", "ايلول", "ت1", "ت2", "ك1"
    ];

    // Helper to calculate stats per month
    // cases format: [id, date, month, year, branch, gender, type, notes]
    // Filter cases for the given year and validate branch
    const yearlyCases = cases.filter(c => {
        if (String(c[3]) !== String(year)) return false;
        if (branch === "كل الفروع" || branch === "All") return true;
        return (c[4] || "").includes(branch);
    });

    const getCount = (monthIdx, filterFn) => {
        return yearlyCases.filter(c => c[2] === monthNamesDB[monthIdx] && filterFn(c)).length;
    };

    const getMonthTotals = (filterFn) => {
        return shortMonths.map((_, i) => getCount(i, filterFn));
    };

    const totalsByMonth = getMonthTotals(() => true);
    // highlight rule: if a month has > 0 cases, we might highlight its column.
    const highlightCols = totalsByMonth.map((t, idx) => t > 0);

    // Style helpers
    const setBorders = (cell) => {
        cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
        };
    };
    const centerAlign = (cell) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
    };
    const boldFont = (cell) => {
        cell.font = { bold: true, size: 12 };
    };

    // 2. Header Area
    // Row 1 & 2 & 3
    sheet.getRow(1).height = 25;
    sheet.getRow(2).height = 25;
    sheet.getRow(3).height = 25;

    // Top Right texts
    const titleCell1 = sheet.getCell('A1');
    titleCell1.value = "الشِفاء";
    titleCell1.font = { size: 22, bold: true };
    titleCell1.alignment = { horizontal: 'right', vertical: 'bottom' };

    const titleCell2 = sheet.getCell('A2');
    titleCell2.value = "للخدمات الطبية والإنسانية";
    titleCell2.font = { size: 14, bold: true };
    titleCell2.alignment = { horizontal: 'right', vertical: 'top' };
    sheet.mergeCells('A1:C1');
    sheet.mergeCells('A2:C2');

    // Add Logo to top Left (M1)
    try {
        const logoBase64 = await getBase64ImageFromUrl(logoPng);
        const imageId = workbook.addImage({ base64: logoBase64, extension: 'png' });
        sheet.addImage(imageId, {
            tl: { col: 12, row: 0 },
            ext: { width: 80, height: 80 }
        });
    } catch (e) { console.warn("Logo error", e); }

    // Center Title "الحالات الاسعافية خلال العام YYYY"
    sheet.mergeCells('E3:J3');
    const mainTitle = sheet.getCell('E3');
    mainTitle.value = `الحالات الاسعافية خلال العام ${year}`;
    mainTitle.font = { size: 14, bold: true };
    centerAlign(mainTitle);

    // Determine Arabic texts for Center and Location
    let centerText = "تعلبايا";
    let locationText = "البقاع الأوسط";
    if (branch.includes("بعلبك") && branch.includes("البقاع الأوسط") || branch === "كل الفروع" || branch === "All") {
        centerText = "تعلبايا و بعلبك";
        locationText = "البقاع الأوسط و بعلبك";
    } else if (branch.includes("بعلبك")) {
        centerText = "بعلبك";
        locationText = "بعلبك";
    } else if (branch.includes("البقاع الأوسط")) {
        centerText = "تعلبايا";
        locationText = "البقاع الأوسط";
    } else if (branch) {
        // Fallback to whatever string was passed if it's not the standard two
        centerText = branch;
        locationText = branch;
    }

    // Row 4: المركز
    sheet.mergeCells('A4:B4');
    const r4c1 = sheet.getCell('A4'); r4c1.value = "المركز"; centerAlign(r4c1); boldFont(r4c1); setBorders(r4c1);
    sheet.mergeCells('C4:N4');
    const r4c2 = sheet.getCell('C4'); r4c2.value = centerText; centerAlign(r4c2); setBorders(r4c2);

    // Row 5: المكان
    sheet.mergeCells('A5:B5');
    const r5c1 = sheet.getCell('A5'); r5c1.value = "المكان"; centerAlign(r5c1); boldFont(r5c1); setBorders(r5c1);
    sheet.mergeCells('C5:N5');
    const r5c2 = sheet.getCell('C5'); r5c2.value = locationText; centerAlign(r5c2); setBorders(r5c2);

    // Row 6: Months Header
    sheet.mergeCells('A6:B6');
    const r6c1 = sheet.getCell('A6'); r6c1.value = "الشهر"; centerAlign(r6c1); boldFont(r6c1); setBorders(r6c1);
    r6c1.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    r6c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC22129' } };

    shortMonths.forEach((m, idx) => {
        const cell = sheet.getCell(6, 3 + idx);
        cell.value = m;
        centerAlign(cell); boldFont(cell); setBorders(cell);
        cell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC22129' } };
    });

    // Row 7: Total Cases
    sheet.mergeCells('A7:B7');
    const r7c1 = sheet.getCell('A7'); r7c1.value = "اجمالي عدد الحالات"; centerAlign(r7c1); boldFont(r7c1); setBorders(r7c1);
    totalsByMonth.forEach((val, idx) => {
        const cell = sheet.getCell(7, 3 + idx);
        cell.value = val;
        centerAlign(cell); boldFont(cell); setBorders(cell);
        if (highlightCols[idx]) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F6F8' } };
    });

    // Row 8: Red Separator
    const r8 = sheet.getRow(8);
    r8.height = 10;
    for (let c = 1; c <= 14; c++) {
        const cell = sheet.getCell(8, c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC22129' } }; // Red
        setBorders(cell);
    }

    // Row 9 & 10: Gender (ذكر, انثى)
    sheet.mergeCells('A9:A10');
    const r9c1 = sheet.getCell('A9'); r9c1.value = "الجنس"; centerAlign(r9c1); boldFont(r9c1); setBorders(r9c1);
    sheet.getCell('A10').border = { bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };

    const maleTotals = getMonthTotals((c) => c[5] === "ذكر");
    const r9c2 = sheet.getCell('B9'); r9c2.value = "ذكر"; centerAlign(r9c2); boldFont(r9c2); setBorders(r9c2);
    maleTotals.forEach((val, idx) => {
        const cell = sheet.getCell(9, 3 + idx); cell.value = val; centerAlign(cell); boldFont(cell); setBorders(cell);
        if (highlightCols[idx]) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F6F8' } };
    });

    const femaleTotals = getMonthTotals((c) => c[5] === "أنثى" || c[5] === "انثى");
    const r10c2 = sheet.getCell('B10'); r10c2.value = "انثى"; centerAlign(r10c2); boldFont(r10c2); setBorders(r10c2);
    femaleTotals.forEach((val, idx) => {
        const cell = sheet.getCell(10, 3 + idx); cell.value = val; centerAlign(cell); boldFont(cell); setBorders(cell);
        if (highlightCols[idx]) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F6F8' } };
    });

    // Row 11: Red Separator
    const r11 = sheet.getRow(11);
    r11.height = 10;
    for (let c = 1; c <= 14; c++) {
        const cell = sheet.getCell(11, c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC22129' } };
        setBorders(cell);
    }

    // Row 12+: Case Types
    const CASE_TYPES = [
        "كسور", "حادث", "أمراض قلبية", "جهاز تنفسي", "حالات طبية", "جراحة", "جثة", "حروق", "جروح", "كورونا", "متابعة",
        "دفاع مدني", "حالات عصبية", "حالات طارئة", "نقل إصابات وجرحى", "نقل شهداء", "علاج ميداني", "تأمين نازحين (عوائل)",
        "توزيع أدوية", "تأمين معدات طبية", "توزيع حليب", "توزيع حفاضات", "تلبية استهدافات",
        "انتخابات – نقل ناخبين من ذوي الاحتياجات الخاصة", "متابعة منزلية للمرضى"
    ];

    sheet.mergeCells(`A12:A${11 + CASE_TYPES.length}`);
    const r12c1 = sheet.getCell('A12'); r12c1.value = "نوع الحالات"; centerAlign(r12c1); boldFont(r12c1); setBorders(r12c1);

    // ensure borders for merged area
    for (let i = 12; i <= 11 + CASE_TYPES.length; i++) {
        sheet.getCell(`A${i}`).border = { left: { style: 'thin' }, right: { style: 'thin' }, top: (i === 12 ? { style: 'thin' } : undefined), bottom: (i === 11 + CASE_TYPES.length ? { style: 'thin' } : undefined) };
    }

    CASE_TYPES.forEach((type, tIdx) => {
        const rIdx = 12 + tIdx;
        const c2 = sheet.getCell(rIdx, 2);
        c2.value = type; centerAlign(c2); boldFont(c2); setBorders(c2);

        const typeTotals = getMonthTotals((c) => c[6] === type);
        typeTotals.forEach((val, idx) => {
            const cell = sheet.getCell(rIdx, 3 + idx);
            cell.value = val; centerAlign(cell); boldFont(cell); setBorders(cell);
            if (highlightCols[idx]) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F6F8' } };
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, filename);
}

export async function exportMonthlyCasesTemplateExcel(year, month, branch, cases, filename) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`تقرير ${month} ${year}`, { views: [{ rightToLeft: true }] });

    // 1. Columns Setup (Narrower for monthly)
    sheet.columns = [
        { width: 30 }, // A: Category
        { width: 40 }, // B: Sub-category
        { width: 15 }  // C: Month Count
    ];

    // Filter cases for the given year and month, and validate branch
    const monthlyCases = cases.filter(c => {
        if (String(c[3]) !== String(year) || c[2] !== month) return false;
        if (branch === "كل الفروع" || branch === "All") return true;
        return (c[4] || "").includes(branch);
    });
    const getCount = (filterFn) => monthlyCases.filter(filterFn).length;
    const totalCases = monthlyCases.length;

    // Style helpers
    const setBorders = (cell) => {
        cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
        };
    };
    const centerAlign = (cell) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
    };
    const boldFont = (cell) => {
        cell.font = { bold: true, size: 12 };
    };

    // 2. Header Area
    sheet.getRow(1).height = 25;
    sheet.getRow(2).height = 25;
    sheet.getRow(3).height = 25;

    // Top Right texts
    const titleCell1 = sheet.getCell('A1');
    titleCell1.value = "الشِفاء";
    titleCell1.font = { size: 22, bold: true };
    titleCell1.alignment = { horizontal: 'right', vertical: 'bottom' };

    const titleCell2 = sheet.getCell('A2');
    titleCell2.value = "للخدمات الطبية والإنسانية";
    titleCell2.font = { size: 14, bold: true };
    titleCell2.alignment = { horizontal: 'right', vertical: 'top' };
    sheet.mergeCells('A1:B1');
    sheet.mergeCells('A2:B2');

    // Add Logo to top Left (C1)
    try {
        const logoBase64 = await getBase64ImageFromUrl(logoPng);
        const imageId = workbook.addImage({ base64: logoBase64, extension: 'png' });
        sheet.addImage(imageId, {
            tl: { col: 2, row: 0 },
            ext: { width: 80, height: 80 }
        });
    } catch (e) { console.warn("Logo error", e); }

    // Center Title 
    sheet.mergeCells('A3:C3');
    const mainTitle = sheet.getCell('A3');
    mainTitle.value = `الحالات الاسعافية خلال شهر ${month} ${year}`;
    mainTitle.font = { size: 14, bold: true };
    centerAlign(mainTitle);

    // Determine Arabic texts for Center and Location
    let centerText = "تعلبايا";
    let locationText = "البقاع الأوسط";
    if (branch.includes("بعلبك") && branch.includes("البقاع الأوسط") || branch === "كل الفروع" || branch === "All") {
        centerText = "تعلبايا و بعلبك";
        locationText = "البقاع الأوسط و بعلبك";
    } else if (branch.includes("بعلبك")) {
        centerText = "بعلبك";
        locationText = "بعلبك";
    } else if (branch.includes("البقاع الأوسط")) {
        centerText = "تعلبايا";
        locationText = "البقاع الأوسط";
    } else if (branch) {
        // Fallback
        centerText = branch;
        locationText = branch;
    }

    // Row 4: المركز
    sheet.mergeCells('A4:B4');
    const r4c1 = sheet.getCell('A4'); r4c1.value = "المركز"; centerAlign(r4c1); boldFont(r4c1); setBorders(r4c1);
    const r4c2 = sheet.getCell('C4'); r4c2.value = centerText; centerAlign(r4c2); setBorders(r4c2);

    // Row 5: المكان
    sheet.mergeCells('A5:B5');
    const r5c1 = sheet.getCell('A5'); r5c1.value = "المكان"; centerAlign(r5c1); boldFont(r5c1); setBorders(r5c1);
    const r5c2 = sheet.getCell('C5'); r5c2.value = locationText; centerAlign(r5c2); setBorders(r5c2);

    // Row 6: Month Header
    sheet.mergeCells('A6:B6');
    const r6c1 = sheet.getCell('A6'); r6c1.value = "الشهر"; centerAlign(r6c1); boldFont(r6c1); setBorders(r6c1);
    r6c1.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    r6c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC22129' } };

    const r6c3 = sheet.getCell('C6'); r6c3.value = month; centerAlign(r6c3); boldFont(r6c3); setBorders(r6c3);
    r6c3.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    r6c3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC22129' } };

    // Row 7: Total Cases
    sheet.mergeCells('A7:B7');
    const r7c1 = sheet.getCell('A7'); r7c1.value = "اجمالي عدد الحالات"; centerAlign(r7c1); boldFont(r7c1); setBorders(r7c1);
    const cell7_3 = sheet.getCell('C7'); cell7_3.value = totalCases; centerAlign(cell7_3); boldFont(cell7_3); setBorders(cell7_3);
    if (totalCases > 0) cell7_3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F6F8' } };

    // Row 8: Red Separator
    const r8 = sheet.getRow(8);
    r8.height = 10;
    for (let c = 1; c <= 3; c++) {
        const cell = sheet.getCell(8, c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC22129' } };
        setBorders(cell);
    }

    // Row 9 & 10: Gender
    sheet.mergeCells('A9:A10');
    const r9c1 = sheet.getCell('A9'); r9c1.value = "الجنس"; centerAlign(r9c1); boldFont(r9c1); setBorders(r9c1);
    sheet.getCell('A10').border = { bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };

    const maleTotal = getCount((c) => c[5] === "ذكر");
    const r9c2 = sheet.getCell('B9'); r9c2.value = "ذكر"; centerAlign(r9c2); boldFont(r9c2); setBorders(r9c2);
    const cell9_3 = sheet.getCell('C9'); cell9_3.value = maleTotal; centerAlign(cell9_3); boldFont(cell9_3); setBorders(cell9_3);
    if (maleTotal > 0) cell9_3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F6F8' } };

    const femaleTotal = getCount((c) => c[5] === "أنثى" || c[5] === "انثى");
    const r10c2 = sheet.getCell('B10'); r10c2.value = "انثى"; centerAlign(r10c2); boldFont(r10c2); setBorders(r10c2);
    const cell10_3 = sheet.getCell('C10'); cell10_3.value = femaleTotal; centerAlign(cell10_3); boldFont(cell10_3); setBorders(cell10_3);
    if (femaleTotal > 0) cell10_3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F6F8' } };

    // Row 11: Red Separator
    const r11 = sheet.getRow(11);
    r11.height = 10;
    for (let c = 1; c <= 3; c++) {
        const cell = sheet.getCell(11, c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC22129' } };
        setBorders(cell);
    }

    // Row 12+: Case Types
    const CASE_TYPES = [
        "كسور", "حادث", "أمراض قلبية", "جهاز تنفسي", "حالات طبية", "جراحة", "جثة", "حروق", "جروح", "كورونا", "متابعة",
        "دفاع مدني", "حالات عصبية", "حالات طارئة", "نقل إصابات وجرحى", "نقل شهداء", "علاج ميداني", "تأمين نازحين (عوائل)",
        "توزيع أدوية", "تأمين معدات طبية", "توزيع حليب", "توزيع حفاضات", "تلبية استهدافات",
        "انتخابات – نقل ناخبين من ذوي الاحتياجات الخاصة", "متابعة منزلية للمرضى"
    ];

    sheet.mergeCells(`A12:A${11 + CASE_TYPES.length}`);
    const r12c1 = sheet.getCell('A12'); r12c1.value = "نوع الحالات"; centerAlign(r12c1); boldFont(r12c1); setBorders(r12c1);

    for (let i = 12; i <= 11 + CASE_TYPES.length; i++) {
        sheet.getCell(`A${i}`).border = { left: { style: 'thin' }, right: { style: 'thin' }, top: (i === 12 ? { style: 'thin' } : undefined), bottom: (i === 11 + CASE_TYPES.length ? { style: 'thin' } : undefined) };
    }

    CASE_TYPES.forEach((type, tIdx) => {
        const rIdx = 12 + tIdx;
        const c2 = sheet.getCell(rIdx, 2);
        c2.value = type; centerAlign(c2); boldFont(c2); setBorders(c2);

        const typeTotal = getCount((c) => c[6] === type);
        const cellType = sheet.getCell(rIdx, 3);
        cellType.value = typeTotal; centerAlign(cellType); boldFont(cellType); setBorders(cellType);
        if (typeTotal > 0) cellType.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F6F8' } };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, filename);
}

export async function exportMonthlyFinancialExcel(monthName, year, branch, rows, filename) {
    // rows format: [Timestamp, التاريخ, فئة المصروف, نوع المصروف, ..., المبلغ المدفوع(14), المبلغ(15), فاتورة(16), الفرع(17)]
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`تقرير مالي ${monthName} ${year}`, { views: [{ rightToLeft: true }] });

    sheet.columns = [
        { width: 22 }, // A: Category
        { width: 30 }, // B: Type
        { width: 14 }, // C: Amount
        { width: 14 }, // D: Currency
        { width: 16 }, // E: Date
        { width: 20 }, // F: Branch
    ];

    const RED = 'FFC22129';
    const WHITE = 'FFFFFFFF';
    const GREY_LIGHT = 'FFF4F6F8';

    const setBorders = (cell) => {
        cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
        };
    };
    const center = (cell) => { cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }; };
    const bold = (cell) => { cell.font = { bold: true, size: 12 }; };
    const redHeader = (cell, text) => {
        cell.value = text;
        cell.font = { bold: true, size: 12, color: { argb: WHITE } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RED } };
        center(cell); setBorders(cell);
    };

    // === HEADER ROWS ===
    sheet.getRow(1).height = 30;
    sheet.getRow(2).height = 20;
    sheet.getRow(3).height = 20;

    // Title
    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `التقرير المالي الشهري — ${monthName} ${year}`;
    titleCell.font = { bold: true, size: 16 };
    center(titleCell);

    // Logo
    try {
        const logoBase64 = await getBase64ImageFromUrl(logoPng);
        const imageId = workbook.addImage({ base64: logoBase64, extension: 'png' });
        sheet.addImage(imageId, { tl: { col: 5, row: 0 }, ext: { width: 70, height: 70 } });
    } catch (e) { console.warn("Logo error", e); }

    // Branch + Organization
    sheet.mergeCells('A2:C2');
    const orgCell = sheet.getCell('A2');
    orgCell.value = 'الشِفاء للخدمات الطبية والإنسانية';
    orgCell.font = { bold: true, size: 12 };
    center(orgCell);

    sheet.mergeCells('A3:C3');
    const branchCell = sheet.getCell('A3');
    branchCell.value = `الفرع: ${branch || 'كل الفروع'}`;
    branchCell.font = { size: 11 };
    center(branchCell);

    // Separator
    const sep = sheet.getRow(4);
    sep.height = 8;
    for (let c = 1; c <= 6; c++) {
        const cell = sheet.getCell(4, c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RED } };
    }

    // === COLUMN HEADERS ===
    sheet.getRow(5).height = 22;
    redHeader(sheet.getCell('A5'), 'فئة المصروف');
    redHeader(sheet.getCell('B5'), 'نوع المصروف');
    redHeader(sheet.getCell('C5'), 'المبلغ');
    redHeader(sheet.getCell('D5'), 'العملة');
    redHeader(sheet.getCell('E5'), 'التاريخ');
    redHeader(sheet.getCell('F5'), 'الفرع');

    // === DATA ROWS grouped by category ===
    const grouped = {};
    rows.forEach(r => {
        const cat = r[2] || 'أخرى';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(r);
    });

    let rowIdx = 6;
    let totalUSD = 0;
    let totalLBP = 0;

    Object.entries(grouped).forEach(([category, items]) => {
        // Category header
        sheet.mergeCells(rowIdx, 1, rowIdx, 6);
        const catCell = sheet.getCell(rowIdx, 1);
        catCell.value = category;
        catCell.font = { bold: true, size: 12, color: { argb: WHITE } };
        catCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF424443' } };
        center(catCell); setBorders(catCell);
        sheet.getRow(rowIdx).height = 20;
        rowIdx++;

        // Item rows
        items.forEach((r, i) => {
            const amount = Number(r[15]) || 0;
            const currency = r[14] || '';
            if (currency.includes('دولار')) totalUSD += amount;
            else totalLBP += amount;

            const dr = sheet.getRow(rowIdx);
            dr.height = 18;
            const bg = i % 2 === 0 ? GREY_LIGHT : WHITE;

            [r[2], r[3], r[15], r[14], r[1], r[17]].forEach((val, ci) => {
                const cell = sheet.getCell(rowIdx, ci + 1);
                cell.value = val || '';
                center(cell); setBorders(cell);
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
            });
            rowIdx++;
        });
    });

    // === TOTALS ROW ===
    const sep2 = sheet.getRow(rowIdx);
    sep2.height = 8;
    for (let c = 1; c <= 6; c++) {
        sheet.getCell(rowIdx, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RED } };
    }
    rowIdx++;

    sheet.mergeCells(rowIdx, 1, rowIdx, 2);
    const tot1 = sheet.getCell(rowIdx, 1);
    tot1.value = `الإجمالي بالدولار: ${totalUSD.toLocaleString()} $`;
    tot1.font = { bold: true, size: 12 };
    center(tot1); setBorders(tot1);
    tot1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREY_LIGHT } };

    sheet.mergeCells(rowIdx, 3, rowIdx, 4);
    const tot2 = sheet.getCell(rowIdx, 3);
    tot2.value = `الإجمالي بالليرة: ${totalLBP.toLocaleString()} ل.ل`;
    tot2.font = { bold: true, size: 12 };
    center(tot2); setBorders(tot2);
    tot2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREY_LIGHT } };

    sheet.mergeCells(rowIdx, 5, rowIdx, 6);
    const tot3 = sheet.getCell(rowIdx, 5);
    tot3.value = `عدد العمليات: ${rows.length}`;
    tot3.font = { bold: true, size: 12 };
    center(tot3); setBorders(tot3);
    tot3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREY_LIGHT } };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, filename);
}

// ================================
// FINANCIAL TEMPLATE EXCEL
// Matches the official Al-Shifaa format image
// ================================
export async function exportFinancialTemplateExcel(monthName, year, branch, supervisorName, rows, filename) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`مصاريف ${monthName} ${year}`, { views: [{ rightToLeft: true }] });

    sheet.columns = [
        { width: 6 }, // A: م (row number)
        { width: 20 }, // B: الحساب (category)
        { width: 30 }, // C: البيان (description)
        { width: 20 }, // D: المبلغ بالليرة
        { width: 18 }, // E: المبلغ بالدولار
        { width: 22 }, // F: ملاحظات
    ];

    const RED = 'FFC22129', WHITE = 'FFFFFFFF', GREY = 'FFD9D9D9';
    const GREEN = 'FFE2EFDA', DARK = 'FF2F2F2F', LIGHT = 'FFF4F6F8';

    const border = (cell) => { cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; };
    const cent = (cell) => { cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }; };
    const right = (cell) => { cell.alignment = { vertical: 'middle', horizontal: 'right', wrapText: true }; };

    // ROW 1: Logo + Title
    sheet.getRow(1).height = 55;
    try {
        const logoBase64 = await getBase64ImageFromUrl(logoPng);
        const imageId = workbook.addImage({ base64: logoBase64, extension: 'png' });
        sheet.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 90, height: 55 } });
    } catch (e) { }

    sheet.mergeCells('C1:F1');
    const titleCell = sheet.getCell('C1');
    titleCell.value = `مصاريف الاسعاف – ${branch || ''}`;
    titleCell.font = { bold: true, size: 18, color: { argb: RED } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'right' };

    // ROW 2: Info row (region | date | supervisor)
    sheet.getRow(2).height = 22;
    sheet.mergeCells('A2:B2');
    const region = sheet.getCell('A2');
    region.value = `المنطقة: ${branch || 'كل الفروع'}`;
    region.font = { bold: true, size: 11 }; right(region); border(region);

    sheet.mergeCells('C2:D2');
    const dateC = sheet.getCell('C2');
    dateC.value = `التاريخ: ${monthName} / ${year}`;
    dateC.font = { bold: true, size: 11 }; cent(dateC); border(dateC);

    sheet.mergeCells('E2:F2');
    const supC = sheet.getCell('E2');
    supC.value = `المشرف: ${supervisorName || ''}`;
    supC.font = { bold: true, size: 11 }; right(supC); border(supC);

    // ROW 3: Column headers
    sheet.getRow(3).height = 28;
    [['A', 'م'], ['B', 'الحساب'], ['C', 'البيان'], ['D', 'المبلغ المدفوع بالليرة'], ['E', 'المبلغ المدفوع بالدولار'], ['F', 'ملاحظات']].forEach(([col, label]) => {
        const cell = sheet.getCell(`${col}3`);
        cell.value = label;
        cell.font = { bold: true, size: 11, color: { argb: WHITE } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK } };
        cent(cell); border(cell);
    });

    // Group rows by category
    const CATS = ['صيانة', 'ضيافة', 'محروقات', 'اتصالات / إنترنت', 'إعلاميات', 'إيجارات', 'كهرباء', 'لوازم إسعافات', 'تنظيفات / غسيل سيارة', 'أخرى'];
    const grouped = {};
    CATS.forEach(cat => { grouped[cat] = []; });
    rows.forEach(row => {
        const cat = row[2] || 'أخرى';
        const key = CATS.find(c => cat.includes(c.split(' ')[0])) || 'أخرى';
        grouped[key].push(row);
    });

    let rowIdx = 4, catNum = 1, totalLBP = 0, totalUSD = 0;

    CATS.forEach(category => {
        const items = grouped[category];
        const startRow = rowIdx;

        const renderRow = (item, isFirst, altBg) => {
            sheet.getRow(rowIdx).height = 18;
            const amount = Number((item || {})[15]) || 0;
            const currency = (item || {})[14] || '';
            const isUSD = currency.includes('دولار') || currency.includes('dollar') || currency.toLowerCase().includes('usd');
            if (item) { isUSD ? (totalUSD += amount) : (totalLBP += amount); }

            const bg = altBg ? LIGHT : WHITE;

            // م
            const numCell = sheet.getCell(rowIdx, 1);
            if (isFirst) { numCell.value = catNum; }
            cent(numCell); border(numCell);

            // الحساب
            const catCell = sheet.getCell(rowIdx, 2);
            if (isFirst) { catCell.value = category; catCell.font = { bold: true, size: 11 }; }
            right(catCell); border(catCell);

            // البيان
            const byanCell = sheet.getCell(rowIdx, 3);
            byanCell.value = item ? (item[3] || '') : '';
            byanCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
            right(byanCell); border(byanCell);

            // LBP
            const lbpCell = sheet.getCell(rowIdx, 4);
            lbpCell.value = item && !isUSD ? amount : '';
            lbpCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
            cent(lbpCell); border(lbpCell);

            // USD
            const usdCell = sheet.getCell(rowIdx, 5);
            usdCell.value = item && isUSD ? amount : '';
            usdCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
            cent(usdCell); border(usdCell);

            // Notes
            border(sheet.getCell(rowIdx, 6));
            rowIdx++;
        };

        if (items.length === 0) {
            renderRow(null, true, false);
        } else {
            items.forEach((item, i) => renderRow(item, i === 0, i % 2 === 1));
        }

        // Merge category cells for 2+ rows
        if (items.length > 1) {
            sheet.mergeCells(startRow, 2, rowIdx - 1, 2);
            const merged = sheet.getCell(startRow, 2);
            merged.value = category;
            merged.font = { bold: true, size: 11 };
            merged.alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
            border(merged);
        }
        catNum++;
    });

    // TOTALS ROW (grey)
    sheet.getRow(rowIdx).height = 22;
    sheet.mergeCells(rowIdx, 1, rowIdx, 3);
    const totLabel = sheet.getCell(rowIdx, 1);
    totLabel.value = 'المجموع';
    totLabel.font = { bold: true, size: 13 };
    totLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREY } };
    cent(totLabel); border(totLabel);

    const totLBP = sheet.getCell(rowIdx, 4);
    totLBP.value = totalLBP;
    totLBP.font = { bold: true, size: 12 };
    totLBP.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREY } };
    cent(totLBP); border(totLBP);

    const totUSDCell = sheet.getCell(rowIdx, 5);
    totUSDCell.value = totalUSD;
    totUSDCell.font = { bold: true, size: 12 };
    totUSDCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREY } };
    cent(totUSDCell); border(totUSDCell);
    border(sheet.getCell(rowIdx, 6));
    rowIdx++;

    // === SUMMARY BLOCK ===
    rowIdx++;
    const LBP_RATE = 89000;
    const unifiedUSD = totalUSD + totalLBP / LBP_RATE;

    const summaryRows = [
        { label: `إجمالي بالدولار`, value: `${totalUSD.toLocaleString()} $`, bg: 'FFFFFFFF' },
        { label: `إجمالي بالليرة`, value: `${totalLBP.toLocaleString()} ل.ل`, bg: 'FFFFFFFF' },
        { label: `عدد العمليات`, value: `${rows.length}`, bg: 'FFFFFFFF' },
        { label: `المجموع الموحد ($)`, value: `${unifiedUSD.toFixed(2)} $`, bg: GREEN },
    ];

    summaryRows.forEach(({ label, value, bg }) => {
        sheet.getRow(rowIdx).height = 22;
        sheet.mergeCells(rowIdx, 1, rowIdx, 3);
        const lCell = sheet.getCell(rowIdx, 1);
        lCell.value = label;
        lCell.font = { bold: true, size: 12, color: { argb: label.includes('الموحد') ? RED : 'FF333333' } };
        lCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg === GREEN ? GREEN : 'FFF4F6F8' } };
        right(lCell); border(lCell);

        sheet.mergeCells(rowIdx, 4, rowIdx, 6);
        const vCell = sheet.getCell(rowIdx, 4);
        vCell.value = value;
        vCell.font = { bold: true, size: 12, color: { argb: label.includes('الموحد') ? RED : 'FF111111' } };
        vCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg === GREEN ? GREEN : 'FFF4F6F8' } };
        cent(vCell); border(vCell);
        rowIdx++;
    });

    // Exchange rate note row
    sheet.getRow(rowIdx).height = 18;
    sheet.mergeCells(rowIdx, 1, rowIdx, 6);
    const rateNote = sheet.getCell(rowIdx, 1);
    rateNote.value = 'سعر الصرف المعتمد: 1$ = 89,000 ل.ل';
    rateNote.font = { italic: true, size: 10, color: { argb: 'FF888888' } };
    rateNote.alignment = { vertical: 'middle', horizontal: 'center' };
    rowIdx++;

    // NOTE
    rowIdx++;
    sheet.getRow(rowIdx).height = 28;
    sheet.mergeCells(rowIdx, 1, rowIdx, 6);
    const noteCell = sheet.getCell(rowIdx, 1);
    noteCell.value = 'ملاحظة: كل مبلغ لا يتضمن فاتورة موقعة من المشرف لن يتم صرفه';
    noteCell.font = { bold: true, size: 13, color: { argb: RED } };
    noteCell.alignment = { vertical: 'middle', horizontal: 'center' };
    rowIdx++;

    // SIGNATURE
    rowIdx++;
    sheet.mergeCells(rowIdx, 1, rowIdx, 3);
    const sigCell = sheet.getCell(rowIdx, 1);
    sigCell.value = `توقيع المشرف: ${supervisorName || ''}`;
    sigCell.font = { bold: true, size: 11 };
    sigCell.alignment = { vertical: 'middle', horizontal: 'right' };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, filename);
}

// ================================
// ANNUAL FINANCIAL TEMPLATE EXCEL
// ================================
export async function exportAnnualFinancialExcel(year, branch, rows, filename) {
    const SHORT_MONTHS = ["ك2", "شباط", "اذار", "نيسان", "ايار", "حزيران", "تموز", "اب", "ايلول", "ت1", "ت2", "ك1"];
    const CATS = ['صيانة', 'ضيافة', 'محروقات', 'اتصالات / إنترنت', 'إعلاميات', 'إيجارات', 'كهرباء', 'لوازم إسعافات', 'تنظيفات / غسيل سيارة', 'أخرى'];
    const RED = 'FFC22129', WHITE = 'FFFFFFFF', GREY = 'FFD9D9D9', LIGHT = 'FFF4F6F8', DARK = 'FF424443';

    function parseDate(s) {
        if (!s) return null;
        const m = String(s).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (m) return new Date(`${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`);
        return new Date(s);
    }

    const yearRows = rows.filter(r => {
        const d = parseDate(r[1]);
        return d && !isNaN(d.getTime()) && d.getFullYear() === Number(year);
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`التقرير السنوي ${year}`, { views: [{ rightToLeft: true }] });

    sheet.columns = [
        { width: 25 },
        ...SHORT_MONTHS.map(() => ({ width: 10 }))
    ];

    const b = (cell) => { cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; };
    const c = (cell) => { cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }; };

    // Title row
    sheet.getRow(1).height = 45;
    sheet.mergeCells(1, 1, 1, 13);
    const title = sheet.getCell('A1');
    title.value = `التقرير المالي السنوي ${year} – ${branch || 'كل الفروع'}`;
    title.font = { bold: true, size: 16, color: { argb: RED } };
    c(title);

    try {
        const logoBase64 = await getBase64ImageFromUrl(logoPng);
        const imageId = workbook.addImage({ base64: logoBase64, extension: 'png' });
        sheet.addImage(imageId, { tl: { col: 12.5, row: 0 }, ext: { width: 75, height: 50 } });
    } catch (e) { }

    // Month headers
    sheet.getRow(2).height = 26;
    const h0 = sheet.getCell('A2');
    h0.value = 'الحساب / الشهر';
    h0.font = { bold: true, size: 11, color: { argb: WHITE } };
    h0.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK } };
    c(h0); b(h0);

    SHORT_MONTHS.forEach((m, i) => {
        const cell = sheet.getCell(2, 2 + i);
        cell.value = m;
        cell.font = { bold: true, size: 11, color: { argb: WHITE } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RED } };
        c(cell); b(cell);
    });

    let rowIdx = 3;
    const monthTotals = Array(12).fill(0);

    CATS.forEach(cat => {
        sheet.getRow(rowIdx).height = 20;
        const catCell = sheet.getCell(rowIdx, 1);
        catCell.value = cat;
        catCell.font = { bold: true, size: 11 };
        catCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT } };
        b(catCell);

        for (let mi = 0; mi < 12; mi++) {
            const total = yearRows.filter(r => {
                const d = parseDate(r[1]);
                const rowCat = r[2] || 'أخرى';
                const key = CATS.find(c => rowCat.includes(c.split(' ')[0])) || 'أخرى';
                return d && d.getMonth() === mi && key === cat;
            }).reduce((sum, r) => sum + (Number(r[15]) || 0), 0);

            monthTotals[mi] += total;
            const cell = sheet.getCell(rowIdx, 2 + mi);
            cell.value = total || '';
            if (total > 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT } };
            c(cell); b(cell);
        }
        rowIdx++;
    });

    // Totals row
    sheet.getRow(rowIdx).height = 24;
    const totLabel = sheet.getCell(rowIdx, 1);
    totLabel.value = 'المجموع الشهري';
    totLabel.font = { bold: true, size: 12, color: { argb: WHITE } };
    totLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK } };
    b(totLabel);

    monthTotals.forEach((t, i) => {
        const cell = sheet.getCell(rowIdx, 2 + i);
        cell.value = t || '';
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREY } };
        c(cell); b(cell);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, filename);
}
