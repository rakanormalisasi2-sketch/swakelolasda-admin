'use client';

/**
 * rapExport.js - Government Excel Export
 * Full 15-sheet RAP workbook with proper government formatting
 * Matching reference: BACK UP VOLUME RENCANA PEKERJAAN format
 *
 * Sheets:
 *  1. Backup Galian (2)
 *  2. Bahan Upah
 *  3. backup volume rencana
 *  4. ANALISA perencanaan
 *  5. PERSONIL
 *  6. RAB PERSONIL
 *  7. RAB PEKERJAAN
 *  8. ANALISA pelaksanaan
 *  9. Kebutuhan realistas
 * 10. backup volume Pelaksanaan
 * 11. PERSONIL pelaksanaan
 * 12. RAB PERSONIL PELAKSANAAN
 * 13. RAB PELAKSANAAN
 * 14. Backup Galian
 * 15. ELEVASI
 */

import * as XLSX from 'xlsx';

// =====================
// HELPERS
// =====================

const fmt = (num, dec = 3) => Number(num?.toFixed(dec) || 0);
const fmtRp = (num) => Number(num?.toFixed(0) || 0);

// Apply full style to a worksheet cell
function sc(ws, addr, opts = {}) {
  if (!ws[addr]) return;
  if (!ws[addr].s) ws[addr].s = {};
  Object.assign(ws[addr].s, opts);
}

// Set cell with value AND style
function svc(ws, row, col, value, style = {}) {
  const addr = XLSX.utils.encode_cell({ r: row, c: col });
  ws[addr] = { t: 's', v: value };
  ws[addr].s = style;
  return addr;
}

// Apply styles to a range of cells
function applyRangeStyle(ws, srow, scol, erow, ecol, style = {}) {
  for (let r = srow; r <= erow; r++) {
    for (let c = scol; c <= ecol; c++) {
      sc(ws, XLSX.utils.encode_cell({ r, c }), style);
    }
  }
}

// Merge cells
function merge(ws, srow, scol, erow, ecol) {
  ws['!merges'] = ws['!merges'] || [];
  ws['!merges'].push({ s: { r: srow, c: scol }, e: { r: erow, c: ecol } });
}

// =====================
// SHARED STYLE TEMPLATES
// =====================

const STYLES = {
  // Header bar (dark blue gradient style)
  headerDark: {
    fill: { fgColor: { rgb: '1E3A5F' } },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 12 },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } }
    }
  },
  headerMedium: {
    fill: { fgColor: { rgb: '2E5A8F' } },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } }
    }
  },
  headerLight: {
    fill: { fgColor: { rgb: 'D6E4F0' } },
    font: { bold: true, color: { rgb: '1E3A5F' }, sz: 10 },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } }
    }
  },
  subHeader: {
    fill: { fgColor: { rgb: 'EBF5FB' } },
    font: { bold: true, color: { rgb: '1E3A5F' }, sz: 10 },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } }
    }
  },
  dataCell: {
    font: { color: { rgb: '1E3A5F' }, sz: 10 },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '8FB3D9' } },
      bottom: { style: 'thin', color: { rgb: '8FB3D9' } },
      left: { style: 'thin', color: { rgb: '8FB3D9' } },
      right: { style: 'thin', color: { rgb: '8FB3D9' } }
    }
  },
  dataCellRight: {
    font: { color: { rgb: '1E3A5F' }, sz: 10 },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '8FB3D9' } },
      bottom: { style: 'thin', color: { rgb: '8FB3D9' } },
      left: { style: 'thin', color: { rgb: '8FB3D9' } },
      right: { style: 'thin', color: { rgb: '8FB3D9' } }
    }
  },
  dataCellLeft: {
    font: { color: { rgb: '1E3A5F' }, sz: 10 },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '8FB3D9' } },
      bottom: { style: 'thin', color: { rgb: '8FB3D9' } },
      left: { style: 'thin', color: { rgb: '8FB3D9' } },
      right: { style: 'thin', color: { rgb: '8FB3D9' } }
    }
  },
  labelCell: {
    fill: { fgColor: { rgb: 'F2F8FF' } },
    font: { bold: true, color: { rgb: '1E3A5F' }, sz: 10 },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '8FB3D9' } },
      bottom: { style: 'thin', color: { rgb: '8FB3D9' } },
      left: { style: 'thin', color: { rgb: '8FB3D9' } },
      right: { style: 'thin', color: { rgb: '8FB3D9' } }
    }
  },
  valueCell: {
    fill: { fgColor: { rgb: 'FFFFFF' } },
    font: { color: { rgb: '1E3A5F' }, sz: 10 },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '8FB3D9' } },
      bottom: { style: 'thin', color: { rgb: '8FB3D9' } },
      left: { style: 'thin', color: { rgb: '8FB3D9' } },
      right: { style: 'thin', color: { rgb: '8FB3D9' } }
    }
  },
  totalRow: {
    fill: { fgColor: { rgb: '1E3A5F' } },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'medium', color: { rgb: '000000' } },
      bottom: { style: 'medium', color: { rgb: '000000' } },
      left: { style: 'medium', color: { rgb: '000000' } },
      right: { style: 'medium', color: { rgb: '000000' } }
    }
  },
  grandTotal: {
    fill: { fgColor: { rgb: '0D6E3F' } },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 13 },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'medium', color: { rgb: '000000' } },
      bottom: { style: 'medium', color: { rgb: '000000' } },
      left: { style: 'medium', color: { rgb: '000000' } },
      right: { style: 'medium', color: { rgb: '000000' } }
    }
  },
  sectionA: {
    fill: { fgColor: { rgb: '1E3A5F' } },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } }
    }
  },
  sectionB: {
    fill: { fgColor: { rgb: '2E5A8F' } },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } }
    }
  },
  footer: {
    fill: { fgColor: { rgb: 'D6E4F0' } },
    font: { italic: true, color: { rgb: '1E3A5F' }, sz: 9 },
    alignment: { horizontal: 'left', vertical: 'center' }
  },
  title: {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 14 },
    fill: { fgColor: { rgb: '1E3A5F' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  },
  subtitle: {
    font: { bold: true, color: { rgb: '1E3A5F' }, sz: 12 },
    fill: { fgColor: { rgb: 'EBF5FB' } },
    alignment: { horizontal: 'left', vertical: 'center' }
  },
  money: {
    font: { color: { rgb: '1E3A5F' }, sz: 10 },
    alignment: { horizontal: 'right', vertical: 'center' },
    numFmt: '#,##0'
  },
  moneyBold: {
    font: { bold: true, color: { rgb: '1E3A5F' }, sz: 10 },
    alignment: { horizontal: 'right', vertical: 'center' },
    numFmt: '#,##0'
  },
  number: {
    font: { color: { rgb: '1E3A5F' }, sz: 10 },
    alignment: { horizontal: 'right', vertical: 'center' },
    numFmt: '#,##0.000'
  },
  numberBold: {
    font: { bold: true, color: { rgb: '1E3A5F' }, sz: 10 },
    alignment: { horizontal: 'right', vertical: 'center' },
    numFmt: '#,##0.000'
  },
  alternateRow: {
    fill: { fgColor: { rgb: 'F2F8FF' } },
    font: { color: { rgb: '1E3A5F' }, sz: 10 },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '8FB3D9' } },
      bottom: { style: 'thin', color: { rgb: '8FB3D9' } },
      left: { style: 'thin', color: { rgb: '8FB3D9' } },
      right: { style: 'thin', color: { rgb: '8FB3D9' } }
    }
  },
  ppnRow: {
    fill: { fgColor: { rgb: 'FFB300' } },
    font: { bold: true, color: { rgb: '1E3A5F' }, sz: 10 },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: {
      top: { style: 'medium', color: { rgb: '000000' } },
      bottom: { style: 'medium', color: { rgb: '000000' } },
      left: { style: 'medium', color: { rgb: '000000' } },
      right: { style: 'medium', color: { rgb: '000000' } }
    }
  }
};

