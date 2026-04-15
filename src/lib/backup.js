/**
 * BACKUP & RESTORE MODULE
 * 
 * Fitur:
 * - Backup database ke local storage
 * - Restore dari local storage ke Supabase
 * - Monitoring penggunaan storage
 * - Google Sheets config TIDAK akan dihapus saat clear/restore
 */

import { supabaseAdmin } from './supabase-admin';

// =====================================================
// GOOGLE SHEETS CONFIG - TIDAK AKAN DIHAPUS
// =====================================================
const GOOGLE_SHEETS_STORAGE_KEYS = ['sheets_normalisasi', 'sheets_embung', 'sheets_peralatan'];

/**
 * Get storage usage from Supabase
 */
export async function getStorageUsage() {
  try {
    // Get database size approximation from assignments count
    const { count: assignmentsCount } = await supabaseAdmin
      .from('assignments')
      .select('*', { count: 'exact', head: true });
    
    const { count: equipmentCount } = await supabaseAdmin
      .from('heavy_equipment')
      .select('*', { count: 'exact', head: true });
    
    const { count: usersCount } = await supabaseAdmin
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });
    
    const { count: absensiCount } = await supabaseAdmin
      .from('absensi')
      .select('*', { count: 'exact', head: true });
    
    const { count: progressCount } = await supabaseAdmin
      .from('progress_laporan')
      .select('*', { count: 'exact', head: true });

    // Estimasi ukuran (bytes) - asumsi rata-rata 1KB per record
    const ESTIMATED_BYTES_PER_RECORD = 1024;
    const totalRecords = (assignmentsCount || 0) + (equipmentCount || 0) + 
                         (usersCount || 0) + (absensiCount || 0) + (progressCount || 0);
    const estimatedSize = totalRecords * ESTIMATED_BYTES_PER_RECORD;
    
    // Supabase free tier limit: 500MB = 524288000 bytes
    const FREE_TIER_LIMIT = 524288000;
    const usagePercent = (estimatedSize / FREE_TIER_LIMIT) * 100;
    
    return {
      records: {
        assignments: assignmentsCount || 0,
        equipment: equipmentCount || 0,
        users: usersCount || 0,
        absensi: absensiCount || 0,
        progress: progressCount || 0,
        total: totalRecords
      },
      storage: {
        estimatedBytes: estimatedSize,
        estimatedMB: (estimatedSize / (1024 * 1024)).toFixed(2),
        limitBytes: FREE_TIER_LIMIT,
        limitMB: (FREE_TIER_LIMIT / (1024 * 1024)).toFixed(0),
        usagePercent: usagePercent.toFixed(1),
        isWarning: usagePercent >= 70,
        isCritical: usagePercent >= 90,
        isFull: usagePercent >= 100
      },
      needsBackup: usagePercent >= 70,
      needsMigration: usagePercent >= 90
    };
  } catch (error) {
    console.error('Error getting storage usage:', error);
    return {
      error: error.message,
      needsBackup: false,
      needsMigration: false
    };
  }
}

/**
 * Export semua data sebagai JSON
 */
