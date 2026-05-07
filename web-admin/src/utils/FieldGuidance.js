'use client';

/**
 * FieldGuidance.js
 * Tooltips dan panduan untuk setiap field di modul RAP
 *
 * Berdasarkan SE DJBK No.47 Tahun 2026 tentang AHSP Bidang Sumber Daya Air
 * Referensi Tabel: Lampiran-II-AHSP.pdf (Tabel A.10, A.11, A.12, A.13)
 * Referensi: Specifications and Application Handbook, Komatsu, Edition 28, Dec 2007
 */

// =====================
// TABEL SNI UNTUK EXCAVATOR
// =====================

/**
 * Tabel A.10 - Faktor Bucket (Fb) untuk Excavator Backhoe
 * Referensi: Lampiran-II-AHSP.pdf, Tabel A.10
 */
export const SNI_FAKTOR_BUCKET = {
  label: 'Fb - Faktor Bucket',
  description: 'Faktor efisiensi bucket berdasarkan jenis material dan kondisi tanah',
  source: 'Tabel A.10 - SE DJBK No.47 Tahun 2026',
  values: {
    'tanahLunak': {
      label: 'Tanah Lunak (Pasir, Kerikil, Tanah Lunak)',
      Fb: 1.00,
      keterangan: 'Kondisi baik - bucket terisi penuh'
    },
    'tanahBiasa': {
      label: 'Tanah Biasa (Tanah Umum, Lempung)',
      Fb: 0.90,
      keterangan: 'Kondisi sedang - sedikit agregat'
    },
    'tanahKeras': {
      label: 'Tanah Keras (Lempung Keras, Tanah Keras)',
      Fb: 0.80,
      keterangan: 'Kondisi sulit - perlu effort lebih'
    }
  },
  default: 1.0,
  note: 'Untuk galian saluran sungai, biasanya menggunakan Fb = 0.90 (Tanah Biasa)'
};

/**
 * Tabel A.11 - Waktu Siklus Standar (Standard Cycle Time) Backhoe
 * Referensi: Lampiran-II-AHSP.pdf, Tabel A.11
 */
export const SNI_WAKTU_SIKLUS = {
  label: 'T1 / Ts - Waktu Siklus',
  description: 'Waktu yang dibutuhkan untuk satu siklus penggalian (detik)',
  source: 'Tabel A.11 - SE DJBK No.47 Tahun 2026',
  units: 'detik',
  tableData: {
    '0.10-0.60': {
      tanahLunak: { '45-90': 10.8, '90-180': 14.6 },
      tanahBiasa: { '45-90': 13.0, '90-180': 17.5 },
      tanahKeras: { '45-90': 16.6, '90-180': 22.4 }
    },
    '0.60-1.25': {
      tanahLunak: { '45-90': 14.4, '90-180': 18.2 },
      tanahBiasa: { '45-90': 18.3, '90-180': 23.3 },
      tanahKeras: { '45-90': 22.3, '90-180': 28.3 }
    },
    '1.25-2.20': {
      tanahLunak: { '45-90': 16.6, '90-180': 20.4 },
      tanahBiasa: { '45-90': 21.2, '90-180': 26.1 },
      tanahKeras: { '45-90': 25.8, '90-180': 31.8 }
    }
  },
  note: 'Untuk excavator PC200 dengan bucket 0.93m³ dan swing 180°, Ts = 26.3 detik'
};

/**
 * Tabel A.12 - Faktor Konversi-Galian (Fv) untuk Alat Excavator
 * Referensi: Lampiran-II-AHSP.pdf, Tabel A.12
 */
export const SNI_FAKTOR_KONVERSI = {
  label: 'Fv - Faktor Konversi Galian',
  description: 'Faktor konversi berdasarkan kedalaman galian terhadap kapasitas maksimum',
  source: 'Tabel A.12 - SE DJBK No.47 Tahun 2026',
  values: {
    '< 40%': {
      Fv: 1.0,
      keterangan: 'Rasio lengan thd kedalaman < 40% kapasitas maks'
    },
    '40-75%': {
      Fv: 1.0,
      keterangan: 'Kondisi normal (digging and dumping normal)'
    },
    '> 75%': {
      Fv: 0.85,
      keterangan: 'Galien > 75% kapasitas, perlu effort lebih'
    }
  },
  default: 1.0,
  note: 'Untuk galian saluran normal (kedalaman sesuai spec), gunakan Fv = 1.0'
};

