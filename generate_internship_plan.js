const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const mainLogoBase64 = fs.readFileSync(path.join(__dirname, 'frontend/src/assets/main_logo.png')).toString('base64');
const subLogoBase64 = fs.readFileSync(path.join(__dirname, 'frontend/src/assets/sub-logo.png')).toString('base64');

const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>خطة التدريب الميداني والمهام اليومية والأسبوعية - رؤى مخزوم</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  @page {
    size: A4;
    margin: 12mm 15mm;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body {
    font-family: 'Cairo', 'Tajawal', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    color: #1f2937;
    background: #ffffff;
    margin: 0;
    padding: 0;
    font-size: 11.5px;
    line-height: 1.5;
  }
  .page {
    page-break-after: always;
    page-break-inside: avoid;
    height: 272mm;
    position: relative;
    padding-bottom: 25px;
    box-sizing: border-box;
  }
  .page:last-child {
    page-break-after: avoid;
  }

  /* Header */
  .header-box {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #C22129;
    padding-bottom: 8px;
    margin-bottom: 14px;
  }
  .header-info {
    text-align: right;
  }
  .org-name {
    font-size: 16px;
    font-weight: 800;
    color: #C22129;
    margin: 0;
  }
  .org-sub {
    font-size: 10.5px;
    color: #4b5563;
    font-weight: 600;
    margin: 2px 0 0;
  }
  .doc-badge {
    display: inline-block;
    background: #FEF2F2;
    color: #991B1B;
    border: 1px solid #FCA5A5;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 9.5px;
    font-weight: 700;
    margin-top: 3px;
  }
  .header-logo img {
    height: 52px;
    object-fit: contain;
  }

  /* Footer */
  .footer-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid #e5e7eb;
    padding-top: 6px;
    font-size: 9.5px;
    color: #6b7280;
  }

  /* Hero Banner */
  .hero-banner {
    background: linear-gradient(135deg, #C22129 0%, #881318 100%);
    color: white;
    padding: 14px 18px;
    border-radius: 10px;
    margin-bottom: 14px;
  }
  .hero-title {
    font-size: 17px;
    font-weight: 900;
    margin: 0 0 4px 0;
  }
  .hero-desc {
    font-size: 11px;
    opacity: 0.95;
    margin: 0;
    line-height: 1.5;
  }

  /* Info Grid */
  .info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-bottom: 14px;
  }
  .info-box {
    background: #F9FAFB;
    border: 1px solid #E5E7EB;
    border-radius: 8px;
    padding: 9px 12px;
  }
  .info-box-title {
    font-size: 11.5px;
    font-weight: 800;
    color: #C22129;
    margin-bottom: 5px;
    border-bottom: 1px solid #E5E7EB;
    padding-bottom: 3px;
  }
  .info-row {
    display: flex;
    justify-content: space-between;
    font-size: 10.5px;
    margin-bottom: 3px;
  }
  .info-lbl {
    color: #6B7280;
    font-weight: 600;
  }
  .info-val {
    color: #111827;
    font-weight: 700;
    direction: ltr;
    text-align: right;
  }
  .info-val-ar {
    color: #111827;
    font-weight: 700;
  }

  /* Section Title */
  .section-title {
    font-size: 13.5px;
    font-weight: 800;
    color: #C22129;
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 12px 0 8px;
    padding-bottom: 4px;
    border-bottom: 1.5px solid #F3F4F6;
  }
  .section-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    background: #C22129;
    color: white;
    border-radius: 50%;
    font-size: 10.5px;
    font-weight: bold;
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 6px 0 10px;
    font-size: 10.5px;
  }
  th, td {
    padding: 6px 9px;
    text-align: right;
    border: 1px solid #E5E7EB;
  }
  th {
    background: #F3F4F6;
    color: #1F2937;
    font-weight: 800;
  }
  .table-en {
    direction: ltr;
    text-align: left;
  }
  .table-en th, .table-en td {
    text-align: left;
  }

  /* Cards */
  .card {
    background: #F9FAFB;
    border: 1px solid #E5E7EB;
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 10px;
    page-break-inside: avoid;
  }
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    font-weight: 800;
    color: #111827;
    margin-bottom: 5px;
  }
  .card-tag {
    background: #E0E7FF;
    color: #3730A3;
    font-size: 9.5px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 10px;
  }
  .card-tag-red {
    background: #FEE2E2;
    color: #991B1B;
    font-size: 9.5px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 10px;
  }

  /* Note Box */
  .note-box {
    background: #FFFBEB;
    border-right: 3px solid #D97706;
    padding: 8px 12px;
    border-radius: 0 6px 6px 0;
    font-size: 10.5px;
    color: #92400E;
    margin: 8px 0;
  }
  .note-box-blue {
    background: #EFF6FF;
    border-right: 3px solid #2563EB;
    padding: 8px 12px;
    border-radius: 0 6px 6px 0;
    font-size: 10.5px;
    color: #1E40AF;
    margin: 8px 0;
  }

  .script-box-ar {
    background: #0F172A;
    color: #F1F5F9;
    padding: 9px 12px;
    border-radius: 6px;
    font-size: 10.5px;
    direction: rtl;
    line-height: 1.55;
    margin: 5px 0;
  }
