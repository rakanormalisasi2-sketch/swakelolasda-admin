const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/seksi/laporan/DokumentasiModal.js', 'utf8');

// ── 1. Tambah state grouping ──
const OLD_STATE = `  const [selectedLog, setSelectedLog]   = useState(null);
  const [dokSelection, setDokSelection] = useState({});
  const [customPekerjaan, setCustomPekerjaan] = useState('');
  const [filter, setFilter]             = useState('all');
  const [search, setSearch]             = useState('');`;

const NEW_STATE = `  const [selectedLog, setSelectedLog]   = useState(null);
  const [dokSelection, setDokSelection] = useState({});
  const [customPekerjaan, setCustomPekerjaan] = useState('');
  const [filter, setFilter]             = useState('all');
  const [search, setSearch]             = useState('');
  const [groupExpanded, setGroupExpanded] = useState({}); // { [subType]: true/false }
  const [viewMode, setViewMode]         = useState('flat'); // 'flat' | 'grouped'`;

content = content.replace(OLD_STATE, NEW_STATE);

// ── 2. Tambah SUB_MAP helper di atas filteredRows untuk grouping ──
const OLD_ROWS = `  const filteredRows = useMemo(() => rows.filter(({ log, urls, selectedCount }) => {`;

const NEW_ROWS = `  const SUB_MAP_DOK = {
    normalisasi_sungai: 'NORMALISASI SUNGAI',
    normalisasi_saluran_irigasi: 'NORMALISASI SALURAN / IRIGASI',
    rehabilitasi_embung: 'REHABILITASI EMBUNG',
    pembangunan_embung: 'PEMBANGUNAN EMBUNG',
    saluran_afvoer: 'SALURAN AIR / AFVOER',
    normalisasi_embung: 'NORMALISASI EMBUNG',
  };
  const getJobLabel = (log) => SUB_MAP_DOK[log.assignment?.job_sub_type] || log.assignment?.job_sub_type || 'Pekerjaan Lainnya';

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

  const filteredRows = useMemo(() => rows.filter(({ log, urls, selectedCount }) => {`;

content = content.replace(OLD_ROWS, NEW_ROWS);

// ── 3. Tambah toggle viewMode dan grouping UI di panel header (setelah filter buttons) ──
const OLD_FILTER_BUTTONS = `              <div style={{ display:'flex', gap:4 }}>
                {[['all','Semua'],['selected','✅ Ditandai'],['unselected','Belum']].map(([v,l]) => (
                  <button key={v} onClick={() => setFilter(v)}
                    style={{ flex:1, padding:'5px 0', fontSize:11, fontWeight:600, borderRadius:6, border:'none', cursor:'pointer',
                      background: filter===v ? '#2563eb' : '#f1f5f9', color: filter===v ? '#fff' : '#64748b' }}>
                    {l}
                  </button>
                ))}
              </div>`;

const NEW_FILTER_BUTTONS = `              <div style={{ display:'flex', gap:4 }}>
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
              </div>`;

content = content.replace(OLD_FILTER_BUTTONS, NEW_FILTER_BUTTONS);

// ── 4. Ganti render list di panel kiri: tambah grouped view ──
// Cari dari render area list
const OLD_LIST_RENDER = `            <div style={{ flex:1, overflowY:'auto' }}>
              {filteredRows.length === 0 && (
                <div style={{ padding:24, textAlign:'center', color:'#94a3b8', fontSize:13 }}>Tidak ada data</div>
              )}
              {filteredRows.map(({ log, urls, selectedCount }) => {
                const isActive = selectedLog?.id === log.id;
                const tgl = new Date(log.tanggal).toLocaleDateString('id-ID');
                const op  = log.override_operator || log.operator?.full_name || log.operator_name || '-';
                const loc = \`\${log.override_desa || log.assignment?.location_village || ''}, \${log.override_kecamatan || log.assignment?.location_district || ''}\`;
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
            </div>`;

