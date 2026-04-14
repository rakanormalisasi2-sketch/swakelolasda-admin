'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { geocodeLocation } from '@/lib/geocoder';

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="map-loading">
      <div className="map-loading-spinner" />
      <span>Memuat peta...</span>
    </div>
  )
});

function RootPageErrorFallback({ error, reset }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24, textAlign: 'center' }}>
      <div>
        <h2 style={{ color: '#dc2626', marginBottom: 8 }}>Gagal memuat halaman</h2>
        <p style={{ color: '#64748b', marginBottom: 16 }}>{error?.message || 'Terjadi kesalahan.'}</p>
        <button onClick={reset} style={{ padding: '8px 16px', background: '#1a56db', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Coba lagi</button>
      </div>
    </div>
  );
}

class RootPageErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) return <RootPageErrorFallback error={this.state.error} reset={() => this.setState({ hasError: false })} />;
    return this.props.children;
  }
}

const JOB_LABELS = {
  normalisasi: 'Normalisasi',
  embung: 'Embung',
  lainnya: 'Lainnya',
};

const STATUS_BADGE_CLASS = {
  ready: 'badge-success',
  operating: 'badge-warning',
  maintenance: 'badge-maintenance',
};

const KANTOR_COORDS = { lat: -7.165991597493862, lng: 111.89056781736653 };

const KECAMATAN_LIST = [
  'BALEN','BAURENO','BOJONEGORO','BUBULAN','DANDER','GAYAM',
  'GONDANG','KALITIDU','KANOR','KAPAS','KASIMAN','KEDEWAN',
  'KEDUNGADEM','KEPOHBARU','MALO','MARGOMULYO','NGAMBON','NGASEM',
  'NGRAHO','PADANGAN','PURWOSARI','SEKAR','SUGIHWARAS','SUKOSEWU',
  'SUMBEREJO','TAMBAKREJO','TEMAYANG','TRUCUK',
];

const STATUS_LIST = [
  { value: 'semua', label: 'Semua Status' },
  { value: 'operating', label: 'Beroperasi' },
  { value: 'ready', label: 'Siap Ditugaskan' },
  { value: 'maintenance', label: 'Maintenance' },
];

// ── Map data builder ──────────────────────────────────────────────────────
async function buildMapItems(assignments, equipment) {
  // Build a map of equipment ID → active assignment
  const activeEquipmentIds = new Set();
  assignments.forEach(a => {
    if (a.equipment_id) activeEquipmentIds.add(a.equipment_id);
  });

  // Track which equipment is used in active assignments (replacement case)
  const assignedEquipmentIds = new Set(
    assignments.map(a => a.equipment_id).filter(Boolean)
  );

  // Equipment that is NOT operating in any active assignment (broken/replaced)
  const nonOperatingAtOffice = equipment.filter(e =>
    e.status !== 'operating' && !assignedEquipmentIds.has(e.id)
  );

  // Equipment operating in assignments
  const operatingEquipment = equipment.filter(e =>
    assignedEquipmentIds.has(e.id)
  );

  const items = [];
  const geocodeCache = {};

  // 1. Non-operating equipment → office
  nonOperatingAtOffice.forEach(e => {
    items.push({
      id: e.id,
      alatName: e.name,
      merk: e.merk_type || null,
      nomorLambung: e.nomor_lambung || null,
      status: e.status,
      kondisi: e.condition_percentage != null ? `${e.condition_percentage}%` : 'Baik',
      operator: null,
      pekerjaan: 'Tidak ditugaskan',
      desa: null,
      kecamatan: null,
      lat: KANTOR_COORDS.lat,
      lng: KANTOR_COORDS.lng,
      isAtOffice: true,
    });
  });

  // 2. Operating equipment → assignment location
  for (const e of operatingEquipment) {
    const assignment = assignments.find(a => a.equipment_id === e.id);
    const locDesa = assignment?.location_village_override || assignment?.location_village;
    const locKec = assignment?.location_district_override || assignment?.location_district;

    let lat = null, lng = null;

    if (locDesa && locKec) {
      const cacheKey = `${locDesa}|${locKec}`;
      if (geocodeCache[cacheKey] !== undefined) {
        const result = geocodeCache[cacheKey];
        if (result) { lat = result.lat; lng = result.lng; }
      } else {
        geocodeCache[cacheKey] = undefined; // mark pending
        const result = await geocodeLocation(locDesa, locKec);
        geocodeCache[cacheKey] = result;
        if (result) { lat = result.lat; lng = result.lng; }
      }
    }

    items.push({
      id: e.id,
      alatName: e.name,
      merk: e.merk_type || null,
      nomorLambung: e.nomor_lambung || null,
      status: e.status,
      kondisi: e.condition_percentage != null ? `${e.condition_percentage}%` : 'Baik',
      operator: assignment?.operator?.full_name || null,
      pekerjaan: JOB_LABELS[assignment?.job_type] || assignment?.job_sub_type || 'Pekerjaan Lapangan',
      desa: locDesa || null,
      kecamatan: locKec || null,
      lat: lat ?? KANTOR_COORDS.lat,
      lng: lng ?? KANTOR_COORDS.lng,
      isAtOffice: lat === null,
    });
  }

  // assign _idx for overlap handling
  items.forEach((item, i) => { item._idx = i; });
  return items;
}

