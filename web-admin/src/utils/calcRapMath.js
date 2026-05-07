'use client';

/**
 * calcRapMath.js
 * Core Engine untuk Modul Perhitungan RAP
 *
 * Implementasi sesuai WORKFLOW_GUIDE.md dan FINAL_IMPLEMENTATION_PLAN.md
 * Goal: Sisa BBM = 40-100 liter, bukan 0
 */

// =====================
// SNI REFERENCE TABLES
// =====================

/**
 * Tabel Waktu Siklus SNI untuk validasi hasil GoalSeek
 * Format: { min, max, standar, keterangan }
 *
 * Referensi: Tabel standar SNI untuk excavator
 * - Jika T.1 < min: Equipment terlalu efisien (perlu verifikasi)
 * - Jika T.1 > max: Ada waktu non-produktif
 */
export const SNI_WAKTU_SIKLUS = {
  'PC50': {
    min: 0.28,
    max: 0.35,
    standar: 0.3108,
    keterangan: 'PC 50 - Mini Excavator'
  },
  'PC75': {
    min: 0.58,
    max: 0.72,
    standar: 0.6454,
    keterangan: 'PC 75 - Standard'
  },
  'PC100': {
    min: 1.14,
    max: 1.40,
    standar: 1.2727,
    keterangan: 'PC 100 - Medium'
  },
  'PC200': {
    min: 0.31,
    max: 0.66,
    standar: 0.6594,
    keterangan: 'PC 200 - Standard'
  },
  'PC200LA': {
    min: 2.59,
    max: 3.17,
    standar: 2.8763,
    keterangan: 'PC 200 Long Arm'
  }
};

/**
 * Load Factor berdasarkan jenis excavator
 */
export const LOAD_FACTOR = {
  'PC50': 0.28,
  'PC75': 0.28,
  'PC100': 0.28,
  'PC200': 0.28,
  'PC200LA': 0.40  // Long Arm lebih boros
};

/**
 * Master Excavator Specifications (SESUAI EXCEL MASTER)
 */
export const MASTER_EXCAVATOR_SPECS = {
  'PC50': {
    name: 'Excavator PC 50',
    hp: 41.7,
    bucket: 0.22,
    fb: 1.0,    // Faktor Bucket
    fa: 0.8,    // Efisiensi Alat
    loadFactor: 0.28
  },
  'PC75': {
    name: 'Excavator PC 75',
    hp: 57,
    bucket: 0.31,
    fb: 1.0,
    fa: 0.8,
    loadFactor: 0.28
  },
  'PC100': {
    name: 'Excavator PC 100',
    hp: 94,
    bucket: 0.65,
    fb: 1.0,
    fa: 0.8,
    loadFactor: 0.28
  },
  'PC200': {
    name: 'Excavator PC 200',
    hp: 148,    // BENAR, bukan 138
    bucket: 0.9,
    fb: 1.0,
    fa: 0.7,   // BENAR
    loadFactor: 0.28
  },
  'PC200LA': {
    name: 'Excavator PC 200 Long Arm',
    hp: 148,
    bucket: 0.46,
    fb: 1.0,
    fa: 0.75,
    loadFactor: 0.40   // Load Factor lebih tinggi untuk Long Arm
  }
};

/**
 * Tabel SNI untuk Bucket Factor (Fb)
 */
export const SNI_BUCKET_FACTOR = {
  pasir: { min: 0.8, max: 1.0, difficulty: 'Mudah' },
  tanahBiasa: { min: 0.6, max: 0.8, difficulty: 'Sedang' },
  berbatu: { min: 0.5, max: 0.6, difficulty: 'Agak Sulit' },
  batu: { min: 0.4, max: 0.5, difficulty: 'Sulit' }
};

/**
 * Tabel SNI untuk Efisiensi Alat (Fa)
 */
export const SNI_EFFICIENCY_FACTOR = {
  baikSekali: [0.83, 0.81, 0.76],
  baik: [0.78, 0.75, 0.71],
  sedang: [0.72, 0.69, 0.65]
};

// =====================
// CALCULATION FUNCTIONS
// =====================

/**
 * Hitung Kapasitas Produksi per Jam (Q1)
 * Rumus: Q1 = (V × Fb × Fa × 60) / (T.1 × Fv × Fk)
 */
export function calculateQ1(v, fb, fa, t1, fv, fk) {
  if (t1 === 0) return 0;
  return (v * fb * fa * 60) / (t1 * fv * fk);
}

/**
 * Hitung Kapasitas Produksi per Hari (Q2)
 * Rumus: Q2 = Q1 × Tk
 */
export function calculateQ2(q1, tk = 8) {
  return q1 * tk;
}

/**
 * Hitung kW dari HP
 * Rumus: kW = HP × 0.7457
 */
export function calculateKW(hp) {
  return hp * 0.7457;
}

/**
 * Hitung Konsumsi BBM per Jam (H)
 * Rumus: H = Fd × Fe × LoadFactor × kW
 * - Fd = Faktor Daya = waktu_gali / (T.1 × 60)
 * - Fe = Faktor Efisiensi = 45 / 60 = 0.75 (45 menit efektif dari 60)
 */