</style>
</head>
<body>

<!-- PAGE 1: Framework Overview & Daily Dispatch SOP -->
<div class="page">
  <div class="header-box">
    <div class="header-info">
      <h1 class="org-name">جمعية الشفاء للخدمات الطبية الإنسانية</h1>
      <p class="org-sub">قسم نظم المعلومات الإدارية (MIS) • الإدارة العامة والمتابعة الميدانية</p>
      <div class="doc-badge">وثيقة خطة التدريب الميداني والمهام اليومية والأسبوعية • AUL (MIS 425)</div>
    </div>
    <div class="header-logo">
      <img src="data:image/png;base64,${mainLogoBase64}" alt="Al Shifaa Logo">
    </div>
  </div>

  <div class="hero-banner">
    <div class="hero-title">خطة التدريب العملي ونظام إدارة المهام اليومية للمتدربة: رؤى مخزوم</div>
    <div class="hero-desc">
      تم إعداد هذه الخطة لربط متطلبات تخصص <strong>نظم المعلومات الإدارية (MIS)</strong> في جامعة AUL مع العمليات الميدانية السحابية في <strong>جمعية الشفاء</strong> (فرع البقاع الأوسط وفرع بعلبك)، وتزويد المشرف <strong>عمر مختار</strong> بآلية إرسال ومتابعة المهام اليومية لتعبئة تقارير التقدم الأسبوعية (Phase II & III) والتقرير النهائي وعرض التخرج.
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <div class="info-box-title">🎓 بيانات المتدربة الأكاديمية (AUL - School of Business)</div>
      <div class="info-row"><span class="info-lbl">الاسم الكامل:</span><span class="info-val-ar">رؤى يوسف مخزوم (Roaa Youssef Makhzoume)</span></div>
      <div class="info-row"><span class="info-lbl">رقم الطالب (Student ID):</span><span class="info-val">6020240007</span></div>
      <div class="info-row"><span class="info-lbl">التخصص والمقرر:</span><span class="info-val">MIS (MIS 425 - Practical Training)</span></div>
      <div class="info-row"><span class="info-lbl">الفصل الدراسي:</span><span class="info-val">Summer - Fall 2026</span></div>
      <div class="info-row"><span class="info-lbl">الهاتف والبريد:</span><span class="info-val">71 942 507 • roaamakhzoomy@gmail.com</span></div>
    </div>

    <div class="info-box">
      <div class="info-box-title">🏢 بيانات جهة التدريب والمشرف المباشر (Al-Shifaa)</div>
      <div class="info-row"><span class="info-lbl">جهة التدريب:</span><span class="info-val-ar">جمعية الشفاء للخدمات الطبية الإنسانية</span></div>
      <div class="info-row"><span class="info-lbl">المشرف الميداني:</span><span class="info-val-ar">عمر مختار (Omar Mokhtar)</span></div>
      <div class="info-row"><span class="info-lbl">هاتف المشرف والبريد:</span><span class="info-val">+961 79 193 614 • mokhtaromar646@gmail.com</span></div>
      <div class="info-row"><span class="info-lbl">نطاق الصلاحية بالمنصة:</span><span class="info-val-ar">إدارة عامة • فرع البقاع الأوسط + بعلبك</span></div>
      <div class="info-row"><span class="info-lbl">الموقع الميداني:</span><span class="info-val-ar">البقاع - تعلبايا - شارع الصنوبر</span></div>
    </div>
  </div>

  <div class="section-title">
    <span class="section-num">1</span>
    <span>بروتوكول إرسال المهام اليومية لرؤى ومتابعة التنفيذ (Daily Management SOP)</span>
  </div>

  <p style="margin: 0 0 6px; font-size: 11px; color: #374151;">
    لكي تضمن إنجاز رؤى للمهام اليومية بانتظام وتوثيقها في دفتر تدريبها الجامعي، يمكنك اعتماد هذا النموذج السريع يومياً عبر واتساب:
  </p>

  <div class="card">
    <div class="card-header">
      <span>📱 نموذج الرسالة الصباحية اليومية (Daily Morning Task Brief)</span>
      <span class="card-tag">يُرسل صباحاً من المشرف عمر إلى رؤى</span>
    </div>
    <div class="script-box-ar">