/**
 * Tabel A.13 - Faktor Efisiensi Kerja (FaEXC) Excavator
 * Referensi: Lampiran-II-AHSP.pdf, Tabel A.13
 */
export const SNI_FAKTOR_EFISIENSI = {
  label: 'Fa - Faktor Efisiensi Alat',
  description: 'Faktor efisiensi kerja berdasarkan kondisi kerja',
  source: 'Tabel A.13 - SE DJBK No.47 Tahun 2026',
  values: {
    'sangatBaik': { Fa: 0.90, keterangan: 'Kondisi kerja sangat baik' },
    'baik': { Fa: 0.83, keterangan: 'Kondisi kerja baik' },
    'sedang': { Fa: 0.75, keterangan: 'Kondisi kerja sedang' },
    'kurang': { Fa: 0.67, keterangan: 'Kondisi kerja kurang baik' }
  },
  default: 0.83,
  note: 'Untuk galian saluran sungai, gunakan Fa = 0.83 (kondisi baik)'
};

// =====================
// PARAMETER EXCAVATOR (SNI)
 // =====================

export const EXCAVATOR_SPECS = {
  PC50: {
    name: 'PC 50 - Mini Excavator',
    hp: 41.7,
    bucket: 0.22,
    fb: 1.0,
    fa: 0.8,
    loadFactor: 0.28,
    waktuGaliRange: [15, 25],
    t1Range: { min: 0.28, max: 0.35, standar: 0.31 }
  },
  PC75: {
    name: 'PC 75 - Standard',
    hp: 57,
    bucket: 0.31,
    fb: 1.0,
    fa: 0.8,
    loadFactor: 0.28,
    waktuGaliRange: [25, 40],
    t1Range: { min: 0.58, max: 0.72, standar: 0.65 }
  },
  PC100: {
    name: 'PC 100 - Medium',
    hp: 94,
    bucket: 0.65,
    fb: 1.0,
    fa: 0.8,
    loadFactor: 0.28,
    waktuGaliRange: [30, 50],
    t1Range: { min: 1.14, max: 1.40, standar: 1.27 }
  },
  PC200: {
    name: 'PC 200 - Standard (Contoh: Komatsu PC 200-7)',
    hp: 148,
    bucket: 0.93,
    fb: 1.0,
    fa: 0.83,
    loadFactor: 0.28,
    waktuGaliRange: [35, 45],
    t1Range: { min: 0.31, max: 0.66, standar: 0.44 },
    specReferensi: {
      operatingWeight: '20.785 Kg',
      maxKedalamanGalian: '6,37 m',
      swing: '180°'
    }
  },
  PC200LA: {
    name: 'PC 200 Long Arm',
    hp: 148,
    bucket: 0.45,
    fb: 1.0,
    fa: 0.75,
    loadFactor: 0.40,
    waktuGaliRange: [40, 60],
    t1Range: { min: 2.59, max: 3.17, standar: 2.88 }
  }
};

// =====================
// FAKTOR-FAKTOR (SNI)
 // =====================

export const FAKTOR_BUCKET = {
  label: 'Fb - Faktor Bucket',
  description: 'Faktor efisiensi bucket berdasarkan jenis material',
  values: {
    pasir: { min: 0.8, max: 1.0, keterangan: 'Pasir kering/lembab' },
    tanahBiasa: { min: 0.6, max: 0.8, keterangan: 'Tanah biasa' },
    tanahLiat: { min: 0.5, max: 0.7, keterangan: 'Tanah liat' },
    berbatu: { min: 0.4, max: 0.6, keterangan: 'Tanah bercampur batu' }
  },
  default: 1.0
};

