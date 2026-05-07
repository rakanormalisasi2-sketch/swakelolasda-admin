const fs = require('fs');
const path = 'src/app/dashboard/seksi/perhitungan-rap/page.js';
let lines = fs.readFileSync(path, 'utf8').split('\n');

let inReturn = false;
let newLines = [];
let i = 0;

while (i < lines.length) {
  let line = lines[i];

  if (line.includes('return (') && line.includes('<div className="min-h-screen')) {
    inReturn = true;
  }

  // Hapus TabNavigation
  if (line.includes('{/* Tab Bar */}')) {
    while (!lines[i].includes('{/* Tab Content */}')) {
      i++;
    }
    line = lines[i];
  }

  // Hapus activeTab checks
  let match = line.match(/^\s*\{activeTab === 'tab\d+' && \(\s*$/);
  if (match) {
    i++;
    continue;
  }

  // Hapus penutup dari activeTab
  if (line.match(/^\s*\)\}\s*$/) && lines[i-1] && lines[i-1].includes('</div>')) {
     // A very risky heuristic. Let's not do heuristic matching.
  }

  newLines.push(line);
  i++;
}
// This script approach is too brittle.