صباح الخير رؤى 🌸
مهامكِ لليوم على منصة الشفاء ([اليوم والـتاريخ]):
1. مراجعة وتدقيق الحالات الإسعافية المدخلة أمس لفرعي البقاع الأوسط وبعلبك والتأكد من اكتمال أسماء المسعفين.
2. فحص قسم الأصول المعارة (Borrowed Assets) وتحديث الحالات المستحقة للإرجاع اليوم.
3. تدقيق إيصالات المصاريف المدخلة والتأكد من إرفاق صور الفواتير بوضوح.
4. إدخال وتعديل جدول دوامات المسعفين للأسبوع القادم لفرع [البقاع الأوسط / بعلبك].
⚠️ يرجى تدوين ملخص إنجازكِ وساعات العمل اليومية في مسوّدة تقرير الأسبوع (Week Progress Log).
بالتوفيق!
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <span>📋 نموذج التحقق المسائي (Daily Evening Check-in)</span>
      <span class="card-tag">يُطلب عند نهاية الدوام</span>
    </div>
    <div class="script-box-ar">
مرحباً رؤى، يرجى إرسال التقرير اليومي السريع:
- ما هي الحالات والسندات والدوامات التي تم تدقيقها اليوم؟
- هل واجهتِ أي نقص في البيانات أو مشكلة في إدخالات المسعفين؟
- كم عدد الساعات المنجزة اليوم ليتم توثيقها واعتمادها في دفتر الجامعة؟
    </div>
  </div>

  <div class="note-box-blue">
    💡 <strong>التأصيل الأكاديمي لتدريب الـ MIS:</strong> جوهر تدريب نظم المعلومات الإدارية هو برهنة قدرة الطالبة على <em>إدارة البيانات، مراقبة دقتها وجودتها، التحقق من الإجراءات المالية واللوجستية، واستخراج تقارير إحصائية تدعم قرارات الإدارة</em>.
  </div>

  <div class="footer-bar">
    <div>جمعية الشفاء للخدمات الطبية • خطة تدريب الـ MIS المعتمدة</div>
    <div>الصفحة 1 من 5</div>
  </div>
</div>

