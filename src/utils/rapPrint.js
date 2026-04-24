'use client';
import { renderToString } from 'react-dom/server';
import CrossSectionSVG from '../components/CrossSectionSVG';

export function generatePrintableSVG(staData, kopData, options = {}) {
  const { width = 1200, height = 750, jenis = 'PERENCANAAN' } = options;
  return renderToString(
    <CrossSectionSVG staData={staData} kopData={{...kopData, sta: options.sta || kopData.sta, noLembar: options.noLembar, jumlahLembar: options.jumlahLembar, jenis}} width={width} height={height} />
  );
}

export function generateAllSVGs(rapState) {
  const { geometri, backupPelaksanaan } = rapState;
  const svgs = [];
  geometri.stas?.forEach((sta, i) => {
    svgs.push({ jenis: 'PERENCANAAN', sta: sta.sta, index: i,
      svg: generatePrintableSVG({ dimensi: { b1: sta.b1, b2: sta.b2, b3: sta.b3, h: sta.h, hPrime: sta.hPrime, slope: geometri.slope }, luasGalian: sta.luas },
        { ...geometri.kopData, sta: sta.sta, noLembar: i+1, jumlahLembar: geometri.stas?.length||5, jenis: 'PERENCANAAN' }, { jenis: 'PERENCANAAN' })
    });
  });
  backupPelaksanaan.stas?.forEach((sta, i) => {
    svgs.push({ jenis: 'PELAKSANAAN', sta: sta.sta, index: i,
      svg: generatePrintableSVG({ dimensi: { b1: sta.b1, b2: sta.b2, b3: sta.b3, h: sta.h, hPrime: sta.hPrime, slope: geometri.slope }, luasGalian: sta.luas },
        { ...geometri.kopData, sta: sta.sta, noLembar: i+1, jumlahLembar: backupPelaksanaan.stas?.length||5, jenis: 'PELAKSANAAN' }, { jenis: 'PELAKSANAAN' })
    });
  });
  return svgs;
}

/* ══════════════════════════════════════════
   PRINT PDF — jsPDF with mixed orientations
   ══════════════════════════════════════════ */