// =====================
// GENERATE GOVERNMENT KOP (HEADER)
// =====================

function generateKop(ws, srow, geometri, title, subtitle) {
  // Row 0: Title (merged)
  merge(ws, srow, 0, srow, 8);
  svc(ws, srow, 0, title, STYLES.title);
  ws['!rows'] = ws['!rows'] || [];
  ws['!rows'][srow] = { hpt: 30 };

  // Row 1: Subtitle
  merge(ws, srow + 1, 0, srow + 1, 8);
  svc(ws, srow + 1, 0, subtitle || 'PEKERJAAN NORMALISASI SUNGAI', STYLES.subtitle);
  ws['!rows'][srow + 1] = { hpt: 22 };

  // Row 2: Empty spacer
  ws['!rows'][srow + 2] = { hpt: 8 };

  // Row 3-8: Kop info
  const kopFields = [
    { label: 'PROGRAM', value: geometri?.kopData?.program || 'PROGRAM PENGELOLAAN SUMBER DAYA AIR (SDA)' },
    { label: 'KEGIATAN', value: geometri?.kopData?.kegiatan || 'PENGELOLAAN SDA DAN BANGUNAN PENGAMAN PANTAI PADA WILAYAH SUNGAI' },
    { label: 'PEKERJAAN', value: geometri?.kopData?.pekerjaan || '-' },
    { label: 'LOKASI', value: geometri?.kopData?.lokasi || '-' },
    { label: 'TAHUN ANGGARAN', value: String(geometri?.kopData?.tahun || new Date().getFullYear()) }
  ];

  kopFields.forEach((field, i) => {
    const row = srow + 3 + i;
    svc(ws, row, 0, `${field.label}:`, STYLES.labelCell);
    merge(ws, row, 0, row, 0);
    merge(ws, row, 1, row, 8);
    svc(ws, row, 1, `${field.label}: ${field.value}`, STYLES.valueCell);
    ws['!rows'][row] = { hpt: 18 };
  });

  return srow + 3 + kopFields.length + 1; // return next free row
}

// =====================
// SHEET 1: Backup Galian (2)
// =====================

function generateBackupGalian2(ws, rapState) {
  const { geometri } = rapState;
  let r = 0;

  // Title
  merge(ws, r, 0, r, 3);
  svc(ws, r++, 0, 'BACK UP VOLUME RENCANA PEKERJAAN', STYLES.title);
  ws['!rows'] = [{ hpt: 30 }, { hpt: 8 }];

  // Subtitle
  merge(ws, r, 0, r, 3);
  svc(ws, r++, 0, 'PEKERJAAN GALIAN TANAH MENGGUNAKAN EXCAVATOR', STYLES.subtitle);
  ws['!rows'].push({ hpt: 22 });
  ws['!rows'].push({ hpt: 8 });

  // Info row
  svc(ws, r, 0, 'Satuan:', STYLES.labelCell);
  merge(ws, r, 0, r, 0);
  svc(ws, r++, 1, 'M3', STYLES.valueCell);
  ws['!rows'].push({ hpt: 18 });

  // Table header
  ws['!rows'].push({ hpt: 22 });
  const headers = ['NO', 'STA', 'VOLUME (M3)', 'KETERANGAN'];
  headers.forEach((h, c) => svc(ws, r, c, h, STYLES.headerMedium));
  r++;

  // Data rows
  geometri.stas?.forEach((sta, i) => {
    ws['!rows'].push({ hpt: 18 });
    const style = i % 2 === 0 ? STYLES.dataCell : STYLES.alternateRow;
    svc(ws, r, 0, i + 1, style);
    svc(ws, r, 1, `STA ${sta.sta}`, style);
    svc(ws, r, 2, fmt(sta.volume || 0), { ...STYLES.number, ...{ alignment: { horizontal: 'right' } } });
    svc(ws, r, 3, i === 0 ? 'Baseline' : '-', style);
    r++;
  });

  // Total row
  ws['!rows'].push({ hpt: 22 });
  merge(ws, r, 0, r, 1);
  svc(ws, r, 0, 'TOTAL VOLUME', STYLES.totalRow);
  svc(ws, r, 2, fmt(geometri.totalVolume), { ...STYLES.totalRow, ...{ alignment: { horizontal: 'right' } } });
  svc(ws, r, 3, 'M3', STYLES.totalRow);
  r++;

  ws['!cols'] = [
    { wch: 8 }, { wch: 20 }, { wch: 18 }, { wch: 30 }
  ];

  return r;
}

// =====================
// SHEET 2: Bahan Upah
// =====================

function generateBahanUpah(ws) {
  let r = 0;
  ws['!rows'] = [];

  // Title
  merge(ws, r, 0, r, 4);
  svc(ws, r++, 0, 'DAFTAR HARGA SATUAN DASAR BAHAN DAN UPAH', STYLES.title);
  ws['!rows'].push({ hpt: 30 }, { hpt: 8 });

  // Section: Bahan
  ws['!rows'].push({ hpt: 22 });
  merge(ws, r, 0, r, 4);
  svc(ws, r++, 0, 'A. BAHAN', STYLES.sectionA);

  ws['!rows'].push({ hpt: 22 });
  ['NO', 'JENIS MATERIAL', 'SATUAN', 'HARGA SATUAN (RP)', 'KETERANGAN'].forEach((h, c) =>
    svc(ws, r, c, h, STYLES.headerMedium)
  );
  r++;

  const bahan = [
    [1, 'Pasir', 'M3', 150000, 'Lokasi quarry'],
    [2, 'Sirtu', 'M3', 120000, 'Lokasi quarry'],
    [3, 'Tanah Biasa', 'M3', 80000, 'Pengujian Material'],
    [4, 'Urugan Tanah', 'M3', 60000, 'Pengujian Material'],
    [5, 'Batu Belah', 'M3', 180000, 'Pengujian Material'],
    [6, 'Solar', 'Liter', 22300, 'Harga Pasokan'],
    [7, 'Olibek', 'Liter', 45000, 'Harga Pasokan'],
    [8, 'Premix', 'Ton', 1500000, 'Hotmix AC-WC']
  ];

  bahan.forEach((row, i) => {
    ws['!rows'].push({ hpt: 18 });
    const style = i % 2 === 0 ? STYLES.dataCell : STYLES.alternateRow;
    row.forEach((val, c) => {
      if (c === 3) {
        svc(ws, r, c, val, { ...STYLES.money, ...style });
      } else {
        svc(ws, r, c, val, style);
      }
    });
    r++;
  });

  // Section: Upah
  ws['!rows'].push({ hpt: 8 });
  ws['!rows'].push({ hpt: 22 });
  merge(ws, r, 0, r, 4);
  svc(ws, r++, 0, 'B. TENAGA KERJA', STYLES.sectionA);

  ws['!rows'].push({ hpt: 22 });
  ['NO', 'JENIS TENAGA', 'SATUAN', 'HARGA SATUAN (RP)', 'KETERANGAN'].forEach((h, c) =>
    svc(ws, r, c, h, STYLES.headerMedium)
  );
  r++;

  const upah = [
    [1, 'Tukang', 'OH', 150000, 'Upah harian'],
    [2, 'Kordinator', 'OH', 130000, 'Upah harian'],
    [3, 'Penjaga Malam', 'OH', 75000, 'Upah harian'],
    [4, 'Pekerja Biasa', 'OH', 95000, 'Upah harian'],
    [5, 'Supir', 'OH', 120000, 'Upah harian'],
    [6, 'Operator Excavator', 'OH', 150000, 'Upah harian']
  ];

  upah.forEach((row, i) => {
    ws['!rows'].push({ hpt: 18 });
    const style = i % 2 === 0 ? STYLES.dataCell : STYLES.alternateRow;
    row.forEach((val, c) => {
      if (c === 3) {
        svc(ws, r, c, val, { ...STYLES.money, ...style });
      } else {
        svc(ws, r, c, val, style);
      }
    });
    r++;
  });

  ws['!cols'] = [
    { wch: 8 }, { wch: 25 }, { wch: 10 }, { wch: 18 }, { wch: 30 }
  ];

  return r;
}

