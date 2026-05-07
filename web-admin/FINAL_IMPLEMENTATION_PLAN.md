# IMPLEMENTATION PLAN FINAL (REVISI LENGKAP)
## Modul Perhitungan RAP - Sistem Web-Admin Dinas PU SDA Bojonegoro

> Disusun berdasarkan analisis mendalam Excel master + detail teknis GoalSeek & Gambar Teknik
> Dibuat oleh: Antigravity & Claude Code Agent
> Tanggal: 21 April 2025

---

## 1. RINGKASAN EXECUTIVE

### Tujuan
Rekonstruksi modul Perhitungan RAP dengan:
1. ✅ GoalSeek logika Sisa BBM = 40-100 liter (bukan 0)
2. ✅ Gambar cross-section dengan kontur eksisting + rencana + area galian di-arsir VERTIKAL
3. ✅ 9 tabs sesuai workflow yang sudah disepakati
4. ✅ Export Excel 11 sheet + Print PDF dengan 10 gambar

### Status
| Komponen | Status | Catatan |
|----------|--------|---------|
| Engine Matematika | ⚠️ PARTIAL | Perlu fix formula & add GoalSeek |
| GoalSeek Logic | ⚠️ PARTIAL | Perlu implementasi Sisa 40-100L |
| 9 Tab UI | ❌ BELUM | Perlu rebuild |
| Cross-Section Draw | ❌ BELUM | Perlu implementasi kontur + arsiran |
| Export Excel | ❌ BELUM | Perlu 11 sheet |
| Storage localStorage | ❌ BELUM | Perlu persistensi |

---

## 2. LOGIKA GOALSEEK LENGKAP

### ══════════════════════════════════════════════════════════════════════
### 2.1 GOALSEEK TAB 3: KEBUTUHAN REALISASI
### ══════════════════════════════════════════════════════════════════════

**TUJUAN:**
```
GoalSeek untuk mencari Q1 dan H (BBM/Jam) agar:
1. Sisa BBM akhir = 40-100 liter (ideal: 70 liter)
2. Total Galian ≈ Target Volume Rencana (±5%)
3. Sisa BBM TIDAK boleh minus (artinya BBM kurang!)
```

**INPUT:**
```javascript
const input = {
  totalBBMditerima: 1000,    // Liter dari DB2
  totalJamKerja: 25,          // Jam dari DB1
  targetVolume: 6785.50,     // m³ dari TAB 1
  targetSisaMin: 40,          // Liter
  targetSisaMax: 100,         // Liter
  targetSisaIdeal: 70,        // Liter
};
```

**ALGORITMA GOALSEEK:**

```javascript
// =====================
// GOALSEEK: SISA BBM 40-100 LITER
// =====================

/**
 * GoalSeek untuk TAB 3: Kebutuhan Realisasi
 * 
 * Target:
 * 1. Sisa BBM akhir = 40-100 liter (ideal: 70)
 * 2. Total Galian ≈ Target Volume (±5%)
 * 3. TIDAK boleh minus
 */
function goalSeekSisaBBM(input, params, specs) {
  const { totalBBMditerima, totalJamKerja, targetVolume, targetSisaIdeal } = input;
  const { hp, bucket, fb, fa, fv, fk, feMenit, waktuGali } = params;
  
  // STEP 1: Hitung konstanta
  const kW = hp * 0.7457;
  const Fe = feMenit / 60;
  const LoadFactor = specs.loadFactor[specs.selectedAlat]; // 0.28 untuk PC200
  
  // STEP 2: Target BBM terpakai
  // Sisa = Diterima - Terpakai
  // 70 = 1000 - Terpakai
  // Terpakai = 1000 - 70 = 930 liter
  const bbmTerpakaiTarget = totalBBMditerima - targetSisaIdeal;
  
  // STEP 3: H (BBM/Jam) yang dibutuhkan
  // H = Terpakai / Total Jam
  const hBaru = bbmTerpakaiTarget / totalJamKerja;
  
  // STEP 4: Fd dari H
  // H = Fd × Fe × LoadFactor × kW
  // Fd = H / (Fe × LoadFactor × kW)
  const Fd = hBaru / (Fe * LoadFactor * kW);
  
  // STEP 5: T.1 dari Fd
  // Fd = waktuGali / (T.1 × 60)
  // T.1 = waktuGali / (Fd × 60)
  const t1Baru = waktuGali / (Fd * 60);
  
  // STEP 6: Q1 dari T.1
  // Q1 = (V × Fb × Fa × 60) / (T.1 × Fv × Fk)
  const q1Baru = (bucket * fb * fa * 60) / (t1Baru * fv * fk);
  
  // STEP 7: Hitung Total Galian
  const totalGalian = q1Baru * totalJamKerja;
  
  // STEP 8: Validasi
  const galianDeviasi = Math.abs((totalGalian - targetVolume) / targetVolume * 100);
  
  // STEP 9: Jika deviasi > 5%, adjust target sisa
  if (galianDeviasi > 5) {
    // Adjust target sisa agar volume cocok
    // Q1 = targetVolume / totalJamKerja
    const q1Target = targetVolume / totalJamKerja;
    
    // Q1 = (V × Fb × Fa × 60) / (T.1 × Fv × Fk)
    // T.1 = (V × Fb × Fa × 60) / (Q1 × Fv × Fk)
    const t1ForVolume = (bucket * fb * fa * 60) / (q1Target * fv * fk);
    
    // Fd = waktuGali / (T.1 × 60)
    const fdForVolume = waktuGali / (t1ForVolume * 60);
    
    // H = Fd × Fe × LoadFactor × kW
    const hForVolume = fdForVolume * Fe * LoadFactor * kW;
    
    // Sisa = Diterima - (H × Total Jam)
    const sisaAkhir = totalBBMditerima - (hForVolume * totalJamKerja);
    
    return {
      success: sisaAkhir >= 40 && sisaAkhir <= 100,
      h: hForVolume,
      q1: q1Target,
      t1: t1ForVolume,
      fd: fdForVolume,
      totalGalian: targetVolume,
      sisaBBM: sisaAkhir,
      adjustReason: 'Volume deviation > 5%, adjusted to match volume'
    };
  }
  
  return {
    success: true,
    h: hBaru,
    q1: q1Baru,
    t1: t1Baru,
    fd: Fd,
    totalGalian: totalGalian,
    sisaBBM: targetSisaIdeal,
    adjustReason: null
  };
}
```

### ══════════════════════════════════════════════════════════════════════
### 2.2 GOALSEEK TAB 4: ANALISA PELAKSANAAN
### ══════════════════════════════════════════════════════════════════════

**TUJUAN:**
```
Verifikasi dan cari T.1 (Waktu Siklus) agar:
1. H (BBM/Jam) hasil perhitungan = H dari TAB 3
2. Validasi T.1 terhadap standar SNI
```

**ALGORITMA:**