const NEW_LIST_RENDER = `            <div style={{ flex:1, overflowY:'auto' }}>
              {/* FLAT MODE */}
              {viewMode === 'flat' && (
                <>
                  {filteredRows.length === 0 && (
                    <div style={{ padding:24, textAlign:'center', color:'#94a3b8', fontSize:13 }}>Tidak ada data</div>
                  )}
                  {filteredRows.map(({ log, urls, selectedCount }) => {
                    const isActive = selectedLog?.id === log.id;
                    const tgl = new Date(log.tanggal).toLocaleDateString('id-ID');
                    const op  = log.override_operator || log.operator?.full_name || log.operator_name || '-';
                    const loc = \`\${log.override_desa || log.assignment?.location_village || ''}, \${log.override_kecamatan || log.assignment?.location_district || ''}\`;
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

              {/* GROUPED MODE */}
              {viewMode === 'grouped' && (
                <>
                  {Object.keys(groupedRows).length === 0 && (
                    <div style={{ padding:24, textAlign:'center', color:'#94a3b8', fontSize:13 }}>Tidak ada data</div>
                  )}
                  {Object.entries(groupedRows).map(([groupKey, groupRows]) => {
                    const isOpen = groupExpanded[groupKey] !== false; // default open
                    const totalFoto = groupRows.reduce((s, { urls }) => s + urls.length, 0);
                    const selectedCnt = groupRows.reduce((s, { selectedCount }) => s + selectedCount, 0);
                    const allSel = isGroupAllSelected(groupKey);
                    return (
                      <div key={groupKey}>
                        {/* Group Header */}
                        <div style={{ padding:'10px 14px', background:'#1e3a5f', color:'#fff', display:'flex', alignItems:'center', gap:8, cursor:'pointer', userSelect:'none' }}
                          onClick={() => setGroupExpanded(prev => ({ ...prev, [groupKey]: !isOpen }))}>
                          <span style={{ fontSize:12 }}>{isOpen ? '▼' : '▶'}</span>
                          <span style={{ fontWeight:700, fontSize:12, flex:1 }}>🗂️ {groupKey}</span>
                          <span style={{ fontSize:11, opacity:0.8 }}>{groupRows.length} baris · {totalFoto}📷</span>
                          {selectedCnt > 0 && <span style={{ fontSize:11, background:'#d1fae5', color:'#065f46', padding:'1px 7px', borderRadius:8, fontWeight:700 }}>✅{selectedCnt}</span>}
                        </div>
                        {/* Centang Massal */}
                        {isOpen && (
                          <div style={{ display:'flex', gap:4, padding:'6px 10px', background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
                            <span style={{ fontSize:11, color:'#64748b', alignSelf:'center', flex:1 }}>Tandai semua baris ini:</span>
                            {['0%','50%','100%'].map(p => (
                              <button key={p} onClick={() => selectAllGroup(groupKey, p)}
                                style={{ padding:'3px 9px', fontSize:11, fontWeight:700, borderRadius:6, border:'none', cursor:'pointer',
                                  background: p==='0%'?'#fed7aa': p==='50%'?'#fde68a':'#bbf7d0',
                                  color: p==='0%'?'#9a3412': p==='50%'?'#92400e':'#14532d' }}>
                                {p}
                              </button>
                            ))}
                            <button onClick={() => selectAllGroup(groupKey, 'skip')}
                              style={{ padding:'3px 9px', fontSize:11, fontWeight:600, borderRadius:6, border:'none', cursor:'pointer', background:'#f1f5f9', color:'#64748b' }}>
                              Lewati
                            </button>
                          </div>
                        )}
                        {/* Rows in Group */}
                        {isOpen && groupRows.map(({ log, urls, selectedCount }) => {
                          const isActive = selectedLog?.id === log.id;
                          const tgl = new Date(log.tanggal).toLocaleDateString('id-ID');
                          const op  = log.override_operator || log.operator?.full_name || log.operator_name || '-';
                          const loc = \`\${log.override_desa || log.assignment?.location_village || ''}, \${log.override_kecamatan || log.assignment?.location_district || ''}\`;
                          return (
                            <div key={log.id} onClick={() => setSelectedLog(log)}
                              style={{ padding:'10px 14px 10px 22px', borderBottom:'1px solid #f0f4f8', cursor:'pointer', transition:'all 0.15s',
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
            </div>`;

if (content.includes(OLD_LIST_RENDER)) {
  content = content.replace(OLD_LIST_RENDER, NEW_LIST_RENDER);
  console.log('List render replaced OK');
} else {
  console.log('WARNING: List render pattern not found exactly');
}

fs.writeFileSync('src/app/dashboard/seksi/laporan/DokumentasiModal.js', content);
console.log('DokumentasiModal grouping OK');
