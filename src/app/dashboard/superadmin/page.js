'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import StorageWarning from '@/components/StorageWarning';

export default function SuperadminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ users: 0, alat: 0, penugasan: 0, maintenance: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [u, a, p, m] = await Promise.all([
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('heavy_equipment').select('id', { count: 'exact', head: true }),
        supabase.from('assignments').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('heavy_equipment').select('id', { count: 'exact', head: true }).eq('status', 'maintenance'),
      ]);
      setStats({ users: u.count || 0, alat: a.count || 0, penugasan: p.count || 0, maintenance: m.count || 0 });
      setLoading(false);
    }
    load();
  }, []);

  const statItems = [
    { label: 'Total Pengguna', value: stats.users, color: '#1a56db', bg: '#e8f0fe', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { label: 'Total Alat Berat', value: stats.alat, color: '#0ea5e9', bg: '#e0f2fe', icon: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10h10z' },
    { label: 'Penugasan Aktif', value: stats.penugasan, color: '#16a34a', bg: '#dcfce7', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { label: 'Alat Maintenance', value: stats.maintenance, color: '#dc2626', bg: '#fee2e2', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z' },
  ];

  return (
    <>
      <div className="header">
        <div>
          <div className="header-title">Dashboard Superadmin</div>
          <div className="header-subtitle">Selamat datang, {profile?.full_name}</div>
        </div>
      </div>
      <div className="page-body">
        {/* STORAGE WARNING */}
        <StorageWarning />
        
        <div className="stats-grid">
          {statItems.map(s => (
            <div className="stat-card" key={s.label}>
              <div className="stat-icon" style={{ background: s.bg }}>
                <svg fill="none" stroke={s.color} strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                </svg>
              </div>
              <div>
                <div className="stat-value">{loading ? '—' : s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ width: 18, height: 18, color: 'var(--primary)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="card-title">Panduan Pengaturan Awal</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { step: '1', text: 'Buka menu Kelola Pengguna → Tambah akun untuk setiap Tim Peralatan, Seksi, dan Operator.' },
                { step: '2', text: 'Buka menu Daftar Alat Berat → Daftarkan semua unit alat berat yang tersedia.' },
                { step: '3', text: 'Buka menu Pengaturan Sistem → Masukkan ID Google Spreadsheet dan Folder Drive tujuan untuk laporan.' },
                { step: '4', text: 'Setelah semua akun dan alat terdaftar, Tim Seksi dapat mulai melakukan penugasan operator.' },
              ].map(({ step, text }) => (
                <div key={step} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: 'var(--primary-light)', color: 'var(--primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 1
                  }}>{step}</div>
                  <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
