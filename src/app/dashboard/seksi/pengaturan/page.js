'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function PengaturanSeksiPage() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState({ 
    spreadsheet_id: '', 
    gdrive_folder_id: '',
    pdf_program: '',
    pdf_kegiatan: '',
    pdf_sub_kegiatan: '',
    pdf_pekerjaan_prefix: '',
    pdf_nama_staf: '',
    pdf_nip_staf: '',
    google_refresh_token: null,
    google_root_folder_id: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [disconnecting, setDisconnecting] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const loadSettings = useCallback(async () => {
    if (!profile?.role) return;
    const { data } = await supabase.from('section_settings').select('*').eq('role', profile.role).single();
    if (data) {
      setSettings({
        spreadsheet_id: data.spreadsheet_id || '',
        gdrive_folder_id: data.gdrive_folder_id || '',
        pdf_program: data.pdf_program || '',
        pdf_kegiatan: data.pdf_kegiatan || '',
        pdf_sub_kegiatan: data.pdf_sub_kegiatan || '',
        pdf_pekerjaan_prefix: data.pdf_pekerjaan_prefix || '',
        pdf_nama_staf: data.pdf_nama_staf || '',
        pdf_nip_staf: data.pdf_nip_staf || '',
        google_refresh_token: data.google_refresh_token || null,
        google_root_folder_id: data.google_root_folder_id || '',
      });
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Baca status gdrive dari URL setelah redirect OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('gdrive_status');
    if (status === 'success') {
      setMessage('✅ Akun Google Drive berhasil dihubungkan!');
      loadSettings(); // reload data terbaru
      window.history.replaceState({}, '', window.location.pathname);
    } else if (status === 'cancelled') {
      setMessage('⚠️ Proses login Google Drive dibatalkan.');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (status === 'error') {
      const msg = params.get('msg') || 'unknown';
      setMessage(`❌ Gagal menghubungkan Google Drive (${msg}). Coba lagi.`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [loadSettings]);

  const saveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    
    const { error } = await supabase.from('section_settings').upsert({
      role: profile.role,
      spreadsheet_id: settings.spreadsheet_id,
      gdrive_folder_id: settings.gdrive_folder_id,
      pdf_program: settings.pdf_program,
      pdf_kegiatan: settings.pdf_kegiatan,
      pdf_sub_kegiatan: settings.pdf_sub_kegiatan,
      pdf_pekerjaan_prefix: settings.pdf_pekerjaan_prefix,
      pdf_nama_staf: settings.pdf_nama_staf,
      pdf_nip_staf: settings.pdf_nip_staf,
      google_root_folder_id: settings.google_root_folder_id,
      updated_at: new Date().toISOString()
    }, { onConflict: 'role' });

    if (error) {
      setMessage('❌ Gagal menyimpan pengaturan: ' + error.message);
    } else {
      setMessage('✅ Pengaturan berhasil disimpan!');
    }
    setSaving(false);
  };

  const handleConnectGoogle = () => {
    window.location.href = `/api/auth/google/login?role=${profile.role}`;
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setShowDisconnectConfirm(false);
    try {
      const res = await fetch('/api/auth/google/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: profile.role }),
      });
      if (res.ok) {
        setSettings(s => ({ ...s, google_refresh_token: null }));
        setMessage('✅ Koneksi Google Drive berhasil diputus. Anda bisa menghubungkan akun lain.');
      } else {
        setMessage('❌ Gagal memutus koneksi. Coba lagi.');
      }
    } catch {
      setMessage('❌ Terjadi kesalahan jaringan. Coba lagi.');
    }
    setDisconnecting(false);
  };

  if (loading) return <div style={{padding:40, textAlign:'center'}}>Memuat pengaturan...</div>;

  const isConnected = !!settings.google_refresh_token;
  const ROLE_NAMES = {
    seksi_normalisasi: 'Seksi Normalisasi',
    seksi_embung: 'Seksi Embung',
    tim_peralatan: 'Tim Peralatan',
    superadmin: 'Superadmin',
  };
  const sectionName = ROLE_NAMES[profile?.role] || profile?.role || '—';


  return (
    <>
      <div className="header">
        <div>
          <div className="header-title">Pengaturan Sistem</div>
          <div className="header-subtitle">Konfigurasi Sinkronisasi Eksternal API Google (G-Drive &amp; Spreadsheet)</div>
        </div>
      </div>

      <div className="page-body" style={{maxWidth: 800}}>

        {/* ======== PANEL GOOGLE DRIVE OAUTH ======== */}
        <div className="card" style={{marginBottom: 24}}>
          <div className="card-header">
            <span className="card-title">🔗 Integrasi Google Drive — {sectionName}</span>
          </div>
          <div className="card-body">
            <p style={{fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6}}>
              Hubungkan akun Google Drive untuk mengaktifkan upload foto otomatis dari Aplikasi Mobile Operator. 
              Foto akan tersimpan ke folder Google Drive sesuai hierarki <strong>Tahun/Bulan/Desa/Operator</strong>. 
              Jika Drive penuh, putuskan koneksi lalu hubungkan dengan akun Drive lain.
            </p>

            {/* Status Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 18px',
              borderRadius: 10,
              background: isConnected ? '#f0fdf4' : '#fefce8',
              border: `1.5px solid ${isConnected ? '#86efac' : '#fde047'}`,
              marginBottom: 20,
            }}>
              <div style={{
                width: 12, height: 12, borderRadius: '50%',
                background: isConnected ? '#22c55e' : '#f59e0b',
                boxShadow: isConnected ? '0 0 0 3px #bbf7d0' : '0 0 0 3px #fef08a',
              }}/>
              <div>
                <div style={{fontWeight: 600, fontSize: 14, color: isConnected ? '#15803d' : '#92400e'}}>
                  {isConnected ? '✅ Terhubung ke Google Drive' : '⚠️ Belum Terhubung'}
                </div>
                <div style={{fontSize: 12.5, color: isConnected ? '#16a34a' : '#a16207', marginTop: 2}}>
                  {isConnected 
                    ? 'Sistem siap menerima upload foto dari Operator.' 
                    : 'Klik tombol di bawah untuk menghubungkan akun Google Drive.'}
                </div>
              </div>
            </div>

            {/* Tombol Aksi */}
            <div style={{display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center'}}>
              {!isConnected ? (
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14,
                    background: '#4285F4', color: '#fff', border: 'none', cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(66,133,244,0.35)',
                    transition: 'all .2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#2563eb'}
                  onMouseLeave={e => e.currentTarget.style.background = '#4285F4'}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Login dengan Google
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleConnectGoogle}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14,
                      background: '#f0f9ff', color: '#0369a1', border: '1.5px solid #7dd3fc', cursor: 'pointer',
                    }}
                  >
                    🔄 Ganti Akun Google
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDisconnectConfirm(true)}
                    disabled={disconnecting}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14,
                      background: '#fff1f2', color: '#be123c', border: '1.5px solid #fda4af', cursor: 'pointer',
                    }}
                  >
                    {disconnecting ? 'Memutus...' : '🔌 Putuskan Koneksi'}
                  </button>
                </>
              )}
            </div>

            {/* Input Folder ID */}
            <div className="form-group" style={{marginTop: 20}}>
              <label className="form-label" style={{fontWeight: 600}}>Root Folder ID Google Drive</label>
              <input
                type="text"
                className="form-control"
                placeholder="Contoh: 1uTVJiJ1pX1e... (dari URL Drive Anda)"
                value={settings.google_root_folder_id}
                onChange={e => setSettings({...settings, google_root_folder_id: e.target.value})}
              />
              <div className="text-xs text-muted mt-2">
                Folder utama tempat semua foto operator ini disimpan. Ambil dari URL Google Drive: 
                <code style={{background:'#eee', padding:'2px 4px', borderRadius:3, marginLeft:4}}>
                  drive.google.com/drive/folders/<strong>[ID INI]</strong>
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Dialog Konfirmasi Disconnect */}
        {showDisconnectConfirm && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
          }}>
            <div style={{
              background: '#fff', borderRadius: 14, padding: 32, maxWidth: 420, width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
            }}>
              <h3 style={{marginTop: 0, fontSize: 18, fontWeight: 700, color: '#1e293b'}}>
                🔌 Putuskan Koneksi Google Drive?
              </h3>
              <p style={{color: '#64748b', fontSize: 14, lineHeight: 1.6}}>
                Setelah diputus, sistem <strong>tidak akan dapat</strong> menerima upload foto dari Operator sampai 
                Anda menghubungkan akun Google Drive baru. Anda bisa menghubungkan akun Drive yang berbeda segera setelahnya.
              </p>
              <div style={{display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24}}>
                <button
                  onClick={() => setShowDisconnectConfirm(false)}
                  style={{padding: '9px 18px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontWeight: 500}}
                >
                  Batal
                </button>
                <button
                  onClick={handleDisconnect}
                  style={{padding: '9px 18px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 600}}
                >
                  Ya, Putuskan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======== PANEL PENGATURAN PDF & SPREADSHEET ======== */}
        <div className="card">
          <div className="card-header"><span className="card-title">Kredensial Penampung Data — {sectionName}</span></div>
          <div className="card-body">
            
            {message && <div style={{padding: 12, marginBottom: 20, background: message.includes('Gagal') || message.includes('❌') ? '#fee2e2' : message.includes('⚠️') ? '#fef9c3' : '#dcfce7', color: message.includes('Gagal') || message.includes('❌') ? '#991b1b' : message.includes('⚠️') ? '#713f12' : '#166534', borderRadius: 6}}>{message}</div>}

            <form onSubmit={saveSettings}>
              {/* ===== Baris 1: Program & Kegiatan ===== */}
              <div className="form-group" style={{marginTop:10}}>
                <label className="form-label" style={{fontWeight:600}}>Program (Cetak PDF)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Contoh: PENGELOLAAN SUMBER DAYA AIR"
                  value={settings.pdf_program}
                  onChange={e => setSettings({...settings, pdf_program: e.target.value})}
                />
              </div>

              <div className="form-group" style={{marginTop:10}}>
                <label className="form-label" style={{fontWeight:600}}>Kegiatan (Cetak PDF)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Contoh: PENGELOLAAN SDA DAN BANGUNAN PENGAMAN PANTAI..."
                  value={settings.pdf_kegiatan}
                  onChange={e => setSettings({...settings, pdf_kegiatan: e.target.value})}
                />
              </div>

              <div className="form-group" style={{marginTop:10}}>
                  <label className="form-label" style={{fontWeight:600}}>Kepala Sub Kegiatan (Cetak PDF)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Contoh: NORMALISASI / RESTORASI SUNGAI"
                    value={settings.pdf_sub_kegiatan}
                    onChange={e => setSettings({...settings, pdf_sub_kegiatan: e.target.value})}
                  />
              </div>

              <div style={{display:'flex', gap:20, marginTop:10}}>
                <div className="form-group" style={{flex:1}}>
                  <label className="form-label" style={{fontWeight:600}}>Nama Staf Tanda Tangan (Cetak PDF)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Contoh: PANGESTU EKA DEWANTO W, A.Md.T"
                    value={settings.pdf_nama_staf}
                    onChange={e => setSettings({...settings, pdf_nama_staf: e.target.value})}
                  />
                </div>
                <div className="form-group" style={{flex:1}}>
                  <label className="form-label" style={{fontWeight:600}}>NIP Staf Tanda Tangan (Cetak PDF)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Contoh: 19980711 202204 1 001"
                    value={settings.pdf_nip_staf}
                    onChange={e => setSettings({...settings, pdf_nip_staf: e.target.value})}
                  />
                </div>
              </div>

              <div style={{marginTop: 32, display: 'flex', justifyContent: 'flex-end'}}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
