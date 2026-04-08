'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const STATUS_OPTIONS = [
  { value: 'ready', label: 'Ready', badge: 'badge-success' },
  { value: 'operating', label: 'Beroperasi', badge: 'badge-warning' },
  { value: 'maintenance', label: 'Maintenance', badge: 'badge-maintenance' },
];

export default function AlatBeratPage() {
  const [alat, setAlat] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editAlat, setEditAlat] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', merk_type: '', status: 'ready', condition_percentage: 100 });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('heavy_equipment').select('*').order('name');
    setAlat(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditAlat(null);
    setForm({ name: '', merk_type: '', status: 'ready', condition_percentage: 100 });
    setError(''); setShowModal(true);
  };

  const openEdit = (a) => {
    setEditAlat(a);
    setForm({ name: a.name, merk_type: a.merk_type || '', status: a.status, condition_percentage: a.condition_percentage });
    setError(''); setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    const payload = { name: form.name, merk_type: form.merk_type, status: form.status, condition_percentage: parseInt(form.condition_percentage) };
    let err;
    if (editAlat) {
      ({ error: err } = await supabase.from('heavy_equipment').update(payload).eq('id', editAlat.id));
    } else {
      ({ error: err } = await supabase.from('heavy_equipment').insert(payload));
    }
    if (err) { setError(err.message); setSaving(false); return; }
    setSaving(false); setShowModal(false); load();
  };

  const handleDelete = async (a) => {
    if (!confirm(`Hapus alat "${a.name}"?`)) return;
    await supabase.from('heavy_equipment').delete().eq('id', a.id);
    load();
  };

  const getConditionColor = (pct) => {
    if (pct >= 70) return 'green';
    if (pct >= 40) return 'orange';
    return 'red';
  };

  return (
    <>
      <div className="header">
        <div>
          <div className="header-title">Daftar Alat Berat</div>
          <div className="header-subtitle">Kelola unit alat berat yang terdaftar di sistem</div>
        </div>
        <div className="header-right">
          <button className="btn btn-primary" onClick={openAdd}>
            <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{width:15,height:15}}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
            Tambah Alat
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Unit Alat Berat ({alat.length})</span>
          </div>
          <div className="table-wrapper">
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Memuat data...</div>
            ) : alat.length === 0 ? (
              <div className="empty-state">
                <svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10h10z"/></svg>
                <h3>Belum ada alat terdaftar</h3>
                <p>Klik "Tambah Alat" untuk mendaftarkan unit alat berat.</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr><th>Nama Alat</th><th>Merk / Tipe</th><th>Status</th><th>Kondisi</th><th>Aksi</th></tr>
                </thead>
                <tbody>
                  {alat.map(a => {
                    const statusObj = STATUS_OPTIONS.find(s => s.value === a.status) || STATUS_OPTIONS[0];
                    return (
                      <tr key={a.id}>
                        <td className="font-semibold">{a.name}</td>
                        <td className="text-muted">{a.merk_type || '—'}</td>
                        <td><span className={`badge ${statusObj.badge}`}><span className="badge-dot"/>{statusObj.label}</span></td>
                        <td style={{ width: 180 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="progress-bar-wrapper" style={{ flex: 1 }}>
                              <div className={`progress-bar-fill ${getConditionColor(a.condition_percentage)}`} style={{ width: `${a.condition_percentage}%` }} />
                            </div>
                            <span className="text-sm font-semibold" style={{ width: 34, textAlign: 'right' }}>{a.condition_percentage}%</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-outline btn-sm" onClick={() => openEdit(a)}>Edit</button>
                            <button className="btn btn-sm" style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: 'none' }} onClick={() => handleDelete(a)}>Hapus</button>
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
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{editAlat ? 'Edit Alat Berat' : 'Tambah Alat Berat'}</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}>
                <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{width:18,height:18}}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {error && <div className="alert alert-danger"><svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{width:16,height:16}}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01"/></svg>{error}</div>}
                <div className="form-group">
                  <label className="form-label">Nama Alat *</label>
                  <input className="form-control" required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Contoh: Excavator PC200" />
                </div>
                <div className="form-group">
                  <label className="form-label">Merk / Tipe</label>
                  <input className="form-control" value={form.merk_type} onChange={e=>setForm({...form,merk_type:e.target.value})} placeholder="Contoh: Komatsu PC200-8" />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-control" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
                      {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Kondisi (%)</label>
                    <input className="form-control" type="number" min={0} max={100} value={form.condition_percentage} onChange={e=>setForm({...form,condition_percentage:e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : (editAlat ? 'Simpan' : 'Tambahkan')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