export function calculateBBMConsumption(hp, loadFactor, waktuGali, t1, feMenit = 45, lKwh = 0.28) {
  const kW = calculateKW(hp);
  const Fe = feMenit / 60;
  const Fd = t1 > 0 ? (waktuGali / (t1 * 60)) : 0.9;
  // Rumus BBM = Fd * Fe * kW * L/kWh (Berdasarkan gambar)
  const H = Fd * Fe * kW * lKwh;
  return H;
}

/**
 * Hitung Konsumsi BBM per Jam (Fuel per Hour)
 * Digunakan untuk laporan Hourmeter
 * Rumus: L/jam = HP × LoadFactor × Specific Fuel Consumption
 */
export function calculateFuelPerHour(hp, loadFactor, specificFuelConsumption = 0.22) {
  return hp * loadFactor * specificFuelConsumption;
}

/**
 * Hitung semua parameter analisa perencanaan
 */
export function calculateAnalisaRencana(volumeTarget, params) {
  const {
    hp = 148,
    bucket = 0.9,
    fb = 1.0,
    fa = 0.7,
    fv = 0.8,
    fk = 0.8,
    loadFactor = 0.28,
    feMenit = 45,
    waktuGali = 38,
    tk = 8
  } = params;

  // Hitung T.1 (Waktu Siklus) dari GoalSeek
  // Target: Q1 = Volume / (tk × estimasiHari)
  // Q1 = Volume / (tk × estimasiHari)
  // T.1 = (bucket × fb × fa × 60) / (Q1 × fv × fk)

  // Untuk initial calculation, gunakan T.1 standar
  const t1Standar = SNI_WAKTU_SIKLUS['PC200'].standar;

  // Hitung Q1
  const q1 = calculateQ1(bucket, fb, fa, t1Standar, fv, fk);

  // Hitung Q2
  const q2 = calculateQ2(q1, tk);

  // Hitung estimasi hari
  const estimasiHari = Math.ceil(volumeTarget / q2);

  // Hitung kW
  const kW = calculateKW(hp);

  // Hitung Fe
  const Fe = feMenit / 60;

  // Hitung Fd
  const Fd = waktuGali / (t1Standar * 60);

  // Hitung H (BBM per jam)
  const H = Fd * Fe * loadFactor * kW;

  // Hitung h2 (BBM per hari)
  const h2 = H * tk;

  // Hitung koefisien BBM
  const koefBBM = H / q1;

  // Hitung total solar
  const totalSolar = volumeTarget * koefBBM;

  return {
    tk,
    fk,
    hp,
    bucket,
    fb,
    fa,
    fv,
    loadFactor,
    feMenit,
    waktuGali,
    t1: t1Standar,
    fd: Fd,
    kW,
    fe: Fe,
    q1,
    q2,
    H,
    h2,
    koefBBM,
    estimasiHari,
    totalSolar,
    volumeTarget
  };
}

/**
 * calculateAnalisaWithGoalSeek
 * Wrapper around goalSeekBisectionPerencanaan that returns the same
 * shape as calculateAnalisaRencana, plus GoalSeek metadata.
 *
 * For planning mode: uses targetSisaIdeal = 70L, range 40-100L.
 * Requires totalBBM (total budgeted fuel in liters).
 *
 * Falls back to calculateAnalisaRencana if totalBBM is not provided
 * or if GoalSeek fails to converge.
 */
export function calculateAnalisaWithGoalSeek(volumeTarget, params) {
  const { totalBBM, ...rest } = params;
  if (!totalBBM || totalBBM <= 0) return calculateAnalisaRencana(volumeTarget, rest);
  try {
    const gs = goalSeekBisectionPerencanaan({
      volume: volumeTarget, totalBBM,
      hp: rest.hp, bucket: rest.bucket, fb: rest.fb, fa: rest.fa,
      fv: rest.fv, fk: rest.fk, loadFactor: rest.loadFactor,
      waktuGali: rest.waktuGali, feMenit: rest.feMenit || 48,
      tk: rest.tk || 7, targetSisaMin: 40, targetSisaMax: 150
    });
    return {
      tk: rest.tk||7, fk: rest.fk||0.8, hp: rest.hp||148,
      bucket: rest.bucket||0.9, fb: rest.fb||1.0, fa: rest.fa||0.7,
      fv: rest.fv||0.8, loadFactor: rest.loadFactor||0.28,
      feMenit: rest.feMenit||48, waktuGali: rest.waktuGali||38,
      t1: gs.t1, fd: gs.fd, kW: gs.kW, fe: gs.fe,
      q1: gs.q1, q2: gs.q2, H: gs.h, h2: gs.h2,
      koefBBM: gs.koefBBM, estimasiHari: gs.estimasiHari,
      totalSolar: gs.totalSolarUsed, volumeTarget,
      volRealisasi: gs.volRealisasi, volSurplus: gs.volSurplus,
      sisaAkhir: gs.sisaAkhir, converged: gs.converged,
      dalamRangeSNI: gs.dalamRangeSNI, goalseekStatus: gs.status,
      t1_detik: gs.t1_detik, targetSisaIdeal: gs.targetSisaIdeal,
      inRange: gs.inRange
    };
  } catch (err) { return calculateAnalisaRencana(volumeTarget, rest); }
}