```javascript
// =====================
// GOALSEEK: VERIFIKASI T.1
// =====================

/**
 * GoalSeek untuk TAB 4: Verifikasi T.1
 * 
 * Input: H dari TAB 3 (yang sudah di-GoalSeek)
 * Output: T.1 yang menghasilkan H tersebut + validasi SNI
 */
function goalSeekT1Verifikasi(hDariTab3, params, specs) {
  const { hp, feMenit, waktuGali } = params;
  
  const kW = hp * 0.7457;
  const Fe = feMenit / 60;
  const LoadFactor = specs.loadFactor[specs.selectedAlat];
  
  // Fd = H / (Fe × LoadFactor × kW)
  const Fd = hDariTab3 / (Fe * LoadFactor * kW);
  
  // T.1 = waktuGali / (Fd × 60)
  const t1Hasil = waktuGali / (Fd * 60);
  
  // Validasi terhadap standar SNI
  const sniRange = specs.sniRange[specs.selectedAlat];
  // contoh PC200: { min: 0.31, max: 0.66 }
  
  const validasi = {
    t1: t1Hasil,
    minSNI: sniRange.min,
    maxSNI: sniRange.max,
    dalamRange: t1Hasil >= sniRange.min && t1Hasil <= sniRange.max,
    
    // Status
    status: t1Hasil < sniRange.min ? 'TERLALU_CEPAT' :
            t1Hasil > sniRange.max ? 'TERLALU_LAMBAT' : 'WAJAR',
    
    // Warning message
    warning: t1Hasil < sniRange.min ?
      '⚠️ T.1 lebih cepat dari standar. Equipment sangat efisien atau data perlu diverifikasi.' :
      t1Hasil > sniRange.max ?
      '⚠️ T.1 lebih lambat dari standar. Ada waktu non-produktif.' : null
  };
  
  return validasi;
}
```

### ══════════════════════════════════════════════════════════════════════
### 2.3 TABEL VALIDASI SNI
### ══════════════════════════════════════════════════════════════════════

```javascript
// =====================
// TABEL SNI UNTUK VALIDASI
// =====================

export const SNI_WAKTU_SIKLUS = {
  'PC50': {
    min: 0.28,
    max: 0.35,
    standar: 0.31,
    keterangan: 'PC 50 - Mini Excavator'
  },
  'PC75': {
    min: 0.58,
    max: 0.72,
    standar: 0.65,
    keterangan: 'PC 75 - Standard'
  },
  'PC100': {
    min: 1.14,
    max: 1.40,
    standar: 1.27,
    keterangan: 'PC 100 - Medium'
  },
  'PC200': {
    min: 0.31,
    max: 0.66,
    standar: 0.659,
    keterangan: 'PC 200 - Standard'
  },
  'PC200LA': {
    min: 2.59,
    max: 3.17,
    standar: 2.876,
    keterangan: 'PC 200 Long Arm'
  }
};

export const LOAD_FACTOR = {
  'PC50': 0.28,
  'PC75': 0.28,
  'PC100': 0.28,
  'PC200': 0.28,
  'PC200LA': 0.40  // Long Arm lebih boros
};
```

---

## 3. SPESIFIKASI GAMBAR TEKNIK

### ══════════════════════════════════════════════════════════════════════
### 3.1 KONSEP GAMBAR
### ══════════════════════════════════════════════════════════════════════

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  KONSEP: AREA GALIAN = AREA ANTARA KONTUR EKSISTING DAN RENCANA         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  GAMBAR MENAMPILKAN:                                                      │
│  ─────────────────────────────────────────────────────────────────────────│
│                                                                             │
│  1. KONTUR EKSISTING (Biru Tua)                                          │
│     • Garis meliuk-liuk alami (alami SUNGAI)                             │
│     • Mengikuti topografi sungai yang sudah ada                            │
│     • Bisa bervariasi tiap STA berdasarkan survey                          │
│                                                                             │
│  2. GARIS RENCANA (Hitam/Merah)                                          │
│     • Trapesium standar (kaki terbalik)                                    │
│     • Dimensi dari backup volume (b1, b2, b3, h)                         │
│     • Sama untuk semua STA dengan variasi dimensi                           │
│                                                                             │
│  3. AREA GALIAN (Di-ARSIR)                                                │
│     • Area antara kontur eksisting dan garis rencana                       │
│     • Di-hatch/di-arsir dengan pattern VERTIKAL                           │
│     • Label luas (m²) di dalam area                                        │
│                                                                             │
│  4. KOP VERTIKAL (di kanan gambar)                                        │
│     • Format sesuai SUNGAI SEMAR MENDEM JEMBATAwwN.pdf                   │
│     • Program, Kegiatan, Pekerjaan, Lokasi                                │
│     • STA, Skala, Kode, Nomor Lembar                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### ══════════════════════════════════════════════════════════════════════
### 3.2 DATA STRUKTUR GAMBAR
### ══════════════════════════════════════════════════════════════════════

```javascript
// =====================
// DATA GAMBAR PER STA
// =====================

/**
 * Struktur data untuk satu gambar STA
 */
const generateSTAData = (sta, backupData, jenis) => {
  // jenis: 'PERENCANAAN' atau 'PELAKSANAAN'
  
  return {
    // Info Header
    sta: sta.label,                    // "0+000"
    jenis: jenis,                      // "PERENCANAAN" atau "PELAKSANAAN"
    
    // Kop Data
    program: kopData.program,
    kegiatan: kopData.kegiatan,
    pekerjaan: kopData.pekerjaan,
    lokasi: kopData.lokasi,
    tahun: new Date().getFullYear(),
    
    // Info Gambar
    kodeGambar: kopData.kode_gambar || 'NS-01',
    noLembar: sta.index + 1,
    jumlahLembar: 5,
    skala: '1:40',
    judulGambar: `CROSS SECTION STA ${sta.label}`,
    
    // Dimensi Geometri
    dimensi: {
      b1: sta.b1,      // Lebar Dasar (m)
      b2: sta.b2,      // Lebar Bawah (m)
      b3: sta.b3,      // Lebar Atas (m)
      h: sta.h,        // Kedalaman Galian (m)
      hPrime: sta.hPrime, // Tinggi Eksisting (m)
      slope: backupData.slope || 1  // Kemiringan 1:m
    },
    
    // Luasan
    luasGalian: sta.luas,  // m² - AREA YANG DIARSIR
    volume: sta.volume,    // m³ (antar STA)
    
    // Kontur Eksisting (untuk generate garis natural)
    // Ini adalah koordinat untuk garis yang MELIUK-LIUK
    konturEksisting: generateKonturEksisting(sta, backupData),
    
    // Kontur Rencana (trapesium - simple)
    konturRencana: generateKonturRencana(sta)
  };
};

/**
 * Generate koordinat untuk garis eksisting (meliuk-liuk natural)
 * Menggunakan noise/bezier untuk membuat garis organik
 */
function generateKonturEksisting(sta, backupData) {
  const { b3, hPrime } = sta;
  const panjang = backupData.panjang; // Total panjang sungai
  
  // Generate titik-titik dengan sedikit random untuk efek natural
  const numPoints = 15; // Jumlah titik untuk garis
  const points = [];
  
  // Base line (bottom of existing river)
  const baseY = hPrime; // Tinggi eksisting
  
  for (let i = 0; i < numPoints; i++) {
    const x = (i / (numPoints - 1)) * b3;
    // Add slight undulation (±10% dari tinggi)
    const undulation = Math.sin(i * 1.5) * 0.1 * hPrime;
    const y = baseY + undulation;
    
    points.push({ x, y });
  }
  
  return points;
}

/**
 * Generate koordinat untuk garis rencana (trapesium)
 * Simple polygon - tidak ada undulation
 */
function generateKonturRencana(sta) {
  const { b1, b2, b3, h, hPrime, slope } = sta;
  
  // Koordinat trapesium
  return [
    { x: 0, y: hPrime },                                    // Kiri atas
    { x: b3, y: hPrime },                                 // Kanan atas
    { x: b1 + (slope * h), y: hPrime - h },               // Kanan bawah
    { x: -(slope * h), y: hPrime - h }                     // Kiri bawah
  ];
}
```

### ══════════════════════════════════════════════════════════════════════
### 3.3 KOMPONEN SVG GAMBAR
### ══════════════════════════════════════════════════════════════════════

