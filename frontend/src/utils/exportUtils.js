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

// Helper to parse date strictly as MM/DD/YYYY if it matches that format
function parseSheetDate(str) {
    if (!str) return null;
    const s = String(str).trim();
    const parts = s.split("/");
    if (parts.length === 3) {
        const m = parseInt(parts[0], 10);
        const d = parseInt(parts[1], 10);
        const y = parseInt(parts[2], 10);
        if (!isNaN(m) && !isNaN(d) && !isNaN(y)) {
            return new Date(y, m - 1, d);
        }
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
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
        const d = parseSheetDate(c[1]);
        const rowYear = d ? String(d.getFullYear()) : "";
        if (rowYear !== String(year)) return false;
        if (branch === "كل الفروع" || branch === "All") return true;
        return (c[4] || "").includes(branch);
    });

    const getCount = (monthIdx, filterFn) => {
        return yearlyCases.filter(c => {
            const d = parseSheetDate(c[1]);
            const rowMonth = d ? monthNamesDB[d.getMonth()] : "";
            return rowMonth === monthNamesDB[monthIdx] && filterFn(c);
        }).length;
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

    // Row 15+: Age Groups
    const AGE_GROUPS = [
        "رضيع (أقل من سنة)", "طفل (1 – 5 سنوات)", "طفل (6 – 12 سنة)", "مراهق (13 – 17 سنة)", "شاب (18 – 35 سنة)", "بالغ (36 – 60 سنة)", "مسن (أكثر من 60 سنة)", "غير محدد"
    ];

    const startAgeRow = 13 + CASE_TYPES.length;
    sheet.getRow(startAgeRow).height = 10;
    for (let c = 1; c <= 14; c++) {
        const cell = sheet.getCell(startAgeRow, c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC22129' } };
        setBorders(cell);
    }

    const ageLabelRow = startAgeRow + 1;
    sheet.mergeCells(`A${ageLabelRow}:A${ageLabelRow + AGE_GROUPS.length - 1}`);
    const ageLabelCell = sheet.getCell(`A${ageLabelRow}`);
    ageLabelCell.value = "الفئات العمرية"; centerAlign(ageLabelCell); boldFont(ageLabelCell); setBorders(ageLabelCell);

    AGE_GROUPS.forEach((age, aIdx) => {
        const rIdx = ageLabelRow + aIdx;
        const c2 = sheet.getCell(rIdx, 2);
        c2.value = age; centerAlign(c2); boldFont(c2); setBorders(c2);

        const ageTotals = getMonthTotals((c) => (c[10] || "غير محدد") === age);
        ageTotals.forEach((val, idx) => {
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
        const d = parseSheetDate(c[1]);
        const monthNames = ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"];
        const rowMonth = d ? monthNames[d.getMonth()] : "";
        const rowYear = d ? String(d.getFullYear()) : "";

        if (rowYear !== String(year) || rowMonth !== month) return false;
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

    // Row 15+: Age Groups
    const AGE_GROUPS = [
        "رضيع (أقل من سنة)", "طفل (1 – 5 سنوات)", "طفل (6 – 12 سنة)", "مراهق (13 – 17 سنة)", "شاب (18 – 35 سنة)", "بالغ (36 – 60 سنة)", "مسن (أكثر من 60 سنة)", "غير محدد"
    ];

    const startAgeRow = 13 + CASE_TYPES.length;
    sheet.getRow(startAgeRow).height = 10;
    for (let c = 1; c <= 3; c++) {
        const cell = sheet.getCell(startAgeRow, c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC22129' } };
        setBorders(cell);
    }

    const ageLabelRow = startAgeRow + 1;
    sheet.mergeCells(`A${ageLabelRow}:A${ageLabelRow + AGE_GROUPS.length - 1}`);
    const ageLabelCell = sheet.getCell(`A${ageLabelRow}`);
    ageLabelCell.value = "الفئات العمرية"; centerAlign(ageLabelCell); boldFont(ageLabelCell); setBorders(ageLabelCell);

    AGE_GROUPS.forEach((age, aIdx) => {
        const rIdx = ageLabelRow + aIdx;
        const c2 = sheet.getCell(rIdx, 2);
        c2.value = age; centerAlign(c2); boldFont(c2); setBorders(c2);

        const ageTotal = getCount((c) => (c[10] || "غير محدد") === age);
        const cellAge = sheet.getCell(rIdx, 3);
        cellAge.value = ageTotal; centerAlign(cellAge); boldFont(cellAge); setBorders(cellAge);
        if (ageTotal > 0) cellAge.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F6F8' } };
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
    const LBP_RATE = 89000;

    // ── pre-compute totals ──────────────────────────────────────────────────
    let totalUSD = 0, totalLBP = 0;
    rows.forEach(r => {
        const amt = Number(r[15]) || 0;
        (r[14] || '').includes('دولار') ? (totalUSD += amt) : (totalLBP += amt);
    });
    const unifiedUSD = totalUSD + totalLBP / LBP_RATE;

    // ── group by category ───────────────────────────────────────────────────
    const CATS = ['صيانة', 'ضيافة', 'محروقات', 'اتصالات / إنترنت', 'إعلاميات',
        'إيجارات', 'كهرباء', 'لوازم إسعافات', 'تنظيفات / غسيل سيارة', 'أخرى'];
    const grouped = {};
    CATS.forEach(c => { grouped[c] = []; });
    rows.forEach(r => {
        const cat = r[2] || 'أخرى';
        const key = CATS.find(c => cat.includes(c.split(' ')[0])) || 'أخرى';
        grouped[key].push(r);
    });

    // ── workbook / sheet ────────────────────────────────────────────────────
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(`مصاريف ${monthName} ${year}`, { views: [{ rightToLeft: true }] });

    ws.columns = [
        { key: 'no', width: 5 },   // A
        { key: 'cat', width: 22 },   // B
        { key: 'desc', width: 30 },   // C
        { key: 'lbp', width: 20 },   // D
        { key: 'usd', width: 18 },   // E
        { key: 'note', width: 18 },   // F
    ];

    // ── colour / style helpers ──────────────────────────────────────────────
    const R = 'FFC22129', W = 'FFFFFFFF', GR = 'FFD9D9D9';
    const GN = 'FFE2EFDA', DK = 'FF2F2F2F', LT = 'FFF4F6F8';

    const fill = (cell, argb) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } }; };
    const bd = (cell) => { cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; };
    const ctr = (cell) => { cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }; };
    const rgt = (cell) => { cell.alignment = { vertical: 'middle', horizontal: 'right', wrapText: true }; };
    const bfont = (cell, sz = 11, argb = 'FF000000') => { cell.font = { bold: true, size: sz, color: { argb } }; };

    const hdrRow = (ri, ...vals) => {
        ws.getRow(ri).height = 26;
        vals.forEach(([ci, v, fg, color]) => {
            const cell = ws.getCell(ri, ci);
            cell.value = v;
            bfont(cell, 11, color || W);
            fill(cell, fg);
            ctr(cell); bd(cell);
        });
    };

    // ── ROW 1: logo + title ─────────────────────────────────────────────────
    ws.getRow(1).height = 55;
    try {
        const b64 = await getBase64ImageFromUrl(logoPng);
        const iid = wb.addImage({ base64: b64, extension: 'png' });
        ws.addImage(iid, { tl: { col: 0, row: 0 }, ext: { width: 90, height: 55 } });
    } catch (_) { }

    // title in C-F merged
    ws.mergeCells('C1:F1');
    const t = ws.getCell('C1');
    t.value = `مصاريف الاسعاف – ${branch || ''}`;
    t.font = { bold: true, size: 18, color: { argb: R } };
    t.alignment = { vertical: 'middle', horizontal: 'right' };

    // ── ROW 2: info ─────────────────────────────────────────────────────────
    ws.getRow(2).height = 20;

    ws.mergeCells('A2:B2');
    const r2a = ws.getCell('A2');
    r2a.value = `المنطقة: ${branch || 'كل الفروع'}`;
    bfont(r2a, 11, 'FF000000'); rgt(r2a); bd(r2a);

    ws.mergeCells('C2:D2');
    const r2c = ws.getCell('C2');
    r2c.value = `التاريخ: ${monthName} / ${year}`;
    bfont(r2c, 11, 'FF000000'); ctr(r2c); bd(r2c);

    ws.mergeCells('E2:F2');
    const r2e = ws.getCell('E2');
    r2e.value = `المشرف: ${supervisorName || ''}`;
    bfont(r2e, 11, 'FF000000'); rgt(r2e); bd(r2e);

    // ── ROW 3: column headers ───────────────────────────────────────────────
    hdrRow(3,
        [1, 'م', DK], [2, 'الفئة', DK], [3, 'البيان', DK],
        [4, 'المبلغ بالليرة', DK], [5, 'المبلغ بالدولار', DK], [6, 'ملاحظات', DK]
    );

    // ── DATA ROWS (flat – no mergeCells) ────────────────────────────────────
    let ri = 4, catNo = 1;

    CATS.forEach(cat => {
        const items = grouped[cat];

        // category header row (spans full width via fill, no merge)
        ws.getRow(ri).height = 18;
        const catHdr = [1, 2, 3, 4, 5, 6];
        catHdr.forEach((ci, idx) => {
            const cell = ws.getCell(ri, ci);
            fill(cell, DK);
            cell.border = {
                top: { style: 'thin' }, bottom: { style: 'thin' },
                left: idx === 0 ? { style: 'thin' } : { style: 'none' },
                right: idx === 5 ? { style: 'thin' } : { style: 'none' }
            };
            if (ci === 1) { cell.value = catNo; bfont(cell, 10, W); ctr(cell); }
            if (ci === 2) { cell.value = cat; bfont(cell, 11, W); rgt(cell); }
        });
        ri++;

        if (items.length === 0) {
            // empty placeholder
            ws.getRow(ri).height = 16;
            for (let ci = 1; ci <= 6; ci++) { const c = ws.getCell(ri, ci); fill(c, LT); bd(c); }
            ri++;
        } else {
            items.forEach((item, idx) => {
                const amt = Number(item[15]) || 0;
                const isUSD = (item[14] || '').includes('دولار');
                const bg = idx % 2 === 0 ? W : LT;

                // Build detailed description: نوع المصروف + any specific sub-type from cols 4-13
                const subType = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(i => item[i] || '').filter(Boolean).join(' – ');
                const fullDesc = [item[3] || '', subType].filter(Boolean).join(': ');

                ws.getRow(ri).height = 18;
                for (let ci = 1; ci <= 6; ci++) {
                    const cell = ws.getCell(ri, ci);
                    fill(cell, bg); bd(cell);
                    if (ci === 1) { cell.value = item[1] || ''; cell.font = { size: 9 }; ctr(cell); } // date
                    if (ci === 2) { cell.value = ''; rgt(cell); }
                    if (ci === 3) { cell.value = fullDesc; rgt(cell); }
                    if (ci === 4) { cell.value = isUSD ? '' : amt; ctr(cell); }
                    if (ci === 5) { cell.value = isUSD ? amt : ''; ctr(cell); }
                    if (ci === 6) { cell.value = ''; }
                }
                ri++;
            });
        }
        catNo++;
    });

    // ── TOTALS ROW ──────────────────────────────────────────────────────────
    ws.getRow(ri).height = 22;
    ws.mergeCells(ri, 1, ri, 3);
    const totL = ws.getCell(ri, 1); totL.value = 'المجموع';
    bfont(totL, 12); fill(totL, GR); ctr(totL); bd(totL);

    const totLBPcell = ws.getCell(ri, 4);
    totLBPcell.value = `${totalLBP.toLocaleString()} ل.ل`;
    bfont(totLBPcell, 11); fill(totLBPcell, GR); ctr(totLBPcell); bd(totLBPcell);

    const totUSDcell = ws.getCell(ri, 5);
    totUSDcell.value = `${totalUSD.toLocaleString()} $`;
    bfont(totUSDcell, 11); fill(totUSDcell, GR); ctr(totUSDcell); bd(totUSDcell);

    const totN = ws.getCell(ri, 6);
    totN.value = `الموحد ($): ${unifiedUSD.toFixed(2)}`;
    bfont(totN, 10, R); fill(totN, GN); ctr(totN); bd(totN);
    ri++;

    // ── SUMMARY BLOCK (4 rows) ──────────────────────────────────────────────
    ri++; // blank separator

    const sumData = [
        ['إجمالي بالدولار', `${totalUSD.toLocaleString()} $`, LT, false],
        ['إجمالي بالليرة', `${totalLBP.toLocaleString()} ل.ل`, LT, false],
        ['عدد العمليات', `${rows.length}`, LT, false],
        ['المجموع الموحد ($)', `${unifiedUSD.toFixed(2)} $`, GN, true],
    ];

    sumData.forEach(([label, val, bg, isHighlight]) => {
        ws.getRow(ri).height = 22;
        // cols 1-3: label
        for (let ci = 1; ci <= 3; ci++) {
            const cell = ws.getCell(ri, ci);
            fill(cell, bg);
            cell.border = {
                top: { style: 'thin' }, bottom: { style: 'thin' },
                left: ci === 1 ? { style: 'thin' } : { style: 'none' },
                right: ci === 3 ? { style: 'thin' } : { style: 'none' }
            };
            if (ci === 1) {
                cell.value = label;
                cell.font = { bold: true, size: 12, color: { argb: isHighlight ? R : 'FF333333' } };
                rgt(cell);
            }
        }
        // cols 4-6: value
        for (let ci = 4; ci <= 6; ci++) {
            const cell = ws.getCell(ri, ci);
            fill(cell, bg);
            cell.border = {
                top: { style: 'thin' }, bottom: { style: 'thin' },
                left: ci === 4 ? { style: 'thin' } : { style: 'none' },
                right: ci === 6 ? { style: 'thin' } : { style: 'none' }
            };
            if (ci === 4) {
                cell.value = val;
                cell.font = { bold: true, size: 12, color: { argb: isHighlight ? R : 'FF111111' } };
                ctr(cell);
            }
        }
        ri++;
    });

    // exchange rate note
    ws.getRow(ri).height = 16;
    ws.mergeCells(ri, 1, ri, 6);
    const rn = ws.getCell(ri, 1);
    rn.value = 'سعر الصرف المعتمد: 1$ = 89,000 ل.ل';
    rn.font = { italic: true, size: 10, color: { argb: 'FF888888' } };
    rn.alignment = { vertical: 'middle', horizontal: 'center' };
    ri++;

    // ── NOTE ────────────────────────────────────────────────────────────────
    ri++;
    ws.getRow(ri).height = 28;
    ws.mergeCells(ri, 1, ri, 6);
    const note = ws.getCell(ri, 1);
    note.value = 'ملاحظة: كل مبلغ لا يتضمن فاتورة موقعة من المشرف لن يتم صرفه';
    note.font = { bold: true, size: 13, color: { argb: R } };
    note.alignment = { vertical: 'middle', horizontal: 'center' };
    ri++;

    // ── SIGNATURE ───────────────────────────────────────────────────────────
    ri++;
    ws.mergeCells(ri, 1, ri, 3);
    const sig = ws.getCell(ri, 1);
    sig.value = `توقيع المشرف: ${supervisorName || ''}`;
    sig.font = { bold: true, size: 11 };
    sig.alignment = { vertical: 'middle', horizontal: 'right' };

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
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
