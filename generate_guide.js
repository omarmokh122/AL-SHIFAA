const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const mainLogoBase64 = fs.readFileSync(path.join(__dirname, 'frontend/src/assets/main_logo.png')).toString('base64');
const subLogoBase64 = fs.readFileSync(path.join(__dirname, 'frontend/src/assets/sub-logo.png')).toString('base64');

const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>دليل المستخدم لمنصة جمعية الشفاء - رؤى</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  @page {
    size: A4;
    margin: 14mm 16mm;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body {
    font-family: 'Cairo', 'Tajawal', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #1f2937;
    background: #ffffff;
    margin: 0;
    padding: 0;
    font-size: 13px;
    line-height: 1.6;
  }
  .page {
    page-break-after: always;
    position: relative;
    padding-bottom: 30px;
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
    padding-bottom: 12px;
    margin-bottom: 20px;
  }
  .header-info {
    text-align: right;
  }
  .org-name {
    font-size: 19px;
    font-weight: 800;
    color: #C22129;
    margin: 0;
  }
  .org-sub {
    font-size: 12px;
    color: #4b5563;
    font-weight: 600;
    margin: 2px 0 0;
  }
  .doc-badge {
    display: inline-block;
    background: #FEF2F2;
    color: #991B1B;
    border: 1px solid #FCA5A5;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    margin-top: 5px;
  }
  .header-logo img {
    height: 65px;
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
    padding-top: 8px;
    font-size: 10.5px;
    color: #6b7280;
  }

  /* Cover Banner */
  .hero-banner {
    background: linear-gradient(135deg, #C22129 0%, #991B1B 100%);
    color: white;
    padding: 24px 28px;
    border-radius: 12px;
    margin-bottom: 24px;
    box-shadow: 0 4px 12px rgba(194, 33, 41, 0.15);
  }
  .hero-title {
    font-size: 22px;
    font-weight: 900;
    margin: 0 0 6px 0;
  }
  .hero-desc {
    font-size: 13px;
    opacity: 0.95;
    margin: 0;
    line-height: 1.6;
  }

  /* Credentials Card */
  .credentials-card {
    background: #FFFBEB;
    border: 2px solid #F59E0B;
    border-radius: 12px;
    padding: 18px 20px;
    margin-bottom: 24px;
  }
  .credentials-header {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #B45309;
    font-size: 16px;
    font-weight: 800;
    margin-bottom: 14px;
    border-bottom: 1px dashed #FCD34D;
    padding-bottom: 8px;
  }
  .cred-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px 18px;
  }
  .cred-item {
    background: white;
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid #FDE68A;
  }
  .cred-label {
    font-size: 11px;
    color: #6b7280;
    font-weight: 600;
    margin-bottom: 4px;
  }
  .cred-value {
    font-size: 14px;
    font-weight: 800;
    color: #111827;
    font-family: 'Cairo', monospace;
    direction: ltr;
    display: inline-block;
  }
  .cred-value-ar {
    font-size: 13.5px;
    font-weight: 700;
    color: #111827;
  }

  /* Section Styling */
  .section-title {
    font-size: 16px;
    font-weight: 800;
    color: #C22129;
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 20px 0 12px;
    padding-bottom: 6px;
    border-bottom: 1.5px solid #F3F4F6;
  }
  .section-number {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: #C22129;
    color: white;
    border-radius: 50%;
    font-size: 12px;
    font-weight: bold;
  }

  /* Steps / Cards */
  .module-card {
    background: #F9FAFB;
    border: 1px solid #E5E7EB;
    border-radius: 10px;
    padding: 14px 16px;
    margin-bottom: 14px;
    page-break-inside: avoid;
  }
  .module-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  .module-name {
    font-size: 14px;
    font-weight: 800;
    color: #111827;
  }
  .module-tag {
    background: #E5E7EB;
    color: #374151;
    font-size: 10.5px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 12px;
  }
  .module-desc {
    font-size: 12px;
    color: #4b5563;
    margin: 0 0 8px 0;
  }
  .module-steps {
    margin: 0;
    padding-right: 20px;
    font-size: 12px;
    color: #1f2937;
  }
  .module-steps li {
    margin-bottom: 4px;
  }

  /* Alert / Note Box */
  .note-box {
    background: #EFF6FF;
    border-right: 4px solid #2563EB;
    padding: 10px 14px;
    border-radius: 0 8px 8px 0;
    font-size: 12px;
    color: #1E40AF;
    margin: 12px 0;
  }

  /* Role details table */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    font-size: 12px;
  }
  th, td {
    padding: 8px 12px;
    text-align: right;
    border-bottom: 1px solid #E5E7EB;
  }
  th {
    background: #F3F4F6;
    color: #374151;
    font-weight: 700;
  }
  .status-badge-green {
    background: #DEF7EC;
    color: #03543F;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 700;
  }
  .status-badge-red {
    background: #FDE8E8;
    color: #9B1C1C;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 700;
  }
