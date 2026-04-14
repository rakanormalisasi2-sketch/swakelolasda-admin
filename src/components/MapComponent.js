'use client';
import { useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';

const KANTOR_COORDS = { lat: -7.165991597493862, lng: 111.89056781736653 };
const BOJONEGORO_CENTER = { lat: -7.15, lng: 111.88 };

const STATUS_COLORS = {
  operating: { color: '#d97706', bg: '#fef3c7', label: 'Beroperasi' },
  ready: { color: '#16a34a', bg: '#dcfce7', label: 'Siap' },
  maintenance: { color: '#7c3aed', bg: '#ede9fe', label: 'Maintenance' },
};

function buildRouteUrl(lat, lng) {
  const encoded = encodeURIComponent(`${lat},${lng}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
}

function buildWebMapUrl(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function createCustomIcon(status, isAtOffice) {
  if (typeof window === 'undefined') return null;
  const L = window.L;
  const cfg = STATUS_COLORS[status] || STATUS_COLORS.ready;
  const color = isAtOffice ? '#64748b' : cfg.color;
  const bg = isAtOffice ? '#f1f5f9' : cfg.bg;
  const label = isAtOffice ? 'Kantor' : cfg.label;

  const html = `
    <div style="
      width: 44px; height: 44px;
      background: ${bg};
      border: 3px solid ${color};
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 3px 10px rgba(0,0,0,0.18);
    ">
      <div style="
        transform: rotate(45deg);
        font-size: 16px; line-height: 1;
        display: flex; align-items: center; justify-content: center;
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
    </div>
    <div style="
      position: absolute; top: -20px; left: 50%;
      transform: translateX(-50%);
      background: ${color}; color: white;
      font-size: 10px; font-weight: 700;
      padding: 2px 6px; border-radius: 999px;
      white-space: nowrap; pointer-events: none;
      box-shadow: 0 1px 4px rgba(0,0,0,0.2);
    ">${label}</div>
  `;

  return L.divIcon({ html, className: '', iconSize: [44, 44], iconAnchor: [22, 44], popupAnchor: [0, -48] });
}

export default function MapComponent({ mapItems }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (mapInstanceRef.current || !mapRef.current) return;

    const initMap = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

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

      // make L available globally for createCustomIcon
      window.L = L;
      mapInstanceRef.current = map;

      // initial render
      renderMarkers(L, map, mapItems);
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const renderMarkersAsync = async () => {
      const L = window.L;
      if (!L) return;
      renderMarkers(L, mapInstanceRef.current, mapItems);
    };
    renderMarkersAsync();
  }, [mapItems]);

  function renderMarkers(L, map, items) {
    // clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const locationGroups = {};

    items.forEach((item, idx) => {
      if (!item.lat || !item.lng) return;

      const key = `${item.lat.toFixed(5)}_${item.lng.toFixed(5)}`;
      if (!locationGroups[key]) locationGroups[key] = [];
      locationGroups[key].push({ ...item, idx });
    });

    items.forEach((item) => {
      if (!item.lat || !item.lng) return;

      const key = `${item.lat.toFixed(5)}_${item.lng.toFixed(5)}`;
      const group = locationGroups[key];
      const isClustered = group.length > 1;
      let offsetLat = 0, offsetLng = 0;

      if (isClustered) {
        const groupIndex = group.findIndex(g => g.idx === item._idx);
        if (groupIndex > 0) {
          const angle = (groupIndex / group.length) * 2 * Math.PI;
          const radius = 0.0015;
          offsetLat = Math.cos(angle) * radius;
          offsetLng = Math.sin(angle) * radius;
        }
      }

      const isAtOffice = item.isAtOffice || false;
      const icon = createCustomIcon(item.status, isAtOffice);
      if (!icon) return;

      const marker = L.marker([item.lat + offsetLat, item.lng + offsetLng], { icon })
        .addTo(map);

      const popupContent = `
        <div class="map-popup">
          <div class="map-popup-header">
            <span class="map-popup-title">${item.alatName || 'Alat Berat'}</span>
            <span class="map-popup-status" style="background:${isAtOffice ? '#f1f5f9' : (STATUS_COLORS[item.status] || STATUS_COLORS.ready).bg}; color:${isAtOffice ? '#64748b' : (STATUS_COLORS[item.status] || STATUS_COLORS.ready).color}">
              ${isAtOffice ? 'Di Kantor' : (STATUS_COLORS[item.status] || STATUS_COLORS.ready).label}
            </span>
          </div>
          <div class="map-popup-body">
            ${item.merk ? `<div class="map-popup-row"><span class="map-popup-label">Merk / Tipe</span><span class="map-popup-value">${item.merk}</span></div>` : ''}
            ${item.nomorLambung ? `<div class="map-popup-row"><span class="map-popup-label">No. Lambung</span><span class="map-popup-value map-popup-mono">${item.nomorLambung}</span></div>` : ''}
            ${item.desa ? `<div class="map-popup-row"><span class="map-popup-label">Desa</span><span class="map-popup-value">${item.desa}</span></div>` : ''}
            ${item.kecamatan ? `<div class="map-popup-row"><span class="map-popup-label">Kecamatan</span><span class="map-popup-value">${item.kecamatan}</span></div>` : ''}
            ${item.pekerjaan ? `<div class="map-popup-row"><span class="map-popup-label">Pekerjaan</span><span class="map-popup-value">${item.pekerjaan}</span></div>` : ''}
            ${item.operator ? `<div class="map-popup-row"><span class="map-popup-label">Operator</span><span class="map-popup-value">${item.operator}</span></div>` : ''}
            ${item.kondisi ? `<div class="map-popup-row"><span class="map-popup-label">Kondisi</span><span class="map-popup-value">${item.kondisi}</span></div>` : ''}
          </div>
          <a href="${buildRouteUrl(item.lat, item.lng)}" target="_blank" rel="noopener noreferrer" class="map-popup-route">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M12 2L2 19h20L12 2z" fill="currentColor" opacity="0.2"/>
              <path d="M12 2L2 19h20L12 2z"/>
            </svg>
            Buka Rute di Maps
          </a>
        </div>
      `;

      marker.bindPopup(popupContent, {
        maxWidth: 280,
        className: 'custom-popup',
      });

      markersRef.current.push(marker);
    });

    // fit bounds if we have markers
    if (markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current);
      try {
        map.fitBounds(group.getBounds().pad(0.15), { maxZoom: 13 });
      } catch (e) {
        map.setView([BOJONEGORO_CENTER.lat, BOJONEGORO_CENTER.lng], 11);
      }
    }
  }

  return <div ref={mapRef} className="map-container" />;
}
