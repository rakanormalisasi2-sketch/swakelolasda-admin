'use client';

/**
 * CrossSectionSVG.js
 * Government-standard Cross-Section Technical Drawing
 *
 * Reference: gambar teknik.png + SUNGAI SEMAR MENDEM
 * Features:
 * - Kop Government VERTICAL di KIRI (DINAS PU SUMBER DAYA AIR)
 * - Cross-section dengan Arsiran VERTIKAL (│ │ │ │) untuk area galian
 * - Legenda dengan 3 item: Kontur Eksisting, Rencana Galian, Area Galian
 * - Dimension labels: b₁, b₂, b₃, h, Slope 1:n
 * - Skala indicator
 * - Stamp area: CHECKED/DRAWN/BY
 */

import React from 'react';

// Generate kontur natural (meliuk-liuk seperti sungai asli)
function generateKonturEksisting(b3, hPrime, numPoints = 15) {
  const points = [];
  for (let i = 0; i < numPoints; i++) {
    const x = (i / (numPoints - 1)) * b3;
    const undulation = Math.sin(i * 1.5) * 0.08 * hPrime + Math.sin(i * 0.7) * 0.05 * hPrime;
    const y = hPrime + undulation;
    points.push({ x, y });
  }
  return points;
}

// Generate kontur rencana (trapesium terbalik)
function generateKonturRencana(b1, b2, b3, h, hPrime, slope) {
  return [
    { x: 0, y: hPrime },
    { x: b3, y: hPrime },
    { x: b1 + slope * h, y: hPrime - h },
    { x: -(slope * h), y: hPrime - h }
  ];
}

// Path string from points
function pointsToPath(points, toSvg) {
  if (!points || points.length < 2) return '';
  const svgPoints = points.map(p => toSvg(p.x, p.y));
  let path = `M ${svgPoints[0].x} ${svgPoints[0].y}`;
  for (let i = 1; i < svgPoints.length - 1; i++) {
    const midX = (svgPoints[i].x + svgPoints[i + 1].x) / 2;
    const midY = (svgPoints[i].y + svgPoints[i + 1].y) / 2;
    path += ` Q ${svgPoints[i].x} ${svgPoints[i].y} ${midX} ${midY}`;
  }
  path += ` L ${svgPoints[svgPoints.length - 1].x} ${svgPoints[svgPoints.length - 1].y}`;
  return path;
}

// Area galian path (between eksisting and rencana)
function generateAreaGalianPath(rencana, eksisting, toSvg) {
  const rencanaCoords = [rencana[0], rencana[1]].map(p => toSvg(p.x, p.y));
  const eksistingCoords = [...eksisting].reverse().map(p => toSvg(p.x, p.y));
  const allPoints = [...rencanaCoords, ...eksistingCoords];
  if (allPoints.length === 0) return '';
  return allPoints.map((p, i) => i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`).join(' ') + ' Z';
}

// Generate smooth kontur path
function generateKonturPath(kontur, toSvg) {
  if (!kontur || kontur.length < 2) return '';
  const svgPoints = kontur.map(p => toSvg(p.x, p.y));
  let path = `M ${svgPoints[0].x} ${svgPoints[0].y}`;
  for (let i = 1; i < svgPoints.length - 1; i++) {
    const midX = (svgPoints[i].x + svgPoints[i + 1].x) / 2;
    const midY = (svgPoints[i].y + svgPoints[i + 1].y) / 2;
    path += ` Q ${svgPoints[i].x} ${svgPoints[i].y} ${midX} ${midY}`;
  }
  path += ` L ${svgPoints[svgPoints.length - 1].x} ${svgPoints[svgPoints.length - 1].y}`;
  return path;
}

// Generate trapesium rencana path
function generateRencanaPath(rencana, toSvg) {
  const coords = rencana.map(p => toSvg(p.x, p.y));
  return coords.map((p, i) => i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`).join(' ') + ' Z';
}

