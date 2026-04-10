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
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w600` : url.trim();
}
function toView(url) {
  if (!url) return null;
  const id = extractDriveId(url.trim());
  return id ? `https://drive.google.com/file/d/${id}/view` : url.trim();
}

export default function HourmeterModal({ logs, onClose, pdfConfig, handleUploadTambahan }) {
  const [hmSelection, setHmSelection] = useState({}); // { [logId]: { before: url, after: url } }
  const [hmLastAfter, setHmLastAfter] = useState(null);
  const [activeLogId, setActiveLogId] = useState(null);

  // Build rows sorted by date
  const rows = useMemo(() =>
    logs.map(log => {
      const urls = log.foto_lapangan_urls
        ? log.foto_lapangan_urls.split(',').map(u => u.trim()).filter(Boolean)
        : [];
      const sel = hmSelection[log.id] || { before: '', after: '' };
      return { log, urls, sel };
    }).sort((a, b) => new Date(a.log.tanggal) - new Date(b.log.tanggal))
  , [logs, hmSelection]);

  const pairedCount = Object.values(hmSelection).filter(s => s?.before && s?.after).length;

  const setPhoto = (logId, type, url) => {
    setHmSelection(p => {
      const prev = p[logId] || { before: '', after: '' };
      const updated = { ...prev, [type]: url };
      if (type === 'after' && url) setHmLastAfter(url);
      return { ...p, [logId]: updated };
    });
  };

  const execPrint = () => {
    const config = pdfConfig || { pekerjaanPrefix: 'NORMALISASI SUNGAI' };
    const SUB_MAP = {
      normalisasi_sungai:'NORMALISASI SUNGAI', normalisasi_saluran_irigasi:'NORMALISASI SALURAN / IRIGASI',
      rehabilitasi_embung:'REHABILITASI EMBUNG', pembangunan_embung:'PEMBANGUNAN EMBUNG',
      saluran_afvoer:'SALURAN AIR / AFVOER', normalisasi_embung:'NORMALISASI EMBUNG',
    };
    const printWin = window.open('', '_blank');
    let html = `<html><head><title>Foto Hourmeter</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:Arial,sans-serif; font-size:11px; color:#000; }
        @page { size: 8.5in 14in portrait; margin: 12mm 15mm; }
        .page { padding:0; }
        .page-break { page-break-after: always; }
        .doc-title { font-size:16px; font-weight:bold; text-align:center; letter-spacing:2px; border-bottom:2px solid #000; padding-bottom:8px; margin-bottom:16px; }
        .info-table { width:100%; border-collapse:collapse; margin-bottom:20px; }
        .info-table td { padding:3px 5px; font-size:12px; vertical-align:top; }
        .info-table td:first-child { width:100px; font-weight:bold; }
        .info-table td:nth-child(2) { width:10px; }
        .master-table { width:100%; border-collapse:collapse; border:1.5px solid #000; }
        .date-row td { padding:8px 12px; font-weight:bold; font-size:13px; border:1px solid #000; background:#f0f0f0; }
        .label-row td { padding:6px 12px; font-weight:bold; font-size:11px; border:1px solid #000; background:#e8f4fd; text-align:center; width:50%; }
        .photo-row td { border:1px solid #000; padding:10px; text-align:center; vertical-align:middle; height:200px; width:50%; }
        .photo-row td img { max-width:100%; max-height:180px; object-fit:contain; display:block; margin:auto; }
        .no-photo { color:#999; font-style:italic; font-size:11px; }
        @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
      </style></head><body>`;

    // Group by pekerjaan+lokasi
    const groups = {};
    rows.forEach(({ log, sel }) => {
      if (!sel.before || !sel.after) return;
      const desa = (log.override_desa || log.assignment?.location_village || '').toUpperCase();
      const kec  = (log.override_kecamatan || log.assignment?.location_district || '').toUpperCase();
      const pek  = SUB_MAP[log.assignment?.job_sub_type] || config.pekerjaanPrefix;
      const key  = `${pek}|${desa}|${kec}`;
      if (!groups[key]) groups[key] = { pek, desa, kec, items: [] };
      groups[key].items.push({ log, sel });
    });

    let isFirst = true;
    Object.values(groups).forEach(({ pek, desa, kec, items }) => {
      if (!isFirst) html += `<div class="page-break"></div>`;
      isFirst = false;
      html += `<div class="page">
        <div class="doc-title">FOTO HOURMETER</div>
        <table class="info-table">
          <tr><td>PEKERJAAN</td><td>:</td><td>${pek} DESA ${desa} KECAMATAN ${kec}</td></tr>
        </table>
        <table class="master-table">`;

      items.sort((a,b)=>new Date(a.log.tanggal)-new Date(b.log.tanggal)).forEach(({ log, sel }, idx) => {
        const tgl = new Date(log.tanggal).toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' }).toUpperCase();
        html += `
          <tr class="date-row"><td colspan="2">${idx+1}.&nbsp;&nbsp;&nbsp;${tgl}</td></tr>
          <tr class="label-row"><td>📷 HM AWAL (BEFORE)</td><td>📷 HM AKHIR (AFTER)</td></tr>
          <tr class="photo-row">
            <td>${sel.before ? `<img src="${toImg(sel.before)}" />` : `<span class="no-photo">Belum ada foto</span>`}</td>
            <td>${sel.after  ? `<img src="${toImg(sel.after)}"  />` : `<span class="no-photo">Belum ada foto</span>`}</td>
          </tr>`;
      });
      html += `</table></div>`;
    });
    html += `</body></html>`;
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 1500);
    onClose();
  };

  const activeRow = rows.find(r => r.log.id === activeLogId);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.75)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>
      <div style={{ width:'96vw', height:'94vh', background:'#fff', borderRadius:16, display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 25px 50px rgba(0,0,0,0.4)' }}>

        {/* HEADER */}
        <div style={{ background:'linear-gradient(135deg,#064e3b,#059669)', color:'#fff', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:24 }}>⏱️</span>
            <div>
              <div style={{ fontWeight:700, fontSize:16 }}>Konfigurasi Cetak Hourmeter</div>
              <div style={{ fontSize:12, opacity:0.8 }}>Pilih foto Before & After untuk setiap hari kerja</div>
            </div>
          </div>
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            {pairedCount > 0 && (
              <div style={{ background:'rgba(255,255,255,0.2)', borderRadius:20, padding:'6px 14px', fontSize:13, fontWeight:600 }}>
                ✅ {pairedCount} hari lengkap
              </div>
            )}
            <button onClick={onClose} style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)', color:'#fff', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:18 }}>✕</button>
          </div>
        </div>

        {/* BODY */}
        <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

          {/* LEFT PANEL: Timeline */}
          <div style={{ width:280, borderRight:'1px solid #e2e8f0', background:'#f8fafc', display:'flex', flexDirection:'column', flexShrink:0 }}>
            <div style={{ padding:'10px 14px', borderBottom:'1px solid #e2e8f0', background:'#fff', fontSize:12, fontWeight:600, color:'#64748b' }}>
              TIMELINE HARI KERJA ({rows.length} hari)
            </div>
            <div style={{ flex:1, overflowY:'auto' }}>
              {rows.map(({ log, urls, sel }, idx) => {
                const isActive = activeLogId === log.id;
                const hasBefore = !!sel.before;
                const hasAfter  = !!sel.after;
                const isPaired  = hasBefore && hasAfter;
                const tgl = new Date(log.tanggal).toLocaleDateString('id-ID', { day:'numeric', month:'short'});
                const hari = new Date(log.tanggal).toLocaleDateString('id-ID', { weekday:'long'});
                return (
                  <div key={log.id} onClick={() => setActiveLogId(log.id)}
                    style={{ padding:'12px 14px', borderBottom:'1px solid #f0f4f8', cursor:'pointer', transition:'background 0.15s',
                      background: isActive ? '#ecfdf5' : '#fff', borderLeft: isActive ? '3px solid #059669' : '3px solid transparent' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                      <div style={{ fontWeight:700, fontSize:13, color: isActive ? '#047857' : '#1e293b' }}>
                        {idx+1}. {tgl}
                      </div>
                      <div style={{ fontSize:10, borderRadius:10, padding:'2px 7px', fontWeight:700,
                        background: isPaired ? '#d1fae5' : hasBefore ? '#fef9c3' : '#f1f5f9',
                        color: isPaired ? '#065f46' : hasBefore ? '#92400e' : '#94a3b8' }}>
                        {isPaired ? '✅ Lengkap' : hasBefore ? '⚠️ Kurang After' : '—'}
                      </div>
                    </div>
                    <div style={{ fontSize:11, color:'#64748b' }}>{hari}</div>
                    <div style={{ display:'flex', gap:6, marginTop:6 }}>
                      <div style={{ flex:1, fontSize:10, padding:'3px 6px', borderRadius:6, textAlign:'center', border:'1px solid',
                        borderColor: hasBefore ? '#f97316' : '#e2e8f0',
                        background: hasBefore ? '#fff7ed' : '#f8fafc',
                        color: hasBefore ? '#c2410c' : '#94a3b8' }}>
                        {hasBefore ? '📷 Before ✓' : 'Before —'}
                      </div>
                      <div style={{ flex:1, fontSize:10, padding:'3px 6px', borderRadius:6, textAlign:'center', border:'1px solid',
                        borderColor: hasAfter ? '#16a34a' : '#e2e8f0',
                        background: hasAfter ? '#f0fdf4' : '#f8fafc',
                        color: hasAfter ? '#15803d' : '#94a3b8' }}>
                        {hasAfter ? '📷 After ✓' : 'After —'}
                      </div>
                    </div>
                    {urls.length > 0 && <div style={{ fontSize:10, color:'#94a3b8', marginTop:4 }}>{urls.length} foto tersedia</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT PANEL: Photo picker */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
            {!activeRow ? (
              <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#94a3b8' }}>
                <div style={{ fontSize:48, marginBottom:12 }}>👈</div>
                <div style={{ fontSize:15, fontWeight:600, color:'#64748b' }}>Pilih hari dari timeline</div>
                <div style={{ fontSize:13, marginTop:6 }}>untuk memilih foto Before & After</div>
              </div>
            ) : (
              <>
                {/* Before/After preview bar */}
                <div style={{ padding:'14px 20px', background:'#fff', borderBottom:'1px solid #e2e8f0', display:'flex', gap:16, flexShrink:0 }}>
                  {/* Before preview */}
                  <div style={{ flex:1, border:'2px solid', borderColor: activeRow.sel.before ? '#f97316' : '#e2e8f0', borderRadius:10, overflow:'hidden', background:'#fff7ed' }}>
                    <div style={{ padding:'8px 12px', fontWeight:700, fontSize:12, color:'#c2410c', borderBottom:'1px solid #fed7aa', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <span>📷 BEFORE — HM AWAL</span>
                      {activeRow.sel.before && <button onClick={() => setPhoto(activeRow.log.id,'before','')} style={{background:'none',border:'none',cursor:'pointer',color:'#94a3b8',fontSize:14}}>✕</button>}
                    </div>
                    <div style={{ height:130, display:'flex', alignItems:'center', justifyContent:'center', padding:8 }}>
                      {activeRow.sel.before
                        ? <img src={toImg(activeRow.sel.before)} style={{ maxWidth:'100%', maxHeight:115, objectFit:'contain', borderRadius:6 }} />
                        : <span style={{ color:'#d1d5db', fontSize:13 }}>Belum dipilih — klik tombol ⬅ Before pada foto</span>
                      }
                    </div>
                  </div>
                  {/* Arrow */}
                  <div style={{ display:'flex', alignItems:'center', fontSize:24, color:'#059669' }}>→</div>
                  {/* After preview */}
                  <div style={{ flex:1, border:'2px solid', borderColor: activeRow.sel.after ? '#16a34a' : '#e2e8f0', borderRadius:10, overflow:'hidden', background:'#f0fdf4' }}>
                    <div style={{ padding:'8px 12px', fontWeight:700, fontSize:12, color:'#15803d', borderBottom:'1px solid #bbf7d0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <span>📷 AFTER — HM AKHIR</span>
                      {activeRow.sel.after && <button onClick={() => setPhoto(activeRow.log.id,'after','')} style={{background:'none',border:'none',cursor:'pointer',color:'#94a3b8',fontSize:14}}>✕</button>}
                    </div>
                    <div style={{ height:130, display:'flex', alignItems:'center', justifyContent:'center', padding:8 }}>
                      {activeRow.sel.after
                        ? <img src={toImg(activeRow.sel.after)} style={{ maxWidth:'100%', maxHeight:115, objectFit:'contain', borderRadius:6 }} />
                        : <span style={{ color:'#d1d5db', fontSize:13 }}>Belum dipilih — klik tombol After ➡ pada foto</span>
                      }
                    </div>
                  </div>
                </div>

                {/* Photo grid */}
                <div style={{ flex:1, overflowY:'auto', padding:20, background:'#f8fafc' }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#475569', marginBottom:14 }}>
                    📅 {new Date(activeRow.log.tanggal).toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
                    &nbsp;&mdash;&nbsp; Pilih foto untuk Before / After:
                  </div>

                  {activeRow.urls.length === 0 ? (
                    <div style={{ textAlign:'center', padding:30, color:'#94a3b8' }}>
                      <div style={{ fontSize:36 }}>🖼️</div>
                      <div style={{ fontSize:14, fontWeight:600, marginTop:8, color:'#64748b' }}>Belum ada foto dari operator</div>
                      <label htmlFor={'up_hm_'+activeRow.log.id} style={{ display:'inline-block', marginTop:12, padding:'8px 18px', background:'#059669', color:'#fff', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600 }}>
                        📤 Upload Foto
                      </label>
                      <input type="file" id={'up_hm_'+activeRow.log.id} multiple accept="image/*" style={{ display:'none' }} onChange={e => handleUploadTambahan(e, activeRow.log.id, 'lapangan')} />
                    </div>
                  ) : (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:14 }}>
                      {activeRow.urls.map((url, uIdx) => {
                        const isBefore = activeRow.sel.before === url;
                        const isAfter  = activeRow.sel.after  === url;
                        return (
                          <div key={uIdx} style={{
                            borderRadius:12, overflow:'hidden', border: `2px solid ${isBefore?'#f97316':isAfter?'#16a34a':'#e2e8f0'}`,
                            background:'#fff', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', transition:'all 0.2s'
                          }}>
                            <div style={{ position:'relative', height:130, background:'#f1f5f9' }}>
                              <img src={toImg(url)}
                                onError={e => { e.target.src='data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="80"><rect fill="%23e2e8f0" width="100" height="80"/><text x="50" y="45" font-size="10" text-anchor="middle" fill="%2394a3b8">Foto '+(uIdx+1)+'</text></svg>'; }}
                                style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                              {isBefore && <div style={{ position:'absolute', top:6, left:6, background:'#f97316', color:'#fff', borderRadius:10, padding:'2px 8px', fontSize:11, fontWeight:700 }}>BEFORE</div>}
                              {isAfter  && <div style={{ position:'absolute', top:6, left:6, background:'#16a34a', color:'#fff', borderRadius:10, padding:'2px 8px', fontSize:11, fontWeight:700 }}>AFTER</div>}
                              <a href={toView(url)} target="_blank" rel="noreferrer"
                                style={{ position:'absolute', bottom:5, right:5, background:'rgba(0,0,0,0.5)', color:'#fff', borderRadius:5, padding:'2px 6px', fontSize:10, textDecoration:'none' }}>🔍</a>
                            </div>
                            <div style={{ padding:'8px 10px 10px', display:'flex', gap:6 }}>
                              <button onClick={() => setPhoto(activeRow.log.id, 'before', isBefore ? '' : url)}
                                style={{ flex:1, padding:'6px 0', fontSize:11, fontWeight:700, borderRadius:8, border:'none', cursor:'pointer', transition:'all 0.15s',
                                  background: isBefore ? '#f97316' : '#fff7ed', color: isBefore ? '#fff' : '#c2410c', boxShadow: isBefore ? '0 2px 6px #f9731655' : 'none' }}>
                                {isBefore ? '✓ Before' : '⬅ Before'}
                              </button>
                              <button onClick={() => setPhoto(activeRow.log.id, 'after', isAfter ? '' : url)}
                                style={{ flex:1, padding:'6px 0', fontSize:11, fontWeight:700, borderRadius:8, border:'none', cursor:'pointer', transition:'all 0.15s',
                                  background: isAfter ? '#16a34a' : '#f0fdf4', color: isAfter ? '#fff' : '#15803d', boxShadow: isAfter ? '0 2px 6px #16a34a55' : 'none' }}>
                                {isAfter ? '✓ After' : 'After ➡'}
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Upload card */}
                      <label htmlFor={'up_hm_'+activeRow.log.id}
                        style={{ borderRadius:12, border:'2px dashed #6ee7b7', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:180, cursor:'pointer', background:'#ecfdf5' }}>
                        <input type="file" id={'up_hm_'+activeRow.log.id} multiple accept="image/*" style={{ display:'none' }} onChange={e => handleUploadTambahan(e, activeRow.log.id, 'lapangan')} />
                        <span style={{ fontSize:30 }}>📤</span>
                        <span style={{ fontSize:12, fontWeight:700, color:'#059669', marginTop:8 }}>Upload Manual</span>
                        <span style={{ fontSize:11, color:'#6ee7b7', marginTop:4 }}>JPG / PNG</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Navigate arrows */}
                <div style={{ padding:'10px 20px', background:'#fff', borderTop:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', flexShrink:0 }}>
                  {(() => {
                    const idx = rows.findIndex(r => r.log.id === activeLogId);
                    const prev = rows[idx - 1];
                    const next = rows[idx + 1];
                    return (
                      <>
                        <button onClick={() => prev && setActiveLogId(prev.log.id)} disabled={!prev}
                          style={{ padding:'7px 16px', border:'1px solid #e2e8f0', borderRadius:8, background:'#fff', cursor: prev?'pointer':'not-allowed', color: prev?'#1e293b':'#cbd5e1', fontSize:13, fontWeight:600 }}>
                          ◀ {prev ? new Date(prev.log.tanggal).toLocaleDateString('id-ID',{day:'numeric',month:'short'}) : 'Awal'}
                        </button>
                        <span style={{ alignSelf:'center', fontSize:12, color:'#64748b' }}>
                          Hari ke-{rows.findIndex(r=>r.log.id===activeLogId)+1} dari {rows.length}
                        </span>
                        <button onClick={() => next && setActiveLogId(next.log.id)} disabled={!next}
                          style={{ padding:'7px 16px', border:'1px solid #e2e8f0', borderRadius:8, background:'#fff', cursor: next?'pointer':'not-allowed', color: next?'#1e293b':'#cbd5e1', fontSize:13, fontWeight:600 }}>
                          {next ? new Date(next.log.tanggal).toLocaleDateString('id-ID',{day:'numeric',month:'short'}) : 'Akhir'} ▶
                        </button>
                      </>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ padding:'14px 24px', borderTop:'1px solid #e2e8f0', background:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ fontSize:13, color:'#475569' }}>
            {pairedCount === 0
              ? '💡 Pilih hari dari timeline lalu tentukan foto Before & After'
              : <span><span style={{ fontWeight:700, color:'#059669' }}>{pairedCount} hari</span> dengan pasangan Before/After siap dicetak</span>
            }
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onClose} style={{ padding:'9px 20px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', color:'#475569', cursor:'pointer', fontWeight:600, fontSize:13 }}>
              Tutup
            </button>
            <button onClick={execPrint} disabled={pairedCount === 0}
              style={{ padding:'9px 22px', borderRadius:8, border:'none', cursor: pairedCount===0?'not-allowed':'pointer', fontWeight:700, fontSize:13,
                background: pairedCount===0 ? '#e2e8f0' : 'linear-gradient(135deg,#064e3b,#059669)', color: pairedCount===0 ? '#94a3b8' : '#fff',
                boxShadow: pairedCount===0 ? 'none' : '0 4px 12px rgba(5,150,105,0.4)', transition:'all 0.2s' }}>
              🖨️ Cetak PDF Hourmeter ({pairedCount} hari)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