// =====================
// GOALSEEK FUNCTIONS
// =====================

/**
 * GoalSeek untuk TAB 3: Kebutuhan Realisasi
 *
 * Target:
 * 1. Sisa BBM akhir = 40-100 liter (ideal: 70 liter)
 * 2. Total Galian ≈ Target Volume (±5%)
 * 3. Sisa BBM TIDAK boleh minus
 */
export function goalSeekSisaBBM(input, params) {
  const { totalBBMditerima, totalJamKerja, targetVolume, targetSisaIdeal = 70 } = input;
  const { hp, bucket, fb, fa, fv, fk, loadFactor, feMenit, waktuGali } = params;

  // STEP 1: Target BBM terpakai
  const bbmTerpakaiTarget = totalBBMditerima - targetSisaIdeal;

  // STEP 2: H (BBM/Jam) yang dibutuhkan
  const H = bbmTerpakaiTarget / totalJamKerja;

  // STEP 3: kW dan Fe
  const kW = calculateKW(hp);
  const Fe = feMenit / 60;

  // STEP 4: Fd dari H
  // H = Fd × Fe × LoadFactor × kW
  // Fd = H / (Fe × LoadFactor × kW)
  const Fd = H / (Fe * loadFactor * kW);

  // STEP 5: T.1 dari Fd
  // Fd = waktuGali / (T.1 × 60)
  // T.1 = waktuGali / (Fd × 60)
  const t1 = waktuGali / (Fd * 60);

  // STEP 6: Q1 dari T.1
  const q1 = calculateQ1(bucket, fb, fa, t1, fv, fk);

  // STEP 7: Hitung Total Galian dengan Q1 hasil GoalSeek
  const totalGalian = q1 * totalJamKerja;

  // STEP 8: Validasi deviasi
  const deviasi = Math.abs((totalGalian - targetVolume) / targetVolume * 100);

  // STEP 9: Jika deviasi > 5%, adjust
  if (deviasi > 5) {
    // Adjust: cari H yang membuat volume cocok
    const q1Target = targetVolume / totalJamKerja;

    // Q1 = (V × Fb × Fa × 60) / (T.1 × Fv × Fk)
    // T.1 = (V × Fb × Fa × 60) / (Q1 × Fv × Fk)
    const t1ForVolume = (bucket * fb * fa * 60) / (q1Target * fv * fk);

    // Fd = waktuGali / (T.1 × 60)
    const fdForVolume = waktuGali / (t1ForVolume * 60);

    // H = Fd × Fe × LoadFactor × kW
    const hForVolume = fdForVolume * Fe * loadFactor * kW;

    // Sisa = Diterima - (H × Total Jam)
    const sisaAkhir = totalBBMditerima - (hForVolume * totalJamKerja);

    return {
      success: sisaAkhir >= 40 && sisaAkhir <= 100,
      h: hForVolume,
      q1: q1Target,
      t1: t1ForVolume,
      fd: fdForVolume,
      totalGalian: targetVolume,
      totalBBMterpakai: hForVolume * totalJamKerja,
      sisaAkhir,
      targetSisa: targetSisaIdeal,
      adjustReason: 'Volume deviation > 5%, adjusted to match volume'
    };
  }

  return {
    success: true,
    h: H,
    q1,
    t1,
    fd: Fd,
    totalGalian,
    totalBBMterpakai: H * totalJamKerja,
    sisaAkhir: targetSisaIdeal,
    targetSisa: targetSisaIdeal,
    adjustReason: null
  };
}

/**
 * GoalSeek untuk TAB 4: Verifikasi T.1
 *
 * Input: H dari TAB 3 (yang sudah di-GoalSeek)
 * Output: T.1 yang menghasilkan H tersebut + validasi SNI
 */
export function goalSeekT1Verifikasi(hDariTab3, params, selectedAlat = 'PC200') {
  const { hp, feMenit, waktuGali } = params;

  const kW = calculateKW(hp);
  const Fe = feMenit / 60;
  const LoadFactor = LOAD_FACTOR[selectedAlat] || 0.28;

  // Fd = H / (Fe × LoadFactor × kW)
  const Fd = hDariTab3 / (Fe * LoadFactor * kW);

  // T.1 = waktuGali / (Fd × 60)
  const t1 = waktuGali / (Fd * 60);

  // Validasi terhadap standar SNI
  const sniRange = SNI_WAKTU_SIKLUS[selectedAlat] || SNI_WAKTU_SIKLUS['PC200'];

  const dalamRange = t1 >= sniRange.min && t1 <= sniRange.max;

  let status, warning;
  if (t1 < sniRange.min) {
    status = 'TERLALU_CEPAT';
    warning = '⚠️ T.1 lebih cepat dari standar. Equipment sangat efisien atau data perlu diverifikasi.';
  } else if (t1 > sniRange.max) {
    status = 'TERLALU_LAMBAT';
    warning = '⚠️ T.1 lebih lambat dari standar. Ada waktu non-produktif (istirahat, maintenance, dll).';
  } else {
    status = 'WAJAR';
    warning = null;
  }

  return {
    t1,
    fd: Fd,
    h: hDariTab3,
    kW,
    dalamRange,
    status,
    warning,
    sniMin: sniRange.min,
    sniMax: sniRange.max,
    sniStandar: sniRange.standar
  };
}