```javascript
// =====================
// COMPONEN: CROSS SECTION SVG
// =====================

import React from 'react';

/**
 * Komponen Gambar Cross-Section untuk Print
 * Menampilkan: Kontur Eksisting + Garis Rencana + Area Galian di-arsir
 */
const CrossSectionSVG = ({ 
  staData,
  width = 650, 
  height = 400,
  padding = { top: 30, right: 150, bottom: 30, left: 30 }
}) => {
  const { dimensi, luasGalian, konturEksisting, konturRencana } = staData;
  const { b1, b2, b3, h, hPrime, slope } = dimensi;
  
  // Calculate scale
  const drawWidth = width - padding.left - padding.right;
  const drawHeight = height - padding.top - padding.bottom;
  
  // Scale to fit
  const scaleX = drawWidth / (b3 + 1); // +1 untuk margin
  const scaleY = drawHeight / (hPrime + 0.5);
  const scale = Math.min(scaleX, scaleY);
  
  // Origin offset
  const originX = padding.left;
  const originY = padding.top + drawHeight - (hPrime * scale);
  
  // Transform koordinat
  const toSvg = (x, y) => ({
    x: originX + x * scale,
    y: originY - (hPrime - y) * scale // Flip Y axis
  });
  
  // Generate path string untuk kontur eksisting (smooth curve)
  const generateEksistingPath = () => {
    if (!konturEksisting || konturEksisting.length < 2) return '';
    
    const points = konturEksisting.map(p => toSvg(p.x, p.y));
    
    // Create smooth curve using quadratic bezier
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length - 1; i++) {
      const midX = (points[i].x + points[i + 1].x) / 2;
      const midY = (points[i].y + points[i + 1].y) / 2;
      path += ` Q ${points[i].x} ${points[i].y} ${midX} ${midY}`;
    }
    
    // Last segment
    const last = points[points.length - 1];
    path += ` L ${last.x} ${last.y}`;
    
    return path;
  };
  
  // Generate path string untuk kontur rencana (trapesium)
  const generateRencanaPath = () => {
    const points = konturRencana.map(p => toSvg(p.x, p.y));
    return `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')} Z`;
  };
  
  // Area galian = area antara eksisting dan rencana
  // Generate polygon untuk area galian
  const generateAreaGalianPath = () => {
    const Rencana = konturRencana;
    const Eksisting = konturEksisting;
    
    // Points dari rencana (atas)
    const rencanaAtas = [Rencana[0], Rencana[1]];
    
    // Points dari eksisting (bawah, reversed)
    const eksistingBawah = [...Eksisting].reverse().map(p => toSvg(p.x, p.y));
    
    // Convert rencana ke SVG coords
    const rencanaCoords = rencanaAtas.map(p => toSvg(p.x, p.y));
    
    // Gabungkan
    return [...rencanaCoords, ...eksistingBawah].map(p => `${p.x} ${p.y}`).join(' L ');
  };
  
  // Label dimensions
  const labels = [
    { text: `b₁ = ${b1.toFixed(3)} m`, x: toSvg(b1/2, hPrime - h/2).x, y: toSvg(0, hPrime - h/2).y - 10 },
    { text: `b₂ = ${b2.toFixed(3)} m`, x: toSvg(b2/2, hPrime - h).x, y: toSvg(0, hPrime - h).y - 25 },
    { text: `b₃ = ${b3.toFixed(3)} m`, x: toSvg(b3/2, hPrime).x, y: toSvg(0, hPrime).y - 35 },
    { text: `h = ${h.toFixed(3)} m`, x: toSvg(b3 + 0.3, hPrime - h/2).x, y: toSvg(0, hPrime - h/2).y },
    { text: `h' = ${hPrime.toFixed(3)} m`, x: toSvg(b3 + 0.3, hPrime/2).x, y: toSvg(0, hPrime/2).y },
    { text: `1:${slope}`, x: toSvg(b2, hPrime - h/2).x - 15, y: toSvg(b2, hPrime - h/2).y, angle: -45 }
  ];
  
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        {/* Pattern arsiran VERTIKAL - sesuai request user */}
        {/* Vertical lines, repeat horizontally (│ │ │ │ │) */}
        <pattern id="hatch-pattern" patternUnits="userSpaceOnUse" width="6" height="10">
          {/* Single vertical line centered in pattern, repeat secara horizontal */}
          <line x1="3" y1="0" x2="3" y2="10" stroke="#991b1b" strokeWidth="1"/>
        </pattern>
        
        {/* Arrow marker */}
        <marker id="arrow" markerWidth="10" markerHeight="10" 
                refX="5" refY="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
        </marker>
      </defs>
      
      {/* Grid (optional) */}
      <g className="grid" stroke="#f1f5f9" strokeWidth="0.5">
        {/* Horizontal lines */}
        {Array.from({length: 10}).map((_, i) => (
          <line key={`h${i}`} x1={0} y1={i * 40} x2={width} y2={i * 40} />
        ))}
        {/* Vertical lines */}
        {Array.from({length: 20}).map((_, i) => (
          <line key={`v${i}`} x1={i * 40} y1={0} x2={i * 40} y2={height} />
        ))}
      </g>
      
      {/* Ground Level Line */}
      <line 
        x1={originX - 10} 
        y1={toSvg(0, hPrime).y} 
        x2={originX + (b3 + 1) * scale} 
        y2={toSvg(0, hPrime).y}
        stroke="#10b981" strokeWidth="2" strokeDasharray="5,5"
      />
      <text x={originX - 5} y={toSvg(0, hPrime).y - 8} 
            fill="#10b981" fontSize="10" textAnchor="end">
        Muka Tanah
      </text>
      
      {/* Area Galian (di-arsir) */}
      <polygon 
        points={generateAreaGalianPath()}
        fill="url(#hatch-pattern)"
        stroke="none"
        opacity="0.8"
      />
      
      {/* Label Luas Galian */}
      <text 
        x={toSvg(b3/2, hPrime - h/2).x} 
        y={toSvg(b3/2, hPrime - h/2).y}
        textAnchor="middle"
        fill="#991b1b"
        fontSize="14"
        fontWeight="bold"
        stroke="white"
        strokeWidth="3"
        paintOrder="stroke"
      >
        Luas = {luasGalian.toFixed(3)} m²
      </text>
      
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
      
      {/* Dimension Labels */}
      {labels.map((label, i) => (
        <text 
          key={i}
          x={label.x}
          y={label.y}
          textAnchor="middle"
          fill="#1d4ed8"
          fontSize="11"
          fontWeight="bold"
          transform={label.angle ? `rotate(${label.angle}, ${label.x}, ${label.y})` : undefined}
        >
          {label.text}
        </text>
      ))}
      
      {/* Legenda */}
      <g transform={`translate(${padding.left}, ${height - 20})`}>
        {/* Garis Eksisting */}
        <line x1="0" y1="0" x2="30" y2="0" stroke="#1e40af" strokeWidth="2.5"/>
        <text x="35" y="4" fontSize="9" fill="#1e40af">Kontur Eksisting</text>
        
        {/* Garis Rencana */}
        <line x1="120" y1="0" x2="150" y2="0" stroke="#1f2937" strokeWidth="2.5"/>
        <text x="155" y="4" fontSize="9" fill="#1f2937">Rencana Galian</text>
        
        {/* Area Galian */}
        <rect x="250" y="-8" width="20" height="16" fill="url(#hatch-pattern)"/>
        <text x="275" y="4" fontSize="9" fill="#991b1b">Area Galian</text>
      </g>
    </svg>
  );
};

