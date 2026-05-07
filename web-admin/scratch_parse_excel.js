const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const dirPath = "D:\\DATA\\GAWEAN 2025\\laporan normalisasi\\Laporan RAB normalisasi 2025\\master";
const files = ["pc 50.xlsx", "PC 100 .xlsx", "PC 200 LONG ARM.xlsx", "pc 200.xlsx", "PC75.xlsx"];

const results = {};

files.forEach(file => {
  const filePath = path.join(dirPath, file);
  if(fs.existsSync(filePath)) {
    const workbook = XLSX.readFile(filePath, { cellFormula: true });
    results[file] = {};
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      // Convert to JSON with formulas included if possible
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      // Attempt to capture formulas
      const richJson = json.map((row, R) => {
        return row.map((cellValue, C) => {
          const cellAddress = XLSX.utils.encode_cell({r: R, c: C});
          const cell = sheet[cellAddress];
          if(cell && cell.f) {
            return { v: cellValue, f: cell.f }; // value + formula
          }
          return cellValue;
        });
      });
      results[file][sheetName] = richJson.slice(0, 50); // Only top 50 rows per sheet to prevent massive output
    });
  } else {
    results[file] = "NOT_FOUND";
  }
});

fs.writeFileSync("excel_analysis.json", JSON.stringify(results, null, 2));
console.log("Excel parsing complete. Output saved to excel_analysis.json");
