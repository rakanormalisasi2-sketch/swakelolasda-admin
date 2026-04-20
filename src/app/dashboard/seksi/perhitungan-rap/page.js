'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { generateSmartSTA, CALC_CONSTANTS, doGoalSeek, calculateFuelPerHour, MASTER_EXCAVATOR_SPECS } from '@/utils/calcRapMath';
import DrawCrossSection from '@/components/DrawCrossSection';

export default function PerhitunganRapPage() {
  const supabase = createClientComponentClient();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('backup_volume');

  // KOP Data (Title Block)
  const [kopData, setKopData] = useState({
    program: 'PROGRAM PENGELOLAAN SUMBER DAYA AIR (SDA)',
    kegiatan: 'PENGELOLAAN SDA DAN BANGUNAN PENGAMAN PANTAI PADA WILAYAH SUNGAI LINTAS DAERAH KABUPATEN/KOTA',
    pekerjaan: 'NORMALISASI SUNGAI',
    lokasi: '',
    tahun: new Date().getFullYear(),
    judul_gambar: 'CROSS SECTION',
    kode_gambar: 'NS-01',
    no_lembar: 1,
    jumlah_lembar: 5
  });

  // DB Sync State
  const [assignments, setAssignments] = useState([]);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [selectedJobText, setSelectedJobText] = useState('Pilih Laporan Lapangan...');

  // Input Parameter Utama Galian / Timbunan (TAB 1)
  const [params, setParams] = useState({
    panjang: 500,
    wDasar: 5,
    hTarget: 2,
    mSlope: 1,
    jenisTanah: 'biasa'
  });

  const [planParams, setPlanParams] = useState({
    targetVolBBM: 0, // Volume BBM Limit (DB2)
    realisasiHOK: 0, // Jumlah Hari Realisasi Berdasarkan Bukti Log Absensi (DB1)
    selectedMasterAlat: 'PC200',
    hpTarget: 138, // Mesin (Merah)
    loadFactor: 0.65, // Beban (Merah)
    sfc: 0.22, // L/KWh Konsumsi spesifik (Merah)
    vKapasitasBucket: 0.90, // M3 (Merah)
    fbFaktorBucket: 1.0, // (Merah)
    faEfisiensi: 0.8, // (Merah)
    fvFaktorKembang: 1.2, // (Merah)
  });

  const handlePilihAlat = (key) => {
     const spek = MASTER_EXCAVATOR_SPECS[key];
     if(spek) {
        setPlanParams({...planParams, selectedMasterAlat: key, hpTarget: spek.hp, vKapasitasBucket: spek.bucket });
     }
  };

  // State Pedoman
  const [showPedoman, setShowPedoman] = useState(false);
  const [pedomanImage, setPedomanImage] = useState('');

  // State Keuangan (Harga Satuan Default bisa diganti sewaktu-waktu)
  const [financeParams, setFinanceParams] = useState({
     hargaSolar: 15000,
     hargaSewa: 250000,
     upahMandor: 125000,
     upahPekerja: 100000,
     hargaPelumas: 60000
  });

  // Hitungan Output Efek Kupu-kupu (Kuning)
  const [dominoEffects, setDominoEffects] = useState({
     fuelPerJam: 0,
     totalJamOperasional: 0,
     q1Target: 0,
     waktuSiklusT1: 0,
     // Financials
     totalCostBbm: 0,
     totalCostSewa: 0,
     totalCostPersonil: 0,
     grandTotalRab: 0
  });

  // Domino Effect Chain Recalculator
  useEffect(() => {
     // 1. Hukum Termodinamika Mesin
     const lJam = calculateFuelPerHour(planParams.hpTarget, planParams.loadFactor, planParams.sfc);
     // 2. Total Jam Operasional (Dipaksa oleh Total Kuota BBM)
     const totalJam = (planParams.targetVolBBM > 0 && lJam > 0) ? (planParams.targetVolBBM / lJam) : 0;
     // 3. Target Q1 (Hasil Galian / Jam)
     const q1 = (totalJam > 0) ? (totalVol / totalJam) : 0;
     // 4. Bisection Goalseek untuk Waktu Siklus (T1)
     let t1 = doGoalSeek(q1, {
         kapasitasBucket: planParams.vKapasitasBucket,
         faktorBucket: planParams.fbFaktorBucket,
         efisiensiAlat: planParams.faEfisiensi,
         faktorKembang: planParams.fvFaktorKembang
     });
     
     // 5. Rekonsiliasi Keuangan (Konversi Rupiah mutlak)
     const costBbm = planParams.targetVolBBM * financeParams.hargaSolar;
     const costSewa = totalJam * financeParams.hargaSewa;
     // Asumsi 1 Mandor dan 1 Pekerja Helper untuk setiap Hari Pelaksanaan (HOK)
     const costPersonil = planParams.realisasiHOK * (financeParams.upahMandor + financeParams.upahPekerja);
     const grandTotal = costBbm + costSewa + costPersonil;

     setDominoEffects({ 
         fuelPerJam: lJam, totalJamOperasional: totalJam, q1Target: q1, waktuSiklusT1: t1,
         totalCostBbm: costBbm, totalCostSewa: costSewa, totalCostPersonil: costPersonil, grandTotalRab: grandTotal
     });
  }, [planParams, totalVol, financeParams]);

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
          setKopData(prev => ({...prev, program: 'PROGRAM PENGELOLAAN SUMBER DAYA AIR (SDA)', kegiatan: 'PENGELOLAAN SDA DAN BANGUNAN PENGAMAN PANTAI PADA WILAYAH SUNGAI LINTAS DAERAH KABUPATEN/KOTA'}));
        }

        // Fetch DB1 Assignments for Sync
        const { data: assignData } = await supabase
          .from('assignments')
          .select('id, location_village, location_district, job_type, job_sub_type, equipment:heavy_equipment(name)')
          .eq('created_by_role', prof?.role)
          .eq('status', 'active');
        
        // Fetch DB2 BBM Data for Sync aggregation
        let bbmMapData = {};
        try {
           const res = await fetch(`/api/bbm/pemakaian?seksi=${prof?.role}`);
           if(res.ok) {
              const bbmJson = await res.json();
              (bbmJson.data || []).forEach(b => {
                 if(!bbmMapData[b.assignment_id]) bbmMapData[b.assignment_id] = 0;
                 bbmMapData[b.assignment_id] += Number(b.jumlah_liter || 0); // Aggregate total BBM
              });
           }
        } catch(e) {}

        // Fetch DB1 Operator Logs for row-count (Hari Kerja Realisasi)
        let logDayCountMap = {};
        if(assignData && assignData.length > 0) {
           const { data: logData } = await supabase
             .from('operator_logs')
             .select('assignment_id, tanggal')
             .in('assignment_id', assignData.map(a => a.id));
           
           if(logData) {
              // Group and count distinct dates
              logData.forEach(row => {
                  if(!logDayCountMap[row.assignment_id]) logDayCountMap[row.assignment_id] = new Set();
                  logDayCountMap[row.assignment_id].add(row.tanggal);
              });
           }
        }

        if(assignData) {
           const enriched = assignData.map(a => ({
               ...a,
               totalBbm: bbmMapData[a.id] || 0,
               totalHokRealisasi: logDayCountMap[a.id] ? logDayCountMap[a.id].size : 0
           }));
           setAssignments(enriched);
        }
      }
      setLoading(false);
    }
    loadSession();
  }, [supabase]);

  const handleSelectReport = (assign) => {
     // Sinkronisasi otomatis ke UI (Kebutuhan Realisasi)
     setPlanParams({
         ...planParams, 
         targetVolBBM: assign.totalBbm || 1,
         realisasiHOK: assign.totalHokRealisasi || 0
     });
     
     // Otomatis susun field Kop Gambar
     const pekStr = `${assign.job_type} ${assign.job_sub_type}`.toUpperCase();
     const lokStr = `DESA ${assign.location_village}, KEC. ${assign.location_district}`.toUpperCase();
     
     setKopData({
        ...kopData,
        pekerjaan: pekStr,
        lokasi: lokStr,
        kode_gambar: pekStr.split(' ').map(s=>s[0]).join('') + '-01'
     });

     setSelectedJobText(`${pekStr} - ${lokStr} (Realisasi: ${assign.totalBbm} Ltr | HOK Pekerja: ${assign.totalHokRealisasi} Hari)`);
     setShowSyncModal(false);
  };

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
                         <button className="btn btn-secondary" style={{width: '100%', justifyContent:'center'}} onClick={()=>setShowSyncModal(true)}>
                            {selectedJobText}
                         </button>
                         <span className="text-xs text-muted" style={{marginTop:8, display:'block'}}>Saat diklik, narik total BBM Kumulatif riil dari `DB2/BBM` sebagai patokan volume Goalseek. Pilihan ini juga akan merapikan auto-fill KOP Gambar.</span>
                      </div>
                      <div className="form-group" style={{marginTop:15}}>
                         <label className="form-label" style={{color:'#0f766e'}}>Target Sinkronisasi Total Konsumsi BBM Logistik (Liter)</label>
                         <input type="number" className="form-control" style={{background:'#f0fdf4', border:'1px solid #16a34a', fontWeight:'bold'}} value={planParams.targetVolBBM} onChange={e=>setPlanParams({...planParams, targetVolBBM: Number(e.target.value)})} />
                      </div>
                   </div>
                </div>

                <div className="card" style={{marginBottom: 20}}>
                   <div className="card-header bg-slate-50"><strong className="card-title">2. Modul Termodinamika Alat & BBM (Cell Merah)</strong></div>
                   <div className="modal-body">
                      {/* Peringatan Teks Kunci Termodinamika */}
                      <div style={{marginBottom:15, padding:10, background:'#fffbeb', borderLeft:'4px solid #f59e0b', fontSize:12, color:'#92400e'}}>
                         <strong>Arahan Keamanan Formula:</strong> Input <b>L/kWh</b> dikunci manual untuk manipulasi presisi batas spesifik. Input <b>HP</b> & Kapasitas direkomendasikan otomatis. <b>Load Factor</b> wajib disesuaikan dengan kurva riil medan di lokasi pekerjaan (bukan rekayasa), dengan rentang 0.1 - 0.9.
                      </div>
                      
                      <div className="form-group" style={{marginBottom:15}}>
                         <label className="form-label">Standar Spek Kelas Alat Berat</label>
                         <select className="form-control" value={planParams.selectedMasterAlat} onChange={(e)=>handlePilihAlat(e.target.value)}>
                            {Object.entries(MASTER_EXCAVATOR_SPECS).map(([key, attr]) => (
                               <option key={key} value={key}>{attr.name} (Kap: {attr.bucket}m³, Tenaga: {attr.hp} HP)</option>
                            ))}
                         </select>
                      </div>
                      <div className="form-grid">
                         <div className="form-group">
                            <label className="form-label">Tenaga Mesin (Horsepower)</label>
                            <input type="number" step="0.1" className="form-control" style={{background:'#fee2e2', border:'1px solid #ef4444'}} value={planParams.hpTarget} onChange={e=>setPlanParams({...planParams, hpTarget: Number(e.target.value)})} />
                         </div>
                         <div className="form-group">
                            <label className="form-label">
                               Engine Load Factor
                               <span onClick={()=>{setPedomanImage('/assets/pedoman-bbm-ahsp.png'); setShowPedoman(true);}} style={{cursor:'pointer', marginLeft:4, color:'#3b82f6'}} title="Klik: Lihat Pedoman (0.1 - 0.9) berdasarkan jurnal & medan">ℹ️ (Lihat Panduan 0.1-0.9)</span>
                            </label>
                            <input type="number" step="0.01" min="0.1" max="0.9" placeholder="0.1 - 0.9" className="form-control" style={{background:'#fee2e2', border:'1px solid #ef4444'}} value={planParams.loadFactor} onChange={e=>setPlanParams({...planParams, loadFactor: Number(e.target.value)})} />
                         </div>
                      </div>
                      <div className="form-grid">
                         <div className="form-group">
                            <label className="form-label">Konsumsi Spesifik SFC (L/kWh)</label>
                            <input type="number" step="0.01" className="form-control" style={{background:'#fee2e2', border:'1px solid #ef4444'}} value={planParams.sfc} onChange={e=>setPlanParams({...planParams, sfc: Number(e.target.value)})} />
                         </div>
                      </div>
                      <div style={{marginTop:15, padding:10, background:'#eff6ff', borderRadius:4, border:'1px solid #bfdbfe'}}>
                        <small style={{display:'block', color:'#1e3a8a', fontWeight:'bold'}}>Otomatisasi Hitungan Fisika (Liter/Jam):</small>
                        <div style={{fontSize:16, fontWeight:'bold', color:'#2563eb'}}>{dominoEffects.fuelPerJam.toFixed(3)} Liter / Jam</div>
                        <small style={{color:'#60a5fa'}}>Rumus: HP * Konversi kW (0.7457) * Load Factor * SFC.</small>
                      </div>
                   </div>
                </div>

                <div className="card">
                   <div className="card-header bg-slate-50"><strong className="card-title">3. Kapasitas Bucket & Faktor (Cell Merah)</strong></div>

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
                   <div className="card-header bg-slate-50"><strong className="card-title">4. Siklus Efek Domino Goalseek (Output)</strong></div>
                   <div className="modal-body">
                      
                      <div className="form-group" style={{marginBottom: 20}}>
                         <label className="form-label text-slate-500">1. Total Jam Kerja (Dari BBM Total Limit / L/Jam)</label>
                         <div style={{fontWeight:'bold', fontSize:14}}>{dominoEffects.totalJamOperasional.toFixed(2)} Jam Total</div>
                      </div>

                      <div className="form-group" style={{marginBottom: 20}}>
                         <label className="form-label text-slate-500">2. Target Galian Per Jam (Volume Total / Jam Kerja)</label>
                         <div style={{fontWeight:'bold', fontSize:14}}>{dominoEffects.q1Target.toFixed(3)} m³/Jam</div>
                      </div>

                      <div style={{background:'#fef9c3', border:'1px solid #eab308', padding:15, borderRadius:8}}>
                         <div style={{fontSize:12, fontWeight:'bold', color:'#854d0e', marginBottom:5}}>Otomatisasi Hitungan Goalseek (T1)</div>
                         <div style={{fontSize:36, fontWeight:'bold', color:'#a16207'}}>{dominoEffects.waktuSiklusT1.toFixed(3)} <span style={{fontSize:16}}>menit / Rit</span></div>
                         <div style={{marginTop:10, fontSize:12, color:'#713f12'}}>
                            Agar alat mencapai efisiensi L/Jam dan Kuota BBM sesuai laporan realisasi, **Waktu Siklus optimalnya harus persis begini (T1)**. Angka ini secara absolut terkunci.
                         </div>
                      </div>
                   </div>
                </div>
             </div>
           </div>
        )}

        {/* ======================= TAB 3: KEBUTUHAN REALISASI & REKONSILIASI KEUANGAN ======================= */}
        {activeTab === 'kebutuhan_realisasi' && (
        <div style={{display:'flex', gap: 20}}>
          <div style={{flex:1}}>
              <div className="card" style={{marginBottom: 20}}>
                   <div className="card-header bg-emerald-50"><strong className="card-title text-emerald-800">1. Honorarium & Sinkronisasi Laporan</strong></div>
                   <div className="modal-body">
                      {planParams.targetVolBBM === 0 ? (
                         <div style={{color:'#94a3b8', fontSize:14}}>&larr; Harap tekan tombol "Pilih Laporan Mingguan..." di Tab 2 terlebih dahulu untuk menghubungkan log pelaporan dari DB Pekerja.</div>
                      ) : (
                         <>
                            <div className="form-group" style={{marginBottom: 20}}>
                               <label className="form-label text-slate-500">Total Jam Operasional Termodinamika (Jam Paksa)</label>
                               <div style={{fontWeight:'bold', fontSize:16, color:'#475569'}}>{dominoEffects.totalJamOperasional.toFixed(2)} Jam <span style={{fontSize:12, fontWeight:'normal'}}>(Dari BBM Limit {planParams.targetVolBBM} Ltr)</span></div>
                               <small className="text-muted">Jam Paksa ini akan menjadi pengali mutlak biaya sewa Excavator agar akur.</small>
                            </div>

                            <div style={{background:'#ecfdf5', border:'1px solid #10b981', padding:15, borderRadius:8}}>
                               <div style={{fontSize:12, fontWeight:'bold', color:'#065f46', marginBottom:5}}>HOK Realisasi (Logika DB Baris Laporan)</div>
                               <div style={{fontSize:36, fontWeight:'bold', color:'#047857'}}>{planParams.realisasiHOK} <span style={{fontSize:16}}>HOK Pelaksanaan</span></div>
                               <div style={{marginTop:10, fontSize:12, color:'#064e3b'}}>
                                  Ini adalah ekstraksi jumlah hari unik {planParams.realisasiHOK} baris pelaporan alat berat. Akan menjadi standar patokan pembayaran UPAH Mandor & Pekerja.
                               </div>
                            </div>
                         </>
                      )}
                   </div>
              </div>

              {/* HARGA SATUAN DASAR */}
              <div className="card">
                   <div className="card-header bg-yellow-50"><strong className="card-title text-yellow-800">2. Harga Satuan Dasar Eksekusi Keuangan (Cell Kuning)</strong></div>
                   <div className="modal-body">
                      <div className="form-grid">
                         <div className="form-group">
                            <label className="form-label">HSD Solar Industri / Liter (Rp)</label>
                            <input type="number" className="form-control" style={{background:'#fef9c3', border:'1px solid #eab308'}} value={financeParams.hargaSolar} onChange={e=>setFinanceParams({...financeParams, hargaSolar: Number(e.target.value)})} />
                         </div>
                         <div className="form-group">
                            <label className="form-label">Sewa Excavator / Jam (Rp)</label>
                            <input type="number" className="form-control" style={{background:'#fef9c3', border:'1px solid #eab308'}} value={financeParams.hargaSewa} onChange={e=>setFinanceParams({...financeParams, hargaSewa: Number(e.target.value)})} />
                         </div>
                      </div>
                      <div className="form-grid">
                         <div className="form-group">
                            <label className="form-label">Upah Mandor / Hari (Rp)</label>
                            <input type="number" className="form-control" style={{background:'#fef9c3', border:'1px solid #eab308'}} value={financeParams.upahMandor} onChange={e=>setFinanceParams({...financeParams, upahMandor: Number(e.target.value)})} />
                         </div>
                         <div className="form-group">
                            <label className="form-label">Upah Pekerja / Hari (Rp)</label>
                            <input type="number" className="form-control" style={{background:'#fef9c3', border:'1px solid #eab308'}} value={financeParams.upahPekerja} onChange={e=>setFinanceParams({...financeParams, upahPekerja: Number(e.target.value)})} />
                         </div>
                      </div>
                   </div>
              </div>

          </div>
          
          <div style={{flex:1}}>
              <div className="card" style={{marginBottom: 20}}>
                   <div className="card-header bg-blue-50"><strong className="card-title text-blue-800">3. Rekapitulasi Rencana Anggaran Keuangan (RAB Final)</strong></div>
                   <div className="modal-body">
                      <table style={{width:'100%', borderCollapse:'collapse', fontSize:14}} className="table">
                        <tbody>
                          <tr style={{borderBottom:'1px solid #e2e8f0'}}>
                            <td style={{padding:8}}>BBM Solar Khusus ({planParams.targetVolBBM} Ltr)</td>
                            <td style={{padding:8, textAlign:'right', fontWeight:'bold'}}>Rp. {dominoEffects.totalCostBbm.toLocaleString('id-ID')}</td>
                          </tr>
                          <tr style={{borderBottom:'1px solid #e2e8f0'}}>
                            <td style={{padding:8}}>Sewa Excavator ({dominoEffects.totalJamOperasional.toFixed(2)} Jam)</td>
                            <td style={{padding:8, textAlign:'right', fontWeight:'bold'}}>Rp. {dominoEffects.totalCostSewa.toLocaleString('id-ID')}</td>
                          </tr>
                          <tr style={{borderBottom:'1px solid #e2e8f0'}}>
                            <td style={{padding:8}}>Upah Personil HOK ({planParams.realisasiHOK} HOK)</td>
                            <td style={{padding:8, textAlign:'right', fontWeight:'bold'}}>Rp. {dominoEffects.totalCostPersonil.toLocaleString('id-ID')}</td>
                          </tr>
                          <tr style={{background:'#eff6ff', borderTop:'2px solid #3b82f6'}}>
                            <td style={{padding:12, fontWeight:'bold', color:'#1e3a8a'}}>GRAND TOTAL BIAYA (Tanpa PPN)</td>
                            <td style={{padding:12, textAlign:'right', fontWeight:'bold', fontSize:18, color:'#1e3a8a'}}>Rp. {dominoEffects.grandTotalRab.toLocaleString('id-ID')}</td>
                          </tr>
                        </tbody>
                      </table>
                   </div>
              </div>

              <div className="card">
                   <div className="card-header bg-slate-50"><strong className="card-title">Cetak Lembar Keuangan & Realisasi</strong></div>
                   <div className="modal-body" style={{textAlign:'center', padding:20}}>
                       <button className="btn btn-primary" onClick={handlePrint} style={{width:'100%', padding:20, fontSize:16}} disabled={planParams.targetVolBBM === 0}>🖨️ Cetak Dokumen RAP Lengkap (PDF)</button>
                       <p className="text-muted text-xs" style={{marginTop:16}}>Dokumen akan merangkul Lembar RAB Final yang Absolut Sinkron dengan Cross-Section Geometri yang tervalidasi Goalseek.</p>
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

      {/* MODAL PILIH SINKRONISASI LAPORAN */}
      {showSyncModal && (
        <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', zIndex:999, display:'flex', justifyContent:'center', alignItems:'center'}}>
           <div style={{background:'#fff', padding: 20, borderRadius:8, width: 700, maxWidth:'90%'}}>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:15}}>
                 <strong style={{fontSize:18}}>Pilih Rekap Pelaksanaan Lapangan (Sinkronisasi DB1 & DB2)</strong>
                 <button onClick={()=>setShowSyncModal(false)} style={{fontWeight:'bold'}}>X Tutup</button>
              </div>
              <div style={{maxHeight: 400, overflowY:'auto', border:'1px solid #e2e8f0', borderRadius:6}}>
                 {assignments.length === 0 ? <div style={{padding:20, textAlign:'center'}}>Tidak ada data penugasan aktif.</div> : (
                   <table className="table" style={{width:'100%', borderCollapse:'collapse'}}>
                     <thead style={{background:'#f8fafc', position:'sticky', top:0}}>
                        <tr>
                          <th style={{padding:10, textAlign:'left', borderBottom:'1px solid #cbd5e1'}}>Pekerjaan</th>
                          <th style={{padding:10, textAlign:'left', borderBottom:'1px solid #cbd5e1'}}>Lokasi</th>
                          <th style={{padding:10, textAlign:'center', borderBottom:'1px solid #cbd5e1'}}>Total Realisasi BBM (DB2)</th>
                          <th style={{padding:10, textAlign:'center', borderBottom:'1px solid #cbd5e1'}}>Aksi</th>
                        </tr>
                     </thead>
                     <tbody>
                        {assignments.map(a => (
                           <tr key={a.id} style={{borderBottom:'1px solid #e2e8f0'}}>
                              <td style={{padding:10}}><b>{a.job_type}</b> {a.job_sub_type}<br/><small className="text-muted">{a.equipment?.name}</small></td>
                              <td style={{padding:10}}>Desa {a.location_village}, Kec {a.location_district}</td>
                              <td style={{padding:10, textAlign:'center', color:'#b91c1c', fontWeight:'bold'}}>{a.totalBbm} Ltr</td>
                              <td style={{padding:10, textAlign:'center'}}>
                                 <button className="btn btn-primary btn-sm" onClick={() => handleSelectReport(a)}>Pilih Tugas Ini</button>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                   </table>
                 )}
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
