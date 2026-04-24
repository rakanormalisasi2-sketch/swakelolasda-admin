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
  const { width = 1100, height = 450, jenis = 'PERENCANAAN' } = options;

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
  const { analisaRencana, selTotals, dailyData, kopData, grandTotal, costBBM, costPenjaga, analisaCalculated } = rapState;

  const formatRp = (num) => 'Rp ' + Math.round(num || 0).toLocaleString('id-ID');
  const formatNum = (num, fix=2) => Number(num || 0).toFixed(fix);

  // Pisahkan SVGs berdasarkan jenis
  const svgsRencana = svgs.filter(s => s.jenis === 'PERENCANAAN');
  const svgsPelaksanaan = svgs.filter(s => s.jenis === 'PELAKSANAAN');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Cetak Laporan RAP - ${kopData?.pekerjaan || 'Proyek'}</title>
      <style>
        /* Ukuran Kertas F4/Folio Portrait (215.9 x 330.2 mm) */
        @page { size: 215.9mm 330.2mm portrait; margin: 15mm; }
        
        /* Definisi Halaman Landscape Khusus Gambar Teknik */
        @page landscape-page { 
          size: 330.2mm 215.9mm landscape; 
          margin: 10mm; 
        }

        body { font-family: 'Times New Roman', Times, serif; margin: 0; padding: 0; background: #fff; color: #000; font-size: 12pt; }
        
        .page { 
          page-break-after: always; 
          width: 100%; 
          box-sizing: border-box;
          position: relative;
        }
        
        .page.landscape { 
          page: landscape-page;
          width: 310.2mm; 
          height: 195.9mm;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .page:last-child { page-break-after: avoid; }
        
        .header-kop { text-align: center; border-bottom: 3px solid #000; margin-bottom: 20px; padding-bottom: 10px; position: relative; }
        .header-kop img { position: absolute; left: 0; top: 0; width: 70px; height: auto; }
        .header-kop h1 { font-size: 16pt; margin: 0 0 5px 0; text-transform: uppercase; }
        .header-kop h2 { font-size: 14pt; margin: 0 0 5px 0; }
        .header-kop p { font-size: 10pt; margin: 0; }
        
        .section-title { font-size: 14pt; font-weight: bold; text-align: center; margin: 20px 0; text-transform: uppercase; text-decoration: underline; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11pt; }
        th, td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; }
        th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        .no-border { border: none !important; }
        .border-bottom-only { border: none; border-bottom: 1px solid #000; }
        
        .info-table { width: 100%; border: none; margin-bottom: 30px; font-size: 12pt; }
        .info-table td { border: none; padding: 4px; }
        .info-table td:nth-child(1) { width: 150px; font-weight: bold; }
        .info-table td:nth-child(2) { width: 10px; }
        
        .ttd-section { width: 100%; display: flex; justify-content: space-between; margin-top: 50px; page-break-inside: avoid; }
        .ttd-box { width: 40%; text-align: center; }
        .ttd-name { margin-top: 70px; font-weight: bold; text-decoration: underline; }
        
        .cad-container { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; }
        .cad-container svg { width: 100%; height: 100%; object-fit: contain; }

        @media print { 
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page.landscape { 
            width: 100%;
            height: 100%;
          }
          ::-webkit-scrollbar { display: none; }
        }
      </style>
    </head>
    <body>
    
      <!-- HALAMAN 1: RAB -->
      <div class="page">
        <div class="header-kop">
          <img src="/logo-bojonegoro.png" alt="Logo" onerror="this.style.display='none'" />
          <h1>PEMERINTAH KABUPATEN BOJONEGORO</h1>
          <h2>DINAS PEKERJAAN UMUM SUMBER DAYA AIR</h2>
          <p>Jl. Dr. Wahidin Sudirohusodo No.43, Bojonegoro, Jawa Timur 62111</p>
        </div>
        
        <div class="section-title">RENCANA ANGGARAN BIAYA (RAB) NORMALISASI</div>
        
        <table class="info-table">
          <tr><td>Program</td><td>:</td><td>${kopData?.program || '-'}</td></tr>
          <tr><td>Kegiatan</td><td>:</td><td>${kopData?.kegiatan || '-'}</td></tr>
          <tr><td>Pekerjaan</td><td>:</td><td>${kopData?.pekerjaan || 'Normalisasi Saluran'}</td></tr>
          <tr><td>Lokasi</td><td>:</td><td>${kopData?.lokasi || '-'}</td></tr>
          <tr><td>Tahun Anggaran</td><td>:</td><td>${kopData?.tahun || new Date().getFullYear()}</td></tr>
        </table>
        
        <table>
          <thead>
            <tr>
              <th width="5%">No</th>
              <th width="45%">Uraian Pekerjaan</th>
              <th width="10%">Satuan</th>
              <th width="20%">Harga Satuan (Rp)</th>
              <th width="20%">Jumlah Harga (Rp)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="text-center">I</td>
              <td class="font-bold" colspan="4">PEKERJAAN TANAH (GALIAN SEDIMEN)</td>
            </tr>
            <tr>
              <td class="text-center">1</td>
              <td>Biaya Bahan Bakar Minyak (BBM) Alat Berat</td>
              <td class="text-center">Ltr</td>
              <td class="text-right">22.300</td>
              <td class="text-right">${formatRp(costBBM)}</td>
            </tr>
            <tr>
              <td class="text-center">2</td>
              <td>Upah Penjaga Malam (2 Orang)</td>
              <td class="text-center">HOK</td>
              <td class="text-right">75.000</td>
              <td class="text-right">${formatRp(costPenjaga)}</td>
            </tr>
            <tr>
              <td colspan="4" class="text-right font-bold">SUB TOTAL</td>
              <td class="text-right font-bold">${formatRp(costBBM + costPenjaga)}</td>
            </tr>
            <tr>
              <td colspan="4" class="text-right font-bold">PPN (12%)</td>
              <td class="text-right font-bold">${formatRp((costBBM + costPenjaga) * 0.12)}</td>
            </tr>
            <tr>
              <td colspan="4" class="text-right font-bold" style="font-size: 12pt;">GRAND TOTAL</td>
              <td class="text-right font-bold" style="font-size: 12pt;">${formatRp(grandTotal)}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="ttd-section">
          <div class="ttd-box">
            <p>Dibuat Oleh,<br>Pelaksana Kegiatan</p>
            <p class="ttd-name">${kopData?.preparedBy || '...................................'}</p>
          </div>
          <div class="ttd-box">
            <p>Disetujui Oleh,<br>Pejabat Pembuat Komitmen</p>
            <p class="ttd-name">${kopData?.approvedBy || '...................................'}</p>
          </div>
        </div>
      </div>
      
      <!-- HALAMAN 2: ANALISA HARGA SATUAN -->
      <div class="page">
        <div class="header-kop">
          <img src="/logo-bojonegoro.png" alt="Logo" onerror="this.style.display='none'" />
          <h1>PEMERINTAH KABUPATEN BOJONEGORO</h1>
          <h2>DINAS PEKERJAAN UMUM SUMBER DAYA AIR</h2>
        </div>
        
        <div class="section-title">ANALISA PERENCANAAN ALAT BERAT</div>
        
        <table>
          <thead>
            <tr>
              <th width="5%">No</th>
              <th width="45%">Parameter Spesifikasi Alat</th>
              <th width="20%">Satuan</th>
              <th width="30%">Nilai / Koefisien</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="text-center">1</td><td>Tenaga Mesin (HP)</td><td class="text-center">HP</td><td class="text-center">${formatNum(analisaRencana?.hp)}</td>
            </tr>
            <tr>
              <td class="text-center">2</td><td>Kapasitas Bucket (V)</td><td class="text-center">m³</td><td class="text-center">${formatNum(analisaRencana?.bucket)}</td>
            </tr>
            <tr>
              <td class="text-center">3</td><td>Faktor Bucket (Fb)</td><td class="text-center">-</td><td class="text-center">${formatNum(analisaRencana?.fb)}</td>
            </tr>
            <tr>
              <td class="text-center">4</td><td>Faktor Efisiensi Alat (Fa)</td><td class="text-center">-</td><td class="text-center">${formatNum(analisaRencana?.fa)}</td>
            </tr>
            <tr>
              <td class="text-center">5</td><td>Faktor Konversi Galian (Fv)</td><td class="text-center">-</td><td class="text-center">${formatNum(analisaRencana?.fv)}</td>
            </tr>
            <tr>
              <td class="text-center">6</td><td>Waktu Siklus (Cm)</td><td class="text-center">Menit</td><td class="text-center">${formatNum(analisaCalculated?.t1 || analisaRencana?.waktuGali/60, 4)}</td>
            </tr>
            <tr>
              <td class="text-center" colspan="4" style="background:#f0f0f0;"><strong>KAPASITAS PRODUKSI</strong></td>
            </tr>
            <tr>
              <td class="text-center">7</td><td>Produksi per Jam (Q1)</td><td class="text-center">m³/Jam</td><td class="text-center font-bold">${formatNum(analisaCalculated?.q1)}</td>
            </tr>
            <tr>
              <td class="text-center">8</td><td>Produksi per Hari (Q2)</td><td class="text-center">m³/Hari</td><td class="text-center font-bold">${formatNum(analisaCalculated?.q2)}</td>
            </tr>
            <tr>
              <td class="text-center">9</td><td>Konsumsi BBM per Jam (H)</td><td class="text-center">Liter/Jam</td><td class="text-center font-bold">${formatNum(analisaCalculated?.H)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- HALAMAN 3: LOG REALISASI -->
      <div class="page">
        <div class="section-title">LOG KEBUTUHAN REALISASI HARIAN</div>
        
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Tanggal</th>
              <th>Unit Alat</th>
              <th>Jam Kerja (H)</th>
              <th>Vol. Galian (m³)</th>
              <th>BBM Digunakan (Ltr)</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            ${(dailyData || []).map((d, i) => `
              <tr>
                <td class="text-center">${i + 1}</td>
                <td class="text-center">${d.tanggal}</td>
                <td class="text-center">${d.unit}</td>
                <td class="text-center">${formatNum(d.jam, 1)}</td>
                <td class="text-right">${formatNum(d.galian, 2)}</td>
                <td class="text-right">${formatNum(d.bbm, 1)}</td>
                <td>${d.keterangan || '-'}</td>
              </tr>
            `).join('')}
            ${(!dailyData || dailyData.length === 0) ? '<tr><td colspan="7" class="text-center">Belum ada data realisasi harian yang dipilih.</td></tr>' : ''}
          </tbody>
          <tfoot>
            <tr>
              <th colspan="3" class="text-right">TOTAL KUMULATIF</th>
              <th class="text-center">${formatNum(selTotals?.jam, 1)}</th>
              <th class="text-right">${formatNum(selTotals?.galian, 2)}</th>
              <th class="text-right">${formatNum(selTotals?.bbm, 1)}</th>
              <th></th>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- BAGIAN 1: GAMBAR PERENCANAAN (LANDSCAPE, 1 PER HALAMAN) -->
      ${svgsRencana.length > 0 ? `<div class="section-title" style="page-break-before: always;">LAMPIRAN I: GAMBAR PERENCANAAN (REKAYASA)</div>` : ''}
      ${svgsRencana.map((s, idx) => `
        <div class="page landscape">
          <div class="cad-container">${s.svg}</div>
        </div>
      `).join('')}

      <!-- BAGIAN 2: GAMBAR PELAKSANAAN (LANDSCAPE, 1 PER HALAMAN) -->
      ${svgsPelaksanaan.length > 0 ? `<div class="section-title" style="page-break-before: always;">LAMPIRAN II: GAMBAR PELAKSANAAN (REALISASI)</div>` : ''}
      ${svgsPelaksanaan.map((s, idx) => `
        <div class="page landscape">
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