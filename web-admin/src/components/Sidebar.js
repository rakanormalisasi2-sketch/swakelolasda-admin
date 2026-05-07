'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const NAV_CONFIG = {
  superadmin: [
    {
      section: 'Manajemen',
      items: [
        { href: '/dashboard/superadmin', label: 'Dashboard', icon: 'home' },
        { href: '/dashboard/status-operasional', label: 'Status Operasional', icon: 'truck' },
        { href: '/dashboard/superadmin/pengguna', label: 'Kelola Pengguna', icon: 'users' },
      ],
    },
    {
      section: 'Sistem',
      items: [
        { href: '/dashboard/superadmin/backup-restore', label: 'Backup & Restore', icon: 'database' },
      ],
    },
  ],
  peralatan: [
    {
      section: 'Peralatan',
      items: [
        { href: '/dashboard/peralatan', label: 'Status Alat Berat', icon: 'truck' },
        { href: '/dashboard/peralatan/gudang', label: 'Sistem Gudang', icon: 'warehouse', badgeKey: 'pendingRequests' },
        { href: '/dashboard/peralatan/sebaran', label: 'Peta Sebaran Alat', icon: 'map' },
        { href: '/dashboard/peralatan/perbaikan', label: 'Rekap Perbaikan', icon: 'tool', badgeKey: 'activeRepairs' },
        { href: '/dashboard/status-operasional', label: 'Status Operasional', icon: 'clipboard' },
        { href: '/dashboard/peralatan/pengaturan', label: 'Pengaturan Sistem', icon: 'settings' },
      ],
    },
  ],
  seksi_normalisasi: [
    {
      section: 'Pekerjaan',
      items: [
        { href: '/dashboard/seksi', label: 'Dashboard', icon: 'home' },
        { href: '/dashboard/seksi/penugasan', label: 'Penugasan Operator', icon: 'clipboard' },
        { href: '/dashboard/status-operasional', label: 'Status Operasional', icon: 'truck' },
        { href: '/dashboard/seksi/laporan', label: 'Laporan Pelaksanaan', icon: 'file-text' },
        { href: '/dashboard/seksi/bbm', label: 'Manajemen BBM', icon: 'database' },
        { href: '/dashboard/seksi/perhitungan-rap', label: 'Perhitungan RAP', icon: 'calculator' },
        { href: '/dashboard/seksi/checklist-normalisasi', label: 'Checklist Normalisasi', icon: 'clipboard' },
        { href: '/dashboard/seksi/proposal', label: 'Perencanaan Proposal', icon: 'book' },
        { href: '/dashboard/seksi/pengaturan', label: 'Pengaturan Sistem', icon: 'settings' },
      ],
    },
  ],
  seksi_embung: [
    {
      section: 'Pekerjaan',
      items: [
        { href: '/dashboard/seksi', label: 'Dashboard', icon: 'home' },
        { href: '/dashboard/seksi/penugasan', label: 'Penugasan Operator', icon: 'clipboard' },
        { href: '/dashboard/status-operasional', label: 'Status Operasional', icon: 'truck' },
        { href: '/dashboard/seksi/laporan', label: 'Laporan Pelaksanaan', icon: 'file-text' },
        { href: '/dashboard/seksi/bbm', label: 'Manajemen BBM', icon: 'database' },
        { href: '/dashboard/seksi/proposal', label: 'Perencanaan Proposal', icon: 'book' },
        { href: '/dashboard/seksi/pengaturan', label: 'Pengaturan Sistem', icon: 'settings' },
      ],
    },
  ],
  operator: [
    {
      section: 'Operator',
      items: [
        { href: '/dashboard/operator', label: 'Tugas Saya', icon: 'home' },
        { href: '/dashboard/operator/laporan', label: 'Laporan Saya', icon: 'file-text' },
        { href: '/dashboard/personil', label: 'Status Personil', icon: 'users' },
      ],
    },
  ],
};

