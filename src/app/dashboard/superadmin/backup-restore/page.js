'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  getStorageUsage, 
  exportAllData, 
  downloadBackup, 
  saveToLocalStorage,
  getLocalBackups,
  loadLocalBackup,
  restoreToSupabase,
  clearSupabaseData
} from '@/lib/backup';
import {
  getAllSections,
  getSectionSpreadsheet,
  saveSectionSpreadsheet,
  createSectionSpreadsheet,
  disconnectSectionSheets,
  exportSectionToGoogleSheets
} from '@/lib/googleSheets';
import { supabase } from '@/lib/supabase';

export default function BackupRestorePage() {
  const { profile } = useAuth();
  const isSuperAdmin = profile?.role === 'superadmin';
  
  const [storageInfo, setStorageInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backups, setBackups] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [sections, setSections] = useState([]);
  const [sheetConnections, setSheetConnections] = useState({});
  const [spreadsheetInput, setSpreadsheetInput] = useState('');
  const [creatingSheet, setCreatingSheet] = useState(false);
  const [syncing, setSyncing] = useState({});

  const loadStorageUsage = useCallback(async () => {
    setLoading(true);
    const usage = await getStorageUsage();
    setStorageInfo(usage);
    setLoading(false);
  }, []);

  const loadLocalBackups = useCallback(async () => {
    const result = await getLocalBackups();
    if (result.success) {
      setBackups(result.backups);
    }
  }, []);

  const loadSheetConnections = useCallback(() => {
    const allSections = getAllSections();
    setSections(allSections);
    const connections = {};
    allSections.forEach(section => {
      connections[section.id] = getSectionSpreadsheet(section.id);
    });
    setSheetConnections(connections);
  }, []);

  useEffect(() => {
    loadStorageUsage();
    loadLocalBackups();
    loadSheetConnections();
  }, [loadStorageUsage, loadLocalBackups, loadSheetConnections]);

  const handleExportDownload = async () => {
    setExporting(true);
    try {
      const result = await exportAllData();
      if (result.success) {
        const filename = downloadBackup(result.data);
        await saveToLocalStorage(result.data);
        alert('Backup berhasil! File: ' + filename + ' | Total: ' + result.totalRecords + ' records');
        loadLocalBackups();
      } else {
        alert('Export gagal: ' + result.error);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
    setExporting(false);
  };

  const handleSaveLocal = async () => {
    setExporting(true);
    try {
      const result = await exportAllData();
      if (result.success) {
        await saveToLocalStorage(result.data);
        alert('Tersimpan di local! Total: ' + result.totalRecords + ' records');
        loadLocalBackups();
      } else {
        alert('Gagal: ' + result.error);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
    setExporting(false);
  };

  const handleRestore = async (backupId) => {
    if (!confirm('PERINGATAN! Restore akan menimpa DATA SAAT INI di Supabase! Lanjutkan?')) return;
    setRestoring(true);
    try {
      const result = await loadLocalBackup(backupId);
      if (result.success) {
        const restoreResult = await restoreToSupabase(result.backup.data);
        if (restoreResult.success) {
          alert('Restore berhasil! ' + restoreResult.totalInserted + ' records di-restore. Google Sheets config: TIDAK dihapus');
          loadStorageUsage();
        } else {
          alert('Restore gagal: ' + restoreResult.error);
        }
      } else {
        alert('Gagal load backup: ' + result.error);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
    setRestoring(false);
  };

  const handleClearSupabase = async (clearUsers) => {
    const msg = clearUsers 
      ? 'PERINGATAN SEVERE! Ini akan MENGHAPUS SEMUA DATA termasuk user profiles! TIDAK BISA DIBATALKAN! Lanjutkan?'
      : 'PERINGATAN! Ini akan MENGHAPUS semua data kerja. User profiles TIDAK dihapus. Google Sheets config: TIDAK dihapus. Lanjutkan?';
    
    if (!confirm(msg)) return;
    if (!confirm('Serius mau hapus? Ketik OK untuk konfirmasi final.')) return;
    
    setClearing(true);
    try {
      const result = await clearSupabaseData(clearUsers);
      if (result.success) {
        alert('Data berhasil dihapus! Google Sheets config: TIDAK dihapus');
        loadStorageUsage();
      } else {
        alert('Gagal: ' + result.error);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
    setClearing(false);
  };

  const handleFileRestore = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!confirm('PERINGATAN! Restore dari file akan menimpa DATA SAAT INI di Supabase! Lanjutkan?')) {
      event.target.value = '';
      return;
    }

    setRestoring(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const backupData = JSON.parse(e.target.result);
          const restoreResult = await restoreToSupabase(backupData);
          if (restoreResult.success) {
            alert('Restore dari file berhasil! ' + restoreResult.totalInserted + ' records di-restore.');
            loadStorageUsage();
          } else {
            alert('Restore gagal: ' + restoreResult.error);
          }
        } catch (err) {
          alert('Format file JSON tidak valid: ' + err.message);
        }
        setRestoring(false);
        event.target.value = '';
      };
      reader.readAsText(file);
    } catch (error) {
      alert('Error membaca file: ' + error.message);
      setRestoring(false);
      event.target.value = '';
    }
  };

  const handleConnectSheets = (sectionId) => {
    const url = spreadsheetInput.trim();
    if (!url) {
      alert('Masukkan URL Google Sheets!');
      return;
    }
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      alert('URL Google Sheets tidak valid!');
      return;
    }
    const spreadsheetId = match[1];
    const saved = saveSectionSpreadsheet(sectionId, spreadsheetId, url);
    setSheetConnections(prev => ({ ...prev, [sectionId]: saved }));
    setSpreadsheetInput('');
    alert('Google Sheets berhasil disambungkan!');
  };

  const handleCreateSpreadsheet = async (sectionId) => {
    setCreatingSheet(true);
    try {
      const sectionName = sections.find(s => s.id === sectionId)?.name || 'Section';
      const result = await createSectionSpreadsheet(sectionId, sectionName + ' - ' + new Date().toLocaleDateString('id-ID'));
      if (result.success) {
        setSheetConnections(prev => ({ ...prev, [sectionId]: result }));
        alert('Spreadsheet baru berhasil dibuat!');
      } else {
        alert('Gagal: ' + result.error);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
    setCreatingSheet(false);
  };

  const handleSyncToSheets = async (sectionId) => {
    setSyncing(prev => ({ ...prev, [sectionId]: true }));
    try {
      const connection = sheetConnections[sectionId];
      if (!connection) {
        alert('Hubungkan Google Sheets terlebih dahulu!');
        setSyncing(prev => ({ ...prev, [sectionId]: false }));
        return;
      }
      
      const [assignmentsRes, equipmentRes, absensiRes] = await Promise.all([
        supabase.from('assignments').select('*'),
        supabase.from('heavy_equipment').select('*'),
        supabase.from('absensi').select('*')
      ]);
      
      const result = await exportSectionToGoogleSheets(sectionId, {
        assignments: assignmentsRes.data || [],
        equipment: equipmentRes.data || [],
        absensi: absensiRes.data || []
      }, connection.spreadsheetId);
      
      if (result.success) {
        alert('Sinkronisasi berhasil!');
      } else {
        alert('Sinkronisasi gagal: ' + result.error);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
    setSyncing(prev => ({ ...prev, [sectionId]: false }));
  };

  const handleDisconnect = (sectionId) => {
    if (!confirm('Putus sambungan Google Sheets?')) return;
    disconnectSectionSheets(sectionId);
    setSheetConnections(prev => ({ ...prev, [sectionId]: null }));
    alert('Berhasil diputus.');
  };

  if (!isSuperAdmin) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>Akses Ditolak</h2>
        <p>Halaman ini hanya untuk Super Admin.</p>
      </div>
    );
  }

  const storagePercent = parseFloat(storageInfo?.storage?.usagePercent || 0);
  const progressWidth = Math.min(storagePercent, 100) + '%';

  return (
    <div style={{ padding: 24 }}>
      <div className="header">
        <div>
          <div className="header-title">Backup, Restore and Google Sheets</div>
          <div className="header-subtitle">Kelola backup database dan integrasi Google Sheets per seksi</div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 24 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Storage Status</span>
          </div>
          <div className="card-body">
            {loading ? (
              <p>Loading...</p>
            ) : storageInfo?.error ? (
              <p style={{ color: 'red' }}>Error: {storageInfo.error}</p>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
                  <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#e8f0fe', color: '#1a56db' }}></div>
                    <div>
                      <div className="stat-value">{storageInfo?.records?.total || 0}</div>
                      <div className="stat-label">Total Records</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}></div>
                    <div>
                      <div className="stat-value">{storageInfo?.storage?.estimatedMB || 0} MB</div>
                      <div className="stat-label">Used</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}></div>
                    <div>
                      <div className="stat-value">{storageInfo?.storage?.limitMB || 500} MB</div>
                      <div className="stat-label">Free Tier Limit</div>
                    </div>
                  </div>
                </div>
                
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Usage:</span>
                    <span style={{ color: storageInfo?.storage?.isCritical ? '#dc2626' : storageInfo?.storage?.isWarning ? '#d97706' : 'inherit' }}>
                      {storagePercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="progress-bar-wrapper">
                    <div 
                      className={"progress-bar-fill " + (storageInfo?.storage?.isCritical ? 'red' : storageInfo?.storage?.isWarning ? 'orange' : '')}
                      style={{ width: progressWidth }}
                    />
                  </div>
                </div>
                
                {storageInfo?.storage?.isWarning && (
                  <div className="alert alert-warning">
                    Warning! Storage usage at {storagePercent.toFixed(1)}%. Please backup and consider migration.
                  </div>
                )}
                {storageInfo?.storage?.isCritical && (
                  <div className="alert alert-danger">
                    CRITICAL! Storage almost full ({storagePercent.toFixed(1)}%). Backup immediately!
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Database Backup</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <button className="btn btn-primary" onClick={handleExportDownload} disabled={exporting}>
                Export and Download
              </button>
              <button className="btn btn-outline" onClick={handleSaveLocal} disabled={exporting}>
                Save to Local
              </button>
              <div style={{ marginLeft: 'auto' }}>
                <input 
                  type="file" 
                  id="restore-upload" 
                  hidden 
                  accept=".json" 
                  onChange={handleFileRestore}
                />
                <button 
                  className="btn btn-success" 
                  onClick={() => document.getElementById('restore-upload').click()}
                  disabled={restoring}
                >
                  {restoring ? 'Restoring...' : 'Restore from JSON File'}
                </button>
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Backup stored as JSON file, can be restored anytime.
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Local Backups ({backups.length})</span>
            <button className="btn btn-sm btn-outline" onClick={loadLocalBackups}>Refresh</button>
          </div>
          <div className="card-body">
            {backups.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
                No backups saved yet.
              </p>
            ) : (
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Records</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backups.map(backup => (
                      <tr key={backup.id}>
                        <td>{new Date(backup.createdAt).toLocaleString('id-ID')}</td>
                        <td>{backup.totalRecords}</td>
                        <td>
                          <button 
                            className="btn btn-sm btn-success" 
                            onClick={() => handleRestore(backup.id)}
                            disabled={restoring}
                          >
                            Restore
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Google Sheets Integration</span>
          </div>
          <div className="card-body">
            <div className="alert alert-info" style={{ marginBottom: 16 }}>
              Each section can have its own Google Sheets for report export.
              Google Sheets config will NOT be deleted during restore/clear.
            </div>
            
            <div style={{ display: 'grid', gap: 16 }}>
              {sections.map(section => (
                <div key={section.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <h4 style={{ margin: 0 }}>{section.name}</h4>
                      <p style={{ margin: 4, fontSize: 12, color: 'var(--text-muted)' }}>{section.description}</p>
                    </div>
                    {sheetConnections[section.id] ? (
                      <span className="badge badge-success">Connected</span>
                    ) : (
                      <span className="badge badge-neutral">Not Connected</span>
                    )}
                  </div>
                  
                  {sheetConnections[section.id] ? (
                    <div>
                      <p style={{ fontSize: 12, marginBottom: 8 }}>
                        <a href={sheetConnections[section.id].spreadsheetUrl} target="_blank" rel="noopener noreferrer">
                          {sheetConnections[section.id].spreadsheetUrl}
                        </a>
                      </p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button 
                          className="btn btn-sm btn-primary" 
                          onClick={() => handleSyncToSheets(section.id)}
                          disabled={syncing[section.id]}
                        >
                          {syncing[section.id] ? 'Syncing...' : 'Sync Data'}
                        </button>
                        <button 
                          className="btn btn-sm btn-outline" 
                          onClick={() => handleDisconnect(section.id)}
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="Paste Google Sheets URL..."
                          value={spreadsheetInput}
                          onChange={(e) => setSpreadsheetInput(e.target.value)}
                          style={{ flex: 1 }}
                        />
                        <button 
                          className="btn btn-sm btn-primary" 
                          onClick={() => handleConnectSheets(section.id)}
                        >
                          Connect
                        </button>
                      </div>
                      <button 
                        className="btn btn-sm btn-outline" 
                        onClick={() => handleCreateSpreadsheet(section.id)}
                        disabled={creatingSheet}
                      >
                        {creatingSheet ? 'Creating...' : 'Create New'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card" style={{ borderColor: '#dc2626', borderWidth: 2 }}>
          <div className="card-header" style={{ background: '#fee2e2' }}>
            <span className="card-title">Danger Zone</span>
          </div>
          <div className="card-body">
            <div className="alert alert-danger" style={{ marginBottom: 16 }}>
              Warning! Actions below cannot be undone!
              Google Sheets config will be preserved in localStorage.
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button 
                className="btn btn-warning" 
                onClick={() => handleClearSupabase(false)}
                disabled={clearing}
              >
                Clear Work Data
              </button>
              <button 
                className="btn btn-danger" 
                onClick={() => handleClearSupabase(true)}
                disabled={clearing}
              >
                Clear ALL Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
