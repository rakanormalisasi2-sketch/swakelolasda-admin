'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import StorageWarning from '@/components/StorageWarning';

export default function SeksiDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ activeAssignments: 0, freeOps: 0, readyAlat: 0, maintenance: 0 });
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [yearlyStats, setYearlyStats] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [asgn, ops, alatReady, alatMaint, reports] = await Promise.all([
          supabase.from('assignments').select('id', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'operator'),
          supabase.from('heavy_equipment').select('id', { count: 'exact', head: true }).eq('status', 'ready'),
          supabase.from('heavy_equipment').select('id', { count: 'exact', head: true }).eq('status', 'maintenance'),
          supabase.from('daily_reports').select('*, assignment:assignments(operator:user_profiles!assignments_operator_id_fkey(full_name), location_village, location_district, job_type)').order('created_at', { ascending: false }).limit(5),
        ]);
        setStats({ activeAssignments: asgn.count || 0, totalOps: ops.count || 0, readyAlat: alatReady.count || 0, maintenance: alatMaint.count || 0 });
        setRecentReports(reports.data || []);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    async function loadYearly() {
      if (profile?.role !== 'seksi_normalisasi') return;
      try {
        const [resTarget, resData] = await Promise.all([
          fetch(`/api/checklist-normalisasi/target?tahun=${tahun}`),
          fetch(`/api/checklist-normalisasi?tahun=${tahun}`)
        ]);
        const target = await resTarget.json();
        const data = await resData.json();
        
        const totalPanjang = (data || []).reduce((sum, d) => sum + (Number(d.panjang)||0), 0);
        const totalSolar = (data || []).reduce((sum, d) => sum + (Number(d.solar)||0), 0);
        
        setYearlyStats({
          target: target?.target_panjang_normalisasi || 0,
          totalPanjang,
          totalSolar,
          lokasi: (data || []).length
        });
      } catch (e) {
        console.error(e);
      }
    }
    if (profile) loadYearly();
  }, [tahun, profile]);

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
        {/* STORAGE WARNING */}
        <StorageWarning />
        
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

        {profile?.role === 'seksi_normalisasi' && (
          <div style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0b1c30' }}>Pencapaian Tahunan</h2>
              <select value={tahun} onChange={e => setTahun(Number(e.target.value))} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #c2c6d3', outline: 'none', fontWeight: 'bold' }}>
                {[2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Card Normalisasi */}
              <div style={{ background: 'linear-gradient(135deg, #00346f, #004a99)', borderRadius: '12px', padding: '24px', color: 'white', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 30px -10px rgba(0,52,111,0.5)' }}>
                <div style={{ position: 'absolute', right: -20, top: -20, opacity: 0.1, fontSize: 120 }}>🏗️</div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  🏗️ NORMALISASI SUNGAI
                </h3>
                
                {yearlyStats ? (() => {
                  const target = yearlyStats.target;
                  const dev = yearlyStats.totalPanjang - target;
                  const devPct = target > 0 ? (Math.abs(dev) / target * 100).toFixed(1) : 0;
                  return (
                    <div style={{ display: 'grid', gap: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: 8 }}>
                        <span style={{ fontSize: 13, opacity: 0.8 }}>Total Panjang</span>
                        <span style={{ fontSize: 24, fontWeight: 900 }}>{yearlyStats.totalPanjang.toLocaleString('id-ID')} <span style={{ fontSize: 14, fontWeight: 'normal' }}>meter</span></span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.9 }}>
                        <span style={{ fontSize: 13 }}>Target Tahun {tahun}</span>
                        <span style={{ fontSize: 16, fontWeight: 'bold' }}>{target.toLocaleString('id-ID')} meter</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13 }}>Deviasi</span>
                        <span style={{ fontSize: 13, fontWeight: 'bold', background: dev < 0 ? '#ef4444' : '#10b981', padding: '2px 8px', borderRadius: 4 }}>
                          {target > 0 ? (dev < 0 ? `Kurang ${Math.abs(dev).toLocaleString('id-ID')}m (${devPct}%)` : `Surplus ${dev.toLocaleString('id-ID')}m (+${devPct}%)`) : 'Target belum diset'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px 12px', borderRadius: 8 }}>
                          <div style={{ fontSize: 11, opacity: 0.8 }}>Total Lokasi</div>
                          <div style={{ fontSize: 16, fontWeight: 'bold' }}>{yearlyStats.lokasi}</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px 12px', borderRadius: 8, textAlign: 'right' }}>
                          <div style={{ fontSize: 11, opacity: 0.8 }}>Total Solar</div>
                          <div style={{ fontSize: 16, fontWeight: 'bold' }}>{yearlyStats.totalSolar.toLocaleString('id-ID')} Liter</div>
                        </div>
                      </div>
                    </div>
                  );
                })() : <div style={{ opacity: 0.5 }}>Memuat data...</div>}
              </div>

              {/* Card Embung Placeholder */}
              <div style={{ background: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #c2c6d3', position: 'relative', overflow: 'hidden' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 8, color: '#0b1c30' }}>
                  🌊 REHABILITASI EMBUNG
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '140px', background: '#f8f9ff', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                  <span style={{ fontSize: 13, color: '#64748b', fontWeight: 'bold' }}>Modul Checklist Embung Belum Tersedia</span>
                  <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Menunggu pengembangan fitur selanjutnya</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
