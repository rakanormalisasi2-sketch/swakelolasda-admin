'use client';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { geocodeLocation } from '@/lib/geocoder';

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
      <div className="map-loading-spinner" /><span style={{ marginLeft: 12, color: '#64748b' }}>Memuat peta...</span>
    </div>
  )
});

const KANTOR = { lat: -7.165991597493862, lng: 111.89056781736653 };
const JOB_LABELS = { normalisasi: 'Normalisasi', embung: 'Embung', lainnya: 'Lainnya' };

export default function SebaranPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [mapItems, setMapItems] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelTab, setPanelTab] = useState('semua');
  const [focusCoord, setFocusCoord] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [asgRes, eqRes] = await Promise.all([
      supabase.from('assignments').select(`
        id, job_type, job_sub_type, created_by_role,
        location_district, location_village,
        location_district_override, location_village_override,
        latitude, longitude, equipment_id, status,
        equipment:heavy_equipment(id, name, merk_type, nomor_lambung, condition_percentage, status),
        operator:user_profiles!assignments_operator_id_fkey(full_name),
        helper:user_profiles!assignments_helper_id_fkey(full_name)
      `).eq('status', 'active'),
      supabase.from('heavy_equipment').select('*').order('name'),
    ]);
    const asgData = asgRes.data || [];
    const eqData = eqRes.data || [];
    setAssignments(asgData);
    setEquipment(eqData);

    const assignedIds = new Set(asgData.map(a => a.equipment_id).filter(Boolean));
    const items = [];
    const geoCache = {};

    // Non-operating at office
    eqData.filter(e => !assignedIds.has(e.id)).forEach(e => {
      items.push({
        id: e.id, alatName: e.name, merk: e.merk_type, nomorLambung: e.nomor_lambung,
        status: e.status, kondisi: e.condition_percentage != null ? `${e.condition_percentage}%` : 'Baik',
        operator: null, helper: null, pekerjaan: 'Tidak ditugaskan', seksi: null,
        desa: null, kecamatan: null, lat: KANTOR.lat, lng: KANTOR.lng, isAtOffice: true,
      });
    });

    // Operating equipment
    for (const asg of asgData) {
      const e = asg.equipment;
      if (!e) continue;
      const locD = asg.location_village_override || asg.location_village;
      const locK = asg.location_district_override || asg.location_district;
      let lat = null, lng = null;
      if (asg.latitude && asg.longitude) {
        lat = parseFloat(asg.latitude); lng = parseFloat(asg.longitude);
      } else if (locD && locK) {
        const ck = `${locD}|${locK}`.toUpperCase();
        if (geoCache[ck]) { lat = geoCache[ck].lat; lng = geoCache[ck].lng; }
        else {
          try {
            const r = await geocodeLocation(locD, locK);
            if (r) { geoCache[ck] = r; lat = r.lat; lng = r.lng; }
          } catch {}
        }
      }
      const seksiLabel = asg.created_by_role === 'seksi_embung' ? 'Seksi Embung' : asg.created_by_role === 'seksi_normalisasi' ? 'Seksi Normalisasi' : null;
      items.push({
        id: e.id, alatName: e.name, merk: e.merk_type, nomorLambung: e.nomor_lambung,
        status: e.status, kondisi: e.condition_percentage != null ? `${e.condition_percentage}%` : 'Baik',
        operator: asg.operator?.full_name || null, helper: asg.helper?.full_name || null,
        pekerjaan: JOB_LABELS[asg.job_type] || asg.job_sub_type || 'Pekerjaan',
        seksi: seksiLabel, desa: locD, kecamatan: locK,
        lat: lat ?? KANTOR.lat, lng: lng ?? KANTOR.lng,
        isAtOffice: lat === null, isAtJobLocation: lat !== null,
        assignmentId: asg.id, jobType: asg.job_type,
      });
    }
    items.forEach((it, i) => { it._idx = i; });
    setMapItems(items);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Panel job list
  const jobList = useMemo(() => {
    return assignments.map(asg => {
      const e = asg.equipment;
      const locD = asg.location_village_override || asg.location_village;
      const locK = asg.location_district_override || asg.location_district;
      const mi = mapItems.find(m => m.assignmentId === asg.id);
      return {
        id: asg.id, jobType: asg.job_type || 'lainnya',
        desa: locD, kecamatan: locK,
        alatName: e?.name || '-', nomorLambung: e?.nomor_lambung || '-',
        operator: asg.operator?.full_name || '-',
        seksi: asg.created_by_role === 'seksi_embung' ? 'Embung' : 'Normalisasi',
        lat: mi?.lat, lng: mi?.lng, kondisi: e?.condition_percentage,
        equipmentId: e?.id, status: e?.status,
      };
    });
  }, [assignments, mapItems]);

  const filteredJobs = panelTab === 'semua' ? jobList
    : panelTab === 'normalisasi' ? jobList.filter(j => j.jobType === 'normalisasi')
    : jobList.filter(j => j.jobType === 'embung');

  const handleFocusMap = (lat, lng) => {
    if (lat && lng) setFocusCoord({ lat, lng, ts: Date.now() });
  };

  const openRouteGMaps = (lat, lng) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, '_blank');
  };

  // Edit kondisi alat redirect
  const openEditModal = (eqId) => {
    router.push(`/dashboard/peralatan?edit=${eqId}`);
  };

  const condColor = (p) => p >= 70 ? '#16a34a' : p >= 40 ? '#d97706' : '#dc2626';

  return (
    <>
      <div className="header">
        <div>
          <div className="header-title">Peta Sebaran Alat Berat</div>
          <div className="header-subtitle">Monitoring Lokasi & Kondisi Real-time</div>
        </div>
      </div>

      <div style={{ position: 'relative', height: 'calc(100vh - 130px)', display: 'flex' }}>
        {/* MAP */}
        <div style={{ flex: 1, position: 'relative' }}>
          {loading ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
              <div className="map-loading-spinner" /><span style={{ marginLeft: 12, color: '#64748b' }}>Memuat data peta...</span>
            </div>
          ) : (
            <MapComponent mapItems={mapItems} focusCoord={focusCoord} onMarkerEdit={openEditModal} />
          )}
        </div>

        {/* PANEL DAFTAR PEKERJAAN */}
        <div style={{
          width: panelOpen ? 380 : 0, minWidth: panelOpen ? 380 : 0,
          transition: 'all 0.3s', overflow: 'hidden',
          borderLeft: '1px solid #e2e8f0', background: '#fff', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '16px 16px 8px', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 8 }}>📋 Daftar Pekerjaan Aktif</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['semua', 'normalisasi', 'embung'].map(t => (
                <button key={t} onClick={() => setPanelTab(t)}
                  style={{
                    flex: 1, padding: '6px 8px', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
                    borderRadius: 6,
                    background: panelTab === t ? (t === 'embung' ? '#dbeafe' : t === 'normalisasi' ? '#dcfce7' : '#f1f5f9') : 'transparent',
                    color: panelTab === t ? (t === 'embung' ? '#1e40af' : t === 'normalisasi' ? '#166534' : '#0f172a') : '#64748b',
                  }}>
                  {t === 'semua' ? 'Semua' : t === 'normalisasi' ? '🏞️ Normalisasi' : '🏗️ Embung'}
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
            {filteredJobs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8', fontSize: 13 }}>Tidak ada pekerjaan aktif.</div>
            ) : filteredJobs.map(j => (
              <div key={j.id} style={{
                border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', marginBottom: 8,
                cursor: 'pointer', transition: 'all 0.15s',
                borderLeft: `4px solid ${j.jobType === 'embung' ? '#3b82f6' : '#22c55e'}`,
              }}
                onClick={() => handleFocusMap(j.lat, j.lng)}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{j.alatName}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{j.nomorLambung}</div>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                    background: j.jobType === 'embung' ? '#dbeafe' : '#dcfce7',
                    color: j.jobType === 'embung' ? '#1e40af' : '#166534',
                  }}>{j.seksi}</span>
                </div>
                <div style={{ fontSize: 11, color: '#334155', marginBottom: 4 }}>
                  📍 Desa {j.desa || '-'}, Kec. {j.kecamatan || '-'}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>
                  👤 {j.operator}
                  {j.kondisi != null && <span style={{ float: 'right', fontWeight: 600, color: condColor(j.kondisi) }}>{j.kondisi}%</span>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-sm" style={{ flex: 1, fontSize: 10, padding: '4px 6px', background: '#f1f5f9', border: 'none', color: '#334155' }}
                    onClick={e => { e.stopPropagation(); handleFocusMap(j.lat, j.lng); }}>
                    🎯 Fokus Peta
                  </button>
                  {j.lat && j.lng && !j.isAtOffice && (
                    <button className="btn btn-sm" style={{ flex: 1, fontSize: 10, padding: '4px 6px', background: '#dbeafe', border: 'none', color: '#1e40af' }}
                      onClick={e => { e.stopPropagation(); openRouteGMaps(j.lat, j.lng); }}>
                      🧭 Rute GMaps
                    </button>
                  )}
                  {j.equipmentId && (
                    <button className="btn btn-sm" style={{ flex: 1, fontSize: 10, padding: '4px 6px', background: '#fef3c7', border: 'none', color: '#92400e' }}
                      onClick={e => { e.stopPropagation(); openEditModal(j.equipmentId); }}>
                      ✏️ Edit
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '8px 12px', borderTop: '1px solid #e2e8f0', fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
            {filteredJobs.length} pekerjaan aktif
          </div>
        </div>

        {/* Toggle Panel Button */}
        <button onClick={() => setPanelOpen(!panelOpen)} style={{
          position: 'absolute', right: panelOpen ? 380 : 0, top: 12, zIndex: 1000,
          width: 28, height: 56, border: '1px solid #e2e8f0', borderRight: 'none',
          borderRadius: '6px 0 0 6px', background: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'right 0.3s', boxShadow: '-2px 0 8px rgba(0,0,0,0.08)',
          fontSize: 14, color: '#64748b',
        }}>
          {panelOpen ? '▶' : '◀'}
        </button>
      </div>

    </>
  );
}