<!-- PAGE 2: Phase II - Weeks 1 & 2 (Emergency Cases & Medical Assets) -->
<div class="page">
  <div class="header-box">
    <div class="header-info">
      <h2 style="font-size: 15px; font-weight: 800; color: #C22129; margin: 0;">المرحلة الثانية: تقرير التقدم الأول (Phase II: Progress Report I - Weeks 1 & 2)</h2>
      <p class="org-sub">جاهز للنقل المباشر إلى استمارة الجامعة الرسمية (FOB-F09 Page 5)</p>
    </div>
    <div class="header-logo">
      <img src="data:image/png;base64,${subLogoBase64}" alt="Al Shifaa Sub Logo" style="height: 42px;">
    </div>
  </div>

  <div class="note-box">
    ✍️ <strong>توجيه للمتدربة رؤى:</strong> النصوص باللغة الإنجليزية في الجداول أدناه مُصاغة بأعلى معايير الـ MIS الأكاديمية. يمكنكِ نقلها مباشرة في استمارة الجامعة الرسمية في خانة <em>(Performed Tasks and Responsibilities)</em> مع التاريخ وساعات العمل.
  </div>

  <!-- Week 1 Table -->
  <div class="card">
    <div class="card-header">
      <span>الأسبوع الأول (Week 1): تهيئة النظام وإدارة بيانات الحالات الإسعافية لكلا الفرعين</span>
      <span class="card-tag-red">Conducted Hours: 25 hrs</span>
    </div>
    <table class="table-en">
      <thead>
        <tr>
          <th style="width: 12%;">Week</th>
          <th style="width: 16%;">Date Range</th>
          <th style="width: 14%;">Hours</th>
          <th>Performed Tasks and Responsibilities (Official University Logbook Entry)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>1st Week</strong></td>
          <td>19/10/2026 - 24/10/2026</td>
          <td><strong>25 Hours</strong></td>
          <td>
            • System Orientation: Initialized and configured dual-branch general administrator access (Bekaa & Baalback regional centers) on Al-Shifaa cloud platform.<br>
            • Emergency Cases Data Processing: Audited daily paramedic intervention records, validating patient demographic fields, emergency triage classifications, assigned paramedic crews, and dispatch branches.<br>
            • Data Quality Assurance: Identified missing demographic entries in field reports and communicated with field supervisors to reconcile log inconsistencies.<br>
            • Operations Reporting: Synthesized weekly case volume summaries comparing Central Bekaa vs. Baalback emergency call volumes and response trends.
          </td>
        </tr>
      </tbody>
    </table>
    <div style="font-size: 10.5px; color: #4B5563;">
      <strong>توزيع المهام اليومية للأسبوع 1:</strong> تدريبها على واجهة المنصة (اليوم 1) • تدقيق حالات فرع البقاع (اليوم 2) • تدقيق حالات فرع بعلبك (اليوم 3) • معالجة الأخطاء وحالات غسيل الكلى (اليوم 4) • استخراج تقرير الحالات الأسبوعي ومقارنة الفروع (اليوم 5).
    </div>
  </div>

  <!-- Week 2 Table -->
  <div class="card">
    <div class="card-header">
      <span>الأسبوع الثاني (Week 2): نظام إدارة الأصول الطبية وإعارة المعدات الإنسانية للمجتمع</span>
      <span class="card-tag-red">Conducted Hours: 25 hrs</span>
    </div>
    <table class="table-en">
      <thead>
        <tr>
          <th style="width: 12%;">Week</th>
          <th style="width: 16%;">Date Range</th>
          <th style="width: 14%;">Hours</th>
          <th>Performed Tasks and Responsibilities (Official University Logbook Entry)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>2nd Week</strong></td>
          <td>26/10/2026 - 31/10/2026</td>
          <td><strong>25 Hours</strong></td>
          <td>
            • Medical Inventory Information Tracking: Maintained equipment asset registers across both centers (ambulances, defibrillators, oxygen tanks, medical beds).<br>
            • Community Loan Management (Borrowed Assets): Cataloged patient loan applications for medical equipment (wheelchairs, portable oxygen concentrators, hospital beds) with borrower verification.<br>
            • Return Lifecycle Auditing: Tracked overdue borrowed equipment, notified beneficiaries regarding return schedules or extension approvals, and logged asset return inspections.<br>
            • Logistics Analysis: Evaluated asset turnover rates to identify critical equipment shortages across the Baalback operational sector.
          </td>
        </tr>
      </tbody>
    </table>
    <div style="font-size: 10.5px; color: #4B5563;">
      <strong>توزيع المهام اليومية للأسبوع 2:</strong> جرد الأصول الثابتة لكلا الفرعين (اليوم 1) • فحص الأجهزة المعارة للمرضى (اليوم 2) • متابعة الإرجاعات المتأخرة والاتصال بالمستفيدين (اليوم 3) • توثيق صيانة الأجهزة (اليوم 4) • إعداد تقرير جرد المعدات الطبية (اليوم 5).
    </div>
  </div>

  <div class="footer-bar">
    <div>جمعية الشفاء للخدمات الطبية • خطة تدريب الـ MIS المعتمدة</div>
    <div>الصفحة 2 من 5</div>
  </div>
