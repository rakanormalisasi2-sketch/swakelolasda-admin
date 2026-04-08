'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function SeksiDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ activeAssignments: 0, freeOps: 0, readyAlat: 0, maintenance: 0 });
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [asgn, ops, alatReady, alatMaint, reports] = await Promise.all([
        supabase.from('assignments').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'operator'),
        supabase.from('heavy_equipment').select('id', { count: 'exact', head: true }).eq('status', 'ready'),
        supabase.from('heavy_equipment').select('id', { count: 'exact', head: true }).eq('status', 'maintenance'),
        supabase.from('daily_reports').select('*, assignment:assignments(operator:user_profiles!assignments_operator_id_fkey(full_name), location_village, location_district, job_type)').order('created_at', { ascending: false }).limit(5),
      ]);
      setStats({ activeAssignments: asgn.count || 0, totalOps: ops.count || 0, readyAlat: alatReady.count || 0, maintenance: alatMaint.count || 0 });
      setRecentReports(reports.data || []);
      setLoading(false);
    }
    load();
  }, []);

  const roleLabel = profile?.role === 'seksi_embung' ? 'Seksi Embung' : 'Seksi Normalisasi';

  return (
    <>
      <div className="header">
        <div>
          <div className="header-title">Dashboard — {roleLabel}</div>
          <div className="header-subtitle">Selamat datang, {profile?.full_name}</div>
        </div>
      </div>

      <div className="page-body">
        <div className="stats-grid">
          {[
            { label: 'Penugasan Aktif', value: stats.activeAssignments, color: '#1a56db', bg: '#e8f0fe' },
            { label: 'Total Operator', value: stats.totalOps, color: '#0ea5e9', bg: '#e0f2fe' },
            { label: 'Alat Ready', value: stats.readyAlat, color: '#16a34a', bg: '#dcfce7' },
            { label: 'Alat Maintenance', value: stats.maintenance, color: '#7c3aed', bg: '#ede9fe' },
          ].map(s => (
            <div className="stat-card" key={s.label}>
              <div className="stat-icon" style={{ background: s.bg }}>
                <svg fill="none" stroke={s.color} strokeWidth={2} viewBox="0 0 24 24" style={{width:20,height:20}}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
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
            <span className="card-title">Laporan Terbaru</span>
          </div>
          <div className="table-wrapper">
            {loading ? (
              <div style={{padding:30,textAlign:'center',color:'var(--text-muted)'}}>Memuat...</div>
            ) : recentReports.length === 0 ? (
              <div className="empty-state"><svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" style={{width:48,height:48}}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg><h3>Belum ada laporan</h3><p>Laporan dari operator akan muncul di sini.</p></div>
            ) : (
              <table>
                <thead><tr><th>Tanggal</th><th>Operator</th><th>Lokasi</th><th>Progress</th><th>HM Awal</th><th>HM Akhir</th></tr></thead>
                <tbody>
                  {recentReports.map(r => (
                    <tr key={r.id}>
                      <td className="text-sm">{new Date(r.tanggal_laporan).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'})}</td>
                      <td className="font-semibold">{r.assignment?.operator?.full_name || '—'}</td>
                      <td className="text-sm">{r.assignment?.location_village}, {r.assignment?.location_district}</td>
                      <td><span style={{fontSize:13}}>{r.progress_pekerjaan || '—'}</span></td>
                      <td className="text-sm">{r.hm_awal ?? '—'}</td>
                      <td className="text-sm">{r.hm_akhir ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
