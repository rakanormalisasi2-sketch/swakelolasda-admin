'use client';
import React from 'react';

// Dimension visual tooltips - shows WHERE each dimension is measured
export const DIMENSION_TOOLTIPS = {
  b1: {
    title: 'b₁ - Lebar Dasar Saluran',
    definition: 'Lebar dasar saluran di bagian paling bawah (paling sempit)',
    whereMeasured: 'Diukur di DASAR saluran (bottom)',
    howToMeasure: 'Letakkan pita ukur di dasar saluran, ukur lebar bagian bawah',
    diagram: `
┌─────────────────────────────┐
│ ════════════════════════ ← Muka Tanah
│    ╲                ╱
│      ╲            ╱
│        ╲        ╱
│          ╲____╱
│ ←───────────────→ ← b₁
│   (LEBAR DASAR)
└─────────────────────────────┘
`,
    formula: 'b₁ + 2×(slope×h) = b₃',
    standardNote: 'Sesuai hasil pengukuran di lapangan'
  },

  b2: {
    title: 'b₂ - Lebar Tengah',
    definition: 'Lebar saluran pada level muka air eksisting',
    whereMeasured: 'Diukur pada level MUKA AIR lama (h\')',
    howToMeasure: 'Ukur lebar pada tinggi permukaan air eksisting',
    diagram: `
┌─────────────────────────────┐
│ ════════════════════════ ← Muka Tanah
│    ╲════════════════╱ ← b₂
│      ╲            ╱
│        ╲        ╱
│          ╲____╱
│ ←─────────────────────→
│      (LEBAR PADA h')
└─────────────────────────────┘
`,
    formula: 'b₂ = b₁ + 2×(slope×h)',
    standardNote: 'Biasanya dihitung otomatis dari b₁ dan slope'
  },

  b3: {
    title: 'b₃ - Lebar Muka Tanah',
    definition: 'Lebar permukaan tanah di bagian paling atas (paling lebar)',
    whereMeasured: 'Diukur di PERMUKAAN tanah (top)',
    howToMeasure: 'Ukur lebar di permukaan tanah eksisting',
    diagram: `
┌─────────────────────────────┐
│ ════════════════════════ ← b₃ (LEBAR ATAS)
│    ╲                ╱
│      ╲            ╱
│        ╲        ╱
│          ╲____╱
│ ←─────────────────────→
│   (LEBAR MUKA TANAH)
└─────────────────────────────┘
`,
    formula: 'b₃ = b₁ + 2×(slope×h)',
    standardNote: 'Merupakan hasil pengukuran di permukaan tanah'
  },

  h: {
    title: 'h - Kedalaman Galian',
    definition: 'Kedalaman galian dari muka tanah ke dasar saluran',
    whereMeasured: 'Diukur TEGAK LURUS dari muka tanah ke dasar',
    howToMeasure: 'Gunakan tongkat ukur, tegakkan dari permukaan ke dasar',
    diagram: `
┌─────────────────────────────┐
│ ════════════════════════    │
│    ╲                ╱       │
│      ╲            ╱         │
│        ╲        ╱           │
│          ╲____╱  ↓ MUKA    │
│               │  TANAH      │
│               │ ↑          │
│               ↓  h         │
│ ════════════════════════ ←  DASAR
│           KEDALAMAN
└─────────────────────────────┘
`,
    warning: 'Kedalaman > 5m memerlukan pertimbangan khusus',
    standardNote: 'Sesuai hasil pengukuran Lapangan'
  },

  hPrime: {
    title: 'h\' - Tinggi Air Eksisting',
    definition: 'Kedalaman air pada kondisi eksisting/sebelum galian',
    whereMeasured: 'Diukur dari dasar ke permukaan air',
    howToMeasure: 'Rendam tongkat ukur ke air, catat kedalaman',
    diagram: `
┌─────────────────────────────┐
│ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~  ← Permukaan Air
│ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~
│              ↑ h'           │
│              ↓              │
│ ════════════════════════    │
│            DASAR            │
└─────────────────────────────┘
`,
    standardNote: 'Diukur saat kondisi air seperti biasa'
  },

  slope: {
    title: 'Slope - Kemiringan Talud',
    definition: 'Kemiringan dinding saluran (1 bagian vertikal : n bagian horizontal)',
    whereMeasured: 'Diukur pada DINDING saluran (talud)',
    howToMeasure: '1:n = setiap turun 1m, melebar n meter ke samping',
    diagram: `
┌─────────────────────────────┐
│ MUKA TANAH ════════╗         │
│                    ║ 1       │
│                    ║ bagian │
│                    ║ VERT.   │
│                    ╚══════   │
│                        ║    │
│                        ║    │
│                        ↓    │
│ ════════════════════════════ │
│    ←── n bagian HORIZONTAL →│
└─────────────────────────────┘
`,
    values: {
      '1:0.5': 'Sangat curam - area terbatas',
      '1:1': 'Standar normalisasi sungai',
      '1:1.5': 'Sedang - tanah biasa',
      '1:2': 'Landai - tanah labil'
    },
    standardNote: 'Sesuai kondisi lokasi dan jenis tanah'
  },

  panjang: {
    title: 'Panjang Total Saluran',
    definition: 'Panjang total saluran/sungai yang akan digali',
    whereMeasured: 'Dari STA 0+000 sampai STA akhir',
    howToMeasure: 'Jumlahkan jarak antar STA',
    diagram: `
│←─────────────────────────────→
│        PANJANG TOTAL
│        (500m, 1000m, dll)
│
├──┬──┬──┬──┬──┬──┬──┬──┬──┬──┤
│0  1  2  3  4  5  6  7  8  9 10│
└────────────────────────────────┘
STA 0+000                     STA akhir
`,
    standardNote: 'Sesuai hasil pengukuran situasi'
  }
};

