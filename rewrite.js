const fs = require('fs');
const file = 'src/app/dashboard/seksi/perhitungan-rap/page.js';
let lines = fs.readFileSync(file, 'utf8').split('\n');
let out = [];
let i = 0;
while(i < lines.length) {
  let line = lines[i];

  // Remove TabBar
  if(line.includes('{/* Tab Bar */}')) {
    while(!lines[i].includes('{/* Tab Content */}')) i++;
  }
  
  // Replace condition with section wrapper
  else if(line.match(/^\s*\{activeTab === 'tab\d+' && \(\s*$/)) {
    let tabStr = line.match(/'tab\d+'/)[0].replace(/'/g, '');
    out.push('        <div id="section-' + tabStr + '" className="mb-12 space-y-6 pt-6">');
  }
  
  // Replace the closing braces for tabs. The tabs always end with a single `)}` right before the next `/* === TAB` or before `</div>` at the end
  else if(line.match(/^\s*\)\}\s*$/) && (
      (lines[i+1] && lines[i+1].includes('{/* ===================== TAB')) || 
      (lines[i+2] && lines[i+2].includes('{/* ===================== TAB')) ||
      (lines[i-1] && lines[i-1].includes('</Tooltip>')) || /* after tooltip */
      (lines[i+1] && lines[i+1].includes('onClose={() => setTooltip')) /* tab9 end */
  )) {
    out.push('        </div> {/* End Section */}');
  }
  else {
    out.push(line);
  }
  i++;
}

fs.writeFileSync(file, out.join('\n'));
console.log('Done rewriting page.js layout to vertical scroll!');
