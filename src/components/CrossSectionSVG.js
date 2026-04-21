'use client';
import React from 'react';

/**
 * CrossSectionSVG dengan Kop Gambar Vertikal
 * Komponen untuk Print - Cross-Section + Kop di kanan
 *
 * Menampilkan:
 * - Kontur Eksisting (garis biru meliuk-liuk)
 * - Garis Rencana (trapesium hitam)
 * - Area Galian di-arsir VERTIKAL (│ │ │ │)
 * - Kop Gambar (vertikal di kanan)
 */

/**
 * Komponen Kop Gambar (inline untuk CrossSectionSVG)
 */
const KopInline = ({ data, width = 130 }) => {
  const {
    program = 'PROGRAM PENGELOLAAN SUMBER DAYA AIR (SDA)',
    kegiatan = 'PENGELOLAAN SDA DAN BANGUNAN PENGAMAN PANTAI',
    pekerjaan = 'NORMALISASI SUNGAI',
    lokasi = '-',
    tahun = new Date().getFullYear(),
    sta = '0+000',
    skala = '1:40',
    kodeGambar = 'NS-01',
    noLembar = 1,
    jumlahLembar = 5,
    jenis = 'PERENCANAAN'
  } = data;

  const isPelaksanaan = jenis === 'PELAKSANAAN';
  const height = 250;
  const fs = 7;
  const fsSmall = 6;

  return (
    <foreignObject x={0} y={0} width={width} height={height}>
      <div xmlns="http://www.w3.org/1999/xhtml" style={{
        width: `${width}px`,
        height: `${height}px`,
        borderLeft: '2px solid black',
        padding: '4px',
        fontSize: `${fs}px`,
        fontFamily: 'Arial, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'white',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', borderBottom: '1px solid black', paddingBottom: '2px', marginBottom: '2px' }}>
          <div style={{ fontWeight: 'bold', fontSize: `${fsSmall}px` }}>PEMERINTAH KABUPATEN BOJONEGORO</div>
          <div style={{ fontWeight: 'bold', fontSize: `${fsSmall}px` }}>DINAS PU SUMBER DAYA AIR</div>
        </div>

        {/* Program */}
        <div style={{ marginBottom: '2px', borderBottom: '1px solid #ccc', paddingBottom: '1px' }}>
          <div style={{ fontWeight: 'bold', fontSize: `${fsSmall}px` }}>PROGRAM:</div>
          <div style={{ fontSize: `${fsSmall - 1}px`, color: '#333', lineHeight: 1.1 }}>{program}</div>
        </div>

        {/* Kegiatan */}
        <div style={{ marginBottom: '2px', borderBottom: '1px solid #ccc', paddingBottom: '1px' }}>
          <div style={{ fontWeight: 'bold', fontSize: `${fsSmall}px` }}>KEGIATAN:</div>
          <div style={{ fontSize: `${fsSmall - 1}px`, color: '#333', lineHeight: 1.1 }}>{kegiatan}</div>
        </div>

        {/* Pekerjaan */}
        <div style={{ marginBottom: '2px', borderBottom: '1px solid #ccc', paddingBottom: '1px' }}>
          <div style={{ fontWeight: 'bold', fontSize: `${fsSmall}px` }}>PEKERJAAN:</div>
          <div style={{ fontSize: `${fsSmall - 1}px`, color: '#333', lineHeight: 1.1 }}>{pekerjaan}</div>
        </div>

        {/* Lokasi */}
        <div style={{ marginBottom: '2px', borderBottom: '1px solid #ccc', paddingBottom: '1px' }}>
          <div style={{ fontWeight: 'bold', fontSize: `${fsSmall}px` }}>LOKASI:</div>
          <div style={{ fontSize: `${fsSmall - 1}px`, color: '#333', lineHeight: 1.1 }}>{lokasi}</div>
        </div>

        {/* Tahun */}
        <div style={{ marginBottom: '2px', borderBottom: '1px solid #ccc', paddingBottom: '1px' }}>
          <div style={{ fontWeight: 'bold', fontSize: `${fsSmall}px` }}>TAHUN: {tahun}</div>
        </div>

        {/* Jenis */}
        <div style={{
          marginBottom: '2px',
          borderBottom: '1px solid #ccc',
          paddingBottom: '1px',
          backgroundColor: isPelaksanaan ? '#dcfce7' : '#dbeafe'
        }}>
          <div style={{ fontWeight: 'bold', fontSize: `${fsSmall}px` }}>JENIS:</div>
          <div style={{
            fontSize: `${fs}px`,
            color: isPelaksanaan ? '#166534' : '#1e40af',
            fontWeight: 'bold'
          }}>
            {jenis}
          </div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* STA Info */}
        <div style={{ borderTop: '1px solid black', paddingTop: '2px', textAlign: 'center' }}>
          <div style={{ fontWeight: 'bold', fontSize: `${fs}px` }}>STA: {sta}</div>
          <div style={{ fontSize: `${fsSmall}px` }}>SKALA: {skala}</div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid black', paddingTop: '2px', marginTop: '2px', textAlign: 'center', fontSize: `${fsSmall}px` }}>
          <div style={{ fontWeight: 'bold' }}>JUDUL GAMBAR</div>
          <div>CROSS SECTION STA {sta}</div>
        </div>

        {/* Info Tambahan */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px', fontSize: `${fsSmall - 1}px` }}>
          <div>KODE: {kodeGambar}</div>
          <div>LBR: {noLembar}/{jumlahLembar}</div>
        </div>
      </div>
    </foreignObject>
  );
};