export async function exportAllData() {
  try {
    console.log('[Backup] Starting full export...');
    
    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      tables: {}
    };

    // 1. Export assignments
    const { data: assignments, error: aErr } = await supabaseAdmin
      .from('assignments')
      .select('*');
    exportData.tables.assignments = { data: assignments || [], count: assignments?.length || 0 };
    console.log('[Backup] Assignments:', assignments?.length || 0);

    // 2. Export heavy_equipment
    const { data: equipment, error: eErr } = await supabaseAdmin
      .from('heavy_equipment')
      .select('*');
    exportData.tables.heavy_equipment = { data: equipment || [], count: equipment?.length || 0 };
    console.log('[Backup] Equipment:', equipment?.length || 0);

    // 3. Export user_profiles
    const { data: users, error: uErr } = await supabaseAdmin
      .from('user_profiles')
      .select('*');
    exportData.tables.user_profiles = { data: users || [], count: users?.length || 0 };
    console.log('[Backup] Users:', users?.length || 0);

    // 4. Export absensi
    const { data: absensi, error: abErr } = await supabaseAdmin
      .from('absensi')
      .select('*');
    exportData.tables.absensi = { data: absensi || [], count: absensi?.length || 0 };
    console.log('[Backup] Absensi:', absensi?.length || 0);

    // 5. Export progress_laporan
    const { data: progress, error: pErr } = await supabaseAdmin
      .from('progress_laporan')
      .select('*');
    exportData.tables.progress_laporan = { data: progress || [], count: progress?.length || 0 };
    console.log('[Backup] Progress:', progress?.length || 0);

    // 6. Export work_logs
    const { data: workLogs, error: wErr } = await supabaseAdmin
      .from('user_work_logs')
      .select('*');
    exportData.tables.user_work_logs = { data: workLogs || [], count: workLogs?.length || 0 };
    console.log('[Backup] Work Logs:', workLogs?.length || 0);

    // Check for errors
    const errors = [aErr, eErr, uErr, abErr, pErr, wErr].filter(Boolean);
    if (errors.length > 0) {
      console.error('[Backup] Some exports had errors:', errors);
    }

    return {
      success: true,
      data: exportData,
      totalRecords: exportData.tables.assignments.count + 
                    exportData.tables.heavy_equipment.count +
                    exportData.tables.user_profiles.count +
                    exportData.tables.absensi.count +
                    exportData.tables.progress_laporan.count +
                    exportData.tables.user_work_logs.count
    };
  } catch (error) {
    console.error('[Backup] Export failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Download backup sebagai file JSON
 */
export function downloadBackup(data, filename = null) {
  const date = new Date().toISOString().split('T')[0];
  const name = filename || `swakelola_backup_${date}.json`;
  
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  return name;
}

/**
 * Save backup to local storage (IndexedDB)
 */
export async function saveToLocalStorage(data) {
  try {
    const dbName = 'swakelola_backups';
    const version = 1;
    
    // Open IndexedDB
    const request = indexedDB.open(dbName, version);
    
    return new Promise((resolve, reject) => {
      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const tx = db.transaction('backups', 'readwrite');
        const store = tx.objectStore('backups');
        
        const backupRecord = {
          id: `backup_${Date.now()}`,
          createdAt: new Date().toISOString(),
          data: data,
          totalRecords: data.tables?.assignments?.count || 0
        };
        
        const addRequest = store.add(backupRecord);
        
        addRequest.onsuccess = () => {
          console.log('[Backup] Saved to local storage');
          resolve({ success: true, id: backupRecord.id });
        };
        
        addRequest.onerror = () => reject(new Error('Failed to save backup'));
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('backups')) {
          db.createObjectStore('backups', { keyPath: 'id' });
        }
      };
    });
  } catch (error) {
    console.error('[Backup] Save to local failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all local backups
 */
export async function getLocalBackups() {
  try {
    const dbName = 'swakelola_backups';
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName);
      
      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('backups')) {
          resolve({ success: true, backups: [] });
          return;
        }
        
        const tx = db.transaction('backups', 'readonly');
        const store = tx.objectStore('backups');
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          const backups = getAllRequest.result
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map(b => ({
              id: b.id,
              createdAt: b.createdAt,
              totalRecords: b.totalRecords,
              sizeKB: (JSON.stringify(b.data).length / 1024).toFixed(1)
            }));
          resolve({ success: true, backups });
        };
        
        getAllRequest.onerror = () => reject(new Error('Failed to get backups'));
      };
    });
  } catch (error) {
    console.error('[Backup] Get local backups failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Load specific backup from local storage
 */
export async function loadLocalBackup(backupId) {
  try {
    const dbName = 'swakelola_backups';
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName);
      
      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const tx = db.transaction('backups', 'readonly');
        const store = tx.objectStore('backups');
        const getRequest = store.get(backupId);
        
        getRequest.onsuccess = () => {
          if (getRequest.result) {
            resolve({ success: true, backup: getRequest.result });
          } else {
            resolve({ success: false, error: 'Backup not found' });
          }
        };
        
        getRequest.onerror = () => reject(new Error('Failed to load backup'));
      };
    });
  } catch (error) {
    console.error('[Backup] Load backup failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete local backup
 */
export async function deleteLocalBackup(backupId) {
  try {
    const dbName = 'swakelola_backups';
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName);
      
      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const tx = db.transaction('backups', 'readwrite');
        const store = tx.objectStore('backups');
        const deleteRequest = store.delete(backupId);
        
        deleteRequest.onsuccess = () => {
          console.log('[Backup] Deleted local backup:', backupId);
          resolve({ success: true });
        };
        
        deleteRequest.onerror = () => reject(new Error('Failed to delete backup'));
      };
    });
  } catch (error) {
    console.error('[Backup] Delete backup failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Restore data from backup to Supabase
 * WARNING: This will overwrite existing data
 */
export async function restoreToSupabase(backupData) {
  try {
    console.log('[Restore] Starting restore to Supabase...');
    const results = [];
    
    // Helper function to upsert data
    const upsertTable = async (tableName, data) => {
      if (!data || data.length === 0) return { table: tableName, inserted: 0 };
      
      const { error } = await supabaseAdmin.from(tableName).upsert(data, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      });
      
      if (error) {
        console.error(`[Restore] Error restoring ${tableName}:`, error);
        return { table: tableName, inserted: 0, error: error.message };
      }
      
      console.log(`[Restore] Restored ${data.length} records to ${tableName}`);
      return { table: tableName, inserted: data.length };
    };

    // Restore in order (respecting foreign keys)
    const tableOrder = [
      'user_profiles',
      'heavy_equipment',
      'assignments',
      'absensi',
      'progress_laporan',
      'user_work_logs'
    ];

    for (const tableName of tableOrder) {
      if (backupData.tables && backupData.tables[tableName]) {
        const result = await upsertTable(tableName, backupData.tables[tableName].data);
        results.push(result);
      }
    }

    const totalInserted = results.reduce((sum, r) => sum + (r.inserted || 0), 0);
    
    console.log('[Restore] Complete:', results);
    
    return {
      success: true,
      results,
      totalInserted
    };
  } catch (error) {
    console.error('[Restore] Restore failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Clear all data from Supabase (use with caution!)
 * NOTE: Google Sheets config di localStorage TIDAK akan dihapus
 */
export async function clearSupabaseData(clearUsers = false) {
  try {
    console.log('[Clear] Starting to clear Supabase data...');
    console.log('[Clear] Google Sheets config will be PRESERVED in localStorage');
    
    // Tables to clear
    const tablesToClear = clearUsers 
      ? ['user_work_logs', 'progress_laporan', 'absensi', 'assignments', 'heavy_equipment', 'user_profiles']
      : ['user_work_logs', 'progress_laporan', 'absensi', 'assignments', 'heavy_equipment'];

    const results = [];
    
    for (const table of tablesToClear) {
      const { error } = await supabaseAdmin.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (error) {
        console.error(`[Clear] Error clearing ${table}:`, error);
        results.push({ table, error: error.message });
      } else {
        console.log(`[Clear] Cleared ${table}`);
        results.push({ table, cleared: true });
      }
    }

    return {
      success: true,
      results,
      preservedGoogleSheets: true
    };
  } catch (error) {
    console.error('[Clear] Clear failed:', error);
    return {
      success: false,
      error: error.message,
      preservedGoogleSheets: true
    };
  }
}

/**
 * Clear localStorage backups but KEEP Google Sheets config
 */
export async function clearLocalBackups() {
  try {
    console.log('[Clear] Clearing local backups...');
    console.log('[Clear] Google Sheets config will be PRESERVED');
    
    const dbName = 'swakelola_backups';
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName);
      
      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('backups')) {
          resolve({ success: true, message: 'No backups to clear' });
          return;
        }
        
        const tx = db.transaction('backups', 'readwrite');
        const store = tx.objectStore('backups');
        const clearRequest = store.clear();
        
        clearRequest.onsuccess = () => {
          console.log('[Clear] Local backups cleared');
          resolve({ success: true });
        };
        
        clearRequest.onerror = () => reject(new Error('Failed to clear backups'));
      };
    });
  } catch (error) {
    console.error('[Clear] Clear local failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Google Sheets config (will be preserved during clear)
 */
export function getGoogleSheetsConfig() {
  const config = {};
  GOOGLE_SHEETS_STORAGE_KEYS.forEach(key => {
    const stored = localStorage.getItem(key);
    if (stored) {
      config[key] = JSON.parse(stored);
    }
  });
  return config;
}

/**
 * Check if Google Sheets is connected for any section
 */
export function isAnyGoogleSheetsConnected() {
  return GOOGLE_SHEETS_STORAGE_KEYS.some(key => localStorage.getItem(key) !== null);
}
