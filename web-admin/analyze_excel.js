const ExcelJS = require('exceljs');
(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('public/pc 50.xlsx');
  
  // List all sheet names exactly
  console.log('=== ALL SHEETS ===');
  wb.eachSheet((sheet, id) => {
    console.log(`  ${id}: "${sheet.name}" (state=${sheet.state}, rows=${sheet.rowCount})`);
  });

  // Analyze backup volume rencana in detail
  const bvr = wb.getWorksheet('backup volume rencana');
  if (bvr) {
    console.log('\n=== BACKUP VOLUME RENCANA (rows 1-25) ===');
    for (let r = 1; r <= 25; r++) {
      const row = bvr.getRow(r);
      const cells = [];
      for (let c = 1; c <= 15; c++) {
        const cell = row.getCell(c);
        if (cell.value !== null && cell.value !== undefined) {
          let val;
          if (cell.formula) val = `[${cell.formula}=${cell.result}]`;
          else val = String(cell.value).substring(0, 60);
          const col = c <= 26 ? String.fromCharCode(64+c) : '';
          cells.push(`${col}${r}=${val}`);
        }
      }
      if (cells.length > 0) console.log(`  R${r}: ${cells.join(' | ')}`);
    }
  }

  // Analyze ANALISA perencanaan in detail
  const ana = wb.getWorksheet('ANALISA perencanaan');
  if (ana) {
    console.log('\n=== ANALISA PERENCANAAN (rows 1-45) ===');
    for (let r = 1; r <= 45; r++) {
      const row = ana.getRow(r);
      const cells = [];
      for (let c = 1; c <= 25; c++) {
        const cell = row.getCell(c);
        if (cell.value !== null && cell.value !== undefined) {
          let val;
          if (cell.formula) val = `[${cell.formula}=${cell.result}]`;
          else val = String(cell.value).substring(0, 60);
          const col = c <= 26 ? String.fromCharCode(64+c) : '';
          cells.push(`${col}${r}=${val}`);
        }
      }
      if (cells.length > 0) console.log(`  R${r}: ${cells.join(' | ')}`);
    }
    // Check W83 area (hidden AHSP)
    console.log('\n=== ANALISA PERENCANAAN W83 area (rows 80-95, cols W-AB) ===');
    for (let r = 78; r <= 95; r++) {
      const row = ana.getRow(r);
      const cells = [];
      for (let c = 20; c <= 30; c++) {
        const cell = row.getCell(c);
        if (cell.value !== null && cell.value !== undefined) {
          let val;
          if (cell.formula) val = `[${cell.formula}=${cell.result}]`;
          else val = String(cell.value).substring(0, 60);
          cells.push(`C${c}R${r}=${val}`);
        }
      }
      if (cells.length > 0) console.log(`  R${r}: ${cells.join(' | ')}`);
    }
  }
})();