// =====================
// SHEET 3: backup volume rencana (MAIN TABLE)
// =====================

function generateBackupVolumeRencana(ws, rapState) {
  const { geometri } = rapState;
  let r = 0;
  ws['!rows'] = [];

  // Title
  merge(ws, r, 0, r, 8);
  svc(ws, r++, 0, 'BACK UP VOLUME RENCANA PEKERJAAN', STYLES.title);
  ws['!rows'].push({ hpt: 30 }, { hpt: 8 });

  // Kop
  const kopFields = [
    ['PROGRAM', geometri?.kopData?.program || '-'],
    ['KEGIATAN', geometri?.kopData?.kegiatan || '-'],
    ['PEKERJAAN', geometri?.kopData?.pekerjaan || '-'],
    ['LOKASI', geometri?.kopData?.lokasi || '-'],
    ['TAHUN ANGGARAN', String(geometri?.kopData?.tahun || new Date().getFullYear())]
  ];

  kopFields.forEach(([label, value]) => {
    ws['!rows'].push({ hpt: 18 });
    svc(ws, r, 0, `${label}:`, STYLES.labelCell);
    merge(ws, r, 1, r, 8);
    svc(ws, r, 1, value, STYLES.valueCell);
    r++;
  });

  ws['!rows'].push({ hpt: 8 });
  r++;

  // Table header - 2 rows (title + units)
  ws['!rows'].push({ hpt: 30 });
  merge(ws, r, 0, r + 1, 0);
  svc(ws, r, 0, 'NO', STYLES.headerDark);
  merge(ws, r, 1, r + 1, 1);
  svc(ws, r, 1, 'STA', STYLES.headerDark);
  merge(ws, r, 2, r, 3);
  svc(ws, r, 2, 'LEBAR (m)', STYLES.headerDark);
  svc(ws, r, 3, '', STYLES.headerDark);
  merge(ws, r, 4, r, 5);
  svc(ws, r, 4, 'TINGGI (m)', STYLES.headerDark);
  svc(ws, r, 5, '', STYLES.headerDark);
  merge(ws, r, 6, r + 1, 6);
  svc(ws, r, 6, 'LUAS\n(m2)', STYLES.headerDark);
  merge(ws, r, 7, r + 1, 7);
  svc(ws, r, 7, 'VOLUME\n(m3)', STYLES.headerDark);
  merge(ws, r, 8, r + 1, 8);
  svc(ws, r, 8, 'KETERANGAN', STYLES.headerDark);
  r++;

  // Sub-header units
  ws['!rows'].push({ hpt: 22 });
  ['', '', 'b1', 'b2', 'h', "h'", '', '', ''].forEach((h, c) =>
    svc(ws, r, c, h, STYLES.headerLight)
  );
  r++;

  // Data rows
  geometri.stas?.forEach((sta, i) => {
    ws['!rows'].push({ hpt: 18 });
    const style = i % 2 === 0 ? STYLES.dataCell : STYLES.alternateRow;
    svc(ws, r, 0, i + 1, style);
    svc(ws, r, 1, sta.sta, style);
    svc(ws, r, 2, fmt(sta.b1), STYLES.number);
    svc(ws, r, 3, fmt(sta.b2), STYLES.number);
    svc(ws, r, 4, fmt(sta.h), STYLES.number);
    svc(ws, r, 5, fmt(sta.hPrime), STYLES.number);
    svc(ws, r, 6, fmt(sta.luas), STYLES.number);
    svc(ws, r, 7, fmt(sta.volume || 0), { ...STYLES.numberBold });
    svc(ws, r, 8, i === 0 ? 'Baseline' : '-', style);
    r++;
  });

  // Total row
  ws['!rows'].push({ hpt: 24 });
  merge(ws, r, 0, r, 5);
  svc(ws, r, 0, 'TOTAL', STYLES.totalRow);
  svc(ws, r, 6, fmt(geometri.stas?.reduce((a, s) => a + s.luas, 0) || 0), { ...STYLES.totalRow, ...{ alignment: { horizontal: 'right' } } });
  svc(ws, r, 7, fmt(geometri.totalVolume), { ...STYLES.totalRow, ...{ alignment: { horizontal: 'right' } } });
  svc(ws, r, 8, 'M3', STYLES.totalRow);
  r++;

  ws['!cols'] = [
    { wch: 6 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 20 }
  ];

  return r;
}

// =====================
// SHEET 4: ANALISA perencanaan
// =====================

