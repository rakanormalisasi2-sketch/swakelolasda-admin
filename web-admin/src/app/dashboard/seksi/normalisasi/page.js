'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
      Memuat peta...
    </div>
  )
});

const JOB_LABELS = { normalisasi: 'Normalisasi', embung: 'Embung', lainnya: 'Lainnya' };
const SUB_LABELS = { normalisasi_sungai: 'Normalisasi Sungai', saluran_afvoer: 'Saluran Air/Afvoer', normalisasi_embung: 'Normalisasi Embung', pembangunan_embung: 'Pembangunan Embung' };
const KANTOR_COORDS = { lat: -7.165991597493862, lng: 111.89056781736653 };

export default function SeksiNormalisasiMapPage() {
  const { profile } = useAuth();
  const [mapItems, setMapItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignmentCount, setAssignmentCount] = useState(0);

  const buildMapItems = useCallback(async (assignments) => {
    const geocodeCache = {};
    const { geocodeLocation } = await import('@/lib/geocoder');

    const items = await Promise.all(assignments.map(async (a) => {
      const district = a.location_district_override || a.location_district || '';
      const village = a.location_village_override || a.location_village || '';
      const eq = Array.isArray(a.equipment) ? a.equipment[0] : a.equipment;

      let lat = null, lng = null;

      // PRIORITY 1: Manual coordinates
      if (a.latitude && a.longitude) {
        lat = parseFloat(a.latitude);
        lng = parseFloat(a.longitude);
      }

      // PRIORITY 2: geocodeLocation
      if ((lat === null || lng === null) && village && district) {
        const cacheKey = `${village}|${district}`;
        if (geocodeCache[cacheKey] !== undefined) {
          const result = geocodeCache[cacheKey];
          if (result) { lat = result.lat; lng = result.lng; }
        } else {
          geocodeCache[cacheKey] = undefined;
          const result = await geocodeLocation(village, district);
          geocodeCache[cacheKey] = result;
          if (result) { lat = result.lat; lng = result.lng; }
        }
      }

      return {
        id: eq?.id || a.id,
        alatName: [eq?.nomor_lambung, eq?.merk_type ? `(${eq.merk_type})` : null, eq?.name].filter(Boolean).join(' ') || 'Alat Berat',
        status: eq?.status || 'ready',
        merk: eq?.merk_type,
        nomorLambung: eq?.nomor_lambung,
        desa: village,
        kecamatan: district,
        pekerjaan: a.job_sub_type ? SUB_LABELS[a.job_sub_type] || a.job_type : JOB_LABELS[a.job_type] || a.job_type,
        operator: a.operator?.full_name || '—',
        helper: a.helper_override || a.helper?.full_name || '—',
        kondisi: `${eq?.condition_percentage || 100}%`,
        seksi: 'Normalisasi',
        lat: lat ?? KANTOR_COORDS.lat,
        lng: lng ?? KANTOR_COORDS.lng,
        isAtOffice: lat === null,
      };
    }));

    return items;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: assignments, error } = await supabase
        .from('assignments')
        .select(`
          *,
          operator:user_profiles!assignments_operator_id_fkey(full_name),
          helper:user_profiles!assignments_helper_id_fkey(full_name),
          equipment:heavy_equipment(name, merk_type, nomor_lambung, status, condition_percentage)
        `)
        .eq('status', 'active')
        .eq('created_by_role', 'seksi_normalisasi')
        .order('start_date', { ascending: false });

      if (error) throw error;

      setAssignmentCount(assignments?.length || 0);
      const items = await buildMapItems(assignments || []);
      setMapItems(items);
    } catch (err) {
      console.error('Error loading seksi normalisasi map:', err);
    } finally {
      setLoading(false);
    }
  }, [buildMapItems]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div className="header">
        <div>
          <div className="header-title">Peta Sebaran — Seksi Normalisasi</div>
          <div className="header-subtitle">Lokasi penugasan aktif seksi Normalisasi</div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{
            background: '#e8f0fe',
            color: '#1a56db',
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
          }}>
            {assignmentCount} Penugasan Aktif
          </span>
        </div>
      </div>

      <div style={{
        height: 'calc(100vh - 180px)',
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid var(--border)',
      }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            Memuat...
          </div>
        ) : mapItems.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            Tidak ada penugasan aktif seksi Normalisasi.
          </div>
        ) : (
          <MapComponent mapItems={mapItems} />
        )}
      </div>
    </>
  );
}