</div>

<!-- PAGE 3: Phase II - Weeks 3 & 4 (Financial Systems & Shift Scheduling) -->
<div class="page">
  <div class="header-box">
    <div class="header-info">
      <h2 style="font-size: 15px; font-weight: 800; color: #C22129; margin: 0;">المرحلة الثانية: تقرير التقدم الأول (Phase II: Progress Report I - Weeks 3 & 4)</h2>
      <p class="org-sub">جاهز للنقل المباشر إلى استمارة الجامعة الرسمية (FOB-F09 Page 6)</p>
    </div>
    <div class="header-logo">
      <img src="data:image/png;base64,${subLogoBase64}" alt="Al Shifaa Sub Logo" style="height: 42px;">
    </div>
  </div>

  <!-- Week 3 Table -->
  <div class="card">
    <div class="card-header">
      <span>الأسبوع الثالث (Week 3): أتمتة وتدقيق المصاريف المالية وإيصالات الفواتير الرقمية</span>
      <span class="card-tag-red">Conducted Hours: 25 hrs</span>
    </div>
    <table class="table-en">
      <thead>
        <tr>
          <th style="width: 12%;">Week</th>
          <th style="width: 16%;">Date Range</th>
          <th style="width: 14%;">Hours</th>
          <th>Performed Tasks and Responsibilities (Official University Logbook Entry)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>3rd Week</strong></td>
          <td>02/11/2026 - 07/11/2026</td>
          <td><strong>25 Hours</strong></td>
          <td>
            • Financial Information Systems Processing: Recorded and audited operational disbursements (ambulance fuel receipts, mechanical maintenance, medical consumables, medication refills).<br>
            • Digital Invoice Archiving: Verified digital receipt scans uploaded to cloud expense entries, validating fiscal amounts, vendor credentials, and category compliance.<br>
            • Donation Tracking & Ledger Entry: Cataloged incoming financial and in-kind medical donations by donor category, generating official receipt acknowledgments.<br>
            • Financial Reconciliation: Reconciled petty cash disbursements against cloud ledger entries for both regional centers, noting variance justifications.
          </td>
        </tr>
      </tbody>
    </table>
    <div style="font-size: 10.5px; color: #4B5563;">
      <strong>توزيع المهام اليومية للأسبوع 3:</strong> مراجعة فواتير المحروقات وصيانة الآليات (اليوم 1) • تدقيق فواتير الأدوية والمستلزمات الطبية (اليوم 2) • التأكد من وضوح صور الفواتير المرفوعة على المنصة (اليوم 3) • تدقيق سجل التبرعات (اليوم 4) • إعداد ميزان المصاريف الشهري (اليوم 5).
    </div>
  </div>

  <!-- Week 4 Table -->
  <div class="card">
    <div class="card-header">
      <span>الأسبوع الرابع (Week 4): جدولة دوامات الكوادر الطبية والمناوبات الأسبوعية الرقمية</span>
      <span class="card-tag-red">Conducted Hours: 25 hrs</span>
    </div>
    <table class="table-en">
      <thead>
        <tr>
          <th style="width: 12%;">Week</th>
          <th style="width: 16%;">Date Range</th>
          <th style="width: 14%;">Hours</th>
          <th>Performed Tasks and Responsibilities (Official University Logbook Entry)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>4th Week</strong></td>
          <td>09/11/2026 - 14/11/2026</td>
          <td><strong>25 Hours</strong></td>
          <td>
            • Shift Management System Administration: Scheduled weekly paramedic rosters across 4 operational shifts per day for Central Bekaa and Baalback centers.<br>
            • Supervisor Allocation & Crew Balancing: Assigned daily on-call emergency medical supervisors and balanced crew rosters based on emergency paramedic certifications.<br>
            • Schedule Publishing: Exported finalized weekly schedule PDFs, synchronized digital shifts with mobile dispatch channels, and handled shift swap requests.<br>
            • Medical Personnel Database Maintenance: Updated paramedic contact files, volunteer status, and specialty certifications in the Medical Team module.
          </td>
        </tr>
      </tbody>
    </table>
    <div style="font-size: 10.5px; color: #4B5563;">
      <strong>توزيع المهام اليومية للأسبوع 4:</strong> مراجعة كادر المسعفين في كلا الفرعين (اليوم 1) • بناء جدول دوام البقاع الأوسط لـ 4 فترات يومياً (اليوم 2) • بناء جدول دوام بعلبك وتعيين المشرفين (اليوم 3) • تصدير وطباعة الجداول (اليوم 4) • معالجة طلبات التبديل والغياب الطارئ (اليوم 5).
    </div>
  </div>

  <div class="note-box">
    ✍️ <strong>توقيع واعتماد المشرف عمر مختار:</strong> بنهاية الأسبوع الرابع، يتم توقيع وختم استمارة <em>Phase II: Progress Report I</em> (الصفحتين 5 و 6 في دفتر AUL) وإرفاق الختم الرسمي لجمعية الشفاء.
  </div>

  <div class="footer-bar">
    <div>جمعية الشفاء للخدمات الطبية • خطة تدريب الـ MIS المعتمدة</div>
    <div>الصفحة 3 من 5</div>
  </div>