const ICONS = {
  home: (
    <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  users: (
    <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  truck: (
    <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2.5 0M13 16H9m4 0h2m4 0h1.5a.5.5 0 00.5-.5v-4.374a1 1 0 00-.276-.692l-3-3.13A1 1 0 0017 7h-4v9z" />
    </svg>
  ),
  tool: (
    <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  settings: (
    <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  ),
  clipboard: (
    <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  'file-text': (
    <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  book: (
    <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  logout: (
    <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  database: (
    <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  ),
  calculator: (
    <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  map: (
    <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  ),
  warehouse: (
    <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
};

const ROLE_LABELS = {
  superadmin: 'Superadmin',
  peralatan: 'Tim Peralatan',
  seksi_normalisasi: 'Seksi Normalisasi',
  seksi_embung: 'Seksi Embung',
  operator: 'Operator',
};

export default function Sidebar({ maintenanceCount = 0 }) {
  const { profile, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [counts, setCounts] = useState({ pendingRequests: 0, activeRepairs: 0 });

  const role = profile?.role || 'operator';
  const navSections = NAV_CONFIG[role] || NAV_CONFIG.operator;
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  useEffect(() => {
    if (!profile) return;
    const isAllowed = profile.role === 'peralatan' || profile.role === 'superadmin';
    if (!isAllowed) return;

    const fetchCounts = async () => {
      try {
        // 1. Pending Warehouse Requests
        const res = await fetch('/api/gudang?type=requests&status=pending');
        const json = await res.json();
        const pendingRequestsCount = json.data?.length || 0;
        
        // 2. Active Repairs (progress_status != 'selesai')
        const { count: repairCount, error: repairErr } = await supabase
          .from('maintenance_logs')
          .select('*', { count: 'exact', head: true })
          .neq('progress_status', 'selesai');

        if (repairErr) throw repairErr;

        setCounts({
          pendingRequests: pendingRequestsCount,
          activeRepairs: repairCount || 0
        });
      } catch (err) {
        console.error('Failed to fetch sidebar counts:', err);
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 20000); // 20s refresh
    return () => clearInterval(interval);
  }, [profile?.role]);

  return (
    <>
      {/* Mobile hamburger button */}
      <button className="sidebar-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
        <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{width:22,height:22}}>
          {mobileOpen
            ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          }
        </svg>
      </button>

      {/* Overlay */}
      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}

      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064" />
            </svg>
          </div>
          <div>
            <div className="sidebar-brand-text">SWAKELOLASDA</div>
            <div className="sidebar-brand-sub">Dinas PU Bojonegoro</div>
          </div>
          {/* Close button inside sidebar on mobile */}
          <button className="sidebar-close-btn" onClick={() => setMobileOpen(false)}>
            <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{width:20,height:20}}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {navSections.map((section) => (
          <div className="sidebar-section" key={section.section}>
            <div className="sidebar-section-label">{section.section}</div>
            <ul className="sidebar-nav">
              {section.items.map((item) => (
                <li className="sidebar-nav-item" key={item.href}>
                  <Link
                    href={item.href}
                    className={`sidebar-nav-link ${pathname === item.href ? 'active' : ''}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    {ICONS[item.icon]}
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      {/* v1.0.6 - badge position fix */}
                      {item.label}
                      {item.badgeKey && counts[item.badgeKey] > 0 && (
                        <span className="sidebar-badge danger pulse" style={{ 
                          marginLeft: '8px', 
                          background: '#dc2626', 
                          color: 'white', 
                          borderRadius: '50%', 
                          width: '18px', 
                          height: '18px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontSize: '11px', 
                          fontWeight: '900',
                          boxShadow: '0 0 0 2px rgba(220, 38, 26, 0.3)',
                          flexShrink: 0
                        }}>!</span>
                      )}
                    </span>
                    {item.badge === 'maintenance_count' && maintenanceCount > 0 && (
                      <span className="sidebar-badge">{maintenanceCount}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div>
              <div className="sidebar-user-name">{profile?.full_name || 'Pengguna'}</div>
              <div className="sidebar-user-role">{ROLE_LABELS[role] || role}</div>
            </div>
            <button className="sidebar-logout-btn" onClick={logout} title="Keluar">
              <span>Keluar</span>
              {ICONS.logout}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