function generateAnalisaPerencanaan(ws, rapState) {
  const { geometri, analisaRencana } = rapState;
  let r = 0;
  ws['!rows'] = [];

  // Title
  merge(ws, r, 0, r, 7);
  svc(ws, r++, 0, 'ANALISA HARGA SATUAN PEKERJAAN', STYLES.title);
  ws['!rows'].push({ hpt: 30 }, { hpt: 8 });

  merge(ws, r, 0, r, 7);
  svc(ws, r++, 0, 'GALIAN TANAH DENGAN EXCAVATOR', STYLES.subtitle);
  ws['!rows'].push({ hpt: 22 });
  ws['!rows'].push({ hpt: 8 });

  // Header columns
  ws['!rows'].push({ hpt: 22 });
  ['NO', 'URAIAN', 'KODE', 'SATUAN', 'NILAI', '', '', 'SATUAN'].forEach((h, c) =>
    svc(ws, r, c, h, STYLES.headerMedium)
  );
  r++;

  // I. ASUMSI
  ws['!rows'].push({ hpt: 20 });
  svc(ws, r, 0, '', STYLES.sectionA);
  merge(ws, r, 0, r, 7);
  svc(ws, r++, 0, 'I. ASUMSI', STYLES.sectionA);

  const asumsi = [
    [1, 'Jam Kerja Efektif per hari', 'Tk', '', 8, '', '', 'Jam'],
    [2, 'Faktor Pengembangan Material', 'Fk', '', 0.8, '', '', ''],
    [3, 'Faktor Operator', 'Fo', '', 1.0, '', '', '']
  ];

  asumsi.forEach((row, i) => {
    ws['!rows'].push({ hpt: 18 });
    const style = i % 2 === 0 ? STYLES.dataCell : STYLES.alternateRow;
    row.forEach((val, c) => {
      if (typeof val === 'number' && c === 4) {
        svc(ws, r, c, val, STYLES.number);
      } else {
        svc(ws, r, c, val, style);
      }
    });
    r++;
  });

  // II. URAIAN PERALATAN
  ws['!rows'].push({ hpt: 8 });
  ws['!rows'].push({ hpt: 20 });
  svc(ws, r, 0, '', STYLES.sectionA);
  merge(ws, r, 0, r, 7);
  svc(ws, r++, 0, 'II. URAIAN PERALATAN DAN HASIL ANALISA', STYLES.sectionA);

  const peralatan = [
    [1, 'Tenaga', 'Pw', '', fmt(analisaRencana.hp), '', '', 'HP'],
    [2, 'Kapasitas Bucket', 'V (Cp)', '', fmt(analisaRencana.bucket), '', '', 'm3'],
    [3, 'Jam Operasi per Tahun', 'W', '', 2000, '', '', 'Jam'],
    [4, 'Faktor Bucket', 'Fb', '', fmt(analisaRencana.fb), '', '', ''],
    [5, 'Faktor Efisiensi Alat', 'Fa', '', fmt(analisaRencana.fa), '', '', ''],
    [6, 'Faktor Konversi Galian', 'Fv', '', fmt(analisaRencana.fv), '', '', ''],
    [7, 'Waktu Siklus', 'T.1', '', fmt(analisaRencana.t1, 4), '', '', 'menit'],
    [8, 'Kap. Produksi/Jam', 'Q1', '', fmt(analisaRencana.q1), '', '', 'm3/jam'],
    [9, 'Kap. Produksi/Hari', 'Q.2', '', fmt(analisaRencana.q2), '', '', 'm3/hari']
  ];

  peralatan.forEach((row, i) => {
    ws['!rows'].push({ hpt: 18 });
    const style = i % 2 === 0 ? STYLES.dataCell : STYLES.alternateRow;
    row.forEach((val, c) => {
      if (typeof val === 'number' && c === 4) {
        svc(ws, r, c, val, STYLES.number);
      } else {
        svc(ws, r, c, val, style);
      }
    });
    r++;
  });

  // III. BIAYA OPERASI
  ws['!rows'].push({ hpt: 8 });
  ws['!rows'].push({ hpt: 20 });
  svc(ws, r, 0, '', STYLES.sectionB);
  merge(ws, r, 0, r, 7);
  svc(ws, r++, 0, 'III. BIAYA OPERASI ALAT (BUA)', STYLES.sectionB);

  const biaya = [
    ['a.', 'Bahan Bakar (Solar)', 'H', '', fmt(analisaRencana.h), '', '', 'Liter/jam'],
    ['b.', 'Pelumas', 'I', '', fmt(analisaRencana.h * 0.05), '', '', 'Liter/jam'],
    ['c.', 'Biaya Operator', 'J', '', fmt(analisaRencana.q1 * 0.2), '', '', '']
  ];

  biaya.forEach((row, i) => {
    ws['!rows'].push({ hpt: 18 });
    const style = i % 2 === 0 ? STYLES.dataCell : STYLES.alternateRow;
    row.forEach((val, c) => {
      if (typeof val === 'number' && c === 4) {
        svc(ws, r, c, val, STYLES.number);
      } else {
        svc(ws, r, c, val, style);
      }
    });
    r++;
  });

  // IV. HASIL ANALISA
  ws['!rows'].push({ hpt: 8 });
  ws['!rows'].push({ hpt: 20 });
  svc(ws, r, 0, '', STYLES.sectionA);
  merge(ws, r, 0, r, 7);
  svc(ws, r++, 0, 'IV. HASIL ANALISA', STYLES.sectionA);

  const hasil = [
    ['H (BBM/Jam)', '', '', fmt(analisaRencana.h), '', '', 'Liter/jam'],
    ['h2 (BBM/Hari)', '', '', fmt(analisaRencana.h2), '', '', 'Liter/hari'],
    ['Estimasi Hari', '', '', Math.ceil(analisaRencana.estimasiHari), '', '', 'Hari'],
    ['Total Solar', '', '', fmt(analisaRencana.totalSolar), '', '', 'Liter']
  ];

  hasil.forEach((row, i) => {
    ws['!rows'].push({ hpt: 18 });
    const style = i % 2 === 0 ? STYLES.dataCell : STYLES.alternateRow;
    row.forEach((val, c) => {
      if (typeof val === 'number' && c === 3) {
        svc(ws, r, c, val, STYLES.number);
      } else {
        svc(ws, r, c, val, style);
      }
    });
    r++;
  });

  ws['!cols'] = [
    { wch: 6 }, { wch: 35 }, { wch: 10 }, { wch: 8 },
    { wch: 14 }, { wch: 6 }, { wch: 6 }, { wch: 12 }
  ];

  return r;
}

// =====================
// SHEET 5: PERSONIL
// =====================

function generatePersonil(ws, rapState) {
  const { geometri, personil, analisaRencana } = rapState;
  let r = 0;
  ws['!rows'] = [];

  merge(ws, r, 0, r, 5);
  svc(ws, r++, 0, 'PERHITUNGAN RENCANA TENAGA KERJA', STYLES.title);
  ws['!rows'].push({ hpt: 30 }, { hpt: 8 });

  const info = [
    ['SUB KEGIATAN', geometri?.kopData?.kegiatan || '-'],
    ['PEKERJAAN', geometri?.kopData?.pekerjaan || '-'],
    ['VOLUME', `${fmt(geometri.totalVolume)} M3`],
    ['ESTIMASI WAKTU', `${personil.durasiHari || Math.ceil(analisaRencana.estimasiHari)} Hari`]
  ];

  info.forEach(([label, value]) => {
    ws['!rows'].push({ hpt: 18 });
    svc(ws, r, 0, label, STYLES.labelCell);
    merge(ws, r, 1, r, 5);
    svc(ws, r, 1, value, STYLES.valueCell);
    r++;
  });

  ws['!rows'].push({ hpt: 8 });
  ws['!rows'].push({ hpt: 22 });
  ['NO', 'URAIAN', 'VOLUME', 'SATUAN', 'HARGA SATUAN', 'JUMLAH'].forEach((h, c) =>
    svc(ws, r, c, h, STYLES.headerMedium)
  );
  r++;

  const tenaga = [
    [1, 'Penjaga Malam 1', personil.penjagaMalam * (personil.durasiHari || 1), 'OH', 75000],
    [2, 'Penjaga Malam 2', personil.penjagaMalam * (personil.durasiHari || 1), 'OH', 75000],
    [3, 'Supir', personil.supir * (personil.durasiHari || 1), 'OH', 120000],
    [4, 'Operator Excavator', personil.operator * (personil.durasiHari || 1), 'OH', 150000],
    [5, 'Pekerja', personil.pekerja * (personil.durasiHari || 1), 'OH', 95000]
  ];

  tenaga.forEach((row, i) => {
    ws['!rows'].push({ hpt: 18 });
    const style = i % 2 === 0 ? STYLES.dataCell : STYLES.alternateRow;
    svc(ws, r, 0, row[0], style);
    svc(ws, r, 1, row[1], style);
    svc(ws, r, 2, row[2], STYLES.number);
    svc(ws, r, 3, row[3], style);
    svc(ws, r, 4, row[4], STYLES.money);
    svc(ws, r, 5, row[2] * row[4], STYLES.moneyBold);
    r++;
  });

  ws['!cols'] = [
    { wch: 8 }, { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 20 }
  ];

  return r;
}

// =====================
// SHEET 6: RAB PERSONIL
// =====================

