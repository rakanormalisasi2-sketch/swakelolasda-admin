// Script sementara - jalankan dengan: node gen-wilayah.js
const XLSX = require('xlsx');
const fs = require('fs');
const wb = XLSX.readFile('C:/Users/dinas/OneDrive/Desktop/desa kecamatan.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, {header:1});
const result = {};
let currentKec = null;
data.slice(1).forEach(row => {
  const kec = row[1] ? String(row[1]).trim().toUpperCase() : null;
  const desa = row[6] ? String(row[6]).trim() : null;
  if (kec) currentKec = kec;
  if (currentKec && desa) {
    if (!result[currentKec]) result[currentKec] = [];
    result[currentKec].push(desa);
  }
});
let out = '// Data Wilayah Kabupaten Bojonegoro - dari file resmi desa kecamatan.xlsx\n';
out += '// ' + Object.keys(result).length + ' kecamatan, ' + Object.values(result).flat().length + ' total desa\n';
out += 'const WILAYAH_BOJONEGORO = {\n';
Object.entries(result).sort(([a],[b])=>a.localeCompare(b)).forEach(([kec, desas]) => {
  const desaStr = desas.map(d => JSON.stringify(d)).join(', ');
  out += '  ' + JSON.stringify(kec) + ': [' + desaStr + '],\n';
});
out += '};\n\nexport default WILAYAH_BOJONEGORO;\n';
fs.writeFileSync('src/lib/wilayah.js', out);

// Juga update mobile app
let mobileOut = '// Data Wilayah Kabupaten Bojonegoro - dari file resmi\n';
mobileOut += 'export const DESA_MAP: Record<string, string[]> = {\n';
Object.entries(result).sort(([a],[b])=>a.localeCompare(b)).forEach(([kec, desas]) => {
  const desaStr = desas.map(d => JSON.stringify(d)).join(', ');
  mobileOut += '  ' + JSON.stringify(kec) + ': [' + desaStr + '],\n';
});
mobileOut += '};\n';
fs.writeFileSync('wilayah-mobile-output.ts', mobileOut);

console.log('Done -', Object.keys(result).length, 'kecamatan,', Object.values(result).flat().length, 'desa');
