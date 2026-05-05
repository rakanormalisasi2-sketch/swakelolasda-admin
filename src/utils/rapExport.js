import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { generateAllSVGs } from './rapPrint';
import { distributeBBMDrops } from './calcRapMath';
const templateMap = {
  'PC50': '/pc 50.xlsx',
  'PC75': '/PC75.xlsx',
  'PC100': '/PC100.xlsx',
  'PC200': '/pc200.xlsx',
  'PC200 LONG ARM': '/PC200LA.xlsx',
};

const svgToJpegBase64 = (svgString) => {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      let safeSvg = svgString;
      if (!safeSvg.includes('xmlns=')) {
        safeSvg = safeSvg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      const blob = new Blob([safeSvg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 750;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.5).split(',')[1]);
      };
      img.onerror = (e) => reject(e);
      img.src = url;
    } catch(err) {
      reject(err);
    }
  });
};

export async function downloadExcel(data) {
  try {
    const { geometri, backupPelaksanaan, analisaRencana, analisaCalculated, selTotals, dailyData, selectedDailyIndices, kopData, selectedExcavator } = data;
    
    // Dynamic template based on excavator class
    const templatePath = templateMap[selectedExcavator] || '/pc 50.xlsx';
    console.log(`Template: ${templatePath} (${selectedExcavator})`);
    
    const response = await fetch(templatePath);
    if (!response.ok) throw new Error(`Template ${templatePath} tidak ditemukan`);
    const arrayBuffer = await response.arrayBuffer();
    
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(arrayBuffer);

    // Fix corrupted file / named range issues and preserve regular formulas
    if (wb.definedNames) {
      wb.definedNames.model = []; // Removes corrupted defined names/print areas that exceljs writes incorrectly
    }

    wb.eachSheet(sheet => {
      sheet.eachRow({ includeEmpty: false }, row => {
        row.eachCell({ includeEmpty: false }, cell => {
          try {
            const v = cell._value;
            // Only wipe shared formulas because they cause "Shared Formula master" errors in exceljs
            if (v && (v.sharedFormula !== undefined || v._sharedFormula !== undefined || 
                (v.model && v.model.sharedFormula !== undefined))) {
              cell.value = cell.result !== undefined ? cell.result : (cell.value || null);
            }
          } catch(e) { /* skip */ }
        });
      });
    });
    
    // 2. Hydrate ANALISA sheets — inject ALL computed values
    const ac = analisaCalculated || {};
    const ar = analisaRencana || {};
    const q1 = ac.q1 || 50;
    const H = ac.H || 6;
    const vol = geometri?.totalVolume || 0;
    const estHari = Math.ceil(vol / (q1 * (ar.tk || 7)) || 1);
    const kW = ac.kW || (ar.hp * 0.7457);
    const koef = H / q1;
    const totalSolar = vol * koef;

    const analisaSheets = ['ANALISA perencanaan', 'Analisa Pelaksanaan '];
    analisaSheets.forEach(name => {
      const sheet = wb.getWorksheet(name);
      if(!sheet) return;
      // I. ASUMSI
      try { sheet.getCell('K8').value = ar.tk || 7; } catch{}     // Tk
      try { sheet.getCell('K9').value = ar.fk || 0.8; } catch{}   // Fk
      // III. URAIAN PERALATAN
      try { sheet.getCell('K16').value = ar.hp || 0; } catch{}    // HP
      try { sheet.getCell('K17').value = ar.bucket || 0; } catch{} // Bucket
      try { sheet.getCell('K19').value = ar.fb || 0; } catch{}    // Fb
      try { sheet.getCell('K20').value = ar.fa || 0; } catch{}    // Fa
      try { sheet.getCell('K21').value = ar.fv || 0.8; } catch{}  // Fv
      try { sheet.getCell('K24').value = ac.t1 || (ar.waktuGali / 60) || 0.31; } catch{} // T.1 menit
      try { sheet.getCell('K26').value = q1; } catch{}            // Q1
      try { sheet.getCell('K27').value = q1 * (ar.tk || 7); } catch{} // Q2
      try { sheet.getCell('K28').value = 1 / q1; } catch{}        // Koef alat
      // IV. BIAYA OPERASI
      try { sheet.getCell('K33').value = H; } catch{}             // H (L/jam)
      try { sheet.getCell('K34').value = H * (ar.tk || 7); } catch{} // h2
      try { sheet.getCell('K35').value = koef; } catch{}          // Koef BBM
      try { sheet.getCell('K36').value = kW; } catch{}            // kW
      try { sheet.getCell('K37').value = ar.loadFactor || 0.28; } catch{} // LF
      try { sheet.getCell('E38').value = ac.feMenit || 48; } catch{}  // Fe menit
      try { sheet.getCell('K38').value = ac.fe || 0.8; } catch{}   // Fe
      try { sheet.getCell('K39').value = ac.fd || 0.99; } catch{}  // Fd
      // V. ESTIMASI
      // We will inject formula references instead of hardcoded values for Volume so they link correctly to the new backup volume tables
      try { sheet.getCell('K43').value = estHari; } catch{}       // T.pek
      try { sheet.getCell('K44').value = totalSolar; } catch{}    // Ks
    });

    // 2.5 Hydrate Backup Volume sheets — dimensions + STA data
    const backupConfigs = [
      { name: 'backup volume rencana', stas: geometri?.stas, b1: geometri?.b1 },
      { name: 'backup volume pelaksanaan', stas: backupPelaksanaan?.stas, b1: backupPelaksanaan?.b1 || geometri?.b1 }
    ];
    backupConfigs.forEach(({ name, stas, b1 }) => {
      const sheet = wb.getWorksheet(name);
      if(!sheet) return;

      // Clear the old diagram blocks from row 10 to 50
      for(let r = 10; r <= 50; r++) {
         const row = sheet.getRow(r);
         [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].forEach(c => {
           try { const cell = row.getCell(c); if (cell.type !== 8) cell.value = null; } catch{}
         });
      }

      // Draw the table headers
      sheet.getCell('E10').value = 'No';
      sheet.getCell('F10').value = 'STA';
      sheet.getCell('G10').value = 'b1 (m)';
      sheet.getCell('H10').value = 'b3 (m)';
      sheet.getCell('I10').value = 'h (m)';
      sheet.getCell('J10').value = 'h\' (m)';
      sheet.getCell('K10').value = 'Luas (m2)';
      sheet.getCell('L10').value = 'Jarak (m)';
      sheet.getCell('M10').value = 'Volume (m3)';

      // Style headers
      for(let c=5; c<=13; c++) {
        const cell = sheet.getCell(10, c);
        cell.font = { bold: true };
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        cell.alignment = { horizontal: 'center' };
      }

      let y = 11;
      let totalVolRaw = 0;
      (stas || []).forEach((sta, i) => {
        sheet.getCell(y, 5).value = i + 1;
        sheet.getCell(y, 6).value = sta.sta;
        sheet.getCell(y, 7).value = b1 || 4;
        sheet.getCell(y, 8).value = sta.b3;
        sheet.getCell(y, 9).value = sta.h;
        sheet.getCell(y, 10).value = sta.hPrime || geometri?.hGalian || 1;
        sheet.getCell(y, 11).value = sta.luas;
        sheet.getCell(y, 12).value = i === 0 ? '-' : (sta.jarak || 0);
        sheet.getCell(y, 13).value = i === 0 ? '-' : (sta.volume || 0);
        
        for(let c=5; c<=13; c++) {
          sheet.getCell(y, c).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
          sheet.getCell(y, c).alignment = { horizontal: 'center' };
        }
        totalVolRaw += (sta.volume || 0);
        y++;
      });

      if (name === 'backup volume rencana') {
        const vs = geometri?.volumeStripping || 0;
        sheet.mergeCells(y, 5, y, 11);
        sheet.getCell(y, 5).value = `Volume Stripping (${geometri?.lebarStripping||2}m x ${geometri?.kedalamanStripping||0.1}m)`;
        sheet.getCell(y, 12).value = '';
        sheet.getCell(y, 13).value = vs;
        for(let c=5; c<=13; c++) {
          sheet.getCell(y, c).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
          sheet.getCell(y, c).alignment = { horizontal: 'center' };
        }
        totalVolRaw += vs;
        y++;
      }

      // Total Row
      sheet.mergeCells(y, 5, y, 12);
      sheet.getCell(y, 5).value = 'TOTAL VOLUME GALIAN';
      sheet.getCell(y, 5).font = { bold: true };
      sheet.getCell(y, 13).value = totalVolRaw;
      sheet.getCell(y, 13).font = { bold: true };
      for(let c=5; c<=13; c++) {
        sheet.getCell(y, c).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        sheet.getCell(y, c).alignment = { horizontal: 'center' };
      }

      // Link total to Analisa sheet
      if (name === 'backup volume rencana') {
         const analisaRen = wb.getWorksheet('ANALISA perencanaan');
         if (analisaRen) {
             analisaRen.getCell('K42').formula = `='backup volume rencana'!M${y}`;
         }
      } else {
         const analisaPel = wb.getWorksheet('Analisa Pelaksanaan ');
         if (analisaPel) {
             analisaPel.getCell('K42').formula = `='backup volume Pelaksanaan'!M${y}`;
         }
      }
    });

    // 3. Hydrate "Kebutuhan  realisasi"
    const realisasiSheet = wb.getWorksheet('Kebutuhan  realisasi');
    if (realisasiSheet && selectedDailyIndices && selectedDailyIndices.length > 0) {
      const selectedData = dailyData.filter((_, i) => selectedDailyIndices.includes(i));
      let currentSisa = 0; 
      let kumulatif = 0;

      // Clear rows 10-50
      for(let r = 10; r <= 50; r++) {
         const row = realisasiSheet.getRow(r);
         [1,2,3,4,5,6,7,8,9,10,11,12,13,14].forEach(c => {
           try { const cell = row.getCell(c); if (cell.type !== 8) cell.value = null; } catch{}
         });
      }

      const drops = distributeBBMDrops(selectedData, H);

      selectedData.forEach((d, index) => {
         try {
         const rowIndex = 10 + index;
         const row = realisasiSheet.getRow(rowIndex);
         
         const dateObj = new Date(d.tanggal);
         const bbmHari = d.jam * H;
         const galianHari = d.jam * q1;
         
         let drop = drops[index] || 0;
         
         currentSisa = currentSisa + drop - bbmHari;
         if(currentSisa < 0) currentSisa = 0;

         row.getCell(1).value = index + 1;
         row.getCell(2).value = dateObj.getDate();
         row.getCell(3).value = dateObj.toLocaleString('id-ID', { month: 'long' });
         row.getCell(4).value = dateObj.getFullYear();
         row.getCell(5).value = d.jam;
         row.getCell(6).value = q1;
         row.getCell(7).value = galianHari;
         row.getCell(8).value = H;
         row.getCell(9).value = bbmHari;
         row.getCell(10).value = drop > 0 ? drop : '';  // Drop BBM
         row.getCell(11).value = currentSisa;            // Sisa
         row.getCell(12).value = d.hmAwal || '';          // HM Awal
         row.getCell(13).value = d.hmAkhir || '';         // HM Akhir
         
         kumulatif += galianHari;
         row.getCell(14).value = kumulatif;              // Kumulatif
         
         row.commit();
         } catch(e) { console.warn('Row write error:', e.message); }
      });
    }

    // 4. Tambahkan Gambar CAD sebagai Lampiran
    try {
      const svgs = generateAllSVGs(data);
      const jpegBase64List = await Promise.all(svgs.map(s => svgToJpegBase64(s.svg)));
      
      const cadSheet = wb.addWorksheet('LAMPIRAN CAD', {
        pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true }
      });

      jpegBase64List.forEach((base64, idx) => {
        const imageId = wb.addImage({
          base64: base64,
          extension: 'jpeg',
        });
        
        // Satu gambar satu lembar (Page Break)
        const startRow = idx * 45;
        cadSheet.addImage(imageId, {
          tl: { col: 1, row: startRow + 2 },
          ext: { width: 1100, height: 600 }
        });
        
        const title = `${svgs[idx].jenis} - STA ${svgs[idx].sta}`;
        cadSheet.getCell(startRow + 1, 2).value = title;
        cadSheet.getCell(startRow + 1, 2).font = { bold: true, size: 14 };
        
        if (idx < jpegBase64List.length - 1) {
          cadSheet.getRow(startRow + 44).addPageBreak();
        }
      });
    } catch (cadErr) {
      console.warn("Gagal membuat lampiran CAD:", cadErr);
    }

    // 5. Export The Workbook
    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `RAP_${kopData?.pekerjaan || 'Proyek'}_${selectedExcavator || 'Alat'}.xlsx`);

  } catch (error) {
    console.error('Failed EXCEL generation', error);
    alert('Gagal menghasilkan file Excel. Pastikan template (' + (templateMap[data.selectedExcavator] || 'pc 50.xlsx') + ') ada di folder public/. Error: ' + error.message);
  }
}
