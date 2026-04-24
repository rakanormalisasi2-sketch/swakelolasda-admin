'use client';

/**
 * rapPrint.js
 * PDF Print Utilities untuk RAP Module
 *
 * Generates printable documents with Cross-Section images
 * 10 gambar: 5 Perencanaan + 5 Pelaksanaan
 */

/**
 * Generate SVG string untuk satu gambar cross-section dengan kop
 * Digunakan untuk print/PDF
 */
import { renderToString } from 'react-dom/server';
import CrossSectionSVG from '../components/CrossSectionSVG';

export function generatePrintableSVG(staData, kopData, options = {}) {
  const { width = 1200, height = 750, jenis = 'PERENCANAAN' } = options;

  return renderToString(
    <CrossSectionSVG
      staData={staData}
      kopData={{
        ...kopData,
        sta: options.sta || kopData.sta,
        noLembar: options.noLembar,
        jumlahLembar: options.jumlahLembar,
        jenis: jenis
      }}
      width={width}
      height={height}
    />
  );
}

/**
 * Generate all 10 SVGs (5 Perencanaan + 5 Pelaksanaan)
 */
export function generateAllSVGs(rapState) {
  const { geometri, backupPelaksanaan } = rapState;
  const svgs = [];

  // 5 Perencanaan
  geometri.stas?.forEach((sta, i) => {
    svgs.push({
      jenis: 'PERENCANAAN',
      sta: sta.sta,
      index: i,
      svg: generatePrintableSVG(
        {
          dimensi: { b1: sta.b1, b2: sta.b2, b3: sta.b3, h: sta.h, hPrime: sta.hPrime, slope: geometri.slope },
          luasGalian: sta.luas
        },
        {
          ...geometri.kopData,
          sta: sta.sta,
          noLembar: i + 1,
          jumlahLembar: geometri.stas?.length || 5,
          jenis: 'PERENCANAAN'
        },
        { jenis: 'PERENCANAAN' }
      )
    });
  });

  // 5 Pelaksanaan
  backupPelaksanaan.stas?.forEach((sta, i) => {
    svgs.push({
      jenis: 'PELAKSANAAN',
      sta: sta.sta,
      index: i,
      svg: generatePrintableSVG(
        {
          dimensi: { b1: sta.b1, b2: sta.b2, b3: sta.b3, h: sta.h, hPrime: sta.hPrime, slope: geometri.slope },
          luasGalian: sta.luas
        },
        {
          ...geometri.kopData,
          sta: sta.sta,
          noLembar: i + 1,
          jumlahLembar: backupPelaksanaan.stas?.length || 5,
          jenis: 'PELAKSANAAN'
        },
        { jenis: 'PELAKSANAAN' }
      )
    });
  });

  return svgs;
}

/**
 * Create print window dengan format Laporan Lengkap (F4 Portrait)
 */
