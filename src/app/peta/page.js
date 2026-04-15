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
    <div className="map-loading" style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div className="map-loading-spinner" />
      <span style={{ marginTop: '16px', color: '#64748b' }}>Memuat peta...</span>
    </div>
  )
});

const JOB_LABELS = {
  normalisasi: 'Normalisasi',
  embung: 'Embung',
  lainnya: 'Lainnya',
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

async function buildMapItems(assignments, equipment) {
  const activeEquipmentIds = new Set();
  assignments.forEach(a => {
    if (a.equipment_id) activeEquipmentIds.add(a.equipment_id);
  });

  const assignedEquipmentIds = new Set(
    assignments.map(a => a.equipment_id).filter(Boolean)
  );

  const nonOperatingAtOffice = equipment.filter(e =>
    e.status !== 'operating' && !assignedEquipmentIds.has(e.id)
  );

  const operatingEquipment = equipment.filter(e =>
    assignedEquipmentIds.has(e.id)
  );

  const items = [];
  const geocodeCache = {};

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
      seksi: null,
      desa: null,
      kecamatan: null,
      lat: KANTOR_COORDS.lat,
      lng: KANTOR_COORDS.lng,
      isAtOffice: true,
    });
  });

  for (const e of operatingEquipment) {
    const assignment = assignments.find(a => a.equipment_id === e.id);
    const locDesa = assignment?.location_village_override || assignment?.location_village;
    const locKec = assignment?.location_district_override || assignment?.location_district;

    let lat = null, lng = null, coordSource = null;

    // =============================================
    // PRIORITAS 1: MANUAL KOORDINAT (Input Presisi)
    // Jika user/operator mengisi angka koordinat, gunakan ini!
    // =============================================
    if (assignment?.latitude && assignment?.longitude) {
      lat = parseFloat(assignment.latitude);
      lng = parseFloat(assignment.longitude);
      coordSource = 'manual';
      console.log(`[Map] Using MANUAL coordinates for ${e.name}: ${lat}, ${lng}`);
    }

    // =============================================
    // PRIORITAS 2: AUTO-GEOCODING (Fallback)
    // Hanya jika koordinat manual tidak diisi
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
      isAtJobLocation: lat !== null, // Flag untuk maintenance di lokasi
      coordSource,
    });
  }

  items.forEach((item, i) => { item._idx = i; });
  return items;
}

export default function PetaPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [pageLoading, setPageLoading] = useState(true);
  const [mapItems, setMapItems] = useState([]);

  const [filterKecamatan, setFilterKecamatan] = useState('semua');
  const [filterStatus, setFilterStatus] = useState('semua');
  const [filterSearch, setFilterSearch] = useState('');

  // Role-based redirect (internal users using this page directly should just see it, 
  // but if they are logged in, maybe we allow them to see it or redirect to dashboard. 
  // The public homepage works for everyone. We'll keep it public)

  useEffect(() => {
    async function loadData() {
      setPageLoading(true);
      const [assignmentsRes, equipmentRes] = await Promise.all([
        supabase
          .from('assignments')
          .select(`
            id, job_type, job_sub_type, created_by_role,
            location_district, location_village,
            location_district_override, location_village_override,
            latitude, longitude,
            start_date, equipment_id,
            equipment:heavy_equipment(name, merk_type, nomor_lambung),
            operator:user_profiles!assignments_operator_id_fkey(full_name)
          `)
          .eq('status', 'active'),
        supabase.from('heavy_equipment').select('*').order('name'),
      ]);

      const items = await buildMapItems(assignmentsRes.data || [], equipmentRes.data || []);
      setMapItems(items);
      setPageLoading(false);
    }
    loadData();
  }, []);

  const filteredMapItems = useMemo(() => {
    return mapItems.filter(item => {
      if (filterKecamatan !== 'semua' && item.kecamatan?.toUpperCase() !== filterKecamatan) return false;
      if (filterStatus !== 'semua' && item.status !== filterStatus) return false;
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        const searchable = [
          item.alatName, item.nomorLambung, item.desa, item.kecamatan,
          item.operator, item.pekerjaan, item.seksi
        ].filter(Boolean).join(' ').toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [mapItems, filterKecamatan, filterStatus, filterSearch]);

  return (
    <div className="fullscreen-map-page">
      <header className="public-topbar" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000, background: 'rgba(255,255,255,0.95)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => router.push('/')} className="btn btn-icon" style={{ background: '#f1f5f9' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div>
            <div className="public-brand">Peta Sebaran Alat Berat</div>
            <div className="public-brand-sub">Mode Layar Penuh</div>
          </div>
        </div>
        <div className="public-map-legend" style={{ display: 'none' /* Will manage in CSS if needed */ }}></div>
      </header>

      {/* Floating Filter Bar */}
      <div className="fullscreen-filters">
        <div className="public-filter-search" style={{ flex: 1, minWidth: '200px' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input type="text" placeholder="Cari alat, desa, no. lambung..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} />
        </div>
        <select className="form-control public-filter-select" value={filterKecamatan} onChange={e => setFilterKecamatan(e.target.value)}>
          <option value="semua">Semua Kecamatan</option>
          {KECAMATAN_LIST.map(k => <option key={k} value={k}>{k.charAt(0) + k.slice(1).toLowerCase()}</option>)}
        </select>
        <select className="form-control public-filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          {STATUS_LIST.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div className="fullscreen-map-container" style={{ height: '100vh', width: '100vw', paddingTop: '70px' }}>
        <MapComponent mapItems={filteredMapItems} fullscreenMode={true} />
      </div>
    </div>
  );
}
