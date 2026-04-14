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

  const isOperating = item.status === 'operating' && !item.isAtOffice;
  
  // Render rows based on status (idle/maintenance = skip GIS data)
  const rows = isOperating ? [
    item.merk ? `<div class="map-popup-row"><span class="map-popup-label">Merk/Tipe</span><span class="map-popup-value">${item.merk}</span></div>` : '',
    item.nomorLambung ? `<div class="map-popup-row"><span class="map-popup-label">No. Lambung</span><span class="map-popup-value map-popup-mono">${item.nomorLambung}</span></div>` : '',
    item.desa ? `<div class="map-popup-row"><span class="map-popup-label">Desa</span><span class="map-popup-value">${item.desa}</span></div>` : '',
    item.kecamatan ? `<div class="map-popup-row"><span class="map-popup-label">Kecamatan</span><span class="map-popup-value">${item.kecamatan}</span></div>` : '',
    item.pekerjaan ? `<div class="map-popup-row"><span class="map-popup-label">Pekerjaan</span><span class="map-popup-value">${item.pekerjaan}</span></div>` : '',
    item.operator ? `<div class="map-popup-row"><span class="map-popup-label">Operator</span><span class="map-popup-value">${item.operator}</span></div>` : '',
    item.kondisi ? `<div class="map-popup-row"><span class="map-popup-label">Kondisi</span><span class="map-popup-value">${item.kondisi}</span></div>` : '',
  ] : [
    item.merk ? `<div class="map-popup-row"><span class="map-popup-label">Merk/Tipe</span><span class="map-popup-value">${item.merk}</span></div>` : '',
    item.nomorLambung ? `<div class="map-popup-row"><span class="map-popup-label">No. Lambung</span><span class="map-popup-value map-popup-mono">${item.nomorLambung}</span></div>` : '',
    item.kondisi ? `<div class="map-popup-row"><span class="map-popup-label">Kondisi</span><span class="map-popup-value">${item.kondisi}</span></div>` : '',
  ];

  const seksiBadge = item.seksi ? `<span style="display:block;font-size:11px;color:#1a56db;margin-top:2px;font-weight:600;">${item.seksi}</span>` : '';

  const routeBtn = isOperating ? `<a href="${buildRouteUrl(item.lat, item.lng)}" target="_blank" rel="noopener noreferrer" class="map-popup-route">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 19h20L12 2z" fill="currentColor" opacity="0.2"/><path d="M12 2L2 19h20L12 2z"/></svg>
      Buka Rute di Maps
    </a>` : '';

  return `<div class="map-popup">
    <div class="map-popup-header">
      <div style="flex:1;">
        <div class="map-popup-title">${item.alatName || 'Alat Berat'}</div>
        ${seksiBadge}
      </div>
      <span class="map-popup-status" style="background:${bg};color:${color}">${statusLabel}</span>
    </div>
    <div class="map-popup-body">${rows.filter(Boolean).join('')}</div>
    ${routeBtn}
  </div>`;
}

let loadDependenciesPromise = null;

function loadDependencies() {
  if (loadDependenciesPromise) return loadDependenciesPromise;
  loadDependenciesPromise = new Promise((resolve) => {
    if (window.L && window.L.markerClusterGroup) { resolve(window.L); return; }
    
    // Load Leaflet Core
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    
    // Load Leaflet CSS
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    
    // Load MarkerCluster JS
    const clusterScript = document.createElement('script');
    clusterScript.src = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
    
    // Load MarkerCluster CSS
    const clusterCss = document.createElement('link');
    clusterCss.rel = 'stylesheet';
    clusterCss.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';
    const clusterDefCss = document.createElement('link');
    clusterDefCss.rel = 'stylesheet';
    clusterDefCss.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css';

    script.onload = () => {
      document.head.appendChild(clusterScript);
      clusterScript.onload = () => resolve(window.L);
    };

    document.head.appendChild(css);
    document.head.appendChild(clusterCss);
    document.head.appendChild(clusterDefCss);
    document.head.appendChild(script);
  });
  return loadDependenciesPromise;
}

export default function MapComponent({ mapItems, previewMode = false }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const clusterGroupRef = useRef(null);

  const safeItems = Array.isArray(mapItems) ? mapItems : [];

  useEffect(() => {
    if (mapInstanceRef.current || !mapRef.current) return;
    let cancelled = false;

    loadDependencies().then((L) => {
      if (cancelled || !mapRef.current) return;

      const map = L.map(mapRef.current, {
        center: [BOJONEGORO_CENTER.lat, BOJONEGORO_CENTER.lng],
        zoom: previewMode ? 10 : 11,
        zoomControl: !previewMode,
        scrollWheelZoom: !previewMode,
        dragging: !previewMode,
        doubleClickZoom: !previewMode,
        touchZoom: !previewMode,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 18,
      }).addTo(map);

      clusterGroupRef.current = L.markerClusterGroup({
        maxClusterRadius: 40,
        disableClusteringAtZoom: 16,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
      });
      map.addLayer(clusterGroupRef.current);

      mapInstanceRef.current = map;
      renderMarkers(L, map, clusterGroupRef.current, safeItems);
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!window.L || !mapInstanceRef.current || !clusterGroupRef.current) return;
    renderMarkers(window.L, mapInstanceRef.current, clusterGroupRef.current, safeItems);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapItems]);

  function renderMarkers(L, map, clusterGroup, items) {
    clusterGroup.clearLayers();
    const markers = [];

    items.forEach((item) => {
      if (!item.lat || !item.lng) return;

      const icon = L.divIcon({
        html: createIconHtml(item.status, item.isAtOffice),
        className: '',
        iconSize: [44, 44],
        iconAnchor: [22, 44],
        popupAnchor: [0, -48],
      });

      const marker = L.marker([item.lat, item.lng], { icon });
      if (!previewMode) {
        marker.bindPopup(buildPopupHtml(item), { maxWidth: 280, minWidth: 260 });
      }
      markers.push(marker);
    });

    if (markers.length > 0) {
      clusterGroup.addLayers(markers);
      if (!previewMode) {
        try {
          map.fitBounds(clusterGroup.getBounds().pad(0.15), { maxZoom: 14 });
        } catch {}
      }
    }
  }

  return <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: '100%' }} />;
}
