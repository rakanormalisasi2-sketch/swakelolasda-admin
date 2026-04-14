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

function getEquipmentSvg(name = '') {
  const n = name.toLowerCase();
  
  if (n.includes('excavator') || n.includes('beko')) {
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M19 15v-3h-2v-2h-3v2h-1l-2-2h-2v2l-3 3v4h2v1h8v-1h2v-4h-1zm-10 1H7v-2h2v2zm5-5h2v2h-2v-2zm-5-3l1-2h4l1 2H9zM2 19h20v2H2v-2z" /></svg>`;
  }
  if (n.includes('dozer') || n.includes('bulldozer')) {
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-4h-2v-3h-5v7h-8v-2H4v5h17v-3zM7 11h4l1-3h3v3h3v-2H7v2zM2 19h20v2H2v-2z" /></svg>`;
  }
  if (n.includes('truk') || n.includes('dump')) {
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20 8h-3V4H3v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-2zM8 16.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm12-3.5h-1.5v-2.5h-4v2.5H11V6h4.5l3.5 2.5v4.5zM20 16.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" /></svg>`;
  }
  if (n.includes('pompa')) {
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-12h2v5h-2zm0 6h2v2h-2z" /></svg>`;
  }
  
  // Default (Tools)
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="${name ? 'currentColor' : 'currentColor'}"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>`;
}

function createIconHtml(status, isAtOffice, alatName) {
  const cfg = STATUS_COLORS[status] || STATUS_COLORS.ready;
  const color = isAtOffice ? '#64748b' : cfg.color;
  const bg = isAtOffice ? '#f1f5f9' : cfg.bg;
  const label = isAtOffice ? 'Kantor' : cfg.label;
  const svgHtml = getEquipmentSvg(alatName);

  return `<div style="position:relative;width:48px;height:48px;">
    <div style="width:44px;height:44px;background:${bg};border:3px solid ${color};border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.18);margin:auto;z-index:2;position:relative;">
      <div style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center;color:${color}">
        ${svgHtml}
      </div>
    </div>
    <div style="position:absolute;top:-16px;left:50%;transform:translateX(-50%);background:${color};color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);z-index:3;">${label}</div>
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
        spiderfyDistanceMultiplier: 2.2, // Spread out wider to prevent overlap
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

    const groups = {};
    items.forEach((item, idx) => {
      if (!item.lat || !item.lng) return;
      const key = `${item.lat.toFixed(4)}_${item.lng.toFixed(4)}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push({ ...item, _idx: idx });
    });

    items.forEach((item) => {
      if (!item.lat || !item.lng) return;
      
      const key = `${item.lat.toFixed(4)}_${item.lng.toFixed(4)}`;
      const group = groups[key];
      const isClustered = group && group.length > 1;
      let offsetLat = 0, offsetLng = 0;

      // Automatically organically spread points at identical locations
      if (isClustered) {
        const groupIdx = group.findIndex(g => g._idx === item._idx);
        if (groupIdx > 0) {
          const angle = (groupIdx / group.length) * 2 * Math.PI;
          // Radius of spread increases slightly with more items
          const radius = 0.0004 + (group.length * 0.00002);
          offsetLat = Math.cos(angle) * radius;
          offsetLng = Math.sin(angle) * radius;
        }
      }

      const icon = L.divIcon({
        html: createIconHtml(item.status, item.isAtOffice, item.alatName),
        className: '',
        iconSize: [44, 44],
        iconAnchor: [22, 44],
        popupAnchor: [0, -48],
      });

      const marker = L.marker([item.lat + offsetLat, item.lng + offsetLng], { icon });
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