export default CrossSectionSVG;
```

### ══════════════════════════════════════════════════════════════════════
### 3.4 KOP VERTIKAL (FORMAT PDF)
### ══════════════════════════════════════════════════════════════════════

```javascript
// =====================
// KOP VERTIKAL (DI KANAN)
// =====================

/**
 * Komponen KOP Gambar Teknik
 * Posisi: VERTIKAL di KANAN gambar
 * Format: Sesuai SUNGAI SEMAR MENDEM JEMBATAwwN.pdf
 */
const KopGambarVertikal = ({ data, width = 150, height = 400 }) => {
  const { program, kegiatan, pekerjaan, lokasi, tahun, sta, skala, kodeGambar, noLembar, jumlahLembar, judulGambar, jenis } = data;
  
  return (
    <div style={{
      position: 'absolute',
      right: 0,
      top: 0,
      width: `${width}px`,
      height: `${height}px`,
      borderLeft: '2px solid black',
      padding: '10px',
      fontSize: '9px',
      fontFamily: 'Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'white'
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        borderBottom: '1px solid black',
        paddingBottom: '5px',
        marginBottom: '5px'
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '8px' }}>PEMERINTAH KABUPATEN BOJONEGORO</div>
        <div style={{ fontWeight: 'bold', fontSize: '8px' }}>DINAS PU SUMBER DAYA AIR</div>
      </div>
      
      {/* Program */}
      <div style={{ marginBottom: '5px', borderBottom: '1px solid #ccc', paddingBottom: '3px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>PROGRAM:</div>
        <div style={{ fontSize: '7px', color: '#333' }}>{program || '-'}</div>
      </div>
      
      {/* Kegiatan */}
      <div style={{ marginBottom: '5px', borderBottom: '1px solid #ccc', paddingBottom: '3px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>KEGIATAN:</div>
        <div style={{ fontSize: '7px', color: '#333' }}>{kegiatan || '-'}</div>
      </div>
      
      {/* Pekerjaan */}
      <div style={{ marginBottom: '5px', borderBottom: '1px solid #ccc', paddingBottom: '3px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>PEKERJAAN:</div>
        <div style={{ fontSize: '7px', color: '#333' }}>{pekerjaan || '-'}</div>
      </div>
      
      {/* Lokasi */}
      <div style={{ marginBottom: '5px', borderBottom: '1px solid #ccc', paddingBottom: '3px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>LOKASI:</div>
        <div style={{ fontSize: '7px', color: '#333' }}>{lokasi || '-'}</div>
      </div>
      
      {/* Tahun */}
      <div style={{ marginBottom: '5px', borderBottom: '1px solid #ccc', paddingBottom: '3px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>TAHUN:</div>
        <div style={{ fontSize: '7px', color: '#333' }}>{tahun || new Date().getFullYear()}</div>
      </div>
      
      {/* Jenis */}
      <div style={{ 
        marginBottom: '5px', 
        borderBottom: '1px solid #ccc', 
        paddingBottom: '3px',
        backgroundColor: jenis === 'PERENCANAAN' ? '#dbeafe' : '#dcfce7'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>JENIS:</div>
        <div style={{ 
          fontSize: '8px', 
          color: jenis === 'PERENCANAAN' ? '#1e40af' : '#166534',
          fontWeight: 'bold'
        }}>
          {jenis || 'PERENCANAAN'}
        </div>
      </div>
      
      {/* Spacer */}
      <div style={{ flex: 1 }} />
      
      {/* Footer - Judul Gambar */}
      <div style={{
        borderTop: '1px solid black',
        paddingTop: '5px',
        marginTop: '5px',
        textAlign: 'center'
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '10px' }}>JUDUL GAMBAR</div>
        <div style={{ fontSize: '9px', marginTop: '3px' }}>{judulGambar || `CROSS SECTION STA ${sta}`}</div>
        <div style={{ fontSize: '9px', fontWeight: 'bold', marginTop: '5px' }}>SKALA: {skala || '1:40'}</div>
      </div>
      
      {/* Info Tambahan */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '10px',
        fontSize: '8px',
        borderTop: '1px solid black',
        paddingTop: '5px'
      }}>
        <div>KODE: {kodeGambar || 'NS-01'}</div>
        <div>LBR: {noLembar || 1} / {jumlahLembar || 5}</div>
      </div>
    </div>
  );
};

export default KopGambarVertikal;
```

---

## 4. STRUKTUR STATE MANAGEMENT

### ══════════════════════════════════════════════════════════════════════
### 4.1 STATE UTAMA
### ══════════════════════════════════════════════════════════════════════

```javascript
// =====================
// STATE MANAGEMENT
// =====================

// Main State untuk RAP
const [rapState, setRapState] = useState({
  // Tab Navigation
  activeTab: 'tab1_geometri',  // tab1 - tab9
  
  // Data TAB 1: Geometri & Volume Rencana
  geometri: {
    panjang: 500,
    b1: 4.0,           // Lebar Dasar
    b2: 2.857,         // Lebar Bawah
    b3: 6.857,         // Lebar Atas
    h: 1.0,            // Kedalaman Galian
    hPrime: 2.5,       // Tinggi Eksisting
    slope: 1,           // Kemiringan 1:m
    lebarStripping: 3.0,
    kedalamanStripping: 0.1,
    
    // Kop Data
    kopData: {
      program: 'PROGRAM PENGELOLAAN SUMBER DAYA AIR (SDA)',
      kegiatan: 'PENGELOLAAN SDA DAN BANGUNAN PENGAMAN PANTAI...',
      pekerjaan: 'NORMALISASI SUNGAI',
      lokasi: '',
      tahun: new Date().getFullYear(),
      kode_gambar: 'NS-01'
    },
    
    // Generated STA
    stas: [],          // Array of 5 STA
    totalVolume: 0,
    totalStripping: 0
  },
  
  // Data TAB 2: Excavator & Analisa
  analisaRencana: {
    selectedAlat: 'PC200',
    hp: 148,
    bucket: 0.9,
    fb: 1.0,            // Faktor Bucket
    fa: 0.7,            // Faktor Efisiensi
    fv: 0.8,            // Faktor Konversi
    fk: 0.8,            // Faktor Pengembangan
    loadFactor: 0.28,
    feMenit: 45,        // 45 menit dari 60 menit
    waktuGali: 38,      // detik
    
    // Cell Kuning (Hasil Hitungan)
    t1: 0.659,          // Waktu Siklus (GoalSeek)
    fd: 0.96,           // Faktor Daya
    q1: 89.57,          // Kapasitas/Jam (m³)
    q2: 716.60,         // Kapasitas/Hari (m³)
    h: 22.90,           // BBM/Jam (L)
    h2: 183.21,         // BBM/Hari (L)
    koefBBM: 0.2557,    // Koefisien BBM/m³
    estimasiHari: 10,
    totalSolar: 1734.50
  },
  
  // Data TAB 3: Kebutuhan Realisasi
  kebutuhanRealisasi: {
    selectedAssignment: null,
    dailyData: [],      // Array: { tanggal, jam, q1, galian, bbmJam, bbmHarian, diterima, sisa }
    
    // GoalSeek Results
    q1GoalSeek: 0,
    hGoalSeek: 0,
    t1GoalSeek: 0,
    totalGalian: 0,
    totalBBMterpakai: 0,
    sisaAkhir: 0,
    sisaTarget: 70       // Target sisa 70 liter
  },
  
  // Data TAB 4: Analisa Pelaksanaan
  analisaPelaksanaan: {
    // Hasil Verifikasi T.1
    t1Hasil: 0,
    fdHasil: 0,
    q1Hasil: 0,
    hHasil: 0,
    
    // Validasi SNI
    validasiSNI: {
      dalamRange: false,
      status: '',       // 'WAJAR', 'TERLALU_CEPAT', 'TERLALU_LAMBAT'
      warning: null
    }
  },
  
  // Data TAB 5: Backup Volume Pelaksanaan
  backupPelaksanaan: {
    stas: [],           // Array of 5 STA (STA 0 = TAB 1, lainnya variasi)
    totalVolume: 0
  },
  
  // Data TAB 6: Personil
  personil: {
    durasiHari: 0,
    totalHOK: 0,
    kebutuhanSolar: 0,
    koefPM: 0
  },
  
  // Data TAB 7: RAB Personil
  rabPersonil: {
    subTotal: 0,
    ppn12: 0,
    total: 0,
    pembulatan: 0
  },
  
  // Data TAB 8: RAB Pekerjaan
  rabPekerjaan: {
    volume: 0,
    hargaSatuan: 0,
    hargaPPN: 0,
    jumlahGalian: 0,
    jumlahKeamanan: 0,
    subTotal: 0,
    grandTotal: 0,
    pagu: 3600000000,
    sisaPagu: 0
  },
  
  // Data TAB 9: TTD
  ttd: {
    kpaNama: '',
    kpaNip: '',
    pptkNama: '',
    pptkNip: ''
  }
});
```

### ══════════════════════════════════════════════════════════════════════
### 4.2 EFFECTS (CALCULATION TRIGGERS)
### ══════════════════════════════════════════════════════════════════════

```javascript
// =====================
// USE EFFECTS
// =====================

// Effect 1: Generate STA when geometri changes
useEffect(() => {
  if (geometri.panjang > 0 && geometri.b1 > 0) {
    const result = generateSTAPerencanaan(geometri);
    setRapState(prev => ({
      ...prev,
      geometri: {
        ...prev.geometri,
        stas: result.stas,
        totalVolume: result.totalVolume
      }
    }));
  }
}, [geometri.panjang, geometri.b1, geometri.b2, geometri.b3, geometri.h, geometri.hPrime]);

// Effect 2: Calculate Analisa when excavator/parameters change
useEffect(() => {
  const result = calculateAnalisaRencana(rapState.geometri.totalVolume, analisaRencana);
  setRapState(prev => ({
    ...prev,
    analisaRencana: {
      ...prev.analisaRencana,
      ...result
    }
  }));
}, [analisaRencana.selectedAlat, rapState.geometri.totalVolume]);

// Effect 3: GoalSeek Sisa BBM when daily data or params change
useEffect(() => {
  if (kebutuhanRealisasi.dailyData.length > 0 && rapState.geometri.totalVolume > 0) {
    const goalSeekResult = goalSeekSisaBBM(
      {
        totalBBMditerima: kebutuhanRealisasi.dailyData.reduce((sum, d) => sum + (d.diterima || 0), 0),
        totalJamKerja: kebutuhanRealisasi.dailyData.reduce((sum, d) => sum + d.jam, 0),
        targetVolume: rapState.geometri.totalVolume,
        targetSisaIdeal: kebutuhanRealisasi.sisaTarget
      },
      analisaRencana,
      { selectedAlat: analisaRencana.selectedAlat, loadFactor: LOAD_FACTOR }
    );
    
    setRapState(prev => ({
      ...prev,
      kebutuhanRealisasi: {
        ...prev.kebutuhanRealisasi,
        ...goalSeekResult,
        dailyData: prev.kebutuhanRealisasi.dailyData.map(d => ({
          ...d,
          q1: goalSeekResult.q1,
          galian: goalSeekResult.q1 * d.jam,
          bbmHarian: goalSeekResult.h * d.jam
        }))
      }
    }));
  }
}, [kebutuhanRealisasi.dailyData.length, rapState.geometri.totalVolume]);

// Effect 4: Verify T.1 in Analisa Pelaksanaan
useEffect(() => {
  if (kebutuhanRealisasi.hGoalSeek > 0) {
    const verifikasi = goalSeekT1Verifikasi(
      kebutuhanRealisasi.hGoalSeek,
      analisaRencana,
      { selectedAlat: analisaRencana.selectedAlat, sniRange: SNI_WAKTU_SIKLUS }
    );
    
    setRapState(prev => ({
      ...prev,
      analisaPelaksanaan: verifikasi
    }));
  }
}, [kebutuhanRealisasi.hGoalSeek, analisaRencana.selectedAlat]);

// Effect 5: Generate Backup Pelaksanaan
useEffect(() => {
  if (rapState.geometri.stas.length > 0 && kebutuhanRealisasi.totalGalian > 0) {
    const result = generateSTAPelaksanaan(
      rapState.geometri.panjang,
      rapState.geometri.stas[0],  // STA 0 = STA 0 TAB 1
      kebutuhanRealisasi.totalGalian
    );
    
    setRapState(prev => ({
      ...prev,
      backupPelaksanaan: {
        stas: result.stas,
        totalVolume: result.totalVolume
      }
    }));
  }
}, [rapState.geometri.stas, kebutuhanRealisasi.totalGalian]);

// Effect 6: Calculate Personil
useEffect(() => {
  const durasi = Math.ceil(rapState.geometri.totalVolume / rapState.analisaRencana.q2);
  const koefPM = rapState.geometri.totalVolume / rapState.analisaRencana.q2;
  
  setRapState(prev => ({
    ...prev,
    personil: {
      durasiHari: durasi,
      totalHOK: durasi * 2,  // 2 penjaga malam
      kebutuhanSolar: rapState.geometri.totalVolume * rapState.analisaRencana.koefBBM,
      koefPM: koefPM
    }
  }));
}, [rapState.geometri.totalVolume, rapState.analisaRencana.q2]);

// Effect 7: Calculate RAB Personil
useEffect(() => {
  const { totalHOK, kebutuhanSolar } = rapState.personil;
  const hargaPM = 75000;
  const hargaSolar = 22300;
  
  const subTotal = (totalHOK * hargaPM) + (kebutuhanSolar * hargaSolar);
  const ppn12 = subTotal * 0.12;
  const total = subTotal + ppn12;
  const pembulatan = Math.floor(total / 1000) * 1000;
  
  setRapState(prev => ({
    ...prev,
    rabPersonil: {
      subTotal,
      ppn12,
      total,
      pembulatan
    }
  }));
}, [rapState.personil]);

// Effect 8: Calculate RAB Pekerjaan
useEffect(() => {
  const { totalVolume } = rapState.geometri;
  const { durasiHari } = rapState.personil;
  const hargaSatuan = 5701.51;  // dari perhitungan
  const hargaPPN = hargaSatuan * 1.12;
  
  const jumlahGalian = totalVolume * hargaPPN;
  const jumlahKeamanan = durasiHari * 2 * 75000 * 1.12;
  
  const grandTotal = jumlahGalian + jumlahKeamanan;
  
  setRapState(prev => ({
    ...prev,
    rabPekerjaan: {
      volume: totalVolume,
      hargaSatuan,
      hargaPPN,
      jumlahGalian,
      jumlahKeamanan,
      subTotal: grandTotal,
      grandTotal,
      sisaPagu: prev.rabPekerjaan.pagu - grandTotal
    }
  }));
}, [rapState.geometri.totalVolume, rapState.personil.durasiHari]);

// Effect 9: Save TTD to localStorage
useEffect(() => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('rap_ttd_default', JSON.stringify(rapState.ttd));
  }
}, [rapState.ttd]);

// Effect 10: Load TTD from localStorage on mount
useEffect(() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('rap_ttd_default');
    if (saved) {
      setRapState(prev => ({
        ...prev,
        ttd: JSON.parse(saved)
      }));
    } else {
      // Default values
      setRapState(prev => ({
        ...prev,
        ttd: {
          kpaNama: 'JAFAR SODIQ, ST, MM',
          kpaNip: '19760818 200312 1 005',
          pptkNama: 'GALUH SETIAWAN ROSMI, ST',
          pptkNip: '19790511 200312 1 006'
        }
      }));
    }
  }
}, []);
```

---

## 5. IMPLEMENTASI UI TABS

### ══════════════════════════════════════════════════════════════════════
### 5.1 TAB NAVIGATION
### ══════════════════════════════════════════════════════════════════════

```jsx
// =====================
// TAB NAVIGATION
// =====================

const tabConfig = [
  { id: 'tab1_geometri', label: '1. Geometri & Volume', icon: '📐' },
  { id: 'tab2_analisa', label: '2. Excavator & Analisa', icon: '⚙️' },
  { id: 'tab3_realisasi', label: '3. Kebutuhan Realisasi', icon: '📋' },
  { id: 'tab4_verifikasi', label: '4. Verifikasi Pelaksanaan', icon: '✓' },
  { id: 'tab5_backup', label: '5. Volume Pelaksanaan', icon: '📊' },
  { id: 'tab6_personil', label: '6. Personil', icon: '👷' },
  { id: 'tab7_rab_personil', label: '7. RAB Personil', icon: '💰' },
  { id: 'tab8_rab_akhir', label: '8. RAB Final', icon: '📄' },
  { id: 'tab9_ttd', label: '9. TTD & Cetak', icon: '🖊️' }
];

const TabNavigation = ({ activeTab, onTabChange }) => {
  return (
    <div className="tabs-container" style={{
      display: 'flex',
      gap: '4px',
      padding: '10px 20px',
      borderBottom: '1px solid #e2e8f0',
      overflowX: 'auto',
      backgroundColor: '#f8fafc'
    }}>
      {tabConfig.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            fontSize: '13px',
            fontWeight: activeTab === tab.id ? 'bold' : 'normal',
            backgroundColor: activeTab === tab.id ? '#2563eb' : 'transparent',
            color: activeTab === tab.id ? 'white' : '#64748b',
            transition: 'all 0.2s'
          }}
        >
          {tab.icon} {tab.label}
        </button>
      ))}
    </div>
  );
};
```

### ══════════════════════════════════════════════════════════════════════
### 5.2 TAB 1: GEOMETRI & VOLUME RENCANA
### ══════════════════════════════════════════════════════════════════════

```jsx
// =====================
// TAB 1: GEOMETRI
// =====================

const Tab1Geometri = ({ geometri, setGeometri, onNext }) => {
  return (
    <div className="tab-content" style={{ padding: '20px' }}>
      <h2 style={{ marginBottom: '20px' }}>📐 GEOMETRI & VOLUME RENCANA</h2>
      
      {/* Input Dimensi */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">Dimensi Saluran</div>
        <div className="card-body">
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="form-group">
              <label>Panjang Total (m)</label>
              <input
                type="number"
                value={geometri.panjang}
                onChange={e => setGeometri({...geometri, panjang: Number(e.target.value)})}
              />
            </div>
            <div className="form-group">
              <label>Slope (1:m)</label>
              <input
                type="number"
                value={geometri.slope}
                onChange={e => setGeometri({...geometri, slope: Number(e.target.value)})}
              />
            </div>
            <div className="form-group">
              <label>h' (Tinggi Eksisting) (m)</label>
              <input
                type="number"
                step="0.001"
                value={geometri.hPrime}
                onChange={e => setGeometri({...geometri, hPrime: Number(e.target.value)})}
              />
            </div>
            <div className="form-group">
              <label>b₁ (Lebar Dasar) (m)</label>
              <input
                type="number"
                step="0.001"
                value={geometri.b1}
                onChange={e => setGeometri({...geometri, b1: Number(e.target.value)})}
              />
            </div>
            <div className="form-group">
              <label>b₂ (Lebar Bawah) (m)</label>
              <input
                type="number"
                step="0.001"
                value={geometri.b2}
                onChange={e => setGeometri({...geometri, b2: Number(e.target.value)})}
              />
            </div>
            <div className="form-group">
              <label>b₃ (Lebar Atas) (m)</label>
              <input
                type="number"
                step="0.001"
                value={geometri.b3}
                onChange={e => setGeometri({...geometri, b3: Number(e.target.value)})}
              />
            </div>
            <div className="form-group">
              <label>h (Kedalaman Galian) (m)</label>
              <input
                type="number"
                step="0.001"
                value={geometri.h}
                onChange={e => setGeometri({...geometri, h: Number(e.target.value)})}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabel STA */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header bg-blue-50">
          <span>5 STA Otomatis</span>
          <span style={{ fontWeight: 'bold', color: '#1e40af' }}>
            Total: {geometri.totalVolume.toFixed(3)} m³
          </span>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>STA</th>
                <th>b₁ (m)</th>
                <th>b₂ (m)</th>
                <th>b₃ (m)</th>
                <th>h (m)</th>
                <th>Luas (m²)</th>
              </tr>
            </thead>
            <tbody>
              {geometri.stas.map((sta, i) => (
                <tr key={i}>
                  <td><strong>{sta.sta}</strong></td>
                  <td>{sta.b1.toFixed(3)}</td>
                  <td>{sta.b2.toFixed(3)}</td>
                  <td>{sta.b3.toFixed(3)}</td>
                  <td>{sta.h.toFixed(3)}</td>
                  <td>{sta.luas.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Gambar Cross-Section */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">Gambar Cross-Section</div>
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '10px' }}>
          {geometri.stas.map((sta, i) => (
            <div key={i} style={{ minWidth: '300px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <CrossSectionSVG 
                staData={generateSTAData(sta, geometri, 'PERENCANAAN')}
              />
            </div>
          ))}
        </div>
      </div>
      
      {/* Tombol Next */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={onNext}>
          Lanjut ke Tab 2: Excavator & Analisa →
        </button>
      </div>
    </div>
  );
};
```

### ══════════════════════════════════════════════════════════════════════
### 5.3 TAB 3: KEBUTUHAN REALISASI (DENGAN GOALSEEK)
### ══════════════════════════════════════════════════════════════════════

```jsx
// =====================
// TAB 3: KEBUTUHAN REALISASI
// =====================

const Tab3Realisasi = ({ 
  kebutuhanRealisasi, 
  setKebutuhanRealisasi,
  rapState,
  onSelectLaporan
}) => {
  
  const { totalJam, totalDiterima } = kebutuhanRealisasi.dailyData.reduce((acc, d) => ({
    totalJam: acc.totalJam + d.jam,
    totalDiterima: acc.totalDiterima + (d.diterima || 0)
  }), { totalJam: 0, totalDiterima: 0 });
  
  return (
    <div className="tab-content" style={{ padding: '20px' }}>
      <h2 style={{ marginBottom: '20px' }}>📋 KEBUTUHAN REALISASI</h2>
      
      {/* Pilih Laporan */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">Pilih Data Laporan</div>
        <div className="card-body">
          <button className="btn btn-secondary" onClick={onSelectLaporan}>
            📋 Pilih Laporan dari Database
          </button>
        </div>
      </div>
      
      {/* Tabel Data */}
      {kebutuhanRealisasi.dailyData.length > 0 && (
        <>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header">
              Tabel Realisasi Harian
              <span style={{ color: '#64748b', fontWeight: 'normal', fontSize: '12px' }}>
                (Data dari {kebutuhanRealisasi.dailyData.length} hari kerja)
              </span>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Tanggal</th>
                    <th>Jam</th>
                    <th>Galian/Jam (m³)</th>
                    <th>Galian/Hari (m³)</th>
                    <th>BBM/Jam (L)</th>
                    <th>BBM/Hari (L)</th>
                    <th>Diterima (L)</th>
                    <th>Sisa (L)</th>
                  </tr>
                </thead>
                <tbody>
                  {kebutuhanRealisasi.dailyData.map((d, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{new Date(d.tanggal).toLocaleDateString('id-ID')}</td>
                      <td>{d.jam.toFixed(1)}</td>
                      <td style={{ backgroundColor: '#fef3c7' }}>{d.q1.toFixed(2)}</td>
                      <td>{d.galian.toFixed(2)}</td>
                      <td>{d.bbmJam.toFixed(2)}</td>
                      <td>{d.bbmHarian.toFixed(2)}</td>
                      <td>{d.diterima || '-'}</td>
                      <td>{d.sisa.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 'bold', backgroundColor: '#f1f5f9' }}>
                    <td colSpan={2}>TOTAL</td>
                    <td>{totalJam.toFixed(1)}</td>
                    <td></td>
                    <td>{kebutuhanRealisasi.totalGalian.toFixed(2)}</td>
                    <td></td>
                    <td>{kebutuhanRealisasi.totalBBMterpakai.toFixed(2)}</td>
                    <td>{totalDiterima}</td>
                    <td>{kebutuhanRealisasi.sisaAkhir.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          {/* GoalSeek Summary */}
          <div className="card" style={{ 
            backgroundColor: kebutuhanRealisasi.sisaAkhir >= 40 && kebutuhanRealisasi.sisaAkhir <= 100 
              ? '#dcfce7' 
              : '#fef3c7',
            border: `1px solid ${kebutuhanRealisasi.sisaAkhir >= 40 && kebutuhanRealisasi.sisaAkhir <= 100 ? '#22c55e' : '#f59e0b'}`
          }}>
            <div className="card-header" style={{ 
              backgroundColor: 'transparent',
              color: kebutuhanRealisasi.sisaAkhir >= 40 && kebutuhanRealisasi.sisaAkhir <= 100 ? '#166534' : '#92400e'
            }}>
              🎯 GoalSeek Result: Sisa BBM
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Target Sisa</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                    {kebutuhanRealisasi.sisaTarget} L
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Sisa Akhir</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#166534' }}>
                    {kebutuhanRealisasi.sisaAkhir.toFixed(2)} L
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Status</div>
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: 'bold',
                    color: kebutuhanRealisasi.sisaAkhir >= 40 && kebutuhanRealisasi.sisaAkhir <= 100 
                      ? '#166534' 
                      : '#dc2626'
                  }}>
                    {kebutuhanRealisasi.sisaAkhir >= 40 && kebutuhanRealisasi.sisaAkhir <= 100 
                      ? '✓ IDEAL' 
                      : kebutuhanRealisasi.sisaAkhir < 40 
                        ? '⚠️ TERLALU SEDIKIT' 
                        : '⚠️ TERLALU BANYAK'}
                  </div>
                </div>
              </div>
              
              {kebutuhanRealisasi.adjustReason && (
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#92400e' }}>
                  {kebutuhanRealisasi.adjustReason}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
```

### ══════════════════════════════════════════════════════════════════════
### 5.4 TAB 4: VERIFIKASI PELAKSANAAN
### ══════════════════════════════════════════════════════════════════════

```jsx
// =====================
// TAB 4: VERIFIKASI PELAKSANAAN
// =====================

const Tab4Verifikasi = ({ analisaPelaksanaan, specs }) => {
  const sniRange = specs.sniRange[specs.selectedAlat];
  
  return (
    <div className="tab-content" style={{ padding: '20px' }}>
      <h2 style={{ marginBottom: '20px' }}>✓ VERIFIKASI T.1 PELAKSANAAN</h2>
      
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">Hasil Verifikasi</div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>T.1 Hasil (menit)</div>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#1e40af' }}>
                {analisaPelaksanaan.t1.toFixed(3)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Status Validasi SNI</div>
              <div style={{ 
                fontSize: '24px', 
                fontWeight: 'bold',
                color: analisaPelaksanaan.validasiSNI.status === 'WAJAR' ? '#166534' : '#dc2626'
              }}>
                {analisaPelaksanaan.validasiSNI.status}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Range SNI */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">Validasi terhadap Standar SNI</div>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: '100px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#64748b' }}>Min</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{sniRange.min.toFixed(3)}</div>
            </div>
            
            <div style={{ flex: 1, position: 'relative', height: '40px' }}>
              {/* Range Bar */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '0',
                right: '0',
                height: '10px',
                backgroundColor: '#e2e8f0',
                borderRadius: '5px',
                transform: 'translateY(-50%)'
              }} />
              
              {/* Min-Max Range */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: `${(sniRange.min / sniRange.max) * 100}%`,
                width: `${((sniRange.max - sniRange.min) / sniRange.max) * 100}%`,
                height: '10px',
                backgroundColor: '#22c55e',
                borderRadius: '5px',
                transform: 'translateY(-50%)'
              }} />
              
              {/* T.1 Marker */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: `${(analisaPelaksanaan.t1 / sniRange.max) * 100}%`,
                width: '16px',
                height: '16px',
                backgroundColor: analisaPelaksanaan.validasiSNI.dalamRange ? '#22c55e' : '#dc2626',
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                border: '2px solid white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }} />
            </div>
            
            <div style={{ width: '100px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#64748b' }}>Max</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{sniRange.max.toFixed(3)}</div>
            </div>
          </div>
          
          <div style={{ marginTop: '10px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
            {analisaPelaksanaan.validasiSNI.dalamRange 
              ? `✓ T.1 = ${analisaPelaksanaan.t1.toFixed(3)} menit berada dalam range standar`
              : analisaPelaksanaan.validasiSNI.warning}
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## 6. EXPORT EXCEL (11 SHEETS)

### ══════════════════════════════════════════════════════════════════════
### 6.1 EXPORT FUNCTION
### ══════════════════════════════════════════════════════════════════════

```javascript
// =====================
// EXPORT EXCEL 11 SHEETS
// =====================

/**
 * Generate workbook dengan 11 sheet sesuai format master
 */
async function generateFullExcelWorkbook(rapState) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  
  // Sheet 1: ANALISA perencanaan
  const ws1 = generateAnalisaPerencanaan(rapState);
  XLSX.utils.book_append_sheet(wb, ws1, "ANALISA perencanaan");
  
  // Sheet 2: backup volume rencana
  const ws2 = generateBackupVolumeRencana(rapState);
  XLSX.utils.book_append_sheet(wb, ws2, "backup volume rencana");
  
  // Sheet 3: PERSONIL
  const ws3 = generatePersonil(rapState);
  XLSX.utils.book_append_sheet(wb, ws3, "PERSONIL");
  
  // Sheet 4: RAB PERSONIL
  const ws4 = generateRabPersonil(rapState);
  XLSX.utils.book_append_sheet(wb, ws4, "RAB PERSONIL");
  
  // Sheet 5: RAB PEKERJAAN
  const ws5 = generateRabPekerjaan(rapState);
  XLSX.utils.book_append_sheet(wb, ws5, "RAB PEKERJAAN");
  
  // Sheet 6: ANALISA pelaksanaan
  const ws6 = generateAnalisaPelaksanaan(rapState);
  XLSX.utils.book_append_sheet(wb, ws6, "ANALISA pelaksanaan");
  
  // Sheet 7: Kebutuhan  realismo
  const ws7 = generateKebutuhanRealisasi(rapState);
  XLSX.utils.book_append_sheet(wb, ws7, "Kebutuhan  realismo");
  
  // Sheet 8: backup volume Pelaksanaan
  const ws8 = generateBackupVolumePelaksanaan(rapState);
  XLSX.utils.book_append_sheet(wb, ws8, "backup volume Pelaksanaan");
  
  // Sheet 9: PERSONIL pelaksanaan
  const ws9 = generatePersonilPelaksanaan(rapState);
  XLSX.utils.book_append_sheet(wb, ws9, "PERSONIL pelaksanaan");
  
  // Sheet 10: RAB PERSONIL PELAKSANAAN
  const ws10 = generateRabPersonilPelaksanaan(rapState);
  XLSX.utils.book_append_sheet(wb, ws10, "RAB PERSONIL PELAKSANAAN");
  
  // Sheet 11: RAB PELAKSANAAN
  const ws11 = generateRabPelaksanaan(rapState);
  XLSX.utils.book_append_sheet(wb, ws11, "RAB PELAKSANAAN");
  
  return wb;
}

/**
 * Generate sheet ANALISA perencanaan
 */
function generateAnalisaPerencanaan(rapState) {
  const { geometri, analisaRencana } = rapState;
  const data = [];
  
  // Header
  data.push(["ANALISA HARGA SATUAN"]);
  data.push(["PEKERJAAN: " + geometri.kopData.pekerjaan]);
  data.push(["LOKASI: " + geometri.kopData.lokasi]);
  data.push([]);
  
  // Bagian I: Asumsi
  data.push(["I. ASUMSI"]);
  data.push(["1.", "Jam Kerja Efektif per hari", "Tk", 8, "Jam"]);
  data.push(["2.", "Faktor Pengembangan Material", "Fk", 0.8, "-"]);
  data.push([]);
  
  // Bagian II: Urutan Kerja
  data.push(["II. URUTAN KERJA"]);
  data.push(["Pekerjaan galian tanah dengan Excavator dan penimbunan kembali"]);
  data.push([]);
  
  // Bagian III: Uraian Peralatan
  data.push(["III. URAIAN PERALATAN"]);
  data.push([1, "Tenaga", "Pw", geometri.analisaRencana?.hp || 148, "HP"]);
  data.push([2, "Kapasitas Bucket", "V (Cp)", geometri.analisaRencana?.bucket || 0.9, "m3"]);
  data.push([3, "Jam Operasi per Tahun", "w", 2000, "Jam"]);
  data.push([4, "Faktor Bucket", "Fb", geometri.analisaRencana?.fb || 1.0, "-"]);
  data.push([5, "Faktor Efisiensi Alat", "Fa", geometri.analisaRencana?.fa || 0.7, "-"]);
  data.push([6, "Faktor Konversi Galian", "Fv", geometri.analisaRencana?.fv || 0.8, "-"]);
  data.push([7, "Waktu Siklus", "T.1", analisaRencana.t1, "menit", "CELL KUNING"]);
  data.push([8, "Kap. Produksi/Jam", "Q1", analisaRencana.q1, "m3/jam"]);
  data.push([9, "Kap. Produksi/Hari", "Q.2", analisaRencana.q2, "m3/hari"]);
  data.push([]);
  
  // Bagian IV: Biaya Operasi
  data.push(["IV. BIAYA OPERASI/JAM"]);
  const kW = (geometri.analisaRencana?.hp || 148) * 0.7457;
  const Fe = 45 / 60;
  data.push(["kW", "=", geometri.analisaRencana?.hp || 148, "x 0.7457", "=", kW.toFixed(2)]);
  data.push(["Load Factor", "L/kWh", geometri.analisaRencana?.loadFactor || 0.28]);
  data.push(["Fe", "=", 45, "/ 60", "=", Fe.toFixed(4)]);
  data.push(["Fd", "=", 38, "/ (T.1 x 60)", "=", analisaRencana.fd.toFixed(4)]);
  data.push(["H", "=", "Fd x Fe x L/kWh x kW", "=", analisaRencana.h.toFixed(2), "Liter/jam"]);
  data.push(["h2", "=", "H x 8", "=", analisaRencana.h2.toFixed(2), "Liter/hari"]);
  data.push([]);
  
  // Bagian V: Estimasi
  data.push(["V. ESTIMASI PEKERJAAN"]);
  data.push(["Volume", "V", geometri.totalVolume, "m3"]);
  data.push(["Estimasi Waktu", "T.pek", Math.ceil(geometri.totalVolume / analisaRencana.q2), "Hari"]);
  data.push(["Total Kebutuhan Solar", "Ks", analisaRencana.totalSolar.toFixed(2), "Liter"]);
  
  return XLSX.utils.aoa_to_sheet(data);
}

/**
 * Generate sheet backup volume rencana
 */
function generateBackupVolumeRencana(rapState) {
  const { geometri } = rapState;
  const data = [];
  
  data.push(["BACKUP VOLUME RENCANA"]);
  data.push([]);
  data.push(["STA", "b1(m)", "b2(m)", "b3(m)", "h(m)", "h'(m)", "Luas(m2)", "Volume(m3)"]);
  
  let totalVolume = 0;
  geometri.stas.forEach((sta, i) => {
    const vol = i < geometri.stas.length - 1 ? sta.luas * (geometri.panjang / 4) : 0;
    totalVolume += vol;
    data.push([
      sta.sta,
      sta.b1.toFixed(3),
      sta.b2.toFixed(3),
      sta.b3.toFixed(3),
      sta.h.toFixed(3),
      sta.hPrime.toFixed(3),
      sta.luas.toFixed(3),
      vol.toFixed(3)
    ]);
  });
  
  data.push([]);
  data.push(["TOTAL", "", "", "", "", "", "", totalVolume.toFixed(3)]);
  
  return XLSX.utils.aoa_to_sheet(data);
}

// ... (implement other sheet generators similarly)
```

---

## 7. PRIORITAS IMPLEMENTASI

### Phase 1: Core Engine (Week 1)
1. Fix `calcRapMath.js` dengan data spec yang benar
2. Implement fungsi `goalSeekSisaBBM`
3. Implement fungsi `goalSeekT1Verifikasi`
4. Add Tabel SNI Reference

### Phase 2: UI Tabs 1-5 (Week 2)
1. Tab Navigation
2. Tab 1: Geometri + Gambar Cross-Section
3. Tab 2: Excavator + Analisa
4. Tab 3: Kebutuhan Realisasi + GoalSeek
5. Tab 4: Verifikasi Pelaksanaan
6. Tab 5: Backup Pelaksanaan

### Phase 3: UI Tabs 6-9 + Storage (Week 3)
1. Tab 6-8: Personil & RAB
2. Tab 9: TTD + localStorage
3. Implementasi Storage untuk setiap tab

### Phase 4: Export & Print (Week 4)
1. Generate Excel 11 sheets
2. Print PDF dengan gambar
3. Testing & Bug fixing

---

## 8. VALIDATION CHECKLIST

- [ ] GoalSeek Tab 3 menghasilkan Sisa = 40-100 liter
- [ ] T.1 Tab 4 validasi terhadap range SNI
- [ ] STA 0 Tab 5 = STA 0 Tab 1
- [ ] Total Volume Tab 5 ≈ Total Galian Tab 3
- [ ] Gambar Cross-Section menampilkan area galian di-arsir VERTIKAL
- [ ] Export Excel menghasilkan 11 sheet
- [ ] Print PDF menampilkan 10 gambar (5+5)

---

**Dokumen Implementation Plan Final - Siap untuk coding!**
