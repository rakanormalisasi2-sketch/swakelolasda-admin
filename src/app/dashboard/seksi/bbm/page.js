'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function BBMPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('pemakaian');
  const [tahunAnggaran, setTahunAnggaran] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(true);
  const [bbmPemakaian, setBbmPemakaian] = useState([]);
  const [bbmPengadaan, setBbmPengadaan] = useState([]);
  const [assignments, setAssignments] = useState([]); // for dropdown
  const [saving, setSaving] = useState(false);
  
  // Forms
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'pengadaan' | 'pemakaian'
  const [formPengadaan, setFormPengadaan] = useState({
    tanggal_pesan: '', tanggal_terima: '', jumlah_liter: '', keterangan: ''
  });
  const [formPemakaian, setFormPemakaian] = useState({
    assignment_id: '', kegiatan: '', tipe_alat: '', desa: '', kecamatan: '', 
    tanggal_kirim: '', jumlah_liter: '', keterangan: ''
  });

  const SUB_LABELS = {
    normalisasi_sungai: 'Normalisasi Sungai',
    normalisasi_saluran_irigasi: 'Normalisasi Saluran / Irigasi',
    rehabilitasi_embung: 'Rehabilitasi Embung',
    pembangunan_embung: 'Pembangunan Embung',
  };

  const loadData = useCallback(async () => {
    if (!profile?.role) return;
    setLoading(true);
    try {
      // 1. Fetch Assignments from DB1 for dropdown
      // (This uses the standard client-side Supabase client since it's DB1)
      const { supabase } = await import('@/lib/supabase');
      const { data: assignmentsData } = await supabase
        .from('assignments')
        .select('*, equipment:heavy_equipment(name, merk_type, nomor_lambung)')
        .eq('created_by_role', profile.role)
        .eq('status', 'active')
        .order('start_date', { ascending: false });
      
      setAssignments(assignmentsData || []);

      // 2. Fetch BBM Data from DB2 (via API routes that Claude Code will build)
      // Since Claude Code might not have built them yet, we wrap in try-catch
      try {
        const resPemakaian = await fetch(`/api/bbm/pemakaian?seksi=${profile.role}&tahun=${tahunAnggaran}`);
        if(resPemakaian.ok) {
          const data = await resPemakaian.json();
          setBbmPemakaian(data.data || []);
        } else {
          console.warn("API Pemakaian BBM belum tersedia atau error.");
          setBbmPemakaian([]);
        }
      } catch(e) { console.warn("API Pemakaian BBM gagal diakses."); }

      try {
        const resPengadaan = await fetch(`/api/bbm/pengadaan?seksi=${profile.role}&tahun=${tahunAnggaran}`);
        if(resPengadaan.ok) {
          const data = await resPengadaan.json();
          setBbmPengadaan(data.data || []);
        } else {
          console.warn("API Pengadaan BBM belum tersedia atau error.");
          setBbmPengadaan([]);
        }
      } catch(e) { console.warn("API Pengadaan BBM gagal diakses."); }

    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [profile, tahunAnggaran]);

  useEffect(() => { loadData(); }, [loadData]);

  // Handle assignment selection to auto-fill Pemakaian form
  const handleAssignmentChange = (aId) => {
    if (aId === '00000000-0000-0000-0000-000000000000') {
      setFormPemakaian({
        ...formPemakaian,
        assignment_id: aId,
        kegiatan: '',
        tipe_alat: '',
        desa: '',
        kecamatan: ''
      });
      return;
    }

    const asgn = assignments.find(a => a.id === aId);
    if(!asgn) {
      setFormPemakaian({...formPemakaian, assignment_id: aId});
      return;
    }
    
    let kegiatanStr = '';
    if (asgn.job_type === 'lainnya') {
      kegiatanStr = `${asgn.custom_job_description} Desa ${asgn.location_village} Kec. ${asgn.location_district}`;
    } else {
      const rincian = SUB_LABELS[asgn.job_sub_type] || asgn.job_type;
      kegiatanStr = `${rincian} Desa ${asgn.location_village} Kec. ${asgn.location_district}`;
    }

    const alatStr = asgn.equipment ? 
      `${asgn.equipment.nomor_lambung || ''} (${asgn.equipment.merk_type || ''}) ${asgn.equipment.name || ''}`.trim() : '';

    setFormPemakaian({
      ...formPemakaian,
      assignment_id: aId,
      kegiatan: kegiatanStr.toUpperCase(),
      tipe_alat: alatStr,
      desa: asgn.location_village || '',
      kecamatan: asgn.location_district || ''
    });
  };

  const handleSavePemakaian = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/bbm/pemakaian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seksi: profile.role,
          ...formPemakaian,
          jumlah_liter: parseFloat(formPemakaian.jumlah_liter)
        })
      });
      if(res.ok) {
        setShowModal(false);
        loadData();
      } else {
        const err = await res.json();
        alert('Gagal: ' + (err.error || 'Server Error'));
      }
    } catch(err) {
      alert('Network error.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePengadaan = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/bbm/pengadaan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seksi: profile.role,
          ...formPengadaan,
          jumlah_liter: parseFloat(formPengadaan.jumlah_liter)
        })
      });
      if(res.ok) {
        setShowModal(false);
        setFormPengadaan({tanggal_pesan:'', tanggal_terima:'', jumlah_liter:'', keterangan:''});
        loadData();
      } else {
         alert('Gagal menyimpan pengadaan.');
      }
    } catch(err) {
      alert('Network error.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePemakaian = async (id) => {
    if(!confirm('Hapus riwayat pemakaian BBM ini?')) return;
    try {
      await fetch(`/api/bbm/pemakaian?id=${id}`, { method: 'DELETE' });
      loadData();
    } catch(e) {}
  };
  const handleDeletePengadaan = async (id) => {
    if(!confirm('Hapus riwayat pengadaan BBM ini?')) return;
    try {
      await fetch(`/api/bbm/pengadaan?id=${id}`, { method: 'DELETE' });
      loadData();
    } catch(e) {}
  };

  // Group Pemakaian by Assignment/Kegiatan
  const groupedPemakaian = useMemo(() => {
    const groups = {};
    bbmPemakaian.forEach(b => {
      const key = `${b.kegiatan} | Alat: ${b.tipe_alat}`;
      if(!groups[key]) groups[key] = { items: [], total: 0 };
      groups[key].items.push(b);
      groups[key].total += Number(b.jumlah_liter);
    });
    return groups;
  }, [bbmPemakaian]);

  const generateExcelBBM = async () => {
    const dataToExport = activeTab === 'pemakaian' ? bbmPemakaian : bbmPengadaan;
    if (dataToExport.length === 0) return alert('Tidak ada data untuk diekspor!');

    const wsData = dataToExport.map((row, i) => {
      if (activeTab === 'pemakaian') {
        return {
          'No': i + 1,
          'Tanggal': new Date(row.tanggal_kirim).toLocaleDateString('id-ID'),
          'Pekerjaan': row.kegiatan || '-',
          'Nama/Tipe Alat': row.tipe_alat || '-',
          'Desa': row.desa || '-',
          'Kecamatan': row.kecamatan || '-',
          'Volume BBM (L/HARI)': row.jumlah_liter || 0,
          'Total Uang (Rp)': (row.jumlah_liter * 11000).toLocaleString('id-ID'),
          'Seksi PJ': row.seksi || '-',
        };
      } else {
         return {
          'No': i + 1,
          'Tanggal Pesan': new Date(row.tanggal_pesan).toLocaleDateString('id-ID'),
          'Tanggal Terima': new Date(row.tanggal_terima).toLocaleDateString('id-ID'),
          'Jumlah Pengadaan (Liter)': row.jumlah_liter || 0,
          'Keterangan / Supplier': row.keterangan || '-'
        };
      }
    });

    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(wsData);
    
    ws['!cols'] = activeTab === 'pemakaian' ? [
       {wch: 4}, {wch: 12}, {wch: 35}, {wch: 25}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 18}, {wch: 15}
    ] : [
       {wch: 4}, {wch: 15}, {wch: 15}, {wch: 20}, {wch: 30}
    ];

    const wb = XLSX.utils.book_new();
    const sheetName = activeTab === 'pemakaian' ? 'BBM_Keluar' : 'BBM_Masuk';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    const xlOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const xlBlob = new Blob([xlOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const xlUrl = URL.createObjectURL(xlBlob);
    const a = document.createElement('a');
    a.href = xlUrl;
    a.download = `Laporan_${sheetName}_${tahunAnggaran}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(xlUrl), 1000);
  };

  const totalPengadaan = bbmPengadaan.reduce((sum, item) => sum + Number(item.jumlah_liter), 0);
  const totalPemakaian = bbmPemakaian.reduce((sum, item) => sum + Number(item.jumlah_liter), 0);
  const sisaStok = totalPengadaan - totalPemakaian;

  // Render dummy data if API not ready
  const showPlaceholder = bbmPemakaian.length === 0 && bbmPengadaan.length === 0 && !loading;

  return (
    <>
      <div className="header">
        <div>
          <div className="header-title">Manajemen BBM</div>
          <div className="header-subtitle">Rekapitulasi Pengadaan dan Pemakaian Bahan Bakar</div>
        </div>
        <div className="header-right" style={{display:'flex', gap: 10, alignItems:'center'}}>
          <select className="form-control" value={tahunAnggaran} onChange={e=>setTahunAnggaran(e.target.value)} style={{width: 120}}>
            <option value="2024">2024</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
          </select>
          <button className="btn btn-primary" onClick={() => { setModalType('pemakaian'); setShowModal(true); setFormPemakaian({...formPemakaian, assignment_id:'', tanggal_kirim:'', jumlah_liter:'', keterangan:''})}}>
            + Input Pemakaian
          </button>
          <button className="btn btn-outline" onClick={() => { setModalType('pengadaan'); setShowModal(true); }}>
            + Input Pengadaan
          </button>
          <button className="btn btn-primary" style={{background:'#10b981', borderColor:'#10b981'}} onClick={generateExcelBBM}>
            📥 Unduh Excel
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Dashboard Cards */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 20}}>
          <div className="card" style={{padding: 20, background: 'linear-gradient(to right, #0ea5e9, #2563eb)', color:'white'}}>
             <div style={{fontSize: 14, opacity: 0.9}}>Total Pengadaan ({tahunAnggaran})</div>
             <div style={{fontSize: 28, fontWeight:'bold', marginTop: 5}}>{totalPengadaan} Liter 📦</div>
          </div>
          <div className="card" style={{padding: 20, background: 'linear-gradient(to right, #f59e0b, #d97706)', color:'white'}}>
             <div style={{fontSize: 14, opacity: 0.9}}>Total Pemakaian ({tahunAnggaran})</div>
             <div style={{fontSize: 28, fontWeight:'bold', marginTop: 5}}>{totalPemakaian} Liter ⛽</div>
          </div>
          <div className="card" style={{padding: 20, background: sisaStok < 100 ? 'linear-gradient(to right, #ef4444, #dc2626)' : 'linear-gradient(to right, #10b981, #059669)', color:'white'}}>
             <div style={{fontSize: 14, opacity: 0.9}}>Sisa Stok Terkini</div>
             <div style={{fontSize: 28, fontWeight:'bold', marginTop: 5}}>{sisaStok} Liter 🛢️</div>
          </div>
        </div>

        {/* API Fallback Warning */}
        {showPlaceholder && (
          <div className="alert alert-info" style={{marginBottom: 20}}>
            <strong>Info:</strong> Data BBM belum ada atau API database sekunder sedang dalam proses penyiapan oleh tim teknis. Tetap bisa dicoba input jika server sudah jalan.
          </div>
        )}

        <div className="card" style={{padding: 0, overflow:'hidden'}}>
           <div className="card-header" style={{borderBottom:'1px solid #e2e8f0', display:'flex', gap:0, padding: 0}}>
             {['pemakaian', 'pengadaan'].map(t => (
                <button key={t} onClick={() => setActiveTab(t)} style={{
                  padding: '16px 24px', background: 'transparent', border:'none', fontSize: 14, fontWeight:'bold',
                  borderBottom: activeTab === t ? '2px solid #2563eb' : '2px solid transparent',
                  color: activeTab === t ? '#2563eb' : '#64748b', cursor:'pointer'
                }}>
                  Riwayat {t === 'pemakaian' ? 'BBM Keluar' : 'BBM Masuk'}
                </button>
             ))}
           </div>

           <div style={{padding: 20}}>
             {loading ? <div style={{textAlign:'center', padding:40}}>Memuat data BBM...</div> : 
             
             activeTab === 'pemakaian' ? (
                Object.keys(groupedPemakaian).length === 0 ? <div className="text-muted" style={{textAlign:'center', padding:20}}>Belum ada data pemakaian.</div> :
                <div style={{display:'flex', flexDirection:'column', gap: 30}}>
                  {Object.keys(groupedPemakaian).map((groupName, i) => (
                    <div key={i} style={{border:'1px solid #e2e8f0', borderRadius: 8, overflow:'hidden'}}>
                      <div style={{background:'#f8fafc', padding:'12px 16px', borderBottom:'1px solid #e2e8f0'}}>
                         <div style={{fontWeight:'bold', color:'#0f172a', fontSize:14}}>🔧 {groupName.split(' | Alat: ')[0]}</div>
                         <div style={{fontSize:12, color:'#64748b', marginTop:4}}>🚜 Alat: {groupName.split(' | Alat: ')[1]}</div>
                      </div>
                      <table style={{margin:0}}>
                         <thead style={{background:'#fff'}}>
                           <tr><th width="50">No</th><th width="150">Tgl Kirim</th><th width="150">Jumlah LTR</th><th>Keterangan Tambahan</th><th width="80">Aksi</th></tr>
                         </thead>
                         <tbody>
                           {groupedPemakaian[groupName].items.map((item, idx) => (
                             <tr key={item.id}>
                               <td style={{textAlign:'center'}}>{idx+1}</td>
                               <td>{new Date(item.tanggal_kirim).toLocaleDateString('id-ID')}</td>
                               <td style={{fontWeight:'bold', color:'#d97706'}}>{item.jumlah_liter}</td>
                               <td>{item.keterangan || '-'}</td>
                               <td><button className="btn-icon" onClick={()=>handleDeletePemakaian(item.id)} style={{color:'#dc2626'}}>🗑️</button></td>
                             </tr>
                           ))}
                           <tr style={{background:'#fcfdfd'}}>
                              <td colSpan="2" style={{textAlign:'right', fontWeight:'bold'}}>TOTAL PEMAKAIAN PEKERJAAN INI:</td>
                              <td style={{fontWeight:'bold', fontSize:15, color:'#d97706'}}>{groupedPemakaian[groupName].total} Liter</td>
                              <td colSpan="2"></td>
                           </tr>
                         </tbody>
                      </table>
                    </div>
                  ))}
                </div>
             ) : (
                bbmPengadaan.length === 0 ? <div className="text-muted" style={{textAlign:'center', padding:20}}>Belum ada data pengadaan.</div> :
                <table>
                  <thead><tr><th>No</th><th>Tanggal Pesan</th><th>Tanggal Terima</th><th>Jumlah Liter</th><th>Keterangan</th><th>Aksi</th></tr></thead>
                  <tbody>
                    {bbmPengadaan.map((item, idx) => (
                      <tr key={item.id}>
                        <td style={{textAlign:'center'}}>{idx+1}</td>
                        <td>{new Date(item.tanggal_pesan).toLocaleDateString('id-ID')}</td>
                        <td style={{fontWeight:'bold'}}>{new Date(item.tanggal_terima).toLocaleDateString('id-ID')}</td>
                        <td style={{fontWeight:'bold', color:'#059669'}}>+ {item.jumlah_liter}</td>
                        <td>{item.keterangan || '-'}</td>
                        <td><button className="btn-icon" onClick={()=>handleDeletePengadaan(item.id)} style={{color:'#dc2626'}}>🗑️</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             )}
           </div>
        </div>
      </div>

      {showModal && (
         <div className="modal-overlay">
           <div className="modal" style={{maxWidth: 600}}>
             <div className="modal-header">
               <h3 className="modal-title">{modalType === 'pemakaian' ? 'Input Pemakaian BBM (Keluar)' : 'Input Pengadaan BBM (Masuk)'}</h3>
               <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
             </div>
             
             {modalType === 'pemakaian' ? (
                <form onSubmit={handleSavePemakaian}>
                   <div className="modal-body">
                      <div className="form-group">
                         <label className="form-label">Penugasan Terkait *</label>
                         <select className="form-control" required value={formPemakaian.assignment_id} onChange={(e) => handleAssignmentChange(e.target.value)}>
                           <option value="">— Pilih Penugasan (Atau Pilih Manual) —</option>
                           <option value="00000000-0000-0000-0000-000000000000" style={{fontWeight:'bold', color:'#2563eb'}}>✏️ INPUT MANUAL (TANPA PENUGASAN)</option>
                           <optgroup label="Daftar Penugasan Aktif & Selesai">
                           {assignments.map(a => (
                             <option key={a.id} value={a.id}>{a.location_village} — {a.equipment?.name || 'Alat'} ({new Date(a.start_date).toLocaleDateString('id-ID')})</option>
                           ))}
                           </optgroup>
                         </select>
                      </div>
                      <div className="form-group">
                         <label className="form-label">Rincian Kegiatan *</label>
                         <textarea className="form-control" rows={2} required value={formPemakaian.kegiatan} onChange={e=>setFormPemakaian({...formPemakaian, kegiatan: e.target.value})} placeholder="Sistem akan otomatis mengisi sesuai penugasan..." />
                      </div>
                      <div className="form-grid">
                         <div className="form-group">
                            <label className="form-label">Tipe/Model Alat *</label>
                            <input type="text" className="form-control" required value={formPemakaian.tipe_alat} onChange={e=>setFormPemakaian({...formPemakaian, tipe_alat: e.target.value})} />
                         </div>
                         <div className="form-group">
                            <label className="form-label">Tanggal Kirim *</label>
                            <input type="date" className="form-control" required value={formPemakaian.tanggal_kirim} onChange={e=>setFormPemakaian({...formPemakaian, tanggal_kirim: e.target.value})} />
                         </div>
                      </div>
                      <div className="form-grid">
                         <div className="form-group">
                            <label className="form-label">Desa *</label>
                            <input type="text" className="form-control" required value={formPemakaian.desa} onChange={e=>setFormPemakaian({...formPemakaian, desa: e.target.value})} />
                         </div>
                         <div className="form-group">
                            <label className="form-label">Kecamatan *</label>
                            <input type="text" className="form-control" required value={formPemakaian.kecamatan} onChange={e=>setFormPemakaian({...formPemakaian, kecamatan: e.target.value})} />
                         </div>
                      </div>
                      <div className="form-group">
                         <label className="form-label">Jumlah Liter *</label>
                         <input type="number" step="0.01" className="form-control" required value={formPemakaian.jumlah_liter} onChange={e=>setFormPemakaian({...formPemakaian, jumlah_liter: e.target.value})} />
                      </div>
                      <div className="form-group">
                         <label className="form-label">Lainnya / Keterangan Tambahan</label>
                         <input type="text" className="form-control" value={formPemakaian.keterangan} onChange={e=>setFormPemakaian({...formPemakaian, keterangan: e.target.value})} />
                      </div>
                   </div>
                   <div className="modal-footer">
                     <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Batal</button>
                     <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Pemakaian'}</button>
                   </div>
                </form>
             ) : (
                <form onSubmit={handleSavePengadaan}>
                   <div className="modal-body">
                      <div className="form-grid">
                         <div className="form-group">
                            <label className="form-label">Tanggal Dipesan *</label>
                            <input type="date" className="form-control" required value={formPengadaan.tanggal_pesan} onChange={e=>setFormPengadaan({...formPengadaan, tanggal_pesan: e.target.value})} />
                         </div>
                         <div className="form-group">
                            <label className="form-label">Tanggal Diterima *</label>
                            <input type="date" className="form-control" required value={formPengadaan.tanggal_terima} onChange={e=>setFormPengadaan({...formPengadaan, tanggal_terima: e.target.value})} />
                         </div>
                      </div>
                      <div className="form-group">
                         <label className="form-label">Jumlah Liter Masuk *</label>
                         <input type="number" step="0.01" className="form-control" required value={formPengadaan.jumlah_liter} onChange={e=>setFormPengadaan({...formPengadaan, jumlah_liter: e.target.value})} />
                      </div>
                      <div className="form-group">
                         <label className="form-label">Catatan Pengadaan</label>
                         <input type="text" className="form-control" value={formPengadaan.keterangan} onChange={e=>setFormPengadaan({...formPengadaan, keterangan: e.target.value})} />
                      </div>
                   </div>
                   <div className="modal-footer">
                     <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Batal</button>
                     <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Pengadaan'}</button>
                   </div>
                </form>
             )}
           </div>
         </div>
      )}
    </>
  );
}