// Tooltips untuk parameter excavator (Tab 2)
export const EXCAVATOR_TOOLTIPS = {
  hp: {
    title: 'HP - Tenaga Mesin',
    definition: 'Tenaga mesin excavator dalam Horse Power (HP)',
    whereMeasured: 'Berdasarkan spesifikasi pabrikan (Katalog Alat)',
    howToMeasure: 'Lihat di spesifikasi teknik excavator',
    source: 'Referensi: Komatsu Spec Sheet, Edition 28, 2007',
    diagram: `
┌───────────────────────────────────┐
│  EXCAVATOR SPECIFICATIONS         │
│                                   │
│  Model: PC 200-7                  │
│  Operating Weight: 20.785 Kg       │
│  Engine Power: Pw = 143 HP ←──────│
│  Bucket Capacity: 0.93 m³          │
│  Max Digging Depth: 6.37 m         │
└───────────────────────────────────┘
`,
    values: {
      'PC50': '41.7 HP',
      'PC75': '57 HP',
      'PC100': '94 HP',
      'PC200': '148 HP',
      'PC200LA': '148 HP'
    }
  },

  bucket: {
    title: 'Bucket - Kapasitas Bucket',
    definition: 'Volume bucket excavator dalam meter kubik (m³) - kondisi heaped (munjung)',
    whereMeasured: 'Berdasarkan spesifikasi pabrikan excavator',
    source: 'Tabel spesifikasi excavator - Komatsu',
    diagram: `
┌───────────────────────────────┐
│          ╱╲                   │
│         ╱  ╲  ← Bucket        │
│        ╱    ╲   (munjung)     │
│       ╱──────╲                │
│      ╱        ╲               │
│     ╱__________╲              │
│                               │
│  Kapasitas = V (m³)           │
└───────────────────────────────┘
`,
    note: 'PC200 dengan bucket 0.93m³ untuk swing 180°'
  },

  fb: {
    title: 'Fb - Faktor Bucket',
    definition: 'Faktor efisiensi bucket berdasarkan jenis material yang digali',
    whereMeasured: 'Tabel A.10 - SE DJBK No.47 Tahun 2026',
    source: 'Lampiran-II-AHSP.pdf, Tabel A.10',
    values: {
      tanahLunak: '1.00 (Pasir, Kerikil, Tanah Lunak)',
      tanahBiasa: '0.90 (Tanah Umum, Lempung)',
      tanahKeras: '0.80 (Lempung Keras, Tanah Keras)'
    },
    diagram: `
┌──────────────────────────────────────────┐
│  Tabel A.10 - Faktor Bucket (Fb)          │
├──────────────────────────────────────────┤
│  Kondisi Tanah        │  Fb              │
├───────────────────────┼──────────────────┤
│  Pasir, Kerikil,      │  1.00            │
│  Tanah Lunak          │                  │
├───────────────────────┼──────────────────┤
│  Tanah Umum,          │  0.90 ← STANDAR  │
│  Lempung              │                  │
├───────────────────────┼──────────────────┤
│  Lempung Keras,       │  0.80            │
│  Tanah Keras          │                  │
└──────────────────────────────────────────┘
`,
    defaultNote: 'Untuk galian saluran: gunakan Fb = 0.90'
  },

  fa: {
    title: 'Fa - Faktor Efisiensi Alat',
    definition: 'Faktor efisiensi kerja excavator berdasarkan kondisi kerja',
    whereMeasured: 'Tabel A.13 - SE DJBK No.47 Tahun 2026',
    source: 'Lampiran-II-AHSP.pdf, Tabel A.13',
    values: {
      sangatBaik: '0.90 (Kondisi sangat baik)',
      baik: '0.83 (Kondisi baik) ← STANDAR',
      sedang: '0.75 (Kondisi sedang)',
      kurang: '0.67 (Kondisi kurang baik)'
    },
    diagram: `
┌──────────────────────────────────────────┐
│  Tabel A.13 - Faktor Efisiensi Kerja       │
├──────────────────────────────────────────┤
│  Kondisi Kerja         │  Fa             │
├─────────────────────────┼─────────────────┤
│  Sangat Baik            │  0.90           │
├─────────────────────────┼─────────────────┤
│  Baik                   │  0.83 ← STANDAR │
├─────────────────────────┼─────────────────┤
│  Sedang                 │  0.75           │
├─────────────────────────┼─────────────────┤
│  Kurang                 │  0.67           │
└──────────────────────────────────────────┘
`,
    defaultNote: 'Untuk galian saluran: gunakan Fa = 0.83'
  },

  fv: {
    title: 'Fv - Faktor Konversi Galian',
    definition: 'Faktor konversi berdasarkan kedalaman galian terhadap kapasitas maksimum',
    whereMeasured: 'Tabel A.12 - SE DJBK No.47 Tahun 2026',
    source: 'Lampiran-II-AHSP.pdf, Tabel A.12',
    values: {
      normal: '1.00 (Rasio 40-75% kapasitas)',
      dalam: '0.85 (>75% kapasitas maks)'
    },
    diagram: `
┌──────────────────────────────────────────┐
│  Tabel A.12 - Faktor Konversi Galian      │
├──────────────────────────────────────────┤
│  Kedalaman vs Kapasitas Maks  │  Fv      │
├───────────────────────────────┼──────────┤
│  < 40% kapasitas               │  1.00    │
│  40% - 75% (NORMAL)            │  1.00 ← │
│  > 75% kapasitas               │  0.85    │
└──────────────────────────────────────────┘
`,
    defaultNote: 'Untuk galian normal: gunakan Fv = 1.00'
  },

  loadFactor: {
    title: 'Load Factor - Faktor Beban',
    definition: 'Faktor konversi untuk menghitung konsumsi BBM (L/jam)',
    whereMeasured: 'Berdasarkan jenis excavator dan kondisi operasi',
    source: 'Standar industri: 0.25-0.35 untuk excavator',
    formula: 'H (L/jam) = HP × LoadFactor × SpecificFuelConsumption',
    values: {
      PC50: '0.28',
      PC75: '0.28',
      PC100: '0.28',
      PC200: '0.28',
      PC200LA: '0.40 (Long Arm lebih boros)'
    }
  },

  waktuGali: {
    title: 'Waktu Gali - Cycle Time',
    definition: 'Waktu yang dibutuhkan untuk satu siklus penggalian (detik)',
    whereMeasured: 'Tabel A.11 - SE DJBK No.47 Tahun 2026',
    source: 'Lampiran-II-AHSP.pdf, Tabel A.11',
    diagram: `
┌──────────────────────────────────────────┐
│  Tabel A.11 - Waktu Siklus (detik)       │
├──────────────────────────────────────────┤
│  Bucket    │ Tanah      │ 45°-90°│90°-180°│
├────────────┼─────────────┼────────┼────────┤
│ 0.60-1.25  │ Tanah Lunak│ 14.4   │ 18.2   │
│            │ Tanah Biasa│ 18.3   │ 23.3   │
│            │ Tanah Keras│ 22.3   │ 28.3   │
├────────────┼─────────────┼────────┼────────┤
│ 1.25-2.20  │ Tanah Lunak│ 16.6   │ 20.4   │
│            │ Tanah Biasa│ 21.2   │ 26.1   │
│            │ Tanah Keras│ 25.8   │ 31.8   │
└──────────────────────────────────────────┘
`,
    note: 'PC200 (0.93m³), Swing 180°, Tanah Biasa = 23.3 detik'
  }
};