// =====================
// STA GENERATION FUNCTIONS
// =====================

/**
 * Generate STA untuk Perencanaan
 * Input: parameter geometri
 * Output: array of 5 STA dengan variasi ±5%
 */
export function generateSTAPerencanaan(params) {
  const {
    panjang = 500,
    b1 = 4.0,
    b2 = 2.857,
    b3 = 6.857,
    h = 1.0,
    hPrime = 2.5,
    slope = 1,
    lebarStripping = 3.0,
    kedalamanStripping = 0.1
  } = params;

  const nSTA = 5;
  const interval = panjang / (nSTA - 1); // 500/4 = 125m antar STA

  let stas = [];
  let cumulative = 0;

  // Generate STA dengan variasi
  for (let i = 0; i < nSTA; i++) {
    // Variasi ±5% menggunakan sinus
    const variansi = 1 + (Math.sin(i * 13) * 0.05);

    const curB1 = b1 * variansi;
    const curHPrime = hPrime * variansi;
    const curH = h * variansi;
    // b2 dan b3 dihitung ulang berdasarkan slope
    const curB2 = Math.max(curB1 - 2 * (slope * curH), 0.1);
    const curB3 = curB1 + 2 * (slope * curH);

    // Luasan galian trapezoid: ((b1 + b_top_galian) / 2) * hPrime
    // b_top_galian = b1 + 2 * slope * hPrime
    // Maka luas = (b1 + slope * hPrime) * hPrime
    const luas = (curB1 + slope * curHPrime) * curHPrime;

    stas.push({
      sta: `0+${String(Math.round(cumulative)).padStart(3, '0')}`,
      b1: curB1,
      b2: curB2,
      b3: curB3,
      h: curH,
      hPrime: curHPrime,
      luas,
      isSTA0: i === 0,
      index: i
    });

    cumulative += interval;
  }

  // Hitung volume antar STA (average end area method)
  // STA pertama: jarak=0, volume=0 (titik awal)
  // STA ke-2 dst: jarak=interval, volume dihitung dari rata-rata luas × jarak
  let totalVolume = 0;
  stas[0].jarak = 0;
  stas[0].volume = 0;
  for (let i = 1; i < nSTA; i++) {
    stas[i].jarak = interval;
    const vol = ((stas[i-1].luas + stas[i].luas) / 2) * interval;
    stas[i].volume = vol;
    totalVolume += vol;
  }

  // Hitung stripping
  const totalStripping = (lebarStripping * kedalamanStripping * panjang);

  return { stas, totalVolume, totalStripping };
}

/**
 * Generate STA untuk Pelaksanaan
 * Constraint: STA 0 = STA 0 TAB 1, Total = targetVolume
 */
export function generateSTAPelaksanaan(geometriStas, rencanaTotalVolume) {
  const stasInput = typeof geometriStas === 'number' ? arguments[2] : geometriStas;
  // Pelaksanaan volume = perencanaan + 2~5 m³ (deterministic)
  const baseVol = typeof geometriStas === 'number' ? geometriStas : (rencanaTotalVolume || 0);
  const addVol = 2 + (Math.sin(baseVol * 7) * 0.5 + 0.5) * 3; // 2-5 m³
  const targetVolume = +(baseVol + addVol).toFixed(2);

  if (!stasInput || stasInput.length === 0) {
    return { stas: [], totalVolume: 0 };
  }

  const nSTA = stasInput.length || 5;

  // Build pelaksanaan STAs with ±2% variation from perencanaan dimensions
  let stas = stasInput.map((ref, i) => {
    const seed = Math.sin(i * 31 + 7) * 0.5 + 0.5;
    const dimVar = 0.98 + seed * 0.04;

    const b1 = +(ref.b1 * dimVar).toFixed(3);
    const h = +(ref.h * dimVar).toFixed(3);
    const slope = 1;
    const b3 = +(b1 + 2 * slope * h).toFixed(3);
    const hPrime = ref.hPrime || ref.h;
    const luas = +( ((b1 + b3) / 2) * h ).toFixed(4);

    return {
      sta: ref.sta,
      b1, b2: Math.max(b1 - 2 * slope * h, 0.1), b3, h, hPrime, luas,
      jarak: i === 0 ? 0 : (ref.jarak || 0),
      volume: 0,
      isSTA0: i === 0,
      index: i
    };
  });

  // Calculate raw volumes
  stas[0].volume = 0;
  for (let i = 1; i < stas.length; i++) {
    stas[i].volume = +( ((stas[i-1].luas + stas[i].luas) / 2) * stas[i].jarak ).toFixed(2);
  }

  // Normalize so total = targetVolume
  const rawTotal = stas.reduce((sum, s) => sum + s.volume, 0);
  if (rawTotal > 0 && targetVolume > 0) {
    const factor = targetVolume / rawTotal;
    stas.forEach((s, i) => {
      if (i > 0) s.volume = +(s.volume * factor).toFixed(2);
    });
  }

  return { stas, totalVolume: targetVolume };
}

