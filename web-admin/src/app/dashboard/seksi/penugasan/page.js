'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import WILAYAH from '@/lib/wilayah';
import { geocodeLocation, parseGoogleMapsUrl } from '@/lib/geocoder';

export default function PenugasanPage() {
  const { profile } = useAuth();
  const [operators, setOperators] = useState([]);
  const [alat, setAlat] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [historyAssignments, setHistoryAssignments] = useState([]);
  const [busyIdsAll, setBusyIdsAll] = useState(new Set()); // semua seksi
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false); // Status pencarian koordinat
  const [error, setError] = useState('');
  const [desaList, setDesaList] = useState([]);
  const [form, setForm] = useState({
    operator_id: '', helper_id: '', equipment_id: '',
    job_type: 'normalisasi', job_sub_type: '', custom_job_description: '',
    location_district: '', location_village: '',
    latitude: '', longitude: '', mapsUrl: '',
  });

  // Auto-geocode when village changes
  useEffect(() => {
    async function autoGeocode() {
      // Hanya jalankan jika desa & kec ada, tapi kordinat MASIH KOSONG
      if (form.location_village && form.location_district && !form.latitude && !form.longitude) {
        setGeocoding(true);
        try {
          console.log(`[Penugasan] Auto-geocoding: ${form.location_village}, ${form.location_district}`);
          const result = await geocodeLocation(form.location_village, form.location_district);
          if (result && result.lat != null && result.lng != null) {
            setForm(f => ({
              ...f,
              latitude: String(result.lat),
              longitude: String(result.lng)
            }));
          }
        } catch (err) {
          console.error('[Penugasan] Geocoding error:', err);
        } finally {
          setGeocoding(false);
        }
      }
    }
    autoGeocode();
  }, [form.location_village, form.location_district]);
  const [editId, setEditId] = useState(null);
  const [originalEquipmentId, setOriginalEquipmentId] = useState(null);

  // Job options berbasis role seksi
  const isNormalisasi = profile?.role === 'seksi_normalisasi';

  // Opsi utama: Seksi Normalisasi hanya lihat Normalisasi+Lainnya, Seksi Embung hanya Embung+Lainnya
  const JOB_TYPE_OPTIONS = isNormalisasi
    ? [
        { value: 'normalisasi', label: 'Normalisasi' },
        { value: 'lainnya', label: 'Lainnya' },
      ]
    : [
        { value: 'embung', label: 'Embung' },
        { value: 'lainnya', label: 'Lainnya' },
      ];

  // Sub-pekerjaan sesuai permintaan user:
  // Normalisasi → Normalisasi Sungai | Normalisasi Saluran/Irigasi
  // Embung → Rehabilitasi Embung | Pembangunan Embung
  const JOB_SUB_OPTIONS = {
    normalisasi: [
      { value: 'normalisasi_sungai', label: 'Normalisasi Sungai' },
      { value: 'normalisasi_saluran_irigasi', label: 'Normalisasi Saluran / Irigasi' },
    ],
    embung: [
      { value: 'rehabilitasi_embung', label: 'Rehabilitasi Embung' },
      { value: 'pembangunan_embung', label: 'Pembangunan Embung' },
    ],
  };

  // Default job_type berdasarkan role
  const defaultJobType = isNormalisasi ? 'normalisasi' : 'embung';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: ops }, { data: alatData }, { data: asgn }, { data: histAsgn }] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('role', 'operator').order('full_name'),
        supabase.from('heavy_equipment').select('*').order('name'),
        supabase.from('assignments').select(`
          *,
          operator:user_profiles!assignments_operator_id_fkey(full_name),
          helper:user_profiles!assignments_helper_id_fkey(full_name),
          equipment:heavy_equipment(name, merk_type, nomor_lambung, status)
        `).eq('status', 'active').eq('created_by_role', profile?.role).order('start_date', { ascending: false }),
        supabase.from('assignments').select(`
          *,
          operator:user_profiles!assignments_operator_id_fkey(full_name),
          helper:user_profiles!assignments_helper_id_fkey(full_name),
          equipment:heavy_equipment(name, merk_type, nomor_lambung, status)
        `).in('status', ['finished', 'selesai']).eq('created_by_role', profile?.role).order('end_date', { ascending: false }).limit(50)
      ]);
      setOperators(ops || []);
      setAlat(alatData || []);
      setAssignments(asgn || []);
      setHistoryAssignments(histAsgn || []);
      // Self-healing: Fix created_by_role if it was accidentally changed to superadmin
      if (profile?.role === 'superadmin' || profile?.role === 'seksi_normalisasi' || profile?.role === 'seksi_embung') {
         // Background fix for lost data
         supabase.from('assignments').update({ created_by_role: 'seksi_normalisasi' }).eq('job_type', 'normalisasi').neq('created_by_role', 'seksi_normalisasi').then(() => {});
         supabase.from('assignments').update({ created_by_role: 'seksi_embung' }).eq('job_type', 'embung').neq('created_by_role', 'seksi_embung').then(() => {});
      }

      // Ambil SEMUA assignment aktif (lintas seksi) hanya untuk cek busyIds dan stuck equipments
      const { data: allActiveAsgnRaw } = await supabase.from('assignments').select('operator_id, helper_id, equipment_id').eq('status', 'active');
      const allActiveAsgn = allActiveAsgnRaw || [];

      // busyIds dihitung dari semua seksi agar tidak bisa assign operator yang sudah aktif di seksi lain
      const allBusy = new Set([
        ...allActiveAsgn.map(a => a.operator_id),
        ...allActiveAsgn.map(a => a.helper_id).filter(Boolean),
      ]);
      setBusyIdsAll(allBusy);

      // Self-healing: Fix stuck equipment that are 'operating' but not in any active assignment
      const activeEqIds = new Set(allActiveAsgn.map(a => a.equipment_id).filter(Boolean));
      const stuckEqs = (alatData || []).filter(a => a.status === 'operating' && !activeEqIds.has(a.id));
      if (stuckEqs.length > 0) {
        console.log('Auto-fixing stuck equipments:', stuckEqs);
        await Promise.all(stuckEqs.map(eq => supabase.from('heavy_equipment').update({ status: 'ready' }).eq('id', eq.id)));
        setAlat(prev => prev.map(a => stuckEqs.find(s => s.id === a.id) ? { ...a, status: 'ready' } : a));
      }
    } catch (err) {
      console.error('Error loading penugasan data:', err);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  // busyIds dari seksi sendiri (untuk edit mode — tetap include operator saat ini)
  const busyIds = new Set([
    ...assignments.map(a => a.operator_id),
    ...assignments.map(a => a.helper_id).filter(Boolean),
  ]);
  // busyIdsAll: lintas seksi (untuk filter dropdown)
  const freeOperators = operators.filter(o => !busyIdsAll.has(o.id));
  const availableAlat = alat.filter(a => a.status === 'ready');

  const handleDistrictChange = (kec) => {
    setForm(f => ({ ...f, location_district: kec, location_village: '' }));
    setDesaList(WILAYAH[kec] || []);
  };

  const handleEdit = (a) => {
    setEditId(a.id);
    setOriginalEquipmentId(a.equipment_id);
    setForm({
      operator_id: a.operator_id || '',
      helper_id: a.helper_id || '',
      equipment_id: a.equipment_id || '',
      job_type: a.job_type || 'normalisasi',
      job_sub_type: a.job_sub_type || '',
      custom_job_description: a.custom_job_description || '',
      location_district: a.location_district || '',
      location_village: a.location_village || '',
      latitude: a.latitude || '',
      longitude: a.longitude || '',
      mapsUrl: '',
    });
    setDesaList(WILAYAH[a.location_district] || []);
    setError('');
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    if (!form.operator_id || !form.equipment_id || !form.location_district || !form.location_village) {
      setError('Harap lengkapi semua field yang wajib diisi.'); setSaving(false); return;
    }
    const dataToSave = {
      operator_id: form.operator_id,
      helper_id: form.helper_id || null,
      equipment_id: form.equipment_id,
      job_type: form.job_type,
      job_sub_type: form.job_sub_type || null,
      custom_job_description: form.job_type === 'lainnya' ? form.custom_job_description : null,
      location_district: form.location_district,
      location_village: form.location_village,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      status: 'active',
      created_by_role: profile.role,
    };

    if (editId) {
       const updateData = { ...dataToSave };
       delete updateData.created_by_role; // Prevent overwriting created_by_role on edit
       const { error: asgnErr } = await supabase.from('assignments').update(updateData).eq('id', editId);
       if (asgnErr) { setError(asgnErr.message); setSaving(false); return; }
       if (originalEquipmentId && originalEquipmentId !== form.equipment_id) {
          // Revert old eq to ready, set new eq to operating
          await supabase.from('heavy_equipment').update({ status: 'ready' }).eq('id', originalEquipmentId);
          await supabase.from('heavy_equipment').update({ status: 'operating' }).eq('id', form.equipment_id);
       }
    } else {
       const { error: asgnErr } = await supabase.from('assignments').insert(dataToSave);
       if (asgnErr) { setError(asgnErr.message); setSaving(false); return; }
       await supabase.from('heavy_equipment').update({ status: 'operating' }).eq('id', form.equipment_id);
    }
    
    setSaving(false); setShowModal(false); load();
  };

  const finishAssignment = async (a) => {
    if (!confirm(`Selesaikan penugasan ${a.operator?.full_name}?`)) return;
    await supabase.from('assignments').update({ status: 'finished', end_date: new Date().toISOString() }).eq('id', a.id);
    await supabase.from('heavy_equipment').update({ status: 'ready' }).eq('id', a.equipment_id);
    load();
  };

  const deleteAssignment = async (a) => {
    if (!confirm(`YAKIN HAPUS penugasan ${a.operator?.full_name}? \n\nPerhatian: Data Laporan Pelaksanaan yang terkait dengan penugasan ini TIDAK akan ikut terhapus, namun tidak akan tertaut lagi ke penugasan ini.`)) return;
    setSaving(true);
    // Kembalikan status alat ke ready jika assignment masih aktif
    if (a.status === 'active' && a.equipment_id) {
      await supabase.from('heavy_equipment').update({ status: 'ready' }).eq('id', a.equipment_id);
    }
    const { error } = await supabase.from('assignments').delete().eq('id', a.id);
    if (error) {
      alert('Gagal menghapus penugasan: ' + error.message);
    } else {
      load();
    }
    setSaving(false);
  };

  const JOB_LABELS = { normalisasi: 'Normalisasi', embung: 'Embung', lainnya: 'Lainnya' };
  const SUB_LABELS = {
    normalisasi_sungai: 'Normalisasi Sungai',
    normalisasi_saluran_irigasi: 'Normalisasi Saluran / Irigasi',
    rehabilitasi_embung: 'Rehabilitasi Embung',
    pembangunan_embung: 'Pembangunan Embung',
    // backward compat lama
    saluran_afvoer: 'Saluran Air / Afvoer',
    normalisasi_embung: 'Normalisasi Embung',
  };

  return (
    <>
      <div className="header">
        <div>
          <div className="header-title">Penugasan Operator</div>
          <div className="header-subtitle">Rekrut dan tugaskan operator ke pekerjaan lapangan</div>
        </div>
        <div className="header-right">
          <button className="btn btn-primary" onClick={() => { setEditId(null); setOriginalEquipmentId(null); setForm({ operator_id:'', helper_id:'', equipment_id:'', job_type: defaultJobType, job_sub_type:'', custom_job_description:'', location_district:'', location_village:'', latitude:'', longitude:'', mapsUrl: '' }); setError(''); setShowModal(true); }}>
            <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{width:15,height:15}}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
            Tugaskan Operator
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Penugasan Aktif ({assignments.length})</span>
          </div>
          <div className="table-wrapper">
            {loading ? (
              <div style={{padding:40,textAlign:'center',color:'var(--text-muted)'}}>Memuat...</div>
            ) : assignments.length === 0 ? (
              <div className="empty-state"><svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" style={{width:48,height:48}}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg><h3>Belum ada penugasan aktif</h3><p>Klik "Tugaskan Operator" untuk membuat penugasan baru.</p></div>
            ) : (
              <table>
                <thead><tr><th>Operator</th><th>Helper</th><th>Alat Berat</th><th>Pekerjaan</th><th>Lokasi</th><th>Tanggal Mulai</th><th>Aksi</th></tr></thead>
                <tbody>
                  {assignments.map(a => (
                    <tr key={a.id}>
                      <td className="font-semibold">{a.operator?.full_name||'—'}</td>
                      <td className="text-muted">{a.helper?.full_name||'—'}</td>
                      <td>
                        {a.equipment ? (
                          <div>
                            <div className="font-semibold">{a.equipment.nomor_lambung || '—'}</div>
                            <div className="text-xs text-muted">{[a.equipment.merk_type, a.equipment.name].filter(Boolean).join(' · ')}</div>
                          </div>
                        ) : '—'}
                      </td>
                      <td>
                        <span className={`badge ${a.job_type==='normalisasi'?'badge-primary':a.job_type==='embung'?'badge-success':'badge-neutral'}`}>
                          {JOB_LABELS[a.job_type]||a.job_type}
                        </span>
                        {a.job_sub_type && <div className="text-xs" style={{marginTop:3, color:'var(--primary)'}}>{SUB_LABELS[a.job_sub_type]||a.job_sub_type}</div>}
                        {a.custom_job_description && <div className="text-xs text-muted" style={{marginTop:3}}>{a.custom_job_description}</div>}
                      </td>
                      <td>{a.location_village}, Kec. {a.location_district}</td>
                      <td className="text-sm text-muted">{new Date(a.start_date).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'})}</td>
                      <td>
                        <div style={{display:'flex', gap:6}}>
                          <button className="btn btn-sm btn-outline" style={{padding:'4px 8px'}} onClick={() => handleEdit(a)}>Ubah</button>
                          <button className="btn btn-sm btn-success" style={{padding:'4px 8px'}} onClick={() => finishAssignment(a)}>Selesaikan</button>
                          <button className="btn btn-sm" style={{padding:'4px 8px', background:'#fee2e2', color:'#ef4444', border:'1px solid #fca5a5'}} onClick={() => deleteAssignment(a)}>Hapus</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Histori Penugasan */}
        <div className="card" style={{marginTop: 24}}>
          <div className="card-header" style={{background: '#f8fafc', borderBottom: '1px solid #e2e8f0'}}>
            <span className="card-title" style={{color: '#64748b'}}>Histori Penugasan Selesai (Terakhir 50)</span>
          </div>
          <div className="table-wrapper">
            {loading ? (
              <div style={{padding:40,textAlign:'center',color:'var(--text-muted)'}}>Memuat...</div>
            ) : historyAssignments.length === 0 ? (
              <div className="empty-state" style={{padding: '30px 20px'}}><p>Belum ada histori penugasan yang selesai.</p></div>
            ) : (
              <table>
                <thead><tr><th>Operator</th><th>Helper</th><th>Alat Berat</th><th>Pekerjaan</th><th>Lokasi</th><th>Selesai Pada</th><th>Aksi</th></tr></thead>
                <tbody>
                  {historyAssignments.map(a => (
                    <tr key={a.id} style={{background: '#fafafa', color: '#666'}}>
                      <td className="font-semibold">{a.operator?.full_name||'—'}</td>
                      <td className="text-muted">{a.helper?.full_name||'—'}</td>
                      <td>
                        {a.equipment ? (
                          <div>
                            <div className="font-semibold">{a.equipment.nomor_lambung || '—'}</div>
                            <div className="text-xs text-muted">{[a.equipment.merk_type, a.equipment.name].filter(Boolean).join(' · ')}</div>
                          </div>
                        ) : '—'}
                      </td>
                      <td>
                        <span className="badge badge-neutral">{JOB_LABELS[a.job_type]||a.job_type}</span>
                        {a.job_sub_type && <div className="text-xs" style={{marginTop:3}}>{SUB_LABELS[a.job_sub_type]||a.job_sub_type}</div>}
                      </td>
                      <td>{a.location_village}, Kec. {a.location_district}</td>
                      <td className="text-sm text-muted">{a.end_date ? new Date(a.end_date).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</td>
                      <td>
                        <button className="btn btn-sm" style={{padding:'4px 8px', background:'#fee2e2', color:'#ef4444', border:'1px solid #fca5a5'}} onClick={() => deleteAssignment(a)}>Hapus</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal" style={{maxWidth:560}}>
            <div className="modal-header">
              <h3 className="modal-title">{editId ? 'Ubah Penugasan Operator' : 'Penugasan Operator Baru'}</h3>
              <button className="btn-icon" onClick={()=>setShowModal(false)}>
                <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{width:18,height:18}}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {error && <div className="alert alert-danger"><svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{width:16,height:16}}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01"/></svg>{error}</div>}

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Operator * <span className="text-xs text-muted">({freeOperators.length} tersedia)</span></label>
                    <select className="form-control" required value={form.operator_id} onChange={e=>setForm({...form,operator_id:e.target.value})}>
                      <option value="">— Pilih Operator —</option>
                      {/* For edit mode, we must include the current operator even if busy */}
                      {operators.filter(o => !busyIdsAll.has(o.id) || o.id === form.operator_id).map(o=><option key={o.id} value={o.id}>{o.full_name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Helper/Operator 2 <span className="text-xs text-muted">(opsional)</span></label>
                    <select className="form-control" value={form.helper_id} onChange={e=>setForm({...form,helper_id:e.target.value})}>
                      <option value="">— Tanpa Helper —</option>
                      {operators.filter(o => (!busyIdsAll.has(o.id) || o.id === form.helper_id) && o.id !== form.operator_id).map(o=><option key={o.id} value={o.id}>{o.full_name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Alat Berat * <span className="text-xs text-muted">({availableAlat.length} tersedia)</span></label>
                  <select className="form-control" required value={form.equipment_id} onChange={e=>setForm({...form,equipment_id:e.target.value})}>
                    <option value="">— Pilih Alat Berat —</option>
                    {alat.map(a => {
                      const labelDetail = [a.nomor_lambung, a.merk_type ? `(${a.merk_type})` : null, a.name].filter(Boolean).join(' ');
                      const statusNote = a.status!=='ready' && a.id !== form.equipment_id ? ` — ${a.status==='maintenance'?'⚠ Maintenance':'Beroperasi'}` : '';
                      return (
                        <option key={a.id} value={a.id} disabled={a.status!=='ready' && a.id !== form.equipment_id}>
                          {labelDetail}{statusNote}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-xs text-muted" style={{marginTop:4}}>Alat berstatus Maintenance tidak dapat dipilih.</p>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Jenis Pekerjaan *</label>
                    <select className="form-control" value={form.job_type} onChange={e => setForm({...form, job_type: e.target.value, job_sub_type: ''})}>
                      {JOB_TYPE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {JOB_SUB_OPTIONS[form.job_type] && (
                    <div className="form-group">
                      <label className="form-label">Rincian Pekerjaan *</label>
                      <select className="form-control" required value={form.job_sub_type} onChange={e => setForm({...form, job_sub_type: e.target.value})}>
                        <option value="">— Pilih Rincian Pekerjaan —</option>
                        {JOB_SUB_OPTIONS[form.job_type].map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {form.job_type === 'lainnya' && (
                  <div className="form-group">
                    <label className="form-label">Keterangan Pekerjaan *</label>
                    <input className="form-control" required value={form.custom_job_description} onChange={e=>setForm({...form,custom_job_description:e.target.value})} placeholder="Tuliskan jenis pekerjaan secara spesifik..." />
                  </div>
                )}

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Kecamatan *</label>
                    <select className="form-control" required value={form.location_district} onChange={e=>handleDistrictChange(e.target.value)}>
                      <option value="">— Pilih Kecamatan —</option>
                      {Object.keys(WILAYAH).map(k=><option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Desa *</label>
                    <select className="form-control" required value={form.location_village} onChange={e=>setForm({...form,location_village:e.target.value})} disabled={!form.location_district}>
                      <option value="">— Pilih Desa —</option>
                      {desaList.map(d=><option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">URL / Koordinat Google Maps <span className="text-xs text-muted">(opsional)</span></label>
                  <input
                    type="url"
                    className="form-control"
                    value={form.mapsUrl}
                    onChange={e => {
                      const url = e.target.value;
                      setForm(f => ({ ...f, mapsUrl: url }));
                      const coords = parseGoogleMapsUrl(url);
                      if (coords) {
                        setForm(f => ({
                          ...f,
                          latitude: String(coords.lat),
                          longitude: String(coords.lng),
                        }));
                      }
                    }}
                    placeholder="Paste Google Maps URL atau @-7.1565312,111.8928896"
                  />
                  <p className="text-xs" style={{ marginTop: 4, color: parseGoogleMapsUrl(form.mapsUrl) ? 'var(--success)' : 'var(--text-muted)' }}>
                    {parseGoogleMapsUrl(form.mapsUrl)
                      ? '✓ Koordinat berhasil di-parse dari URL'
                      : 'Tempel URL Google Maps untuk auto-fill koordinat'}
                  </p>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Latitude <span className="text-xs text-muted">(opsional)</span></label>
                    <input type="number" step="any" className="form-control" value={form.latitude} onChange={e=>setForm({...form,latitude:e.target.value})} placeholder="Contoh: -7.1565312" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Longitude <span className="text-xs text-muted">(opsional)</span></label>
                    <input type="number" step="any" className="form-control" value={form.longitude} onChange={e=>setForm({...form,longitude:e.target.value})} placeholder="Contoh: 111.8928896" />
                  </div>
                </div>
                <div style={{marginTop: -8, marginBottom: 16, fontSize: 12, color: 'var(--text-muted)'}}>
                  <p>
                    {geocoding ? (
                      <span style={{ color: 'var(--primary)', fontWeight: '600', animation: 'pulse 1.5s infinite' }}>
                        📡 Sedang mencari koordinat otomatis Desa {form.location_village}...
                      </span>
                    ) : (
                      'Peta menggunakan koordinat sebaran (Database Excel). Tempel URL Google Maps di atas, atau isi Latitude/Longitude jika ingin lokasi spesifik.'
                    )}
                  </p>
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={()=>setShowModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Menyimpan...':'Tugaskan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
