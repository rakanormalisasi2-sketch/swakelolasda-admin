'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function ProposalPage() {
  const { profile } = useAuth();
  const [sheetId, setSheetId] = useState('');
  const [loading, setLoading] = useState(true);

  const settingKey = profile?.role === 'seksi_embung'
    ? 'google_proposal_embung_id'
    : 'google_proposal_normalisasi_id';

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('app_settings')
        .select('config_value')
        .eq('config_key', settingKey)
        .single();
      setSheetId(data?.config_value || '');
      setLoading(false);
    }
    if (profile) load();
  }, [profile, settingKey]);

  const embedUrl = sheetId && sheetId !== 'KOSONG'
    ? `https://docs.google.com/spreadsheets/d/${sheetId}/htmlview?widget=true&headers=false`
    : null;

  return (
    <>
      <div className="header">
        <div>
          <div className="header-title">Perencanaan Proposal Masuk</div>
          <div className="header-subtitle">
            {profile?.role === 'seksi_embung' ? 'Seksi Embung' : 'Seksi Normalisasi'}
          </div>
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Memuat...</div>
        ) : !embedUrl ? (
          <div className="card">
            <div className="card-body" style={{ textAlign: 'center', padding: 60 }}>
              <svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" style={{ width: 48, height: 48, margin: '0 auto 16px', color: 'var(--text-muted)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h3 style={{ marginBottom: 8, fontSize: 16 }}>Spreadsheet Belum Dikonfigurasi</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, maxWidth: 400, margin: '0 auto' }}>
                Hubungi <strong>Superadmin</strong> untuk mengisi ID Google Spreadsheet Proposal pada halaman Pengaturan Sistem.
              </p>
            </div>
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden', padding: 0, height: 'calc(100vh - 130px)', minHeight: 500 }}>
            <iframe
              src={embedUrl}
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              title="Spreadsheet Proposal"
              allowFullScreen
            />
          </div>
        )}
      </div>
    </>
  );
}