</style>
</head>
<body>

<!-- PAGE 1: Cover & Credentials & Overview -->
<div class="page">
  <div class="header-box">
    <div class="header-info">
      <h1 class="org-name">جمعية الشفاء للخدمات الطبية الإنسانية</h1>
      <p class="org-sub">المنظومة السحابية الموحدة لإدارة العمليات الميدانية والإدارية</p>
      <div class="doc-badge">وثيقة تهيئة واستخدام معتمدة • 2026</div>
    </div>
    <div class="header-logo">
      <img src="data:image/png;base64,${mainLogoBase64}" alt="Al Shifaa Logo">
    </div>
  </div>

  <div class="hero-banner">
    <div class="hero-title">دليل المستخدم الرسمي وشرح النظام خطوة بخطوة</div>
    <div class="hero-desc">
      مرحباً بكِ زميلتنا العزيزة <strong>رؤى (Roaa)</strong> في منصة جمعية الشفاء للخدمات الطبية.
      تم إعداد هذا الدليل ليكون مرجعكِ المتكامل لكيفية إدارة أقسام النظام، إدخال وتعديل البيانات، ومتابعة العمليات اليومية في كلا الفرعين بكل سهولة وسلاسة.
    </div>
  </div>

  <div class="credentials-card">
    <div class="credentials-header">
      <span>🔐</span> بيانات تسجيل الدخول الرسمية الخاصة بكِ (Credentials)
    </div>
    <div class="cred-grid">
      <div class="cred-item">
        <div class="cred-label">رابط المنصة الإلكترونية (Platform URL)</div>
        <div class="cred-value" style="color: #2563EB;">https://al-shifaa.vercel.app/login</div>
      </div>
      <div class="cred-item">
        <div class="cred-label">اسم المستخدم (Username)</div>
        <div class="cred-value">roaa</div>
      </div>
      <div class="cred-item">
        <div class="cred-label">كلمة المرور (Password)</div>
        <div class="cred-value" style="letter-spacing: 0.5px;">roaa_shifaa_2026</div>
      </div>
      <div class="cred-item">
        <div class="cred-label">طبيعة الصلاحية (Role Scope)</div>
        <div class="cred-value-ar" style="color: #047857;">إدارة عامة • صلاحية كاملة لكلا الفرعين</div>
      </div>
    </div>
  </div>

  <div class="section-title">
    <span class="section-number">1</span>
    <span>نطاق الصلاحيات والفروع الممنوحة لحسابكِ</span>
  </div>
  <p style="margin: 0 0 10px; font-size: 12.5px; color: #374151;">
    تم ضبط حسابكِ بصفة <strong>إدارة عامة لكلا الفرعين (Dual-Branch Management)</strong>، مما يتيح لكِ الاطلاع الكامل والتحكم الشامل بجميع أقسام المنصة، مع مراعاة سياسة الأمان الداخلية للنظام:
  </p>

  <table>
    <thead>
      <tr>
        <th>القسم / الصلاحية</th>
        <th>نطاق الوصول المتاح لحسابكِ</th>
        <th>الحالة</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>نطاق الفروع</strong></td>
        <td>فرع <strong>البقاع الأوسط</strong> + فرع <strong>بعلبك</strong> + عرض <strong>جميع الفروع معاً</strong></td>
        <td><span class="status-badge-green">متاح بالكامل</span></td>
      </tr>
      <tr>
        <td><strong>إدارة الحالات الطبية</strong></td>
        <td>إضافة حالات، تعديل، أرشفة، وتصدير التقارير الشهرية</td>
        <td><span class="status-badge-green">صلاحية كاملة</span></td>
      </tr>
      <tr>
        <td><strong>المصاريف والمالية</strong></td>
        <td>تسجيل النفقات، إرفاق صور الفواتير، وتحميل التقرير المالي</td>
        <td><span class="status-badge-green">صلاحية كاملة</span></td>
      </tr>
      <tr>
        <td><strong>الأصول وإعارة المعدات</strong></td>
        <td>متابعة المخزون، إعارة المعدات الطبية للمرضى، وتتبع الإرجاع</td>
        <td><span class="status-badge-green">صلاحية كاملة</span></td>
      </tr>
      <tr>
        <td><strong>الفرق الطبية والدوامات</strong></td>
        <td>سجلات المسعفين، توزيع المناوبات الأسبوعية، وتتبع الحضور</td>
        <td><span class="status-badge-green">صلاحية كاملة</span></td>
      </tr>
      <tr>
        <td><strong>سجل النشاطات الفنية (Logs)</strong></td>
        <td>سجل العمليات التقنية وأجهزة الدخول (مخصص فقط لمدير النظام التقني)</td>
        <td><span class="status-badge-red">محجوب ومستثنى</span></td>
      </tr>
    </tbody>
  </table>

  <div class="note-box">
    💡 <strong>ملاحظة هامة:</strong> عند الدخول إلى أي قسم، ستجدين دائماً قائمة لاختيار الفرع (البقاع الأوسط أو بعلبك أو جميع الفروع)، مما يسهل عليكِ التبديل بين المراكز بضغطة زر واحدة.
  </div>

  <div class="footer-bar">
    <div>جمعية الشفاء للخدمات الطبية • دليل المستخدم المعتمد</div>
    <div>الصفحة 1 من 3</div>
  </div>
