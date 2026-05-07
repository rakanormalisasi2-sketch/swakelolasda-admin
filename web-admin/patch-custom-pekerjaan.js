const fs = require('fs');

// ─── DokumentasiModal ───
let dok = fs.readFileSync('src/app/dashboard/seksi/laporan/DokumentasiModal.js', 'utf8');

// 1. Tambah state customPekerjaan
if (!dok.includes('customPekerjaan')) {
  dok = dok.replace(
    '  const [dokSelection, setDokSelection] = useState({});',
    "  const [dokSelection, setDokSelection] = useState({});\n  const [customPekerjaan, setCustomPekerjaan] = useState('');"
  );
}

// 2. Di execPrint gunakan customPekerjaan
dok = dok.replace(
  'const pek  = SUB_MAP[log.assignment?.job_sub_type] || config.pekerjaanPrefix;',
  'const pek  = (customPekerjaan||"").trim().toUpperCase() || SUB_MAP[log.assignment?.job_sub_type] || config.pekerjaanPrefix;'
);

// 3. Tambah input di bawah subtitle header
const OLD_SUBTITLE = 'untuk melihat dan menandai foto progress</div>';
const NEW_SUBTITLE = OLD_SUBTITLE + `
              <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                <span style={{ fontSize:12, color:'rgba(255,255,255,0.85)', whiteSpace:'nowrap' }}>✏️ Custom Pekerjaan:</span>
                <input value={customPekerjaan} onChange={e=>setCustomPekerjaan(e.target.value)}
                  placeholder="Kosongkan = nama pekerjaan default per baris"
                  style={{flex:1, minWidth:200, padding:'5px 8px', borderRadius:6, border:'1px solid rgba(255,255,255,0.3)', background:'rgba(255,255,255,0.15)', color:'#fff', fontSize:12, outline:'none'}} />
              </div>`;
if (dok.includes(OLD_SUBTITLE) && !dok.includes('Custom Pekerjaan')) {
  dok = dok.replace(OLD_SUBTITLE, NEW_SUBTITLE);
}

fs.writeFileSync('src/app/dashboard/seksi/laporan/DokumentasiModal.js', dok);
console.log('DokumentasiModal OK');

// ─── HourmeterModal ───
let hm = fs.readFileSync('src/app/dashboard/seksi/laporan/HourmeterModal.js', 'utf8');

// 1. Tambah state
if (!hm.includes('customPekerjaan')) {
  hm = hm.replace(
    '  const [hmSelection, setHmSelection] = useState({}); // { [logId]: { before: url, after: url } }',
    "  const [hmSelection, setHmSelection] = useState({}); // { [logId]: { before: url, after: url } }\n  const [customPekerjaan, setCustomPekerjaan] = useState('');"
  );
}

// 2. Di execPrint gunakan customPekerjaan (ada di grouping)
hm = hm.replace(
  'const pek  = SUB_MAP[log.assignment?.job_sub_type] || config.pekerjaanPrefix;',
  'const pek  = (customPekerjaan||"").trim().toUpperCase() || SUB_MAP[log.assignment?.job_sub_type] || config.pekerjaanPrefix;'
);

// 3. Header input
const HM_OLD = 'Pilih foto Before & After untuk setiap hari kerja</div>';
const HM_NEW = HM_OLD + `
              <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                <span style={{ fontSize:12, color:'rgba(255,255,255,0.85)', whiteSpace:'nowrap' }}>✏️ Custom Pekerjaan:</span>
                <input value={customPekerjaan} onChange={e=>setCustomPekerjaan(e.target.value)}
                  placeholder="Kosongkan = nama pekerjaan default per baris"
                  style={{flex:1, minWidth:200, padding:'5px 8px', borderRadius:6, border:'1px solid rgba(255,255,255,0.3)', background:'rgba(255,255,255,0.15)', color:'#fff', fontSize:12, outline:'none'}} />
              </div>`;
if (hm.includes(HM_OLD) && !hm.includes('Custom Pekerjaan')) {
  hm = hm.replace(HM_OLD, HM_NEW);
}

fs.writeFileSync('src/app/dashboard/seksi/laporan/HourmeterModal.js', hm);
console.log('HourmeterModal OK');