export async function printCrossSections(rapState) {
  try {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [330.2, 215.9] });

  const { analisaRencana, selTotals, dailyData, kopData, grandTotal, costBBM, costPenjaga, analisaCalculated, geometri, backupPelaksanaan, hargaBBM, hargaPenjaga, selectedExcavator } = rapState;
  const fN = (n, f=2) => Number(n||0).toFixed(f);
  const fR = (n) => 'Rp ' + Math.round(n||0).toLocaleString('id-ID');
  const q1 = analisaCalculated?.q1 || 50;
  const bbmH = analisaCalculated?.H || 6;
  const q2 = analisaCalculated?.q2 || (q1 * 7);
  const volRencana = geometri?.totalVolume || geometri?.volumeGalian || 0;
  const estimasiHariRencana = Math.ceil(volRencana / (q1 * 7));
  const hBBM = hargaBBM || 22300;
  const hPjg = hargaPenjaga || 75000;


  let firstPage = true;
  const addPage = (orient = 'landscape') => {
    if (!firstPage) doc.addPage([330.2, 215.9], orient);
    firstPage = false;
  };
  const hdr = (title, orient) => {
    const w = orient === 'portrait' ? 215.9 : 330.2;
    doc.setFontSize(14); doc.setFont('helvetica','bold');
    doc.text('PEMERINTAH KABUPATEN BOJONEGORO', w/2, 15, {align:'center'});
    doc.setFontSize(12);
    doc.text('DINAS PEKERJAAN UMUM SUMBER DAYA AIR', w/2, 22, {align:'center'});
    doc.setLineWidth(0.8); doc.line(12, 25, w-12, 25);
    doc.setFontSize(11); doc.text(title, w/2, 33, {align:'center'});
    doc.setFontSize(9); doc.setFont('helvetica','normal');
    doc.text(`Pekerjaan: ${kopData?.pekerjaan||'-'}`, 14, 40);
    doc.text(`Lokasi: ${kopData?.lokasi||'-'}`, 14, 45);
  };

  // ═══ HAL 1: BACKUP VOLUME RENCANA (Landscape) ═══
  addPage('landscape');
  hdr('BACKUP VOLUME RENCANA PEKERJAAN', 'landscape');
  const bvRows = (geometri?.stas||[]).map((s,i) => {
    const lStrip = (geometri.lebarStripping||2)*(geometri.kedalamanStripping||0.1);
    return [i+1, s.sta, fN(s.b1), fN(s.b3), fN(s.hPrime||s.h), fN(s.luas), fN(lStrip), fN((s.luas||0)+lStrip), fN(s.volume||0)];
  });
  autoTable(doc, { startY: 50, head:[['No','STA','b1(m)','b3(m)','h\'(m)','Luas(m²)','Strip(m²)','Total(m²)','Vol(m³)']], body: bvRows, styles:{fontSize:8,halign:'center'}, headStyles:{fillColor:[220,220,220],textColor:0} });

  // ═══ HAL 2: ANALISA HARGA SATUAN PERENCANAAN (Portrait) ═══
  addPage('portrait');
  hdr('ANALISA HARGA SATUAN GALIAN TANAH\nDENGAN EXCAVATOR (PERENCANAAN)', 'portrait');
  const anaRows = [
    ['','I. ASUMSI','','',''],
    ['1','Jam Kerja Efektif/Hari','Tk',fN(analisaRencana?.tk||7,0),'Jam'],
    ['2','Faktor Pengembangan','Fk',fN(analisaRencana?.fk||0.8),''],
    ['','II. URAIAN PERALATAN','','',''],
    ['1','Tenaga Mesin','Pw',fN(analisaRencana?.hp),'HP'],
    ['2','Kapasitas Bucket','V',fN(analisaRencana?.bucket),'m³'],
    ['3','Faktor Bucket','Fb',fN(analisaRencana?.fb),''],
    ['4','Faktor Efisiensi Alat','Fa',fN(analisaRencana?.fa),''],
    ['5','Faktor Konversi Galian','Fv',fN(analisaRencana?.fv||0.8),''],
    ['6','Waktu Siklus','T.1',fN(analisaCalculated?.t1||0.66,4),'menit'],
    ['7','Kap. Produksi/Jam','Q1',fN(q1),'m³/jam'],
    ['8','Kap. Produksi/Hari','Q2',fN(q2),'m³/hari'],
    ['','III. BIAYA OPERASI/JAM','','',''],
    ['','kW = HP x 0.7457','',fN(analisaCalculated?.kW||0),'kW'],
    ['','Load Factor','',fN(analisaRencana?.loadFactor||0.28),'L/kWh'],
    ['','Fe = 45/60','',fN(analisaCalculated?.fe||0.75,4),''],
    ['','Fd','',fN(analisaCalculated?.fd||0,4),''],
    ['','Konsumsi BBM/Jam','H',fN(bbmH),'Ltr/jam'],
    ['','Konsumsi BBM/Hari','h2',fN(bbmH*(analisaRencana?.tk||7)),'Ltr/hari'],
    ['','IV. ESTIMASI','','',''],
    ['','Volume Target','V',fN(volRencana),'m³'],
    ['','Estimasi Waktu','',String(estimasiHariRencana),'Hari'],
    ['','Total Kebutuhan Solar','',fN(analisaCalculated?.totalSolar||0),'Liter'],
  ];
  autoTable(doc, { startY: 50, head:[['No','Keterangan','Simbol','Nilai','Satuan']], body: anaRows, styles:{fontSize:8}, headStyles:{fillColor:[220,220,220],textColor:0}, columnStyles:{0:{halign:'center',cellWidth:12},3:{halign:'center'},4:{halign:'center'}} });

  // ═══ HAL 3: ANALISA HARGA SATUAN PEKERJAAN (Landscape) ═══
  addPage('landscape');
  hdr('ANALISA HARGA SATUAN PEKERJAAN', 'landscape');
  const koefBBM = analisaCalculated?.koefBBM || (bbmH / q1);
  const hspRows = [
    ['A','TENAGA','','','','',''],
    ['1','Penjaga Malam','OH','2',fR(hPjg),fR(2*hPjg),''],
    ['B','BAHAN','','','','',''],
    ['1','BBM Solar','Liter',fN(koefBBM,4),fR(hBBM),fR(koefBBM*hBBM),''],
    ['C','PERALATAN','','','','',''],
    ['1',`Excavator ${selectedExcavator||'PC200'}`,'Jam','1','-','-','Swakelola'],
    ['','','','','TOTAL',fR(2*hPjg + koefBBM*hBBM),'per m³'],
  ];
  autoTable(doc, { startY: 50, head:[['No','Uraian','Satuan','Koefisien','Harga Satuan','Jumlah','Ket']], body: hspRows, styles:{fontSize:8}, headStyles:{fillColor:[220,220,220],textColor:0} });

  // ═══ HAL 4: PERHITUNGAN RENCANA TENAGA & BAHAN (Landscape) ═══
  addPage('landscape');
  hdr('PERHITUNGAN RENCANA TENAGA DAN BAHAN', 'landscape');
  const totalSolar = analisaCalculated?.totalSolar || (volRencana * koefBBM);
  const tbRows = [
    ['A','TENAGA','','',''],
    ['1','Penjaga Malam','OH',String(estimasiHariRencana*2),fR(estimasiHariRencana*2*hPjg)],
    ['B','BAHAN','','',''],
    ['1','BBM Solar','Liter',fN(totalSolar,0),fR(totalSolar*hBBM)],
    ['','','','TOTAL',fR(estimasiHariRencana*2*hPjg + totalSolar*hBBM)],
  ];
  autoTable(doc, { startY: 50, head:[['No','Uraian','Satuan','Volume','Jumlah Harga']], body: tbRows, styles:{fontSize:8}, headStyles:{fillColor:[220,220,220],textColor:0} });

  // ═══ HAL 5: RENCANA ANGGARAN BIAYA PER BAHAN (Landscape) ═══
  addPage('landscape');
  hdr('RENCANA ANGGARAN BIAYA PER BAHAN', 'landscape');
  const subTotalRencana = estimasiHariRencana*2*hPjg + totalSolar*hBBM;
  const ppnRencana = subTotalRencana * 0.12;
  const rabRows = [
    ['I','PEKERJAAN GALIAN SEDIMEN','','','',''],
    ['1','Bahan Bakar Minyak (BBM Solar)',fN(totalSolar,0),'Ltr',fR(hBBM),fR(totalSolar*hBBM)],
    ['2','Upah Penjaga Malam (2 Org x '+estimasiHariRencana+' Hari)',String(estimasiHariRencana*2),'HOK',fR(hPjg),fR(estimasiHariRencana*2*hPjg)],
    ['','','','','SUB TOTAL',fR(subTotalRencana)],
    ['','','','','PPN 12%',fR(ppnRencana)],
    ['','','','','TOTAL',fR(subTotalRencana+ppnRencana)],
  ];
  autoTable(doc, { startY: 50, head:[['No','Uraian Pekerjaan','Volume','Satuan','Harga Satuan','Jumlah Harga']], body: rabRows, styles:{fontSize:8}, headStyles:{fillColor:[220,220,220],textColor:0} });
  doc.setFontSize(8);
  doc.text(`Estimasi Waktu Rencana: ${estimasiHariRencana} hari kerja (Vol ${fN(volRencana)} m³ ÷ Q1 ${fN(q1)} m³/jam × 7 jam/hari)`, 14, (doc.lastAutoTable?.finalY || 180)+10);

  // ═══ HAL 6: RAB RENCANA (Landscape) ═══
  addPage('landscape');
  hdr('RENCANA ANGGARAN BIAYA (RAB)', 'landscape');
  doc.setFontSize(9);
  doc.text(`Program: ${kopData?.program||'-'}`, 14, 50);
  doc.text(`Kegiatan: ${kopData?.kegiatan||'-'}`, 14, 55);
  doc.text(`Pekerjaan: ${kopData?.pekerjaan||'-'}`, 14, 60);
  const hspPerM3 = 2*hPjg + koefBBM*hBBM;
  const rab2Rows = [
    ['I','Pekerjaan Galian Tanah (Normalisasi)',fN(volRencana),'m³',fR(hspPerM3),fR(volRencana*hspPerM3)],
    ['','','','','SUB TOTAL',fR(volRencana*hspPerM3)],
    ['','','','','PPN 12%',fR(volRencana*hspPerM3*0.12)],
    ['','','','','GRAND TOTAL',fR(volRencana*hspPerM3*1.12)],
  ];
  autoTable(doc, { startY: 65, head:[['No','Uraian','Volume','Sat','Harga Satuan','Jumlah']], body: rab2Rows, styles:{fontSize:8}, headStyles:{fillColor:[220,220,220],textColor:0} });

  // ═══ HAL 7: RINCIAN KEBUTUHAN & HASIL PELAKSANAAN (Portrait) ═══
  addPage('portrait');
  hdr('RINCIAN KEBUTUHAN DAN HASIL PELAKSANAAN', 'portrait');
  let cumVol = 0;
  const rkRows = (dailyData||[]).map((d,i) => {
    const gal = d.jam * q1;
    const bbm = d.jam * bbmH;
    cumVol += gal;
    return [i+1, d.tanggal, fN(d.jam,1), fN(q1), fN(gal), fN(bbmH), fN(bbm), fN(cumVol), d.keterangan||'-'];
  });
  autoTable(doc, { startY: 50, head:[['No','Tanggal','Jam','Q1','Vol(m³)','H','BBM(L)','Kum Vol','Ket']], body: rkRows, styles:{fontSize:7}, headStyles:{fillColor:[220,220,220],textColor:0} });

  // ═══ HAL 8: ANALISA PELAKSANAAN (Portrait) ═══
  addPage('portrait');
  hdr('ANALISA HARGA SATUAN GALIAN TANAH\nDENGAN EXCAVATOR (PELAKSANAAN)', 'portrait');
  autoTable(doc, { startY: 50, head:[['No','Keterangan','Simbol','Nilai','Satuan']], body: anaRows, styles:{fontSize:8}, headStyles:{fillColor:[220,220,220],textColor:0}, columnStyles:{0:{halign:'center',cellWidth:12},3:{halign:'center'},4:{halign:'center'}} });

  // ═══ HAL 9: BACKUP VOLUME PELAKSANAAN (Landscape) ═══
  addPage('landscape');
  hdr('BACKUP VOLUME PELAKSANAAN', 'landscape');
  const bvpRows = (backupPelaksanaan?.stas||[]).map((s,i) => {
    const lStrip = (geometri.lebarStripping||2)*(geometri.kedalamanStripping||0.1);
    return [i+1, s.sta, fN(s.b1), fN(s.b3), fN(s.hPrime||s.h), fN(s.luas), fN(lStrip), fN((s.luas||0)+lStrip), fN(s.volume||0)];
  });
  autoTable(doc, { startY: 50, head:[['No','STA','b1(m)','b3(m)','h\'(m)','Luas(m²)','Strip(m²)','Total(m²)','Vol(m³)']], body: bvpRows, styles:{fontSize:8,halign:'center'}, headStyles:{fillColor:[220,220,220],textColor:0} });

  // ═══ HAL 10: ANALISA HSP PELAKSANAAN (Landscape) ═══
  addPage('landscape');
  hdr('ANALISA HARGA SATUAN PEKERJAAN (PELAKSANAAN)', 'landscape');
  autoTable(doc, { startY: 50, head:[['No','Uraian','Satuan','Koefisien','Harga Satuan','Jumlah','Ket']], body: hspRows, styles:{fontSize:8}, headStyles:{fillColor:[220,220,220],textColor:0} });

  // ═══ HAL 11: TENAGA & BAHAN PELAKSANAAN (Landscape) ═══
  const durasiPelaksanaan = (dailyData||[]).length || 1;
  addPage('landscape');
  hdr('PERHITUNGAN TENAGA DAN BAHAN (PELAKSANAAN)', 'landscape');
  const totalSolarPlks = selTotals?.bbm || 0;
  const tbpRows = [
    ['A','TENAGA','','',''],
    ['1','Penjaga Malam','OH',String(durasiPelaksanaan*2),fR(durasiPelaksanaan*2*hPjg)],
    ['B','BAHAN','','',''],
    ['1','BBM Solar','Liter',fN(totalSolarPlks,0),fR(totalSolarPlks*hBBM)],
    ['','','','TOTAL',fR(durasiPelaksanaan*2*hPjg + totalSolarPlks*hBBM)],
  ];
  autoTable(doc, { startY: 50, head:[['No','Uraian','Satuan','Volume','Jumlah Harga']], body: tbpRows, styles:{fontSize:8}, headStyles:{fillColor:[220,220,220],textColor:0} });

  // ═══ HAL 12: REALISASI ANGGARAN PER BAHAN (Landscape) ═══
  addPage('landscape');
  hdr('REALISASI ANGGARAN PELAKSANAAN PER BAHAN', 'landscape');
  const subTotalPlks = durasiPelaksanaan*2*hPjg + totalSolarPlks*hBBM;
  const rapbRows = [
    ['I','PEKERJAAN GALIAN SEDIMEN','','','',''],
    ['1','BBM Solar',fN(totalSolarPlks,0),'Ltr',fR(hBBM),fR(totalSolarPlks*hBBM)],
    ['2','Upah Penjaga Malam (2 Org x '+durasiPelaksanaan+' Hari)',String(durasiPelaksanaan*2),'HOK',fR(hPjg),fR(durasiPelaksanaan*2*hPjg)],
    ['','','','','SUB TOTAL',fR(subTotalPlks)],
    ['','','','','PPN 12%',fR(subTotalPlks*0.12)],
    ['','','','','TOTAL',fR(subTotalPlks*1.12)],
  ];
  autoTable(doc, { startY: 50, head:[['No','Uraian','Volume','Sat','Harga Satuan','Jumlah']], body: rapbRows, styles:{fontSize:8}, headStyles:{fillColor:[220,220,220],textColor:0} });
  doc.setFontSize(8);
  doc.text(`Estimasi Waktu Pelaksanaan: ${durasiPelaksanaan} hari (dari ${dailyData?.[0]?.tanggal||'-'} s/d ${dailyData?.[dailyData.length-1]?.tanggal||'-'})`, 14, doc.lastAutoTable.finalY+10);

  // ═══ HAL 13: REALISASI ANGGARAN PELAKSANAAN (Landscape) ═══
  addPage('landscape');
  hdr('REALISASI ANGGARAN PELAKSANAAN', 'landscape');
  const volPlks = selTotals?.galian || 0;
  const rap2Rows = [
    ['I','Pekerjaan Galian Tanah (Realisasi)',fN(volPlks),'m³',fR(hspPerM3),fR(volPlks*hspPerM3)],
    ['','','','','SUB TOTAL',fR(volPlks*hspPerM3)],
    ['','','','','PPN 12%',fR(volPlks*hspPerM3*0.12)],
    ['','','','','GRAND TOTAL',fR(volPlks*hspPerM3*1.12)],
  ];
  autoTable(doc, { startY: 50, head:[['No','Uraian','Volume','Sat','Harga Satuan','Jumlah']], body: rap2Rows, styles:{fontSize:8}, headStyles:{fillColor:[220,220,220],textColor:0} });

  // ═══ HAL 14+: GAMBAR TEKNIK CAD (Letter Landscape, 1 per halaman) ═══
  try {
    const svgs = generateAllSVGs(rapState);
    for (const s of svgs) {
      doc.addPage([279.4, 215.9], 'landscape');
      // Convert SVG to canvas then to image
      const container = document.createElement('div');
      container.innerHTML = s.svg;
      container.style.cssText = 'position:fixed;left:-9999px;width:1200px;height:750px';
      document.body.appendChild(container);
      const svgEl = container.querySelector('svg');
      if (svgEl) {
        const canvas = document.createElement('canvas');
        canvas.width = 2400; canvas.height = 1500;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0,0,2400,1500);
        const blob = new Blob([new XMLSerializer().serializeToString(svgEl)], {type:'image/svg+xml'});
        const url = URL.createObjectURL(blob);
        const img = new Image();
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
        ctx.drawImage(img, 0, 0, 2400, 1500);
        URL.revokeObjectURL(url);
        const png = canvas.toDataURL('image/png');
        // Letter landscape: 279.4 x 215.9 mm, fill entire page (KOP is the margin)
        doc.addImage(png, 'PNG', 0, 0, 279.4, 215.9);
      }
      document.body.removeChild(container);
    }
  } catch(e) { console.warn('CAD render error:', e); }

  // Save
  doc.save(`RAP_${kopData?.pekerjaan||'Proyek'}.pdf`);

  } catch(err) {
    console.error('PDF Generation Error:', err);
    alert('Error generating PDF: ' + err.message);
  }
}