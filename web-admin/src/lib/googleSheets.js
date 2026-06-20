/**
 * GOOGLE SHEETS INTEGRATION MODULE (Client-Side)
 * 
 * Menggunakan fetch API langsung ke Google Sheets v4
 * API Key: AIzaSyAVFx43gqYBfuFLHQ2RXbdjA9eRmbM9izE
 * 
 * Fitur:
 * - Export data per seksi ke Google Sheets
 * - Setiap seksi punya sheet sendiri
 */

const GOOGLE_SHEETS_API_KEY = 'AIzaSyAVFx43gqYBfuFLHQ2RXbdjA9eRmbM9izE';

const SECTION_CONFIG = {
  normalisasi: {
    name: 'Seksi Normalisasi',
    description: 'Laporan Normalisasi Sungai & Saluran Irigasi',
    sheets: { penugasan: 'Penugasan', progress: 'Progress', absensi: 'Absensi', peralatan: 'Peralatan' }
  },
  embung: {
    name: 'Seksi Embung',
    description: 'Laporan Pelaksanaan Embung',
    sheets: { penugasan: 'Penugasan', progress: 'Progress', absensi: 'Absensi', peralatan: 'Peralatan' }
  },
  peralatan: {
    name: 'Tim Peralatan',
    description: 'Laporan Peralatan & Pemeliharaan',
    sheets: { equipment: 'Daftar Alat', maintenance: 'Maintenance', penggunaan: 'Penggunaan' }
  }
};

export function getSectionSpreadsheet(section) {
  const stored = localStorage.getItem('sheets_' + section);
  return stored ? JSON.parse(stored) : null;
}

export function saveSectionSpreadsheet(section, spreadsheetId, spreadsheetUrl) {
  const config = { spreadsheetId, spreadsheetUrl, updatedAt: new Date().toISOString() };
  localStorage.setItem('sheets_' + section, JSON.stringify(config));
  return config;
}

export function disconnectSectionSheets(section) {
  localStorage.removeItem('sheets_' + section);
}

export function getAllSections() {
  return Object.entries(SECTION_CONFIG).map(([key, value]) => ({ id: key, ...value }));
}

function formatDateForSheets(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

async function writeToSheet(spreadsheetId, range, values) {
  try {
    const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets/' + spreadsheetId + '/values/' + range, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: values })
    });
    const data = await response.json();
    return { success: response.ok, updatedCells: data.totalUpdatedCells || 0 };
  } catch (error) {
    console.error('[GoogleSheets] Write failed:', error);
    return { success: false, error: error.message };
  }
}

export async function createSectionSpreadsheet(section, title) {
  try {
    const sectionConfig = SECTION_CONFIG[section];
    const sheets = Object.values(sectionConfig.sheets).map(name => ({ properties: { title: name } }));
    
    const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        properties: { title: title || sectionConfig.name + ' - ' + new Date().toLocaleDateString('id-ID'), locale: 'id_ID' },
        sheets: sheets
      })
    });
    
    const data = await response.json();
    if (data.spreadsheetId) {
      const saved = saveSectionSpreadsheet(section, data.spreadsheetId, data.spreadsheetUrl);
      return { success: true, spreadsheetId: data.spreadsheetId, spreadsheetUrl: data.spreadsheetUrl, saved };
    }
    return { success: false, error: data.error?.message || 'Failed to create spreadsheet' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function convertToRows(data, columns) {
  const rows = [columns.map(c => c.label)];
  data.forEach(item => {
    const row = columns.map(col => {
      const val = col.getValue ? col.getValue(item) : (item[col.key] || '');
      return col.format === 'date' ? formatDateForSheets(val) : val;
    });
    rows.push(row);
  });
  return rows;
}

const ASSIGNMENT_COLS = [
  { key: 'id', label: 'ID' },
  { key: 'operator_name', label: 'Operator', getValue: (item) => item.operator?.full_name || item.operator_name || '' },
  { key: 'helper_name', label: 'Helper', getValue: (item) => item.helper?.full_name || '-' },
  { key: 'equipment_name', label: 'Alat Berat', getValue: (item) => item.equipment?.name || item.equipment_name || '' },
  { key: 'merk_type', label: 'Merk/Tipe', getValue: (item) => item.equipment?.merk_type || item.merk_type || '' },
  { key: 'nomor_lambung', label: 'No. Lambung', getValue: (item) => item.equipment?.nomor_lambung || item.nomor_lambung || '' },
  { key: 'job_type', label: 'Jenis Pekerjaan' },
  { key: 'job_sub_type', label: 'Rincian' },
  { key: 'location_district', label: 'Kecamatan' },
  { key: 'location_village', label: 'Desa' },
  { key: 'start_date', label: 'Tanggal Mulai', format: 'date' }
];

const EQUIPMENT_COLS = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Nama Alat' },
  { key: 'merk_type', label: 'Merk/Tipe' },
  { key: 'nomor_lambung', label: 'No. Lambung' },
  { key: 'status', label: 'Status' },
  { key: 'condition_percentage', label: 'Kondisi (%)' }
];

const ABSENSI_COLS = [
  { key: 'id', label: 'ID' },
  { key: 'user_name', label: 'Nama', getValue: (item) => item.user?.full_name || item.user_name || '' },
  { key: 'tanggal', label: 'Tanggal', format: 'date' },
  { key: 'check_in_time', label: 'Jam Masuk' },
  { key: 'check_out_time', label: 'Jam Pulang' },
  { key: 'location', label: 'Lokasi' },
  { key: 'status', label: 'Status' }
];

export async function exportSectionToGoogleSheets(section, data, spreadsheetId) {
  try {
    const results = [];
    const sheetConfig = SECTION_CONFIG[section];
    
    if (data.assignments && data.assignments.length > 0) {
      const filtered = section === 'peralatan' ? data.assignments : data.assignments.filter(a => {
        if (section === 'normalisasi') return a.created_by_role === 'seksi_normalisasi';
        if (section === 'embung') return a.created_by_role === 'seksi_embung';
        return true;
      });
      const rows = convertToRows(filtered, ASSIGNMENT_COLS);
      const result = await writeToSheet(spreadsheetId, sheetConfig.sheets.penugasan + '!A1', rows);
      results.push({ sheet: 'Penugasan', ...result });
    }
    
    if (data.equipment && data.equipment.length > 0) {
      const rows = convertToRows(data.equipment, EQUIPMENT_COLS);
      const result = await writeToSheet(spreadsheetId, sheetConfig.sheets.peralatan + '!A1', rows);
      results.push({ sheet: 'Peralatan', ...result });
    }
    
    if (data.absensi && data.absensi.length > 0) {
      const rows = convertToRows(data.absensi, ABSENSI_COLS);
      const result = await writeToSheet(spreadsheetId, sheetConfig.sheets.absensi + '!A1', rows);
      results.push({ sheet: 'Absensi', ...result });
    }
    
    return { success: true, results, spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/' + spreadsheetId };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
