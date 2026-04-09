'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const PROGRESS_STEPS = ['pelaporan', 'diterima', 'pengerjaan', 'selesai'];
const STEP_LABELS = { pelaporan: 'Laporan Masuk', diterima: 'Diterima', pengerjaan: 'Pengerjaan', selesai: 'Selesai' };

export default function RekapPerbaikanPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('aktif');
  const [expandedId, setExpandedId] = useState(null);

  // Edit State
  const [editingLog, setEditingLog] = useState(null);
  const [form, setForm] = useState({ progress_status: '', repair_notes: '' });
  const [saving, setSaving] = useState(false);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('maintenance_logs')
      .select('*, equipment:heavy_equipment(name, merk_type)')
      .order('reported_at', { ascending: false });
    setLogs(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const filtered = logs.filter(l => {
    if (activeTab === 'aktif') return l.progress_status !== 'selesai';
    return l.progress_status === 'selesai';
  });

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const openEdit = (log) => {
    setEditingLog(log);
    setForm({ progress_status: log.progress_status, repair_notes: log.repair_notes || '' });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from('maintenance_logs').update({
      progress_status: form.progress_status,
      repair_notes: form.repair_notes,
      ...(form.progress_status === 'selesai' ? { resolved_at: new Date().toISOString() } : {}),
    }).eq('id', editingLog.id);

    if (form.progress_status === 'selesai') {
      const { data: activeAsg } = await supabase
        .from('assignments').select('id').eq('equipment_id', editingLog.equipment_id).eq('status', 'active');
      const newStatus = (activeAsg && activeAsg.length > 0) ? 'operating' : 'ready';
      await supabase.from('heavy_equipment').update({ status: newStatus }).eq('id', editingLog.equipment_id);
    }
    setSaving(false);
    setEditingLog(null);
    loadLogs();
  };

  const deleteLog = async (id) => {
    if (!confirm('Hapus log perbaikan ini?')) return;
    await supabase.from('maintenance_logs').delete().eq('id', id);
    loadLogs();
  };

  // ============ CETAK REKAP SELURUH TABEL PDF ============
  const printRekapAll = () => {
    if (filtered.length === 0) return alert('Tidak ada data untuk dicetak.');
    const printWin = window.open('', '_blank');
    let html = `<html><head><title>Rekap Perbaikan Alat Berat</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap');
        body { font-family: 'Open Sans', sans-serif; padding: 30px; font-size: 12px; }
        h2 { text-align: center; margin-bottom: 5px; color: #496350; }
        .sub { text-align: center; margin-bottom: 20px; font-size: 11px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #333; padding: 7px 10px; }
        th { background: #d9ead3; font-weight: 700; text-align: center; }
        .tc { text-align: center; }
        @media print { body { -webkit-print-color-adjust: exact; } }
      </style></head><body>
      <h2>REKAPITULASI PERBAIKAN ALAT BERAT</h2>
      <p class="sub">Dinas PU SDA Kabupaten Bojonegoro — Dicetak: ${new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})}</p>
      <table>
        <thead><tr>
          <th>No</th><th>Tanggal Laporan</th><th>Nama Alat</th><th>Merk/Tipe</th>
          <th>Deskripsi Kerusakan</th><th>Catatan Perbaikan</th><th>Status</th><th>Tanggal Selesai</th>
        </tr></thead><tbody>`;
    filtered.forEach((log, i) => {
      html += `<tr>
        <td class="tc">${i + 1}</td>
        <td class="tc">${new Date(log.reported_at).toLocaleDateString('id-ID')}</td>
        <td>${log.equipment?.name || '-'}</td>
        <td>${log.equipment?.merk_type || '-'}</td>
        <td>${log.damage_description}</td>
        <td>${log.repair_notes || '-'}</td>
        <td class="tc">${log.progress_status.toUpperCase()}</td>
        <td class="tc">${log.resolved_at ? new Date(log.resolved_at).toLocaleDateString('id-ID') : '—'}</td>
      </tr>`;
    });
    html += `</tbody></table>
      <div style="display:flex;justify-content:space-between;margin-top:50px;">
        <div style="text-align:center;width:200px;">Diverifikasi Oleh,<br><br><br><br><b>Ka. Seksi Peralatan</b></div>
        <div style="text-align:center;width:200px;">Dikerjakan Oleh,<br><br><br><br><b>Mekanik Lapangan</b></div>
      </div>
    </body></html>`;
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 800);
  };

  // ============ CETAK SATU BARIS (LAPORAN MAINTENANCE) ============
  const printSingleLog = (log) => {
    const printWin = window.open('', '_blank');
    printWin.document.write(`<html><head><title>Laporan Maintenance - ${log.equipment?.name}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@700&family=Open+Sans:wght@400;600&display=swap');
        body { font-family: 'Open Sans', sans-serif; padding: 40px; color: #1a1a1a; }
        h1 { font-family: 'Merriweather', serif; color: #496350; letter-spacing: 2px; text-transform: uppercase; font-size: 24px; border-bottom: 2px solid #8ba391; padding-bottom: 10px; }
        .meta { font-size: 13px; line-height: 1.7; margin-bottom: 25px; }
        .sec { font-weight: 700; font-size: 14px; margin-top: 25px; margin-bottom: 8px; text-transform: uppercase; border-left: 4px solid #496350; padding-left: 10px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 13px; }
        th, td { border: 1px solid #4a4a4a; padding: 8px; }
        th { font-weight: 700; text-align: center; background: #f0f4f0; }
        .tc { text-align: center; }
        .sig { margin-top: 50px; display: flex; justify-content: space-between; }
        .sig div { text-align: center; width: 200px; }
        @media print { body { -webkit-print-color-adjust: exact; } }
      </style></head><body>
      <h1>LAPORAN MAINTENANCE ALAT BERAT</h1>
      <div class="meta">
        <b>Tanggal Laporan:</b> ${new Date(log.reported_at).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}<br>
        <b>Nama Alat:</b> ${log.equipment?.name || '-'}<br>
        <b>Merk / Tipe:</b> ${log.equipment?.merk_type || '-'}<br>
        <b>Lokasi:</b> Operasi Dinas PU SDA Kab. Bojonegoro
      </div>

      <div class="sec">Deskripsi Kerusakan / Keluhan</div>
      <table><tr><td>${log.damage_description}</td></tr></table>

      <div class="sec">Catatan Perbaikan Mekanik</div>
      <table><tr><td>${log.repair_notes || '<i>Belum ada catatan perbaikan</i>'}</td></tr></table>

      <div class="sec">Status Penanganan</div>
      <table>
        <tr><th>Tahap</th><th>Status</th></tr>
        ${PROGRESS_STEPS.map(s => {
          const idx = PROGRESS_STEPS.indexOf(s);
          const currentIdx = PROGRESS_STEPS.indexOf(log.progress_status);
          const isDone = idx <= currentIdx;
          return `<tr><td>${STEP_LABELS[s]}</td><td class="tc" style="color:${isDone ? '#16a34a' : '#9ca3af'};font-weight:700;">${isDone ? '✓ Selesai' : '○ Menunggu'}</td></tr>`;
        }).join('')}
      </table>

      ${log.mechanic_report_url ? `
        <div class="sec">Lampiran Dokumentasi Mekanik</div>
        <div style="text-align:center;margin:20px 0;">
          <img src="${log.mechanic_report_url}" style="max-width:100%;max-height:600px;border:2px solid #ccc;" />
        </div>
      ` : ''}

      <div class="sig">
        <div>Diverifikasi Oleh,<br><br><br><br><b>Ka. Seksi Peralatan</b></div>
        <div>Mekanik Penanggung Jawab,<br><br><br><br><b>[Nama Mekanik]</b></div>
      </div>
    </body></html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 800);
  };

  const getProgressColor = (status) => {
    if (status === 'selesai') return '#16a34a';
    if (status === 'pengerjaan') return '#f59e0b';
    if (status === 'diterima') return '#3b82f6';
    return '#9ca3af';
  };

  return (
    <>
      <div className="header">
        <div>
          <div className="header-title">Rekap Data Perbaikan</div>
          <div className="header-subtitle">Kelola seluruh laporan kerusakan & maintenance alat berat. Klik baris untuk melihat detail.</div>
        </div>
        <div className="header-right">
          <button className="btn btn-primary" style={{display:'flex', alignItems:'center', gap:6}} onClick={printRekapAll}>
            🖨️ Cetak Rekap PDF
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="tab-container" style={{marginBottom: 20, display:'flex', gap: 10}}>
          <button className={`tab-btn ${activeTab === 'aktif' ? 'active' : ''}`} onClick={() => { setActiveTab('aktif'); setExpandedId(null); }}>
            🔧 Antrean Aktif ({logs.filter(l => l.progress_status !== 'selesai').length})
          </button>
          <button className={`tab-btn ${activeTab === 'selesai' ? 'active' : ''}`} onClick={() => { setActiveTab('selesai'); setExpandedId(null); }}>
            ✅ Riwayat Selesai ({logs.filter(l => l.progress_status === 'selesai').length})
          </button>
        </div>

        <div className="card">
          <div className="table-wrapper">
            {loading ? (
              <div style={{padding: 40, textAlign: 'center'}}>Memuat data perbaikan...</div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <h3>{activeTab === 'aktif' ? 'Tidak Ada Antrean Aktif' : 'Belum Ada Riwayat'}</h3>
                <p>{activeTab === 'aktif' ? 'Semua alat beres! Tidak ada laporan kerusakan yang masuk.' : 'Belum ada perbaikan yang diselesaikan.'}</p>
              </div>
            ) : (
              <table style={{fontSize: 12.5}}>
                <thead>
                  <tr style={{background:'#e8f5e9'}}>
                    <th style={{width:40}}>No</th>
                    <th>Tanggal</th>
                    <th>Nama Alat</th>
                    <th>Kerusakan (Ringkasan)</th>
                    <th style={{width:160}}>Progress</th>
                    <th style={{width:100}}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log, idx) => {
                    const stepIdx = PROGRESS_STEPS.indexOf(log.progress_status);
                    const isExpanded = expandedId === log.id;
                    return (
                      <>
                        {/* Baris Ringkasan (Klik untuk expand) */}
                        <tr key={log.id} onClick={() => toggleExpand(log.id)}
                          style={{cursor:'pointer', background: isExpanded ? '#f0f9ff' : 'white', transition:'background 0.2s'}}>
                          <td style={{textAlign:'center'}}>{idx + 1}</td>
                          <td style={{whiteSpace:'nowrap'}}>{new Date(log.reported_at).toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric'})}</td>
                          <td>
                            <div className="font-semibold">{log.equipment?.name}</div>
                            <div className="text-xs text-muted">{log.equipment?.merk_type || ''}</div>
                          </td>
                          <td style={{maxWidth:250}}>
                            <div style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                              {log.damage_description}
                            </div>
                          </td>
                          <td>
                            <div style={{display:'flex', gap:2, marginBottom:3}}>
                              {PROGRESS_STEPS.map((s, i) => (
                                <div key={s} style={{
                                  flex:1, height:6, borderRadius:3,
                                  background: i <= stepIdx ? getProgressColor(log.progress_status) : '#e5e7eb'
                                }}/>
                              ))}
                            </div>
                            <div style={{fontSize:10, textAlign:'center', textTransform:'capitalize', fontWeight:700,
                              color: getProgressColor(log.progress_status)
                            }}>{STEP_LABELS[log.progress_status]}</div>
                          </td>
                          <td onClick={e => e.stopPropagation()}>
                            <div style={{display:'flex', gap:4}}>
                              <button className="btn btn-sm btn-primary" style={{fontSize:10, padding:'3px 7px'}} onClick={() => openEdit(log)}>✏️ Edit</button>
                              <button className="btn btn-sm btn-outline" style={{fontSize:10, padding:'3px 7px'}} onClick={() => printSingleLog(log)}>PDF</button>
                              <button className="btn btn-sm" style={{fontSize:10, padding:'3px 7px', background:'#fee2e2', color:'#dc2626', border:'none'}} onClick={() => deleteLog(log.id)}>🗑️</button>
                            </div>
                          </td>
                        </tr>

                        {/* Baris Detail (Expandable) */}
                        {isExpanded && (
                          <tr key={log.id + '-detail'}>
                            <td colSpan={6} style={{padding:0, background:'#f8fafc'}}>
                              <div style={{padding:'20px 24px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:20}}>
                                {/* Kolom Kiri: Info Lengkap */}
                                <div>
                                  <h4 style={{fontSize:14, marginBottom:12, color:'#374151'}}>📋 Detail Laporan Kerusakan</h4>
                                  
                                  <div style={{background:'white', border:'1px solid #e5e7eb', borderRadius:8, padding:16, marginBottom:12}}>
                                    <div style={{fontSize:11, color:'#6b7280', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.5px', fontWeight:600}}>Deskripsi Lengkap</div>
                                    <div style={{fontSize:13, lineHeight:1.6}}>{log.damage_description}</div>
                                  </div>

                                  <div style={{background:'white', border:'1px solid #e5e7eb', borderRadius:8, padding:16, marginBottom:12}}>
                                    <div style={{fontSize:11, color:'#6b7280', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.5px', fontWeight:600}}>Catatan Perbaikan Mekanik</div>
                                    <div style={{fontSize:13, lineHeight:1.6}}>{log.repair_notes || <span style={{color:'#9ca3af', fontStyle:'italic'}}>Belum ada catatan perbaikan dari mekanik</span>}</div>
                                  </div>

                                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
                                    <div style={{background:'white', border:'1px solid #e5e7eb', borderRadius:8, padding:12}}>
                                      <div style={{fontSize:10, color:'#6b7280', textTransform:'uppercase', fontWeight:600}}>Dilaporkan</div>
                                      <div style={{fontSize:13, fontWeight:600, marginTop:4}}>{new Date(log.reported_at).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</div>
                                    </div>
                                    <div style={{background:'white', border:'1px solid #e5e7eb', borderRadius:8, padding:12}}>
                                      <div style={{fontSize:10, color:'#6b7280', textTransform:'uppercase', fontWeight:600}}>Diselesaikan</div>
                                      <div style={{fontSize:13, fontWeight:600, marginTop:4}}>{log.resolved_at ? new Date(log.resolved_at).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}) : '— (Dalam Proses)'}</div>
                                    </div>
                                  </div>
                                </div>

                                {/* Kolom Kanan: Progress & Lampiran */}
                                <div>
                                  <h4 style={{fontSize:14, marginBottom:12, color:'#374151'}}>📊 Progress Penanganan</h4>
                                  
                                  <div style={{background:'white', border:'1px solid #e5e7eb', borderRadius:8, padding:16, marginBottom:12}}>
                                    {PROGRESS_STEPS.map((step, i) => {
                                      const isDone = i <= stepIdx;
                                      const isCurrent = i === stepIdx;
                                      return (
                                        <div key={step} style={{display:'flex', alignItems:'center', gap:12, padding:'8px 0', borderBottom: i < 3 ? '1px solid #f3f4f6' : 'none'}}>
                                          <div style={{
                                            width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                                            fontSize:12, fontWeight:700, flexShrink:0,
                                            background: isDone ? getProgressColor(log.progress_status) : '#f3f4f6',
                                            color: isDone ? 'white' : '#9ca3af',
                                            border: isCurrent ? `2px solid ${getProgressColor(log.progress_status)}` : 'none',
                                            boxShadow: isCurrent ? `0 0 0 3px ${getProgressColor(log.progress_status)}33` : 'none'
                                          }}>
                                            {isDone && i < stepIdx ? '✓' : i + 1}
                                          </div>
                                          <div>
                                            <div style={{fontSize:13, fontWeight: isCurrent ? 700 : 400, color: isDone ? '#111' : '#9ca3af'}}>
                                              {STEP_LABELS[step]}
                                            </div>
                                            {isCurrent && <div style={{fontSize:10, color: getProgressColor(log.progress_status), fontWeight:600}}>← Saat ini</div>}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Lampiran Mekanik */}
                                  {log.mechanic_report_url && (
                                    <div style={{background:'white', border:'1px solid #e5e7eb', borderRadius:8, padding:16}}>
                                      <div style={{fontSize:11, color:'#6b7280', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.5px', fontWeight:600}}>📎 Lampiran Bukti Mekanik</div>
                                      <a href={log.mechanic_report_url} target="_blank" className="btn btn-outline" style={{width:'100%', textAlign:'center', fontSize:12}}>
                                        Buka Dokumen / Foto Mekanik Lapangan
                                      </a>
                                    </div>
                                  )}

                                  {/* Action Buttons */}
                                  <div style={{display:'flex', gap:8, marginTop:12}}>
                                    <button className="btn btn-outline" style={{flex:1, fontSize:11}} onClick={() => printSingleLog(log)}>🖨️ Cetak Laporan PDF</button>
                                    <button className="btn" style={{fontSize:11, background:'transparent', color:'#dc2626', border:'1px solid #fecaca'}} onClick={() => deleteLog(log.id)}>🗑️ Hapus</button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Edit/Olah Modal */}
      {editingLog && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditingLog(null)}>
          <div className="modal" style={{maxWidth: 550}}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Olah Tindakan Perbaikan</h3>
                <p style={{fontSize:12, color:'var(--text-muted)', marginTop:2}}>{editingLog.equipment?.name} — {editingLog.equipment?.merk_type}</p>
              </div>
              <button className="btn-icon" onClick={() => setEditingLog(null)}>
                <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{width:18,height:18}}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <form onSubmit={saveEdit}>
              <div className="modal-body">
                <div style={{background: 'var(--bg-base)', padding: 12, borderRadius: 8, marginBottom: 16, border:'1px solid var(--border)'}}>
                  <div style={{fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', fontWeight:600, marginBottom:4}}>Keluhan Awal</div>
                  <div style={{fontSize:13}}>{editingLog.damage_description}</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Update Status Perbaikan</label>
                  <select className="form-control" value={form.progress_status} onChange={e => setForm({...form, progress_status: e.target.value})}>
                    <option value="pelaporan">Pelaporan (Baru masuk)</option>
                    <option value="diterima">Diterima (Sedang disiapkan)</option>
                    <option value="pengerjaan">Pengerjaan (Proses mekanik)</option>
                    <option value="selesai">Selesai (Alat bisa bertugas normal)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Catatan Perbaikan Mekanik Lapangan</label>
                  <textarea className="form-control" rows={4}
                    placeholder="Jelaskan tindakan perbaikan yang dilakukan, suku cadang yang diganti, dll..."
                    value={form.repair_notes} onChange={e => setForm({...form, repair_notes: e.target.value})}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setEditingLog(null)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