// =====================
// CROSS SECTION DATA GENERATION
// =====================

/**
 * Generate koordinat untuk garis eksisting (meliuk-liuk natural)
 */
export function generateKonturEksisting(sta, numPoints = 15) {
  const { b3, hPrime } = sta;
  const points = [];

  for (let i = 0; i < numPoints; i++) {
    const x = (i / (numPoints - 1)) * b3;
    // Add slight undulation (±10% dari tinggi)
    const undulation = Math.sin(i * 1.5) * 0.1 * hPrime;
    const y = hPrime + undulation;

    points.push({ x, y });
  }

  return points;
}

/**
 * Generate koordinat untuk garis rencana (trapesium)
 */
export function generateKonturRencana(sta) {
  const { b1, b2, b3, h, hPrime, slope } = sta;

  // Koordinat trapesium (searah jarum jam dari kiri atas)
  return [
    { x: 0, y: hPrime },                        // Kiri atas
    { x: b3, y: hPrime },                       // Kanan atas
    { x: b1 + (slope * h), y: hPrime - h },    // Kanan bawah
    { x: -(slope * h), y: hPrime - h }         // Kiri bawah
  ];
}

/**
 * Generate path string SVG untuk kontur eksisting (smooth curve)
 */
export function generateEksistingPath(konturEksisting) {
  if (!konturEksisting || konturEksisting.length < 2) return '';

  // Create smooth curve menggunakan quadratic bezier
  let path = `M ${konturEksisting[0].x} ${konturEksisting[0].y}`;

  for (let i = 1; i < konturEksisting.length - 1; i++) {
    const midX = (konturEksisting[i].x + konturEksisting[i + 1].x) / 2;
    const midY = (konturEksisting[i].y + konturEksisting[i + 1].y) / 2;
    path += ` Q ${konturEksisting[i].x} ${konturEksisting[i].y} ${midX} ${midY}`;
  }

  // Last segment
  const last = konturEksisting[konturEksisting.length - 1];
  path += ` L ${last.x} ${last.y}`;

  return path;
}

/**
 * Generate path string SVG untuk kontur rencana (trapesium)
 */
export function generateRencanaPath(konturRencana) {
  return konturRencana.map((p, i) =>
    i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
  ).join(' ') + ' Z';
}

// =====================
// EXPORT FORMAT HELPERS
// =====================

/**
 * Format angka untuk Excel
 */
export function formatExcelNumber(num, decimals = 3) {
  return Number(num.toFixed(decimals));
}

/**
 * Generate data untuk sheet ANALISA perencanaan
 */
export function generateAnalisaPerencanaanSheet(rapState) {
  const { geometri, analisaRencana } = rapState;

  const data = [];

  // Header
  data.push(["ANALISA HARGA SATUAN"]);
  data.push(["PEKERJAAN: " + (geometri.kopData?.pekerjaan || '-')]);
  data.push(["LOKASI: " + (geometri.kopData?.lokasi || '-')]);
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
  data.push([1, "Tenaga", "Pw", analisaRencana.hp || 148, "HP"]);
  data.push([2, "Kapasitas Bucket", "V (Cp)", analisaRencana.bucket || 0.9, "m3"]);
  data.push([3, "Jam Operasi per Tahun", "w", 2000, "Jam"]);
  data.push([4, "Faktor Bucket", "Fb", analisaRencana.fb || 1.0, "-"]);
  data.push([5, "Faktor Efisiensi Alat", "Fa", analisaRencana.fa || 0.7, "-"]);
  data.push([6, "Faktor Konversi Galian", "Fv", analisaRencana.fv || 0.8, "-"]);
  data.push([7, "Waktu Siklus", "T.1", formatExcelNumber(analisaRencana.t1), "menit", "CELL KUNING"]);
  data.push([8, "Kap. Produksi/Jam", "Q1", formatExcelNumber(analisaRencana.q1), "m3/jam"]);
  data.push([9, "Kap. Produksi/Hari", "Q.2", formatExcelNumber(analisaRencana.q2), "m3/hari"]);
  data.push([]);

  // Bagian IV: Biaya Operasi
  data.push(["IV. BIAYA OPERASI/JAM"]);
  data.push(["kW", "=", analisaRencana.hp || 148, "x 0.7457", "=", formatExcelNumber(analisaRencana.kW)]);
  data.push(["Load Factor", "L/kWh", analisaRencana.loadFactor || 0.28]);
  data.push(["Fe", "=", 45, "/ 60", "=", formatExcelNumber(analisaRencana.fe || 0.75)]);
  data.push(["Fd", "=", analisaRencana.waktuGali || 38, "/ (T.1 x 60)", "=", formatExcelNumber(analisaRencana.fd)]);
  data.push(["H", "=", "Fd x Fe x L/kWh x kW", "=", formatExcelNumber(analisaRencana.H), "Liter/jam"]);
  data.push(["h2", "=", "H x 8", "=", formatExcelNumber(analisaRencana.h2), "Liter/hari"]);
  data.push([]);

  // Bagian V: Estimasi
  data.push(["V. ESTIMASI PEKERJAAN"]);
  data.push(["Volume", "V", formatExcelNumber(geometri.totalVolume), "m3"]);
  data.push(["Estimasi Waktu", "T.pek", Math.ceil(analisaRencana.estimasiHari), "Hari"]);
  data.push(["Total Kebutuhan Solar", "Ks", formatExcelNumber(analisaRencana.totalSolar), "Liter"]);

  return data;
}

