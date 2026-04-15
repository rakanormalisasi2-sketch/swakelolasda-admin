'use client';
import { useEffect, useState } from 'react';
import { getStorageUsage } from '@/lib/backup';

/**
 * Komponen warning storage hampir penuh
 * Muncul di setiap dashboard admin saat storage >= 70%
 */
export default function StorageWarning() {
  const [storageInfo, setStorageInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkStorage = async () => {
      const info = await getStorageUsage();
      setStorageInfo(info);
      setLoading(false);
    };
    checkStorage();
  }, []);

  // Jangan tampilkan jika sudah di-dismiss atau loading
  if (loading || dismissed) return null;
  if (!storageInfo || !storageInfo.storage?.isWarning) return null;

  const { usagePercent, estimatedMB, limitMB } = storageInfo.storage;
  const isCritical = storageInfo.storage.isCritical;

  return (
    <div style={{
      padding: '12px 16px',
      marginBottom: 16,
      borderRadius: 8,
      background: isCritical ? '#fee2e2' : '#fef9c3',
      border: `1px solid ${isCritical ? '#fecaca' : '#fef08a'}`,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap'
    }}>
      {/* Icon */}
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 8,
        background: isCritical ? '#dc2626' : '#d97706',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20,
        flexShrink: 0
      }}>
        {isCritical ? '🚨' : '⚠️'}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{
          fontWeight: 700,
          fontSize: 14,
          color: isCritical ? '#991b1b' : '#92400e',
          marginBottom: 2
        }}>
          {isCritical 
            ? '🚨 DATABASE HAMPIR PENUH!' 
            : '⚠️ Storage Database Hampir Penuh'}
        </div>
        <div style={{ fontSize: 12, color: isCritical ? '#b91c1c' : '#a16207' }}>
          Penggunaan: <strong>{usagePercent}%</strong> ({estimatedMB} MB / {limitMB} MB)
          {' | '} Segera backup data dan pertimbangkan migrate.
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <a 
          href="/dashboard/superadmin/backup-restore" 
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            background: isCritical ? '#dc2626' : '#d97706',
            color: '#fff',
            fontWeight: 600,
            fontSize: 12,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          💾 Backup Data
        </a>
        <button
          onClick={() => setDismissed(true)}
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            background: 'transparent',
            color: isCritical ? '#991b1b' : '#a16207',
            border: `1px solid ${isCritical ? '#fecaca' : '#fef08a'}`,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

/**
 * Komponen badge status storage (ringkas)
 * Untuk di tampilkan di header/sidebar
 */
export function StorageBadge() {
  const [storageInfo, setStorageInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStorage = async () => {
      const info = await getStorageUsage();
      setStorageInfo(info);
      setLoading(false);
    };
    checkStorage();
  }, []);

  if (loading) return null;
  if (!storageInfo?.storage?.isWarning) return null;

  const { usagePercent } = storageInfo.storage;
  const isCritical = storageInfo.storage.isCritical;

  return (
    <a 
      href="/dashboard/superadmin/backup-restore"
      title={`Storage: ${usagePercent}%`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 8px',
        borderRadius: 12,
        background: isCritical ? '#fee2e2' : '#fef9c3',
        color: isCritical ? '#dc2626' : '#d97706',
        fontSize: 11,
        fontWeight: 700,
        textDecoration: 'none'
      }}
    >
      💾 {usagePercent}%
    </a>
  );
}