function generateRabPersonil(ws, rapState) {
  const { personil, rabPersonil } = rapState;
  let r = 0;
  ws['!rows'] = [];

  merge(ws, r, 0, r, 5);
  svc(ws, r++, 0, 'RENCANA ANGGARAN BIAYA PERSONIL', STYLES.title);
  ws['!rows'].push({ hpt: 30 }, { hpt: 8 });

  ws['!rows'].push({ hpt: 22 });
  svc(ws, r, 0, 'A. TENAGA KERJA', STYLES.sectionA);
  merge(ws, r, 0, r, 5);
  r++;

  ws['!rows'].push({ hpt: 22 });
  ['NO', 'URAIAN', 'VOLUME', 'SATUAN', 'HARGA SATUAN', 'JUMLAH'].forEach((h, c) =>
    svc(ws, r, c, h, STYLES.headerMedium)
  );
  r++;

  const pm = 75000;
  const sup = 120000;
  const op = 150000;
  const pk = 95000;
  const dur = personil.durasiHari || 1;

  const rows = [
    [1, 'Penjaga Malam 1', dur, 'Hari', pm, dur * pm],
    [2, 'Penjaga Malam 2', dur, 'Hari', pm, dur * pm],
    [3, 'Supir', dur, 'Hari', sup, dur * sup],
    [4, 'Operator Excavator', dur, 'Hari', op, dur * op],
    [5, 'Pekerja', dur, 'Hari', pk, dur * pk]
  ];

  rows.forEach((row, i) => {
    ws['!rows'].push({ hpt: 18 });
    const style = i % 2 === 0 ? STYLES.dataCell : STYLES.alternateRow;
    svc(ws, r, 0, row[0], style);
    svc(ws, r, 1, row[1], style);
    svc(ws, r, 2, row[2], STYLES.number);
    svc(ws, r, 3, row[3], style);
    svc(ws, r, 4, row[4], STYLES.money);
    svc(ws, r, 5, row[5], STYLES.moneyBold);
    r++;
  });

  ws['!rows'].push({ hpt: 18 });
  merge(ws, r, 0, r, 4);
  svc(ws, r, 0, 'Sub Total', STYLES.subHeader);
  svc(ws, r, 5, rabPersonil.subtotalTenaga, STYLES.moneyBold);
  r++;

  ws['!rows'].push({ hpt: 8 });
  ws['!rows'].push({ hpt: 22 });
  svc(ws, r, 0, 'B. BAHAN', STYLES.sectionA);
  merge(ws, r, 0, r, 5);
  r++;

  ws['!rows'].push({ hpt: 22 });
  ['NO', 'URAIAN', 'VOLUME', 'SATUAN', 'HARGA SATUAN', 'JUMLAH'].forEach((h, c) =>
    svc(ws, r, c, h, STYLES.headerMedium)
  );
  r++;

  ws['!rows'].push({ hpt: 18 });
  svc(ws, r, 0, 1, STYLES.dataCell);
  svc(ws, r, 1, 'Solar', STYLES.dataCell);
  svc(ws, r, 2, personil.kebutuhanSolar, STYLES.number);
  svc(ws, r, 3, 'Liter', STYLES.dataCell);
  svc(ws, r, 4, 22300, STYLES.money);
  svc(ws, r, 5, personil.kebutuhanSolar * 22300, STYLES.moneyBold);
  r++;

  ws['!rows'].push({ hpt: 18 });
  merge(ws, r, 0, r, 4);
  svc(ws, r, 0, 'Sub Total', STYLES.subHeader);
  svc(ws, r, 5, rabPersonil.subtotalBahan, STYLES.moneyBold);
  r++;

  ws['!rows'].push({ hpt: 22 });
  merge(ws, r, 0, r, 4);
  svc(ws, r, 0, 'TOTAL SEBELUM PPN', STYLES.subHeader);
  svc(ws, r++, 5, rabPersonil.sebelumPPN, STYLES.moneyBold);

  ws['!rows'].push({ hpt: 22 });
  merge(ws, r, 0, r, 4);
  svc(ws, r, 0, 'PPN 12%', STYLES.ppnRow);
  svc(ws, r++, 5, rabPersonil.ppn12, STYLES.ppnRow);

  ws['!rows'].push({ hpt: 28 });
  merge(ws, r, 0, r, 4);
  svc(ws, r, 0, 'TOTAL RAB PERSONIL', STYLES.grandTotal);
  svc(ws, r, 5, rabPersonil.pembulatan, { ...STYLES.grandTotal, ...{ alignment: { horizontal: 'right' } } });

  ws['!cols'] = [
    { wch: 8 }, { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 20 }
  ];

  return r;
}

// =====================
// SHEET 7: RAB PEKERJAAN
// =====================

function generateRabPekerjaan(ws, rapState) {
  const { geometri, personil, rabFinal, analisaRencana } = rapState;
  let r = 0;
  ws['!rows'] = [];

  merge(ws, r, 0, r, 5);
  svc(ws, r++, 0, 'RENCANA ANGGARAN BIAYA PEKERJAAN', STYLES.title);
  ws['!rows'].push({ hpt: 30 }, { hpt: 8 });

  const info = [
    ['KEGIATAN', geometri?.kopData?.kegiatan || '-'],
    ['PEKERJAAN', geometri?.kopData?.pekerjaan || '-'],
    ['ESTIMASI WAKTU', `${Math.ceil(analisaRencana.estimasiHari)} Hari`]
  ];

  info.forEach(([label, value]) => {
    ws['!rows'].push({ hpt: 18 });
    svc(ws, r, 0, label, STYLES.labelCell);
    merge(ws, r, 1, r, 5);
    svc(ws, r, 1, value, STYLES.valueCell);
    r++;
  });

  ws['!rows'].push({ hpt: 8 });
  ws['!rows'].push({ hpt: 22 });
  svc(ws, r, 0, 'A. PEKERJAAN TANAH', STYLES.sectionA);
  merge(ws, r, 0, r, 5);
  r++;

  ws['!rows'].push({ hpt: 22 });
  ['NO', 'URAIAN', 'VOLUME', 'SATUAN', 'HARGA SATUAN', 'JUMLAH'].forEach((h, c) =>
    svc(ws, r, c, h, STYLES.headerMedium)
  );
  r++;

  ws['!rows'].push({ hpt: 22 });
  svc(ws, r, 0, 1, STYLES.dataCell);
  svc(ws, r, 1, 'Galian + Menimbun dengan Excavator', STYLES.dataCellLeft);
  svc(ws, r, 2, fmt(geometri.totalVolume), STYLES.number);
  svc(ws, r, 3, 'M3', STYLES.dataCell);
  svc(ws, r, 4, fmtRp(rabFinal.hargaPPN), STYLES.money);
  svc(ws, r, 5, fmtRp(rabFinal.grandTotal), STYLES.moneyBold);
  r++;

  ws['!rows'].push({ hpt: 22 });
  const totalTenaga = (personil.penjagaMalam * 2 + personil.supir + personil.operator + personil.pekerja) * (personil.durasiHari || 1) * 100000;
  svc(ws, r, 0, 2, STYLES.dataCell);
  svc(ws, r, 1, 'Jasa Keamanan (2 Orang)', STYLES.dataCellLeft);
  svc(ws, r, 2, (personil.penjagaMalam * 2) * (personil.durasiHari || 1), STYLES.number);
  svc(ws, r, 3, 'OH', STYLES.dataCell);
  svc(ws, r, 4, 84000, STYLES.money);
  svc(ws, r, 5, (personil.penjagaMalam * 2) * (personil.durasiHari || 1) * 84000, STYLES.moneyBold);
  r++;

  ws['!rows'].push({ hpt: 24 });
  merge(ws, r, 0, r, 4);
  svc(ws, r, 0, 'TOTAL', STYLES.totalRow);
  svc(ws, r++, 5, fmtRp(rabFinal.grandTotal + (personil.penjagaMalam * 2) * (personil.durasiHari || 1) * 84000), { ...STYLES.totalRow, ...{ alignment: { horizontal: 'right' } } });

  ws['!rows'].push({ hpt: 8 });
  ws['!rows'].push({ hpt: 24 });
  merge(ws, r, 0, r, 4);
  svc(ws, r, 0, 'B. TOTAL RAB', STYLES.grandTotal);
  svc(ws, r++, 5, fmtRp(rabFinal.grandTotal), { ...STYLES.grandTotal, ...{ alignment: { horizontal: 'right' } } });

  ws['!rows'].push({ hpt: 22 });
  merge(ws, r, 0, r, 4);
  svc(ws, r, 0, 'PAGU ANGGARAN', STYLES.subHeader);
  svc(ws, r++, 5, fmtRp(rabFinal.pagu), STYLES.moneyBold);

  ws['!rows'].push({ hpt: 22 });
  merge(ws, r, 0, r, 4);
  const sisaStyle = rabFinal.sisaPagu >= 0 ? { ...STYLES.subHeader, ...{ fill: { fgColor: { rgb: 'D4EDDA' } }, font: { bold: true, color: { rgb: '155724' }, sz: 11 } } } : { ...STYLES.subHeader, ...{ fill: { fgColor: { rgb: 'F8D7DA' } }, font: { bold: true, color: { rgb: '721C24' }, sz: 11 } } };
  svc(ws, r, 0, 'SISA PAGU', sisaStyle);
  svc(ws, r++, 5, fmtRp(rabFinal.sisaPagu), sisaStyle);

  ws['!cols'] = [
    { wch: 8 }, { wch: 35 }, { wch: 14 }, { wch: 10 }, { wch: 18 }, { wch: 20 }
  ];

  return r;
}

