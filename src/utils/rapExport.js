import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { generateAllSVGs } from './rapPrint';

const templateMap = {
  // Always fallback to pc 50.xlsx as master format
};

const svgToPngBase64 = (svgString) => {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      // Ensure SVG string has namespace
      let safeSvg = svgString;
      if (!safeSvg.includes('xmlns=')) {
        safeSvg = safeSvg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      const blob = new Blob([safeSvg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1600; // High resolution for print
        canvas.height = 1000;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png').split(',')[1]); // return base64
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
    
    // 1. Tentukan File Template (STANDARISASI FASE 11: Selalu gunakan pc 50.xlsx sebagai Master)
    const templatePath = '/pc 50.xlsx';
    console.log(`Menggunakan template master: ${templatePath}`);
    
    const response = await fetch(templatePath);
    if (!response.ok) throw new Error(`Template ${templatePath} tidak ditemukan di folder public/`);
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
    
    // 2. Hydrate "ANALISA perencanaan" & "Analisa Pelaksanaan " (Tidak menyentuh rumus!)
    const analisaSheets = ['ANALISA perencanaan', 'Analisa Pelaksanaan '];
    analisaSheets.forEach(name => {
      const sheet = wb.getWorksheet(name);
      if(sheet) {
        // Hanya memasukkan nilai parameter alat
        sheet.getCell('K16').value = analisaRencana?.hp || 0;
        sheet.getCell('K17').value = analisaRencana?.bucket || 0;
        sheet.getCell('K19').value = analisaRencana?.fb || 0;
        sheet.getCell('K20').value = analisaRencana?.fa || 0;
        sheet.getCell('K21').value = analisaRencana?.fv || 0;
        if (analisaRencana?.waktuGali) {
           sheet.getCell('K24').value = analisaRencana.waktuGali / 60; // T1 dalam menit
        }
      }
    });

    // 2.5 Hydrate "Backup Galian" (Stripping Area & b1 Pelaksanaan)
    const backupSheets = ['backup volume rencana', 'backup volume pelaksanaan'];
    backupSheets.forEach(name => {
      const sheet = wb.getWorksheet(name);
      if(sheet) {
         // Sesuai konfirmasi gambar: Lebar Stripping di F19, Kedalaman di I19
         sheet.getCell('F19').value = geometri?.lebarStripping || 2.0;
         sheet.getCell('I19').value = geometri?.kedalamanStripping || 0.10;
         
         // Injeksi b1 agar GoalSeek Pelaksanaan sinkron dengan log realisasi
         if (name === 'backup volume pelaksanaan' && backupPelaksanaan?.b1) {
            sheet.getCell('F15').value = backupPelaksanaan.b1;
         } else if (name === 'backup volume rencana' && geometri?.b1) {
            sheet.getCell('F15').value = geometri.b1;
         }
      }
    });

    // 3. Hydrate "Kebutuhan  realisasi"
    const realisasiSheet = wb.getWorksheet('Kebutuhan  realisasi');
    if (realisasiSheet && selectedDailyIndices && selectedDailyIndices.length > 0) {
      const selectedData = dailyData.filter((_, i) => selectedDailyIndices.includes(i));
      let currentSisa = 400; 
      let kumulatif = 0;

      // Clear existing manual log inputs (Row 10 to 50) - safely handle shared formulas
      for(let r = 10; r <= 50; r++) {
         const row = realisasiSheet.getRow(r);
         [1,2,3,4,5,6,7,8,9,10,11,12,13,14].forEach(c => {
           try {
             const cell = row.getCell(c);
             // Only clear if not a shared formula
             if (cell.type !== 8) { // 8 = SharedFormula in ExcelJS
               cell.value = null;
             }
           } catch(e) { /* skip problematic cells */ }
         });
      }

      // Recalculate basic constraints (Gunakan nilai dari GoalSeek jika tersedia)
      const q1 = analisaCalculated?.q1 || ((analisaRencana.bucket * analisaRencana.fb * analisaRencana.fa * analisaRencana.fv * 60) / (analisaRencana.waktuGali / 60));
      const bbmPerJam = analisaCalculated?.H || ((analisaRencana.waktuGali / analisaRencana.waktuGali) * 0.75 * (analisaRencana.hp * 0.7457) * analisaRencana.loadFactor);

      selectedData.forEach((d, index) => {
         try {
         const rowIndex = 10 + index;
         const row = realisasiSheet.getRow(rowIndex);
         
         const dateObj = new Date(d.tanggal);
         const day = dateObj.getDate();
         const month = dateObj.toLocaleString('id-ID', { month: 'long' });
         const year = dateObj.getFullYear();
         
         const bbmHariTsb = d.jam * bbmPerJam;
         const galianHariTsb = d.jam * q1;
         
         currentSisa = currentSisa - bbmHariTsb;

         row.getCell(1).value = index + 1;
         row.getCell(2).value = day;
         row.getCell(3).value = month;
         row.getCell(4).value = year;
         row.getCell(5).value = d.jam;
         row.getCell(6).value = q1;
         row.getCell(7).value = galianHariTsb;
         row.getCell(8).value = bbmPerJam;
         row.getCell(9).value = bbmHariTsb;
         
         if(index === 0) {
            row.getCell(10).value = 400;
            currentSisa = 400 - bbmHariTsb;
         }
         
         row.getCell(11).value = currentSisa;
         
         const kumulatifLalu = kumulatif;
         kumulatif += galianHariTsb;
         row.getCell(13).value = kumulatifLalu;
         row.getCell(14).value = kumulatif;
         
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
