const fs = require('fs');
let content = fs.readFileSync('../mobile-app/app/operator/laporan.tsx', 'utf8');

// ── 1. Tambah state untuk kategori keterangan ──
content = content.replace(
  `  const [form, setForm] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    helper: '',
    kecamatan: '',
    desa: '',
    jenisAlat: '',
    progress: '',
    keterangan: '',
    hmAwal: '',
    hmAkhir: '',
    panjangPekerjaan: '',
  });`,
  `  const [keteranganKategori, setKeteranganKategori] = useState<'Kerusakan'|'Cuaca'|'Lainnya'|''>('');
  const [kateOpen, setKateOpen] = useState(false);
  const KATEGORI_OPTIONS = ['Kerusakan', 'Cuaca', 'Lainnya'];

  const [form, setForm] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    helper: '',
    kecamatan: '',
    desa: '',
    jenisAlat: '',
    progress: '',
    keteranganDetail: '',
    hmAwal: '',
    hmAkhir: '',
    panjangPekerjaan: '',
  });`
);

// ── 2. Di handleSubmit: Siapkan keterangan_tambahan dengan label kategori ──
// Website (Receiver) akan mengenali [Kerusakan] dari string ini melalui Trigger
content = content.replace(
  `        keterangan_tambahan: form.keterangan || null,`,
  `        keterangan_tambahan: keteranganKategori ? \`[\${keteranganKategori}] \${form.keteranganDetail}\`.trim() : (form.keteranganDetail || null),`
);

// ── 3. Hapus logika redundant (DIPINDAHKAN KE WEBSITE/DATABASE TRIGGER) ──
// Sebelumnya di sini ada blok insert maintenance_logs, sekarang dihapus agar APK tetap ringan
// Database akan mengolah laporan secara otomatis saat data diterima.

// ── 4. Ganti field keterangan UI ──
const NEW_KETERANGAN_UI = `        {/* KETERANGAN — Kategori + Detail */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Keterangan Tambahan</Text>
          {/* Dropdown Kategori */}
          <TouchableOpacity style={styles.selectBtn} onPress={() => setKateOpen(v => !v)}>
            <Text style={keteranganKategori ? styles.selectVal : styles.selectPlaceholder}>
              {keteranganKategori || '— Pilih Kategori (Opsional) —'}
            </Text>
            <Text style={styles.chevron}>{kateOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {kateOpen && (
            <View style={styles.dropdownBox}>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => { setKeteranganKategori(''); setKateOpen(false); }}>
                <Text style={[styles.dropdownText, { color: '#a0aec0', fontStyle: 'italic' }]}>— Tidak Ada Kategori —</Text>
              </TouchableOpacity>
              {KATEGORI_OPTIONS.map(opt => (
                <TouchableOpacity key={opt} style={styles.dropdownItem} onPress={() => { setKeteranganKategori(opt as any); setKateOpen(false); }}>
                  <Text style={[styles.dropdownText, keteranganKategori === opt && styles.dropdownActive,
                    opt === 'Kerusakan' && { color: '#e53e3e', fontWeight: '700' }]}>
                    {opt === 'Kerusakan' ? '🔴 Kerusakan Alat' : opt === 'Cuaca' ? '🌧️ Cuaca' : '📝 Lainnya'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {/* Warning jika Kerusakan */}
          {keteranganKategori === 'Kerusakan' && (
            <View style={{ marginTop: 8, padding: 10, backgroundColor: '#fff5f5', borderLeftWidth: 4, borderLeftColor: '#e53e3e', borderRadius: 6 }}>
              <Text style={{ color: '#c53030', fontSize: 12, fontWeight: '700' }}>⚠️ Laporan kerusakan akan dikirim ke Tim Peralatan</Text>
              <Text style={{ color: '#c53030', fontSize: 11, marginTop: 2 }}>Sistem akan memproses status pemeliharaan secara otomatis.</Text>
            </View>
          )}
          {/* Text input detail */}
          {keteranganKategori !== '' && (
            <TextInput
              style={[styles.input, styles.textarea, { marginTop: 8 }]}
              value={form.keteranganDetail}
              onChangeText={v => set('keteranganDetail', v)}
              placeholder={keteranganKategori === 'Kerusakan' ? 'Jelaskan gejala kerusakan...' :
                keteranganKategori === 'Cuaca' ? 'Contoh: Hujan dari jam 8-16...' : 'Keterangan tambahan...'}
              multiline
              numberOfLines={3}
            />
          )}
        </View>`;

const idx = content.indexOf('{/* KETERANGAN */}');
if (idx !== -1) {
  const endIdx = content.indexOf('</View>', idx) + 7;
  content = content.slice(0, idx) + NEW_KETERANGAN_UI + content.slice(endIdx);
  console.log('Keterangan UI replaced OK');
}

fs.writeFileSync('../mobile-app/app/operator/laporan.tsx', content);
console.log('Mobile laporan.tsx patched OK (Logic moved to Website Receiver)');
