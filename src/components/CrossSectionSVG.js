'use client';

/**
 * CrossSectionSVG.js v4.0 (Antigravity CAD Style)
 * Government-standard Technical Drawing (Hitam-Putih Kaku)
 * ALGORITMA GEOMETRI DIPERBAIKI: area galian (h') benar-benar terisolasi
 * dan bersilangan tepat dengan slope rencana.
 */

import React from 'react';

const CrossSectionSVG = ({
  staData,
  kopData,
  width = 800,
  height = 500
}) => {
  if (!staData || !staData.dimensi) {
    return (
      <svg width="100%" height="auto" viewBox={`0 0 ${width} ${height}`}>
        <rect width={width} height={height} fill="#f4f4f5" />
        <text x={width / 2} y={height / 2} textAnchor="middle" fill="#52525b" fontSize="16" fontFamily="monospace">
          [ WAITING FOR DATA ]
        </text>
      </svg>
    );
  }

  const { dimensi } = staData;
  const { b1, b3, h, hPrime } = dimensi;

  // Hitung kemiringan slope (m) dari rencana
  const m = h > 0 ? (b3 - b1) / (2 * h) : 0;

  // --- KOORDINAT MATEMATIS AKTUAL (Titik 0,0 di tengah dasar saluran) ---
  const pbLeft  = -b1 / 2;
  const pbRight = b1 / 2;
  const ptLeft  = -b3 / 2;
  const ptRight = b3 / 2;

  // Titik persilangan slope dengan tanah eksisting (pada y = h')
  const pgLeft  = pbLeft - (m * hPrime);
  const pgRight = pbRight + (m * hPrime);
  const b_eksisting = b1 + 2 * m * hPrime;

  // Hitung luas matematis aktual galian trapesium
  const actualLuas = ((b1 + b_eksisting) / 2) * hPrime;

  // --- ARSITEKTUR FRAME CAD ---
  const margin = 20; // Margin luar kertas
  const kopWidth = 220; // Lebar KOP di kanan
  
  // Area Gambar
  const drawX = margin;
  const drawY = margin;
  const drawW = width - (margin * 2) - kopWidth;
  const drawH = height - (margin * 2);

  const kopX = drawX + drawW;
  const kopY = drawY;

  // --- SKALA & TRANSFORMASI ---
  // Pastikan area mencakup lebar/tinggi maksimum dari semua skenario parameter
  const pWidth = Math.max(b3, b_eksisting) * 1.5; // +50% ruang ekstra di kiri-kanan
  const pHeight = Math.max(h, hPrime) * 1.5;      // +50% ruang ekstra ke atas

  // Faktor Skala
  const s = Math.min((drawW - 60) / Math.max(pWidth, 0.1), (drawH - 120) / Math.max(pHeight, 0.1));

  // Posisi nol piksel: X di tengah area, Y di bagian bawah (di atas margin datum)
  const originX = drawX + (drawW / 2);
  const originY = drawY + drawH - 70;

  // Konverter (Fisik m -> SVG px) Y dibalik karena SVG Y arah bawah
  const toSVG = (px, py) => ({
    x: originX + px * s,
    y: originY - py * s
  });

  // --- TRANSLASI TITIK KE SVG ---
  // 1. Trapesium Rencana (Elevasi 0 sampai h) - Open Bowl (Tidak ditutup di atas)
  const tBL = toSVG(pbLeft, 0);
  const tBR = toSVG(pbRight, 0);
  const tTR = toSVG(ptRight, h);
  const tTL = toSVG(ptLeft, h);
  const rencanaPathStr = `M ${tTL.x} ${tTL.y} L ${tBL.x} ${tBL.y} L ${tBR.x} ${tBR.y} L ${tTR.x} ${tTR.y}`;

  // 2. Kontur Tanah Eksisting (Kerak/Crust Profile)
  // Garis eksisting berada di atas rencana, dan bertemu di bibir sungai.
  const overLeft = ptLeft - (b3 * 0.2); 
  const overRight = ptRight + (b3 * 0.2); 
  
  const ptsFisik = [];
  
  // 1. Tanggul kiri (menurun tidak lurus)
  ptsFisik.push({ x: overLeft, y: h * 0.8 });
  ptsFisik.push({ x: ptLeft - (b3 * 0.1), y: h * 0.95 });
  ptsFisik.push({ x: ptLeft, y: h }); // Bertemu di bibir kiri
  
  // 2. Kerak tebing kiri (turun dengan gaya freehand/sedimen)
  const offset = b1 * 0.15; // Ketebalan kerak di dasar
  const exBL = { x: pbLeft + offset, y: hPrime };
  const exBR = { x: pbRight - offset, y: hPrime };
  
  const slopeSegments = 4;
  for (let i = 1; i <= slopeSegments; i++) {
    const t = i / slopeSegments;
    let px = ptLeft + (exBL.x - ptLeft) * t;
    let py = h - (h - hPrime) * t;
    // Tambahkan bump (bulge) sedimen ke arah dalam saluran
    if (i > 0 && i < slopeSegments) {
       px += (i % 2 !== 0 ? 0.05 : 0.02) * b3; 
    }
    ptsFisik.push({ x: px, y: py });
  }
  
  // 3. Dasar sedimen (zigzag kecil natural)
  const siltSegments = 10;
  const siltDx = (exBR.x - exBL.x) / siltSegments;
  for (let i = 1; i < siltSegments; i++) {
    const px = exBL.x + i * siltDx;
    let py = hPrime;
    if (i % 2 !== 0) py += 0.03 * Math.max(hPrime, 0.5); // slight bump
    ptsFisik.push({ x: px, y: py });
  }
  
  // 4. Kerak tebing kanan (naik dengan gaya freehand/sedimen)
  for (let i = 1; i <= slopeSegments; i++) {
    const t = i / slopeSegments;
    let px = exBR.x + (ptRight - exBR.x) * t;
    let py = hPrime + (h - hPrime) * t;
    // Tambahkan bump (bulge) sedimen ke arah dalam saluran (karena di kanan, bulge berarti -x)
    if (i > 0 && i < slopeSegments) {
       px -= (i % 2 !== 0 ? 0.02 : 0.05) * b3; 
    }
    ptsFisik.push({ x: px, y: py });
  }
  
  // 5. Tanggul kanan (menurun tidak lurus)
  ptsFisik.push({ x: ptRight + (b3 * 0.1), y: h * 0.95 });
  ptsFisik.push({ x: overRight, y: h * 0.8 });

  const ptsSVG = ptsFisik.map(p => toSVG(p.x, p.y));

  let konturPathStr = `M ${ptsSVG[0].x} ${ptsSVG[0].y}`;
  for (let i = 1; i < ptsSVG.length; i++) {
    konturPathStr += ` L ${ptsSVG[i].x} ${ptsSVG[i].y}`;
  }

  // 3. Poligon Galian (ClipPath)
  // Menutupi area antara garis rencana (luar) dan garis kerak (dalam)
  const cBL = tBL;
  const cBR = tBR;
  const cTR = tTR;
  const cExBR = toSVG(exBR.x, exBR.y);
  const cExBL = toSVG(exBL.x, exBL.y);
  const cTL = tTL;
  
  const clipPathStr = `M ${cBL.x} ${cBL.y} L ${cBR.x} ${cBR.y} L ${cTR.x} ${cTR.y} L ${cExBR.x} ${cExBR.y} L ${cExBL.x} ${cExBL.y} L ${cTL.x} ${cTL.y} Z`;

  return (
    <div className="w-full h-full flex justify-center items-center bg-gray-200 p-4 drop-shadow-xl overflow-hidden">
      <svg
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${width} ${height}`} 
        className="bg-white shadow-2xl"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        <defs>
          <pattern id="arsir-vertical-cad" patternUnits="userSpaceOnUse" width="10" height="20" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="20" stroke="#1f2937" strokeWidth="0.8" />
          </pattern>
          <clipPath id="area-galian-clip-cad">
            <path d={clipPathStr} />
          </clipPath>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse">
            <path d="M 0 0 L 6 3 L 0 6 z" fill="#000" />
          </marker>
        </defs>

        {/* --- 1. CANVAS BOUNDARIES --- */}
        <rect x={0} y={0} width={width} height={height} fill="#ffffff" />
        <rect x={drawX} y={drawY} width={width - margin*2} height={drawH} fill="none" stroke="#000" strokeWidth="2.5" />
        <line x1={kopX} y1={kopY} x2={kopX} y2={kopY + drawH} stroke="#000" strokeWidth="2.5" />

        {/* --- 2. KOP GAMBAR (KANAN) --- */}
        <g transform={`translate(${kopX}, ${kopY})`}>
          <rect x={0} y={0} width={kopWidth} height={80} fill="none" stroke="#000" strokeWidth="1.5" />
          <image href="/logo-bojonegoro.png" x={kopWidth/2 - 20} y={5} width="40" height="45" />
          <text x={kopWidth/2} y={60} textAnchor="middle" fontSize="10" fontWeight="bold">PEMERINTAH KAB. BOJONEGORO</text>
          <text x={kopWidth/2} y={72} textAnchor="middle" fontSize="9" fontWeight="bold">DINAS PU SUMBER DAYA AIR</text>

          <rect x={0} y={80} width={kopWidth} height={20} fill="none" stroke="#000" strokeWidth="1.5" />
          <text x={kopWidth/2} y={93} textAnchor="middle" fontSize="9" fontWeight="bold">PROGRAM</text>
          <rect x={0} y={100} width={kopWidth} height={30} fill="none" stroke="#000" strokeWidth="1.5" />
          <text x={kopWidth/2} y={118} textAnchor="middle" fontSize="9">{kopData?.program || '-'}</text>

          <rect x={0} y={130} width={kopWidth} height={20} fill="none" stroke="#000" strokeWidth="1.5" />
          <text x={kopWidth/2} y={143} textAnchor="middle" fontSize="9" fontWeight="bold">KEGIATAN</text>
          <rect x={0} y={150} width={kopWidth} height={50} fill="none" stroke="#000" strokeWidth="1.5" />
          <foreignObject x={5} y={155} width={kopWidth-10} height={40}>
            <div xmlns="http://www.w3.org/1999/xhtml" style={{fontSize:'9px', textAlign:'center', lineHeight:1.2, fontWeight:'bold'}}>
              {kopData?.kegiatan || '-'}
            </div>
          </foreignObject>

          <rect x={0} y={200} width={kopWidth} height={20} fill="none" stroke="#000" strokeWidth="1.5" />
          <text x={kopWidth/2} y={213} textAnchor="middle" fontSize="9" fontWeight="bold">PEKERJAAN</text>
          <rect x={0} y={220} width={kopWidth} height={40} fill="none" stroke="#000" strokeWidth="1.5" />
          <foreignObject x={5} y={225} width={kopWidth-10} height={30}>
            <div xmlns="http://www.w3.org/1999/xhtml" style={{fontSize:'9px', textAlign:'center', lineHeight:1.2}}>
              {kopData?.pekerjaan || '-'}
            </div>
          </foreignObject>

          <rect x={0} y={260} width={kopWidth/2} height={15} fill="none" stroke="#000" strokeWidth="1.5" />
          <text x={kopWidth/4} y={271} textAnchor="middle" fontSize="8" fontWeight="bold">LOKASI</text>
          <rect x={kopWidth/2} y={260} width={kopWidth/2} height={15} fill="none" stroke="#000" strokeWidth="1.5" />
          <text x={(kopWidth*3)/4} y={271} textAnchor="middle" fontSize="8" fontWeight="bold">TAHUN</text>

          <rect x={0} y={275} width={kopWidth/2} height={25} fill="none" stroke="#000" strokeWidth="1.5" />
          <text x={kopWidth/4} y={291} textAnchor="middle" fontSize="9">{kopData?.lokasi || '-'}</text>
          <rect x={kopWidth/2} y={275} width={kopWidth/2} height={25} fill="none" stroke="#000" strokeWidth="1.5" />
          <text x={(kopWidth*3)/4} y={291} textAnchor="middle" fontSize="9" fontWeight="bold">{kopData?.tahun || '-'}</text>

          <rect x={0} y={300} width={kopWidth} height={15} fill="none" stroke="#000" strokeWidth="1.5" />
          <text x={kopWidth/2} y={311} textAnchor="middle" fontSize="8" fontWeight="bold">CATATAN</text>
          <rect x={0} y={315} width={kopWidth} height={80} fill="none" stroke="#000" strokeWidth="1.5" />

          {/* Kaki KOP */}
          <rect x={0} y={400} width={kopWidth/2} height={15} fill="none" stroke="#000" strokeWidth="1.5" />
          <text x={kopWidth/4} y={410} textAnchor="middle" fontSize="8" fontWeight="bold">JUDUL GAMBAR</text>
          <rect x={kopWidth/2} y={400} width={kopWidth/2} height={15} fill="none" stroke="#000" strokeWidth="1.5" />
          <text x={(kopWidth*3)/4} y={410} textAnchor="middle" fontSize="8" fontWeight="bold">SKALA</text>

          <rect x={0} y={415} width={kopWidth/2} height={30} fill="none" stroke="#000" strokeWidth="1.5" />
          <text x={kopWidth/4} y={428} textAnchor="middle" fontSize="9" fontWeight="bold">CROSS SECTION</text>
          <text x={kopWidth/4} y={440} textAnchor="middle" fontSize="9">STA {staData?.sta || '0+000'}</text>
          <rect x={kopWidth/2} y={415} width={kopWidth/2} height={30} fill="none" stroke="#000" strokeWidth="1.5" />
          <text x={(kopWidth*3)/4} y={433} textAnchor="middle" fontSize="10">{kopData?.skala || '1:100'}</text>
        </g>

        {/* --- 3. CROSS SECTION DRAWING --- */}
        <g>
          {/* Garis Dasar/Datum horizontal (Elevation Line) */}
          <line x1={drawX + 10} y1={originY} x2={kopX - 10} y2={originY} stroke="#000" strokeWidth="1" strokeDasharray="10,5" />
          <text x={drawX + 10} y={originY - 5} fill="#000" fontSize="9">Elevasi Normalisasi (0.00)</text>

          {/* Arsiran (Hatching) Area Galian */}
          <g clipPath="url(#area-galian-clip-cad)">
            <rect x={0} y={0} width={width} height={height} fill="url(#arsir-vertical-cad)" />
          </g>

          {/* Trapesium Rencana (Solid Black, Thick) */}
          <path d={rencanaPathStr} stroke="#000" strokeWidth="1.5" strokeDasharray="4,4" fill="none" />
          
          {/* Poligon Galian Line Outline/Stroke */}
          <path d={clipPathStr} stroke="#1d4ed8" strokeWidth="2.5" fill="none" />

          {/* Kontur Tanah Eksisting (Solid Black) */}
          <path d={konturPathStr} stroke="#166534" strokeWidth="2" fill="none" />

          <circle cx={cTR.x} cy={cTR.y} r="3" fill="#ef4444" />
          <circle cx={cTL.x} cy={cTL.y} r="3" fill="#ef4444" />

          {/* --- LABEL DIMENSI --- */}
          {/* Lebar Dasar b1 */}
          <line x1={tBL.x} y1={tBL.y + 15} x2={tBL.x + b1*s} y2={tBL.y + 15} stroke="#000" strokeWidth="1" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
          <text x={tBL.x + (b1*s)/2} y={tBL.y + 25} textAnchor="middle" fontSize="10" fontWeight="bold">b1 = {b1.toFixed(2)} m</text>

          {/* Kedalaman galian eksisting h' */}
          <line x1={tBR.x + 10} y1={cTR.y} x2={tBR.x + 10} y2={tBR.y} stroke="#000" strokeWidth="1" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
          <text x={tBR.x + 15} y={cTR.y + (hPrime*s)/2 + 4} fontSize="10" fontWeight="bold">h' = {hPrime.toFixed(2)} m</text>

          {/* Kedalaman Rencana h */}
          <line x1={tTR.x + 25} y1={tTR.y} x2={tBR.x + 25} y2={tBR.y} stroke="#6b7280" strokeWidth="1" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
          <text x={tTR.x + 30} y={tTR.y + (h*s)/2 + 4} fontSize="10" fill="#4B5563">h = {h.toFixed(2)} m</text>

          {/* Label Kemiringan (Slope Ratio) */}
          <text x={tTR.x - 20} y={tTR.y + (h*s)/2.5} fontSize="9" fill="#000" fontWeight="bold">
            1 : {m.toFixed(2)}
          </text>

          {/* Lebar Eksisting Puncak Galian */}
          <line x1={cTL.x} y1={cTL.y - 12} x2={cTR.x} y2={cTR.y - 12} stroke="#1d4ed8" strokeWidth="1" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
          <text x={originX} y={cTL.y - 18} textAnchor="middle" fontSize="10" fill="#1d4ed8" fontWeight="bold">b exs = {b_eksisting.toFixed(2)} m</text>

          {/* Label Luasan Matematika vs Visual */}
          <rect x={originX - 60} y={cTL.y - 65} width="120" height="28" fill="#fff" stroke="#1d4ed8" strokeWidth="1.5" rx="4" />
          <text x={originX} y={cTL.y - 48} textAnchor="middle" fontSize="11" fill="#1d4ed8" fontWeight="bold">
            Galian: {actualLuas.toFixed(2)} m²
          </text>
        </g>
        
      </svg>
    </div>
  );
};

export default CrossSectionSVG;