</div>

<!-- PAGE 4: Phase III - Weeks 5 & 6 (QR Attendance, Analytics & Optimization) -->
<div class="page">
  <div class="header-box">
    <div class="header-info">
      <h2 style="font-size: 15px; font-weight: 800; color: #C22129; margin: 0;">المرحلة الثالثة: تقرير التقدم الثاني (Phase III: Progress Report II - Weeks 5 & 6)</h2>
      <p class="org-sub">جاهز للنقل المباشر إلى استمارة الجامعة الرسمية (FOB-F09 Page 7 & 8)</p>
    </div>
    <div class="header-logo">
      <img src="data:image/png;base64,${subLogoBase64}" alt="Al Shifaa Sub Logo" style="height: 42px;">
    </div>
  </div>

  <!-- Week 5 Table -->
  <div class="card">
    <div class="card-header">
      <span>الأسبوع الخامس (Week 5): نظام الحضور والانصراف الذكي عبر رمز الاستجابة السريعة (QR Code)</span>
      <span class="card-tag-red">Conducted Hours: 25 hrs</span>
    </div>
    <table class="table-en">
      <thead>
        <tr>
          <th style="width: 12%;">Week</th>
          <th style="width: 16%;">Date Range</th>
          <th style="width: 14%;">Hours</th>
          <th>Performed Tasks and Responsibilities (Official University Logbook Entry)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>5th Week</strong></td>
          <td>16/11/2026 - 21/11/2026</td>
          <td><strong>25 Hours</strong></td>
          <td>
            • QR Code Attendance System Supervision: Monitored real-time paramedic check-in/check-out logs collected via station QR code attendance portals.<br>
            • Time & Attendance Discrepancy Auditing: Cross-referenced actual check-in timestamps against scheduled shift timetables to track punctuality, overtime, and uncovered hours.<br>
            • Monthly Attendance Synthesis: Extracted monthly attendance sheets for volunteer stipends and administrative evaluation.<br>
            • Mobile Usability Testing: Conducted field usability checks on the mobile attendance form across different paramedic devices to verify responsive UI and fast submission.
          </td>
        </tr>
      </tbody>
    </table>
    <div style="font-size: 10.5px; color: #4B5563;">
      <strong>توزيع المهام اليومية للأسبوع 5:</strong> مراقبة سجل الحضور اليومي للمسعفين (اليوم 1) • مطابقة الحضور الفعلي مع جدول المناوبات (اليوم 2) • معالجة حالات نسيان المسح أو التأخير (اليوم 3) • استخراج تقرير ساعات التطوع لكل مسعف (اليوم 4) • إعداد تقرير الحضور الشهري (اليوم 5).
    </div>
  </div>

  <!-- Week 6 Table -->
  <div class="card">
    <div class="card-header">
      <span>الأسبوع السادس (Week 6): تحليل نظم المعلومات، إعداد التقارير الإحصائية ومؤشرات الأداء (KPIs)</span>
      <span class="card-tag-red">Conducted Hours: 25 hrs</span>
    </div>
    <table class="table-en">
      <thead>
        <tr>
          <th style="width: 12%;">Week</th>
          <th style="width: 16%;">Date Range</th>
          <th style="width: 14%;">Hours</th>
          <th>Performed Tasks and Responsibilities (Official University Logbook Entry)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>6th Week</strong></td>
          <td>23/11/2026 - 28/11/2026</td>
          <td><strong>25 Hours</strong></td>
          <td>
            • Cross-Branch Business Analytics: Consolidated operational metrics combining emergency cases, medical asset utilization, and financial expenditures.<br>
            • Decision Support Reporting: Drafted monthly executive KPI dashboards for regional leadership comparing emergency dispatch response times.<br>
            • System Process Optimization: Documented user workflow bottlenecks in data entry and proposed UI simplifications for field paramedic adoption.<br>
            • Data Security Review: Audited user permission boundaries, verifying that operational staff access remains strictly aligned with branch mandates.
          </td>
        </tr>
      </tbody>
    </table>
    <div style="font-size: 10.5px; color: #4B5563;">
      <strong>توزيع المهام اليومية للأسبوع 6:</strong> دمج بيانات الفرعين واستخراج مؤشرات الأداء (اليوم 1) • تحليل كفاءة استهلاك الوقود للحالات الإسعافية (اليوم 2) • كتابة مقترحات تحسين تجربة المستخدم على المنصة (اليوم 3) • تدقيق أمان وصلاحيات الحسابات (اليوم 4) • إعداد التقرير الإداري الختامي (اليوم 5).
    </div>
  </div>

  <div class="note-box-blue">
    📊 <strong>إجمالي الساعات المعتمدة للتدريب (Total Hours):</strong> <strong>150 ساعة عمل تدريبي</strong> (25 ساعة × 6 أسابيع)، وهو معدل مثالي يغطي المتطلبات الأكاديمية لمقرر MIS 425 في الجامعة اللبنانية الكندية / AUL.
  </div>

  <div class="footer-bar">
    <div>جمعية الشفاء للخدمات الطبية • خطة تدريب الـ MIS المعتمدة</div>
    <div>الصفحة 4 من 5</div>
  </div>