// =====================
// SHEET 8: ANALISA pelaksanaan
// =====================

function generateAnalisaPelaksanaan(ws, rapState) {
  const { verifikasi, analisaRencana } = rapState;
  let r = 0;
  ws['!rows'] = [];

  merge(ws, r, 0, r, 7);
  svc(ws, r++, 0, 'ANALISA HARGA SATUAN - PELAKSANAAN', STYLES.title);
  ws['!rows'].push({ hpt: 30 }, { hpt: 8 });

  merge(ws, r, 0, r, 7);
  svc(ws, r++, 0, 'GALIAN TANAH DENGAN EXCAVATOR (VERIFIKASI)', STYLES.subtitle);
  ws['!rows'].push({ hpt: 22 });
  ws['!rows'].push({ hpt: 8 });

  ws['!rows'].push({ hpt: 22 });
  ['NO', 'URAIAN', 'KODE', 'SATUAN', 'NILAI', '', '', 'SATUAN'].forEach((h, c) =>
    svc(ws, r, c, h, STYLES.headerMedium)
  );
  r++;

  ws['!rows'].push({ hpt: 20 });
  svc(ws, r, 0, '', STYLES.sectionA);
  merge(ws, r, 0, r, 7);
  svc(ws, r++, 0, 'I. ASUMSI', STYLES.sectionA);

  ws['!rows'].push({ hpt: 18 });
  [[1, 'Jam Kerja Efektif per hari', 'Tk', 8, 'Jam'], [2, 'Faktor Pengembangan', 'Fk', 0.8, '']].forEach(row => {
    svc(ws, r, 0, row[0], STYLES.dataCell);
    svc(ws, r, 1, row[1], STYLES.dataCellLeft);
    svc(ws, r, 2, row[2], STYLES.dataCell);
    svc(ws, r, 3, row[3], STYLES.number);
    r++;
  });

  ws['!rows'].push({ hpt: 8 });
  ws['!rows'].push({ hpt: 20 });
  svc(ws, r, 0, '', STYLES.sectionB);
  merge(ws, r, 0, r, 7);
  svc(ws, r++, 0, 'II. HASIL VERIFIKASI', STYLES.sectionB);

  ws['!rows'].push({ hpt: 18 });
  svc(ws, r, 0, 1, STYLES.dataCell);
  svc(ws, r, 1, 'T.1 Rencana', STYLES.dataCellLeft);
  svc(ws, r, 3, '', STYLES.dataCell);
  svc(ws, r++, 4, fmt(analisaRencana.t1, 4), STYLES.number);

  ws['!rows'].push({ hpt: 18 });
  svc(ws, r, 0, 2, STYLES.dataCell);
  svc(ws, r, 1, 'T.1 Verifikasi (Lapangan)', STYLES.dataCellLeft);
  svc(ws, r, 3, '', STYLES.dataCell);
  svc(ws, r++, 4, fmt(verifikasi.t1, 4), STYLES.number);

  ws['!rows'].push({ hpt: 18 });
  svc(ws, r, 0, 3, STYLES.dataCell);
  svc(ws, r, 1, 'Status', STYLES.dataCellLeft);
  svc(ws, r, 3, '', STYLES.dataCell);
  svc(ws, r++, 4, verifikasi.status || 'WAJAR', STYLES.dataCell);

  ws['!rows'].push({ hpt: 18 });
  svc(ws, r, 0, 4, STYLES.dataCell);
  svc(ws, r, 1, 'Range SNI Min', STYLES.dataCellLeft);
  svc(ws, r, 3, '', STYLES.dataCell);
  svc(ws, r++, 4, fmt(verifikasi.sniMin, 2), STYLES.number);

  ws['!rows'].push({ hpt: 18 });
  svc(ws, r, 0, 5, STYLES.dataCell);
  svc(ws, r, 1, 'Range SNI Max', STYLES.dataCellLeft);
  svc(ws, r, 3, '', STYLES.dataCell);
  svc(ws, r++, 4, fmt(verifikasi.sniMax, 2), STYLES.number);

  ws['!cols'] = [
    { wch: 6 }, { wch: 35 }, { wch: 10 }, { wch: 8 }, { wch: 14 }, { wch: 6 }, { wch: 6 }, { wch: 12 }
  ];

  return r;
}

// =====================
// SHEET 9: Kebutuhan realistas
// =====================