export const FAKTOR_EFISIENSI = {
  label: 'Fa - Faktor Efisiensi Alat',
  description: 'Faktor efisiensi kerja alat',
  values: {
    baik: { value: 0.83, keterangan: 'Kondisi baik' },
    sedang: { value: 0.75, keterangan: 'Kondisi sedang' },
    kurang: { value: 0.67, keterangan: 'Kondisi kurang' }
  },
  default: 0.83
};

// =====================
// COMPONENTS
 // =====================

export function HelpPanel({ type }) {
  if (type === 'dimensi') {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200 shadow-sm">
        <h3 className="text-lg font-bold text-blue-800 mb-3 flex items-center gap-2">
          📐 Panduan Pengisian Dimensi Saluran
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-start gap-2 p-2 bg-white rounded-lg border border-blue-100">
              <span className="text-emerald-500 font-bold">b₁</span>
              <div>
                <p className="font-medium text-gray-800">Lebar Dasar</p>
                <p className="text-gray-600 text-xs">Diukur di dasar saluran (paling sempit)</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 bg-white rounded-lg border border-amber-100">
              <span className="text-amber-500 font-bold">b₂</span>
              <div>
                <p className="font-medium text-gray-800">Lebar Tengah</p>
                <p className="text-gray-600 text-xs">Auto: b₁ + 2×(slope×h)</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 bg-white rounded-lg border border-violet-100">
              <span className="text-violet-500 font-bold">b₃</span>
              <div>
                <p className="font-medium text-gray-800">Lebar Muka Tanah</p>
                <p className="text-gray-600 text-xs">Diukur di permukaan (paling lebar)</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-start gap-2 p-2 bg-white rounded-lg border border-rose-100">
              <span className="text-rose-500 font-bold">h</span>
              <div>
                <p className="font-medium text-gray-800">Kedalaman Galian</p>
                <p className="text-gray-600 text-xs">Diukur tegak lurus ke dasar</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 bg-white rounded-lg border border-orange-100">
              <span className="text-orange-500 font-bold">slope</span>
              <div>
                <p className="font-medium text-gray-800">Kemiringan Talud</p>
                <p className="text-gray-600 text-xs">1:n = setiap turun 1m, melebar n meter</p>
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs text-blue-600 mt-3 flex items-center gap-1">
          💡 Klik tombol <span className="bg-blue-100 text-blue-600 px-1 rounded">?</span> di setiap field untuk panduan lengkap
        </p>
      </div>
    );
  }

  if (type === 'analisa') {
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-200 shadow-sm">
        <h3 className="text-lg font-bold text-emerald-800 mb-3 flex items-center gap-2">
          ⚙️ Panduan Pengisian Analisa Perencanaan
        </h3>
        <div className="space-y-3 text-sm">
          <div className="bg-white p-3 rounded-lg border border-emerald-100">
            <p className="font-medium text-gray-800">📊 Faktor-Faktor (berdasarkan Tabel A.10-A.13)</p>
            <ul className="mt-2 space-y-1 text-gray-600 text-xs">
              <li>• <strong>Fb (Faktor Bucket)</strong>: 0.80-1.00 - lihat Tabel A.10</li>
              <li>• <strong>Fa (Faktor Efisiensi)</strong>: 0.67-0.90 - lihat Tabel A.13</li>
              <li>• <strong>Fv (Faktor Konversi)</strong>: 0.85-1.00 - lihat Tabel A.12</li>
              <li>• <strong>T1 (Waktu Siklus)</strong>: berdasarkan bucket & swing - lihat Tabel A.11</li>
            </ul>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <p className="text-yellow-800 text-xs">
              ⚠️ Gunakan nilai sesuai kondisi lapangan dan standar SNI DJBK 2026
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export function FieldWarning({ value, fieldKey, type }) {
  if (!value) return null;

  const warnings = {
    h: value > 5 && (
      <div className="mt-1 flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
        ⚠️ Kedalaman {'>'} 5m - perlu pertimbangan khusus
      </div>
    ),
    slope: (value < 0.5 || value > 3) && (
      <div className="mt-1 flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
        ⚠️ Slope di luar range normal (0.5 - 3.0)
      </div>
    )
  };

  return warnings[fieldKey] || null;
}

export function InfoBox({ title, children, color = 'blue' }) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    red: 'bg-red-50 border-red-200 text-red-800'
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]} mb-4`}>
      {title && <h4 className="font-bold mb-2">{title}</h4>}
      {children}
    </div>
  );
}

export function RangeIndicator({ value, min, max, standar }) {
  const inRange = value >= min && value <= max;
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>Min: {min}</span>
        <span>Standar: {standar}</span>
        <span>Max: {max}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${inRange ? 'bg-green-500' : 'bg-red-500'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {inRange ? (
        <p className="text-xs text-green-600 mt-1">✓ Dalam range normal</p>
      ) : (
        <p className="text-xs text-red-600 mt-1">⚠️ Di luar range normal</p>
      )}
    </div>
  );
}

// =====================
// DIMENSI GEOMETRI
 // =====================

export const DIMENSI_GUIDANCE = {
  panjang: {
    label: 'Panjang Total',
    description: 'Panjang total saluran/sungai yang akan digali',
    unit: 'meter (m)',
    tip: 'Total panjang dari Sta 0+000 sampai Sta akhir'
  },

  b1: {
    label: 'b₁ - Lebar Dasar',
    shortLabel: 'Lebar Dasar',
    description: 'Lebar dasar saluran di bagian paling bawah (paling sempit)',
    whereMeasured: 'Diukur di DASAR saluran (bottom)',
    howToMeasure: 'Letakkan pita ukur di dasar saluran, ukur lebar bagian bawah',
    unit: 'meter (m)',
    formula: 'b₁ + 2×(slope×h) = b₃'
  },

  b2: {
    label: 'b₂ - Lebar Tengah',
    shortLabel: 'Lebar Tengah',
    description: 'Lebar saluran pada level muka air eksisting',
    whereMeasured: 'Diukur pada level MUKA AIR lama (h\')',
    howToMeasure: 'Ambil pita ukur pada level muka air eksisting',
    unit: 'meter (m)',
    formula: 'b₂ = b₁ + 2×(slope×h)'
  },

  b3: {
    label: 'b₃ - Lebar Muka Tanah',
    shortLabel: 'Lebar Muka Tanah',
    description: 'Lebar permukaan tanah di bagian paling atas (paling lebar)',
    whereMeasured: 'Diukur di PERMUKAAN tanah (top)',
    howToMeasure: 'Ambil pita ukur, letakkan di permukaan tanah',
    unit: 'meter (m)',
    formula: 'b₃ = b₁ + 2×(slope×h)'
  },

  h: {
    label: 'h - Kedalaman Galian',
    shortLabel: 'Kedalaman Galian',
    description: 'Kedalaman galian dari muka tanah ke dasar saluran',
    whereMeasured: 'Diukur TEGAK LURUS dari muka tanah ke dasar',
    howToMeasure: 'Gunakan tongkat ukur, tegakkan dari permukaan ke dasar',
    unit: 'meter (m)'
  },

  hPrime: {
    label: "h' - Tinggi Air Eksisting",
    shortLabel: 'Tinggi Air Eksisting',
    description: 'Kedalaman air pada kondisi eksisting/sebelum galian',
    whereMeasured: 'Diukur dari dasar ke permukaan air',
    howToMeasure: 'Rendam tongkat ukur ke air, catat kedalaman',
    unit: 'meter (m)'
  },

  slope: {
    label: 'Slope (Kemiringan Talud)',
    shortLabel: 'Kemiringan',
    description: 'Kemiringan dinding saluran (1 bagian vertikal : n bagian horizontal)',
    whereMeasured: 'Diukur pada DINDING saluran (talud)',
    howToMeasure: '1:m = setiap turun 1m, melebar m meter',
    unit: '1 : n',
    values: {
      0.5: 'Sangat Curam - untuk area terbatas',
      1.0: 'Standar - untuk normalisasi sungai',
      1.5: 'Sedang - untuk tanah biasa',
      2.0: 'Landai - untuk tanah labil/becak'
    },
    default: 1.0,
    note: 'Slope menentukan berapa lebar tambahan per 1 meter kedalaman'
  }
};