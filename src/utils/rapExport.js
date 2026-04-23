import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { generateAllSVGs } from './rapPrint';

const templateMap = {
  'pc50': '/pc 50.xlsx',
  'pc75': '/PC75.xlsx',
  'pc100': '/PC 100 .xlsx',
  'pc200': '/pc 200.xlsx',
  'pc200-long': '/PC 200 LONG ARM.xlsx'
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
    const { geometri, analisaRencana, selTotals, dailyData, selectedDailyIndices, kopData, selectedExcavator } = data;
    
    // 1. Tentukan File Template Berdasarkan Alat
    const templatePath = templateMap[selectedExcavator] || '/pc 50.xlsx';
    console.log(`Menggunakan template: ${templatePath}`);
    
    const response = await fetch(templatePath);
    if (!response.ok) throw new Error(`Template ${templatePath} tidak ditemukan di folder public/`);
    const arrayBuffer = await response.arrayBuffer();
    
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(arrayBuffer);
    
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

    // 3. Hydrate "Kebutuhan  realisasi"
    const realisasiSheet = wb.getWorksheet('Kebutuhan  realisasi');
    if (realisasiSheet && selectedDailyIndices && selectedDailyIndices.length > 0) {
      const selectedData = dailyData.filter((_, i) => selectedDailyIndices.includes(i));
      let currentSisa = 400; // Drop stock awal default (Excel formulas might override this logically, but we input raw values if requested)
      let kumulatif = 0;

      // Clear existing manual log inputs (Row 10 to 50)
      for(let r = 10; r <= 50; r++) {
         const row = realisasiSheet.getRow(r);
         [1,2,3,4,5,6,7,8,9,10,11,12,13,14].forEach(c => row.getCell(c).value = null);
      }

      // Recalculate basic constraints
      const q1 = (analisaRencana.bucket * analisaRencana.fb * analisaRencana.fa * analisaRencana.fv * 60) / (analisaRencana.waktuGali / 60);
      const kw = analisaRencana.hp * 0.7457;
      const bbmPerJam = (analisaRencana.waktuGali / analisaRencana.waktuGali) * 0.75 * kw * analisaRencana.loadFactor;

      selectedData.forEach((d, index) => {
         const rowIndex = 10 + index;
         const row = realisasiSheet.getRow(rowIndex);
         
         const dateObj = new Date(d.tanggal);
         const day = dateObj.getDate();
         const month = dateObj.toLocaleString('id-ID', { month: 'long' });
         const year = dateObj.getFullYear();
         
         const bbmHariTsb = d.jam * bbmPerJam;
         const galianHariTsb = d.jam * q1;
         
         currentSisa = currentSisa - bbmHariTsb;

         // Insert raw log data. Formatted formulas in the Excel sheet will compute totals if we leave them,
         // but since we are clearing the row, we push computed values to ensure it matches the web preview exactly.
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
            row.getCell(10).value = 400; // Drop
            currentSisa = 400 - bbmHariTsb;
         }
         
         row.getCell(11).value = currentSisa;
         
         const kumulatifLalu = kumulatif;
         kumulatif += galianHariTsb;
         row.getCell(13).value = kumulatifLalu;
         row.getCell(14).value = kumulatif;
         
         row.commit();
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
          ext: { width: 1000, height: 600 }
        });
        
        cadSheet.getCell(startRow + 1, 2).value = svgs[idx].title;
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
