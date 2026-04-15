'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import * as XLSX from 'xlsx';
import StorageWarning from '@/components/StorageWarning';

const PROGRESS_STEPS = ['pelaporan', 'diterima', 'pengerjaan', 'selesai'];
const STATUS_MAP = {
  ready: { label: 'Ready', badge: 'badge-success' },
  operating: { label: 'Beroperasi', badge: 'badge-warning' },
  maintenance: { label: 'Maintenance', badge: 'badge-maintenance' },
};

export default function PeralatanPage() {
  const { profile } = useAuth();
  
  // Data States
  const [alat, setAlat] = useState([]);
  const [semuaLogs, setSemuaLogs] = useState([]); // Flat array for Arsip Tab
  const [logsByEq, setLogsByEq] = useState({});   // Map for quick lookup
  const [loading, setLoading] = useState(true);
  
  // UI States
  const [mainTab, setMainTab] = useState('inventaris'); // 'inventaris' | 'kerusakan' | 'arsip'
  const [statusTab, setStatusTab] = useState('semua');
  const [pendingDamageCount, setPendingDamageCount] = useState(0);
  
  // Modals
  const [selectedAlat, setSelectedAlat] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', merk_type: '', nomor_lambung: '', condition_percentage: 100 });
  
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    // Fetch Equipment
    const { data: alatData } = await supabase.from('heavy_equipment').select(`
      *,
      assignments (
        id, status, job_type, location_district, location_village,
        operator:user_profiles!assignments_operator_id_fkey(full_name)
      )
    `).order('name');
    
    // Fetch Logs
    const { data: logsData } = await supabase
      .from('maintenance_logs')
      .select('*, equipment:heavy_equipment(name, merk_type, nomor_lambung)')
      .order('reported_at', { ascending: false });

    setAlat(alatData || []);
    setSemuaLogs(logsData || []);
    
    const logsMap = {};
    (logsData || []).forEach(l => {
      if (!logsMap[l.equipment_id]) logsMap[l.equipment_id] = [];
      logsMap[l.equipment_id].push(l);
    });
    setLogsByEq(logsMap);
    // Hitung pending kerusakan dari operator (progress_status='pelaporan')
    setPendingDamageCount((logsData || []).filter(l => l.progress_status === 'pelaporan').length);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ================= ADD EQUIPMENT =================
  const saveAdd = async (e) => {
    e.preventDefault(); setSaving(true);
    const { error } = await supabase.from('heavy_equipment').insert({
      name: addForm.name,
      merk_type: addForm.merk_type,
      nomor_lambung: addForm.nomor_lambung,
      condition_percentage: addForm.condition_percentage,
      status: 'ready'
    });
    setSaving(false);
    if(error){ alert('Gagal menambah alat: ' + error.message); return; }
    setShowAddModal(false);
    setAddForm({ name: '', merk_type: '', nomor_lambung: '', condition_percentage: 100 });
    load();
  };

  // ================= DELETE EQUIPMENT =================
  const deleteEquipment = async (a) => {
    if (!confirm(`Hapus unit "${a.name} (${a.nomor_lambung || '-'})"? Semua log maintenance terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.`)) return;
    await supabase.from('maintenance_logs').delete().eq('equipment_id', a.id);
    await supabase.from('assignments').delete().eq('equipment_id', a.id);
    const { error } = await supabase.from('heavy_equipment').delete().eq('id', a.id);
    if (error) { alert('Gagal menghapus: ' + error.message); return; }
    load();
  };

  // ================= EDIT EQUIPMENT =================
  const openEdit = (a) => {
    setSelectedAlat(a);
    setEditForm({
      status: a.status,
      prev_status: a.status,
      condition_percentage: a.condition_percentage,
      name: a.name,
      merk_type: a.merk_type || '',
      nomor_lambung: a.nomor_lambung || '',
      damage_description: '',
    });
    setShowEditModal(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault(); setSaving(true);
    
    if (editForm.status === 'maintenance' && editForm.prev_status !== 'maintenance') {
       if (!editForm.damage_description.trim()) {
          alert("Gejala kendala awal wajib diisi jika mengubah status ke Maintenance!");
          setSaving(false); return;
       }
       await supabase.from('maintenance_logs').insert({
         equipment_id: selectedAlat.id,
         reported_by: profile?.id,
         damage_description: editForm.damage_description,
         progress_status: 'diterima',
         mechanic_details: {}
       });
    }

    const { error } = await supabase.from('heavy_equipment').update({
      name: editForm.name,
      merk_type: editForm.merk_type,
      nomor_lambung: editForm.nomor_lambung,
      status: editForm.status,
      condition_percentage: parseInt(editForm.condition_percentage),
    }).eq('id', selectedAlat.id);
    
    setSaving(false); 
    if(error) alert('Gagal update: ' + error.message);
    else { setShowEditModal(false); load(); }
  };

  // ================= UPDATE LOG PROGRESS (DETAIL MODAL) =================
  const openDetail = async (a) => {
    setSelectedAlat(a);
    setShowDetailModal(true);
  };

  const handleEditLog = (log) => {
    openDetail({
      id: log.equipment_id,
      name: log.equipment?.name,
      nomor_lambung: log.equipment?.nomor_lambung,
      merk_type: log.equipment?.merk_type,
    });
  };

  const handleDeleteLog = async (logId) => {
    if (!confirm('Yakin ingin menghapus data arsip log ini? Tindakan ini tidak dapat dibatalkan.')) return;
    setSaving(true);
    await supabase.from('maintenance_logs').delete().eq('id', logId);
    setSaving(false);
    load();
  };

  const updateLogData = async (logId, equipId, newStatus, newNotes, mechanicDetails) => {
    await supabase.from('maintenance_logs').update({
      progress_status: newStatus,
      repair_notes: newNotes,
      mechanic_details: mechanicDetails,
      ...(newStatus === 'selesai' ? { resolved_at: new Date().toISOString() } : {}),
    }).eq('id', logId);
    
    if (newStatus === 'selesai') {
      const { data: activeAsg } = await supabase
        .from('assignments')
        .select('id')
        .eq('equipment_id', equipId)
        .eq('status', 'active');
      const newEquipStatus = (activeAsg && activeAsg.length > 0) ? 'operating' : 'ready';
      await supabase.from('heavy_equipment').update({ status: newEquipStatus }).eq('id', equipId);
    }
    load();
  };

  const printLog = (log, alatData) => {
    const alatObj = alatData || log.equipment;
    if (!alatObj) return alert('Data alat berat tidak ditemukan untuk dicetak.');
    
    const mech = log.mechanic_details || {};
    const ptahun = mech.tahun_produksi || '—';
    const phm = mech.jam_operasional ? mech.jam_operasional + ' HM' : '—';
    const pmaint = mech.jenis_maintenance || '—';
    
    const renderArray = (arr) => {
        if (!arr || arr.length === 0) return '<tr><td colspan="2" style="color:#666;">Dicadangkan (Belum Ada Data)</td></tr>';
        return arr.map((item, i) => `<tr><td width="30" align="center">${i+1}</td><td>${item.text || item}</td></tr>`).join('');
    };

    // === Bangun seksi foto per field ===
    const buildPhotoSection = (arr, label) => {
      if (!arr || arr.length === 0) return '';
      const hasAnyPhoto = arr.some(item => item.fotos && item.fotos.length > 0);
      if (!hasAnyPhoto) return '';
      
      let html = `<div style="margin-top:24px; page-break-before:auto;">`;
      html += `<div style="font-weight:800; font-size:15px; color:#1e3a8a; border-bottom:2px solid #3b82f6; padding-bottom:6px; margin-bottom:14px; text-transform:uppercase">${label}</div>`;
      
      arr.forEach((item, i) => {
        if (!item.fotos || item.fotos.length === 0) return;
        html += `<div style="margin-bottom:16px">`;
        html += `<div style="font-weight:700; font-size:13px; background:#f1f5f9; padding:7px 12px; border-radius:4px; margin-bottom:8px">${label} #${i+1}: ${item.text || '(tanpa keterangan)'}</div>`;
        html += `<div style="display:flex; flex-wrap:wrap; gap:10px">`;
        item.fotos.forEach(url => {
          html += `<img src="${url}" style="width:240px; height:180px; object-fit:cover; border-radius:6px; border:1px solid #e2e8f0;"/>`;
        });
        html += `</div></div>`;
      });
      html += `</div>`;
      return html;
    };

    const allPhotoSections = [
      buildPhotoSection(mech.pekerjaan, 'Foto Pekerjaan Spesifik'),
      buildPhotoSection(mech.temuan, 'Foto Temuan / Defek'),
      buildPhotoSection(mech.tindakan, 'Foto Tindakan Korektif'),
    ].filter(Boolean).join('<div style="margin:20px 0; border-top:1px dashed #e2e8f0;"></div>');
    
    const details = {
      informasi: [
        { label: 'Nomor Lambung Fisik', value: alatObj.nomor_lambung || '—' },
        { label: 'Kategori / Nama Umum', value: alatObj.name || '—' },
        { label: 'Merk / Tipe Pabrik', value: alatObj.merk_type || '—' },
        { label: 'Tahun Produksi', value: ptahun },
        { label: 'Jam Operasional', value: phm },
        { label: 'Indikator Kondisi Mesin', value: alatObj.condition_percentage ? alatObj.condition_percentage + '%' : 'Tidak Diketahui' },
        { label: 'Jenis Maintenance', value: pmaint },
      ],
      gejala: log.damage_description || '—',
      catatan_umum: log.repair_notes || '—'
    };

    const printWin = window.open('', '_blank');
    printWin.document.write(`
      <html>
        <head>
          <title>Laporan Maintenance - ${alatObj.nomor_lambung || alatObj.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@700&family=Open+Sans:wght@400;600&display=swap');
            body { font-family: 'Open Sans', sans-serif; padding: 40px; color: #1a1a1a; background: #fffcf8; }
            h1 { font-family: 'Merriweather', serif; color: #1e3a8a; letter-spacing: 1px; text-transform: uppercase; font-size: 24px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-bottom: 15px;}
            .meta-info { font-size: 14px; line-height: 1.6; margin-bottom: 30px; font-weight: 600; }
            .section-title { font-weight: 700; font-size: 15px; margin-top: 30px; margin-bottom: 10px; text-transform: uppercase; color: #1e3a8a; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; background: white; }
            th, td { border: 1px solid #4a4a4a; padding: 8px 12px; }
            th { font-weight: 700; text-align: left; background: #f1f5f9; }
            .signature-table { margin-top: 50px; border:none; background: transparent; }
            .signature-table th, .signature-table td { border:none; background: transparent; text-align: center; }
            .signature-table td { height: 90px; vertical-align: bottom; font-weight: 600; width:33%; font-size: 15px; }
            .foto-section-header { page-break-before: always; }
            @media print { body { background: white; -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <h1>FORMULIR LAPORAN KERUSAKAN &amp; PERBAIKAN ALAT BERAT</h1>
          <div class="meta-info">
            Waktu Laporan Masuk: ${new Date(log.reported_at).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'})}<br>
            Tahap Penanganan Akhir: <b style="color:#1e3a8a;">${log.progress_status.toUpperCase()}</b><br>
            Dikeluarkan pada tanggal: ${new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}
          </div>

          <div class="section-title">A. IDENTITAS &amp; STATUS ALAT</div>
          <table>
            ${details.informasi.map(item => `<tr><th width="35%">${item.label}</th><td>${item.value}</td></tr>`).join('')}
          </table>

          <div class="section-title">B. GEJALA AWAL (DILAPORKAN)</div>
          <div style="border:1px solid #4a4a4a; padding: 12px; background: #fff; min-height: 40px; font-size:14px;">
            ${details.gejala.replace(/\n/g, '<br/>')}
          </div>

          <div class="section-title">C. RINCIAN PEKERJAAN MEKANIK</div>
          <table>
            <tr><th width="30" style="text-align:center;">No</th><th>Daftar Pekerjaan Spesifik</th></tr>
            ${renderArray(mech.pekerjaan)}
          </table>

          <div class="section-title">D. HASIL TEMUAN LAINNYA</div>
          <table>
            <tr><th width="30" style="text-align:center;">No</th><th>Rincian Temuan Defek / Kerusakan Lanjutan</th></tr>
            ${renderArray(mech.temuan)}
          </table>

          <div class="section-title">E. TINDAKAN KOREKTIF &amp; SPAREPART</div>
          <table>
            <tr><th width="30" style="text-align:center;">No</th><th>Catatan Tindakan Pengerjaan / Saran ke Depan</th></tr>
            ${renderArray(mech.tindakan)}
          </table>

          <div class="section-title">F. CATATAN UMUM</div>
          <div style="border:1px solid #4a4a4a; padding:12px; background:#fff; min-height:40px; font-size:14px;">
            ${details.catatan_umum.replace(/\n/g, '<br/>')}
          </div>

          <table class="signature-table">
            <tr>
              <td>[Nama Operator Lapangan]</td>
              <td>[Nama Tim Mekanik]</td>
              <td>[Mengetahui, Pengawas]</td>
            </tr>
            <tr>
              <td style="font-weight:normal; font-size:13px; color:#555;">Operator Pengampu Mesin</td>
              <td style="font-weight:normal; font-size:13px; color:#555;">Teknisi / Montir Lapangan</td>
              <td style="font-weight:normal; font-size:13px; color:#555;">Tim Peralatan SDA Bojonegoro</td>
            </tr>
          </table>

          ${allPhotoSections ? `<div class="foto-section-header"><h2 style="font-family:'Merriweather',serif; color:#1e3a8a; font-size:18px; border-bottom:2px solid #3b82f6; padding-bottom:8px;">LAMPIRAN FOTO DOKUMENTASI MEKANIK</h2>${allPhotoSections}</div>` : ''}

        </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 800);
  };



  // ================= UTILS & EXPORT =================
  const generateExcelArsip = () => {
    if (semuaLogs.length === 0) return alert('Tidak ada data arsip');
    const wsData = semuaLogs.map(l => ({
      'Tanggal Laporan': new Date(l.reported_at).toLocaleString('id-ID'),
      'Nama Alat': l.equipment?.name || '',
      'Merk/Tipe': l.equipment?.merk_type || '',
      'Nomor Lambung': l.equipment?.nomor_lambung || '',
      'Gejala Kendala (Awal)': l.damage_description || '',
      'Catatan Publik': l.repair_notes || '',
      'Posisi Status': l.progress_status.toUpperCase(),
      'Waktu Selesai': l.resolved_at ? new Date(l.resolved_at).toLocaleString('id-ID') : 'Belum Selesai'
    }));
    const worksheet = XLSX.utils.json_to_sheet(wsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Arsip_Servis");
    XLSX.writeFile(workbook, "Arsip_Riwayat_Mekanik.xlsx");
  };

  const getCondColor = (pct) => pct >= 70 ? 'green' : pct >= 40 ? 'orange' : 'red';
  const filteredAlat = statusTab === 'semua' ? alat : alat.filter(a => a.status === statusTab);


  // ================= RENDER TABS =================
  return (
    <>
      <div className="header">
        <div>
          <div className="header-title">Sistem Peralatan Terpadu</div>
          <div className="header-subtitle">Manajemen Master Aset & Log Mekanik Lapangan</div>
        </div>
      </div>

      <div className="page-body">
        {/* STORAGE WARNING */}
        <StorageWarning />
        
        <div style={{display:'flex', gap: 10, marginBottom: 25, borderBottom: '2px solid #e2e8f0', paddingBottom: 10}}>
           <button onClick={()=>setMainTab('inventaris')} style={{fontSize:15, fontWeight:'bold', padding: '8px 16px', background: 'transparent', cursor:'pointer', border: 'none', color: mainTab === 'inventaris' ? '#1e3a8a' : '#64748b', borderBottom: mainTab === 'inventaris' ? '3px solid #1e3a8a' : '3px solid transparent'}}>
             📦 Manajemen Aset &amp; Status Operasional
           </button>
           <button onClick={()=>setMainTab('kerusakan')} style={{fontSize:15, fontWeight:'bold', padding: '8px 16px', background: 'transparent', cursor:'pointer', border: 'none', color: mainTab === 'kerusakan' ? '#dc2626' : '#64748b', borderBottom: mainTab === 'kerusakan' ? '3px solid #dc2626' : '3px solid transparent', position:'relative'}}>
             🔴 Laporan Kerusakan Operator
             {pendingDamageCount > 0 && <span style={{position:'absolute', top:4, right:4, background:'#dc2626', color:'#fff', borderRadius:'50%', width:18, height:18, fontSize:11, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold'}}>{pendingDamageCount}</span>}
           </button>
           <button onClick={()=>setMainTab('arsip')} style={{fontSize:15, fontWeight:'bold', padding: '8px 16px', background: 'transparent', cursor:'pointer', border: 'none', color: mainTab === 'arsip' ? '#1e3a8a' : '#64748b', borderBottom: mainTab === 'arsip' ? '3px solid #1e3a8a' : '3px solid transparent'}}>
             🛠️ Arsip Laporan Mekanik Khusus Kantor
           </button>
        </div>


        {/* ================= LAYAR INVENTARIS ================= */}
        {mainTab === 'inventaris' && (
           <>
            <div className="stats-grid" style={{gridTemplateColumns:'repeat(3,1fr)',marginBottom:20}}>
              {[
                { key:'ready', label:'Unit Ready', color:'#16a34a', bg:'#dcfce7' },
                { key:'operating', label:'Sedang Beroperasi', color:'#d97706', bg:'#fef3c7' },
                { key:'maintenance', label:'Sedang Perbaikan', color:'#7c3aed', bg:'#ede9fe' },
              ].map(s => (
                <div className="stat-card" key={s.key} style={{cursor:'pointer'}} onClick={()=>setStatusTab(s.key)}>
                  <div className="stat-icon" style={{background:s.bg}}>
                    <svg fill="none" stroke={s.color} strokeWidth={2} viewBox="0 0 24 24" style={{width:20,height:20}}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10h10z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="stat-value">{alat.filter(a=>a.status===s.key).length}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="card-header" style={{justifyContent:'space-between'}}>
                <div className="tabs" style={{margin:0,borderBottom:'none',gap:4}}>
                  {['semua','ready','operating','maintenance'].map(tab => (
                    <button key={tab} className={`tab-btn ${statusTab===tab?'active':''}`} onClick={()=>setStatusTab(tab)}
                      style={{padding:'6px 12px',fontSize:12.5}}>
                      {tab==='semua'?'Semua':tab==='ready'?'Ready':tab==='operating'?'Beroperasi':'Maintenance'}
                    </button>
                  ))}
                </div>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>+ Tambah Unit Alat</button>
              </div>

              <div className="table-wrapper">
                {loading ? (
                  <div style={{padding:40,textAlign:'center',color:'var(--text-muted)'}}>Memuat Inventaris...</div>
                ) : filteredAlat.length === 0 ? (
                  <div className="empty-state"><h3>Data unit kosong.</h3></div>
                ) : (
                  <table>
                    <thead>
                      <tr><th>No. Lambung</th><th>Nama Alat</th><th>Merk / Tipe</th><th>Status</th><th>Posisi Penugasan</th><th>Kondisi (%)</th><th>Tiket Servis</th><th>Pengaturan</th></tr>
                    </thead>
                    <tbody>
                      {filteredAlat.map(a => {
                        const statusObj = STATUS_MAP[a.status] || STATUS_MAP.ready;
                        const alatLogs = logsByEq[a.id] || [];
                        return (
                          <tr key={a.id}>
                            <td><span className="badge" style={{background:'#e2e8f0', color:'#334155', fontWeight:'bold', letterSpacing:1}}>{a.nomor_lambung || '—'}</span></td>
                            <td className="font-semibold">{a.name}</td>
                            <td className="text-muted text-sm">{a.merk_type || '—'}</td>
                            <td><span className={`badge ${statusObj.badge}`}><span className="badge-dot"/>{statusObj.label}</span></td>
                            <td>
                              {a.status === 'operating' ? (() => {
                                 const act = a.assignments?.find(asg => asg.status === 'active');
                                 if(!act) return <span className="text-xs text-muted">Tertunda</span>;
                                 return (
                                   <div>
                                     <div className="font-semibold text-sm" style={{textTransform:'capitalize'}}>{act.job_type}</div>
                                     <div className="text-xs">Desa: {act.location_village}</div>
                                   </div>
                                 )
                              })() : (<span className="text-xs text-muted">—</span>)}
                            </td>
                            <td style={{width:160}}>
                              <div style={{display:'flex',alignItems:'center',gap:8}}>
                                <div className="progress-bar-wrapper" style={{flex:1}}>
                                  <div className={`progress-bar-fill ${getCondColor(a.condition_percentage)}`} style={{width:`${a.condition_percentage}%`}}/>
                                </div>
                                <span className="text-sm font-semibold">{a.condition_percentage}%</span>
                              </div>
                            </td>
                            <td>
                              {alatLogs.length > 0 ? (
                                <button className="btn btn-sm" style={{background:'var(--maintenance-light)',color:'var(--maintenance)',border:'none'}} onClick={()=>openDetail(a)}>
                                  {alatLogs.filter(l=>l.progress_status!=='selesai').length} Aktif / {alatLogs.length} Total
                                </button>
                              ) : (<span className="text-xs text-muted">Belum ada</span>)}
                            </td>
                            <td>
                              <div style={{display:'flex', gap:5}}>
                                <button className="btn btn-outline btn-sm" onClick={()=>openEdit(a)}>⚙️ Edit</button>
                                <button className="btn btn-sm" style={{background:'#fee2e2', color:'#dc2626', border:'none'}} onClick={()=>deleteEquipment(a)}>🗑️ Hapus</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
               </div>
            </div>
           </>
        )}

        {/* ================= TAB LAPORAN KERUSAKAN OPERATOR ================= */}
        {mainTab === 'kerusakan' && (
          <div className="card">
            <div className="card-header" style={{justifyContent:'space-between', background:'#fef2f2', borderBottom:'2px solid #fca5a5'}}>
              <span className="card-title" style={{color:'#991b1b'}}>🔴 Laporan Kerusakan dari Operator — Menunggu Tindakan</span>
              <span style={{fontSize:12, color:'#64748b'}}>Klik "Terima &amp; Proses" untuk memulai penanganan. Status alat sudah otomatis jadi Maintenance.</span>
            </div>
            <div className="table-wrapper">
              {loading ? <div style={{padding:40, textAlign:'center'}}>Memuat...</div> : (() => {
                const kerusakanLogs = semuaLogs.filter(l => l.progress_status === 'pelaporan');
                if (kerusakanLogs.length === 0) return (
                  <div className="empty-state">
                    <h3>✅ Tidak ada laporan kerusakan baru</h3>
                    <p>Semua alat dalam kondisi baik atau laporan sudah ditangani.</p>
                  </div>
                );
                return (
                  <table style={{fontSize:13}}>
                    <thead>
                      <tr style={{background:'#fef2f2', color:'#7f1d1d'}}>
                        <th style={{width:120}}>Tgl Laporan</th>
                        <th>No. Lambung</th>
                        <th>Nama Alat</th>
                        <th>Dilaporkan Oleh</th>
                        <th style={{width:280}}>Gejala Kerusakan</th>
                        <th style={{width:120}}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kerusakanLogs.map(log => (
                        <tr key={log.id} style={{background:'#fff5f5', borderBottom:'1px solid #fecaca'}}>
                          <td style={{color:'#64748b'}}>{new Date(log.reported_at).toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric'})}</td>
                          <td style={{fontWeight:'bold'}}>{log.equipment?.nomor_lambung || '—'}</td>
                          <td>{log.equipment?.name}<br/><span style={{fontSize:11, color:'#64748b'}}>{log.equipment?.merk_type}</span></td>
                          <td style={{color:'#0f172a', fontSize:12}}>{log.damage_description?.match(/\[Laporan Operator: ([^\]]+)\]/)?.[1] || '—'}</td>
                          <td style={{color:'#991b1b'}}>{log.damage_description?.replace(/\[Laporan Operator: [^\]]+\]\s*/, '') || '—'}</td>
                          <td>
                            <button className="btn btn-sm" style={{background:'#1e3a8a', color:'#fff', border:'none', width:'100%'}} onClick={() => {
                              if(confirm('Terima laporan ini dan mulai proses penanganan?')) {
                                updateLogData(log.id, log.equipment_id, 'diterima', '', {});
                              }
                            }}>✅ Terima &amp; Proses</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>
        )}

        {/* ================= LAYAR ARSIP MEKANIK (EKSLUSIF CETAK) ================= */}
        {mainTab === 'arsip' && (
           <div className="card">
              <div className="card-header" style={{justifyContent:'space-between'}}>
                 <span className="card-title">Arsip Rekam Jejak Detail Mekanik Lapangan</span>
                 <button className="btn btn-primary" onClick={generateExcelArsip}>📥 Rekap Data (.xlsx)</button>
              </div>
              <div className="table-wrapper" style={{maxHeight:'70vh'}}>
                {loading ? <div style={{padding:40,textAlign:'center'}}>Memuat Database...</div> : (
                  <table style={{fontSize: 13}}>
                     <thead>
                        <tr style={{background:'#f8fafc', color:'#0f172a'}}>
                           <th style={{width:110}}>Tgl Lapor</th>
                           <th>No. Lambung</th>
                           <th>Nama & Tipe</th>
                           <th style={{width:220}}>Gejala Awal</th>
                           <th style={{width:220}}>Catatan Tahap (Terbuka Publik)</th>
                           <th>Status</th>
                           <th style={{width:100}}>Akses Form</th>
                           <th style={{width:100}}>Aksi Admin</th>
                        </tr>
                     </thead>
                     <tbody>
                        {semuaLogs.length === 0 ? <tr><td colSpan={7} style={{textAlign:'center', padding:30}}>Tidak ada arsip kendala di lapangan.</td></tr> 
                        : semuaLogs.map(log => (
                          <tr key={log.id} style={{background: log.progress_status==='selesai'?'#fff':'#fefce8'}}>
                             <td style={{color:'#64748b'}}>{new Date(log.reported_at).toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric'})}</td>
                             <td style={{fontWeight:'bold'}}>{log.equipment?.nomor_lambung || '—'}</td>
                             <td>{log.equipment?.name}<br/><span style={{fontSize:11, color:'#64748b'}}>{log.equipment?.merk_type}</span></td>
                             <td style={{color:'#991b1b'}}>{log.damage_description || '-'}</td>
                             <td style={{color:'#0f172a'}}>{log.repair_notes || '-'}</td>
                             <td><span className={`badge ${log.progress_status==='selesai'?'badge-success':'badge-warning'}`}>{log.progress_status.toUpperCase()}</span></td>
                             <td><button className="btn btn-outline btn-sm" style={{fontSize:11, padding:'6px 8px', width:'100%', borderColor:'#1e3a8a', color:'#1e3a8a'}} onClick={()=>printLog(log, log.equipment)}>🖨️ Cetak</button></td>
                             <td>
                               <div style={{display:'flex', gap:5}}>
                                 <button className="btn btn-outline btn-sm" title="Edit Log" style={{padding:'4px 8px'}} onClick={()=>handleEditLog(log)}>✏️</button>
                                 <button className="btn btn-danger btn-sm" title="Hapus Log" style={{padding:'4px 8px'}} onClick={()=>handleDeleteLog(log.id)}>🗑️</button>
                               </div>
                             </td>
                          </tr>
                        ))}
                     </tbody>
                  </table>
                )}
              </div>
           </div>
        )}

      </div>


      {/* ================= MODAL TAMBAH UNIT ================= */}
      {showAddModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowAddModal(false)}>
            {/* Same Add Modal As Before */}
            <div className="modal" style={{maxWidth:500}}>
              <div className="modal-header">
                <h3 className="modal-title">Pendaftaran Master Alat Baru</h3>
                <button className="btn-icon" onClick={()=>setShowAddModal(false)}>✖</button>
              </div>
              <form onSubmit={saveAdd}>
                <div className="modal-body">
                  <div className="form-group"><label className="form-label">Kategori / Nama Alat</label><input className="form-control" autoFocus required value={addForm.name} onChange={e=>setAddForm({...addForm, name:e.target.value})} /></div>
                  <div style={{display:'flex', gap: 15}}>
                     <div className="form-group" style={{flex:1}}><label className="form-label">Merk / Tipe Pabrik</label><input className="form-control" value={addForm.merk_type} onChange={e=>setAddForm({...addForm, merk_type:e.target.value})} /></div>
                     <div className="form-group" style={{flex:1}}><label className="form-label" style={{color:'#1e3a8a', fontWeight:'bold'}}>Nomor Lambung Fisik</label><input className="form-control" style={{border:'1px solid #1e3a8a'}} required value={addForm.nomor_lambung} onChange={e=>setAddForm({...addForm, nomor_lambung:e.target.value})} /></div>
                  </div>
                  <div className="form-group"><label className="form-label">Persentase Kondisi Mesin (%)</label><input className="form-control" type="number" min={0} max={100} value={addForm.condition_percentage} onChange={e=>setAddForm({...addForm, condition_percentage:e.target.value})} /></div>
                </div>
                <div className="modal-footer"><button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Mendaftarkan...':'Daftarkan Unit Kini'}</button></div>
              </form>
            </div>
        </div>
      )}


      {/* ================= MODAL EDIT UNIT ================= */}
      {showEditModal && selectedAlat && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowEditModal(false)}>
            {/* Same Edit Modal As Before */}
            <div className="modal" style={{maxWidth:500}}>
              <div className="modal-header">
                <h3 className="modal-title">Edit Master & Status Unit</h3>
                <button className="btn-icon" onClick={()=>setShowEditModal(false)}>✖</button>
              </div>
              <form onSubmit={saveEdit}>
                <div className="modal-body">
                  <div className="form-group"><label className="form-label">Kategori / Nama Alat</label><input className="form-control" required value={editForm.name} onChange={e=>setEditForm({...editForm, name:e.target.value})} /></div>
                  <div style={{display:'flex', gap: 15, marginBottom: 15}}><div style={{flex:1}}><label className="form-label">Merk / Tipe Pabrik</label><input className="form-control" value={editForm.merk_type} onChange={e=>setEditForm({...editForm, merk_type:e.target.value})} /></div><div style={{flex:1}}><label className="form-label" style={{color:'#1e3a8a', fontWeight:'bold'}}>Nomor Lambung</label><input className="form-control" style={{border:'1px solid #1e3a8a'}} value={editForm.nomor_lambung} onChange={e=>setEditForm({...editForm, nomor_lambung:e.target.value})} /></div></div>
                  <div className="form-group">
                    <label className="form-label">Ubah Status Operasional</label>
                    <select className="form-control" value={editForm.status} onChange={e=>setEditForm({...editForm,status:e.target.value})}>
                      {editForm.prev_status === 'operating' && <option value="operating" disabled>Beroperasi (Tarik lewat layar Penugasan)</option>}
                      <option value="ready">Ready (Siap Ditugaskan)</option>
                      <option value="maintenance">Maintenance (Ciptakan Tiket Servis)</option>
                    </select>
                  </div>
                  {editForm.status === 'maintenance' && editForm.prev_status !== 'maintenance' && (
                    <div className="form-group" style={{background:'#fef2f2', padding:10, borderRadius:6}}><label className="form-label" style={{color:'#b91c1c'}}>Gejala Awal / Deskripsi Kerusakan (Wajib)</label><textarea className="form-control" rows={3} placeholder="Mati mendadak..." value={editForm.damage_description} onChange={e=>setEditForm({...editForm,damage_description:e.target.value})} required/></div>
                  )}
                  <div className="form-group"><label className="form-label">Kondisi Alat Sisa (%)</label><input className="form-control" type="number" min={0} max={100} value={editForm.condition_percentage} onChange={e=>setEditForm({...editForm,condition_percentage:e.target.value})} /></div>
                </div>
                <div className="modal-footer"><button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Menyimpan...':'Simpan Perubahan'}</button></div>
              </form>
            </div>
        </div>
      )}

      {/* ================= MODAL LOG & PROGRES ================= */}
      {showDetailModal && selectedAlat && (() => {
         const alatLogs = logsByEq[selectedAlat.id] || [];
         
         const LogCard = ({log}) => {
            const isFinished = log.progress_status === 'selesai';
            const stepIdx = PROGRESS_STEPS.indexOf(log.progress_status);
            
            const [pStat, setPStat] = useState(log.progress_status);
            
            // Perbaikan Catatan Per Tahap
            const initialNotesMap = (() => {
               if(!log.repair_notes) return {};
               try { const p = JSON.parse(log.repair_notes); return typeof p==='object'?p:{}; } 
               catch { return { legacy: log.repair_notes }; }
            })();
            const [notesMap, setNotesMap] = useState(initialNotesMap);
            
            // Structured Form UI explicitly parsing DB's mechanicJSON
            const defaultMech = { tahun_produksi: '', jam_operasional: '', jenis_maintenance: '', pekerjaan: [], temuan: [], tindakan: [] };
            const initialMech = log.mechanic_details ? { ...defaultMech, ...log.mechanic_details } : defaultMech;
            const [mechForm, setMechForm] = useState(initialMech);
            
            const isPengerjaan = pStat === 'pengerjaan' || pStat === 'selesai';

            const addField = (arrName) => setMechForm({...mechForm, [arrName]: [...mechForm[arrName], {text:''}]});
            const updateField = (arrName, i, val) => { const n = [...mechForm[arrName]]; n[i].text = val; setMechForm({...mechForm, [arrName]: n}); };
            const delField = (arrName, i) => setMechForm({...mechForm, [arrName]: mechForm[arrName].filter((_,idx)=>idx!==i)});

            const handleSimpanTindakan = () => {
               updateLogData(log.id, log.equipment_id, pStat, JSON.stringify(notesMap), mechForm);
            };

            return (
              <div style={{border:'2px solid #e2e8f0',borderRadius:8,padding:20,marginBottom:20,background:isFinished?'#fdfdfd':'white'}}>
                 <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px dashed #cbd5e1', paddingBottom:15, marginBottom: 15}}>
                    <span style={{fontSize:12, color:'#64748b', fontWeight:'bold', letterSpacing:1}}>DILAPORKAN PADA: {new Date(log.reported_at).toLocaleString('id-ID')}</span>
                    <button className="btn btn-outline btn-sm" onClick={()=>printLog(log, selectedAlat)} style={{borderColor:'#2563eb', color:'#2563eb'}}>🖨️ Cetak Laporan PDF</button>
                 </div>
                 
                 {/* GEJALA AWAL */}
                 <div style={{background:'#fef2f2', borderLeft:'4px solid #ef4444', padding:'10px 15px', borderRadius:'0 6px 6px 0', marginBottom: 20}}>
                     <h4 style={{margin:'0 0 5px 0', color:'#b91c1c', fontSize:13}}>Gejala Kerusakan Awal</h4>
                     <p style={{margin:0, fontSize:14}}>{log.damage_description}</p>
                 </div>

                 {/* PROGRESS TRACKER */}
                 <div className="step-tracker" style={{opacity:isFinished?0.7:1, marginBottom: 20}}>
                    {PROGRESS_STEPS.map((s, i) => (
                      <div key={s} className={`step-item ${i<=stepIdx?'done':''} ${i===stepIdx?'active':''}`} onClick={() => !isFinished && setPStat(s)} style={{cursor: isFinished ? 'default' : 'pointer'}}>
                        <div className="step-circle">{i<stepIdx?'✓':i+1}</div>
                        <div className="step-label">{s.toUpperCase()}</div>
                      </div>
                    ))}
                 </div>

                 {/* CATATAN UMUM (PUBLIK UNTUK SEKSI LAIN) DENGAN KUNCI PER TAHAP */}
                 <div style={{background:'#f8fafc', border: '1px solid #e2e8f0', borderRadius:6, padding:15, marginBottom: 20}}>
                     <h4 style={{margin:'0 0 10px 0', color:'#0f172a', fontSize:13}}>Catatan Tahap ({pStat.toUpperCase()}) - Terbuka untuk Publik</h4>
                     <p style={{fontSize:11, color:'#64748b', marginBottom:8}}>Catatan yang ditulis di sini hanya akan menempel pada tahap layar sentuh di atas.</p>
                     {isFinished ? (
                         <div style={{fontSize:14, padding:10, background:'#e2e8f0', borderRadius:4}}>{notesMap[pStat] || <span style={{color:'#94a3b8', fontStyle:'italic'}}>Tak ada catatan di tahap ini.</span>}</div>
                     ) : (
                         <textarea className="form-control" rows={2} placeholder={`Ketik gambaran ringkas perbaikan pada saat tahap ${pStat}...`} 
                            value={notesMap[pStat] || ''} onChange={e=>setNotesMap({...notesMap, [pStat]: e.target.value})} />
                     )}
                 </div>

                 {/* FORMULIR MEKANIK (EKSLUSIF & MUNCUL SAAT PENGERJAAN) */}
                 {isPengerjaan && (
                   <div style={{background:'#f0fdf4', border: '2px dashed #bbf7d0', borderRadius:8, padding:20, marginBottom:20}}>
                       <h4 style={{margin:'0 0 15px 0', color:'#166534', fontSize:15, borderBottom:'1px solid #bbf7d0', paddingBottom:10}}>
                         📋 Formulir Detail Rekam Medis Mekanik 
                         <span style={{fontSize:11, fontWeight:'normal', float:'right', marginTop:3}}>*Hanya nampak di Tim Peralatan</span>
                       </h4>
                       
                       <div style={{display:'flex', gap:15, marginBottom:15}}>
                          <div style={{flex:1}}><label style={{fontSize:12, fontWeight:'bold', color:'#166534'}}>Tahun Produksi</label>
                          <input className="form-control" placeholder="Cth: 2018" disabled={isFinished} value={mechForm.tahun_produksi} onChange={e=>setMechForm({...mechForm, tahun_produksi:e.target.value})}/></div>
                          <div style={{flex:1}}><label style={{fontSize:12, fontWeight:'bold', color:'#166534'}}>Jam Ops. (HM)</label>
                          <input className="form-control" placeholder="Cth: 4500" disabled={isFinished} value={mechForm.jam_operasional} onChange={e=>setMechForm({...mechForm, jam_operasional:e.target.value})}/></div>
                          <div style={{flex:1}}><label style={{fontSize:12, fontWeight:'bold', color:'#166534'}}>Jenis Maintenance</label>
                          <input className="form-control" placeholder="Cth: Preventive" disabled={isFinished} value={mechForm.jenis_maintenance} onChange={e=>setMechForm({...mechForm, jenis_maintenance:e.target.value})}/></div>
                       </div>

                       {/* Array Builders */}
                       {[
                         { id: 'pekerjaan', title: 'Daftar Pekerjaan Spesifik' },
                         { id: 'temuan', title: 'Rincian Temuan Lapangan' },
                         { id: 'tindakan', title: 'Tindakan Korektif Mekanik' }
                       ].map(arr => (
                         <div key={arr.id} style={{marginBottom:15, background:'#f8fafc', padding:10, borderRadius:6, border:'1px solid #e2e8f0'}}>
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:8}}>
                               <strong style={{fontSize:13, color:'#334155'}}>{arr.title}</strong>
                               {!isFinished && <button type="button" className="btn btn-sm" style={{fontSize:11, background:'#e2e8f0', color:'#000'}} onClick={()=>addField(arr.id)}>+ Tambah Baris</button>}
                            </div>
                            {mechForm[arr.id].length === 0 ? <p style={{fontSize:12, color:'#94a3b8', margin:0}}>Belum ada data masuk.</p> : 
                             mechForm[arr.id].map((item, i) => (
                               <div key={i} style={{display:'flex', gap:8, marginBottom:8}}>
                                  <textarea className="form-control" rows={1} value={item.text} disabled={isFinished} onChange={e=>updateField(arr.id, i, e.target.value)} />
                                  {!isFinished && <button className="btn-icon" style={{color:'#dc2626'}} onClick={()=>delField(arr.id, i)}>✖</button>}
                               </div>
                             ))
                            }
                         </div>
                       ))}
                   </div>
                 )}

                 {!isFinished && (
                    <div style={{display:'flex', justifyContent:'flex-end', paddingTop:10, borderTop:'1px solid #e2e8f0'}}>
                       <button className="btn btn-primary" onClick={handleSimpanTindakan} style={{padding:'10px 24px', fontSize:15}}>Simpan Seluruh Progres & Form</button>
                    </div>
                 )}
              </div>
            );
         };

         return (
          <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowDetailModal(false)}>
            <div className="modal" style={{maxWidth:800, width:'95%'}}>
              <div className="modal-header" style={{background:'#1e3a8a', color:'white', borderRadius:'8px 8px 0 0'}}>
                <div>
                  <h3 className="modal-title" style={{color:'white'}}>Tiket Servis Internal - {selectedAlat.name}</h3>
                  <p style={{fontSize:12,color:'#bfdbfe',marginTop:2}}>[ NO LAMBUNG: {selectedAlat.nomor_lambung || '—'} ]</p>
                </div>
                <button className="btn-icon" style={{color:'white'}} onClick={()=>setShowDetailModal(false)}>✖</button>
              </div>
              <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto', background:'#f1f5f9', padding: '25px 20px' }}>
                {alatLogs.length === 0 ? (
                  <p style={{textAlign:'center',padding:40}}>Belum pernah terjadi pelaporan kerusakan.</p>
                ) : alatLogs.map(log => <LogCard key={log.id} log={log} />)}
              </div>
            </div>
          </div>
         )
      })()}
    </>
  );
}