/**
 * Generate data untuk sheet backup volume rencana
 */
export function generateBackupVolumeRencanaSheet(rapState) {
  const { geometri } = rapState;
  const data = [];

  data.push(["BACKUP VOLUME RENCANA"]);
  data.push([]);
  data.push(["STA", "b1(m)", "b2(m)", "b3(m)", "h(m)", "h'(m)", "Luas(m2)", "Volume(m3)"]);

  geometri.stas.forEach(sta => {
    data.push([
      sta.sta,
      formatExcelNumber(sta.b1),
      formatExcelNumber(sta.b2),
      formatExcelNumber(sta.b3),
      formatExcelNumber(sta.h),
      formatExcelNumber(sta.hPrime),
      formatExcelNumber(sta.luas),
      formatExcelNumber(sta.volume || 0)
    ]);
  });

  data.push([]);
  data.push(["TOTAL", "", "", "", "", "", "", formatExcelNumber(geometri.totalVolume)]);

  return data;
}

/**
 * Generate data untuk sheet Kebutuhan Realisasi
 */
export function generateKebutuhanRealisasiSheet(rapState) {
  const { kebutuhanRealisasi, geometri, analisaRencana } = rapState;
  const data = [];

  // Header
  data.push(["RINCIAN KEBUTUHAN DAN HASIL PELAKSANAAN"]);
  data.push(["SUB KEGIATAN:", geometri.kopData?.program || '-']);
  data.push(["PEKERJAAN:", geometri.kopData?.pekerjaan || '-']);
  data.push(["LOKASI:", geometri.kopData?.lokasi || '-']);
  data.push([]);

  // Tabel Header
  data.push(["No", "Tgl", "Bln", "Thn", "Jam Kerja", "Galian/Jam", "Galian/Hari", "BBM/Jam", "BBM/Hari", "Diterima", "Sisa"]);

  // Data Rows
  let totalGalian = 0;
  let totalBBM = 0;
  let totalDiterima = 0;

  kebutuhanRealisasi.dailyData?.forEach((d, i) => {
    const tgl = new Date(d.tanggal);
    data.push([
      i + 1,
      tgl.getDate(),
      tgl.toLocaleString('id-ID', { month: 'long' }),
      tgl.getFullYear(),
      formatExcelNumber(d.jam, 1),
      formatExcelNumber(d.q1 || analisaRencana.q1),
      formatExcelNumber(d.galian || 0),
      formatExcelNumber(analisaRencana.H),
      formatExcelNumber(d.bbmHarian || 0),
      d.diterima || '',
      formatExcelNumber(d.sisa || 0)
    ]);
    totalGalian += d.galian || 0;
    totalBBM += d.bbmHarian || 0;
    totalDiterima += d.diterima || 0;
  });

  // Total Row
  data.push(["TOTAL", "", "", "", "", "", formatExcelNumber(totalGalian), "", formatExcelNumber(totalBBM), totalDiterima, formatExcelNumber(kebutuhanRealisasi.sisaAkhir || 0)]);

  return data;
}

// =====================
// GOALSEEK BISECTION — CORE ENGINE
// =====================

/**
 * Proper Bisection GoalSeek for T.1 (Perencanaan)
 *
 * Problem: Given volume, excavator specs, totalBBM, find T.1 such that:
 *   Sisa BBM = totalBBM - totalSolarUsed(T.1)  →  40L ≤ Sisa ≤ 100L
 *
 * Bisection: Find T.1 in range [T_low, T_high] where f(T.1) = 0
 *   f(T.1) = totalSolarUsed(T.1) - (totalBBM - targetSisa)
 *
 * Constraints per SNI Tabel A.11:
 *   - Tanah Lunak (bucket 0.6-1.25): T.1 ≈ 14.4–31.8 detik
 *   - Tanah Sedang: T.1 ≈ 0.40–0.80 menit
 *   - Tanah Keras (bucket 1.25-2.20, swing 180°): T.1 ≈ 0.45–0.85 menit
 */