export function printCrossSections(rapState) {
  const svgs = generateAllSVGs(rapState);
  const { analisaRencana, selTotals, dailyData, kopData, grandTotal, costBBM, costPenjaga, analisaCalculated, geometri, backupPelaksanaan } = rapState;

  const formatRp = (num) => 'Rp ' + Math.round(num || 0).toLocaleString('id-ID');
  const formatNum = (num, fix=2) => Number(num || 0).toFixed(fix);

  // Pisahkan SVGs berdasarkan jenis
  const svgsRencana = svgs.filter(s => s.jenis === 'PERENCANAAN');
  const svgsPelaksanaan = svgs.filter(s => s.jenis === 'PELAKSANAAN');

  // Perhitungan Data Realisasi 14 Kolom
  const q1 = analisaCalculated?.q1 || ((analisaRencana?.bucket * analisaRencana?.fb * analisaRencana?.fa * analisaRencana?.fv * 60) / (analisaRencana?.waktuGali / 60));
  const bbmPerJam = analisaCalculated?.H || ((analisaRencana?.waktuGali / analisaRencana?.waktuGali) * 0.75 * (analisaRencana?.hp * 0.7457) * (analisaRencana?.loadFactor || 0.5));
  
  let currentSisa = 400; // Drop stock awal default
  let kumulatif = 0;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Cetak Laporan RAP - ${kopData?.pekerjaan || 'Proyek'}</title>
      <style>
        /* Standar Kertas F4 Landscape untuk seluruh halaman */
        @page { size: 330.2mm 215.9mm landscape; margin: 12mm; }
        
        body { 
          font-family: Arial, Helvetica, sans-serif; /* Excel style font */
          margin: 0; 
          padding: 0; 
          background: #fff; 
          color: #000; 
          font-size: 10pt; 
        }
        
        .page { 
          page-break-after: always; 
          width: 100%; 
          height: 100%;
          box-sizing: border-box;
          position: relative;
        }
        .page:last-child { page-break-after: avoid; }
        
        .header-kop { text-align: center; border-bottom: 3px solid #000; margin-bottom: 15px; padding-bottom: 10px; position: relative; }
        .header-kop img { position: absolute; left: 0; top: 0; width: 60px; height: auto; }
        .header-kop h1 { font-size: 14pt; margin: 0 0 4px 0; text-transform: uppercase; font-family: 'Times New Roman', Times, serif; }
        .header-kop h2 { font-size: 12pt; margin: 0 0 4px 0; font-family: 'Times New Roman', Times, serif; }
        .header-kop p { font-size: 9pt; margin: 0; }
        
        .sheet-title { font-size: 12pt; font-weight: bold; text-align: center; margin: 15px 0; text-transform: uppercase; text-decoration: underline; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 9pt; }
        th, td { border: 1px solid #000; padding: 5px; vertical-align: middle; }
        th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
        
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        .no-border { border: none !important; }
        .bg-gray { background-color: #e5e7eb; }
        
        .info-table { width: 60%; border: none; margin-bottom: 20px; font-size: 10pt; }
        .info-table td { border: none; padding: 3px; }
        .info-table td:nth-child(1) { width: 120px; font-weight: bold; }
        .info-table td:nth-child(2) { width: 10px; }
        
        .ttd-section { width: 100%; display: flex; justify-content: flex-end; margin-top: 30px; page-break-inside: avoid; }
        .ttd-box { width: 30%; text-align: center; }
        .ttd-name { margin-top: 60px; font-weight: bold; text-decoration: underline; }

        /* Khusus untuk CAD */
        .cad-container { 
          width: 100%; 
          height: 90vh; 
          display: flex; 
          justify-content: center; 
          align-items: center; 
        }
        .cad-container svg { width: 100%; height: 100%; object-fit: contain; }

        @media print { 
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          ::-webkit-scrollbar { display: none; }
        }
      </style>
    </head>
    <body>
    
      <!-- HALAMAN 1: ANALISA PERENCANAAN -->
      <div class="page">
        <div class="header-kop">
          <img src="/logo-bojonegoro.png" alt="Logo" onerror="this.style.display='none'" />
          <h1>PEMERINTAH KABUPATEN BOJONEGORO</h1>
          <h2>DINAS PEKERJAAN UMUM SUMBER DAYA AIR</h2>
          <p>Jl. Dr. Wahidin Sudirohusodo No.43, Bojonegoro, Jawa Timur 62111</p>
        </div>
        
        <div class="sheet-title">ANALISA PERENCANAAN ALAT BERAT</div>
        
        <table class="info-table">
          <tr><td>Pekerjaan</td><td>:</td><td>${kopData?.pekerjaan || '-'}</td></tr>
          <tr><td>Lokasi</td><td>:</td><td>${kopData?.lokasi || '-'}</td></tr>
          <tr><td>Tahun Anggaran</td><td>:</td><td>${kopData?.tahun || new Date().getFullYear()}</td></tr>
        </table>
        
        <table>
          <thead>
            <tr>
              <th width="5%">No</th>
              <th width="45%">Keterangan</th>
              <th width="10%">Satuan</th>
              <th width="40%">Nilai</th>
            </tr>
          </thead>
          <tbody>
            <tr><td colspan="4" class="font-bold bg-gray">I. SPESIFIKASI ALAT BERAT</td></tr>
            <tr><td class="text-center">1</td><td>Tenaga Mesin</td><td class="text-center">HP</td><td class="text-center">${formatNum(analisaRencana?.hp)}</td></tr>
            <tr><td class="text-center">2</td><td>Kapasitas Bucket (V)</td><td class="text-center">m³</td><td class="text-center">${formatNum(analisaRencana?.bucket)}</td></tr>
            <tr><td class="text-center">3</td><td>Faktor Bucket (Fb)</td><td class="text-center">-</td><td class="text-center">${formatNum(analisaRencana?.fb)}</td></tr>
            <tr><td class="text-center">4</td><td>Faktor Efisiensi Alat (Fa)</td><td class="text-center">-</td><td class="text-center">${formatNum(analisaRencana?.fa)}</td></tr>
            <tr><td class="text-center">5</td><td>Faktor Konversi (Fv)</td><td class="text-center">-</td><td class="text-center">${formatNum(analisaRencana?.fv)}</td></tr>
            <tr><td class="text-center">6</td><td>Waktu Siklus (Ts)</td><td class="text-center">Menit</td><td class="text-center">${formatNum(analisaCalculated?.t1 || analisaRencana?.waktuGali/60, 4)}</td></tr>
            
            <tr><td colspan="4" class="font-bold bg-gray">II. KAPASITAS PRODUKSI</td></tr>
            <tr><td class="text-center">7</td><td>Produksi per Jam (Q1)</td><td class="text-center">m³/Jam</td><td class="text-center font-bold">${formatNum(q1)}</td></tr>
            <tr><td class="text-center">8</td><td>Produksi per Hari (Q2)</td><td class="text-center">m³/Hari</td><td class="text-center font-bold">${formatNum(analisaCalculated?.q2)}</td></tr>
            
            <tr><td colspan="4" class="font-bold bg-gray">III. KEBUTUHAN BAHAN BAKAR</td></tr>
            <tr><td class="text-center">9</td><td>Konsumsi BBM per Jam</td><td class="text-center">Liter/Jam</td><td class="text-center font-bold">${formatNum(bbmPerJam)}</td></tr>
          </tbody>
        </table>
      </div>

      <!-- HALAMAN 2: BACKUP VOLUME RENCANA -->
      <div class="page">
        <div class="header-kop">
          <img src="/logo-bojonegoro.png" alt="Logo" onerror="this.style.display='none'" />
          <h1>PEMERINTAH KABUPATEN BOJONEGORO</h1>
          <h2>DINAS PEKERJAAN UMUM SUMBER DAYA AIR</h2>
        </div>
        <div class="sheet-title">BACKUP VOLUME RENCANA</div>
        <table class="info-table">
          <tr><td>Pekerjaan</td><td>:</td><td>${kopData?.pekerjaan || '-'}</td></tr>
        </table>
        <table>
          <thead>
            <tr>
              <th>STA</th>
              <th>Lebar Dasar (b1)</th>
              <th>Lebar Atas (b3)</th>
              <th>Kedalaman (h)</th>
              <th>Luas Trapesium (m²)</th>
              <th>Lebar Stripping (m)</th>
              <th>Tebal Stripping (m)</th>
              <th>Luas Stripping (m²)</th>
              <th>Total Luas (m²)</th>
            </tr>
          </thead>
          <tbody>
            ${(geometri?.stas || []).map((sta) => {
              const b1 = sta.b1 || geometri.b1 || 0;
              const hPrime = sta.hPrime || 0;
              const l_trap = b1 * hPrime; // Simplifikasi untuk tabel
              const l_strip = (geometri.lebarStripping || 2.0) * (geometri.kedalamanStripping || 0.1);
              return `
              <tr>
                <td class="text-center font-bold">${sta.sta}</td>
                <td class="text-center">${formatNum(b1)}</td>
                <td class="text-center">${formatNum(sta.b3)}</td>
                <td class="text-center">${formatNum(hPrime)}</td>
                <td class="text-center">${formatNum(sta.luas)}</td>
                <td class="text-center">${formatNum(geometri.lebarStripping || 2.0)}</td>
                <td class="text-center">${formatNum(geometri.kedalamanStripping || 0.1)}</td>
                <td class="text-center">${formatNum(l_strip)}</td>
                <td class="text-center font-bold">${formatNum(sta.luas + l_strip)}</td>
              </tr>
              `
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- HALAMAN 3: KEBUTUHAN REALISASI -->
      <div class="page">
        <div class="sheet-title">KEBUTUHAN REALISASI ALAT BERAT & BBM</div>
        <table class="info-table" style="width: 100%;">
          <tr>
            <td style="width:100px;">Pekerjaan</td><td style="width:10px;">:</td><td>${kopData?.pekerjaan || '-'}</td>
            <td style="width:100px;">BBM/Jam</td><td style="width:10px;">:</td><td class="font-bold">${formatNum(bbmPerJam)} Liter</td>
          </tr>
          <tr>
            <td>Lokasi</td><td>:</td><td>${kopData?.lokasi || '-'}</td>
            <td>Kapasitas/Jam</td><td>:</td><td class="font-bold">${formatNum(q1)} m³</td>
          </tr>
        </table>
        
        <table>
          <thead>
            <tr>
              <th rowspan="2" width="3%">No</th>
              <th colspan="3">Tanggal</th>
              <th rowspan="2">Jam<br>Kerja</th>
              <th rowspan="2">Kapasitas<br>(m³/Jam)</th>
              <th rowspan="2">Galian<br>Volume (m³)</th>
              <th rowspan="2">Pemakaian<br>BBM/Jam</th>
              <th colspan="4">Kebutuhan BBM (Liter)</th>
              <th colspan="2">Volume Galian (m³)</th>
            </tr>
            <tr>
              <th>Hari</th>
              <th>Bulan</th>
              <th>Tahun</th>
              <th>Jml Pakai</th>
              <th>Drop</th>
              <th>Sisa</th>
              <th>Ket</th>
              <th>S/D Tgl Lalu</th>
              <th>S/D Tgl Ini</th>
            </tr>
            <tr class="bg-gray text-center" style="font-size: 7pt;">
              <td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td><td>7=(5x6)</td><td>8</td><td>9=(5x8)</td><td>10</td><td>11=(10-9)</td><td>12</td><td>13</td><td>14=(13+7)</td>
            </tr>
          </thead>
          <tbody>
            ${(dailyData || []).map((d, i) => {
              const dateObj = new Date(d.tanggal);
              const day = dateObj.getDate();
              const month = dateObj.toLocaleString('id-ID', { month: 'long' });
              const year = dateObj.getFullYear();
              
              const bbmHariTsb = d.jam * bbmPerJam;
              const galianHariTsb = d.jam * q1;
              
              const rowDrop = (i === 0) ? 400 : 0;
              if (i === 0) currentSisa = 400;
              currentSisa = currentSisa - bbmHariTsb;
              
              const kumulatifLalu = kumulatif;
              kumulatif += galianHariTsb;
              
              return `
              <tr>
                <td class="text-center">${i + 1}</td>
                <td class="text-center">${day}</td>
                <td class="text-center">${month}</td>
                <td class="text-center">${year}</td>
                <td class="text-center">${formatNum(d.jam, 1)}</td>
                <td class="text-center">${formatNum(q1)}</td>
                <td class="text-right">${formatNum(galianHariTsb)}</td>
                <td class="text-center">${formatNum(bbmPerJam)}</td>
                <td class="text-right">${formatNum(bbmHariTsb)}</td>
                <td class="text-right">${rowDrop > 0 ? formatNum(rowDrop) : '-'}</td>
                <td class="text-right">${formatNum(currentSisa)}</td>
                <td class="text-center">${d.keterangan || '-'}</td>
                <td class="text-right">${formatNum(kumulatifLalu)}</td>
                <td class="text-right font-bold">${formatNum(kumulatif)}</td>
              </tr>
            `}).join('')}
          </tbody>
          <tfoot>
            <tr class="bg-gray font-bold">
              <td colspan="4" class="text-center">TOTAL</td>
              <td class="text-center">${formatNum(selTotals?.jam, 1)}</td>
              <td></td>
              <td class="text-right">${formatNum(selTotals?.galian)}</td>
              <td></td>
              <td class="text-right">${formatNum(selTotals?.bbm)}</td>
              <td colspan="5"></td>
            </tr>
          </tfoot>
        </table>

        <div class="ttd-section">
          <div class="ttd-box">
            <p>Bojonegoro, ..............................</p>
            <p>Pengawas Lapangan</p>
            <p class="ttd-name">${kopData?.preparedBy || '...................................'}</p>
          </div>
        </div>
      </div>

      <!-- LAMPIRAN GAMBAR TEKNIK (CAD) - KINI SUDAH FULL LANDSCAPE DEFAULT -->
      ${svgsRencana.map((s, idx) => `
        <div class="page">
          <div class="cad-container">${s.svg}</div>
        </div>
      `).join('')}

      ${svgsPelaksanaan.map((s, idx) => `
        <div class="page">
          <div class="cad-container">${s.svg}</div>
        </div>
      `).join('')}

    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

/**
 * Download SVG as image file
 */
export async function downloadSVGAsImage(svgString, filename = 'cross-section.svg') {
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Download all SVGs as ZIP
 */
export async function downloadAllSVGsAsZip(rapState) {
  const svgs = generateAllSVGs(rapState);

  // For now, just open print dialog with all SVGs
  // In production, you would use JSZip library
  printCrossSections(rapState);
}