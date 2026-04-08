'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export default function KelolapenggnaanPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'operator' });
  const [search, setSearch] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('user_profiles').select('*').order('full_name');
    setUsers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const openAdd = () => {
    setEditUser(null);
    setForm({ full_name: '', email: '', password: '', role: 'operator' });
    setError(''); setSuccess('');
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditUser(u);
    setForm({ full_name: u.full_name, email: '', password: '', role: u.role });
    setError(''); setSuccess('');
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');

    if (!editUser) {
      // Create new user via Supabase Auth Admin (via API route to keep service key secure)
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password, full_name: form.full_name, role: form.role }),
      });
      const result = await res.json();
      if (!result.success) { setError(result.error || 'Gagal membuat pengguna.'); setSaving(false); return; }
      setSuccess('Pengguna berhasil dibuat!');
    } else {
      // Update profile
      const updates = { full_name: form.full_name, role: form.role };
      const { error: updErr } = await supabase.from('user_profiles').update(updates).eq('id', editUser.id);
      if (updErr) { setError(updErr.message); setSaving(false); return; }
      if (form.password) {
        await fetch('/api/admin/update-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: editUser.id, password: form.password }),
        });
      }
      setSuccess('Data pengguna diperbarui!');
    }

    setSaving(false);
    loadUsers();
  };

  const handleDelete = async (u) => {
    if (!confirm(`Hapus pengguna "${u.full_name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: u.id }),
    });
    loadUsers();
  };

  const ROLE_LABELS = {
    superadmin: 'Superadmin', peralatan: 'Tim Peralatan',
    seksi_normalisasi: 'Seksi Normalisasi', seksi_embung: 'Seksi Embung', operator: 'Operator',
  };
  const ROLE_BADGE = {
    superadmin: 'badge-danger', peralatan: 'badge-maintenance',
    seksi_normalisasi: 'badge-primary', seksi_embung: 'badge-primary', operator: 'badge-neutral',
  };

  const filtered = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="header">
        <div>
          <div className="header-title">Kelola Pengguna</div>
          <div className="header-subtitle">Manajemen akun semua pengguna sistem</div>
        </div>
        <div className="header-right">
          <button className="btn btn-primary" onClick={openAdd}>
            <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{width:15,height:15}}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Tambah Pengguna
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="card">
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <span className="card-title">Daftar Pengguna ({users.length})</span>
            <div className="search-bar" style={{ width: 240 }}>
              <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input className="form-control" placeholder="Cari nama atau role..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="table-wrapper">
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Memuat data...</div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h3>Belum ada pengguna</h3>
                <p>Klik "Tambah Pengguna" untuk menambahkan akun baru.</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr><th>Nama Lengkap</th><th>Role / Jabatan</th><th>ID Pengguna</th><th>Aksi</th></tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-light)',
                            color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 700, flexShrink: 0
                          }}>
                            {u.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                          </div>
                          <span className="font-semibold">{u.full_name}</span>
                        </div>
                      </td>
                      <td><span className={`badge ${ROLE_BADGE[u.role] || 'badge-neutral'}`}>{ROLE_LABELS[u.role] || u.role}</span></td>
                      <td><span className="text-xs text-muted" style={{ fontFamily: 'monospace' }}>{u.id?.slice(0,8)}…</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => openEdit(u)}>Edit</button>
                          <button className="btn btn-sm" style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: 'none' }} onClick={() => handleDelete(u)}>Hapus</button>
                        </div>
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
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{editUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}>
                <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{width:18,height:18}}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {error && <div className="alert alert-danger"><svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{width:16,height:16}}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>{error}</div>}
                {success && <div className="alert alert-success"><svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{width:16,height:16}}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>{success}</div>}
                <div className="form-group">
                  <label className="form-label">Nama Lengkap *</label>
                  <input className="form-control" required value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})} placeholder="Nama lengkap pengguna" />
                </div>
                {!editUser && (
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input className="form-control" type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="email@contoh.com" />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">{editUser ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password *'}</label>
                  <input className="form-control" type="password" required={!editUser} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="••••••••" />
                </div>
                <div className="form-group">
                  <label className="form-label">Role / Jabatan *</label>
                  <select className="form-control" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
                    <option value="superadmin">Superadmin</option>
                    <option value="peralatan">Tim Peralatan</option>
                    <option value="seksi_normalisasi">Seksi Normalisasi</option>
                    <option value="seksi_embung">Seksi Embung</option>
                    <option value="operator">Operator</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : (editUser ? 'Simpan Perubahan' : 'Buat Pengguna')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
