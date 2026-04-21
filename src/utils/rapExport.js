'use client';

/**
 * rapExport.js
 * Excel Export Utilities untuk RAP Module
 *
 * Generates 11 sheets sesuai format master:
 * 1. ANALISA perencanaan
 * 2. backup volume rencana
 * 3. PERSONIL
 * 4. RAB PERSONIL
 * 5. RAB PEKERJAAN
 * 6. ANALISA pelaksanaan
 * 7. Kebutuhan realismo
 * 8. backup volume Pelaksanaan
 * 9. PERSONIL pelaksanaan
 * 10. RAB PERSONIL PELAKSANAAN
 * 11. RAB PELAKSANAAN
 */

/**
 * Format angka untuk Excel
 */
function fmt(num, decimals = 3) {
  return Number(num?.toFixed(decimals) || 0);
}

/**
 * Format tanggal Indonesia
 */
function formatDate(date) {
  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

// =====================
// SHEET GENERATORS
// =====================

/**
 * Sheet 1: ANALISA perencanaan
 */
function generateAnalisaPerencanaanSheet(rapState) {
  const { geometri, analisaRencana } = rapState;
  const data = [];

  // Header
  data.push(['ANALISA HARGA SATUAN']);
  data.push([`PEKERJAAN: ${geometri.kopData?.pekerjaan || '-'}`]);
  data.push([`LOKASI: ${geometri.kopData?.lokasi || '-'}`]);
  data.push([]);

  // I. ASUMSI
  data.push(['I. ASUMSI']);
  data.push(['1.', 'Jam Kerja Efektif per hari', 'Tk', 8, 'Jam']);
  data.push(['2.', 'Faktor Pengembangan Material', 'Fk', 0.8, '-']);
  data.push([]);

  // II. URUTAN KERJA
  data.push(['II. URUTAN KERJA']);
  data.push(['Pekerjaan galian tanah dengan Excavator dan penimbunan kembali']);
  data.push([]);

  // III. URAIAN PERALATAN
  data.push(['III. URAIAN PERALATAN']);
  data.push([1, 'Tenaga', 'Pw', fmt(analisaRencana.hp), 'HP']);
  data.push([2, 'Kapasitas Bucket', 'V (Cp)', fmt(analisaRencana.bucket), 'm3']);
  data.push([3, 'Jam Operasi per Tahun', 'w', 2000, 'Jam']);
  data.push([4, 'Faktor Bucket', 'Fb', fmt(analisaRencana.fb)]);
  data.push([5, 'Faktor Efisiensi Alat', 'Fa', fmt(analisaRencana.fa)]);
  data.push([6, 'Faktor Konversi Galian', 'Fv', fmt(analisaRencana.fv)]);
  data.push([7, 'Waktu Siklus', 'T.1', fmt(analisaRencana.t1, 4), 'menit']);
  data.push([8, 'Kap. Produksi/Jam', 'Q1', fmt(analisaRencana.q1), 'm3/jam']);
  data.push([9, 'Kap. Produksi/Hari', 'Q.2', fmt(analisaRencana.q2), 'm3/hari']);
  data.push([]);

  // IV. BIAYA OPERASI/JAM
  data.push(['IV. BIAYA OPERASI/JAM']);
  const kW = fmt(analisaRencana.hp * 0.7457);
  const Fe = fmt(analisaRencana.feMenit / 60);
  const Fd = fmt(analisaRencana.fd);
  const H = fmt(analisaRencana.h);

  data.push(['kW', '=', fmt(analisaRencana.hp), 'x 0.7457', '=', kW]);
  data.push(['Load Factor', 'L/kWh', fmt(analisaRencana.loadFactor)]);
  data.push(['Fe', '=', fmt(analisaRencana.feMenit), '/ 60', '=', Fe]);
  data.push(['Fd', '=', fmt(analisaRencana.waktuGali), '/ (T.1 x 60)', '=', Fd]);
  data.push(['H', '=', 'Fd x Fe x L/kWh x kW', '=', H, 'Liter/jam']);
  data.push(['h2', '=', `H x ${8}`, '=', fmt(analisaRencana.h2), 'Liter/hari']);
  data.push([]);

  // V. ESTIMASI
  data.push(['V. ESTIMASI PEKERJAAN']);
  data.push(['Volume', 'V', fmt(geometri.totalVolume), 'm3']);
  data.push(['Estimasi Waktu', 'T.pek', Math.ceil(analisaRencana.estimasiHari), 'Hari']);
  data.push(['Total Kebutuhan Solar', 'Ks', fmt(analisaRencana.totalSolar), 'Liter']);

  return data;
}

/**
 * Sheet 2: backup volume rencana
 */
function generateBackupVolumeRencanaSheet(rapState) {
  const { geometri } = rapState;
  const data = [];

  data.push(['BACKUP VOLUME RENCANA']);
  data.push([]);
  data.push(['STA', 'b1(m)', 'b2(m)', 'b3(m)', 'h(m)', "h'(m)", 'Luas(m2)', 'Volume(m3)']);

  geometri.stas?.forEach(sta => {
    data.push([
      sta.sta,
      fmt(sta.b1),
      fmt(sta.b2),
      fmt(sta.b3),
      fmt(sta.h),
      fmt(sta.hPrime),
      fmt(sta.luas),
      fmt(sta.volume || 0)
    ]);
  });

  data.push([]);
  data.push(['TOTAL', '', '', '', '', '', '', fmt(geometri.totalVolume)]);

  return data;
}

/**
 * Sheet 3: PERSONIL
 */
function generatePersonilSheet(rapState) {
  const { geometri, personil } = rapState;
  const data = [];

  data.push(['DAFTAR ANALISA HARGA SATUAN PEKERJAAN']);
  data.push(['PERSONIL - PENJAGA MALAM']);
  data.push([]);
  data.push([`Volume: ${fmt(geometri.totalVolume)} m3`]);
  data.push([`Durasi: ${personil.durasiHari} Hari`]);
  data.push([]);

  data.push(['A. TENAGA KERJA']);
  data.push(['No', 'Uraian', 'Koef', 'Volume', 'Durasi (Hari)']);
  data.push([1, 'Penjaga Malam 1', fmt(1 / (geometri.totalVolume / personil.durasiHari)), fmt(geometri.totalVolume), personil.durasiHari]);
  data.push([2, 'Penjaga Malam 2', fmt(1 / (geometri.totalVolume / personil.durasiHari)), fmt(geometri.totalVolume), personil.durasiHari]);
  data.push([]);

  data.push(['B. BAHAN']);
  data.push(['Solar', '', fmt(personil.kebutuhanSolar), 'Liter']);

  return data;
}

/**
 * Sheet 4: RAB PERSONIL
 */
function generateRabPersonilSheet(rapState) {
  const { personil, rabPersonil } = rapState;
  const data = [];

  data.push(['RAB PERSONIL']);
  data.push([]);

  // A. TENAGA
  data.push(['A. TENAGA KERJA']);
  data.push(['No', 'Uraian', 'Sat', 'Volume', 'Harga', 'Jumlah']);

  const hargaPM = 75000;
  const totalPM = personil.durasiHari * hargaPM;

  data.push([1, 'Penjaga Malam 1', 'Hari', personil.durasiHari, fmt(hargaPM), fmt(totalPM)]);
  data.push([2, 'Penjaga Malam 2', 'Hari', personil.durasiHari, fmt(hargaPM), fmt(totalPM)]);
  data.push([]);

  // B. BAHAN
  data.push(['B. BAHAN']);
  data.push([1, 'Solar', 'Liter', fmt(personil.kebutuhanSolar), 22300, fmt(personil.kebutuhanSolar * 22300)]);
  data.push([]);

  // PPN
  data.push(['', 'PPN 12%', '', '', '', fmt(rabPersonil.ppn12)]);
  data.push([]);

  data.push(['SUB TOTAL', '', '', '', '', fmt(rabPersonil.subtotal)]);
  data.push(['TOTAL (Pembulatan)', '', '', '', '', fmt(rabPersonil.pembulatan)]);

  return data;
}

/**
 * Sheet 5: RAB PEKERJAAN
 */
function generateRabPekerjaanSheet(rapState) {
  const { geometri, personil, rabFinal } = rapState;
  const data = [];

  data.push(['RAB PEKERJAAN']);
  data.push([]);

  data.push(['A. PEKERJAAN TANAH']);
  data.push(['No', 'Uraian', 'Sat', 'Volume', 'Harga Satuan', 'Harga+PPN', 'Jumlah']);

  const jumlahGalian = geometri.totalVolume * rabFinal.hargaPPN;

  data.push([1, 'Galian+Menimbun Excavator', 'm3', fmt(geometri.totalVolume), fmt(rabFinal.hargaSatuan), fmt(rabFinal.hargaPPN), fmt(jumlahGalian)]);

  const jumlahKeamanan = personil.totalHOK * 75000 * 1.12;
  data.push([2, 'Jasa Keamanan (2 Orang)', 'OH', personil.totalHOK, fmt(75000 * 1.12), fmt(jumlahKeamanan)]);
  data.push([]);

  data.push(['GRAND TOTAL', '', '', '', '', '', fmt(rabFinal.grandTotal)]);
  data.push([]);
  data.push(['PAGU ANGGARAN', '', '', '', '', '', fmt(rabFinal.pagu)]);
  data.push(['SISA PAGU', '', '', '', '', '', fmt(rabFinal.sisaPagu)]);

  return data;
}

/**
 * Sheet 6: ANALISA pelaksanaan
 */
function generateAnalisaPelaksanaanSheet(rapState) {
  const { geometri, verifikasi, analisaRencana } = rapState;
  const data = [];

  data.push(['ANALISA HARGA SATUAN - PELAKSANAAN']);
  data.push([]);

  // Header sama dengan perencanaan
  data.push(['I. ASUMSI']);
  data.push(['1.', 'Jam Kerja Efektif per hari', 'Tk', 8, 'Jam']);
  data.push(['2.', 'Faktor Pengembangan Material', 'Fk', 0.8, '-']);
  data.push([]);

  data.push(['III. URAIAN PERALATAN']);
  data.push([1, 'Tenaga', 'Pw', fmt(analisaRencana.hp), 'HP']);
  data.push([2, 'Kapasitas Bucket', 'V (Cp)', fmt(analisaRencana.bucket), 'm3']);
  data.push([7, 'Waktu Siklus (Verifikasi)', 'T.1', fmt(verifikasi.t1, 4), 'menit']);
  data.push([8, 'Kap. Produksi/Jam', 'Q1', fmt(verifikasi.q1 || analisaRencana.q1), 'm3/jam']);
  data.push([]);

  data.push(['HASIL VERIFIKASI']);
  data.push(['T.1 Hasil', fmt(verifikasi.t1, 4), 'menit']);
  data.push(['Status', verifikasi.status || 'WAJAR']);
  data.push(['Range SNI', `${fmt(verifikasi.sniMin)} - ${fmt(verifikasi.sniMax)} menit`]);

  return data;
}

/**
 * Sheet 7: Kebutuhan realismo
 */
function generateKebutuhanRealisasiSheet(rapState) {
  const { geometri, kebutuhanRealisasi, analisaRencana } = rapState;
  const data = [];

  data.push(['RINCIAN KEBUTUHAN DAN HASIL PELAKSANAAN']);
  data.push([`SUB KEGIATAN: ${geometri.kopData?.program || '-'}`]);
  data.push([`PEKERJAAN: ${geometri.kopData?.pekerjaan || '-'}`]);
  data.push([`LOKASI: ${geometri.kopData?.lokasi || '-'}`]);
  data.push([]);

  // Tabel Header
  data.push(['No', 'Tgl', 'Bln', 'Thn', 'Jam Kerja', 'Galian/Jam', 'Galian/Hari', 'BBM/Jam', 'BBM/Hari', 'Diterima', 'Sisa']);

  // Data rows
  let totalGalian = 0;
  let totalBBM = 0;

  kebutuhanRealisasi.dailyData?.forEach((d, i) => {
    const tgl = new Date(d.tanggal);
    data.push([
      i + 1,
      tgl.getDate(),
      tgl.toLocaleString('id-ID', { month: 'long' }),
      tgl.getFullYear(),
      fmt(d.jam, 1),
      fmt(d.q1),
      fmt(d.galian),
      fmt(d.bbmJam),
      fmt(d.bbmHarian),
      d.diterima || 0,
      fmt(d.sisa)
    ]);
    totalGalian += d.galian || 0;
    totalBBM += d.bbmHarian || 0;
  });

  // Total
  data.push(['TOTAL', '', '', '', '', '', fmt(totalGalian), '', fmt(totalBBM), '', fmt(kebutuhanRealisasi.sisaAkhir)]);

  return data;
}

/**
 * Sheet 8: backup volume Pelaksanaan
 */
function generateBackupVolumePelaksanaanSheet(rapState) {
  const { backupPelaksanaan } = rapState;
  const data = [];

  data.push(['BACKUP VOLUME PELAKSANAAN']);
  data.push([]);
  data.push(['STA', 'b1(m)', 'b2(m)', 'b3(m)', 'h(m)', "h'(m)", 'Luas(m2)', 'Volume(m3)']);

  backupPelaksanaan.stas?.forEach(sta => {
    data.push([
      sta.sta,
      fmt(sta.b1),
      fmt(sta.b2),
      fmt(sta.b3),
      fmt(sta.h),
      fmt(sta.hPrime),
      fmt(sta.luas),
      fmt(sta.volume || 0)
    ]);
  });

  data.push([]);
  data.push(['TOTAL', '', '', '', '', '', '', fmt(backupPelaksanaan.totalVolume)]);

  return data;
}

/**
 * Sheet 9: PERSONIL pelaksanaan
 */
function generatePersonilPelaksanaanSheet(rapState) {
  const { geometri, personil } = rapState;
  const data = [];

  data.push(['PERSONIL PELAKSANAAN']);
  data.push([]);
  data.push([`Volume: ${fmt(geometri.totalVolume)} m3`]);
  data.push([`Durasi: ${personil.durasiHari} Hari`]);
  data.push([]);

  data.push(['A. TENAGA KERJA']);
  data.push(['No', 'Uraian', 'Koef', 'Volume', 'Durasi']);

  const koef1 = 1 / (geometri.totalVolume / personil.durasiHari);
  data.push([1, 'Penjaga Malam 1', fmt(koef1, 5), fmt(geometri.totalVolume), personil.durasiHari]);
  data.push([2, 'Penjaga Malam 2', fmt(koef1, 5), fmt(geometri.totalVolume), personil.durasiHari]);
  data.push([]);

  data.push(['B. BAHAN']);
  data.push(['Solar', fmt(personil.kebutuhanSolar), 'Liter']);

  return data;
}

/**
 * Sheet 10: RAB PERSONIL PELAKSANAAN
 */
function generateRabPersonilPelaksanaanSheet(rapState) {
  const { personil, rabPersonil } = rapState;
  const data = [];

  data.push(['RAB PERSONIL PELAKSANAAN']);
  data.push([]);

  data.push(['A. TENAGA']);
  data.push(['No', 'Uraian', 'Sat', 'Volume', 'Harga', 'Jumlah']);

  const hargaPM = 75000;
  data.push([1, 'Penjaga Malam 1', 'Hari', personil.durasiHari, fmt(hargaPM), fmt(personil.durasiHari * hargaPM)]);
  data.push([2, 'Penjaga Malam 2', 'Hari', personil.durasiHari, fmt(hargaPM), fmt(personil.durasiHari * hargaPM)]);
  data.push([]);

  data.push(['B. BAHAN']);
  data.push([1, 'Solar', 'Liter', fmt(personil.kebutuhanSolar), 22300, fmt(personil.kebutuhanSolar * 22300)]);
  data.push(['', 'PPN 12%', '', '', '', fmt(rabPersonil.ppn12)]);
  data.push([]);

  data.push(['SUB TOTAL', '', '', '', '', fmt(rabPersonil.subtotal)]);
  data.push(['TOTAL', '', '', '', '', fmt(rabPersonil.pembulatan)]);

  return data;
}

/**
 * Sheet 11: RAB PELAKSANAAN
 */
function generateRabPelaksanaanSheet(rapState) {
  const { geometri, personil, rabFinal } = rapState;
  const data = [];

  data.push(['RAB PELAKSANAAN']);
  data.push([]);
  data.push([`Program: ${rapState.geometri?.kopData?.program || '-'}`]);
  data.push([`Pekerjaan: ${rapState.geometri?.kopData?.pekerjaan || '-'}`]);
  data.push([`Lokasi: ${rapState.geometri?.kopData?.lokasi || '-'}`]);
  data.push([]);

  data.push(['A. PEKERJAAN TANAH']);
  data.push(['No', 'Uraian', 'Sat', 'Volume', 'Harga Satuan', 'Harga+PPN', 'Jumlah']);

  const jumlahGalian = geometri.totalVolume * rabFinal.hargaPPN;
  data.push([1, 'Galian+Menimbun Excavator', 'm3', fmt(geometri.totalVolume), fmt(rabFinal.hargaSatuan), fmt(rabFinal.hargaPPN), fmt(jumlahGalian)]);

  const jumlahKeamanan = personil.totalHOK * 75000 * 1.12;
  data.push([2, 'Jasa Keamanan', 'OH', personil.totalHOK, fmt(75000 * 1.12), fmt(jumlahKeamanan)]);
  data.push([]);

  data.push(['TOTAL', '', '', '', '', '', fmt(rabFinal.grandTotal)]);
  data.push([]);
  data.push(['PAGU', '', '', '', '', '', fmt(rabFinal.pagu)]);
  data.push(['SISA PAGU', '', '', '', '', '', fmt(rabFinal.sisaPagu)]);

  return data;
}

// =====================
// MAIN EXPORT FUNCTION
// =====================

/**
 * Generate full workbook dengan 11 sheets
 */
export async function generateFullExcelWorkbook(rapState) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  // Helper to create sheet
  const createSheet = (data, name) => {
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, name);
  };

  // Sheet 1: ANALISA perencanaan
  createSheet(generateAnalisaPerencanaanSheet(rapState), 'ANALISA perencanaan');

  // Sheet 2: backup volume rencana
  createSheet(generateBackupVolumeRencanaSheet(rapState), 'backup volume rencana');

  // Sheet 3: PERSONIL
  createSheet(generatePersonilSheet(rapState), 'PERSONIL');

  // Sheet 4: RAB PERSONIL
  createSheet(generateRabPersonilSheet(rapState), 'RAB PERSONIL');

  // Sheet 5: RAB PEKERJAAN
  createSheet(generateRabPekerjaanSheet(rapState), 'RAB PEKERJAAN');

  // Sheet 6: ANALISA pelaksanaan
  createSheet(generateAnalisaPelaksanaanSheet(rapState), 'ANALISA pelaksanaan');

  // Sheet 7: Kebutuhan realismo
  createSheet(generateKebutuhanRealisasiSheet(rapState), 'Kebutuhan  realismo');

  // Sheet 8: backup volume Pelaksanaan
  createSheet(generateBackupVolumePelaksanaanSheet(rapState), 'backup volume Pelaksanaan');

  // Sheet 9: PERSONIL pelaksanaan
  createSheet(generatePersonilPelaksanaanSheet(rapState), 'PERSONIL pelaksanaan');

  // Sheet 10: RAB PERSONIL PELAKSANAAN
  createSheet(generateRabPersonilPelaksanaanSheet(rapState), 'RAB PERSONIL PELAKSANAAN');

  // Sheet 11: RAB PELAKSANAAN
  createSheet(generateRabPelaksanaanSheet(rapState), 'RAB PELAKSANAAN');

  return wb;
}

/**
 * Download Excel file
 */
export async function downloadExcel(rapState, filename = 'RAP_Export.xlsx') {
  const wb = await generateFullExcelWorkbook(rapState);
  const XLSX = await import('xlsx');
  XLSX.writeFile(wb, filename);
}

/**
 * Get sheet names
 */
export function getSheetNames() {
  return [
    'ANALISA perencanaan',
    'backup volume rencana',
    'PERSONIL',
    'RAB PERSONIL',
    'RAB PEKERJAAN',
    'ANALISA pelaksanaan',
    'Kebutuhan  realismo',
    'backup volume Pelaksanaan',
    'PERSONIL pelaksanaan',
    'RAB PERSONIL PELAKSANAAN',
    'RAB PELAKSANAAN'
  ];
}