</div>

<!-- PAGE 5: Final Report Guidelines, SWOT Analysis & Graduation Presentation -->
<div class="page">
  <div class="header-box">
    <div class="header-info">
      <h2 style="font-size: 15px; font-weight: 800; color: #C22129; margin: 0;">دليل التقرير النهائي وعرض التخرج (Final Report & CECCC Presentation)</h2>
      <p class="org-sub">مرجع شامل للمتدربة لرسم الهيكل الأكاديمي، تحليل SWOT، وتحضير سلايدات الـ PowerPoint</p>
    </div>
    <div class="header-logo">
      <img src="data:image/png;base64,${subLogoBase64}" alt="Al Shifaa Sub Logo" style="height: 42px;">
    </div>
  </div>

  <div class="section-title">
    <span class="section-num">2</span>
    <span>محتوى الفصول للتقرير النهائي للجامعة (Final Report - Pages 10-16 in Booklet)</span>
  </div>

  <table style="font-size: 10px; margin-bottom: 6px;">
    <thead>
      <tr>
        <th style="width: 25%;">Section / Chapter</th>
        <th>What Roaa Should Write (Based on Al-Shifaa System Experience)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Introduction (P. 11)</strong></td>
        <td>Introduction to Al-Shifaa Medical Services; motivation to apply MIS skills in humanitarian health; expected benefits in live ERP management, cross-branch data synchronization, and emergency logistics tracking.</td>
      </tr>
      <tr>
        <td><strong>Chapter I (P. 12)<br>Company Background</strong></td>
        <td>
          • <strong>Mission & Vision:</strong> Delivering swift, reliable emergency medical care and relief services in Lebanon.<br>
          • <strong>Org Structure:</strong> Board of Directors → General Management (Omar Mokhtar) → Central Bekaa & Baalback Branch Managers → Emergency Medics & Dispatch Teams.<br>
          • <strong>Workforce:</strong> Over 50+ paramedics, emergency drivers, and specialized healthcare volunteers.
        </td>
      </tr>
      <tr>
        <td><strong>Chapter II (P. 13)<br>Department & Duties</strong></td>
        <td>
          • <strong>Department:</strong> Management Information Systems (MIS) & General Administration.<br>
          • <strong>Job Title:</strong> Systems Administrator & Operations Data Analyst Intern.<br>
          • <strong>MIS Integration:</strong> Applied Database Management (DBMS), Human Resource Information Systems (HRIS), and Cloud Decision Support Systems (DSS) to Al-Shifaa workflows.
        </td>
      </tr>
      <tr>
        <td><strong>Chapter II (P. 13)<br>SWOT Analysis</strong></td>
        <td>
          • <strong>Strengths (S):</strong> Real-time cloud sync across branches; QR code mobile attendance; invoice digital archiving.<br>
          • <strong>Weaknesses (W):</strong> Manual field log transcription by some volunteers; occasional connectivity delays in remote areas.<br>
          • <strong>Opportunities (O):</strong> Automated SMS return reminders for borrowed assets; GPS ambulance route tracking.<br>
          • <strong>Threats (T):</strong> High fuel price inflation; currency volatility affecting medical consumable procurement.
        </td>
      </tr>
      <tr>
        <td><strong>Conclusion & Future (P. 14-15)</strong></td>
        <td>Summary of professional growth, technical mastery of live web ERP systems, and career ambition to specialize in Health Informatics and Cloud Enterprise Systems.</td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">
    <span class="section-num">3</span>
    <span>خطة شرائح الـ PowerPoint للمقابلة التقييمية (CECCC Assessment Presentation)</span>
  </div>

  <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; font-size: 10px;">
    <div style="background: #F8FAFC; padding: 6px 9px; border-radius: 6px; border: 1px solid #CBD5E1;">
      <strong>Slide 1:</strong> Title (Practical Training - Al-Shifaa, Student, Supervisor, AUL Logo).<br>
      <strong>Slide 2:</strong> Organization Background, Mission, Vision, and Two Branches.<br>
      <strong>Slide 3:</strong> Department of Training & Dual-Branch General Admin Role.
    </div>
    <div style="background: #F8FAFC; padding: 6px 9px; border-radius: 6px; border: 1px solid #CBD5E1;">
      <strong>Slide 4:</strong> Core Responsibilities (Cases, Assets, Financial Receipts, Shifts).<br>
      <strong>Slide 5:</strong> Academic Link: How MIS Theory was applied to real medical workflows.<br>
      <strong>Slide 6:</strong> SWOT Analysis & Proposed Future Digital Innovations (5-10 slides total).
    </div>
  </div>

  <div class="section-title">
    <span class="section-num">4</span>
    <span>إفادة إنهاء التدريب الرسمية (To Whom It May Concern - Page 18)</span>
  </div>
  <div style="background: #F1F5F9; padding: 6px 10px; border-radius: 6px; font-size: 10px; border-left: 3px solid #059669;">
    بمجرد إتمام الـ 150 ساعة تدريبية، يقوم المشرف <strong>عمر مختار</strong> بتعبئة وتوقيع وختم شهادة الخبرة الرسمية الموجودة في الصفحة 18 من الدفتر الجامعي لتسليمها للجامعة لاعتماد النجاح في مقرر MIS 425.
  </div>

  <div class="footer-bar">
    <div>جمعية الشفاء للخدمات الطبية • خطة تدريب الـ MIS المعتمدة</div>
    <div>الصفحة 5 من 5</div>
  </div>
</div>

</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, 'internship_plan_template.html'), htmlContent);
console.log('HTML internship plan generated successfully.');