/**
 * DimensionTooltipModal - Gabungan untuk semua tooltips
 */
export function DimensionTooltipModal({ isOpen, onClose, dimensionKey, data }) {
  if (!isOpen || !data) return null;

  // Check if it's excavator tooltip
  const isExcavator = EXCAVATOR_TOOLTIPS[dimensionKey];
  const tooltipData = isExcavator || data;

  const colorMap = {
    panjang: 'blue',
    b1: 'emerald',
    b2: 'amber',
    b3: 'violet',
    h: 'rose',
    hPrime: 'cyan',
    slope: 'orange',
    hp: 'red',
    bucket: 'red',
    fb: 'red',
    fa: 'red',
    fv: 'red',
    loadFactor: 'red',
    waktuGali: 'red'
  };

  const colors = colorMap[dimensionKey] || 'blue';
  const colorClasses = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', header: 'bg-blue-50' },
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200', header: 'bg-emerald-50' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200', header: 'bg-amber-50' },
    violet: { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-200', header: 'bg-violet-50' },
    rose: { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-200', header: 'bg-rose-50' },
    cyan: { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-200', header: 'bg-cyan-50' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', header: 'bg-orange-50' },
    red: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', header: 'bg-red-50' }
  };

  const c = colorClasses[colors];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-lg mx-4 rounded-xl border-2 ${c.border} shadow-2xl overflow-hidden`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${c.border} ${c.header}`}>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">{tooltipData.title}</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/50 hover:bg-white flex items-center justify-center text-xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 bg-white">
          {/* Definition */}
          <div>
            <h4 className="text-sm font-semibold text-gray-600 mb-1">Definisi:</h4>
            <p className="text-gray-800">{tooltipData.definition}</p>
          </div>

          {/* Source */}
          {tooltipData.source && (
            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
              <h4 className="text-sm font-semibold text-indigo-800 mb-1">📚 Sumber:</h4>
              <p className="text-indigo-700 text-sm">{tooltipData.source}</p>
            </div>
          )}

          {/* Where Measured */}
          {tooltipData.whereMeasured && (
            <div className={`p-3 rounded-lg bg-${colors}-50 border border-${colors}-200`}>
              <h4 className="text-sm font-bold text-gray-800 mb-2">📍 LOKASI PENGUKURAN:</h4>
              <p className="font-medium">{tooltipData.whereMeasured}</p>
            </div>
          )}

          {/* How to Measure */}
          {tooltipData.howToMeasure && (
            <div>
              <h4 className="text-sm font-semibold text-gray-600 mb-1">Cara Mengukur:</h4>
              <p className="text-gray-700">{tooltipData.howToMeasure}</p>
            </div>
          )}

          {/* Diagram */}
          {tooltipData.diagram && (
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
              <pre className="text-xs font-mono whitespace-pre">{tooltipData.diagram}</pre>
            </div>
          )}

          {/* Values Table */}
          {tooltipData.values && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">📊 Nilai Standar:</h4>
              <div className="space-y-1">
                {Object.entries(tooltipData.values).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-gray-600">{key}:</span>
                    <span className="font-medium text-gray-800">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Formula */}
          {tooltipData.formula && (
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <h4 className="text-sm font-semibold text-yellow-800 mb-1">Rumus:</h4>
              <p className="font-mono text-yellow-900">{tooltipData.formula}</p>
            </div>
          )}

          {/* Warning */}
          {tooltipData.warning && (
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 flex items-start gap-2">
              <span className="text-xl">⚠️</span>
              <p className="text-amber-800 text-sm">{tooltipData.warning}</p>
            </div>
          )}

          {/* Default Note */}
          {tooltipData.defaultNote && (
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <p className="text-green-800 text-sm">✓ {tooltipData.defaultNote}</p>
            </div>
          )}

          {/* Note */}
          {tooltipData.note && (
            <div className="bg-gray-100 p-3 rounded-lg">
              <p className="text-gray-700 text-sm">{tooltipData.note}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-3 ${c.header} border-t ${c.border}`}>
          <p className="text-xs text-center text-gray-600">
            💡 Klik ? di setiap field untuk melihat panduan ini
          </p>
        </div>
      </div>
    </div>
  );
}