/**
 * KopInline - Government Header (vertical, positioned at LEFT side)
 * Matches reference: PEMERINTAH KABUPATEN BOJONEGORO / DINAS PU
 */
const KopInline = ({ data, width = 140, height = 400 }) => {
  const {
    program = 'PROGRAM PENGELOLAAN SUMBER DAYA AIR (SDA)',
    kegiatan = 'PENGELOLAAN SDA DAN BANGUNAN PENGAMAN PANTAI PADA WILAYAH SUNGAI',
    pekerjaan = '-',
    lokasi = '-',
    tahun = new Date().getFullYear(),
    sta = '0+000',
    skala = '1:50',
    kodeGambar = 'NS-01',
    noLembar = 1,
    jumlahLembar = 5,
    jenis = 'PERENCANAAN'
  } = data;

  const isPelaksanaan = jenis === 'PELAKSANAAN';
  const fs = 7;
  const fsSmall = 6;

  return (
    <foreignObject x={0} y={0} width={width} height={height}>
      <div xmlns="http://www.w3.org/1999/xhtml" style={{
        width: `${width}px`,
        height: `${height}px`,
        borderRight: '2px solid #1E3A5F',
        padding: '4px',
        fontSize: `${fs}px`,
        fontFamily: 'Arial, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'white',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        {/* Header Logo */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #1E3A5F', paddingBottom: '3px', marginBottom: '3px', backgroundColor: '#1E3A5F', marginLeft: '-4px', marginRight: '-4px', paddingLeft: '4px', paddingRight: '4px' }}>
          <div style={{ color: 'white', fontWeight: 'bold', fontSize: `${fsSmall}px` }}>PEMERINTAH KABUPATEN BOJONEGORO</div>
          <div style={{ color: '#FFD700', fontWeight: 'bold', fontSize: `${fs}px` }}>DINAS PEKERJAAN UMUM DAN PENATAAN RUANG</div>
          <div style={{ color: 'white', fontWeight: 'bold', fontSize: `${fsSmall}px` }}>SUMBER DAYA AIR</div>
        </div>

        {/* Info fields */}
        {[
          { label: 'PROGRAM', value: program, bg: '#EBF5FB' },
          { label: 'KEGIATAN', value: kegiatan, bg: '#FFFFFF' },
          { label: 'PEKERJAAN', value: pekerjaan, bg: '#EBF5FB' },
          { label: 'LOKASI', value: lokasi, bg: '#FFFFFF' },
          { label: 'TAHUN ANGGARAN', value: String(tahun), bg: '#EBF5FB' }
        ].map(({ label, value, bg }, idx) => (
          <div key={idx} style={{ marginBottom: '2px', borderBottom: '1px solid #ccc', paddingBottom: '1px', backgroundColor: bg }}>
            <div style={{ fontWeight: 'bold', fontSize: `${fsSmall}px`, color: '#1E3A5F' }}>{label}:</div>
            <div style={{ fontSize: `${fsSmall - 1}px`, color: '#333', lineHeight: 1.1, maxHeight: '28px', overflow: 'hidden' }}>{value}</div>
          </div>
        ))}

        {/* Jenis (warna sesuai) */}
        <div style={{
          marginTop: '2px',
          borderBottom: '1px solid #ccc',
          paddingBottom: '2px',
          marginBottom: '2px',
          backgroundColor: isPelaksanaan ? '#D4EDDA' : '#D6E4F0',
          textAlign: 'center'
        }}>
          <div style={{ fontWeight: 'bold', fontSize: `${fsSmall}px`, color: isPelaksanaan ? '#155724' : '#1E3A5F' }}>JENIS:</div>
          <div style={{ fontSize: `${fs + 1}px`, fontWeight: 'bold', color: isPelaksanaan ? '#155724' : '#1E3A5F' }}>{jenis}</div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Skala info */}
        <div style={{ borderTop: '2px solid #1E3A5F', paddingTop: '3px', textAlign: 'center', marginTop: 'auto' }}>
          <div style={{ fontWeight: 'bold', fontSize: `${fs + 1}px`, color: '#1E3A5F' }}>STA: {sta}</div>
          <div style={{ fontSize: `${fsSmall}px`, color: '#555' }}>SKALA: <span style={{ fontWeight: 'bold' }}>{skala}</span></div>
        </div>

        {/* Judul Gambar */}
        <div style={{ borderTop: '1px solid #1E3A5F', paddingTop: '3px', marginTop: '2px', textAlign: 'center' }}>
          <div style={{ fontWeight: 'bold', fontSize: `${fsSmall}px`, color: '#1E3A5F' }}>JUDUL GAMBAR</div>
          <div style={{ fontSize: `${fs}px`, color: '#333', fontWeight: 'bold' }}>POTONGAN MELINTANG</div>
          <div style={{ fontSize: `${fs}px`, color: '#333' }}>STA {sta}</div>
        </div>

        {/* Kode & Lembar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px', fontSize: `${fsSmall - 1}px`, color: '#555', borderTop: '1px solid #1E3A5F', paddingTop: '2px' }}>
          <div>KODE: {kodeGambar}</div>
          <div>LBR: {noLembar}/{jumlahLembar}</div>
        </div>

        {/* Stamp Area */}
        <div style={{ borderTop: '1px solid #1E3A5F', paddingTop: '2px', marginTop: '2px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: `${fsSmall - 1}px` }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderBottom: '1px solid #333', height: '14px' }} />
              <div style={{ color: '#555', marginTop: '1px' }}>DIGAMBAR</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderBottom: '1px solid #333', height: '14px' }} />
              <div style={{ color: '#555', marginTop: '1px' }}>DICEK</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderBottom: '1px solid #333', height: '14px' }} />
              <div style={{ color: '#555', marginTop: '1px' }}>DIBUAT</div>
            </div>
          </div>
        </div>
      </div>
    </foreignObject>
  );
};

