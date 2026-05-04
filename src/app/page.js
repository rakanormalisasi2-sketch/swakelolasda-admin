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

    // =============================================
    // PRIORITAS 1: MANUAL KOORDINAT (Input Presisi)
    // =============================================
    if (assignment?.latitude && assignment?.longitude) {
      lat = parseFloat(assignment.latitude);
      lng = parseFloat(assignment.longitude);
      coordSource = 'manual';
      console.log(`[Homepage] Using MANUAL coordinates for ${e.name}: ${lat}, ${lng}`);
    }

    // =============================================
    // PRIORITAS 2: AUTO-GEOCODING (Fallback dari nama desa/kecamatan)
    // =============================================
    if ((lat === null || lng === null) && locDesa && locKec) {
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

  // Yearly Stats for public dashboard
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [yearlyStats, setYearlyStats] = useState(null);

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

  // Load Yearly Stats
  useEffect(() => {
    async function loadYearly() {
      try {
        const [resTarget, resData] = await Promise.all([
          fetch(`/api/checklist-normalisasi/target?tahun=${tahun}`),
          fetch(`/api/checklist-normalisasi?tahun=${tahun}`)
        ]);
        const target = await resTarget.json();
        const data = await resData.json();
        
        const totalPanjang = (data || []).reduce((sum, d) => sum + (Number(d.panjang)||0), 0);
        const totalSolar = (data || []).reduce((sum, d) => sum + (Number(d.solar)||0), 0);
        
        setYearlyStats({
          target: target?.target_panjang_normalisasi || 0,
          totalPanjang,
          totalSolar,
          lokasi: (data || []).length
        });
      } catch (e) {
        console.error(e);
      }
    }
    loadYearly();
  }, [tahun]);

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

        {/* PERSONIL SECTION - removed, content merged into Equipment Lists below */}

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

        {/* ── PENCAPAIAN TAHUNAN SECTION ─────────────────────────────── */}
        <section style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0b1c30' }}>Pencapaian Tahunan</h2>
            <select value={tahun} onChange={e => setTahun(Number(e.target.value))} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #c2c6d3', outline: 'none', fontWeight: 'bold' }}>
              {[2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
            {/* Card Normalisasi */}
            <div style={{ background: 'linear-gradient(135deg, #00346f, #004a99)', borderRadius: '12px', padding: '24px', color: 'white', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 30px -10px rgba(0,52,111,0.5)' }}>
              <div style={{ position: 'absolute', right: -20, top: -20, opacity: 0.1, fontSize: 120 }}>🏗️</div>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                🏗️ NORMALISASI SUNGAI
              </h3>
              
              {yearlyStats ? (() => {
                const target = yearlyStats.target;
                const dev = yearlyStats.totalPanjang - target;
                const devPct = target > 0 ? (Math.abs(dev) / target * 100).toFixed(1) : 0;
                return (
                  <div style={{ display: 'grid', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: 8 }}>
                      <span style={{ fontSize: 13, opacity: 0.8 }}>Total Panjang</span>
                      <span style={{ fontSize: 24, fontWeight: 900 }}>{yearlyStats.totalPanjang.toLocaleString('id-ID')} <span style={{ fontSize: 14, fontWeight: 'normal' }}>meter</span></span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.9 }}>
                      <span style={{ fontSize: 13 }}>Target Tahun {tahun}</span>
                      <span style={{ fontSize: 16, fontWeight: 'bold' }}>{target.toLocaleString('id-ID')} meter</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13 }}>Deviasi</span>
                      <span style={{ fontSize: 13, fontWeight: 'bold', background: dev < 0 ? '#ef4444' : '#10b981', padding: '2px 8px', borderRadius: 4 }}>
                        {target > 0 ? (dev < 0 ? `Kurang ${Math.abs(dev).toLocaleString('id-ID')}m (${devPct}%)` : `Surplus ${dev.toLocaleString('id-ID')}m (+${devPct}%)`) : 'Target belum diset'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                      <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px 12px', borderRadius: 8 }}>
                        <div style={{ fontSize: 11, opacity: 0.8 }}>Total Lokasi</div>
                        <div style={{ fontSize: 16, fontWeight: 'bold' }}>{yearlyStats.lokasi}</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px 12px', borderRadius: 8, textAlign: 'right' }}>
                        <div style={{ fontSize: 11, opacity: 0.8 }}>Total Solar</div>
                        <div style={{ fontSize: 16, fontWeight: 'bold' }}>{yearlyStats.totalSolar.toLocaleString('id-ID')} Liter</div>
                      </div>
                    </div>
                  </div>
                );
              })() : <div style={{ opacity: 0.5 }}>Memuat data...</div>}
            </div>

            {/* Card Embung Placeholder */}
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #c2c6d3', position: 'relative', overflow: 'hidden' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 8, color: '#0b1c30' }}>
                🌊 REHABILITASI EMBUNG
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '140px', background: '#f8f9ff', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                <span style={{ fontSize: 13, color: '#64748b', fontWeight: 'bold' }}>Modul Checklist Embung Belum Tersedia</span>
                <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Menunggu pengembangan fitur selanjutnya</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── ARMADA & OPERATOR SECTION ─────────────────────────────── */}
        <section style={{ marginTop: '24px' }}>

          {/* (1) ALAT BEROPERASI — full width, tampilkan operator di dalamnya */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header" style={{ background: '#fef3c7' }}>
              <span className="card-title">🚜 Alat Beroperasi ({operatingEquipments.length})</span>
              <div className="header-subtitle">Armada yang sedang aktif di lapangan beserta operatornya</div>
            </div>
            <div className="card-body" style={{ padding: '0' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead style={{ background: '#fffbeb' }}>
                    <tr>
                      <th style={{ padding: '10px 16px', textAlign: 'left', borderBottom: '2px solid #fde68a', color: '#92400e', fontWeight: 700 }}>Alat Berat</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', borderBottom: '2px solid #fde68a', color: '#92400e', fontWeight: 700 }}>No. Lambung</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', borderBottom: '2px solid #fde68a', color: '#92400e', fontWeight: 700 }}>Operator</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', borderBottom: '2px solid #fde68a', color: '#92400e', fontWeight: 700 }}>Lokasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageLoading ? (
                      <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Memuat data...</td></tr>
                    ) : operatingEquipments.length === 0 ? (
                      <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Tidak ada alat sedang beroperasi</td></tr>
                    ) : operatingEquipments.map(eq => {
                      const asgn = overview.assignmentList?.find(a => a.equipment_id === eq.id);
                      const locVillage = asgn?.location_village_override || asgn?.location_village;
                      const locDistrict = asgn?.location_district_override || asgn?.location_district;
                      return (
                        <tr key={eq.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{eq.name}</div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: 2 }}>{eq.merk_type || '—'}</div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ background: '#e2e8f0', color: '#334155', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 12 }}>
                              {eq.nomor_lambung || '-'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 500, color: '#1e40af' }}>{asgn?.operator?.full_name || '—'}</div>
                            {asgn?.helper?.full_name && <div style={{ fontSize: '11px', color: '#64748b', marginTop: 2 }}>Helper: {asgn.helper.full_name}</div>}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            {locVillage ? (
                              <div style={{ fontSize: '12px', color: '#334155' }}>
                                <div>Desa {locVillage}</div>
                                <div style={{ color: '#64748b' }}>Kec. {locDistrict || '—'}</div>
                              </div>
                            ) : <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* (2) DAFTAR OPERATOR & DAFTAR ALAT BERAT — side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>

            {/* Kiri: Daftar Semua Operator */}
            <div className="card">
              <div className="card-header" style={{ background: '#eff6ff' }}>
                <span className="card-title">👷 Daftar Operator ({overview.totalOperators || 0})</span>
              </div>
              <div className="card-body" style={{ padding: '0' }}>
                <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                  {pageLoading ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Memuat...</div>
                  ) : [
                    ...(overview.operatingOperators || []).map(op => ({ ...op, _status: 'operating' })),
                    ...(overview.readyOperators || []).map(op => ({ ...op, _status: 'ready' })),
                  ].length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Belum ada operator terdaftar</div>
                  ) : [
                    ...(overview.operatingOperators || []).map(op => ({ ...op, _status: 'operating' })),
                    ...(overview.readyOperators || []).map(op => ({ ...op, _status: 'ready' })),
                  ].map((op, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                        background: op._status === 'operating' ? '#fef3c7' : '#dcfce7',
                        color: op._status === 'operating' ? '#92400e' : '#166534',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700
                      }}>
                        {op.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{op.full_name || 'Operator'}</div>
                        <div style={{ fontSize: 11, marginTop: 2 }}>
                          {op._status === 'operating' ? (
                            <span style={{ color: '#d97706' }}>● Sedang Beroperasi</span>
                          ) : (
                            <span style={{ color: '#16a34a' }}>● Siap Ditugaskan</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Kanan: Daftar Semua Alat Berat */}
            <div className="card">
              <div className="card-header" style={{ background: '#f0fdf4' }}>
                <span className="card-title">🏗️ Daftar Alat Berat ({overview.totalEquipment || 0})</span>
              </div>
              <div className="card-body" style={{ padding: '0' }}>
                <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                  {pageLoading ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Memuat...</div>
                  ) : (overview.equipmentList || []).length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Belum ada alat terdaftar</div>
                  ) : (overview.equipmentList || []).map(eq => (
                    <div key={eq.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                        background: eq.status === 'operating' ? '#fef3c7' : eq.status === 'maintenance' ? '#fee2e2' : '#dcfce7',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16
                      }}>
                        {eq.status === 'operating' ? '🚜' : eq.status === 'maintenance' ? '🔧' : '✅'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{eq.name}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                          ({eq.nomor_lambung || '-'}) {eq.merk_type || ''}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 4,
                        background: eq.status === 'operating' ? '#fef3c7' : eq.status === 'maintenance' ? '#fee2e2' : '#dcfce7',
                        color: eq.status === 'operating' ? '#92400e' : eq.status === 'maintenance' ? '#991b1b' : '#166534',
                      }}>
                        {eq.status === 'ready' ? 'SIAP' : eq.status === 'maintenance' ? 'REPAIR' : 'OPERASI'}
                      </span>
                    </div>
                  ))}
                </div>
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
