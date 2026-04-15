'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  getAllSections,
  getSectionSpreadsheet,
  saveSectionSpreadsheet,
  createSectionSpreadsheet,
  disconnectSectionSheets,
  exportSectionToGoogleSheets
} from '@/lib/googleSheets';
import StorageWarning from '@/components/StorageWarning';

export default function PengaturanSeksiPage() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState({ 
    pdf_program: '', pdf_kegiatan: '', pdf_sub_kegiatan: '',
    pdf_nama_staf: '', pdf_nip_staf: '',
    google_refresh_token: null, google_root_folder_id: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [disconnecting, setDisconnecting] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  // Google Sheets state
  const [sheetsConnected, setSheetsConnected] = useState(false);
  const [sheetsUrl, setSheetsUrl] = useState('');
  const [sheetInput, setSheetInput] = useState('');
  const [creatingSheet, setCreatingSheet] = useState(false);
  const [syncingSheets, setSyncingSheets] = useState(false);
  const [sections, setSections] = useState([]);

  const loadSettings = useCallback(async () => {
    if (!profile?.role) return;
    const { data } = await supabase.from('section_settings').select('*').eq('role', profile.role).single();
    if (data) {
      setSettings({
        pdf_program: data.pdf_program || '',
        pdf_kegiatan: data.pdf_kegiatan || '',
        pdf_sub_kactivities: data.pdf_sub_activities || '',
        pdf_pekerjaan_prefix: data.pdf_pekerjaan_prefix || '',
        pdf_nama_staf: data.pdf_nama_staf || '',
        pdf_nip_staf: data.pdf_nip_staf || '',
        google_refresh_token: data.google_refresh_token || null,
        google_root_folder_id: data.google_root_folder_id || '',
      });
    }
    setLoading(false);
  }, [profile]);

  const loadSheetsConnection = useCallback(() => {
    const allSections = getAllSections();
    setSections(allSections);
    const roleMap = { seksi_normalisasi: 'normalisasi', seksi_embung: 'embung', tim_peralatan: 'peralatan' };
    const sectionId = roleMap[profile?.role];
    if (sectionId) {
      const conn = getSectionSpreadsheet(sectionId);
      setSheetsConnected(!!conn);
      setSheetsUrl(conn?.spreadsheetUrl || '');
    }
  }, [profile]);

  useEffect(() => {
    loadSettings();
    loadSheetsConnection();
  }, [loadSettings, loadSheetsConnection]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('gdrive_status');
    if (status === 'success') {
      setMessage('✅ Akun Google Drive berhasil dihubungkan!');
      loadSettings();
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
      setMessage('❌ Gagal menyimpan: ' + error.message);
    } else {
      setMessage('✅ Pengaturan berhasil disimpan!');
    }
    setSaving(false);
  };

  const handleConnectGoogle = () => {
    window.location.href = `/api/auth/google/login?role=${profile.role}`;
  };

  const extractFolderId = (input) => {
    const trimmed = input.trim();
    const patterns = [
      /\/folders\/([a-zA-Z0-9_-]+)/,
      /[?&]id=([a-zA-Z0-9_-]+)/,
      /\/open\?id=([a-zA-Z0-9_-]+)/,
    ];
    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match) return match[1];
    }
    return trimmed;
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setShowDisconnectConfirm(false);
    try {
      const res = await fetch('/api/auth/google/disconnect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: profile.role }) });
      if (res.ok) {
        setSettings(s => ({ ...s, google_refresh_token: null }));
        setMessage('✅ Koneksi Google Drive berhasil pungk断开.');
      } else {
        setMessage('❌ Gagal memutus koneksi.');
      }
    } catch {
      setMessage('❌ Terjadi kesalahan jaringan.');
    }
    setDisconnecting(false);
  };

  // Google Sheets handlers
  const handleConnectSheets = () => {
    const url = sheetInput.trim();
    if (!url) { setMessage('⚠️ Masukkan URL Google Sheets terlebih dahulu!'); return; }
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) { setMessage('⚠️ URL Google Sheets tidak valid!'); return; }
    const roleMap = { seksi_normalisasi: 'normalisasi', seksi_embung: 'embung', tim_peralatan: 'peralatan' };
    const sectionId = roleMap[profile?.role];
    if (!sectionId) return;
    const spreadsheetId = match[1];
    const saved = saveSectionSpreadsheet(sectionId, spreadsheetId, url);
    setSheetsConnected(true);
    setSheetsUrl(url);
    setSheetInput('');
    setMessage('✅ Google Sheets berhasil disambungkan!');
  };

  const handleCreateSheet = async () => {
    setCreatingSheet(true);
    const roleMap = { seksi_normalisasi: 'normalisasi', seksi_embung: 'embung', tim_peralatan: 'peralatan' };
    const sectionId = roleMap[profile?.role];
    if (!sectionId) { setCreatingSheet(false); return; }
    const sectionName = sections.find(s => s.id === sectionId)?.name || 'Data';
    const result = await createSectionSpreadsheet(sectionId, sectionName + ' - ' + new Date().toLocaleDateString('id-ID'));
    if (result.success) {
      setSheetsConnected(true);
      setSheetsUrl(result.spreadsheetUrl);
      setMessage('✅ Google Sheets baru berhasil dibuat!');
    } else {
      setMessage('⚠️ Gagal membuat spreadsheet.');
    }
    setCreatingSheet(false);
  };

  const handleSyncSheets = async () => {
    setSyncingSheets(true);
    const roleMap = { seksi_normalisasi: 'normalisasi', seksi_embung: 'embung', tim_peralatan: 'peralatan' };
    const sectionId = roleMap[profile?.role];
    if (!sectionId || !sheetsUrl) { setSyncingSheets(false); return; }
    const match = sheetsUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) { setSyncingSheets(false); return; }
    const [assignmentsRes, equipmentRes, absensiRes] = await Promise.all([
      supabase.from('assignments').select('*'),
      supabase.from('heavy_equipment').select('*'),
      supabase.from('absensi').select('*')
    ]);
    const result = await exportSectionToGoogleSheets(sectionId, {
      assignments: assignmentsRes.data || [],
      equipment: equipmentRes.data || [],
      absensi: absensiRes.data || []
    }, match[1]);
    setMessage(result.success ? '✅ Sinkronisasi berhasil!' : '⚠️ Sinkronisasi gagal.');
    setSyncingSheets(false);
  };

  const handleDisconnectSheets = () => {
    if (!confirm('Putus sambungan Google Sheets?')) return;
    const roleMap = { seksi_normalisasi: 'normalisasi', seksi_embung: 'embung', tim_peralatan: 'peralatan' };
    const sectionId = roleMap[profile?.role];
    if (sectionId) {
      disconnectSectionSheets(sectionId);
      setSheetsConnected(false);
      setSheetsUrl('');
      setMessage('✅ Google Sheets berhasil unplugged.');
    }
  };

  if (loading) return <div style={{padding:40, textAlign:'center'}}>Memuat pengaturan...</div>;

  const isConnected = !!settings.google_refresh_token;
  const ROLE_NAMES = { seksi_normalisasi: 'Seksi Normalisasi', seksi_embung: 'Seksi Embung', tim_peralatan: 'Tim Peralatan', superadmin: 'Superadmin' };
  const sectionName = ROLE_NAMES[profile?.role] || profile?.role || '—';

  return (
    <>
      <div className="header">
        <div>
          <div className="header-title">Pengaturan Sistem</div>
          <div className="header-subtitle">Konfigurasi Google Drive &amp; Google Sheets</div>
        </div>
      </div>

      <div className="page-body" style={{maxWidth: 800}}>
        {/* STORAGE WARNING */}
        <StorageWarning />

        {/* ======== DATA TERSIMPAN (GOOGLE SHEETS) ======== */}
        <div className="card" style={{marginBottom: 24}}>
          <div className="card-header">
            <span className="card-title">📊 Data Tersimpan — {sectionName}</span>
          </div>
          <div className="card-body">
            <p style={{fontSize: 13, color: 'var(--text-muted)', marginBottom: 16}}>
              Hubungkan Google Sheets untuk menyimpan dan menyinkronkan data laporan kerja.
            </p>

            {sheetsConnected ? (
              <div>
                <div style={{padding: 12, background: '#dcfce7', borderRadius: 8, marginBottom: 16}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                    <span style={{color: '#16a34a', fontSize: 18}}>✅</span>
                    <span style={{fontWeight: 600, color: '#166534'}}>Google Sheets Terhubung</span>
                  </div>
                  <div style={{marginTop: 8, fontSize: 12, color: '#15803d'}}>
                    <a href={sheetsUrl} target="_blank" rel="noopener noreferrer" style={{color: '#15803d', textDecoration: 'underline'}}>
                      {sheetsUrl}
                    </a>
                  </div>
                </div>
                <div style={{display: 'flex', gap: 12, flexWrap: 'wrap'}}>
                  <button className="btn btn-primary" onClick={handleSyncSheets} disabled={syncingSheets}>
                    {syncingSheets ? '⏳ Menyinkronkan...' : '🔄 Sinkronkan Data'}
                  </button>
                  <button className="btn btn-outline" onClick={handleCreateSheet} disabled={creatingSheet}>
                    {creatingSheet ? '⏳ Membuat...' : '✨ Buat Sheet Baru'}
                  </button>
                  <button className="btn btn-sm btn-outline" onClick={handleDisconnectSheets}>
                    🔌 Putus
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{display: 'flex', gap: 12, marginBottom: 12}}>
                  <input type="text" className="form-control" placeholder="Paste URL Google Sheets..." value={sheetInput} onChange={e => setSheetInput(e.target.value)} style={{flex: 1}} />
                  <button className="btn btn-primary" onClick={handleConnectSheets}>
                    🔗 Hubungkan
                  </button>
                </div>
                <button className="btn btn-outline" onClick={handleCreateSheet} disabled={creatingSheet}>
                  {creatingSheet ? '⏳ Membuat...' : '✨ Buat Google Sheets Baru'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ======== GOOGLE DRIVE ======== */}
        <div className="card" style={{marginBottom: 24}}>
          <div className="card-header">
            <span className="card-title">🔗 Google Drive — {sectionName}</span>
          </div>
          <div className="card-body">
            <p style={{fontSize: 13, color: 'var(--text-muted)', marginBottom: 16}}>
              Hubungkan akun Google Drive untuk upload foto otomatis dari Operator.
            </p>

            <div style={{display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8, background: isConnected ? '#f0fdf4' : '#fefce8', border: `1px solid ${isConnected ? '#86efac' : '#fde047'}`, marginBottom: 16}}>
              <div style={{width: 10, height: 10, borderRadius: '50%', background: isConnected ? '#22c55e' : '#f59e0b'}}/>
              <span style={{fontWeight: 600, color: isConnected ? '#15803d' : '#92400e'}}>
                {isConnected ? '✅ Terhubung' : '⚠️ Belum Terhubung'}
              </span>
            </div>

            <div style={{display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16}}>
              {!isConnected ? (
                <button type="button" onClick={handleConnectGoogle} style={{display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, fontWeight: 600, background: '#4285F4', color: '#fff', border: 'none', cursor: 'pointer'}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Login dengan Google
                </button>
              ) : (
                <>
                  <button type="button" onClick={handleConnectGoogle} style={{padding: '9px 16px', borderRadius: 8, background: '#f0f9ff', color: '#0369a1', border: '1px solid #7dd3fc', cursor: 'pointer'}}>
                    🔄 Ganti Akun
                  </button>
                  <button type="button" onClick={() => setShowDisconnectConfirm(true)} disabled={disconnecting} style={{padding: '9px 16px', borderRadius: 8, background: '#fff1f2', color: '#be123c', border: '1px solid #fda4af', cursor: 'pointer'}}>
                    {disconnecting ? 'Memutus...' : '🔌 Putuskan'}
                  </button>
                </>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" style={{fontWeight: 600}}>Root Folder ID Google Drive</label>
              <input type="text" className="form-control" placeholder="Paste URL atau ID Folder" value={settings.google_root_folder_id} onChange={e => setSettings({...settings, google_root_folder_id: extractFolderId(e.target.value)})} />
            </div>
          </div>
        </div>

        {showDisconnectConfirm && (
          <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999}}>
            <div style={{background: '#fff', borderRadius: 14, padding: 32, maxWidth: 420, width: '90%'}}>
              <h3 style={{marginTop: 0}}>🔌 Putuskan Koneksi Google Drive?</h3>
              <p style={{color: '#64748b', marginTop: 8}}>Upload foto tidak akan berfungsi sampai Anda menghubungkan akun baru.</p>
              <div style={{display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24}}>
                <button onClick={() => setShowDisconnectConfirm(false)} style={{padding: '9px 18px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer'}}>Batal</button>
                <button onClick={handleDisconnect} style={{padding: '9px 18px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 600}}>Ya, Putuskan</button>
              </div>
            </div>
          </div>
        )}

        {/* ======== PENGATURAN PDF ======== */}
        <div className="card">
          <div className="card-header"><span className="card-title">📄 Kredensial Dokumen — {sectionName}</span></div>
          <div className="card-body">
            {message && <div style={{padding: 12, marginBottom: 16, background: message.includes('Gagal') || message.includes('❌') || message.includes('⚠️') ? '#fee2e2' : '#dcfce7', color: message.includes('Gagal') || message.includes('❌') || message.includes('⚠️') ? '#991b1b' : '#166534', borderRadius: 6}}>{message}</div>}
            <form onSubmit={saveSettings}>
              <div className="form-group">
                <label className="form-label">Program</label>
                <input type="text" className="form-control" placeholder="Contoh: PENGELOLAAN SUMBER DAYA AIR" value={settings.pdf_program} onChange={e => setSettings({...settings, pdf_program: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Kegiatan</label>
                <input type="text" className="form-control" placeholder="Contoh: PENGELOLAAN SDA..." value={settings.pdf_kegiatan} onChange={e => setSettings({...settings, pdf_kegiatan: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Sub Kegiatan</label>
                <input type="text" className="form-control" placeholder="Contoh: NORMALISASI SUNGAI" value={settings.pdf_sub_kegiatan} onChange={e => setSettings({...settings, pdf_sub_kegiatan: e.target.value})} />
              </div>
              <div style={{display:'flex', gap: 16}}>
                <div className="form-group" style={{flex:1}}>
                  <label className="form-label">Nama Staf</label>
                  <input type="text" className="form-control" placeholder="Nama Staf Tanda Tangan" value={settings.pdf_nama_staf} onChange={e => setSettings({...settings, pdf_nama_staf: e.target.value})} />
                </div>
                <div className="form-group" style={{flex:1}}>
                  <label className="form-label">NIP Staf</label>
                  <input type="text" className="form-control" placeholder="NIP" value={settings.pdf_nip_staf} onChange={e => setSettings({...settings, pdf_nip_staf: e.target.value})} />
                </div>
              </div>
              <div style={{marginTop: 24, display: 'flex', justifyContent: 'flex-end'}}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Menyimpan...' : '💾 Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
