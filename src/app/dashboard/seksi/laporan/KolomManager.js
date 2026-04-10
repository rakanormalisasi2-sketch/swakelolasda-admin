'use client';
import { useState } from 'react';

const TIPE_OPTIONS = [
  { value: 'text',     label: '📝 Teks' },
  { value: 'number',   label: '🔢 Angka' },
  { value: 'dropdown', label: '📋 Pilihan (Dropdown)' },
  { value: 'formula',  label: '🧮 Formula (Auto-hitung)' },
  { value: 'checkbox', label: '☑️ Centang (Ya/Tidak)' },
];

// ─── FormulaEditor ────────────────────────────────────────────────────
function FormulaEditor({ value, onChange, allColumns }) {
  const OPERATORS = ['+', '-', '×', '÷'];
  const insertToken = (token) => onChange((value || '') + token);

  return (
    <div>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
        Gunakan <code style={{ background: '#f3f4f6', padding: '1px 4px', borderRadius: 3 }}>{'{nama_kolom}'}</code> untuk merujuk nilai kolom lain.
        Contoh: <code style={{ background: '#f3f4f6', padding: '1px 4px', borderRadius: 3 }}>{'{hm_akhir} - {hm_awal}'}</code>
      </div>
      <input
        type="text"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder="Contoh: {volume_a} + {volume_b}"
        style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, marginBottom: 8, fontSize: 13, fontFamily: 'monospace' }}
      />
      {/* Tombol Operator */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {OPERATORS.map(op => (
          <button key={op} type="button"
            onClick={() => insertToken(` ${op === '×' ? '*' : op === '÷' ? '/' : op} `)}
            style={{ padding: '4px 12px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 14, fontWeight: 'bold' }}>
            {op}
          </button>
        ))}
        <button type="button"
          onClick={() => insertToken('SUM(')}
          style={{ padding: '4px 12px', background: '#065f46', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 13, fontWeight: 'bold' }}>
          SUM(
        </button>
        <button type="button"
          onClick={() => insertToken(')')}
          style={{ padding: '4px 12px', background: '#374151', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 13 }}>
          )
        </button>
      </div>
      {/* Picker Field */}
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Sisipkan kolom:</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {/* Kolom sistem */}
        {['hm_awal', 'hm_akhir', 'jam_kerja', 'panjang_pekerjaan'].map(k => (
          <button key={k} type="button"
            onClick={() => insertToken(`{${k}}`)}
            style={{ padding: '3px 8px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 4, cursor: 'pointer', fontSize: 11, color: '#1d4ed8' }}>
            {k}
          </button>
        ))}
        {/* Kolom custom yang ada */}
        {(allColumns || []).filter(c => c.column_type !== 'formula').map(c => (
          <button key={c.column_key} type="button"
            onClick={() => insertToken(`{${c.column_key}}`)}
            style={{ padding: '3px 8px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 4, cursor: 'pointer', fontSize: 11, color: '#166534' }}>
            {c.column_key}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── KolomManager ─────────────────────────────────────────────────────
export default function KolomManager({ columns, onSave, onClose, saving }) {
  const [cols, setCols] = useState(
    [...(columns || [])].sort((a, b) => a.position - b.position)
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({
    column_key: '', column_label: '', column_type: 'text',
    dropdown_options: '', formula: '', is_required: false,
  });
  const [formErr, setFormErr] = useState('');

  const moveUp = (idx) => {
    if (idx === 0) return;
    const n = [...cols];
    [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]];
    setCols(n.map((c, i) => ({ ...c, position: i })));
  };

  const moveDown = (idx) => {
    if (idx === cols.length - 1) return;
    const n = [...cols];
    [n[idx], n[idx + 1]] = [n[idx + 1], n[idx]];
    setCols(n.map((c, i) => ({ ...c, position: i })));
  };

  const deleteCol = (idx) => {
    if (!confirm(`Hapus kolom "${cols[idx].column_label}"? Data yang sudah tersimpan tidak terhapus.`)) return;
    const n = cols.filter((_, i) => i !== idx).map((c, i) => ({ ...c, position: i }));
    setCols(n);
  };

  const openAdd = () => {
    setEditItem(null);
    setForm({ column_key: '', column_label: '', column_type: 'text', dropdown_options: '', formula: '', is_required: false });
    setFormErr('');
    setFormOpen(true);
  };

  const openEdit = (idx) => {
    const c = cols[idx];
    setEditItem(idx);
    setForm({
      column_key: c.column_key,
      column_label: c.column_label,
      column_type: c.column_type,
      dropdown_options: (c.dropdown_options || []).join('\n'),
      formula: c.formula || '',
      is_required: c.is_required || false,
    });
    setFormErr('');
    setFormOpen(true);
  };

  const submitForm = () => {
    if (!form.column_label.trim()) { setFormErr('Label kolom wajib diisi.'); return; }
    // Auto-generate key dari label jika tambah baru
    const key = editItem !== null
      ? form.column_key
      : form.column_label.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

    // Cek duplikat key (kecuali saat edit)
    const isDup = cols.some((c, i) => c.column_key === key && i !== editItem);
    if (isDup) { setFormErr('Key sudah ada. Gunakan label yang berbeda.'); return; }

    const newCol = {
      column_key: key,
      column_label: form.column_label.trim(),
      column_type: form.column_type,
      dropdown_options: form.column_type === 'dropdown'
        ? form.dropdown_options.split('\n').map(s => s.trim()).filter(Boolean)
        : null,
      formula: form.column_type === 'formula' ? form.formula : null,
      is_required: form.is_required,
      position: editItem !== null ? cols[editItem].position : cols.length,
    };

    if (editItem !== null) {
      const n = [...cols];
      n[editItem] = { ...n[editItem], ...newCol };
      setCols(n);
    } else {
      setCols([...cols, newCol]);
    }
    setFormOpen(false);
  };

  const tipeLabel = (type) => TIPE_OPTIONS.find(t => t.value === type)?.label || type;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 620, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>

        {/* Header */}
        <div style={{ background: '#1e3a5f', color: '#fff', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>⚙️ Kelola Kolom Custom</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>Kolom sistem (Tanggal, Operator, dst) tidak dapat diubah</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {/* List kolom custom */}
          {cols.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '30px 0', fontStyle: 'italic' }}>
              Belum ada kolom custom. Klik "+ Tambah Kolom" untuk mulai.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {cols.map((col, idx) => (
                <div key={col.column_key} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                  background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
                }}>
                  {/* Tombol Geser */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button type="button" onClick={() => moveUp(idx)} disabled={idx === 0}
                      style={{ width: 24, height: 22, border: '1px solid #cbd5e0', borderRadius: 4, background: idx === 0 ? '#f1f5f9' : '#fff', cursor: idx === 0 ? 'default' : 'pointer', fontSize: 11, color: idx === 0 ? '#cbd5e0' : '#374151' }}>
                      ↑
                    </button>
                    <button type="button" onClick={() => moveDown(idx)} disabled={idx === cols.length - 1}
                      style={{ width: 24, height: 22, border: '1px solid #cbd5e0', borderRadius: 4, background: idx === cols.length - 1 ? '#f1f5f9' : '#fff', cursor: idx === cols.length - 1 ? 'default' : 'pointer', fontSize: 11, color: idx === cols.length - 1 ? '#cbd5e0' : '#374151' }}>
                      ↓
                    </button>
                  </div>

                  {/* Info Kolom */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#1a202c' }}>
                      {col.column_label}
                      {col.is_required && <span style={{ color: '#dc2626', marginLeft: 4 }}>*</span>}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>
                      {tipeLabel(col.column_type)}
                      {col.column_type === 'formula' && col.formula && (
                        <code style={{ marginLeft: 6, background: '#fef3c7', padding: '0 4px', borderRadius: 3, color: '#92400e' }}>{col.formula}</code>
                      )}
                      {col.column_type === 'dropdown' && col.dropdown_options?.length > 0 && (
                        <span style={{ marginLeft: 6 }}>({col.dropdown_options.join(', ')})</span>
                      )}
                    </div>
                  </div>

                  {/* Aksi */}
                  <button type="button" onClick={() => openEdit(idx)}
                    style={{ padding: '4px 10px', background: '#e0f2fe', color: '#0c4a6e', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>
                    ✏️
                  </button>
                  <button type="button" onClick={() => deleteCol(idx)}
                    style={{ padding: '4px 10px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Tombol Tambah */}
          {!formOpen && (
            <button type="button" onClick={openAdd}
              style={{ width: '100%', padding: '10px 0', background: '#f0fdf4', border: '2px dashed #86efac', borderRadius: 8, color: '#166534', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              + Tambah Kolom Baru
            </button>
          )}

          {/* Form Tambah/Edit */}
          {formOpen && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 18, marginTop: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: '#1e3a5f' }}>
                {editItem !== null ? '✏️ Edit Kolom' : '➕ Tambah Kolom Baru'}
              </div>

              {formErr && (
                <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 13 }}>
                  {formErr}
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Label Kolom *</label>
                <input type="text" value={form.column_label}
                  onChange={e => setForm(f => ({ ...f, column_label: e.target.value }))}
                  placeholder="Contoh: Volume Galian (m³)"
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Tipe Kolom</label>
                <select value={form.column_type}
                  onChange={e => setForm(f => ({ ...f, column_type: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
                  {TIPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              {form.column_type === 'dropdown' && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                    Pilihan (satu per baris)
                  </label>
                  <textarea value={form.dropdown_options}
                    onChange={e => setForm(f => ({ ...f, dropdown_options: e.target.value }))}
                    placeholder={'Cerah\nMendung\nHujan'}
                    rows={4}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} />
                </div>
              )}

              {form.column_type === 'formula' && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Formula</label>
                  <FormulaEditor value={form.formula}
                    onChange={v => setForm(f => ({ ...f, formula: v }))}
                    allColumns={cols.filter((_, i) => i !== editItem)} />
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={form.is_required}
                    onChange={e => setForm(f => ({ ...f, is_required: e.target.checked }))} />
                  Wajib diisi operator
                </label>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={submitForm}
                  style={{ flex: 1, padding: '9px 0', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  {editItem !== null ? 'Perbarui' : 'Tambahkan'}
                </button>
                <button type="button" onClick={() => setFormOpen(false)}
                  style={{ padding: '9px 18px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 7, cursor: 'pointer', fontSize: 14 }}>
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
          <button type="button" onClick={onClose}
            style={{ padding: '9px 20px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>
            Batal
          </button>
          <button type="button" onClick={() => onSave(cols)} disabled={saving}
            style={{ padding: '9px 24px', background: saving ? '#9ca3af' : '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: saving ? 'default' : 'pointer' }}>
            {saving ? '💾 Menyimpan...' : '💾 Simpan Konfigurasi'}
          </button>
        </div>
      </div>
    </div>
  );
}
