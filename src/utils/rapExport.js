import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { generateAllSVGs } from './rapPrint';

const templateMap = {
  'PC50': '/pc 50.xlsx',
  'PC75': '/PC75.xlsx',
  'PC100': '/PC100.xlsx',
  'PC200': '/pc200.xlsx',
  'PC200 LONG ARM': '/PC200LA.xlsx',
};

const svgToPngBase64 = (svgString) => {
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
        canvas.width = 1600;
        canvas.height = 1000;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png').split(',')[1]);
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

    // Fix: Strip shared formulas to prevent "Shared Formula master" error during writeBuffer
    wb.eachSheet(sheet => {
      sheet.eachRow({ includeEmpty: false }, row => {
        row.eachCell({ includeEmpty: false }, cell => {
          try {
            // Check multiple ways to detect shared formulas
            const v = cell._value;
            if (v && (v.sharedFormula !== undefined || v._sharedFormula !== undefined || 
                (v.model && v.model.sharedFormula !== undefined))) {
              cell.value = cell.result !== undefined ? cell.result : (cell.value || null);
            }
            // Also convert regular formulas to their results to avoid any formula issues
            if (cell.formula) {
              cell.value = cell.result !== undefined ? cell.result : 0;
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
      try { sheet.getCell('K42').value = vol; } catch{}           // Volume
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
      // Header dimensions
      try { sheet.getCell('F10').value = geometri?.b3 || 6.857; } catch{}  // b3
      try { sheet.getCell('F15').value = b1 || 4; } catch{}                // b1
      try { sheet.getCell('H14').value = geometri?.hGalian || 1; } catch{} // h'
      try { sheet.getCell('H17').value = geometri?.h || 1; } catch{}       // h
      try { sheet.getCell('N15').value = geometri?.panjang || 540; } catch{} // panjang
      try { sheet.getCell('F19').value = geometri?.lebarStripping || 2; } catch{}
      try { sheet.getCell('I19').value = geometri?.kedalamanStripping || 0.1; } catch{}
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

      selectedData.forEach((d, index) => {
         try {
         const rowIndex = 10 + index;
         const row = realisasiSheet.getRow(rowIndex);
         
         const dateObj = new Date(d.tanggal);
         const bbmHari = d.jam * H;
         const galianHari = d.jam * q1;
         
         // Drop BBM from daily log data
         let drop = d.bbmDiterima || 0;
         if(!drop && d.catatan) {
           const m = d.catatan.match(/(?:bbm|solar|drop|kirim|terima)\s*[:=]?\s*(\d+)/i);
           if(m) drop = parseInt(m[1]);
         }
         if(index === 0 && drop === 0) drop = 400;
         
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
      const pngBase64List = await Promise.all(svgs.map(s => svgToPngBase64(s.svg)));
      
      const cadSheet = wb.addWorksheet('LAMPIRAN CAD', {
        pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true }
      });

      pngBase64List.forEach((base64, idx) => {
        const imageId = wb.addImage({
          base64: base64,
          extension: 'png',
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
        
        if (idx < pngBase64List.length - 1) {
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