</div>

<!-- PAGE 2: Step-by-Step System Walkthrough (Part 1) -->
<div class="page">
  <div class="header-box">
    <div class="header-info">
      <h2 style="font-size: 15px; font-weight: 800; color: #C22129; margin: 0;">شرح استخدام أقسام النظام خطوة بخطوة (1/2)</h2>
      <p class="org-sub">دليل إرشادي تفصيلي لكل نافذة ووظيفة</p>
    </div>
    <div class="header-logo">
      <img src="data:image/png;base64,${subLogoBase64}" alt="Al Shifaa Sub Logo" style="height: 48px;">
    </div>
  </div>

  <!-- Step 1: Login -->
  <div class="module-card">
    <div class="module-head">
      <div class="module-name">1️⃣ تسجيل الدخول واختيار الفرع (Login & Branch Switcher)</div>
      <div class="module-tag">البداية</div>
    </div>
    <p class="module-desc">كيفية الدخول للنظام والتبديل بين الفروع بسلاسة:</p>
    <ul class="module-steps">
      <li>افتحي الرابط في المتصفح: <code>https://al-shifaa.vercel.app/login</code> (يعمل بكفاءة على الكمبيوتر والهاتف).</li>
      <li>أدخلي اسم المستخدم: <code>roaa</code> وكلمة المرور: <code>roaa_shifaa_2026</code> ثم اضغطي <strong>تسجيل الدخول</strong>.</li>
      <li>في الشريط العلوي (Header)، ستظهر صفة حسابكِ: <strong>مدير النظام – جميع الفروع</strong>.</li>
      <li>في كل صفحة، يمكنكِ تصفية النتائج بحسب الفرع عبر القائمة المنسدلة في أعلى الجداول أو النماذج.</li>
    </ul>
  </div>

  <!-- Step 2: Dashboard -->
  <div class="module-card">
    <div class="module-head">
      <div class="module-name">2️⃣ لوحة التحكم العامة (Dashboard)</div>
      <div class="module-tag">نظرة عامة</div>
    </div>
    <p class="module-desc">شاشة المراقبة المركزية لمؤشرات الأداء:</p>
    <ul class="module-steps">
      <li>تعرض لكِ إحصائيات سريعة: إجمالي الحالات المنقولة، التبرعات المجمعة، والمصاريف التشغيلية.</li>
      <li>يمكنكِ اختيار "جميع الفروع" لمشاهدة إحصائيات الجمعية المجمعة، أو اختيار فرع محدد لمعاينة نشاطه منفرداً.</li>
      <li>تتضمن رسوماً بيانية لسرعة تقييم الاحتياجات الميدانية والمخزون.</li>
    </ul>
  </div>

  <!-- Step 3: Cases -->
  <div class="module-card">
    <div class="module-head">
      <div class="module-name">3️⃣ الحالات الطبية والإسعافية (Cases)</div>
      <div class="module-tag">العمليات الميدانية</div>
    </div>
    <p class="module-desc">إدارة وتوثيق كل التدخلات الطبية ونقل المرضى:</p>
    <ul class="module-steps">
      <li><strong>إضافة حالة جديدة:</strong> اضغطي على زر "إضافة حالة"، ثم أدخلي (اسم المريض، العمر، نوع الحالة، الإجراء المتخذ، المسعف المسؤول، والفرع).</li>
      <li><strong>البحث والتصفية:</strong> يمكنكِ البحث برقم الحالة، اسم المريض، أو تاريخ التدخل الطبي.</li>
      <li><strong>تقرير الحالات الشهري:</strong> من القائمة، توجّهي إلى "تقارير الحالات الشهرية" لمعاينة إحصائيات كل شهر وطباعتها بضغطة زر بصيغة جاهزة للاجتماعات والجهات المانحة.</li>
    </ul>
  </div>

  <!-- Step 4: Financial -->
  <div class="module-card">
    <div class="module-head">
      <div class="module-name">4️⃣ المصاريف والمالية وإرفاق الفواتير (Financial)</div>
      <div class="module-tag">الإدارة المالية</div>
    </div>
    <p class="module-desc">تسجيل النفقات التشغيلية وضبط العهد مع إمكانية رفع الفواتير:</p>
    <ul class="module-steps">
      <li><strong>تسجيل مصروف:</strong> أدخلي بند الصرف (وقود سيارات الإسعاف، صيانة، مستلزمات طبية، أدوية، نثريات)، وحددي المبلغ والفرع والتاريخ.</li>
      <li><strong>إرفاق صورة الفاتورة (ميزة هامة):</strong> يمكنكِ رفع صورة الإيصال أو الفاتورة مباشرة من جهازكِ ليتم توثيقها رقمياً وأرشفتها.</li>
      <li><strong>التقرير المالي الشهري:</strong> يوفر لكِ كشف حساب دقيق للمصاريف الشهرية لكل فرع مع إمكانية التصدير والطباعة.</li>
    </ul>
  </div>

  <div class="footer-bar">
    <div>جمعية الشفاء للخدمات الطبية • دليل المستخدم المعتمد</div>
    <div>الصفحة 2 من 3</div>
  </div>