function generateKebutuhanRealisasi(ws, rapState) {
  const { kebutuhanRealisasi, geometri } = rapState;
  let r = 0;
  ws['!rows'] = [];

  merge(ws, r, 0, r, 10);
  svc(ws, r++, 0, 'RINCIAN KEBUTUHAN DAN HASIL PELAKSANAAN', STYLES.title);
  ws['!rows'].push({ hpt: 30 }, { hpt: 8 });

  const info = [
    ['SUB KEGIATAN', geometri?.kopData?.kegiatan || '-'],
    ['PEKERJAAN', geometri?.kopData?.pekerjaan || '-'],
    ['LOKASI', geometri?.kopData?.lokasi || '-']
  ];

  info.forEach(([label, value]) => {
    ws['!rows'].push({ hpt: 18 });
    svc(ws, r, 0, label, STYLES.labelCell);
    merge(ws, r, 1, r, 10);
    svc(ws, r, 1, value, STYLES.valueCell);
    r++;
  });

  ws['!rows'].push({ hpt: 8 });
  ws['!rows'].push({ hpt: 28 });
  const headers = ['NO', 'TGL', 'BLN', 'THN', 'JAM\nKERJA', 'GALIAN/\nJAM', 'GALIAN/\nHARI', 'BBM/\nJAM', 'BBM/\nHARI', 'DITERIMA', 'SISA'];
  headers.forEach((h, c) => svc(ws, r, c, h, STYLES.headerMedium));
  r++;

  let totalGalian = 0;
  let totalBBM = 0;

  kebutuhanRealisasi.dailyData?.forEach((d, i) => {
    const tgl = new Date(d.tanggal);
    ws['!rows'].push({ hpt: 18 });
    const style = i % 2 === 0 ? STYLES.dataCell : STYLES.alternateRow;
    svc(ws, r, 0, i + 1, style);
    svc(ws, r, 1, tgl.getDate(), style);
    svc(ws, r, 2, tgl.toLocaleString('id-ID', { month: 'short' }), style);
    svc(ws, r, 3, tgl.getFullYear(), style);
    svc(ws, r, 4, fmt(d.jam), STYLES.number);
    svc(ws, r, 5, fmt(d.q1), STYLES.number);
    svc(ws, r, 6, fmt(d.galian), STYLES.number);
    svc(ws, r, 7, fmt(d.bbmJam), STYLES.number);
    svc(ws, r, 8, fmt(d.bbmHarian), STYLES.number);
    svc(ws, r, 9, d.diterima || 0, STYLES.number);
    svc(ws, r, 10, fmt(d.sisa), STYLES.number);
    totalGalian += d.galian || 0;
    totalBBM += d.bbmHarian || 0;
    r++;
  });

  // Total
  ws['!rows'].push({ hpt: 22 });
  merge(ws, r, 0, r, 5);
  svc(ws, r, 0, 'TOTAL', STYLES.totalRow);
  svc(ws, r, 6, fmt(totalGalian), { ...STYLES.totalRow, ...{ alignment: { horizontal: 'right' } } });
  svc(ws, r, 8, fmt(totalBBM), { ...STYLES.totalRow, ...{ alignment: { horizontal: 'right' } } });
  svc(ws, r++, 10, fmt(kebutuhanRealisasi.sisaAkhir || 0), { ...STYLES.totalRow, ...{ alignment: { horizontal: 'right' } } });

  ws['!cols'] = [
    { wch: 6 }, { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 10 },
    { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 10 }
  ];

  return r;
}

// =====================
// SHEET 10: backup volume Pelaksanaan
// =====================

function generateBackupVolumePelaksanaan(ws, rapState) {
  const { backupPelaksanaan, geometri } = rapState;
  let r = 0;
  ws['!rows'] = [];

  merge(ws, r, 0, r, 8);
  svc(ws, r++, 0, 'BACK UP VOLUME PELAKSANAAN', STYLES.title);
  ws['!rows'].push({ hpt: 30 }, { hpt: 8 });

  const info = [
    ['PROGRAM', geometri?.kopData?.program || '-'],
    ['KEGIATAN', geometri?.kopData?.kegiatan || '-'],
    ['PEKERJAAN', geometri?.kopData?.pekerjaan || '-'],
    ['LOKASI', geometri?.kopData?.lokasi || '-']
  ];

  info.forEach(([label, value]) => {
    ws['!rows'].push({ hpt: 18 });
    svc(ws, r, 0, label, STYLES.labelCell);
    merge(ws, r, 1, r, 8);
    svc(ws, r, 1, value, STYLES.valueCell);
    r++;
  });

  ws['!rows'].push({ hpt: 8 });
  ws['!rows'].push({ hpt: 22 });
  ['NO', 'STA', 'b1', 'b2', 'b3', 'h', "h'", 'LUAS', 'VOLUME'].forEach((h, c) =>
    svc(ws, r, c, h, STYLES.headerMedium)
  );
  r++;

  const stas = backupPelaksanaan.stas?.length > 0 ? backupPelaksanaan.stas : geometri.stas;

  stas?.forEach((sta, i) => {
    ws['!rows'].push({ hpt: 18 });
    const style = i % 2 === 0 ? STYLES.dataCell : STYLES.alternateRow;
    svc(ws, r, 0, i + 1, style);
    svc(ws, r, 1, sta.sta, style);
    svc(ws, r, 2, fmt(sta.b1), STYLES.number);
    svc(ws, r, 3, fmt(sta.b2), STYLES.number);
    svc(ws, r, 4, fmt(sta.b3 || (sta.b1 + 2 * (sta.h || 1))), STYLES.number);
    svc(ws, r, 5, fmt(sta.h), STYLES.number);
    svc(ws, r, 6, fmt(sta.hPrime || 0), STYLES.number);
    svc(ws, r, 7, fmt(sta.luas || 0), STYLES.number);
    svc(ws, r, 8, fmt(sta.volume || 0), STYLES.numberBold);
    r++;
  });

  ws['!rows'].push({ hpt: 22 });
  merge(ws, r, 0, r, 6);
  svc(ws, r, 0, 'TOTAL', STYLES.totalRow);
  svc(ws, r, 7, fmt(stas?.reduce((a, s) => a + (s.luas || 0), 0) || 0), { ...STYLES.totalRow, ...{ alignment: { horizontal: 'right' } } });
  svc(ws, r++, 8, fmt(backupPelaksanaan.totalVolume || geometri.totalVolume), { ...STYLES.totalRow, ...{ alignment: { horizontal: 'right' } } });

  ws['!cols'] = [
    { wch: 6 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 14 }
  ];

  return r;
}

// =====================
// SHEET 11: PERSONIL pelaksanaan
// =====================

function generatePersonilPelaksanaan(ws, rapState) {
  return generatePersonil(ws, rapState); // reuse
}

// =====================
// SHEET 12: RAB PERSONIL PELAKSANAAN
// =====================

function generateRabPersonilPelaksanaan(ws, rapState) {
  return generateRabPersonil(ws, rapState); // reuse with slight modification
}

// =====================
// SHEET 13: RAB PELAKSANAAN
// =====================

function generateRabPelaksanaan(ws, rapState) {
  const { geometri, backupPelaksanaan, personil, rabFinal } = rapState;
  let r = 0;
  ws['!rows'] = [];

  merge(ws, r, 0, r, 5);
  svc(ws, r++, 0, 'REALISASI ANGGARAN PELAKSANAAN', STYLES.title);
  ws['!rows'].push({ hpt: 30 }, { hpt: 8 });

  const info = [
    ['KEGIATAN', geometri?.kopData?.kegiatan || '-'],
    ['PEKERJAAN', geometri?.kopData?.pekerjaan || '-'],
    ['LOKASI', geometri?.kopData?.lokasi || '-'],
    ['ESTIMASI WAKTU', `${personil.durasiHari || 0} Hari`]
  ];

  info.forEach(([label, value]) => {
    ws['!rows'].push({ hpt: 18 });
    svc(ws, r, 0, label, STYLES.labelCell);
    merge(ws, r, 1, r, 5);
    svc(ws, r, 1, value, STYLES.valueCell);
    r++;
  });

  ws['!rows'].push({ hpt: 8 });
  ws['!rows'].push({ hpt: 22 });
  svc(ws, r, 0, 'A. PEKERJAAN TANAH', STYLES.sectionA);
  merge(ws, r, 0, r, 5);
  r++;

  ws['!rows'].push({ hpt: 22 });
  ['NO', 'URAIAN', 'VOLUME', 'SATUAN', 'HARGA SATUAN', 'JUMLAH'].forEach((h, c) =>
    svc(ws, r, c, h, STYLES.headerMedium)
  );
  r++;

  const volume = backupPelaksanaan.totalVolume || geometri.totalVolume;

  ws['!rows'].push({ hpt: 22 });
  svc(ws, r, 0, 1, STYLES.dataCell);
  svc(ws, r, 1, 'Galian + Menimbun dengan Excavator', STYLES.dataCellLeft);
  svc(ws, r, 2, fmt(volume), STYLES.number);
  svc(ws, r, 3, 'M3', STYLES.dataCell);
  svc(ws, r, 4, fmtRp(rabFinal.hargaPPN), STYLES.money);
  svc(ws, r, 5, fmtRp(volume * rabFinal.hargaPPN), STYLES.moneyBold);
  r++;

  ws['!rows'].push({ hpt: 22 });
  merge(ws, r, 0, r, 4);
  svc(ws, r, 0, 'TOTAL', STYLES.totalRow);
  svc(ws, r++, 5, fmtRp(volume * rabFinal.hargaPPN), { ...STYLES.totalRow, ...{ alignment: { horizontal: 'right' } } });

  ws['!rows'].push({ hpt: 8 });
  ws['!rows'].push({ hpt: 24 });
  merge(ws, r, 0, r, 4);
  svc(ws, r, 0, 'PAGU ANGGARAN', STYLES.subHeader);
  svc(ws, r++, 5, fmtRp(rabFinal.pagu), STYLES.moneyBold);

  const sisaPelaksanaan = rabFinal.pagu - (volume * rabFinal.hargaPPN);
  ws['!rows'].push({ hpt: 22 });
  merge(ws, r, 0, r, 4);
  svc(ws, r, 0, 'SISA PAGU', STYLES.subHeader);
  svc(ws, r++, 5, fmtRp(sisaPelaksanaan), STYLES.moneyBold);

  ws['!cols'] = [
    { wch: 8 }, { wch: 35 }, { wch: 14 }, { wch: 10 }, { wch: 18 }, { wch: 20 }
  ];

  return r;
}

