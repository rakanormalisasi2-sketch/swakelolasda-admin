'use client';
import { renderToString } from 'react-dom/server';
import CrossSectionSVG from '../components/CrossSectionSVG';
import { distributeBBMDrops } from './calcRapMath';
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

export async function printCrossSections(rapState) {
  try {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const { analisaRencana: ar, selTotals, dailyData, kopData, analisaCalculated: ac, geometri: g, backupPelaksanaan: bp, hargaBBM, hargaPenjaga, selectedExcavator } = rapState;
    const preparedBy = kopData?.preparedBy || 'Ir. Budi Santoso, MT';
    const approvedBy = kopData?.approvedBy || 'Dr. Hendra Wijaya, IAI';
    const addSignature = (doc, y, w) => {
      const col1 = 30, col2 = w - 100;
      const subKegShort = subKeg || 'NORMALISASI/RESTORASI SUNGAI';
      
      const jabMenyetujui = kopData?.jabatanMenyetujui || 'KUASA PENGGUNA ANGGARAN';
      const namMenyetujui = kopData?.namaMenyetujui || '-';
      const nipMenyetujui = kopData?.nipMenyetujui || '-';
      
      const jabMengetahui = kopData?.jabatanMengetahui || 'PEJABAT PELAKSANA TEKNIS KEGIATAN';
      const namMengetahui = kopData?.namaMengetahui || '-';
      const nipMengetahui = kopData?.nipMengetahui || '-';
      
      doc.setFontSize(8); doc.setFont('helvetica','normal');
      doc.text('Menyetujui :', col1, y);
      doc.text('Mengetahui :', col2, y);
      
      // Jabatan
      doc.setFontSize(7); doc.setFont('helvetica','bold');
      doc.text(jabMenyetujui, col1, y + 8);
      doc.text(jabMengetahui, col2, y + 8);
      
      // Sub Kegiatan line
      doc.setFont('helvetica','normal');
      doc.text('SUB KEGIATAN ' + subKegShort, col1, y + 12);
      doc.text('SUB KEGIATAN ' + subKegShort, col2, y + 12);
      
      // Nama (bold, underlined)
      doc.setFontSize(8); doc.setFont('helvetica','bold');
      doc.text(namMenyetujui, col1, y + 30);
      doc.text(namMengetahui, col2, y + 30);
      
      // Underline below name
      const nameW1 = doc.getTextWidth(namMenyetujui);
      const nameW2 = doc.getTextWidth(namMengetahui);
      doc.setLineWidth(0.3);
      doc.line(col1, y + 31, col1 + nameW1, y + 31);
      doc.line(col2, y + 31, col2 + nameW2, y + 31);
      
      // NIP
      doc.setFontSize(7); doc.setFont('helvetica','normal');
      doc.text('NIP.' + nipMenyetujui, col1, y + 35);
      doc.text('NIP. ' + nipMengetahui, col2, y + 35);
    };
    const f = (n,d=2) => Number(n||0).toFixed(d);
    const fR = n => 'Rp ' + Math.round(n||0).toLocaleString('id-ID');
    const q1=ac?.q1||50, H=ac?.H||6, q2=ac?.q2||(q1*7), kW=ac?.kW||31;
    const vol = g?.totalVolume||0, estHari = Math.ceil(vol/(q1*7)||1);
    const hB=hargaBBM||22300, hP=hargaPenjaga||75000;
    const koef = H/q1, totalSolar = vol*koef;
    const b1=g?.b1||4, b3=g?.b3||6.857, hSal=g?.h||1, hGal=g?.hGalian||g?.hPrime||1;
    const b2r = b1*(hGal/(hGal+hSal));
    const pjg = g?.panjang||540;
    const doc = new jsPDF({orientation:'landscape',unit:'mm',format:[330.2,215.9]});
    const tS = {fontSize:7, cellPadding:1.5, lineColor:[0,0,0], lineWidth:0.1};
    const hS = {fillColor:[255,255,255], textColor:0, fontStyle:'bold', lineColor:[0,0,0], lineWidth:0.2};
    let pg = false;
    const np = (o='landscape') => { if(pg) doc.addPage([330.2,215.9],o); pg=true; };
    const subKeg = kopData?.subKegiatan || 'NORMALISASI / RESTORASI SUNGAI';
    const pekerjaan = kopData?.pekerjaan || '-';
    const tahunAnggaran = kopData?.tahun || new Date().getFullYear();
    const alatLabel = (selectedExcavator||'').toLowerCase().includes('bull') ? (selectedExcavator||'Bulldozer') : 'Excavator';
    
    const kop = (t,o,extra) => {
      const w = o==='portrait'?215.9:330.2;
      
      doc.setFont('helvetica','bold'); doc.setFontSize(11);
      doc.text('PEMERINTAH KABUPATEN BOJONEGORO',w/2,10,{align:'center'});
      doc.setFontSize(9); doc.text('DINAS PEKERJAAN UMUM SUMBER DAYA AIR',w/2,15,{align:'center'});
      doc.setLineWidth(0.5); doc.line(10,17,w-10,17);
      doc.setFontSize(9); doc.setFont('helvetica','bold');
      
      const titleLines = t.split('\n');
      doc.text(titleLines, w/2, 22, {align:'center'});
      
      doc.setFontSize(7); doc.setFont('helvetica','normal');
      let y = 22 + (titleLines.length * 5);
      
      doc.text('SUB KEGIATAN',12,y); doc.text(': '+subKeg,55,y); y+=4;
      doc.text('PEKERJAAN',12,y); doc.text(': '+pekerjaan,55,y); y+=4;
      if(extra?.volume) { doc.text('VOLUME',12,y); doc.text(': '+f(extra.volume)+' m³',55,y); y+=4; }
      if(extra?.durasi) { doc.text('DURASI',12,y); doc.text(': '+extra.durasi+' Hari Kerja',55,y); y+=4; }
      doc.text('TAHUN ANGGARAN',12,y); doc.text(': '+tahunAnggaran,55,y); y+=4;
      doc.setLineWidth(0.2); doc.line(10,y,w-10,y);
      return y+3;
    };

    // === HAL 1: BACKUP VOLUME RENCANA ===
    np('landscape'); const y1s=kop('BACKUP VOLUME RENCANA PEKERJAAN','landscape');
    doc.setFontSize(7);
    doc.text(`b3=${f(b3)}m | b1=${f(b1)}m | h=${f(hSal)}m | h'=${f(hGal)}m | L=${f(pjg,0)}m | Strip: ${f(g?.lebarStripping||2)}×${f(g?.kedalamanStripping||0.1)}m`,12,y1s);
    const staVolTotal = (g?.stas||[]).reduce((a,s)=>a+(s.volume||0),0);
    const bv = (g?.stas||[]).map((s,i) => [i+1,s.sta,f(s.b1),f(s.b3),f(s.h),f(s.hPrime||hGal),f(s.luas),f(s.jarak||0,0),i===0?'-':f(s.volume||0)]);
    bv.push(['','','','','','','TOTAL','',f(staVolTotal)]);
    autoTable(doc,{startY:y1s+3,head:[['No','STA','b1(m)','b3(m)','h(m)',"h'(m)",'Luas(m²)','Jarak(m)','Volume(m³)']],body:bv,styles:tS,headStyles:hS,theme:'grid'});
    let y1 = doc.lastAutoTable?.finalY||130;
    doc.setFontSize(7);
    doc.text(`Vol Galian STA = ${f(staVolTotal)} m³ + Stripping = ${f(g?.volumeStripping||0)} m³ = TOTAL ${f(vol)} m³`,12,y1+5);

    // === HAL 2: ANALISA HARGA SATUAN PERENCANAAN ===
    np('portrait'); const y2s=kop('ANALISA HARGA SATUAN\nGALIAN TANAH DENGAN '+alatLabel.toUpperCase(),'portrait');
    const a2 = [
      [{content:'I',styles:{fontStyle:'bold'}},{content:'ASUMSI',colSpan:4,styles:{fontStyle:'bold'}}],
      ['1','Jam Kerja efektif per hari','Tk',f(ar?.tk||7,0),'Jam'],
      ['2','Faktor Pengembangan Material','Fk',f(ar?.fk||0.8),''],
      [{content:'II',styles:{fontStyle:'bold'}},{content:'URUTAN KERJA',colSpan:4,styles:{fontStyle:'bold'}}],
      ['','a. Excavator menggali saluran, swing dan urug talud','','',''],
      [{content:'III',styles:{fontStyle:'bold'}},{content:'URAIAN PERALATAN',colSpan:4,styles:{fontStyle:'bold'}}],
      ['',alatLabel,{content:'E.15.i',styles:{halign:'center'}},'',''],
      ['1','Tenaga','Pw',f(ar?.hp),'HP'],
      ['2','Kapasitas Bucket','V (Cp)',f(ar?.bucket),'m³'],
      ['3','Jam Operasi per Tahun','w','2000','jam'],
      ['4','Faktor Bucket (tabel 9)','Fb',f(ar?.fb),''],
      ['5','Faktor Efisiensi Alat (tabel 4)','Fa',f(ar?.fa),''],
      ['6','Faktor Konversi Galian (tabel 11)','Fv',f(ar?.fv||0.8),'Normal'],
      ['7','Waktu Siklus','T.1',f(ac?.t1||0.31,4),'menit'],
      ['8','Kap.Produksi/Jam = (V×Fb×Fa×60)/(T1×Fv×Fk)','Q1',f(q1),'m³/jam'],
      ['9','Kap.Produksi/Hari = Q1 × Tk','Q.2',f(q2),'m³/hari'],
      ['10','Koefisien Alat/m³ = 1/Q1','',f(1/q1,6),'jam'],
      ['11','Koefisien Penjaga Malam','',f(estHari/vol,6),'OH'],
      [{content:'IV',styles:{fontStyle:'bold'}},{content:'BIAYA OPERASI PER JAM KERJA',colSpan:4,styles:{fontStyle:'bold'}}],
      ['','kW = HP × 0.7457','kW',f(kW),'kW'],
      ['','Load Factor','L/kWh',f(ar?.loadFactor||0.28),''],
      ['','Fe = '+f(ar?.feMenit||48,0)+'/60','Fe',f(ac?.fe||0.8,4),''],
      ['','Fd','Fd',f(ac?.fd||0.99,4),''],
      ['','Konsumsi BBM/Jam = Fd×Fe×kW×LF','H',f(H),'Ltr/jam'],
      ['','Konsumsi BBM/Hari = H×Tk','h2',f(H*(ar?.tk||7)),'Ltr/hari'],
      ['','Koef BBM/m³ = H/Q1','',f(koef,6),''],
      [{content:'V',styles:{fontStyle:'bold'}},{content:'ESTIMASI PEKERJAAN',colSpan:4,styles:{fontStyle:'bold'}}],
      ['','Volume Rencana','Vol',f(vol),'m³'],
      ['','Estimasi Waktu = ROUNDUP(Vol/Q2)','T.pek',String(estHari),'Hari'],
      ['','Total Kebutuhan Solar = Vol×Koef','Ks',f(totalSolar),'Liter'],
    ];
    autoTable(doc,{startY:y2s,head:[['No','URAIAN','Kode','Koef.','Satuan']],body:a2,styles:{...tS,fontSize:7},headStyles:hS,theme:'grid',columnStyles:{0:{cellWidth:10,halign:'center'},2:{cellWidth:18,halign:'center'},3:{cellWidth:22,halign:'right'},4:{cellWidth:18}}});

    // === HAL 3: AHSP PEKERJAAN (Landscape) ===
    np('landscape'); const y3s=kop('ANALISA HARGA SATUAN PEKERJAAN','landscape');
    doc.setFontSize(7); doc.text('1 m³ Menggali Menggunakan '+alatLabel,12,y3s);
    const a3 = [
      [{content:'A.',styles:{fontStyle:'bold'}},{content:'TENAGA',colSpan:5,styles:{fontStyle:'bold'}}],
      ['1','Penjaga Malam','OH',f(estHari/vol,6),fR(hP),fR(estHari/vol*hP)],
      [{content:'',styles:{fontStyle:'bold'}},{content:'JUMLAH TENAGA',colSpan:4,styles:{fontStyle:'bold'}},fR(estHari/vol*hP)],
      [{content:'B.',styles:{fontStyle:'bold'}},{content:'BAHAN',colSpan:5,styles:{fontStyle:'bold'}}],
      ['1','Solar','Ltr',f(koef,6),fR(hB),fR(koef*hB)],
      [{content:'',styles:{fontStyle:'bold'}},{content:'JUMLAH BAHAN',colSpan:4,styles:{fontStyle:'bold'}},fR(koef*hB)],
      [{content:'C.',styles:{fontStyle:'bold'}},{content:'PERALATAN (Swakelola)',colSpan:5,styles:{fontStyle:'bold'}}],
      ['1',alatLabel,'Jam',f(1/q1,6),'-','-'],
      [{content:'',styles:{fontStyle:'bold'}},{content:'TOTAL HARGA SATUAN PER m³',colSpan:4,styles:{fontStyle:'bold'}},{content:fR(estHari/vol*hP+koef*hB),styles:{fontStyle:'bold'}}],
    ];
    autoTable(doc,{startY:y3s+3,head:[['No','Uraian','Satuan','Koefisien','Harga Satuan','Jumlah Harga']],body:a3,styles:tS,headStyles:hS,theme:'grid'});

    // === HAL 4: TENAGA DAN BAHAN RENCANA ===
    np('landscape'); const y4s=kop('PERHITUNGAN RENCANA TENAGA DAN BAHAN','landscape',{volume:vol,durasi:estHari});
    const a4 = [
      [{content:'A.',styles:{fontStyle:'bold'}},{content:'TENAGA',colSpan:4,styles:{fontStyle:'bold'}}],
      ['1','Penjaga Malam (2 org × '+estHari+' hari)','OH',String(estHari*2),fR(estHari*2*hP)],
      [{content:'B.',styles:{fontStyle:'bold'}},{content:'BAHAN',colSpan:4,styles:{fontStyle:'bold'}}],
      ['1','BBM Solar','Liter',f(totalSolar,0),fR(totalSolar*hB)],
      [{content:'',styles:{fontStyle:'bold'}},{content:'TOTAL',colSpan:3,styles:{fontStyle:'bold'}},{content:fR(estHari*2*hP+totalSolar*hB),styles:{fontStyle:'bold'}}],
    ];
    autoTable(doc,{startY:y4s,head:[['No','Uraian','Satuan','Volume','Jumlah Harga']],body:a4,styles:tS,headStyles:hS,theme:'grid'});

    // === HAL 5: RAB PER BAHAN RENCANA ===
    np('landscape'); const y5s=kop('RENCANA ANGGARAN BIAYA PER BAHAN','landscape',{volume:vol,durasi:estHari});
    const sub5 = estHari*2*hP+totalSolar*hB;
    const a5 = [
      [{content:'I',styles:{fontStyle:'bold'}},{content:'PEKERJAAN GALIAN',colSpan:5,styles:{fontStyle:'bold'}}],
      ['1','BBM Solar',f(totalSolar,0),'Ltr',fR(hB),fR(totalSolar*hB)],
      ['2','Penjaga Malam (2 org × '+estHari+' hr)',String(estHari*2),'HOK',fR(hP),fR(estHari*2*hP)],
      ['','','','',{content:'SUB TOTAL',styles:{fontStyle:'bold'}},{content:fR(sub5),styles:{fontStyle:'bold'}}],
      ['','','','','PPN 12%',fR(sub5*0.12)],
      ['','','','',{content:'TOTAL',styles:{fontStyle:'bold'}},{content:fR(sub5*1.12),styles:{fontStyle:'bold'}}],
    ];
    autoTable(doc,{startY:y5s,head:[['No','Uraian','Volume','Sat','Harga Satuan','Jumlah Harga']],body:a5,styles:tS,headStyles:hS,theme:'grid'});

    // === HAL 6: RAB RENCANA ===
    np('landscape'); const y6s=kop('RENCANA ANGGARAN BIAYA (RAB)','landscape',{volume:vol,durasi:estHari});
    const hsp = estHari/vol*hP+koef*hB;
    const a6 = [
      ['I','Pekerjaan Galian Tanah (Normalisasi)',f(vol),'m³',fR(hsp),fR(vol*hsp)],
      ['','','','',{content:'SUB TOTAL',styles:{fontStyle:'bold'}},{content:fR(vol*hsp),styles:{fontStyle:'bold'}}],
      ['','','','','PPN 12%',fR(vol*hsp*0.12)],
      ['','','','',{content:'GRAND TOTAL',styles:{fontStyle:'bold'}},{content:fR(vol*hsp*1.12),styles:{fontStyle:'bold'}}],
    ];
    autoTable(doc,{startY:y6s,head:[['No','Uraian','Volume','Sat','Harga Satuan (Rp)','Jumlah (Rp)']],body:a6,styles:tS,headStyles:hS,theme:'grid'});
    addSignature(doc, (doc.lastAutoTable?.finalY||160)+10, 330.2);

    // === HAL 7: RINCIAN KEBUTUHAN & HASIL PELAKSANAAN ===
    const dP = (dailyData||[]).length||1;
    const volPel = bp?.totalVolume || selTotals?.galian || vol;
    np('landscape'); const y7s_header=kop('RINCIAN KEBUTUHAN DAN HASIL PELAKSANAAN','landscape');
    
    // Mathematical Alignment for Pelaksanaan Volume and BBM
    const sumJam = (dailyData||[]).reduce((a,d)=>a+(d.jam||0), 0) || 1;
    const q1Pel = volPel / sumJam;
    
    const T1Pel = (ar?.bucket * (ar?.fb||0.9) * (ar?.fa||0.83) * 60) / (q1Pel * (ar?.fv||0.8) * (ar?.fk||0.8));
    const T1PelSec = T1Pel * 60;
    const wGali = ar?.waktuGali || 38;
    const FdPelRaw = T1PelSec <= 0 ? 1 : (wGali / T1PelSec) + ((T1PelSec - wGali) / T1PelSec) * 0.7;
    const FdPel = Math.min(1.0, Math.max(0.3, FdPelRaw));
    
    // Total drops directly from daily log data (now populated from DB2 BBM pemakaian API)
    const totalDiterimaLogs = (dailyData||[]).reduce((acc, d) => acc + (d.bbmDiterima || 0), 0);
    const targetKonsumsiPel = totalDiterimaLogs > 0 ? Math.max(totalDiterimaLogs - 50, sumJam * 1) : volPel * (H/q1); // fallback to rencana if no logs
    const HPelMath = targetKonsumsiPel / sumJam;
    
    const FePelRaw = HPelMath / (FdPel * kW * (ar?.loadFactor || 0.28));
    const FePel = Math.min(1.0, Math.max(0.3, FePelRaw));
    const HPel = FdPel * FePel * kW * (ar?.loadFactor || 0.28);
    const koefPel = HPel / q1Pel;

    const drops = distributeBBMDrops(dailyData || [], HPel);
    let sisa = 0, cumV=0, cumBBM=0;
    const a7 = (dailyData || []).map((d, i) => {
      const g2 = (d.jam||0) * q1Pel;
      const iterH = (d.jam || 0) * HPel;
      sisa = sisa + (drops[i]||0) - iterH;
      cumV += g2; cumBBM += iterH;
      const dt = new Date(d.tanggal);
      return [
        i+1, dt.getDate(), dt.toLocaleString('id-ID',{month:'short'}), dt.getFullYear(),
        d.hmAwal||'', d.hmAkhir||'',
        f(d.jam,1), f(q1Pel), f(g2), f(cumV),
        f(HPel), f(iterH), (drops[i]||0)>0?f(drops[i],0):'', f(sisa)
      ];
    });
    a7.push([{content:'TOTAL',colSpan:6,styles:{fontStyle:'bold'}},'','',f(volPel),f(volPel),'',f(cumBBM),'','']);
    autoTable(doc,{startY:y7s_header,head:[['No','Tgl','Bln','Thn','HM Awal','HM Akhir','Jam','Q1','Vol(m³)','Kum Vol','H(L/j)','BBM(L)','Diterima','Sisa']],body:a7,styles:{...tS,fontSize:5.5},headStyles:{...hS,fontSize:5.5},theme:'grid'});

    // === HAL 8: ANALISA PELAKSANAAN ===
    np('portrait'); const y8s=kop('ANALISA HARGA SATUAN\nGALIAN TANAH DENGAN '+alatLabel.toUpperCase()+' (PELAKSANAAN)','portrait');
    const a2Pelaksanaan = [
      [{content:'I',styles:{fontStyle:'bold'}},{content:'ASUMSI',colSpan:4,styles:{fontStyle:'bold'}}],
      ['1','Jam Kerja efektif per hari','Tk',f(ar?.tk||7,0),'Jam'],
      ['2','Faktor Pengembangan Material','Fk',f(ar?.fk||0.8),''],
      [{content:'II',styles:{fontStyle:'bold'}},{content:'URUTAN KERJA',colSpan:4,styles:{fontStyle:'bold'}}],
      ['','a. Excavator menggali saluran, swing dan urug talud','','',''],
      [{content:'III',styles:{fontStyle:'bold'}},{content:'URAIAN PERALATAN',colSpan:4,styles:{fontStyle:'bold'}}],
      ['',alatLabel,{content:'E.15.i',styles:{halign:'center'}},'',''],
      ['1','Tenaga','Pw',f(ar?.hp),'HP'],
      ['2','Kapasitas Bucket','V (Cp)',f(ar?.bucket),'m³'],
      ['3','Jam Operasi per Tahun','w','2000','jam'],
      ['4','Faktor Bucket (tabel 9)','Fb',f(ar?.fb),''],
      ['5','Faktor Efisiensi Alat (tabel 4)','Fa',f(ar?.fa),''],
      ['6','Faktor Konversi Galian (tabel 11)','Fv',f(ar?.fv||0.8),'Normal'],
      ['7','Waktu Siklus','T.1',f(T1Pel,4),'menit'],
      ['8','Kap.Produksi/Jam = (V×Fb×Fa×60)/(T1×Fv×Fk)','Q1',f(q1Pel),'m³/jam'],
      ['9','Kap.Produksi/Hari = Q1 × Tk','Q.2',f(q1Pel*(ar?.tk||7)),'m³/hari'],
      ['10','Koefisien Alat/m³ = 1/Q1','',f(1/q1Pel,6),'jam'],
      ['11','Koefisien Penjaga Malam','',f(dP/volPel,6),'OH'],
      [{content:'IV',styles:{fontStyle:'bold'}},{content:'BIAYA OPERASI PER JAM KERJA',colSpan:4,styles:{fontStyle:'bold'}}],
      ['','kW = HP × 0.7457','kW',f(kW),'kW'],
      ['','Load Factor','L/kWh',f(ar?.loadFactor||0.28),''],
      ['','Fe','Fe',f(FePel,4),''],
      ['','Fd','Fd',f(FdPel,4),''],
      ['','Konsumsi BBM/Jam = Fd×Fe×kW×LF','H',f(HPel),'Ltr/jam'],
      ['','Konsumsi BBM/Hari = H×Tk','h2',f(HPel*(ar?.tk||7)),'Ltr/hari'],
      ['','Koef BBM/m³ = H/Q1','',f(koefPel,6),''],
      [{content:'V',styles:{fontStyle:'bold'}},{content:'ESTIMASI PEKERJAAN',colSpan:4,styles:{fontStyle:'bold'}}],
      ['','Volume Pelaksanaan','Vol',f(volPel),'m³'],
      ['','Durasi Pelaksanaan (Riil)','T.pek',String(dP),'Hari'],
      ['','Total Kebutuhan Solar = Vol×Koef','Ks',f(volPel*koefPel),'Liter'],
    ];
    autoTable(doc,{startY:y8s,head:[['No','URAIAN','Kode','Koef.','Satuan']],body:a2Pelaksanaan,styles:{...tS,fontSize:7},headStyles:hS,theme:'grid',columnStyles:{0:{cellWidth:10,halign:'center'},2:{cellWidth:18,halign:'center'},3:{cellWidth:22,halign:'right'},4:{cellWidth:18}}});

    // === HAL 9: BACKUP VOLUME PELAKSANAAN ===
    np('landscape'); const y9s=kop('BACKUP VOLUME PELAKSANAAN','landscape');
    const bvp = (bp?.stas||[]).map((s,i) => [i+1,s.sta,f(s.b1),f(s.b3),f(s.h),f(s.hPrime||hGal),f(s.luas),f(s.jarak||0,0),i===0?'-':f(s.volume||0)]);
    bvp.push(['','','','','','','TOTAL','',f((bp?.stas||[]).reduce((a,s)=>a+(s.volume||0),0))]);
    autoTable(doc,{startY:y9s,head:[['No','STA','b1(m)','b3(m)','h(m)',"h'(m)",'Luas(m²)','Jarak(m)','Volume(m³)']],body:bvp,styles:tS,headStyles:hS,theme:'grid'});

    // === HAL 10: AHSP PELAKSANAAN ===
    const hspPel = (dP / volPel) * hP + koefPel * hB;

    const a3Pelaksanaan = [
      [{content:'A.',styles:{fontStyle:'bold'}},{content:'TENAGA',colSpan:5,styles:{fontStyle:'bold'}}],
      ['1','Penjaga Malam','OH',f(dP/volPel,6),fR(hP),fR((dP/volPel)*hP)],
      [{content:'',styles:{fontStyle:'bold'}},{content:'JUMLAH TENAGA',colSpan:4,styles:{fontStyle:'bold'}},fR((dP/volPel)*hP)],
      [{content:'B.',styles:{fontStyle:'bold'}},{content:'BAHAN',colSpan:5,styles:{fontStyle:'bold'}}],
      ['1','Solar','Ltr',f(koefPel,6),fR(hB),fR(koefPel*hB)],
      [{content:'',styles:{fontStyle:'bold'}},{content:'JUMLAH BAHAN',colSpan:4,styles:{fontStyle:'bold'}},fR(koefPel*hB)],
      [{content:'C.',styles:{fontStyle:'bold'}},{content:'PERALATAN (Swakelola)',colSpan:5,styles:{fontStyle:'bold'}}],
      ['1',alatLabel,'Jam',f(1/q1Pel,6),'-','-'],
      [{content:'',styles:{fontStyle:'bold'}},{content:'TOTAL HARGA SATUAN PER m³',colSpan:4,styles:{fontStyle:'bold'}},{content:fR(hspPel),styles:{fontStyle:'bold'}}],
    ];

    np('landscape'); const y10s=kop('ANALISA HARGA SATUAN PEKERJAAN (PELAKSANAAN)','landscape');
    autoTable(doc,{startY:y10s,head:[['No','Uraian','Satuan','Koefisien','Harga Satuan','Jumlah Harga']],body:a3Pelaksanaan,styles:tS,headStyles:hS,theme:'grid'});

    // === HAL 11: TENAGA BAHAN PELAKSANAAN ===
    const tSolP = volPel * koefPel;
    np('landscape'); const y11s=kop('PERHITUNGAN TENAGA DAN BAHAN (PELAKSANAAN)','landscape',{volume:volPel,durasi:dP});
    const a11 = [
      [{content:'A.',styles:{fontStyle:'bold'}},{content:'TENAGA',colSpan:4,styles:{fontStyle:'bold'}}],
      ['1','Penjaga Malam (2 org × '+dP+' hari)','OH',String(dP*2),fR(dP*2*hP)],
      [{content:'B.',styles:{fontStyle:'bold'}},{content:'BAHAN',colSpan:4,styles:{fontStyle:'bold'}}],
      ['1','BBM Solar','Liter',f(tSolP,0),fR(tSolP*hB)],
      [{content:'',styles:{fontStyle:'bold'}},{content:'TOTAL',colSpan:3,styles:{fontStyle:'bold'}},{content:fR(dP*2*hP+tSolP*hB),styles:{fontStyle:'bold'}}],
    ];
    autoTable(doc,{startY:y11s,head:[['No','Uraian','Satuan','Volume','Jumlah Harga']],body:a11,styles:tS,headStyles:hS,theme:'grid'});

    // === HAL 12: REALISASI PER BAHAN ===
    np('landscape'); const y12s=kop('REALISASI ANGGARAN PELAKSANAAN PER BAHAN','landscape',{volume:volPel,durasi:dP});
    const sub12 = dP*2*hP+tSolP*hB;
    const a12 = [
      [{content:'I',styles:{fontStyle:'bold'}},{content:'PEKERJAAN GALIAN',colSpan:5,styles:{fontStyle:'bold'}}],
      ['1','BBM Solar',f(tSolP,0),'Ltr',fR(hB),fR(tSolP*hB)],
      ['2','Penjaga Malam (2 org × '+dP+' hr)',String(dP*2),'HOK',fR(hP),fR(dP*2*hP)],
      ['','','','',{content:'SUB TOTAL',styles:{fontStyle:'bold'}},{content:fR(sub12),styles:{fontStyle:'bold'}}],
      ['','','','','PPN 12%',fR(sub12*0.12)],
      ['','','','',{content:'TOTAL',styles:{fontStyle:'bold'}},{content:fR(sub12*1.12),styles:{fontStyle:'bold'}}],
    ];
    autoTable(doc,{startY:y12s,head:[['No','Uraian','Volume','Sat','Harga Satuan','Jumlah Harga']],body:a12,styles:tS,headStyles:hS,theme:'grid'});

    // === HAL 13: REALISASI ANGGARAN ===
    np('landscape'); const y13s=kop('REALISASI ANGGARAN PELAKSANAAN','landscape',{volume:volPel,durasi:dP});
    const a13 = [
      ['I','Pekerjaan Galian Tanah (Realisasi)',f(volPel),'m³',fR(hspPel),fR(volPel*hspPel)],
      ['','','','',{content:'SUB TOTAL',styles:{fontStyle:'bold'}},{content:fR(volPel*hspPel),styles:{fontStyle:'bold'}}],
      ['','','','','PPN 12%',fR(volPel*hspPel*0.12)],
      ['','','','',{content:'GRAND TOTAL',styles:{fontStyle:'bold'}},{content:fR(volPel*hspPel*1.12),styles:{fontStyle:'bold'}}],
    ];
    autoTable(doc,{startY:y13s,head:[['No','Uraian','Volume','Sat','Harga Satuan (Rp)','Jumlah (Rp)']],body:a13,styles:tS,headStyles:hS,theme:'grid'});
    addSignature(doc, (doc.lastAutoTable?.finalY||160)+10, 330.2);

    // === LAMPIRAN GAMBAR TEKNIK ===
    try {
      const svgs = generateAllSVGs(rapState);
      const perencanaan = svgs.filter(s => s.jenis === 'PERENCANAAN');
      const pelaksanaan = svgs.filter(s => s.jenis === 'PELAKSANAAN');

      const renderCADSection = async (title, items) => {
        if (items.length === 0) return;
        // Title page
        doc.addPage([330.2,215.9],'landscape');
        doc.setFont('helvetica','bold'); doc.setFontSize(16);
        doc.text(title,330.2/2,215.9/2,{align:'center'});
        // Each drawing fit-to-page landscape
        for (const s of items) {
          doc.addPage([330.2,215.9],'landscape');
          const container = document.createElement('div');
          container.innerHTML = s.svg;
          container.style.cssText = 'position:fixed;left:-9999px;width:1200px;height:750px';
          document.body.appendChild(container);
          const svgEl = container.querySelector('svg');
          if (svgEl) {
            const canvas = document.createElement('canvas');
            canvas.width=2400; canvas.height=1500;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle='#fff'; ctx.fillRect(0,0,2400,1500);
            const blob = new Blob([new XMLSerializer().serializeToString(svgEl)],{type:'image/svg+xml'});
            const url = URL.createObjectURL(blob);
            const img = new Image();
            await new Promise((r,j)=>{img.onload=r;img.onerror=j;img.src=url;});
            ctx.drawImage(img,0,0,2400,1500);
            URL.revokeObjectURL(url);
            // Fit to page (full landscape)
            doc.addImage(canvas.toDataURL('image/png'),'PNG',5,5,320.2,205.9);
          }
          document.body.removeChild(container);
        }
      };
      await renderCADSection('LAMPIRAN GAMBAR TEKNIK PERENCANAAN', perencanaan);
      await renderCADSection('LAMPIRAN GAMBAR TEKNIK PELAKSANAAN', pelaksanaan);
    } catch(e) { console.warn('CAD error:', e); }

    doc.save(`RAP_${kopData?.pekerjaan||'Proyek'}.pdf`);
  } catch(err) {
    console.error('PDF Error:', err);
    alert('Error PDF: ' + err.message);
  }
}