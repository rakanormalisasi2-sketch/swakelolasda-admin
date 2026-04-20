'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { generateSmartSTA, CALC_CONSTANTS } from '@/utils/calcRapMath';
import DrawCrossSection from '@/components/DrawCrossSection';

export default function PerhitunganRapPage() {
  const supabase = createClientComponentClient();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // KOP Data (Title Block)
  const [kopData, setKopData] = useState({
    program: 'PROGRAM PENGELOLAAN SUMBER DAYA AIR (SDA)',
    kegiatan: 'PENGELOLAAN SDA DAN BANGUNAN PENGAMAN PANTAI...',
    pekerjaan: 'NORMALISASI SUNGAI X',
    lokasi: 'DESA X, KECAMATAN Y',
    tahun: new Date().getFullYear(),
    judul_gambar: 'CROSS SECTION',
    kode_gambar: 'NS-01',
    no_lembar: 1,
    jumlah_lembar: 5
  });

  // Input Parameter Utama Galian / Timbunan
  const [params, setParams] = useState({
    panjang: 500,
    wDasar: 5,
    hTarget: 2,
    mSlope: 1,
    jenisTanah: 'biasa'
  });

  // Output State
  const [stas, setStas] = useState([]);
  const [totalVol, setTotalVol] = useState(0);

  // Fetch Session
  useEffect(() => {
    async function loadSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: prof } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single();
        setProfile(prof);
        
        // Auto isi program kegiatan berdasarkan seksi
        if(prof?.role === 'seksi_normalisasi') {
          setKopData(prev => ({...prev, program: 'PROGRAM PENGELOLAAN SUMBER DAYA AIR (SDA)', kegiatan: 'PENGELOLAAN SDA DAN BANGUNAN PENGAMAN PANTAI PADA WILAYAH SUNGAI LINTAS DAERAH...'}));
        }
      }
      setLoading(false);
    }
    loadSession();
  }, [supabase]);

  // Recalculate STA anytime params change
  useEffect(() => {
    if(params.panjang > 0 && params.wDasar > 0 && params.hTarget > 0) {
      // Hitung Target Murni
      const wAtasTarget = params.wDasar + 2 * (params.mSlope * params.hTarget);
      const areaTarget = ((params.wDasar + wAtasTarget) / 2) * params.hTarget;
      const volTarget = areaTarget * params.panjang;
      setTotalVol(volTarget);

      // Hitung STA Variation
      const calculatedStas = generateSmartSTA(params.panjang, params.wDasar, params.hTarget, params.mSlope);
      setStas(calculatedStas);
    }
  }, [params]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div style={{padding:40, textAlign:'center'}}>Memuat modul perhitungan...</div>;
  if (profile?.role !== 'seksi_normalisasi') return <div style={{padding:40}}>Akses Ditolak. Modul ini sementara khusus seksi normalisasi.</div>;

  return (
    <>
      <div className="header no-print">
        <div>
          <div className="header-title">Perhitungan RAP - Backup Volume Laporan</div>
          <div className="header-subtitle">Engine penghitung Geometri Cross-Section Trapesium dan Auto-STA (AHSP 2026)</div>
        </div>
        <div className="header-right">
          <button className="btn btn-primary" onClick={handlePrint}>
            <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{width:16,height:16}}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
            Print & Export PDF
          </button>
        </div>
      </div>

      <div className="page-body no-print">
        <div style={{display:'flex', gap: 20}}>
          {/* Kolom Kiri: Form Input & Pedoman */}
          <div style={{flex: 1}}>
             <div className="card" style={{marginBottom: 20}}>
                <div className="card-header"><strong className="card-title">1. Parameter Geometri Saluran</strong></div>
                <div className="modal-body">
                   <div className="form-group">
                      <label className="form-label">Panjang Total Penanganan (Meter) *</label>
                      <input type="number" className="form-control" value={params.panjang} onChange={e=>setParams({...params, panjang: Number(e.target.value)})} />
                   </div>
                   <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Kedalaman Rencana (H) *</label>
                        <input type="number" step="0.1" className="form-control" value={params.hTarget} onChange={e=>setParams({...params, hTarget: Number(e.target.value)})} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Lebar Dasar (B) *</label>
                        <input type="number" step="0.1" className="form-control" value={params.wDasar} onChange={e=>setParams({...params, wDasar: Number(e.target.value)})} />
                      </div>
                   </div>
                   <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Kemiringan / Slope (1:m) *</label>
                        <input type="number" step="0.1" className="form-control" value={params.mSlope} onChange={e=>setParams({...params, mSlope: Number(e.target.value)})} />
                        <span className="text-xs text-muted" style={{marginTop:4}}>Contoh: 1 artinya slope 45 derajat.</span>
                      </div>
                      <div className="form-group">
                        <label className="form-label">
                           Kondisi Tanah (AHSP 2026) 
                           <span title="Berdasarkan SE-DJBK No 47/2026 Lampiran IV. Digunakan untuk Faktor Kembang (Swelling) alat mekanis." style={{cursor:'help', marginLeft:4}}>ℹ️</span>
                        </label>
                        <select className="form-control" value={params.jenisTanah} onChange={e=>setParams({...params, jenisTanah: e.target.value})}>
                           <option value="biasa">Tanah Biasa (Mekanik Mudah) FK=1.2</option>
                           <option value="keras">Tanah Keras/Berkerikil FK=1.25</option>
                           <option value="lumpur">Tanah Berlumpur FK=1.5</option>
                        </select>
                      </div>
                   </div>
                </div>
             </div>

             <div className="card">
                <div className="card-header"><strong className="card-title">2. Pengaturan Kop Data Gambar Teknik</strong></div>
                <div className="modal-body">
                   <div className="form-group">
                      <label className="form-label">Nama Pekerjaan (Digabung dengan Desa dsb)</label>
                      <input type="text" className="form-control" value={kopData.pekerjaan} onChange={e=>setKopData({...kopData, pekerjaan: e.target.value})} />
                   </div>
                   <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Kode Gambar</label>
                        <input type="text" className="form-control" value={kopData.kode_gambar} onChange={e=>setKopData({...kopData, kode_gambar: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Lokasi Detail</label>
                        <input type="text" className="form-control" value={kopData.lokasi} onChange={e=>setKopData({...kopData, lokasi: e.target.value})} />
                      </div>
                   </div>
                </div>
             </div>
          </div>

          {/* Kolom Kanan: Panduan Visual & Hasil */}
          <div style={{flex: 1.2, display:'flex', flexDirection:'column', gap:20}}>
             
             {/* Visualisasi Sketsa Cepat */}
             <div className="card">
                <div className="card-header bg-slate-50"><strong className="card-title">Preview Penampang (Sketsa Panduan Input)</strong></div>
                <div style={{padding:0}}>
                   <DrawCrossSection wDasar={params.wDasar} hTarget={params.hTarget} mSlope={params.mSlope} isPrintMode={false} kopData={kopData} />
                </div>
             </div>

             {/* Output Tabel Patok STA */}
             <div className="card">
                <div className="card-header bg-blue-50 text-blue-900" style={{display:'flex', justifyContent:'space-between'}}>
                   <strong className="card-title">Kalkulasi 5 Patok (Auto-Variance Algorithm)</strong>
                   <strong style={{fontSize:18, fontWeight:'bold'}}>{totalVol.toFixed(2)} m³</strong>
                </div>
                <div className="table-wrapper">
                   <table>
                      <thead>
                         <tr>
                            <th>STA</th>
                            <th>Bawah (m)</th>
                            <th>H (m)</th>
                            <th>Atas (m)</th>
                            <th>Luas (m²)</th>
                         </tr>
                      </thead>
                      <tbody>
                         {stas.map((s, i) => {
                            const wa = s.wDasar + 2*(params.mSlope * s.h);
                            const area = ((s.wDasar + wa)/2)*s.h;
                            return (
                               <tr key={i}>
                                  <td><strong>{s.sta}</strong></td>
                                  <td>{s.wDasar.toFixed(3)}</td>
                                  <td>{s.h.toFixed(3)}</td>
                                  <td>{wa.toFixed(3)}</td>
                                  <td>{area.toFixed(3)}</td>
                               </tr>
                            )
                         })}
                      </tbody>
                   </table>
                </div>
                <div style={{padding: 15, fontSize:12, color:'#64748b'}}>
                  <em>* Lebar atas, bawah, dan kedalaman telah diaplikasikan deviasi geodesi sistemik sehingga menghasilkan bentukan logis seolah diukur dari lapangan. Algoritma menyamakan Volume akhir dengan Target.</em>
                </div>
             </div>

          </div>
        </div>
      </div>

      {/* PRINT MEDIA ONLY (CSS Paged Media Landscape) */}
      <style dangerouslySetInnerHTML={{__html:`
        @media print {
           @page { size: A4 landscape; margin: 10mm; }
           .no-print { display: none !important; }
           .print-landscape-page { display: block; page-break-after: always; }
           body { margin: 0; background: #fff !important; }
        }
      `}} />

      <div style={{display:'none'}} className="print-landscape-page">
         {/* Render 5 halaman gambar teknik khusus print */}
         {stas.map((s, idx) => (
             <DrawCrossSection 
                key={idx} 
                wDasar={s.wDasar} 
                hTarget={s.h} 
                mSlope={params.mSlope} 
                staLabel={s.sta}
                isPrintMode={true} 
                kopData={{
                   ...kopData,
                   no_lembar: idx + 1,
                   jumlah_lembar: stas.length,
                   judul_gambar: `CROSS SECTION STA ${s.sta}`
                }} 
             />
         ))}
      </div>

    </>
  );
}
