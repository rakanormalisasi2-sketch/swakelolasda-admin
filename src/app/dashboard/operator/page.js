'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function OperatorPage() {
  const { profile } = useAuth();
  const [assignment, setAssignment] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!profile?.id) return;

      const [{ data: asgn }, { data: reps }] = await Promise.all([
        supabase.from('assignments').select(`
          *,
          equipment:heavy_equipment(name, merk_type, nomor_lambung, status),
          helper:user_profiles!assignments_helper_id_fkey(full_name)
        `).or(`operator_id.eq.${profile.id},helper_id.eq.${profile.id}`).eq('status', 'active').maybeSingle(),
        supabase.from('daily_reports').select(`
          *,
          assignment:assignments(
            location_village, location_district,
            equipment:heavy_equipment(name, merk_type, nomor_lambung)
          )
        `).eq('assignment_id',
          // Will be filtered client side after assignment loaded
          '00000000-0000-0000-0000-000000000000'
        ).order('tanggal_laporan', { ascending: false }).limit(1), // placeholder
      ]);

      setAssignment(asgn);

      // Fetch actual reports by assignment_id if we have one
      if (asgn?.id) {
        const { data: actualReps } = await supabase
          .from('daily_reports')
          .select('*, assignment:assignments(location_village, location_district, equipment:heavy_equipment(name, merk_type, nomor_lambung))')
          .eq('assignment_id', asgn.id)
          .order('tanggal_laporan', { ascending: false });
        setReports(actualReps || []);
      } else {
        setReports([]);
      }

      setLoading(false);
    }
    load();
  }, [profile]);

  const JOB_LABELS = { normalisasi: 'Normalisasi', embung: 'Embung', lainnya: 'Lainnya' };
  const SUB_LABELS = { normalisasi_sungai: 'Normalisasi Sungai', saluran_afvoer: 'Saluran Air/Afvoer', normalisasi_embung: 'Normalisasi Embung', pembangunan_embung: 'Pembangunan Embung' };

  return (
    <>
      <div className="header">
        <div>
          <div className="header-title">Tugas Saya</div>
          <div className="header-subtitle">Selamat datang, {profile?.full_name}</div>
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <div style={{textAlign:'center',padding:60,color:'var(--text-muted)'}}>Memuat data...</div>
        ) : !assignment ? (
          <div className="card">
            <div className="card-body" style={{textAlign:'center',padding:60}}>
              <svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" style={{width:52,height:52,margin:'0 auto 16px',color:'var(--text-muted)'}}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              <h3 style={{fontSize:16,marginBottom:8}}>Belum Ada Penugasan Aktif</h3>
              <p style={{color:'var(--text-secondary)',fontSize:13.5}}>Anda belum ditugaskan ke pekerjaan apapun. Tunggu konfirmasi dari Admin Seksi.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Active Assignment Card */}
            <div className="card" style={{marginBottom:20,border:'2px solid var(--primary)'}}>
              <div className="card-header" style={{background:'var(--primary-light)'}}>
                <svg fill="none" stroke="var(--primary)" strokeWidth={2} viewBox="0 0 24 24" style={{width:18,height:18}}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                <span className="card-title" style={{color:'var(--primary)'}}>Penugasan Aktif Anda</span>
                <span className="badge badge-success" style={{marginLeft:'auto'}}>
                  <span className="badge-dot"/>Aktif
                </span>
              </div>
              <div className="card-body">
                <div className="form-grid-3" style={{gap:20}}>
                  {[
                    { label: 'Jenis Pekerjaan', value: (SUB_LABELS[assignment.job_sub_type] || JOB_LABELS[assignment.job_type] || assignment.job_type) },
                    { label: 'Alat Berat', value: `(${assignment.equipment?.nomor_lambung || '—'}) ${assignment.equipment?.merk_type || '—'} - ${assignment.equipment?.name}` },
                    { label: 'Lokasi', value: `Desa ${assignment.location_village}, Kec. ${assignment.location_district}` },
                    { label: 'Helper / Operator 2', value: assignment.helper?.full_name || 'Tidak ada helper' },
                    { label: 'Keterangan Tambahan', value: assignment.custom_job_description || '—' },
                    { label: 'Mulai Bertugas', value: new Date(assignment.start_date).toLocaleDateString('id-ID', {day:'2-digit',month:'long',year:'numeric'}) },
                  ].map(({label, value}) => (
                    <div key={label}>
                      <div className="form-label" style={{marginBottom:2}}>{label}</div>
                      <div style={{fontSize:14,fontWeight:600,color:'var(--text-primary)'}}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* History Laporan */}
            <div className="card">
              <div className="card-header" style={{justifyContent:'space-between'}}>
                <span className="card-title">Riwayat Laporan Saya ({reports.length})</span>
                <p style={{fontSize:12,color:'var(--text-muted)'}}>Laporan hanya dapat dikoreksi oleh Admin Seksi.</p>
              </div>
              <div className="table-wrapper">
                {reports.length === 0 ? (
                  <div className="empty-state">
                    <svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" style={{width:48,height:48}}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    <h3>Belum ada laporan</h3>
                    <p>Laporan yang Anda kirim dari aplikasi akan muncul di sini.</p>
                  </div>
                ) : (
                  <table>
                    <thead><tr><th>Tanggal</th><th>Alat</th><th>Progress</th><th>Panjang</th><th>HM Awal</th><th>HM Akhir</th><th>Jam Kerja</th><th>Keterangan</th><th>Foto</th></tr></thead>
                    <tbody>
                      {reports.map(r => {
                        const jamKerja = (r.hm_awal != null && r.hm_akhir != null)
                          ? Math.abs(r.hm_akhir - r.hm_awal).toFixed(2)
                          : '—';
                        return (
                          <tr key={r.id}>
                            <td className="text-sm">{new Date(r.tanggal_laporan).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'})}</td>
                            <td className="text-sm">{r.assignment?.equipment ? `(${r.assignment.equipment.nomor_lambung||'-'}) ${r.assignment.equipment.name}` : '—'}</td>
                            <td className="text-sm">{r.progress_pekerjaan||'—'}</td>
                            <td className="text-sm">{r.panjang_pekerjaan||'—'} m</td>
                            <td className="text-sm">{r.hm_awal??'—'}</td>
                            <td className="text-sm">{r.hm_akhir??'—'}</td>
                            <td className="text-sm">{jamKerja} HM</td>
                            <td className="text-sm" style={{maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.keterangan_tambahan||'—'}</td>
                            <td>
                              {r.foto_urls ? (
                                <a href={r.foto_urls.split(',')[0].trim()} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline">Foto</a>
                              ) : <span className="text-xs text-muted">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