export function goalSeekBisectionPerencanaan(params) {
  const {
    volume, totalBBM, targetSisaMin=40, targetSisaMax=150, targetSisaIdeal=90,
    hp=148, bucket=0.9, fb=1.0, fa=0.7, fv=0.8, fk=0.8,
    loadFactor=0.28, waktuGali=38, feMenit=48, tk=7,
    volSurplusMin=1.00, volSurplusMax=5.00
  } = params;
  const kW = hp * 0.7457;
  const FeRaw = (feMenit||48) / 60;
  const Fe = Math.min(1.0, Math.max(0.3, +FeRaw.toFixed(3)));
  const calcQ1 = t1 => t1<=0 ? Infinity : (bucket*fb*fa*60)/(t1*fv*fk);
  const calcFd = t1 => { const s=t1*60; const raw=s<=0?1:(waktuGali/s)+((s-waktuGali)/s)*0.7; return Math.min(1.0, Math.max(0.3, +raw.toFixed(3))); };
  const calcH = t1 => calcFd(t1)*Fe*kW*loadFactor;
  const T_low=0.10, T_high=0.80, step=(T_high-T_low)/2000;
  let bestT1=0.31, bestScore=Infinity, converged=false;
  for(let t1=T_low;t1<=T_high;t1+=step){
    const q1=calcQ1(t1), q2=q1*tk, estH=Math.ceil(volume/q2);
    const vr=q1*estH*tk, surplus=vr-volume;
    const h=calcH(t1), solar=h*estH*tk, sisa=totalBBM-solar;
    const sOK=surplus>=volSurplusMin&&surplus<=volSurplusMax;
    const bOK=sisa>=targetSisaMin&&sisa<=targetSisaMax;
    if(sOK&&bOK){
      const sc=Math.abs(surplus-(volSurplusMin+volSurplusMax)/2);
      if(sc<bestScore){bestScore=sc;bestT1=t1;converged=true;}
    } else if(!converged){
      const sp=surplus<volSurplusMin?(volSurplusMin-surplus)*10:surplus>volSurplusMax?(surplus-volSurplusMax)*10:0;
      const bp=sisa<targetSisaMin?(targetSisaMin-sisa)*5:sisa>targetSisaMax?(sisa-targetSisaMax)*2:0;
      const sc=Math.abs(surplus-(volSurplusMin+volSurplusMax)/2)+sp+bp;
      if(sc<bestScore){bestScore=sc;bestT1=t1;}
    }
  }
  const Q1r=calcQ1(bestT1),Q2r=Q1r*tk,estHari=Math.ceil(volume/Q2r);
  const Fdr=calcFd(bestT1),Hr=calcH(bestT1),h2r=Hr*tk;
  const koefBBM=Hr/Q1r,totalSolarUsed=Hr*estHari*tk;
  const sisaAkhir=totalBBM-totalSolarUsed,volReal=Q1r*estHari*tk;
  return {
    t1:+bestT1.toFixed(4), t1_detik:+(bestT1*60).toFixed(2),
    q1:+Q1r.toFixed(2), q2:+Q2r.toFixed(2), estimasiHari,
    h:+Hr.toFixed(4), h2:+h2r.toFixed(2),
    totalSolarUsed:+totalSolarUsed.toFixed(2),
    sisaAkhir:+sisaAkhir.toFixed(2), koefBBM:+koefBBM.toFixed(6),
    fd:+Fdr.toFixed(3), fe:+(Fe).toFixed(3), kW:+kW.toFixed(2),
    volRealisasi:+volReal.toFixed(2), volSurplus:+(volReal-volume).toFixed(2),
    converged, inRange:sisaAkhir>=targetSisaMin&&sisaAkhir<=targetSisaMax,
    status:converged?'OPTIMAL':'BEST_EFFORT',
    targetSisaIdeal, targetSisaMin, targetSisaMax,
    dalamRangeSNI:bestT1>=(14.4/60)&&bestT1<=(31.8/60),
    sniRange:{min:14.4,max:31.8}
  };
}

/**
 * GoalSeek Bisection untuk Fd (Pelaksanaan)
 *
 * Find optimal number of days (Fd) such that:
 *   Sisa BBM akhir falls in 40-100L range
 *   Total galian ≈ target volume
 *
 * Uses actual field data (dailyData) if available for H and Q1
 */
