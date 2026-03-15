const fs = require('fs');
const file = './src/pages/Cases.jsx';
let content = fs.readFileSync(file, 'utf8');

// handleEdit Mapping
content = content.replace(
    /const pts = \[\];\n        for \(let i = 0; i < count; i\+\+\) \{\n            pts\.push\(\{\n                الجنس: caseData\[7 \+ \(i \* 2\)\] \|\| "",\n                الفئة_العمرية: caseData\[8 \+ \(i \* 2\)\] \|\| "غير محدد"\n            \}\);\n        \}/g,
    `const pts = [];
        for (let i = 0; i < count; i++) {
            pts.push({
                الجنس: caseData[7 + (i * 2)] || "",
                الفئة_العمرية: caseData[8 + (i * 2)] || "غير محدد"
            });
        }`
);

// Apply filter logic (Stats)
content = content.replace(
    /let count = parseInt\(c\[6\]\) \|\| 1;/g,
    `let count = parseInt(c[6]) || 1;`
);

content = content.replace(
    /const gender = c\[7 \+ \(i \* 2\)\];/g,
    `const gender = c[7 + (i * 2)];`
);

content = content.replace(
    /const ageKey = c\[8 \+ \(i \* 2\)\] \|\| "غير محدد";/g,
    `const ageKey = c[8 + (i * 2)] || "غير محدد";`
);

fs.writeFileSync(file, content);
console.log('Script ran!');