/**
 * CrossSectionSVG Component
 * Menampilkan: Kontur Eksisting + Garis Rencana + Area Galian + Kop Gambar
 */
const CrossSectionSVG = ({
  staData,
  kopData,
  width = 650,
  height = 400,
  padding = { top: 30, right: 150, bottom: 30, left: 30 },
  showKop = true
}) => {
  if (!staData || !staData.dimensi) {
    return (
      <svg width={width} height={height}>
        <text x={width / 2} y={height / 2} textAnchor="middle" fill="#64748b">
          Data tidak tersedia
        </text>
      </svg>
    );
  }

  const { dimensi, luasGalian = 0, konturEksisting = [], konturRencana = [] } = staData;
  const { b1, b2, b3, h, hPrime, slope = 1 } = dimensi;

  // Calculate scale
  const drawWidth = width - padding.left - padding.right;
  const drawHeight = height - padding.top - padding.bottom;

  // Scale to fit
  const scaleX = drawWidth / (b3 + 1);
  const scaleY = drawHeight / (hPrime + 0.5);
  const scale = Math.min(scaleX, scaleY);

  // Origin offset
  const originX = padding.left;
  const originY = padding.top + drawHeight - (hPrime * scale);

  // Transform koordinat
  const toSvg = (x, y) => ({
    x: originX + x * scale,
    y: originY - (hPrime - y) * scale
  });

  // Generate kontur eksisting jika tidak ada
  const generatedEksisting = konturEksisting.length > 0 ? konturEksisting : generateDefaultEksisting(b3, hPrime);
  const generatedRencana = konturRencana.length > 0 ? konturRencana : generateDefaultRencana(b1, b2, b3, h, hPrime, slope);

  // Generate path string untuk kontur eksisting (smooth curve)
  const generateEksistingPath = () => {
    if (generatedEksisting.length < 2) return '';

    const points = generatedEksisting.map(p => toSvg(p.x, p.y));

    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length - 1; i++) {
      const midX = (points[i].x + points[i + 1].x) / 2;
      const midY = (points[i].y + points[i + 1].y) / 2;
      path += ` Q ${points[i].x} ${points[i].y} ${midX} ${midY}`;
    }

    const last = points[points.length - 1];
    path += ` L ${last.x} ${last.y}`;

    return path;
  };

  // Generate path string untuk kontur rencana (trapesium)
  const generateRencanaPath = () => {
    const points = generatedRencana.map(p => toSvg(p.x, p.y));
    return points.map((p, i) => i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`).join(' ') + ' Z';
  };

  // Area galian = polygon antara eksisting dan rencana
  const generateAreaGalianPath = () => {
    const Rencana = generatedRencana;
    const Eksisting = generatedEksisting;

    // Points dari rencana (atas)
    const rencanaCoords = [Rencana[0], Rencana[1]].map(p => toSvg(p.x, p.y));

    // Points dari eksisting (bawah, reversed)
    const eksistingCoords = [...Eksisting].reverse().map(p => toSvg(p.x, p.y));

    // Gabungkan
    const allPoints = [...rencanaCoords, ...eksistingCoords];

    if (allPoints.length === 0) return '';

    return allPoints.map((p, i) => i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`).join(' ') + ' Z';
  };

  // Label dimensions
  const midBawah = toSvg(b2 / 2, hPrime - h);
  const midAtas = toSvg(b3 / 2, hPrime);
  const labelH = toSvg(b3 + 0.3, hPrime - h / 2);
  const labelHPrime = toSvg(b3 + 0.3, hPrime / 2);
  const labelSlope = toSvg(b2, hPrime - h / 2);
  const midLuas = toSvg(b3 / 2, hPrime - h / 2);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        {/* Pattern arsiran VERTIKAL - Vertical lines (│ │ │ │ │) */}
        {/* Garis tegak dari atas ke bawah, repeat secara horizontal */}
        <pattern
          id="hatch-pattern"
          patternUnits="userSpaceOnUse"
          width="6"
          height="10"
        >
          {/* Single vertical line centered in pattern */}
          <line x1="3" y1="0" x2="3" y2="10" stroke="#991b1b" strokeWidth="1" />
        </pattern>

        {/* Arrow marker */}
        <marker
          id="arrow"
          markerWidth="10"
          markerHeight="10"
          refX="5"
          refY="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
        </marker>
      </defs>

      {/* Grid */}
      <g className="grid" stroke="#f1f5f9" strokeWidth="0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <line key={`h${i}`} x1={0} y1={i * 40} x2={width} y2={i * 40} />
        ))}
        {Array.from({ length: 20 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 40} y1={0} x2={i * 40} y2={height} />
        ))}
      </g>

      {/* Ground Level Line */}
      <line
        x1={originX - 10}
        y1={toSvg(0, hPrime).y}
        x2={originX + (b3 + 1) * scale}
        y2={toSvg(0, hPrime).y}
        stroke="#10b981"
        strokeWidth="2"
        strokeDasharray="5,5"
      />
      <text
        x={originX - 5}
        y={toSvg(0, hPrime).y - 8}
        fill="#10b981"
        fontSize="10"
        textAnchor="end"
      >
        Muka Tanah
      </text>

      {/* Area Galian (di-arsir VERTIKAL) */}
      <polygon
        points={generateAreaGalianPath()}
        fill="url(#hatch-pattern)"
        stroke="none"
        opacity="0.8"
      />

      {/* Garis Eksisting (meliuk-liuk natural) */}
      <path
        d={generateEksistingPath()}
        stroke="#1e40af"
        strokeWidth="2.5"
        fill="none"
      />

      {/* Garis Rencana (trapesium) */}
      <polygon
        points={generateRencanaPath()}
        stroke="#1f2937"
        strokeWidth="2.5"
        fill="none"
      />

      {/* Garis dimensi b1 */}
      <line
        x1={toSvg(0, hPrime - h).x}
        y1={toSvg(0, hPrime - h).y + 25}
        x2={toSvg(b1, hPrime - h).x}
        y2={toSvg(b1, hPrime - h).y + 25}
        stroke="#3b82f6"
        strokeWidth="1"
        markerEnd="url(#arrow)"
        markerStart="url(#arrow)"
      />
      <text
        x={toSvg(b1 / 2, hPrime - h).x}
        y={toSvg(b1 / 2, hPrime - h).y + 40}
        textAnchor="middle"
        fill="#1d4ed8"
        fontSize="10"
        fontWeight="bold"
      >
        b₁ = {b1.toFixed(3)} m
      </text>

      {/* Garis dimensi b3 */}
      <line
        x1={toSvg(0, hPrime).y}
        y1={toSvg(0, hPrime).y - 30}
        x2={toSvg(b3, hPrime).x}
        y2={toSvg(b3, hPrime).y - 30}
        stroke="#3b82f6"
        strokeWidth="1"
        markerEnd="url(#arrow)"
        markerStart="url(#arrow)"
      />
      <text
        x={toSvg(b3 / 2, hPrime).x}
        y={toSvg(b3 / 2, hPrime).y - 40}
        textAnchor="middle"
        fill="#1d4ed8"
        fontSize="10"
        fontWeight="bold"
      >
        b₃ = {b3.toFixed(3)} m
      </text>

      {/* Garis dimensi h */}
      <line
        x1={toSvg(b3 + 0.3, hPrime).x}
        y1={toSvg(b3 + 0.3, hPrime).y}
        x2={toSvg(b3 + 0.3, hPrime - h).x}
        y2={toSvg(b3 + 0.3, hPrime - h).y}
        stroke="#ef4444"
        strokeWidth="1"
        markerEnd="url(#arrow)"
        markerStart="url(#arrow)"
      />
      <text
        x={toSvg(b3 + 0.5, hPrime - h / 2).x}
        y={toSvg(b3 + 0.5, hPrime - h / 2).y}
        fill="#b91c1c"
        fontSize="10"
        fontWeight="bold"
      >
        h = {h.toFixed(3)} m
      </text>

      {/* Garis dimensi h' */}
      <text
        x={toSvg(b3 + 0.5, hPrime / 2).x}
        y={toSvg(b3 + 0.5, hPrime / 2).y}
        fill="#64748b"
        fontSize="9"
      >
        h' = {hPrime.toFixed(3)} m
      </text>

      {/* Label Luas Galian */}
      <text
        x={midLuas.x}
        y={midLuas.y}
        textAnchor="middle"
        fill="#991b1b"
        fontSize="14"
        fontWeight="bold"
        stroke="white"
        strokeWidth="3"
        paintOrder="stroke"
      >
        Luas = {Number(luasGalian).toFixed(3)} m²
      </text>

      {/* Legenda */}
      <g transform={`translate(${padding.left}, ${height - 20})`}>
        {/* Garis Eksisting */}
        <line x1="0" y1="0" x2="30" y2="0" stroke="#1e40af" strokeWidth="2.5" />
        <text x="35" y="4" fontSize="8" fill="#1e40af">Kontur Eksisting</text>

        {/* Garis Rencana */}
        <line x1="120" y1="0" x2="150" y2="0" stroke="#1f2937" strokeWidth="2.5" />
        <text x="155" y="4" fontSize="8" fill="#1f2937">Rencana Galian</text>

        {/* Area Galian */}
        <rect x="250" y="-8" width="20" height="16" fill="url(#hatch-pattern)" />
        <text x="275" y="4" fontSize="8" fill="#991b1b">Area Galian</text>
      </g>

      {/* Kop Gambar Vertikal (di kanan) */}
      {showKop && kopData && (
        <KopInline
          data={kopData}
          width={padding.right - 10}
        />
      )}
    </svg>
  );
};

// Helper function untuk generate default kontur eksisting (meliuk-liuk)
function generateDefaultEksisting(b3, hPrime, numPoints = 15) {
  const points = [];
  for (let i = 0; i < numPoints; i++) {
    const x = (i / (numPoints - 1)) * b3;
    const undulation = Math.sin(i * 1.5) * 0.1 * hPrime;
    const y = hPrime + undulation;
    points.push({ x, y });
  }
  return points;
}

// Helper function untuk generate default kontur rencana (trapesium)
function generateDefaultRencana(b1, b2, b3, h, hPrime, slope) {
  return [
    { x: 0, y: hPrime },
    { x: b3, y: hPrime },
    { x: b1 + (slope * h), y: hPrime - h },
    { x: -(slope * h), y: hPrime - h }
  ];
}

export default CrossSectionSVG;