// =====================
// SHEET 14: Backup Galian (Detail)
// =====================

function generateBackupGalian(ws, rapState) {
  const { geometri } = rapState;
  let r = 0;
  ws['!rows'] = [];

  merge(ws, r, 0, r, 5);
  svc(ws, r++, 0, 'BACK UP GALIAN (DETAIL)', STYLES.title);
  ws['!rows'].push({ hpt: 30 }, { hpt: 8 });

  const info = [
    ['PEKERJAAN', 'Galian tanah menggunakan Excavator'],
    ['SATUAN', 'M3']
  ];

  info.forEach(([label, value]) => {
    ws['!rows'].push({ hpt: 18 });
    svc(ws, r, 0, label, STYLES.labelCell);
    merge(ws, r, 1, r, 5);
    svc(ws, r, 1, value, STYLES.valueCell);
    r++;
  });

  ws['!rows'].push({ hpt: 8 });
  ws['!rows'].push({ hpt: 22 });
  ['NO', 'STA', 'VOLUME (M3)', 'KETERANGAN', '', ''].forEach((h, c) =>
    svc(ws, r, c, h, STYLES.headerMedium)
  );
  r++;

  geometri.stas?.forEach((sta, i) => {
    ws['!rows'].push({ hpt: 18 });
    const style = i % 2 === 0 ? STYLES.dataCell : STYLES.alternateRow;
    svc(ws, r, 0, i + 1, style);
    svc(ws, r, 1, sta.sta, style);
    svc(ws, r, 2, fmt(sta.volume || 0), STYLES.number);
    svc(ws, r, 3, i === 0 ? 'Baseline' : '-', style);
    r++;
  });

  ws['!rows'].push({ hpt: 22 });
  merge(ws, r, 0, r, 1);
  svc(ws, r, 0, 'TOTAL', STYLES.totalRow);
  svc(ws, r++, 2, fmt(geometri.totalVolume), { ...STYLES.totalRow, ...{ alignment: { horizontal: 'right' } } });

  ws['!cols'] = [
    { wch: 8 }, { wch: 20 }, { wch: 18 }, { wch: 30 }, { wch: 10 }, { wch: 10 }
  ];

  return r;
}

// =====================
// SHEET 15: ELEVASI
// =====================

function generateElevasi(ws, rapState) {
  const { geometri, backupPelaksanaan } = rapState;
  let r = 0;
  ws['!rows'] = [];

  merge(ws, r, 0, r, 4);
  svc(ws, r++, 0, 'DATA ELEVASI', STYLES.title);
  ws['!rows'].push({ hpt: 30 }, { hpt: 8 });

  const stas = backupPelaksanaan.stas?.length > 0 ? backupPelaksanaan.stas : geometri.stas;

  ws['!rows'].push({ hpt: 22 });
  ['STA', 'ELEVASI DATUM (M)', 'ELEVASI EKSISTING (M)', 'ELEVASI RENCANA (M)', 'BEDA ELEVASI (M)'].forEach((h, c) =>
    svc(ws, r, c, h, STYLES.headerMedium)
  );
  r++;

  stas?.forEach((sta, i) => {
    ws['!rows'].push({ hpt: 18 });
    const style = i % 2 === 0 ? STYLES.dataCell : STYLES.alternateRow;
    const elevDatum = 40 + i * 0.5;
    const elevExist = sta.hPrime || 2.5;
    const elevRencana = sta.h || 1;
    const beda = elevExist - elevRencana;
    svc(ws, r, 0, sta.sta, style);
    svc(ws, r, 1, elevDatum.toFixed(3), STYLES.number);
    svc(ws, r, 2, elevExist.toFixed(3), STYLES.number);
    svc(ws, r, 3, elevRencana.toFixed(3), STYLES.number);
    svc(ws, r, 4, beda.toFixed(3), STYLES.number);
    r++;
  });

  ws['!cols'] = [
    { wch: 15 }, { wch: 20 }, { wch: 22 }, { wch: 22 }, { wch: 18 }
  ];

  return r;
}

// =====================
// MAIN EXPORT FUNCTION
// =====================

export async function generateFullExcelWorkbook(rapState) {
  const wb = XLSX.utils.book_new();

  const addSheet = (generator, name) => {
    const ws = XLSX.utils.aoa_to_sheet([]);
    generator(ws, rapState);
    XLSX.utils.book_append_sheet(wb, ws, name);
  };

  addSheet(generateBackupGalian2, 'Backup Galian (2)');
  addSheet(generateBahanUpah, 'Bahan Upah');
  addSheet(generateBackupVolumeRencana, 'backup volume rencana');
  addSheet(generateAnalisaPerencanaan, 'ANALISA perencanaan');
  addSheet(generatePersonil, 'PERSONIL');
  addSheet(generateRabPersonil, 'RAB PERSONIL');
  addSheet(generateRabPekerjaan, 'RAB PEKERJAAN');
  addSheet(generateAnalisaPelaksanaan, 'ANALISA pelaksanaan');
  addSheet(generateKebutuhanRealisasi, 'Kebutuhan  realismo');
  addSheet(generateBackupVolumePelaksanaan, 'backup volume Pelaksanaan');
  addSheet(generatePersonilPelaksanaan, 'PERSONIL pelaksanaan');
  addSheet(generateRabPersonilPelaksanaan, 'RAB PERSONIL PELAKSANAAN');
  addSheet(generateRabPelaksanaan, 'RAB PELAKSANAAN');
  addSheet(generateBackupGalian, 'Backup Galian');
  addSheet(generateElevasi, 'ELEVASI');

  return wb;
}

export async function downloadExcel(rapState, filename = 'RAP_Export.xlsx') {
  const wb = await generateFullExcelWorkbook(rapState);
  XLSX.writeFile(wb, filename);
}

export function getSheetNames() {
  return [
    'Backup Galian (2)', 'Bahan Upah', 'backup volume rencana',
    'ANALISA perencanaan', 'PERSONIL', 'RAB PERSONIL', 'RAB PEKERJAAN',
    'ANALISA pelaksanaan', 'Kebutuhan  realismo', 'backup volume Pelaksanaan',
    'PERSONIL pelaksanaan', 'RAB PERSONIL PELAKSANAAN', 'RAB PELAKSANAAN',
    'Backup Galian', 'ELEVASI'
  ];
}
