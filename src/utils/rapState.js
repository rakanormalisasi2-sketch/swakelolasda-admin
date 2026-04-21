'use client';
import { useState, useEffect } from 'react';

/**
 * rapState.js
 * State Management untuk Modul RAP
 *
 * Centralized state management dengan localStorage persistence
 * Mengikuti struktur dari FINAL_IMPLEMENTATION_PLAN.md Section 4
 */

/**
 * Default state untuk RAP
 */
export const DEFAULT_RAP_STATE = {
  // Tab Navigation
  activeTab: 'tab1',

  // Tab 1: Geometri
  geometri: {
    panjang: 500,
    b1: 4.0,
    b2: 2.857,
    b3: 6.857,
    h: 1.0,
    hPrime: 2.5,
    slope: 1,
    lebarStripping: 3.0,
    kedalamanStripping: 0.1,
    stas: [],
    totalVolume: 0,
    totalStripping: 0,
    kopData: {
      program: 'PROGRAM PENGELOLAAN SUMBER DAYA AIR (SDA)',
      kegiatan: 'PENGELOLAAN SDA DAN BANGUNAN PENGAMAN PANTAI PADA WILAYAH SUNGAI LINTAS DAERAH KABUPATEN/KOTA',
      pekerjaan: '',
      lokasi: '',
      tahun: new Date().getFullYear(),
      kode_gambar: 'NS-01'
    }
  },

  // Tab 2: Excavator
  analisaRencana: {
    selectedAlat: 'PC200',
    hp: 148,
    bucket: 0.9,
    fb: 1.0,
    fa: 0.7,
    fv: 0.8,
    fk: 0.8,
    loadFactor: 0.28,
    feMenit: 45,
    waktuGali: 38,
    t1: 0.659,
    fd: 0.96,
    q1: 89.57,
    q2: 716.60,
    h: 22.90,
    h2: 183.21,
    koefBBM: 0.2557,
    estimasiHari: 10,
    totalSolar: 1734.50
  },

  // Tab 3: Kebutuhan Realisasi
  kebutuhanRealisasi: {
    selectedAssignment: null,
    dailyData: [],
    totalGalian: 0,
    totalBBMterpakai: 0,
    sisaAkhir: 0,
    sisaTarget: 70  // Target sisa 70 liter
  },

  // Tab 4: Verifikasi
  verifikasi: {
    t1: 0,
    fd: 0,
    q1: 0,
    h: 0,
    dalamRange: false,
    status: '',
    warning: null,
    sniMin: 0.31,
    sniMax: 0.66,
    sniStandar: 0.659
  },

  // Tab 5: Backup Pelaksanaan
  backupPelaksanaan: {
    stas: [],
    totalVolume: 0
  },

  // Tab 6: Personil
  personil: {
    durasiHari: 0,
    totalHOK: 0,
    kebutuhanSolar: 0,
    koefPM: 0
  },

  // Tab 7: RAB Personil
  rabPersonil: {
    subtotal: 0,
    ppn12: 0,
    total: 0,
    pembulatan: 0
  },

  // Tab 8: RAB Final
  rabFinal: {
    hargaSatuan: 5701.51,
    hargaPPN: 6385.69,
    volume: 0,
    grandTotal: 0,
    pagu: 3600000000,
    sisaPagu: 0
  },

  // Tab 9: TTD
  ttd: {
    kpaNama: 'JAFAR SODIQ, ST, MM',
    kpaNip: '19760818 200312 1 005',
    pptkNama: 'GALUH SETIAWAN ROSMI, ST',
    pptkNip: '19790511 200312 1 006'
  }
};

/**
 * Storage keys untuk localStorage
 */
export const STORAGE_KEYS = {
  RAP_STATE: 'rap_state',
  RAP_TTD: 'rap_ttd_default',
  RAP_KOP_DATA: 'rap_kop_data'
};

/**
 * Load RAP state dari localStorage
 */
export function loadRapState() {
  if (typeof window === 'undefined') return DEFAULT_RAP_STATE;

  try {
    const saved = localStorage.getItem(STORAGE_KEYS.RAP_STATE);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge dengan default untuk handle field baru
      return { ...DEFAULT_RAP_STATE, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load RAP state:', e);
  }
  return DEFAULT_RAP_STATE;
}

/**
 * Save RAP state ke localStorage
 */
export function saveRapState(state) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEYS.RAP_STATE, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save RAP state:', e);
  }
}

/**
 * Load TTD dari localStorage
 */
export function loadTTD() {
  if (typeof window === 'undefined') return DEFAULT_RAP_STATE.ttd;

  try {
    const saved = localStorage.getItem(STORAGE_KEYS.RAP_TTD);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to load TTD:', e);
  }
  return DEFAULT_RAP_STATE.ttd;
}

/**
 * Save TTD ke localStorage
 */
export function saveTTD(ttd) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEYS.RAP_TTD, JSON.stringify(ttd));
  } catch (e) {
    console.warn('Failed to save TTD:', e);
  }
}

/**
 * Custom hook untuk RAP state management
 */
export function useRapState() {
  const [state, setState] = useState(DEFAULT_RAP_STATE);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const loaded = loadRapState();
    setState(loaded);

    // Load TTD separately
    const savedTtd = loadTTD();
    setState(prev => ({ ...prev, ttd: savedTtd }));

    setIsLoaded(true);
  }, []);

  // Auto-save on state change
  useEffect(() => {
    if (isLoaded) {
      saveRapState(state);
    }
  }, [state, isLoaded]);

  // Auto-save TTD
  useEffect(() => {
    if (isLoaded) {
      saveTTD(state.ttd);
    }
  }, [state.ttd, isLoaded]);

  return { state, setState, isLoaded };
}

/**
 * Reset RAP state ke default
 */
export function resetRapState() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(STORAGE_KEYS.RAP_STATE);
  localStorage.removeItem(STORAGE_KEYS.RAP_KOP_DATA);
  // Keep TTD
}

/**
 * Generate snapshot untuk export
 */
export function generateRapSnapshot(state) {
  return {
    timestamp: new Date().toISOString(),
    geometri: state.geometri,
    analisaRencana: state.analisaRencana,
    kebutuhanRealisasi: state.kebutuhanRealisasi,
    verifikasi: state.verifikasi,
    backupPelaksanaan: state.backupPelaksanaan,
    personil: state.personil,
    rabPersonil: state.rabPersonil,
    rabFinal: state.rabFinal,
    ttd: state.ttd
  };
}