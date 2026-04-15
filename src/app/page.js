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

    let lat = null, lng = null, coordSource = null;

    // =============================================
    // PRIORITAS 1: AUTO-GEOCODING (dari nama desa/kecamatan)
    // =============================================
    if (locDesa && locKec) {
      const cacheKey = `${locDesa}|${locKec}`;
      
      // Check cache first
      if (geocodeCache[cacheKey] !== undefined) {
        const result = geocodeCache[cacheKey];
        if (result) {
          lat = result.lat;
          lng = result.lng;
          coordSource = 'auto';
        }
      } else {
        // Geocode baru
        geocodeCache[cacheKey] = undefined;
        const result = await geocodeLocation(locDesa, locKec);
        geocodeCache[cacheKey] = result;
        
        if (result) {
          lat = result.lat;
          lng = result.lng;
          coordSource = 'auto';
        }
      }
    }

    // =============================================
    // PRIORITAS 2: MANUAL KOORDINAT (fallback jika auto gagal)
    // =============================================
    if ((lat === null || lng === null) && assignment?.latitude && assignment?.longitude) {
      lat = parseFloat(assignment.latitude);
      lng = parseFloat(assignment.longitude);
      coordSource = 'manual';
      console.log(`[Homepage] Using MANUAL coordinates for ${e.name}: ${lat}, ${lng}`);
    }

    items.push({
      id: e.id,
      alatName: e.name,
      merk: e.merk_type || null,
      nomorLambung: e.nomor_lambung || null,
      status: e.status,
      kondisi: e.condition_percentage != null ? `${e.condition_percentage}%` : 'Baik',
      operator: assignment?.operator?.full_name || null,
      helper: assignment?.helper?.full_name || null,
      pekerjaan: JOB_LABELS[assignment?.job_type] || assignment?.job_sub_type || 'Pekerjaan Lapangan',
      seksi: assignment?.created_by_role === 'seksi_embung' ? 'Seksi Embung' : (assignment?.created_by_role === 'seksi_normalisasi' ? 'Seksi Normalisasi' : null),
      desa: locDesa || null,
      kecamatan: locKec || null,
      lat: lat ?? KANTOR_COORDS.lat,
      lng: lng ?? KANTOR_COORDS.lng,
      isAtOffice: lat === null,
      coordSource,
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
    operatingOperators: [],
    readyOperators: [],
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
      
      // Ambil data assignments dengan operator & helper lengkap
      const assignmentsRes = await supabase
        .from('assignments')
        .select(`
          id, job_type, job_sub_type, created_by_role,
          location_district, location_village,
          location_district_override, location_village_override,
          latitude, longitude,
          start_date, equipment_id,
          equipment:heavy_equipment(name, merk_type, nomor_lambung, status),
          operator:user_profiles!assignments_operator_id_fkey(id, full_name),
          helper:user_profiles!assignments_helper_id_fkey(id, full_name)
        `)
        .eq('status', 'active')
        .order('start_date', { ascending: false });
      
      // Ambil semua operator dengan data lengkap
      const operatorsRes = await supabase
        .from('user_profiles')
        .select('id, full_name, role')
        .eq('role', 'operator');
      
      // Ambil semua equipment
      const equipmentRes = await supabase.from('heavy_equipment').select('*').order('name');

      const assignmentRows = assignmentsRes.data || [];
      const operatorRows = operatorsRes.data || [];
      const equipmentRows = equipmentRes.data || [];
      
      // Buat mapping equipment_id -> assignment untuk cari operator yang beroperasi
      const equipmentToAssignment = {};
      assignmentRows.forEach(a => {
        if (a.equipment_id) {
          equipmentToAssignment[a.equipment_id] = a;
        }
      });
      
      // Pisahkan operator: beroperasi vs ready
      const operatingOperators = [];
      const readyOperators = [...operatorRows];
      
      // Hapus operator yang beroperasi dari daftar ready
      assignmentRows.forEach(a => {
        if (a.operator?.id) {
          operatingOperators.push({
            ...a.operator,
            assignment: a,
            equipment: a.equipment
          });
          // Hapus dari ready
          const idx = readyOperators.findIndex(op => op.id === a.operator.id);
          if (idx > -1) readyOperators.splice(idx, 1);
        }
      });

      setOverview({
        activeAssignments: assignmentRows.length,
        totalOperators: operatorRows.length,
        totalEquipment: equipmentRows.length,
        readyEquipment: equipmentRows.filter(item => item.status === 'ready').length,
        operatingEquipment: equipmentRows.filter(item => item.status === 'operating').length,
        maintenanceEquipment: equipmentRows.filter(item => item.status === 'maintenance').length,
        bySection: {
          seksi_normalisasi: assignmentRows.filter(item => item.created_by_role === 'seksi_normalisasi').length,
          seksi_embung: assignmentRows.filter(item => item.created_by_role === 'seksi_embung').length,
        },
        equipmentList: equipmentRows,
        assignmentList: assignmentRows,
        operatingOperators,
        readyOperators,
      });

      setRecentAssignments(assignmentRows.slice(0, 10));

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
      `${overview.operatingEquipment} alat sedang beroperasi, ${overview.maintenanceEquipment} perawatan, dan ${overview.readyEquipment} alat siap ditugaskan.`,
      `Fokus pekerjaan saat ini didominasi oleh seksi ${dominantSection}.`,
    ];
  }, [overview]);

  const operatingEquipments = overview.equipmentList?.filter(e => e.status === 'operating') || [];
  const idleEquipments = overview.equipmentList?.filter(e => e.status !== 'operating') || [];

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
          {/* Map Section Header */}
          <div className="public-map-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="card-title">Peta Sebaran Alat Berat</span>
              <div className="header-subtitle">
                Pratinjau lokasi alat berat. Buka layar penuh untuk detail interaktif.
              </div>
            </div>
            <Link href="/peta" className="btn btn-primary">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
              Perbesar Peta
            </Link>
          </div>

          {/* Map card (Preview Mode) */}
          <div className="card public-map-card" style={{ height: '300px', cursor: 'pointer', overflow: 'hidden' }} onClick={() => router.push('/peta')}>
            <div style={{ pointerEvents: 'none', height: '100%', width: '100%' }}>
              <MapComponent mapItems={filteredMapItems} previewMode={true} />
            </div>
          </div>
        </section>

        {/* PERSONIL SECTION */}
        <section className="public-section">
          <div className="card-header" style={{ marginBottom: 16 }}>
            <span className="card-title">👷 Personil & Armada</span>
            <div className="header-subtitle">Daftar operator dan alat berat yang beroperasi vs siap ditugaskan</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {/* Kiri: Operator Beroperasi */}
            <div className="card">
              <div className="card-header" style={{ background: '#fef3c7' }}>
                <span className="card-title">🔧 Operator Beroperasi ({overview.operatingOperators?.length || 0})</span>
              </div>
              <div className="card-body">
                {pageLoading ? (
                  <p style={{ color: 'var(--text-muted)' }}>Memuat...</p>
                ) : overview.operatingOperators?.length > 0 ? (
                  <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                    {overview.operatingOperators.map((op, idx) => (
                      <div key={idx} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>
                          {op.full_name || 'Operator'}
                        </div>
                        {op.assignment && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: 4, fontSize: 10, marginRight: 6 }}>
                              {op.assignment.location_village || op.assignment.location_village_override || '-'}
                            </span>
                            {op.assignment.equipment?.name && (
                              <span style={{ color: '#1a56db' }}>
                                {op.assignment.equipment.name}
                              </span>
                            )}
                            {op.assignment.equipment?.merk_type && (
                              <span style={{ color: '#64748b' }}> - {op.assignment.equipment.merk_type}</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)' }}>Belum ada operator beroperasi.</p>
                )}
              </div>
            </div>

            {/* Kanan: Operator Ready */}
            <div className="card">
              <div className="card-header" style={{ background: '#dcfce7' }}>
                <span className="card-title">✅ Operator Siap Ditugaskan ({overview.readyOperators?.length || 0})</span>
              </div>
              <div className="card-body">
                {pageLoading ? (
                  <p style={{ color: 'var(--text-muted)' }}>Memuat...</p>
                ) : overview.readyOperators?.length > 0 ? (
                  <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                    {overview.readyOperators.map((op, idx) => (
                      <div key={idx} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 600 }}>{op.full_name || 'Operator'}</div>
                        <div style={{ fontSize: 12, color: '#16a34a' }}>Siap ditugaskan</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)' }}>Semua operator sudah ditugaskan.</p>
                )}
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
                    <div style={{fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px'}}>
                      <div><strong>Lokasi:</strong> Desa {item.location_village || '—'}, Kec. {locKec || '—'}</div>
                      <div><strong>Armada:</strong> {equipment ? `(${equipment.nomor_lambung||'-'}) ${equipment.merk_type||''} - ${equipment.name}` : '—'}</div>
                      <div><strong>Personil:</strong> Op. {item.operator?.full_name || '—'}{item.helper?.full_name ? ` & Hp. ${item.helper.full_name}` : ''}</div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        {/* Equipment Lists */}
        <section className="public-grid" style={{ marginTop: '24px' }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Armada Beroperasi ({operatingEquipments.length})</span>
            </div>
            <div className="card-body" style={{ padding: '0' }}>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="public-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f8fafc' }}>
                    <tr>
                      <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>Alat & Nomor</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>Personil</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operatingEquipments.length === 0 ? (
                      <tr><td colSpan={2} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Tidak ada alat beroperasi</td></tr>
                    ) : operatingEquipments.map(eq => {
                      const asgn = overview.assignmentList?.find(a => a.equipment_id === eq.id);
                      return (
                        <tr key={eq.id}>
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ fontWeight: '500', fontSize: '14px', color: '#0f172a' }}>{eq.name}</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>({eq.nomor_lambung || '-'}) {eq.merk_type}</div>
                          </td>
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: '13px', color: '#334155' }}>Op: {asgn?.operator?.full_name || '-'}</div>
                            {asgn?.helper?.full_name && <div style={{ fontSize: '12px', color: '#64748b' }}>Hp: {asgn.helper.full_name}</div>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Armada Siap / Maintenance ({idleEquipments.length})</span>
            </div>
            <div className="card-body" style={{ padding: '0' }}>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="public-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f8fafc' }}>
                    <tr>
                      <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>Alat & Nomor</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {idleEquipments.length === 0 ? (
                      <tr><td colSpan={2} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Semua alat sedang beroperasi</td></tr>
                    ) : idleEquipments.map(eq => (
                      <tr key={eq.id}>
                        <td style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                          <div style={{ fontWeight: '500', fontSize: '14px', color: '#0f172a' }}>{eq.name}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>({eq.nomor_lambung || '-'}) {eq.merk_type}</div>
                        </td>
                        <td style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                          <span className={`badge ${STATUS_BADGE_CLASS[eq.status] || 'badge-neutral'}`} style={{ fontSize: '11px' }}>
                            {eq.status === 'ready' ? 'Siap' : eq.status === 'maintenance' ? 'Maintenance' : eq.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
