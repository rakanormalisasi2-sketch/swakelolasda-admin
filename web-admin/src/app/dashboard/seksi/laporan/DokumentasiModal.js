'use client';
import { useState, useMemo } from 'react';
import React from 'react';

function extractDriveId(url) {
  if (!url) return null;
  const m = url.match(/\/d\/([a-zA-Z0-9_-]{25,})/)
    || url.match(/id=([a-zA-Z0-9_-]{25,})/);
  return m ? m[1] : null;
}

function toImg(url) {
  if (!url) return null;
  const id = extractDriveId(url.trim());
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w800` : url.trim();
}

function toView(url) {
  if (!url) return null;
  const id = extractDriveId(url.trim());
  return id ? `https://drive.google.com/file/d/${id}/view` : url.trim();
}

const PROGRESS_OPTS = ['0%', '50%', '100%'];
const PROGRESS_COLOR = { '0%': '#f97316', '50%': '#eab308', '100%': '#22c55e' };
const PROGRESS_BG   = { '0%': '#fff7ed', '50%': '#fefce8', '100%': '#f0fdf4' };

export default function DokumentasiModal({ logs, onClose, pdfConfig, handleUploadTambahan }) {
  const [selectedLog, setSelectedLog]   = useState(null);
  const [dokSelection, setDokSelection] = useState({});
  const [filter, setFilter]             = useState('all');
  const [search, setSearch]             = useState('');
  const [groupExpanded, setGroupExpanded] = useState({});
  const [viewMode, setViewMode]         = useState('grouped'); // 'flat' | 'grouped'

  const getJobLabel = (log) => {
    const op = log.override_operator || log.operator?.full_name || '-';
    const eq = log.equipment;
    const alatLabel = log.override_alat || (
      eq ? [eq.nomor_lambung, eq.merk_type ? `(${eq.merk_type})` : null, eq.name].filter(Boolean).join(' ') : null
    ) || log.jenis_alat || '-';
    const k = log.override_kecamatan || log.assignment?.location_district || '-';
    const d = log.override_desa || log.assignment?.location_village || '-';
    return `${op} | ${alatLabel} | Kec. ${k} - Desa ${d}`;
  };

  const rows = useMemo(() => logs.map(log => {
    const urls = log.foto_lapangan_urls
      ? log.foto_lapangan_urls.split(',').map(u => u.trim()).filter(Boolean)
      : [];
    const selectedCount = urls.filter((_, i) => {
      const v = dokSelection[log.id + '_' + i];
      return v && v !== 'skip';
    }).length;
    return { log, urls, selectedCount };
  }), [logs, dokSelection]);

  // Group rows by pekerjaan
  const groupedRows = useMemo(() => {
    const groups = {};
    rows.forEach(r => {
      const key = getJobLabel(r.log);
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    return groups;
  }, [rows]);

  // Centang massal per kelompok pekerjaan
  const selectAllGroup = (groupKey, val) => {
    setDokSelection(prev => {
      const next = { ...prev };
      groupedRows[groupKey].forEach(({ log, urls }) =>
        urls.forEach((_, i) => { next[log.id + '_' + i] = val; })
      );
      return next;
    });
  };
  const isGroupAllSelected = (groupKey) => {
    return groupedRows[groupKey].every(({ log, urls }) =>
      urls.every((_, i) => {
        const v = dokSelection[log.id + '_' + i];
        return v && v !== 'skip';
      })
    );
  };

  const filteredRows = useMemo(() => rows.filter(({ log, urls, selectedCount }) => {
    if (filter === 'selected' && selectedCount === 0) return false;
    if (filter === 'unselected' && selectedCount > 0) return false;
    const tgl = new Date(log.tanggal).toLocaleDateString('id-ID');
    const op  = log.override_operator || log.operator?.full_name || log.operator_name || '';
    const loc = (log.override_desa || log.assignment?.location_village || '') + ' ' +
                (log.override_kecamatan || log.assignment?.location_district || '');
    if (search && !`${tgl}${op}${loc}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [rows, filter, search]);

  const totalSelected = Object.values(dokSelection).filter(v => v && v !== 'skip').length;

  const selectedUrls = selectedLog
    ? (selectedLog.foto_lapangan_urls || '').split(',').map(u => u.trim()).filter(Boolean)
    : [];

  const setProgress = (logId, idx, val) =>
    setDokSelection(p => ({ ...p, [logId + '_' + idx]: val }));

  const setAllProgress = (logId, urlList, val) =>
    setDokSelection(p => {
      const n = { ...p };
      urlList.forEach((_, i) => { n[logId + '_' + i] = val; });
      return n;
    });

  // ─── CETAK PDF ────────────────────────────────────────────────────────────
  const execPrint = () => {
    const config = pdfConfig || {
      program: 'PENGELOLAAN SUMBER DAYA AIR',
      kegiatan: '',
      pekerjaanPrefix: 'NORMALISASI SUNGAI',
    };

    const printWin = window.open('', '_blank');
    let html = `<!DOCTYPE html><html><head><title>Foto Dokumentasi</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:Arial,sans-serif; font-size:11px; color:#000; }
  @page { size: legal portrait; margin: 12mm 15mm; }
  .hal { width: 100%; height: 307mm; display: flex; flex-direction: column; page-break-after: always; overflow: hidden; }
  .hal:last-child { page-break-after: auto; }
  .hdr-title { font-size: 14px; font-weight: bold; text-align: center; letter-spacing: 2px; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 7px; flex-shrink: 0; }
  .info-tbl { width:100%; border-collapse:collapse; margin-bottom:7px; flex-shrink:0; }
  .info-tbl td { padding:2px 5px; font-size:10.5px; vertical-align:top; line-height:1.4; }
  .info-tbl td:first-child { width:115px; font-weight:bold; white-space:nowrap; }
  .info-tbl td:nth-child(2) { width:10px; }
  .foto-area { flex: 1; display: flex; flex-direction: column; border: 1.5px solid #000; overflow: hidden; min-height: 0; }
  .foto-baris { flex: 1; display: flex; border-bottom: 1px solid #000; min-height: 0; overflow: hidden; }
  .foto-baris:last-child { border-bottom: none; }
  .foto-img { flex: 0 0 62%; border-right: 1px solid #000; display: flex; align-items: center; justify-content: center; padding: 6px; overflow: hidden; }
  .foto-img img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
  .foto-caption { flex: 0 0 38%; display: flex; flex-direction: column; justify-content: center; padding: 10px 14px; }
  .caption-lbl { font-weight:bold; font-size:10.5px; margin-bottom:3px; }
  .badge { display: inline-block; padding: 3px 12px; border-radius: 12px; font-weight: bold; font-size: 11px; margin-top: 7px; width: fit-content; }
  .p0   { background:#fed7aa; color:#9a3412; }
  .p50  { background:#fde68a; color:#92400e; }
  .p100 { background:#bbf7d0; color:#14532d; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style>
</head><body>`;

    logs.forEach(log => {
      const urls = (log.foto_lapangan_urls || '').split(',').map(u => u.trim()).filter(Boolean);
      const ORD = { '0%': 0, '50%': 1, '100%': 2 };
      const selected = urls
        .map((url, i) => {
          const prog = dokSelection[log.id + '_' + i];
          return prog && prog !== 'skip' ? { url, prog } : null;
        })
        .filter(Boolean)
        .sort((a, b) => (ORD[a.prog] ?? 9) - (ORD[b.prog] ?? 9));

      if (selected.length === 0) return;

      const desa = (log.override_desa || log.assignment?.location_village || '').toUpperCase();
      const kec  = (log.override_kecamatan || log.assignment?.location_district || '').toUpperCase();
      const pek  = log.custom_pekerjaan || SUB_MAP_DOK[log.assignment?.job_sub_type] || config.pekerjaanPrefix;
      const tgl  = new Date(log.tanggal)
        .toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
        .toUpperCase();
      const tahun = new Date(log.tanggal).getFullYear();

      html += `<div class="hal">
  <div class="hdr-title">FOTO DOKUMENTASI</div>
  <table class="info-tbl">
    <tr><td>PROGRAM</td><td>:</td><td>${config.program || ''}</td></tr>
    <tr><td>KEGIATAN</td><td>:</td><td>${config.kegiatan || ''}</td></tr>
    <tr><td>PEKERJAAN</td><td>:</td><td>${pek} DESA ${desa} KECAMATAN ${kec}</td></tr>
    <tr><td>TAHUN ANGGARAN</td><td>:</td><td>${tahun}</td></tr>
    <tr><td>LOKASI</td><td>:</td><td>DESA ${desa} KECAMATAN ${kec}</td></tr>
    <tr><td>TANGGAL</td><td>:</td><td>${tgl}</td></tr>
  </table>
  <div class="foto-area">`;

      selected.forEach(item => {
        const cls   = item.prog === '100%' ? 'p100' : item.prog === '50%' ? 'p50' : 'p0';
        const label = item.prog === '0%' ? 'PROGRESS 0%'
                    : item.prog === '50%' ? 'PROGRESS 50%'
                    : 'PROGRESS 100%';
        html += `<div class="foto-baris">
      <div class="foto-img"><img src="${toImg(item.url)}" /></div>
      <div class="foto-caption">
        <div class="caption-lbl">KETERANGAN :</div>
        <div style="font-size:10.5px;margin-top:3px;">FOTO PROSES PELAKSANAAN</div>
        <div class="badge ${cls}">${label}</div>
      </div>
    </div>`;
      });

      html += `  </div>
</div>`;
    });

    html += `</body></html>`;
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 1500);
    onClose();
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.75)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>
      <div style={{ width:'96vw', height:'94vh', background:'#fff', borderRadius:16, display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 25px 50px rgba(0,0,0,0.4)' }}>

        {/* HEADER */}
        <div style={{ background:'linear-gradient(135deg,#1e3a5f,#2563eb)', color:'#fff', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:24 }}>📸</span>
            <div>
              <div style={{ fontWeight:700, fontSize:16 }}>Konfigurasi Cetak Dokumentasi</div>
              <div style={{ fontSize:12, opacity:0.8 }}>Pilih foto &amp; tandai progress — setiap baris = 1 halaman Legal</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            {totalSelected > 0 && (
              <div style={{ background:'rgba(255,255,255,0.2)', borderRadius:20, padding:'6px 14px', fontSize:13, fontWeight:600 }}>
                ✅ {totalSelected} foto dipilih
              </div>
            )}
            <button onClick={onClose} style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)', color:'#fff', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:18, lineHeight:1 }}>✕</button>
          </div>
        </div>

        {/* BODY */}
        <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

          {/* LEFT PANEL */}
          <div style={{ width:310, borderRight:'1px solid #e2e8f0', display:'flex', flexDirection:'column', background:'#f8fafc', flexShrink:0 }}>
            <div style={{ padding:'12px 14px', borderBottom:'1px solid #e2e8f0', background:'#fff' }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="🔍 Cari tanggal, operator, lokasi..."
                style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid #cbd5e1', fontSize:12, outline:'none', marginBottom:8 }}
              />
              <div style={{ display:'flex', gap:4 }}>
                {[['all','Semua'],['selected','✅ Ditandai'],['unselected','Belum']].map(([v,l]) => (
                  <button key={v} onClick={() => setFilter(v)}
                    style={{ flex:1, padding:'5px 0', fontSize:11, fontWeight:600, borderRadius:6, border:'none', cursor:'pointer',
                      background: filter===v ? '#2563eb' : '#f1f5f9', color: filter===v ? '#fff' : '#64748b' }}>
                    {l}
                  </button>
                ))}
              </div>
              <div style={{ display:'flex', gap:4, marginTop:6 }}>
                <button onClick={() => setViewMode('flat')}
                  style={{ flex:1, padding:'5px 0', fontSize:11, fontWeight:600, borderRadius:6, border:'none', cursor:'pointer',
                    background: viewMode==='flat' ? '#0f766e' : '#f1f5f9', color: viewMode==='flat' ? '#fff' : '#64748b' }}>
                  📋 Flat
                </button>
                <button onClick={() => setViewMode('grouped')}
                  style={{ flex:1, padding:'5px 0', fontSize:11, fontWeight:600, borderRadius:6, border:'none', cursor:'pointer',
                    background: viewMode==='grouped' ? '#0f766e' : '#f1f5f9', color: viewMode==='grouped' ? '#fff' : '#64748b' }}>
                  🗂️ Per Pekerjaan
                </button>
              </div>
            </div>
            <div style={{ flex:1, overflowY:'auto' }}>
              {/* ── FLAT MODE ── */}
              {viewMode === 'flat' && (
                <>
                  {filteredRows.length === 0 && (
                    <div style={{ padding:24, textAlign:'center', color:'#94a3b8', fontSize:13 }}>Tidak ada data</div>
                  )}
                  {filteredRows.map(({ log, urls, selectedCount }) => {
                    const isActive = selectedLog?.id === log.id;
                    const tgl = new Date(log.tanggal).toLocaleDateString('id-ID');
                    const op  = log.override_operator || log.operator?.full_name || log.operator_name || '-';
                    const loc = `${log.override_desa || log.assignment?.location_village || ''}, ${log.override_kecamatan || log.assignment?.location_district || ''}`;
                    return (
                      <div key={log.id} onClick={() => setSelectedLog(log)}
                        style={{ padding:'12px 14px', borderBottom:'1px solid #f0f4f8', cursor:'pointer', transition:'all 0.15s',
                          background: isActive ? '#eff6ff' : '#fff', borderLeft: isActive ? '3px solid #2563eb' : '3px solid transparent' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                          <div style={{ fontWeight:600, fontSize:13, color: isActive ? '#1e40af' : '#1e293b' }}>📅 {tgl}</div>
                          <div style={{ display:'flex', gap:4 }}>
                            <span style={{ fontSize:11, background:'#e2e8f0', padding:'2px 7px', borderRadius:10, color:'#475569' }}>{urls.length}📷</span>
                            {selectedCount > 0 && <span style={{ fontSize:11, background:'#d1fae5', padding:'2px 7px', borderRadius:10, color:'#065f46' }}>✅{selectedCount}</span>}
                          </div>
                        </div>
                        <div style={{ fontSize:11, color:'#64748b' }}>{op}</div>
                        <div style={{ fontSize:11, color:'#94a3b8' }}>{loc}</div>
                      </div>
                    );
                  })}
                </>
              )}
              {/* ── GROUPED MODE ── */}
              {viewMode === 'grouped' && (
                <>
                  {Object.keys(groupedRows).length === 0 && (
                    <div style={{ padding:24, textAlign:'center', color:'#94a3b8', fontSize:13 }}>Tidak ada data</div>
                  )}
                  {Object.entries(groupedRows).map(([groupKey, groupRows]) => {
                    const isOpen = groupExpanded[groupKey] !== false;
                    const totalFoto = groupRows.reduce((s, { urls }) => s + urls.length, 0);
                    const selCnt = groupRows.reduce((s, { selectedCount }) => s + selectedCount, 0);
                    return (
                      <div key={groupKey}>
                        <div style={{ padding:'9px 12px', background:'#1e3a5f', color:'#fff', display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}
                          onClick={() => setGroupExpanded(p => ({ ...p, [groupKey]: !isOpen }))}>
                          <span style={{ fontSize:11 }}>{isOpen ? '▼' : '▶'}</span>
                          <span style={{ fontWeight:700, fontSize:12, flex:1 }}>🗂️ {groupKey}</span>
                          <span style={{ fontSize:10, opacity:0.8 }}>{groupRows.length} baris · {totalFoto}📷</span>
                          {selCnt > 0 && <span style={{ fontSize:10, background:'#d1fae5', color:'#065f46', padding:'1px 6px', borderRadius:8, fontWeight:700 }}>✅{selCnt}</span>}
                        </div>
                        {isOpen && (
                          <div style={{ display:'flex', gap:4, padding:'5px 8px', background:'#f0fdf4', borderBottom:'1px solid #bbf7d0' }}>
                            <span style={{ fontSize:10, color:'#64748b', alignSelf:'center', flex:1 }}>Centang semua:</span>
                            {['0%','50%','100%'].map(p => (
                              <button key={p} onClick={() => selectAllGroup(groupKey, p)}
                                style={{ padding:'2px 8px', fontSize:10, fontWeight:700, borderRadius:5, border:'none', cursor:'pointer',
                                  background: p==='0%'?'#fed7aa': p==='50%'?'#fde68a':'#bbf7d0',
                                  color: p==='0%'?'#9a3412': p==='50%'?'#92400e':'#14532d' }}>
                                {p}
                              </button>
                            ))}
                            <button onClick={() => selectAllGroup(groupKey, 'skip')}
                              style={{ padding:'2px 8px', fontSize:10, fontWeight:600, borderRadius:5, border:'none', cursor:'pointer', background:'#f1f5f9', color:'#64748b' }}>
                              Lewati
                            </button>
                          </div>
                        )}
                        {isOpen && groupRows.map(({ log, urls, selectedCount }) => {
                          const isActive = selectedLog?.id === log.id;
                          const tgl = new Date(log.tanggal).toLocaleDateString('id-ID');
                          const op  = log.override_operator || log.operator?.full_name || log.operator_name || '-';
                          const loc = `${log.override_desa || log.assignment?.location_village || ''}, ${log.override_kecamatan || log.assignment?.location_district || ''}`;
                          return (
                            <div key={log.id} onClick={() => setSelectedLog(log)}
                              style={{ padding:'10px 14px 10px 20px', borderBottom:'1px solid #f0f4f8', cursor:'pointer', transition:'all 0.15s',
                                background: isActive ? '#eff6ff' : '#fff', borderLeft: isActive ? '4px solid #2563eb' : '4px solid transparent' }}>
                              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:3 }}>
                                <div style={{ fontWeight:600, fontSize:12, color: isActive ? '#1e40af' : '#1e293b' }}>📅 {tgl}</div>
                                <div style={{ display:'flex', gap:4 }}>
                                  <span style={{ fontSize:10, background:'#e2e8f0', padding:'1px 6px', borderRadius:8, color:'#475569' }}>{urls.length}📷</span>
                                  {selectedCount > 0 && <span style={{ fontSize:10, background:'#d1fae5', padding:'1px 6px', borderRadius:8, color:'#065f46' }}>✅{selectedCount}</span>}
                                </div>
                              </div>
                              <div style={{ fontSize:11, color:'#64748b' }}>{op}</div>
                              <div style={{ fontSize:11, color:'#94a3b8' }}>{loc}</div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
            {!selectedLog ? (
              <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#94a3b8' }}>
                <div style={{ fontSize:48, marginBottom:12 }}>👈</div>
                <div style={{ fontSize:15, fontWeight:600, color:'#64748b' }}>Pilih baris dari panel kiri</div>
                <div style={{ fontSize:13, marginTop:6 }}>untuk memantau dan menandai foto progress</div>
              </div>
            ) : (
              <>
                {/* Info bar + quick action */}
                <div style={{ padding:'12px 20px', borderBottom:'1px solid #e2e8f0', background:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
                  <div>
                    <div style={{ fontWeight:700, color:'#1e293b' }}>
                      📅 {new Date(selectedLog.tanggal).toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
                    </div>
                    <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>
                      {selectedLog.override_operator || selectedLog.operator?.full_name || selectedLog.operator_name || '-'} &nbsp;·&nbsp;
                      {selectedLog.override_desa || selectedLog.assignment?.location_village || ''}, &nbsp;
                      {selectedLog.override_kecamatan || selectedLog.assignment?.location_district || ''}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <span style={{ fontSize:12, color:'#94a3b8', marginRight:4, alignSelf:'center' }}>Tandai semua:</span>
                    {PROGRESS_OPTS.map(p => (
                      <button key={p} onClick={() => setAllProgress(selectedLog.id, selectedUrls, p)}
                        style={{ padding:'5px 12px', fontSize:11, fontWeight:700, borderRadius:8, border:'none', cursor:'pointer',
                          background: PROGRESS_BG[p], color: PROGRESS_COLOR[p] }}>
                        {p}
                      </button>
                    ))}
                    <button onClick={() => setAllProgress(selectedLog.id, selectedUrls, 'skip')}
                      style={{ padding:'5px 10px', fontSize:11, fontWeight:600, borderRadius:8, border:'none', cursor:'pointer', background:'#f1f5f9', color:'#64748b' }}>
                      Lewati Semua
                    </button>
                  </div>
                </div>

                {/* Photo grid */}
                <div style={{ flex:1, overflowY:'auto', padding:20, background:'#f8fafc' }}>
                  {selectedUrls.length === 0 ? (
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:10, color:'#94a3b8' }}>
                      <div style={{ fontSize:36 }}>🖼️</div>
                      <div style={{ fontSize:14, fontWeight:600, color:'#64748b' }}>Belum ada foto dari operator</div>
                      <label htmlFor={'up_dok_'+selectedLog.id} style={{ padding:'8px 18px', background:'#2563eb', color:'#fff', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600 }}>
                        📤 Upload Foto Sekarang
                      </label>
                      <input type="file" id={'up_dok_'+selectedLog.id} multiple accept="image/*" style={{ display:'none' }} onChange={(e) => handleUploadTambahan(e, selectedLog.id, 'lapangan')} />
                    </div>
                  ) : (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(190px, 1fr))', gap:16 }}>
                      {selectedUrls.map((url, uIdx) => {
                        const key = selectedLog.id + '_' + uIdx;
                        const val = dokSelection[key] || 'skip';
                        const isTagged = val !== 'skip';
                        return (
                          <div key={uIdx} style={{
                            borderRadius:12, overflow:'hidden',
                            border: `2px solid ${isTagged ? PROGRESS_COLOR[val] : '#e2e8f0'}`,
                            background:'#fff',
                            boxShadow: isTagged ? `0 4px 12px ${PROGRESS_COLOR[val]}33` : '0 2px 6px rgba(0,0,0,0.06)',
                            transition:'all 0.2s',
                          }}>
                            <div style={{ position:'relative', height:140, background:'#f1f5f9', overflow:'hidden' }}>
                              <img src={toImg(url)}
                                onError={e => { e.target.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23e2e8f0" width="100" height="100"/><text x="50" y="55" font-size="11" text-anchor="middle" fill="%2394a3b8">Foto ${uIdx+1}</text></svg>`; }}
                                style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                              {isTagged && (
                                <div style={{ position:'absolute', top:8, right:8, background:PROGRESS_COLOR[val], color:'#fff', fontWeight:700, fontSize:12, padding:'3px 10px', borderRadius:20 }}>
                                  {val}
                                </div>
                              )}
                              <a href={toView(url)} target="_blank" rel="noreferrer"
                                style={{ position:'absolute', bottom:6, right:6, background:'rgba(0,0,0,0.55)', color:'#fff', borderRadius:6, padding:'3px 7px', fontSize:11, textDecoration:'none' }}>
                                🔍 Buka
                              </a>
                            </div>
                            <div style={{ padding:'10px 10px 12px' }}>
                              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:4 }}>
                                {['skip', '0%', '50%', '100%'].map(opt => {
                                  const active = val === opt;
                                  return (
                                    <button key={opt} onClick={() => setProgress(selectedLog.id, uIdx, opt)}
                                      style={{ padding:'5px 0', fontSize:11, fontWeight:700, borderRadius:7, border:'none', cursor:'pointer', transition:'all 0.15s',
                                        background: active ? (opt==='skip' ? '#334155' : PROGRESS_COLOR[opt]) : (opt==='skip' ? '#f8fafc' : PROGRESS_BG[opt]),
                                        color: active ? '#fff' : (opt==='skip' ? '#64748b' : PROGRESS_COLOR[opt]) }}>
                                      {opt === 'skip' ? '✗' : opt}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <label htmlFor={'up_dok_'+selectedLog.id}
                        style={{ borderRadius:12, border:'2px dashed #93c5fd', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:220, cursor:'pointer', background:'#eff6ff' }}>
                        <input type="file" id={'up_dok_'+selectedLog.id} multiple accept="image/*" style={{ display:'none' }} onChange={(e) => handleUploadTambahan(e, selectedLog.id, 'lapangan')} />
                        <span style={{ fontSize:32 }}>📤</span>
                        <span style={{ fontSize:12, fontWeight:700, color:'#1d4ed8', marginTop:8 }}>Upload Foto Susulan</span>
                        <span style={{ fontSize:11, color:'#93c5fd', marginTop:4 }}>JPG / PNG</span>
                      </label>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ padding:'14px 24px', borderTop:'1px solid #e2e8f0', background:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ fontSize:13, color:'#475569' }}>
            {totalSelected === 0
              ? '💡 Tandai foto dengan progress (0%/50%/100%) → 1 baris = 1 halaman Legal'
              : <span><span style={{ fontWeight:700, color:'#2563eb' }}>{totalSelected} foto</span> dari {rows.filter(r=>r.selectedCount>0).length} baris siap dicetak</span>
            }
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onClose} style={{ padding:'9px 20px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', color:'#475569', cursor:'pointer', fontWeight:600, fontSize:13 }}>
              Tutup
            </button>
            <button onClick={execPrint} disabled={totalSelected === 0}
              style={{ padding:'9px 22px', borderRadius:8, border:'none',
                cursor: totalSelected===0 ? 'not-allowed' : 'pointer', fontWeight:700, fontSize:13,
                background: totalSelected===0 ? '#e2e8f0' : 'linear-gradient(135deg,#1e3a5f,#2563eb)',
                color: totalSelected===0 ? '#94a3b8' : '#fff',
                boxShadow: totalSelected===0 ? 'none' : '0 4px 12px rgba(37,99,235,0.4)',
                transition:'all 0.2s' }}>
              🖨️ Cetak PDF Legal ({rows.filter(r=>r.selectedCount>0).length} halaman)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
