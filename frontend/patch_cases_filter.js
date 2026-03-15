const fs = require('fs');
const file = './src/pages/Cases.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /const searchStr = \`\$\{c\[18\]\} \$\{c\[5\]\}\`\.toLowerCase\(\);\n        const matchSearch = searchStr\.includes\(searchTerm\.toLowerCase\(\)\);\n        return matchBranch && matchType && matchSearch && matchDate;\n    \}\);\n\n    \/\* ===== Stats ===== \*\/\n    let male = 0;\n    let female = 0;\n    visibleCases\.forEach\(\(c\) => \{\n        const count = parseInt\(c\[6\]\) \|\| 1;\n        for \(let i = 0; i < count; i\+\+\) \{\n            const gender = c\[7 \+ \(i \* 2\)\];\n            if \(gender === "ذكر"\) male\+\+;\n            else if \(gender === "أنثى"\) female\+\+;\n        \}\n    \}\);\n\n    const typeStats = \{\};\n    visibleCases\.forEach\(\(c\) => \{\n        typeStats\[c\[5\]\] = \(typeStats\[c\[5\]\] \|\| 0\) \+ 1;\n    \}\);/g,
    `const searchStr = \`\$\{c\[16]\} \$\{c\[5]\}\`.toLowerCase();
        const matchSearch = searchStr.includes(searchTerm.toLowerCase());
        return matchBranch && matchType && matchSearch && matchDate;
    });

    /* ===== Stats ===== */
    let male = 0;
    let female = 0;
    visibleCases.forEach((c) => {
        const count = parseInt(c[6]) || 1;
        for (let i = 0; i < count; i++) {
            const gender = c[7 + (i * 2)];
            if (gender === "ذكر") male++;
            else if (gender === "أنثى") female++;
        }
    });

    const typeStats = {};
    visibleCases.forEach((c) => {
        typeStats[c[5]] = (typeStats[c[5]] || 0) + 1;
    });`
);

fs.writeFileSync(file, content);
console.log('Script ran!');