// ── Page component ────────────────────────────────────────────────────────
function RootPageContent() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [pageLoading, setPageLoading] = useState(true);
  const [overview, setOverview] = useState({
    activeAssignments: 0,
    totalOperators: 0,
    totalEquipment: 0,
    readyEquipment: 0,
    operatingEquipment: 0,
    maintenanceEquipment: 0,
    bySection: { seksi_normalisasi: 0, seksi_embung: 0 },
  });
  const [recentAssignments, setRecentAssignments] = useState([]);
  const [mapItems, setMapItems] = useState([]);

  // Filters
  const [filterKecamatan, setFilterKecamatan] = useState('semua');
  const [filterStatus, setFilterStatus] = useState('semua');
  const [filterSearch, setFilterSearch] = useState('');

  // Role-based redirect
  useEffect(() => {
    if (authLoading) return;
    if (user && profile?.role) {
      const role = profile.role;
      if (role === 'superadmin') router.replace('/dashboard/superadmin');
      else if (role === 'peralatan' || role === 'tim_peralatan') router.replace('/dashboard/peralatan');
      else if (role === 'seksi_normalisasi' || role === 'seksi_embung') router.replace('/dashboard/seksi');
      else router.replace('/login');
    }
  }, [user, profile, authLoading, router]);

  // Load overview data
  useEffect(() => {
    if (!authLoading && user && profile?.role) return;

    async function loadPublicOverview() {
      setPageLoading(true);
      const [assignmentsRes, operatorsRes, equipmentRes] = await Promise.all([
        supabase
          .from('assignments')
          .select(`
            id, job_type, job_sub_type, created_by_role,
            location_district, location_village,
            location_district_override, location_village_override,
            start_date, equipment_id,
            equipment:heavy_equipment(name, merk_type, nomor_lambung),
            operator:user_profiles!assignments_operator_id_fkey(full_name)
          `)
          .eq('status', 'active')
          .order('start_date', { ascending: false }),
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'operator'),
        supabase.from('heavy_equipment').select('*').order('name'),
      ]);

      const assignmentRows = assignmentsRes.data || [];
      const equipmentRows = equipmentRes.data || [];

      setOverview({
        activeAssignments: assignmentRows.length,
        totalOperators: operatorsRes.count || 0,
        totalEquipment: equipmentRows.length,
        readyEquipment: equipmentRows.filter(item => item.status === 'ready').length,
        operatingEquipment: equipmentRows.filter(item => item.status === 'operating').length,
        maintenanceEquipment: equipmentRows.filter(item => item.status === 'maintenance').length,
        bySection: {
          seksi_normalisasi: assignmentRows.filter(item => item.created_by_role === 'seksi_normalisasi').length,
          seksi_embung: assignmentRows.filter(item => item.created_by_role === 'seksi_embung').length,
        },
      });

      setRecentAssignments(assignmentRows.slice(0, 6));

      // Build map items asynchronously after first render
      const items = await buildMapItems(assignmentRows, equipmentRows);
      setMapItems(items);
      setPageLoading(false);
    }

    loadPublicOverview();
  }, [authLoading, user, profile]);

  // Filtered map items
  const filteredMapItems = useMemo(() => {
    return mapItems.filter(item => {
      if (filterKecamatan !== 'semua' && item.kecamatan?.toUpperCase() !== filterKecamatan) return false;
      if (filterStatus !== 'semua' && item.status !== filterStatus) return false;
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        const searchable = [
          item.alatName, item.nomorLambung, item.desa, item.kecamatan,
          item.operator, item.pekerjaan,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [mapItems, filterKecamatan, filterStatus, filterSearch]);

  // Filtered assignments for the list
  const filteredAssignments = useMemo(() => {
    return recentAssignments.filter(item => {
      const locKec = item.location_district_override || item.location_district;
      if (filterKecamatan !== 'semua' && locKec?.toUpperCase() !== filterKecamatan) return false;
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        const searchable = [
          item.job_sub_type, item.job_type, item.location_village,
          locKec, item.equipment?.name,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [recentAssignments, filterKecamatan, filterSearch]);

  const publicHighlights = useMemo(() => {
    const dominantSection = overview.bySection.seksi_normalisasi >= overview.bySection.seksi_embung
      ? 'Normalisasi'
      : 'Embung';
    return [
      `${overview.activeAssignments} pekerjaan lapangan sedang berjalan saat ini.`,
      `${overview.operatingEquipment} alat sedang beroperasi dan ${overview.readyEquipment} alat siap ditugaskan.`,
      `Fokus pekerjaan saat ini didominasi oleh seksi ${dominantSection}.`,
    ];
  }, [overview]);

  if (authLoading || (user && profile?.role)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#1a56db', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className="public-homepage">
      <header className="public-topbar">
        <div>
          <div className="public-brand">SWAKELOLA SDA</div>
          <div className="public-brand-sub">Gambaran umum pekerjaan lapangan untuk publik</div>
        </div>
        <Link href="/login" className="public-login-link">Login Internal</Link>
      </header>

      <main className="public-main">
        {/* Hero */}
        <section className="public-hero card">
          <div className="public-hero-copy">
            <span className="public-chip">Informasi Publik</span>
            <h1>Ringkasan umum pekerjaan lapangan yang sedang berjalan</h1>
            <p>
              Halaman ini menampilkan gambaran umum pelaksanaan pekerjaan swakelola sumber daya air,
              agar masyarakat dapat melihat progres keseluruhan tanpa membuka detail operasional internal.
            </p>
            <div className="public-hero-actions">
              <a href="#ringkasan" className="btn btn-primary">Lihat Ringkasan</a>
              <Link href="/login" className="btn btn-outline">Masuk Admin</Link>
            </div>
          </div>
          <div className="public-hero-side">
            <div className="public-hero-stat">
              <div className="public-hero-value">{pageLoading ? '—' : overview.activeAssignments}</div>
              <div className="public-hero-label">Pekerjaan Aktif</div>
            </div>
            <div className="public-hero-stat">
              <div className="public-hero-value">{pageLoading ? '—' : overview.totalEquipment}</div>
              <div className="public-hero-label">Total Alat Tercatat</div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section id="ringkasan" className="public-section">
          <div className="stats-grid public-stats-grid">
            {[
              { label: 'Penugasan Aktif', value: overview.activeAssignments, color: '#1a56db', bg: '#e8f0fe' },
              { label: 'Operator Lapangan', value: overview.totalOperators, color: '#0ea5e9', bg: '#e0f2fe' },
              { label: 'Alat Beroperasi', value: overview.operatingEquipment, color: '#d97706', bg: '#fef3c7' },
              { label: 'Alat Maintenance', value: overview.maintenanceEquipment, color: '#7c3aed', bg: '#ede9fe' },
            ].map(item => (
              <div className="stat-card" key={item.label}>
                <div className="stat-icon" style={{ background: item.bg }}>
                  <svg fill="none" stroke={item.color} strokeWidth={2} viewBox="0 0 24 24" style={{ width: 20, height: 20 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <div className="stat-value">{pageLoading ? '—' : item.value}</div>
                  <div className="stat-label">{item.label}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Map section */}
        <section className="public-map-section">
          <div className="public-map-header">
            <div>
              <span className="card-title">Peta Sebaran Alat Berat</span>
              <div className="header-subtitle">
                Lokasi alat berat berdasarkan pekerjaan aktif — klik marker untuk detail dan rute
              </div>
            </div>
          </div>

          {/* Filter bar */}
          <div className="public-map-filters">
            <div className="public-filter-search">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Cari alat, desa, nomor lambung..."
                value={filterSearch}
                onChange={e => setFilterSearch(e.target.value)}
              />
              {filterSearch && (
                <button className="filter-clear-btn" onClick={() => setFilterSearch('')} aria-label="Hapus pencarian">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              )}
            </div>

            <select
              className="form-control public-filter-select"
              value={filterKecamatan}
              onChange={e => setFilterKecamatan(e.target.value)}
            >
              <option value="semua">Semua Kecamatan</option>
              {KECAMATAN_LIST.map(k => (
                <option key={k} value={k}>{k.charAt(0) + k.slice(1).toLowerCase()}</option>
              ))}
            </select>

            <select
              className="form-control public-filter-select"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              {STATUS_LIST.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Map card */}
          <div className="card public-map-card">
            <MapComponent mapItems={filteredMapItems} />
          </div>

          {/* Map legend */}
          <div className="public-map-legend">
            <span className="legend-title">Status:</span>
            <div className="legend-items">
              <div className="legend-item">
                <span className="legend-dot" style={{ background: '#d97706', borderColor: '#d97706' }} />
                <span>Beroperasi</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ background: '#16a34a', borderColor: '#16a34a' }} />
                <span>Siap Ditugaskan</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ background: '#7c3aed', borderColor: '#7c3aed' }} />
                <span>Maintenance</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ background: '#64748b', borderColor: '#64748b' }} />
                <span>Di Kantor</span>
              </div>
            </div>
          </div>
        </section>

        {/* Highlights + Summary */}
        <section className="public-grid">
          <div className="card">
            <div className="card-header">
              <span className="card-title">Gambaran Umum Saat Ini</span>
            </div>
            <div className="card-body public-highlight-list">
              {publicHighlights.map((item, index) => (
                <div key={index} className="public-highlight-item">
                  <span className="public-highlight-dot" />
                  <span>{pageLoading ? 'Memuat ringkasan...' : item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Sebaran Pekerjaan</span>
            </div>
            <div className="card-body public-summary-stack">
              <div className="public-summary-row">
                <div>
                  <div className="public-summary-title">Seksi Normalisasi</div>
                  <div className="public-summary-sub">Pekerjaan normalisasi dan saluran</div>
                </div>
                <strong>{pageLoading ? '—' : overview.bySection.seksi_normalisasi}</strong>
              </div>
              <div className="public-summary-row">
                <div>
                  <div className="public-summary-title">Seksi Embung</div>
                  <div className="public-summary-sub">Pekerjaan embung dan tampungan air</div>
                </div>
                <strong>{pageLoading ? '—' : overview.bySection.seksi_embung}</strong>
              </div>
              <div className="public-summary-row">
                <div>
                  <div className="public-summary-title">Alat Siap Ditugaskan</div>
                  <div className="public-summary-sub">Armada yang siap mendukung pekerjaan berikutnya</div>
                </div>
                <strong>{pageLoading ? '—' : overview.readyEquipment}</strong>
              </div>
            </div>
          </div>
        </section>

        {/* Recent assignments — filtered */}
        <section className="card public-activity-card">
          <div className="card-header public-card-header-split">
            <div>
              <span className="card-title">Pekerjaan Aktif {filterKecamatan !== 'semua' || filterSearch ? '(Terfilter)' : 'Terbaru'}</span>
              <div className="header-subtitle">Ditampilkan dalam versi ringkas untuk publik</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="public-assignment-count">{filteredAssignments.length} pekerjaan</span>
              <Link href="/login" className="public-inline-login">Login Internal</Link>
            </div>
          </div>
          <div className="card-body public-activity-list">
            {pageLoading ? (
              <div className="empty-state">
                <h3>Memuat data publik...</h3>
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div className="empty-state">
                <h3>Tidak ada pekerjaan yang cocok dengan filter</h3>
                <p>Coba ubah filter kecamatan atau kata kunci pencarian.</p>
              </div>
            ) : (
              filteredAssignments.map(item => {
                const equipment = Array.isArray(item.equipment) ? item.equipment[0] : item.equipment;
                const locKec = item.location_district_override || item.location_district;
                const sectionLabel = item.created_by_role === 'seksi_embung' ? 'Embung' : 'Normalisasi';
                const statusLabel = equipment?.status || 'operating';
                return (
                  <article className="public-activity-item" key={item.id}>
                    <div className="public-activity-top">
                      <span className={`badge ${item.job_type === 'embung' ? 'badge-success' : 'badge-primary'}`}>
                        {JOB_LABELS[item.job_type] || sectionLabel}
                      </span>
                      <span className={`badge ${STATUS_BADGE_CLASS[statusLabel] || 'badge-warning'}`}>
                        {statusLabel === 'maintenance' ? 'Alat Maintenance' : statusLabel === 'ready' ? 'Alat Ready' : 'Alat Beroperasi'}
                      </span>
                    </div>
                    <h3>{item.job_sub_type || JOB_LABELS[item.job_type] || 'Pekerjaan Lapangan'}</h3>
                    <p>
                      Lokasi umum: Desa {item.location_village || '—'}, Kec. {locKec || '—'}.
                      {equipment?.name ? ` Didukung armada ${equipment.name}.` : ''}
                    </p>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </main>

      <footer className="public-footer">
        <div>
          <div className="public-brand">SWAKELOLA SDA</div>
          <p>Sistem informasi publik pekerjaan swakelola sumber daya air Kabupaten Bojonegoro.</p>
        </div>
        <div className="public-footer-links">
          <Link href="/login">Login Internal</Link>
        </div>
      </footer>
    </div>
  );
}

export default function RootPage() {
  return (
    <RootPageErrorBoundary>
      <RootPageContent />
    </RootPageErrorBoundary>
  );
}