/**
 * CrossSectionSVG Component
 * Professional government technical drawing
 */
const CrossSectionSVG = ({
  staData,
  kopData,
  width = 700,
  height = 450,
  padding = { top: 25, right: 25, bottom: 25, left: 155 },
  showKop = true
}) => {
  if (!staData || !staData.dimensi) {
    return (
      <svg width={width} height={height}>
        <text x={width / 2} y={height / 2} textAnchor="middle" fill="#64748b" fontSize="14">
          Data tidak tersedia
        </text>
      </svg>
    );
  }

  const { dimensi, luasGalian = 0 } = staData;
  const { b1, b2, b3, h, hPrime, slope = 1 } = dimensi;

  // Calculate scale
  const drawWidth = width - padding.left - padding.right;
  const drawHeight = height - padding.top - padding.bottom;

  const scaleX = drawWidth / (b3 + 1.5);
  const scaleY = drawHeight / (hPrime + 1.5);
  const scale = Math.min(scaleX, scaleY);

  const originX = padding.left + 0.3 * scale;
  const originY = padding.top + drawHeight - ((hPrime + 0.3) * scale);

  const toSvg = (x, y) => ({
    x: originX + x * scale,
    y: originY - (hPrime + 0.3 - y) * scale
  });

  // Generate data
  const konturEksisting = generateKonturEksisting(b3, hPrime);
  const konturRencana = generateKonturRencana(b1, b2, b3, h, hPrime, slope);

  const konturPath = generateKonturPath(konturEksisting, toSvg);
  const rencanaPath = generateRencanaPath(konturRencana, toSvg);
  const areaGalianPath = generateAreaGalianPath(konturRencana, konturEksisting, toSvg);

  // Key coordinates for labels
  const ptRencanaBawah = toSvg((b1 + slope * h) / 2, hPrime - h);
  const ptRencanaAtas = toSvg(b3 / 2, hPrime);
  const ptHDimensi = toSvg(b3 + 0.15, hPrime - h / 2);
  const ptSkala = toSvg(b3 / 2, -0.1);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        {/* ARSIRAN VERTIKAL untuk area galian (│ │ │ │) */}
        <pattern
          id="arsir-vertical"
          patternUnits="userSpaceOnUse"
          width="6"
          height="8"
        >
          <line x1="3" y1="0" x2="3" y2="8" stroke="#8B0000" strokeWidth="0.8" />
        </pattern>

        {/* Arrow marker */}
        <marker
          id="arrow-black"
          markerWidth="8"
          markerHeight="8"
          refX="4"
          refY="4"
          orient="auto"
        >
          <path d="M 0 0 L 8 4 L 0 8 Z" fill="#1E3A5F" />
        </marker>

        {/* Checkered pattern for water */}
        <pattern
          id="water-pattern"
          patternUnits="userSpaceOnUse"
          width="8"
          height="4"
        >
          <line x1="0" y1="0" x2="8" y2="4" stroke="#4169E1" strokeWidth="0.5" opacity="0.4" />
          <line x1="0" y1="4" x2="8" y2="0" stroke="#4169E1" strokeWidth="0.5" opacity="0.4" />
        </pattern>

        {/* Grid pattern */}
        <pattern
          id="grid-pattern"
          patternUnits="userSpaceOnUse"
          width="20"
          height="20"
        >
          <rect width="20" height="20" fill="none" />
          <line x1="20" y1="0" x2="20" y2="20" stroke="#E8EEF5" strokeWidth="0.5" />
          <line x1="0" y1="20" x2="20" y2="20" stroke="#E8EEF5" strokeWidth="0.5" />
        </pattern>
      </defs>

      {/* Background grid */}
      <rect
        x={padding.left}
        y={padding.top}
        width={drawWidth}
        height={drawHeight}
        fill="url(#grid-pattern)"
        opacity="0.5"
      />

      {/* GROUND SURFACE LINE (muka tanah) */}
      <line
        x1={toSvg(-0.2, hPrime).x}
        y1={toSvg(-0.2, hPrime).y}
        x2={toSvg(b3 + 0.5, hPrime).x}
        y2={toSvg(b3 + 0.5, hPrime).y}
        stroke="#228B22"
        strokeWidth="2"
        strokeDasharray="8,3"
      />
      <text
        x={toSvg(-0.1, hPrime).x}
        y={toSvg(-0.1, hPrime).y - 6}
        fill="#228B22"
        fontSize="9"
        fontWeight="bold"
        fontFamily="Arial"
      >
        MUKA TANAH
      </text>

      {/* AREA GALIAN (di-arsir VERTIKAL) */}
      <path
        d={areaGalianPath}
        fill="url(#arsir-vertical)"
        stroke="#8B0000"
        strokeWidth="0.5"
        opacity="0.9"
      />

      {/* GARIS KONTUR EKSISTING (biru, meliuk-liuk natural) */}
      <path
        d={konturPath}
        stroke="#1E40AF"
        strokeWidth="2"
        fill="none"
      />

      {/* GARIS RENCANA GALIAN (hitam, trapesium) */}
      <path
        d={rencanaPath}
        stroke="#1E3A5F"
        strokeWidth="2.5"
        fill="none"
      />

      {/* Slope talud lines */}
      {/* Left slope */}
      <line
        x1={toSvg(0, hPrime).x}
        y1={toSvg(0, hPrime).y}
        x2={toSvg(-slope * h, hPrime - h).x}
        y2={toSvg(-slope * h, hPrime - h).y}
        stroke="#1E3A5F"
        strokeWidth="1"
        strokeDasharray="3,2"
      />
      {/* Right slope */}
      <line
        x1={toSvg(b3, hPrime).x}
        y1={toSvg(b3, hPrime).y}
        x2={toSvg(b3 + slope * h, hPrime - h).x}
        y2={toSvg(b3 + slope * h, hPrime - h).y}
        stroke="#1E3A5F"
        strokeWidth="1"
        strokeDasharray="3,2"
      />

      {/* ==================== DIMENSION LABELS ==================== */}

      {/* b1 - lebar dasar (atas garis bawah) */}
      <line
        x1={toSvg(0, hPrime - h).x}
        y1={toSvg(0, hPrime - h).y + 22}
        x2={toSvg(b1, hPrime - h).x}
        y2={toSvg(b1, hPrime - h).y + 22}
        stroke="#1E3A5F"
        strokeWidth="1"
        markerStart="url(#arrow-black)"
        markerEnd="url(#arrow-black)"
      />
      <text
        x={toSvg(b1 / 2, hPrime - h).x}
        y={toSvg(b1 / 2, hPrime - h).y + 36}
        textAnchor="middle"
        fill="#1E3A5F"
        fontSize="10"
        fontWeight="bold"
        fontFamily="Arial"
      >
        b₁ = {b1.toFixed(3)} m
      </text>

      {/* b2 - lebar tengah */}
      <line
        x1={toSvg(0, hPrime - h * 0.5).x - 20}
        y1={toSvg(0, hPrime - h * 0.5).y}
        x2={toSvg(b1 + slope * h, hPrime - h * 0.5).x + 20}
        y2={toSvg(b1 + slope * h, hPrime - h * 0.5).y}
        stroke="#1E3A5F"
        strokeWidth="0.8"
        strokeDasharray="3,2"
        markerStart="url(#arrow-black)"
        markerEnd="url(#arrow-black)"
      />
      <text
        x={toSvg(b2 / 2, hPrime - h * 0.5).x}
        y={toSvg(b2 / 2, hPrime - h * 0.5).y - 8}
        textAnchor="middle"
        fill="#555"
        fontSize="9"
        fontFamily="Arial"
      >
        b₂ = {b2.toFixed(3)} m
      </text>

      {/* b3 - lebar muka tanah (atas garis atas) */}
      <line
        x1={toSvg(0, hPrime).x}
        y1={toSvg(0, hPrime).y - 18}
        x2={toSvg(b3, hPrime).x}
        y2={toSvg(b3, hPrime).y - 18}
        stroke="#1E3A5F"
        strokeWidth="1"
        markerStart="url(#arrow-black)"
        markerEnd="url(#arrow-black)"
      />
      <text
        x={toSvg(b3 / 2, hPrime).x}
        y={toSvg(b3 / 2, hPrime).y - 26}
        textAnchor="middle"
        fill="#1E3A5F"
        fontSize="10"
        fontWeight="bold"
        fontFamily="Arial"
      >
        b₃ = {b3.toFixed(3)} m
      </text>

      {/* h - kedalaman galian (garis tegak kanan) */}
      <line
        x1={toSvg(b3 + 0.2, hPrime).x}
        y1={toSvg(b3 + 0.2, hPrime).y}
        x2={toSvg(b3 + 0.2, hPrime - h).x}
        y2={toSvg(b3 + 0.2, hPrime - h).y}
        stroke="#8B0000"
        strokeWidth="1.2"
        markerStart="url(#arrow-black)"
        markerEnd="url(#arrow-black)"
      />
      <text
        x={toSvg(b3 + 0.4, hPrime - h / 2).x}
        y={toSvg(b3 + 0.4, hPrime - h / 2).y}
        fill="#8B0000"
        fontSize="10"
        fontWeight="bold"
        fontFamily="Arial"
      >
        h = {h.toFixed(3)} m
      </text>

      {/* h' - tinggi air eksisting */}
      <text
        x={toSvg(b3 + 0.4, hPrime * 0.6).x}
        y={toSvg(b3 + 0.4, hPrime * 0.6).y}
        fill="#555"
        fontSize="9"
        fontFamily="Arial"
      >
        h' = {hPrime.toFixed(3)} m
      </text>

      {/* SLOPE RATIO labels */}
      {/* Left slope label */}
      <text
        x={toSvg(-slope * h * 0.7, hPrime - h * 0.7).x}
        y={toSvg(-slope * h * 0.7, hPrime - h * 0.7).y}
        fill="#555"
        fontSize="8"
        fontFamily="Arial"
      >
        1 : {slope}
      </text>
      {/* Right slope label */}
      <text
        x={toSvg(b3 + slope * h * 0.3, hPrime - h * 0.3).x}
        y={toSvg(b3 + slope * h * 0.3, hPrime - h * 0.3).y}
        fill="#555"
        fontSize="8"
        fontFamily="Arial"
      >
        1 : {slope}
      </text>

      {/* LUAS GALIAN label */}
      <text
        x={ptRencanaBawah.x}
        y={ptRencanaBawah.y}
        textAnchor="middle"
        fill="#8B0000"
        fontSize="13"
        fontWeight="bold"
        fontFamily="Arial"
        stroke="white"
        strokeWidth="3"
        paintOrder="stroke"
      >
        Luas = {Number(luasGalian).toFixed(3)} m²
      </text>

      {/* ==================== SKALA BAR ==================== */}
      <g transform={`translate(${toSvg(0, -0.25).x}, ${toSvg(0, -0.25).y + 8})`}>
        <line x1="0" y1="0" x2={`${scale * 1}m`} y2="0" stroke="#1E3A5F" strokeWidth="1" />
        <line x1="0" y1="-3" x2="0" y2="3" stroke="#1E3A5F" strokeWidth="1" />
        <line x1={`${scale * 1}m`} y1="-3" x2={`${scale * 1}m`} y2="3" stroke="#1E3A5F" strokeWidth="1" />
        <text x={0} y="-6" fill="#1E3A5F" fontSize="7" fontFamily="Arial">0</text>
        <text x={scale * 1} y="-6" fill="#1E3A5F" fontSize="7" fontFamily="Arial">1m</text>
        <text x={scale * 0.5} y="-6" fill="#1E3A5F" fontSize="7" fontFamily="Arial" textAnchor="middle">1m</text>
      </g>

      {/* ==================== LEGENDA ==================== */}
      <g transform={`translate(${padding.left + 5}, ${height - padding.bottom - 18})`}>
        {/* Garis Kontur Eksisting */}
        <line x1="0" y1="0" x2="25" y2="0" stroke="#1E40AF" strokeWidth="2" />
        <text x="30" y="4" fill="#1E40AF" fontSize="8" fontFamily="Arial" fontWeight="bold">KONTUR EKSISTING</text>

        {/* Garis Rencana Galian */}
        <line x1="130" y1="0" x2="155" y2="0" stroke="#1E3A5F" strokeWidth="2.5" />
        <text x="160" y="4" fill="#1E3A5F" fontSize="8" fontFamily="Arial" fontWeight="bold">RENCANA GALIAN</text>

        {/* Area Galian */}
        <rect x="265" y="-7" width="20" height="14" fill="url(#arsir-vertical)" stroke="#8B0000" strokeWidth="0.5" />
        <text x="290" y="4" fill="#8B0000" fontSize="8" fontFamily="Arial" fontWeight="bold">AREA GALIAN</text>
      </g>

      {/* Footer note */}
      <text
        x={width / 2}
        y={height - 5}
        textAnchor="middle"
        fill="#888"
        fontSize="7"
        fontFamily="Arial"
        fontStyle="italic"
      >
        Potongan Melintang STA {staData?.sta || '0+000'} - Scale {kopData?.skala || '1:50'}
      </text>

      {/* KOP GOVERNMENT (di kiri) */}
      {showKop && kopData && (
        <KopInline
          data={kopData}
          width={padding.left - 5}
          height={height}
        />
      )}
    </svg>
  );
};

export default CrossSectionSVG;
