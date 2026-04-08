'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function PengaturanSeksiPage() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState({ 
    spreadsheet_id: '', 
    gdrive_folder_id: '',
    pdf_sub_kegiatan: '',
    pdf_pekerjaan_prefix: '',
    pdf_nama_staf: '',
    pdf_nip_staf: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function loadSettings() {
      if (!profile?.role) return;
      const { data } = await supabase.from('section_settings').select('*').eq('role', profile.role).single();
      if (data) {
        setSettings({
          spreadsheet_id: data.spreadsheet_id || '',
          gdrive_folder_id: data.gdrive_folder_id || '',
          pdf_sub_kegiatan: data.pdf_sub_kegiatan || '',
          pdf_pekerjaan_prefix: data.pdf_pekerjaan_prefix || '',
          pdf_nama_staf: data.pdf_nama_staf || '',
          pdf_nip_staf: data.pdf_nip_staf || ''
        });
      }
      setLoading(false);
    }
    loadSettings();
  }, [profile]);

  const saveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    
    // Upsert logic
    const { error } = await supabase.from('section_settings').upsert({
      role: profile.role,
      spreadsheet_id: settings.spreadsheet_id,
      gdrive_folder_id: settings.gdrive_folder_id,
      pdf_sub_kegiatan: settings.pdf_sub_kegiatan,
      pdf_pekerjaan_prefix: settings.pdf_pekerjaan_prefix,
      pdf_nama_staf: settings.pdf_nama_staf,
      pdf_nip_staf: settings.pdf_nip_staf,
      updated_at: new Date().toISOString()
    }, { onConflict: 'role' });

    if (error) {
      setMessage('Gagal menyimpan pengaturan: ' + error.message);
    } else {
      setMessage('Pengaturan berhasil disimpan!');
    }
    setSaving(false);
  };

  if (loading) return <div style={{padding:40, textAlign:'center'}}>Memuat pengaturan...</div>;

  return (
    <>
      <div className="header">
        <div>
          <div className="header-title">Pengaturan Sistem</div>
          <div className="header-subtitle">Konfigurasi Sinkronisasi Eksternal API Google (G-Drive & Spreadsheet)</div>
        </div>
      </div>

      <div className="page-body" style={{maxWidth: 800}}>
        <div className="card">
          <div className="card-header"><span className="card-title">Kredensial Penampung Data — {profile.role === 'seksi_normalisasi' ? 'Seksi Normalisasi' : 'Seksi Embung'}</span></div>
          <div className="card-body">
            
            <div style={{background: 'var(--primary-light)', color: 'var(--primary-dark)', padding: 16, borderRadius: 8, marginBottom: 24, fontSize: 13.5, lineHeight: 1.6}}>
              <strong>Info Sistem:</strong> Web Admin ini telah dimodifikasi ulang untuk mendukung pencetakan mutlak (Cetak PDF) secara langsung di Browser, menghindari beban loading Google Script. Namun, data mentah Laporan Harian Operator (Jam Kerja, Progress, Foto) tetap akan dicadangkan ke Spreadsheet dan Folder Google Drive yang Anda tugaskan di bawah ini.
            </div>

            {message && <div style={{padding: 12, marginBottom: 20, background: message.includes('Gagal') ? '#fee2e2' : '#dcfce7', color: message.includes('Gagal') ? '#991b1b' : '#166534', borderRadius: 6}}>{message}</div>}

            <form onSubmit={saveSettings}>
              <div style={{display:'flex', gap:20, marginTop:10}}>
                <div className="form-group" style={{flex:1}}>
                  <label className="form-label" style={{fontWeight:600}}>Kepala Sub Kegiatan (Cetak PDF)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Contoh: NORMALISASI / RESTORASI SUNGAI"
                    value={settings.pdf_sub_kegiatan}
                    onChange={e => setSettings({...settings, pdf_sub_kegiatan: e.target.value})}
                  />
                </div>
                <div className="form-group" style={{flex:1}}>
                  <label className="form-label" style={{fontWeight:600}}>Prefix Pekerjaan (Cetak PDF)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Contoh: NORMALISASI SUNGAI / REHABILITASI EMBUNG"
                    value={settings.pdf_pekerjaan_prefix}
                    onChange={e => setSettings({...settings, pdf_pekerjaan_prefix: e.target.value})}
                  />
                </div>
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

              <div className="form-group" style={{marginTop:24}}>
                <label className="form-label" style={{fontWeight:600}}>Google Spreadsheet ID Baru</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Contoh: 10WcZShjXTwi1yW38P4..."
                  value={settings.spreadsheet_id}
                  onChange={e => setSettings({...settings, spreadsheet_id: e.target.value})}
                />
                <div className="text-xs text-muted mt-2">
                  ID ini bisa Anda dapatkan pada URL Spreadsheet Anda di antara <code style={{background:'#eee', padding:'2px 4px', borderRadius:3}}>/d/</code> dan <code style={{background:'#eee', padding:'2px 4px', borderRadius:3}}>/edit</code>.
                </div>
              </div>

              <div className="form-group" style={{marginTop:15}}>
                <label className="form-label" style={{fontWeight:600}}>Google Drive Folder ID (Penampung Manual / Foto Mentah)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Contoh: 1xclwO40trzKZoqDgE..."
                  value={settings.gdrive_folder_id}
                  onChange={e => setSettings({...settings, gdrive_folder_id: e.target.value})}
                />
                <div className="text-xs text-muted mt-2">
                  Folder peninggalan dari Sistem lama. Folder ID diambil dari URL Google Drive Anda pada segment terakhir URL setelah <code style={{background:'#eee', padding:'2px 4px', borderRadius:3}}>/folders/</code>.
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
