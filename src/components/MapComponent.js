'use client';
import { useEffect, useRef } from 'react';

const KANTOR_COORDS = { lat: -7.165991597493862, lng: 111.89056781736653 };
const BOJONEGORO_CENTER = { lat: -7.15, lng: 111.88 };

const STATUS_COLORS = {
  operating: { color: '#d97706', bg: '#fef3c7', label: 'Beroperasi' },
  ready: { color: '#16a34a', bg: '#dcfce7', label: 'Siap' },
  maintenance: { color: '#7c3aed', bg: '#ede9fe', label: 'Maintenance' },
};

function buildRouteUrl(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}`;
}

function createIconHtml(status, isAtOffice) {
  const cfg = STATUS_COLORS[status] || STATUS_COLORS.ready;
  const color = isAtOffice ? '#64748b' : cfg.color;
  const bg = isAtOffice ? '#f1f5f9' : cfg.bg;
  const label = isAtOffice ? 'Kantor' : cfg.label;

  return `<div style="position:relative;width:44px;height:44px;">
    <div style="width:40px;height:40px;background:${bg};border:3px solid ${color};border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.18);margin:auto;">
      <div style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="${color}"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
      </div>
    </div>
    <div style="position:absolute;top:-18px;left:50%;transform:translateX(-50%);background:${color};color:#fff;font-size:9px;font-weight:700;padding:2px 6px;border-radius:999px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.2);">${label}</div>
  </div>`;
}

function buildPopupHtml(item) {
  const cfg = STATUS_COLORS[item.status] || STATUS_COLORS.ready;
  const color = item.isAtOffice ? '#64748b' : cfg.color;
  const bg = item.isAtOffice ? '#f1f5f9' : cfg.bg;
  const statusLabel = item.isAtOffice ? 'Di Kantor' : cfg.label;

  const rows = [
    item.merk ? `<div class="mp-row"><span class="mp-label">Merk / Tipe</span><span class="mp-value">${item.merk}</span></div>` : '',
    item.nomorLambung ? `<div class="mp-row"><span class="mp-label">No. Lambung</span><span class="mp-value mp-mono">${item.nomorLambung}</span></div>` : '',
    item.desa ? `<div class="mp-row"><span class="mp-label">Desa</span><span class="mp-value">${item.desa}</span></div>` : '',
    item.kecamatan ? `<div class="mp-row"><span class="mp-label">Kecamatan</span><span class="mp-value">${item.kecamatan}</span></div>` : '',
    item.pekerjaan ? `<div class="mp-row"><span class="mp-label">Pekerjaan</span><span class="mp-value">${item.pekerjaan}</span></div>` : '',
    item.operator ? `<div class="mp-row"><span class="mp-label">Operator</span><span class="mp-value">${item.operator}</span></div>` : '',
    item.kondisi ? `<div class="mp-row"><span class="mp-label">Kondisi</span><span class="mp-value">${item.kondisi}</span></div>` : '',
  ].filter(Boolean).join('');

  return `<div class="map-popup">
    <div class="map-popup-header">
      <span class="map-popup-title">${item.alatName || 'Alat Berat'}</span>
      <span class="map-popup-status" style="background:${bg};color:${color}">${statusLabel}</span>
    </div>
    <div class="map-popup-body">${rows}</div>
    <a href="${buildRouteUrl(item.lat, item.lng)}" target="_blank" rel="noopener noreferrer" class="map-popup-route">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 19h20L12 2z" fill="currentColor" opacity="0.2"/><path d="M12 2L2 19h20L12 2z"/></svg>
      Buka Rute di Maps
    </a>
  </div>`;
}

let loadLeafletPromise = null;

function loadLeaflet() {
  if (loadLeafletPromise) return loadLeafletPromise;
  loadLeafletPromise = new Promise((resolve) => {
    if (window.L) { resolve(window.L); return; }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.crossOrigin = '';
    script.onload = () => resolve(window.L);
    document.head.appendChild(script);
  });
  return loadLeafletPromise;
}

export default function MapComponent({ mapItems }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  // Ensure mapItems is always a valid array
  const safeItems = Array.isArray(mapItems) ? mapItems : [];

  useEffect(() => {
    if (mapInstanceRef.current || !mapRef.current) return;

    let cancelled = false;

    loadLeaflet().then((L) => {
      if (cancelled || !mapRef.current) return;

      const map = L.map(mapRef.current, {
        center: [BOJONEGORO_CENTER.lat, BOJONEGORO_CENTER.lng],
        zoom: 11,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      mapInstanceRef.current = map;
      renderMarkers(L, map, safeItems);
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!window.L || !mapInstanceRef.current) return;
    renderMarkers(window.L, mapInstanceRef.current, safeItems);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapItems]);

  function renderMarkers(L, map, items) {
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const groups = {};
    items.forEach((item, idx) => {
      if (!item.lat || !item.lng) return;
      const key = `${item.lat.toFixed(5)}_${item.lng.toFixed(5)}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push({ ...item, _idx: idx });
    });

    items.forEach((item) => {
      if (!item.lat || !item.lng) return;

      const key = `${item.lat.toFixed(5)}_${item.lng.toFixed(5)}`;
      const group = groups[key];
      const isClustered = group && group.length > 1;
      let offsetLat = 0, offsetLng = 0;

      if (isClustered) {
        const groupIdx = group.findIndex(g => g._idx === item._idx);
        if (groupIdx > 0) {
          const angle = (groupIdx / group.length) * 2 * Math.PI;
          offsetLat = Math.cos(angle) * 0.0015;
          offsetLng = Math.sin(angle) * 0.0015;
        }
      }

      const icon = L.divIcon({
        html: createIconHtml(item.status, item.isAtOffice),
        className: '',
        iconSize: [44, 44],
        iconAnchor: [22, 44],
        popupAnchor: [0, -48],
      });

      const marker = L.marker([item.lat + offsetLat, item.lng + offsetLng], { icon }).addTo(map);
      marker.bindPopup(buildPopupHtml(item), { maxWidth: 280 });
      markersRef.current.push(marker);
    });

    if (markersRef.current.length > 0) {
      try {
        map.fitBounds(L.featureGroup(markersRef.current).getBounds().pad(0.15), { maxZoom: 13 });
      } catch {
        map.setView([BOJONEGORO_CENTER.lat, BOJONEGORO_CENTER.lng], 11);
      }
    }
  }

  return <div ref={mapRef} className="map-container" />;
}
