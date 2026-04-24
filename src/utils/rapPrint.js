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

export async function printCrossSections(rapState) {
  try {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const { analisaRencana: ar, selTotals, dailyData, kopData, analisaCalculated: ac, geometri: g, backupPelaksanaan: bp, hargaBBM, hargaPenjaga, selectedExcavator } = rapState;
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
    const kop = (t,o) => {
      const w = o==='portrait'?215.9:330.2;
      doc.setFont('helvetica','bold'); doc.setFontSize(12);
      doc.text('PEMERINTAH KABUPATEN BOJONEGORO',w/2,12,{align:'center'});
      doc.setFontSize(10); doc.text('DINAS PEKERJAAN UMUM SUMBER DAYA AIR',w/2,18,{align:'center'});
      doc.setLineWidth(0.5); doc.line(10,20,w-10,20);
      doc.setFontSize(10); doc.text(t,w/2,27,{align:'center'});
      doc.setFontSize(8); doc.setFont('helvetica','normal');
      doc.text('Pekerjaan: '+(kopData?.pekerjaan||'-'),12,34);
      doc.text('Lokasi: '+(kopData?.lokasi||'-'),12,38);
    };

    // === HAL 1: BACKUP VOLUME RENCANA ===
    np('landscape'); kop('BACKUP VOLUME RENCANA PEKERJAAN','landscape');
    doc.setFontSize(8);
    doc.text(`Lebar Eksisting b3 = ${f(b3)} m | Lebar Dasar b1 = ${f(b1)} m | Tinggi h = ${f(hSal)} m | h' = ${f(hGal)} m | Panjang = ${f(pjg,0)} m`,12,44);
    doc.text(`Stripping: Lebar = ${f(g?.lebarStripping||2)} m | Kedalaman = ${f(g?.kedalamanStripping||0.1)} m | Vol Stripping = ${f(g?.volumeStripping||0)} m³`,12,48);
    const bv = (g?.stas||[]).map((s,i) => [i+1,s.sta,f(s.b1),f(s.b3),f(s.h),f(s.hPrime||hGal),f(s.luas),f(s.jarak||0,0),f(s.volume||0)]);
    bv.push(['','','','','','','TOTAL','',f((g?.stas||[]).reduce((a,s)=>a+(s.volume||0),0))]);
    autoTable(doc,{startY:52,head:[['No','STA','b1(m)','b3(m)','h(m)','h\'(m)','Luas(m²)','Jarak(m)','Volume(m³)']],body:bv,styles:tS,headStyles:hS,theme:'grid'});
    let y1 = doc.lastAutoTable?.finalY||130;
    doc.text(`Volume Galian Saluran = ${f(g?.volumeGalian||0)} m³`,12,y1+6);
    doc.text(`Volume Stripping = ${f(g?.volumeStripping||0)} m³`,12,y1+10);
    doc.text(`TOTAL VOLUME = ${f(vol)} m³`,12,y1+14);

    // === HAL 2: ANALISA HARGA SATUAN PERENCANAAN ===
    np('portrait'); kop('ANALISA HARGA SATUAN\nGALIAN TANAH DENGAN EXCAVATOR','portrait');
    const a2 = [
      [{content:'I',styles:{fontStyle:'bold'}},{content:'ASUMSI',colSpan:4,styles:{fontStyle:'bold'}}],
      ['1','Jam Kerja efektif per hari','Tk',f(ar?.tk||7,0),'Jam'],
      ['2','Faktor Pengembangan Material','Fk',f(ar?.fk||0.8),''],
      [{content:'II',styles:{fontStyle:'bold'}},{content:'URUTAN KERJA',colSpan:4,styles:{fontStyle:'bold'}}],
      ['','a. Excavator menggali saluran, swing dan urug talud','','',''],
      [{content:'III',styles:{fontStyle:'bold'}},{content:'URAIAN PERALATAN',colSpan:4,styles:{fontStyle:'bold'}}],
      ['',`Excavator ${selectedExcavator||'PC50'}`,{content:'E.15.i',styles:{halign:'center'}},'',''],
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
    autoTable(doc,{startY:44,head:[['No','URAIAN','Kode','Koef.','Satuan']],body:a2,styles:{...tS,fontSize:7},headStyles:hS,theme:'grid',columnStyles:{0:{cellWidth:10,halign:'center'},2:{cellWidth:18,halign:'center'},3:{cellWidth:22,halign:'right'},4:{cellWidth:18}}});

    // === HAL 3: AHSP PEKERJAAN (Landscape) ===
    np('landscape'); kop('ANALISA HARGA SATUAN PEKERJAAN','landscape');
    doc.setFontSize(8); doc.text('1 m³ Menggali Menggunakan Excavator',12,44);
    const a3 = [
      [{content:'A.',styles:{fontStyle:'bold'}},{content:'TENAGA',colSpan:5,styles:{fontStyle:'bold'}}],
      ['1','Penjaga Malam','OH',f(estHari/vol,6),fR(hP),fR(estHari/vol*hP)],
      [{content:'',styles:{fontStyle:'bold'}},{content:'JUMLAH TENAGA',colSpan:4,styles:{fontStyle:'bold'}},fR(estHari/vol*hP)],
      [{content:'B.',styles:{fontStyle:'bold'}},{content:'BAHAN',colSpan:5,styles:{fontStyle:'bold'}}],
      ['1','Solar','Ltr',f(koef,6),fR(hB),fR(koef*hB)],
      [{content:'',styles:{fontStyle:'bold'}},{content:'JUMLAH BAHAN',colSpan:4,styles:{fontStyle:'bold'}},fR(koef*hB)],
      [{content:'C.',styles:{fontStyle:'bold'}},{content:'PERALATAN (Swakelola)',colSpan:5,styles:{fontStyle:'bold'}}],
      ['1',`Excavator ${selectedExcavator||'PC50'}`,'Jam',f(1/q1,6),'-','-'],
      [{content:'',styles:{fontStyle:'bold'}},{content:'TOTAL HARGA SATUAN PER m³',colSpan:4,styles:{fontStyle:'bold'}},{content:fR(estHari/vol*hP+koef*hB),styles:{fontStyle:'bold'}}],
    ];
    autoTable(doc,{startY:48,head:[['No','Uraian','Satuan','Koefisien','Harga Satuan','Jumlah Harga']],body:a3,styles:tS,headStyles:hS,theme:'grid'});

    // === HAL 4: TENAGA DAN BAHAN RENCANA ===
    np('landscape'); kop('PERHITUNGAN RENCANA TENAGA DAN BAHAN','landscape');
    const a4 = [
      [{content:'A.',styles:{fontStyle:'bold'}},{content:'TENAGA',colSpan:4,styles:{fontStyle:'bold'}}],
      ['1','Penjaga Malam (2 org × '+estHari+' hari)','OH',String(estHari*2),fR(estHari*2*hP)],
      [{content:'B.',styles:{fontStyle:'bold'}},{content:'BAHAN',colSpan:4,styles:{fontStyle:'bold'}}],
      ['1','BBM Solar','Liter',f(totalSolar,0),fR(totalSolar*hB)],
      [{content:'',styles:{fontStyle:'bold'}},{content:'TOTAL',colSpan:3,styles:{fontStyle:'bold'}},{content:fR(estHari*2*hP+totalSolar*hB),styles:{fontStyle:'bold'}}],
    ];
    autoTable(doc,{startY:44,head:[['No','Uraian','Satuan','Volume','Jumlah Harga']],body:a4,styles:tS,headStyles:hS,theme:'grid'});

    // === HAL 5: RAB PER BAHAN RENCANA ===
    np('landscape'); kop('RENCANA ANGGARAN BIAYA PER BAHAN','landscape');
    const sub5 = estHari*2*hP+totalSolar*hB;
    const a5 = [
      [{content:'I',styles:{fontStyle:'bold'}},{content:'PEKERJAAN GALIAN',colSpan:5,styles:{fontStyle:'bold'}}],
      ['1','BBM Solar',f(totalSolar,0),'Ltr',fR(hB),fR(totalSolar*hB)],
      ['2','Penjaga Malam (2 org × '+estHari+' hr)',String(estHari*2),'HOK',fR(hP),fR(estHari*2*hP)],
      ['','','','',{content:'SUB TOTAL',styles:{fontStyle:'bold'}},{content:fR(sub5),styles:{fontStyle:'bold'}}],
      ['','','','','PPN 12%',fR(sub5*0.12)],
      ['','','','',{content:'TOTAL',styles:{fontStyle:'bold'}},{content:fR(sub5*1.12),styles:{fontStyle:'bold'}}],
    ];
    autoTable(doc,{startY:44,head:[['No','Uraian','Volume','Sat','Harga Satuan','Jumlah Harga']],body:a5,styles:tS,headStyles:hS,theme:'grid'});
    doc.setFontSize(7);
    doc.text(`Estimasi Waktu: ${estHari} hari (Vol ${f(vol)} m³ / Q1 ${f(q1)} × 7 jam/hari)`,12,(doc.lastAutoTable?.finalY||150)+8);

    // === HAL 6: RAB RENCANA ===
    np('landscape'); kop('RENCANA ANGGARAN BIAYA (RAB)','landscape');
    const hsp = estHari/vol*hP+koef*hB;
    const a6 = [
      ['I','Pekerjaan Galian Tanah (Normalisasi)',f(vol),'m³',fR(hsp),fR(vol*hsp)],
      ['','','','',{content:'SUB TOTAL',styles:{fontStyle:'bold'}},{content:fR(vol*hsp),styles:{fontStyle:'bold'}}],
      ['','','','','PPN 12%',fR(vol*hsp*0.12)],
      ['','','','',{content:'GRAND TOTAL',styles:{fontStyle:'bold'}},{content:fR(vol*hsp*1.12),styles:{fontStyle:'bold'}}],
    ];
    autoTable(doc,{startY:44,head:[['No','Uraian','Volume','Sat','Harga Satuan (Rp)','Jumlah (Rp)']],body:a6,styles:tS,headStyles:hS,theme:'grid'});

    // === HAL 7: RINCIAN KEBUTUHAN & HASIL PELAKSANAAN ===
    np('landscape'); kop('RINCIAN KEBUTUHAN DAN HASIL PELAKSANAAN','landscape');
    let cumV=0, sisa=0, cumBBM=0;
    const a7 = (dailyData||[]).map((d,i) => {
      const g2=d.jam*q1, bb=d.jam*H;
      // Parse Drop BBM dari keterangan (cari angka setelah kata "BBM" atau "solar" atau "drop")
      let drop = 0;
      if (d.keterangan) {
        const match = d.keterangan.match(/(?:bbm|solar|drop|kirim|terima|pengiriman)\s*[:=]?\s*(\d+)/i);
        if (match) drop = parseInt(match[1]);
      }
      // Jika hari pertama dan tidak ada drop di keterangan, default 400
      if (i===0 && drop===0) drop = 400;
      sisa = sisa + drop - bb;
      if (sisa < 0) sisa = 0; // safety: tidak boleh minus
      cumV += g2;
      cumBBM += bb;
      const dt = new Date(d.tanggal);
      return [i+1,dt.getDate(),dt.toLocaleString('id-ID',{month:'short'}),dt.getFullYear(),
        f(d.jam,1),f(q1),f(g2),f(H),f(bb),
        drop>0?String(drop):'',f(sisa),
        d.hmAwal||'',d.hmAkhir||'',f(cumV)];
    });
    // Add totals row
    a7.push([{content:'TOTAL',colSpan:4,styles:{fontStyle:'bold'}},'',
      '',f((dailyData||[]).reduce((a,d)=>a+d.jam*q1,0)),
      '',f(cumBBM),'','',f(sisa),'','',f(cumV)]);
    autoTable(doc,{startY:44,head:[['No','Tgl','Bln','Thn','Jam','Q1','Vol(m³)','H(L/j)','BBM(L)','Drop','Sisa','HM Awal','HM Akhir','Kum Vol']],body:a7,styles:{...tS,fontSize:5.5},headStyles:{...hS,fontSize:5.5},theme:'grid'});

    // === HAL 8: ANALISA PELAKSANAAN ===
    np('portrait'); kop('ANALISA HARGA SATUAN\nGALIAN TANAH DENGAN EXCAVATOR (PELAKSANAAN)','portrait');
    autoTable(doc,{startY:44,head:[['No','URAIAN','Kode','Koef.','Satuan']],body:a2,styles:{...tS,fontSize:7},headStyles:hS,theme:'grid',columnStyles:{0:{cellWidth:10,halign:'center'},2:{cellWidth:18,halign:'center'},3:{cellWidth:22,halign:'right'},4:{cellWidth:18}}});

    // === HAL 9: BACKUP VOLUME PELAKSANAAN ===
    np('landscape'); kop('BACKUP VOLUME PELAKSANAAN','landscape');
    const bvp = (bp?.stas||[]).map((s,i) => [i+1,s.sta,f(s.b1),f(s.b3),f(s.h),f(s.hPrime||hGal),f(s.luas),f(s.jarak||0,0),f(s.volume||0)]);
    bvp.push(['','','','','','','TOTAL','',f((bp?.stas||[]).reduce((a,s)=>a+(s.volume||0),0))]);
    autoTable(doc,{startY:44,head:[['No','STA','b1(m)','b3(m)','h(m)','h\'(m)','Luas(m²)','Jarak(m)','Volume(m³)']],body:bvp,styles:tS,headStyles:hS,theme:'grid'});

    // === HAL 10: AHSP PELAKSANAAN ===
    np('landscape'); kop('ANALISA HARGA SATUAN PEKERJAAN (PELAKSANAAN)','landscape');
    autoTable(doc,{startY:48,head:[['No','Uraian','Satuan','Koefisien','Harga Satuan','Jumlah Harga']],body:a3,styles:tS,headStyles:hS,theme:'grid'});

    // === HAL 11: TENAGA BAHAN PELAKSANAAN ===
    const dP = (dailyData||[]).length||1;
    const tSolP = selTotals?.bbm||0;
    np('landscape'); kop('PERHITUNGAN TENAGA DAN BAHAN (PELAKSANAAN)','landscape');
    const a11 = [
      [{content:'A.',styles:{fontStyle:'bold'}},{content:'TENAGA',colSpan:4,styles:{fontStyle:'bold'}}],
      ['1','Penjaga Malam (2 org × '+dP+' hari)','OH',String(dP*2),fR(dP*2*hP)],
      [{content:'B.',styles:{fontStyle:'bold'}},{content:'BAHAN',colSpan:4,styles:{fontStyle:'bold'}}],
      ['1','BBM Solar','Liter',f(tSolP,0),fR(tSolP*hB)],
      [{content:'',styles:{fontStyle:'bold'}},{content:'TOTAL',colSpan:3,styles:{fontStyle:'bold'}},{content:fR(dP*2*hP+tSolP*hB),styles:{fontStyle:'bold'}}],
    ];
    autoTable(doc,{startY:44,head:[['No','Uraian','Satuan','Volume','Jumlah Harga']],body:a11,styles:tS,headStyles:hS,theme:'grid'});

    // === HAL 12: REALISASI PER BAHAN ===
    np('landscape'); kop('REALISASI ANGGARAN PELAKSANAAN PER BAHAN','landscape');
    const sub12 = dP*2*hP+tSolP*hB;
    const a12 = [
      [{content:'I',styles:{fontStyle:'bold'}},{content:'PEKERJAAN GALIAN',colSpan:5,styles:{fontStyle:'bold'}}],
      ['1','BBM Solar',f(tSolP,0),'Ltr',fR(hB),fR(tSolP*hB)],
      ['2','Penjaga Malam (2 org × '+dP+' hr)',String(dP*2),'HOK',fR(hP),fR(dP*2*hP)],
      ['','','','',{content:'SUB TOTAL',styles:{fontStyle:'bold'}},{content:fR(sub12),styles:{fontStyle:'bold'}}],
      ['','','','','PPN 12%',fR(sub12*0.12)],
      ['','','','',{content:'TOTAL',styles:{fontStyle:'bold'}},{content:fR(sub12*1.12),styles:{fontStyle:'bold'}}],
    ];
    autoTable(doc,{startY:44,head:[['No','Uraian','Volume','Sat','Harga Satuan','Jumlah Harga']],body:a12,styles:tS,headStyles:hS,theme:'grid'});
    doc.setFontSize(7);
    doc.text(`Estimasi Waktu Pelaksanaan: ${dP} hari (${dailyData?.[0]?.tanggal||'-'} s/d ${dailyData?.[dailyData.length-1]?.tanggal||'-'})`,12,(doc.lastAutoTable?.finalY||150)+8);

    // === HAL 13: REALISASI ANGGARAN ===
    np('landscape'); kop('REALISASI ANGGARAN PELAKSANAAN','landscape');
    const vP = selTotals?.galian||0;
    const a13 = [
      ['I','Pekerjaan Galian Tanah (Realisasi)',f(vP),'m³',fR(hsp),fR(vP*hsp)],
      ['','','','',{content:'SUB TOTAL',styles:{fontStyle:'bold'}},{content:fR(vP*hsp),styles:{fontStyle:'bold'}}],
      ['','','','','PPN 12%',fR(vP*hsp*0.12)],
      ['','','','',{content:'GRAND TOTAL',styles:{fontStyle:'bold'}},{content:fR(vP*hsp*1.12),styles:{fontStyle:'bold'}}],
    ];
    autoTable(doc,{startY:44,head:[['No','Uraian','Volume','Sat','Harga Satuan (Rp)','Jumlah (Rp)']],body:a13,styles:tS,headStyles:hS,theme:'grid'});

    // === GAMBAR TEKNIK CAD ===
    try {
      const svgs = generateAllSVGs(rapState);
      for (const s of svgs) {
        doc.addPage([279.4,215.9],'landscape');
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
          doc.addImage(canvas.toDataURL('image/png'),'PNG',0,0,279.4,215.9);
        }
        document.body.removeChild(container);
      }
    } catch(e) { console.warn('CAD error:', e); }

    doc.save(`RAP_${kopData?.pekerjaan||'Proyek'}.pdf`);
  } catch(err) {
    console.error('PDF Error:', err);
    alert('Error PDF: ' + err.message);
  }
}