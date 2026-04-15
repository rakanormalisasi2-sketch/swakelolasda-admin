'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const JOB_LABELS = { normalisasi: 'Normalisasi', embung: 'Embung', lainnya: 'Lainnya' };
const SUB_LABELS = { normalisasi_sungai: 'Normalisasi Sungai', saluran_afvoer: 'Saluran Air/Afvoer', normalisasi_embung: 'Normalisasi Embung', pembangunan_embung: 'Pembangunan Embung' };
const STATUS_MAP = {
  ready: { label: 'Siap Ditugaskan', badge: 'badge-success' },
  operating: { label: 'Sedang Beroperasi', badge: 'badge-warning' },
  maintenance: { label: 'Sedang Perbaikan', badge: 'badge-maintenance' },
};
const PROGRESS_STEPS = ['pelaporan', 'diterima', 'pengerjaan', 'selesai'];

export default function StatusOperasionalPage() {
  const { profile } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [operators, setOperators] = useState([]);
  const [alat, setAlat] = useState([]);
  const [logs, setLogs] = useState({});
  const [loading, setLoading] = useState(true);

  // States for Logs Modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAlat, setSelectedAlat] = useState(null);

  // Filters
  const [filterSeksi, setFilterSeksi] = useState('semua');
  const [filterData, setFilterData] = useState('semua'); // 'semua', 'alat_ready', 'alat_maintenance', 'operator_ready'

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Build query - filter berdasarkan role yang login
      let asgnQuery = supabase.from('assignments').select(`
          *,
          operator:user_profiles!assignments_operator_id_fkey(full_name),
          helper:user_profiles!assignments_helper_id_fkey(full_name),
          equipment:heavy_equipment(name, merk_type, nomor_lambung, status)
        `).eq('status', 'active').order('start_date', { ascending: false });

      const [asgnRes, opsRes, alatRes, logsRes] = await Promise.all([
        asgnQuery,
        supabase.from('user_profiles').select('*').eq('role', 'operator').order('full_name'),
        supabase.from('heavy_equipment').select('*').order('name'),
        supabase.from('maintenance_logs').select('*').neq('progress_status', 'selesai').order('reported_at', { ascending: false })
      ]);

      setAssignments(asgnRes.data || []);
      setOperators(opsRes.data || []);
      setAlat(alatRes.data || []);
      
      // Group logs
      const logsMap = {};
      (logsRes.data || []).forEach(l => {
        if (!logsMap[l.equipment_id]) logsMap[l.equipment_id] = [];
        logsMap[l.equipment_id].push(l);
      });
      setLogs(logsMap);
    } catch (err) {
      console.error('Error loading operational status:', err);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const endAssignment = async (id) => {
    if(!confirm('Selesaikan penugasan ini? Operator dan Alat Berat akan kembali tersedia.')) return;
    await supabase.from('assignments').update({ status: 'finished', end_date: new Date().toISOString() }).eq('id', id);
    load();
  };

  // Computations
  const assignedOpIds = new Set([
    ...assignments.map(a => a.operator_id),
    ...assignments.map(a => a.helper_id).filter(Boolean),
  ]);
  const freeOperators = operators.filter(o => !assignedOpIds.has(o.id));
  const maintenanceCount = alat.filter(a => a.status === 'maintenance').length;
  const readyAlatCount = alat.filter(a => a.status === 'ready').length;

  let displayAssignments = assignments;
  if (filterSeksi !== 'semua') {
    displayAssignments = assignments.filter(a => a.created_by_role === filterSeksi);
  }

  let displayAlat = alat;
  if (filterData === 'alat_ready') displayAlat = alat.filter(a => a.status === 'ready');
  if (filterData === 'alat_maintenance') displayAlat = alat.filter(a => a.status === 'maintenance');

  return (
    <>
      <div className="header">
        <div>
          <div className="header-title">Status Operasional Terpadu</div>
          <div className="header-subtitle">Pantau ketersediaan Operator dan Alat Berat secara real-time</div>
        </div>
        <div className="header-right">
           <select className="form-control" style={{width: 200}} value={filterSeksi} onChange={e=>setFilterSeksi(e.target.value)}>
             <option value="semua">Semua Seksi Pekerjaan</option>
             <option value="seksi_normalisasi">Seksi Normalisasi</option>
             <option value="seksi_embung">Seksi Embung</option>
           </select>
        </div>
      </div>

      <div className="page-body">
        {/* Top Summary Stats */}
        <div className="stats-grid" style={{marginBottom: 24}}>
          <div className={`stat-card ${filterData==='semua'?'active-filter':''}`} style={{cursor:'pointer', border: filterData==='semua'?'1px solid var(--primary)':''}} onClick={()=>setFilterData('semua')}>
            <div className="stat-icon" style={{background:'#e0e7ff'}}><svg fill="none" stroke="#4f46e5" strokeWidth={2} viewBox="0 0 24 24" style={{width:20}}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg></div>
            <div><div className="stat-value">{displayAssignments.length}</div><div className="stat-label">Penugasan Aktif</div></div>
          </div>
          <div className={`stat-card ${filterData==='operator_ready'?'active-filter':''}`} style={{cursor:'pointer', border: filterData==='operator_ready'?'1px solid var(--success)':''}} onClick={()=>setFilterData('operator_ready')}>
            <div className="stat-icon" style={{background:'#dcfce7'}}><svg fill="none" stroke="#16a34a" strokeWidth={2} viewBox="0 0 24 24" style={{width:20}}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div>
            <div><div className="stat-value">{freeOperators.length}</div><div className="stat-label">Operator Tersedia</div></div>
          </div>
          <div className={`stat-card ${filterData==='alat_ready'?'active-filter':''}`} style={{cursor:'pointer', border: filterData==='alat_ready'?'1px solid var(--success)':''}} onClick={()=>setFilterData('alat_ready')}>
            <div className="stat-icon" style={{background:'#dcfce7'}}><svg fill="none" stroke="#16a34a" strokeWidth={2} viewBox="0 0 24 24" style={{width:20}}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10h10z" /></svg></div>
            <div><div className="stat-value">{readyAlatCount}</div><div className="stat-label">Siap Ditugaskan</div></div>
          </div>
          <div className={`stat-card ${filterData==='alat_maintenance'?'active-filter':''}`} style={{cursor:'pointer', border: filterData==='alat_maintenance'?'1px solid var(--maintenance)':''}} onClick={()=>setFilterData('alat_maintenance')}>
            <div className="stat-icon" style={{background:'#fee2e2'}}><svg fill="none" stroke="#dc2626" strokeWidth={2} viewBox="0 0 24 24" style={{width:20}}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div>
            <div><div className="stat-value">{maintenanceCount}</div><div className="stat-label">Sedang Maintenance</div></div>
          </div>
        </div>

        <div className="status-grid-layout">
          
          {/* Main List */}
          <div style={{display:'flex', flexDirection:'column', gap: 20}}>
            
            {/* Table Alat Berat */}
            {(filterData === 'semua' || filterData.startsWith('alat_')) && (
              <div className="card">
                <div className="card-header"><span className="card-title">Kondisi & Status Alat Berat</span></div>
                <div className="table-wrapper">
                  {loading ? <div style={{padding:20,textAlign:'center'}}>Memuat...</div> : (
                    <table>
                      <thead><tr><th>Nama Alat</th><th>Merk</th><th>No. Lambung</th><th>Kondisi</th><th>Status</th><th>Info</th></tr></thead>
                      <tbody>
                        {displayAlat.map(a => {
                          const statusObj = STATUS_MAP[a.status] || STATUS_MAP.ready;
                          const condColor = a.condition_percentage >= 70 ? 'green' : a.condition_percentage >= 40 ? 'orange' : 'red';
                          const hasLogs = logs[a.id]?.length > 0;
                          return (
                            <tr key={a.id}>
                              <td className="font-semibold">{a.name}</td>
                              <td className="text-muted">{a.merk_type||'—'}</td>
                              <td><span className="badge" style={{background:'#e2e8f0',color:'#334155',fontWeight:'bold',letterSpacing:1}}>{a.nomor_lambung||'—'}</span></td>
                              <td style={{width:160}}>
                                 <div style={{display:'flex',alignItems:'center',gap:8}}>
                                   <div className="progress-bar-wrapper" style={{flex:1}}>
                                     <div className={`progress-bar-fill ${condColor}`} style={{width: `${a.condition_percentage}%`}}/>
                                   </div>
                                   <span className="text-xs font-semibold">{a.condition_percentage}%</span>
                                 </div>
                              </td>
                              <td><span className={`badge ${statusObj.badge}`}><span className="badge-dot"/>{statusObj.label}</span></td>
                              <td>
                                {hasLogs ? (
                                  <button className="btn btn-sm" style={{background:'var(--maintenance-light)',color:'var(--maintenance)',border:'none',fontSize:11.5,padding:'4px 8px'}}
                                    onClick={() => { setSelectedAlat(a); setShowDetailModal(true); }}>
                                    Lihat Progress Cek
                                  </button>
                                ) : (
                                  <span className="text-muted text-xs">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* Table Penugasan */}
            {(filterData === 'semua') && (
              <div className="card">
                <div className="card-header"><span className="card-title">Daftar Pekerjaan Aktif</span></div>
                <div className="table-wrapper">
                  {loading ? <div style={{padding:20,textAlign:'center'}}>Memuat...</div> 
                  : displayAssignments.length === 0 ? <p style={{padding:20,textAlign:'center',color:'var(--text-muted)'}}>Tidak ada pekerjaan aktif.</p> : (
                    <table>
                      <thead><tr><th>Operator (Helper)</th><th>Pekerjaan</th><th>Lokasi Real (Update)</th><th>Aksi</th></tr></thead>
                      <tbody>
                        {displayAssignments.map(a => {
                          const locDistrict = a.location_district_override || a.location_district;
                          const locVillage = a.location_village_override || a.location_village;
                          const helperName = a.helper_override || a.helper?.full_name || 'Sendiri';
                          const isModified = a.is_modified_by_operator;

                          const canFinish = profile.role === 'superadmin' || profile.role === a.created_by_role;

                          return (
                            <tr key={a.id}>
                              <td>
                                <div className="font-semibold">{a.operator?.full_name||'—'}</div>
                                <div className="text-xs text-muted" style={{marginTop:3}}>
                                  Helper: {helperName}
                                  {a.helper_override && <span style={{color:'var(--warning)',marginLeft:4}} title="Diperbarui oleh Operator di lapangan">⚠️</span>}
                                </div>
                              </td>
                              <td>
                                 <div><span className={`badge ${a.job_type==='normalisasi'?'badge-primary':'badge-success'}`}>{JOB_LABELS[a.job_type]||a.job_type}</span></div>
                                 {a.job_sub_type && <div className="text-xs" style={{marginTop:3, color:'var(--primary)'}}>{SUB_LABELS[a.job_sub_type]||a.job_sub_type}</div>}
                                 {a.equipment && (
                                   <div className="text-xs font-semibold mt-1" style={{marginTop:4}}>
                                     🚜 {[a.equipment.nomor_lambung, a.equipment.merk_type ? `(${a.equipment.merk_type})` : null, a.equipment.name].filter(Boolean).join(' ')}
                                   </div>
                                 )}
                              </td>
                              <td>
                                <div>Desa {locVillage}, Kec. {locDistrict}</div>
                                {isModified && <div className="text-xs" style={{color:'var(--warning)',marginTop:3}}>⚠️ Lokasi diubah operator via Mobile</div>}
                                <div className="text-xs text-muted" style={{marginTop:3}}>Asal Tgs: {a.created_by_role==='seksi_normalisasi'?'Normalisasi':'Embung'}</div>
                              </td>
                              <td>
                                {canFinish ? (
                                  <button className="btn btn-outline btn-sm" onClick={()=>endAssignment(a.id)}>Selesai</button>
                                ) : (
                                  <span className="text-xs text-muted">Akses Terbatas</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Area */}
          <div>
            {(filterData === 'semua' || filterData === 'operator_ready') && (
              <div className="card">
                <div className="card-header"><span className="card-title">Daftar Operator (Ready)</span></div>
                <div className="card-body" style={{padding: '12px', maxHeight: 600, overflowY:'auto'}}>
                  {loading ? <div style={{fontSize:13,color:'var(--text-muted)'}}>Memuat...</div>
                  : freeOperators.length === 0 ? <p style={{fontSize:13,color:'var(--text-muted)'}}>Semua sedang bertugas.</p>
                  : freeOperators.map(op => (
                    <div key={op.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px',borderBottom:'1px solid var(--border)'}}>
                      <div style={{width:32,height:32,borderRadius:'50%',background:'var(--success-light)',color:'var(--success)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0}}>
                        {op.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold" style={{fontSize:13.5}}>{op.full_name}</div>
                        <div className="text-xs" style={{color:'var(--success)'}}>● Siap Ditugaskan</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Detail Modal - Maintenance Progress View */}
      {showDetailModal && selectedAlat && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowDetailModal(false)}>
          <div className="modal" style={{maxWidth:600}}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Progress Perbaikan — {selectedAlat.name}</h3>
                <p style={{fontSize:12,color:'var(--text-muted)'}}>{selectedAlat.merk_type}</p>
              </div>
              <button className="btn-icon" onClick={()=>setShowDetailModal(false)}>
                <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{width:18,height:18}}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="modal-body">
              {(logs[selectedAlat.id]||[]).length===0 ? (
                <p style={{textAlign:'center',color:'var(--text-muted)',padding:20}}>Tidak ada log kerusakan & perbaikan aktif.</p>
              ) : (logs[selectedAlat.id]||[]).map(log => {
                 const stepIdx = PROGRESS_STEPS.indexOf(log.progress_status);
                 
                 // Parse JSON Notes
                 let notesMap = {};
                 if (log.repair_notes) {
                    try { const p = JSON.parse(log.repair_notes); notesMap = typeof p==='object'?p:{}; } 
                    catch { notesMap = { legacy: log.repair_notes }; }
                 }

                 return (
                   <div key={log.id} style={{border:'1px solid var(--border)',borderRadius:'var(--radius-md)',padding:16,marginBottom:14}}>
                      <div style={{marginBottom:12}}>
                         <p className="font-semibold" style={{fontSize:13.5}}>{log.damage_description}</p>
                         <p className="text-xs text-muted" style={{marginTop:3}}>Dilaporkan: {new Date(log.reported_at).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'})}</p>
                      </div>
                      <div className="step-tracker" style={{pointerEvents:'none', marginBottom:12}}>
                       {PROGRESS_STEPS.map((s, i) => {
                         const hasNote = notesMap[s] && notesMap[s].trim() !== '';
                         return (
                         <div key={s} className={`step-item ${i<=stepIdx?'done':''} ${i===stepIdx?'active':''}`}>
                           <div className="step-circle" style={{position:'relative'}}>
                             {i<stepIdx?'✓':i+1}
                             {hasNote && <span style={{position:'absolute', top:-6, right:-8, fontSize:12}} title="Ada catatan">💬</span>}
                           </div>
                           <div className="step-label">{s.charAt(0).toUpperCase()+s.slice(1)}</div>
                         </div>
                       )})}
                      </div>

                      {/* GAMBARAN UMUM (PUBLIK) DARI TIM PERALATAN */}
                      <div style={{background:'#f8fafc', padding:'10px 15px', borderRadius:6, border:'1px solid #e2e8f0', marginTop:12}}>
                         <p style={{margin:0, fontSize:11, fontWeight:'bold', color:'#0f172a', marginBottom:8}}>GAMBARAN UMUM PROGRESS (Dari Tim Peralatan):</p>
                         {Object.keys(notesMap).filter(k=>k!=='legacy' && notesMap[k].trim()!=='').length === 0 && !notesMap.legacy ? (
                           <p style={{margin:0, fontSize:12, color:'#94a3b8', fontStyle:'italic'}}>Belum ada update catatan umum.</p>
                         ) : (
                           <div style={{display:'flex', flexDirection:'column', gap:8}}>
                             {notesMap.legacy && <div style={{fontSize:12.5}}><span style={{fontWeight:600}}>[Catatan Lama]:</span> {notesMap.legacy}</div>}
                             {PROGRESS_STEPS.map(s => {
                               if(!notesMap[s] || notesMap[s].trim()==='') return null;
                               return (
                                 <div key={s} style={{fontSize: 12.5, color:'#334155'}}>
                                    <span style={{fontWeight:600, color:'#1e3a8a', textTransform:'capitalize'}}>Tahap {s}:</span> {notesMap[s]}
                                 </div>
                               );
                             })}
                           </div>
                         )}
                      </div>

                    {log.mechanic_report_url && (
                        <div style={{marginTop:12,background:'var(--bg-base)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',padding:'10px 12px',fontSize:13}}>
                          <span className="text-muted text-xs">Lampiran Bukti Mekanik Lapangan: </span>
                          <a href={log.mechanic_report_url} target="_blank" className="font-semibold" style={{color:'var(--primary)',textDecoration:'underline'}}>Lihat Dokumen</a>
                        </div>
                    )}
                  </div>
                );
              })}
              <em className="text-xs text-muted mt-4" style={{display:'block'}}>Perubahan status update progress dikendalikan sepenuhnya oleh Tim Peralatan & Mekanik Lapangan.</em>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