</div>

<!-- PAGE 3: Step-by-Step System Walkthrough (Part 2) & Best Practices -->
<div class="page">
  <div class="header-box">
    <div class="header-info">
      <h2 style="font-size: 15px; font-weight: 800; color: #C22129; margin: 0;">شرح استخدام أقسام النظام خطوة بخطوة (2/2)</h2>
      <p class="org-sub">المستودع، الأصول، الدوامات، وإرشادات الأمان</p>
    </div>
    <div class="header-logo">
      <img src="data:image/png;base64,${subLogoBase64}" alt="Al Shifaa Sub Logo" style="height: 48px;">
    </div>
  </div>

  <!-- Step 5: Assets -->
  <div class="module-card">
    <div class="module-head">
      <div class="module-name">5️⃣ إدارة الأصول وإعارة المعدات الطبية (Assets & Borrowed)</div>
      <div class="module-tag">المستودع والخدمة المجتمعية</div>
    </div>
    <p class="module-desc">متابعة موجودات المراكز وإعارة المعدات الإنسانية للمرضى في منازلهم:</p>
    <ul class="module-steps">
      <li><strong>الأصول الثابتة:</strong> جرد سيارات الإسعاف، أجهزة الصدمات، النقالات، والأجهزة الطبية المتوفرة في كل فرع وحالتها التشغيلية.</li>
      <li><strong>الأصول المعارة (Borrowed Assets):</strong> عند إعارة كرسي متحرك، ماكينة أوكسجين، أو سرير طبي لأي مريض، قومي بتسجيل اسم المستلم، رقم هاتفه، تاريخ الاستلام، وتاريخ الإرجاع المتوقع.</li>
      <li><strong>متابعة الإرجاع:</strong> يمكنكِ بضغطة زر وضع علامة "تم الإرجاع" فور استلام الجهاز من المريض وفحصه.</li>
    </ul>
  </div>

  <!-- Step 6: Medical Team -->
  <div class="module-card">
    <div class="module-head">
      <div class="module-name">6️⃣ الفرق الطبية وكادر المسعفين (Medical Team)</div>
      <div class="module-tag">إدارة الموارد البشرية</div>
    </div>
    <p class="module-desc">سجلات المتطوعين، المسعفين، والممرضين:</p>
    <ul class="module-steps">
      <li>دليل كامل بأسماء المسعفين في فرع البقاع الأوسط وفرع بعلبك، رتبهم، أرقام هواتفهم، وزمرة دمهم.</li>
      <li>يمكنكِ فتح "الملف الطبي" لأي مسعف لمراجعة مؤهلاته وسجل مشاركاته الميدانية.</li>
    </ul>
  </div>

  <!-- Step 7: Shift Management & Attendance -->
  <div class="module-card">
    <div class="module-head">
      <div class="module-name">7️⃣ إدارة الدوامات والمناوبات والحضور الذكي (Schedules & Attendance)</div>
      <div class="module-tag">تنظيم العمليات</div>
    </div>
    <p class="module-desc">جدول المناوبات الأسبوعي وتتبع الحضور اليومي:</p>
    <ul class="module-steps">
      <li><strong>دوامات المسعفين (Medic Schedules):</strong> جدول أسبوعي مقسم إلى 4 فترات يومياً. يمكنكِ سحب وإفلات أسماء المسعفين داخل المناوبات وتحديد المشرف المسؤول لكل يوم، ثم تصدير الجدول بصيغة PDF لتعليقه في المراكز.</li>
      <li><strong>تتبع الحضور (Attendance Tracker):</strong> مراقبة حضور وانصراف المسعفين في الوقت الفعلي.</li>
      <li><strong>تسجيل الحضور عبر QR:</strong> يتوفر رابط ونموذج مخصص للمسعفين لمسح الباركود عند بدء المناوبة وإنهاؤها تلقائياً.</li>
    </ul>
  </div>

  <!-- Best Practices -->
  <div class="section-title" style="margin-top: 14px;">
    <span>🛡️</span>
    <span>إرشادات وضوابط الاستخدام الآمن والفعال</span>
  </div>
  <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 11.5px;">
    <div style="background: #F3F4F6; padding: 10px 12px; border-radius: 8px; border-right: 3px solid #C22129;">
      <strong>1. سرية بيانات المرضى:</strong> معلومات الحالات الطبية وأرقام هواتف المستفيدين هي بيانات سرية وأمانة إنسانية.
    </div>
    <div style="background: #F3F4F6; padding: 10px 12px; border-radius: 8px; border-right: 3px solid #C22129;">
      <strong>2. دقة اختيار الفرع:</strong> يُرجى التأكد دائماً من تحديد الفرع المناسب (البقاع أو بعلبك) عند إضافة أي مصروف أو حالة.
    </div>
    <div style="background: #F3F4F6; padding: 10px 12px; border-radius: 8px; border-right: 3px solid #C22129;">
      <strong>3. تسجيل الخروج:</strong> احرصي على الضغط على زر "تسجيل الخروج" في نهاية كل جلسة عمل، خصوصاً عند استخدام جهاز مشترك.
    </div>
    <div style="background: #F3F4F6; padding: 10px 12px; border-radius: 8px; border-right: 3px solid #C22129;">
      <strong>4. الدعم الفني المستمر:</strong> لأي استفسار أو إضافة ميزات جديدة، يرجى التواصل مباشرة مع إدارة النظام.
    </div>
  </div>

  <div style="margin-top: 20px; text-align: center; font-size: 11px; color: #6b7280; border-top: 1px dashed #d1d5db; padding-top: 10px;">
    نتمنى لكِ كل التوفيق والنجاح في مهامكِ النبيلة خدمةً لأهلنا ولمجتمعنا • جمعية الشفاء للخدمات الطبية الإنسانية
  </div>

  <div class="footer-bar">
    <div>جمعية الشفاء للخدمات الطبية • دليل المستخدم المعتمد</div>
    <div>الصفحة 3 من 3</div>
  </div>
</div>

</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, 'guide_template.html'), htmlContent);
console.log('HTML guide template generated successfully.');