export function goalSeekBisectionPelaksanaan(params) {
  const {
    totalVolume,
    totalBBMditerima,
    dailyData = [],
    targetSisaMin = 40,
    targetSisaMax = 100,
    hp = 148,
    loadFactor = 0.28,
    H_override = null,
    Q1_override = null
  } = params;

  const kW = hp * 0.7457;
  const SPECIFIC_FUEL = 0.10; // L/kWh

  // Derive H from field data or use override
  let H_actual;
  if (H_override !== null) {
    H_actual = H_override;
  } else if (dailyData.length > 0) {
    const totalJam = dailyData.reduce((s, d) => s + (d.jamKerja || 0), 0);
    const totalBBMField = dailyData.reduce((s, d) => s + (d.bbmPakai || 0), 0);
    H_actual = totalJam > 0 ? totalBBMField / totalJam : kW * loadFactor * SPECIFIC_FUEL;
  } else {
    H_actual = kW * loadFactor * SPECIFIC_FUEL;
  }

  // Derive Q1 from field data or use override
  let Q1_actual;
  if (Q1_override !== null) {
    Q1_actual = Q1_override;
  } else if (dailyData.length > 0) {
    const totalJam = dailyData.reduce((s, d) => s + (d.jamKerja || 0), 0);
    const totalGalianField = dailyData.reduce((s, d) => s + (d.galian || 0), 0);
    Q1_actual = totalJam > 0 ? totalGalianField / totalJam : 0;
  } else {
    Q1_actual = 0;
  }

  const tk = 8; // jam per hari

  // === BISECTION on Fd (days) ===
  // Find Fd that gives sisa closest to ideal (70L) within [min, max] range
  const Fd_high = Math.max(1, Math.ceil(totalVolume / (Q1_actual * tk)) + 10);

  let bestFd = 1;
  let bestSisa = totalBBMditerima - (H_actual * 1 * tk);
  let minDist = Infinity;

  for (let fd = 1; fd <= Math.min(Fd_high, 365); fd++) {
    const solarUsed = H_actual * fd * tk;
    const sisa = totalBBMditerima - solarUsed;
    const dist = Math.abs(sisa - 70);
    if (dist < minDist && sisa >= targetSisaMin) {
      minDist = dist;
      bestFd = fd;
      bestSisa = sisa;
    }
  }

  const inRange = bestSisa >= targetSisaMin && bestSisa <= targetSisaMax;
  const totalGalianPrediksi = Q1_actual * bestFd * tk;
  const deviasiVolume = totalVolume > 0
    ? Math.abs(totalGalianPrediksi - totalVolume) / totalVolume * 100
    : 0;

  return {
    fd: bestFd,
    estimasiHari: bestFd,
    sisaAkhir: Number(bestSisa.toFixed(2)),
    totalSolarUsed: Number((H_actual * bestFd * tk).toFixed(2)),
    h: Number(H_actual.toFixed(4)),
    h2: Number((H_actual * tk).toFixed(2)),
    q1: Number(Q1_actual.toFixed(2)),
    q2: Number((Q1_actual * tk).toFixed(2)),
    totalGalianPrediksi: Number(totalGalianPrediksi.toFixed(2)),
    deviasiVolume: Number(deviasiVolume.toFixed(2)),
    inRange,
    status: inRange ? 'OPTIMAL' : 'ADJUSTED',
    targetSisaMin,
    targetSisaMax,
    dariDataField: dailyData.length > 0
  };
}

/**
 * Calculates optimal BBM drops ensuring Sisa never drops below 0 
 * and ends between 40-150 Liters realistically.
 */
export function distributeBBMDrops(dailyData, H) {
  if (!dailyData || dailyData.length === 0) return [];
  const N = dailyData.length;
  
  // Deterministic random
  const dRand = (seed) => {
    const x = Math.sin(seed + 1) * 10000;
    return x - Math.floor(x);
  };

  const bbmHariArray = dailyData.map(d => d.jam * H);

  // 1. Check if user provided explicit drops (now populated from DB2 BBM API)
  const hasExplicitDrops = dailyData.some(d => (d.bbmDiterima || 0) > 0);
  if (hasExplicitDrops) {
    return dailyData.map(d => d.bbmDiterima || 0);
  }

  // 2. Identify drop indices (Fallback algorithmic logic)
  const dropIndices = [];
  dailyData.forEach((d, i) => {
    const note = (d.keterangan || '') + ' ' + (d.catatan || '');
    if (i === 0 || /(bbm|solar|drop|kirim|terima)/i.test(note)) {
      dropIndices.push(i);
    }
  });

  // 2. Calculate drops
  const drops = new Array(N).fill(0);
  let currentSisa = 0;

  for (let k = 0; k < dropIndices.length; k++) {
    const idx = dropIndices[k];
    const nextIdx = k < dropIndices.length - 1 ? dropIndices[k+1] : N;
    
    // Consumption in this interval
    let intervalCons = 0;
    for (let j = idx; j < nextIdx; j++) {
      intervalCons += bbmHariArray[j];
    }
    
    let dropAmount = 0;
    if (k === dropIndices.length - 1) {
      // Last drop: target final sisa between 40-150
      const targetFinal = 40 + dRand(idx) * 110; 
      dropAmount = intervalCons + targetFinal - currentSisa;
      // Round to nearest 5
      dropAmount = Math.ceil(dropAmount / 5) * 5;
    } else {
      // Intermediate drop: target sisa before next drop to be between 40-100
      const targetBeforeNext = 40 + dRand(idx) * 60;
      dropAmount = intervalCons + targetBeforeNext - currentSisa;
      // Round to nearest 10
      dropAmount = Math.ceil(dropAmount / 10) * 10; 
    }
    
    if (dropAmount < 0) dropAmount = 0;
    drops[idx] = dropAmount;
    
    currentSisa = currentSisa + dropAmount - intervalCons;
  }
  
  return drops;
}
