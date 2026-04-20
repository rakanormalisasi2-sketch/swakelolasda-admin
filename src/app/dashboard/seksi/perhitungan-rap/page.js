'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { generateSmartSTA, CALC_CONSTANTS, doGoalSeek } from '@/utils/calcRapMath';
import DrawCrossSection from '@/components/DrawCrossSection';

export default function PerhitunganRapPage() {
  const supabase = createClientComponentClient();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('backup_volume');

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

  // Input Parameter Utama Galian / Timbunan (TAB 1)
  const [params, setParams] = useState({
    panjang: 500,
    wDasar: 5,
    hTarget: 2,
    mSlope: 1,
    jenisTanah: 'biasa'
  });

  // State untuk Goalseek (TAB 2)
  const [planParams, setPlanParams] = useState({
    targetVolBBM: 10080, // Volume Laporan/Riil untuk acuan Goalseek (Bisa ditarik dari DB1)
    vKapasitasBucket: 0.22, // M3 (Merah)
    fbFaktorBucket: 1.0, // (Merah)
    faEfisiensi: 0.8, // (Merah)
    fvFaktorKembang: 1.2, // (Merah)
    q1TargetGalian: 53.081 // Hasil GoalSeek
  });

  // State Pedoman
  const [showPedoman, setShowPedoman] = useState(false);
  const [pedomanImage, setPedomanImage] = useState('');

  // Hitungan Output (Kuning)
  const [waktuSiklusT1, setWaktuSiklusT1] = useState(0);

  // Recalculate Goalseek anytime limits changes
  useEffect(() => {
     let t1 = doGoalSeek(planParams.q1TargetGalian, {
         kapasitasBucket: planParams.vKapasitasBucket,
         faktorBucket: planParams.fbFaktorBucket,
         efisiensiAlat: planParams.faEfisiensi,
         faktorKembang: planParams.fvFaktorKembang
     });
     setWaktuSiklusT1(t1);
  }, [planParams]);

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
          <div className="header-title">Perhitungan RAP - Normalisasi</div>
          <div className="header-subtitle">Modul Integrasi Backup Volume (Auto-STA) & Goalseek Solver (RAB)</div>
        </div>
        <div className="header-right">
          <button className="btn btn-primary" onClick={handlePrint}>
            <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{width:16,height:16}}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
            Print Draf Saat Ini
          </button>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="tabs no-print" style={{display:'flex', gap:10, padding:'0 30px', borderBottom:'1px solid #e2e8f0', marginBottom:20}}>
         <button onClick={() => setActiveTab('backup_volume')} style={{padding:'10px 20px', borderBottom: activeTab === 'backup_volume' ? '2px solid #2563eb' : 'none', fontWeight: activeTab === 'backup_volume' ? 'bold' : 'normal', color: activeTab === 'backup_volume' ? '#1e40af' : '#64748b'}}>1. Backup Volume Rencana</button>
         <button onClick={() => setActiveTab('analisa_perencanaan')} style={{padding:'10px 20px', borderBottom: activeTab === 'analisa_perencanaan' ? '2px solid #2563eb' : 'none', fontWeight: activeTab === 'analisa_perencanaan' ? 'bold' : 'normal', color: activeTab === 'analisa_perencanaan' ? '#1e40af' : '#64748b'}}>2. Analisa Perencanaan (RAB)</button>
         <button onClick={() => setActiveTab('kebutuhan_realisasi')} style={{padding:'10px 20px', borderBottom: activeTab === 'kebutuhan_realisasi' ? '2px solid #2563eb' : 'none', fontWeight: activeTab === 'kebutuhan_realisasi' ? 'bold' : 'normal', color: activeTab === 'kebutuhan_realisasi' ? '#1e40af' : '#64748b'}}>3. Kebutuhan Realisasi</button>
      </div>

      <div className="page-body no-print">
        {activeTab === 'backup_volume' && (
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
        )}

        {/* ==============================================================
                          TAB 2: ANALISA PERENCANAAN (GOALSEEK)
            ============================================================== */}
        {activeTab === 'analisa_perencanaan' && (
           <div style={{display:'flex', gap: 20}}>
            
             <div style={{flex: 1}}>
                <div className="card" style={{marginBottom: 20}}>
                   <div className="card-header bg-slate-50">
                      <strong className="card-title">1. Sinkronisasi Data Laporan Lapangan (DB1)</strong>
                   </div>
                   <div className="modal-body">
                      {/* Simulasi Grouping/Bridging Laporan Lapangan */}
                      <div className="form-group">
                         <label className="form-label">Tarik Laporan Pelaksanaan Operator</label>
                         <button className="btn btn-secondary" style={{width: '100%', justifyContent:'center'}}>Pilih Laporan Mingguan...</button>
                         <span className="text-xs text-muted" style={{marginTop:8, display:'block'}}>Saat diklik, narik data dari `operator_logs` sebagai ceiling-limit Goalseek.</span>
                      </div>
                      <div className="form-group" style={{marginTop:15}}>
                         <label className="form-label" style={{color:'#0f766e'}}>Target Sinkronisasi Volume Realisasi (m³)</label>
                         <input type="number" className="form-control" style={{background:'#f0fdf4', border:'1px solid #16a34a', fontWeight:'bold'}} value={planParams.targetVolBBM} onChange={e=>setPlanParams({...planParams, targetVolBBM: Number(e.target.value)})} />
                      </div>
                   </div>
                </div>

                <div className="card">
                   <div className="card-header bg-slate-50"><strong className="card-title">2. Acuan Pedoman (Cell Merah AHSP)</strong></div>
                   <div className="modal-body">
                      <div className="form-grid">
                         <div className="form-group">
                            <label className="form-label">
                               Kapasitas Bucket (V)
                               <span onClick={()=>{setPedomanImage('/assets/pedoman-bucket.png'); setShowPedoman(true);}} style={{cursor:'pointer', marginLeft:4}} title="Lihat Tabel SNI">ℹ️</span>
                            </label>
                            <input type="number" step="0.01" className="form-control" style={{background:'#fee2e2', border:'1px solid #ef4444'}} value={planParams.vKapasitasBucket} onChange={e=>setPlanParams({...planParams, vKapasitasBucket: Number(e.target.value)})} />
                         </div>
                         <div className="form-group">
                            <label className="form-label">
                               Faktor Bucket (Fb)
                               <span onClick={()=>{setPedomanImage('/assets/tabel-a10.png'); setShowPedoman(true);}} style={{cursor:'pointer', marginLeft:4}} title="Lihat Tabel A.10">ℹ️</span>
                            </label>
                            <input type="number" step="0.01" className="form-control" style={{background:'#fee2e2', border:'1px solid #ef4444'}} value={planParams.fbFaktorBucket} onChange={e=>setPlanParams({...planParams, fbFaktorBucket: Number(e.target.value)})} />
                         </div>
                      </div>
                      <div className="form-grid">
                         <div className="form-group">
                            <label className="form-label">Efisiensi Alat (Fa)</label>
                            <input type="number" step="0.01" className="form-control" style={{background:'#fee2e2', border:'1px solid #ef4444'}} value={planParams.faEfisiensi} onChange={e=>setPlanParams({...planParams, faEfisiensi: Number(e.target.value)})} />
                         </div>
                         <div className="form-group">
                            <label className="form-label">Faktor Kembang (Fv)</label>
                            <input type="number" step="0.01" className="form-control" style={{background:'#fee2e2', border:'1px solid #ef4444'}} value={planParams.fvFaktorKembang} onChange={e=>setPlanParams({...planParams, fvFaktorKembang: Number(e.target.value)})} />
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             <div style={{flex: 1}}>
                <div className="card">
                   <div className="card-header bg-slate-50"><strong className="card-title">3. Goalseek Algorithm (Cell Kuning)</strong></div>
                   <div className="modal-body">
                      
                      <div className="form-group" style={{marginBottom: 20}}>
                         <label className="form-label">Hasil Galian / Jam Target (m³/Jam)</label>
                         <input type="number" step="0.001" className="form-control" value={planParams.q1TargetGalian} onChange={e=>setPlanParams({...planParams, q1TargetGalian: Number(e.target.value)})} />
                      </div>

                      <div style={{background:'#fef9c3', border:'1px solid #eab308', padding:15, borderRadius:8}}>
                         <div style={{fontSize:12, fontWeight:'bold', color:'#854d0e', marginBottom:5}}>Waktu Siklus Optimal Hasil Goalseek (T1)</div>
                         <div style={{fontSize:36, fontWeight:'bold', color:'#a16207'}}>{waktuSiklusT1.toFixed(3)} <span style={{fontSize:16}}>menit</span></div>
                         <div style={{marginTop:10, fontSize:12, color:'#713f12'}}>
                            Nilai T1 ini secara matematis dipaksa mundur (Bisection) oleh sistem untuk memenuhi Target Galian Per Jam.
                         </div>
                      </div>
                   </div>
                </div>
             </div>
           </div>
        )}

      </div>

      {showPedoman && (
        <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', zIndex:999, display:'flex', justifyContent:'center', alignItems:'center'}}>
           <div style={{background:'#fff', padding: 20, borderRadius:8, width: 600, maxWidth:'90%'}}>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:15}}>
                 <strong style={{fontSize:18}}>Pedoman Referensi (AHSP)</strong>
                 <button onClick={()=>setShowPedoman(false)} style={{fontWeight:'bold'}}>X Tutup</button>
              </div>
              <div style={{background:'#f8fafc', border:'1px dashed #cbd5e1', padding:40, textAlign:'center'}}>
                 <p style={{color:'#64748b', fontSize:14}}>[Image Placeholder]</p>
                 <p style={{color:'#94a3b8', fontSize:12}}>User diminta menyiapkan screenshot {pedomanImage} ke folder public/assets/</p>
              </div>
           </div>
        </div>
      )}

      {/* PRINT MEDIA ONLY (CSS Paged Media Landscape) */}      <style dangerouslySetInnerHTML={{__html:`
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
