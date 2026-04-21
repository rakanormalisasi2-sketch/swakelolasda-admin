'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import CrossSectionSVG from '@/components/CrossSectionSVG';
import {
  MASTER_EXCAVATOR_SPECS,
  calculateAnalisaRencana,
  goalSeekSisaBBM,
  goalSeekT1Verifikasi,
  generateSTAPerencanaan,
  generateSTAPelaksanaan
} from '@/utils/calcRapMath';
import { downloadExcel } from '@/utils/rapExport';
import { printCrossSections } from '@/utils/rapPrint';

// Tab Configuration - Government Style
const TABS = [
  { id: 'tab1', label: 'Dimensi', icon: '📐', title: 'DIMENSI SALURAN' },
  { id: 'tab2', label: 'Alat', icon: '⚙️', title: 'SPESIFIKASI EXCAVATOR' },
  { id: 'tab3', label: 'Realisasi', icon: '📋', title: 'DATA REALISASI' },
  { id: 'tab4', label: 'Verifikasi', icon: '✓', title: 'VERIFIKASI ANALISA' },
  { id: 'tab5', label: 'Volume', icon: '📊', title: 'VOLUME PELAKSANAAN' },
  { id: 'tab6', label: 'Personil', icon: '👷', title: 'TENAGA KERJA' },
  { id: 'tab7', label: 'RAB Personil', icon: '💰', title: 'RAB PERSONIL' },
  { id: 'tab8', label: 'RAB Final', icon: '📄', title: 'RAB AKHIR' },
  { id: 'tab9', label: 'TTD', icon: '🖊️', title: 'TANDA TANGAN' }
];

const DEFAULT_TTD = {
  kpaNama: 'JAFAR SODIQ, ST, MM',
  kpaNip: '19760818 200312 1 005',
  pptkNama: 'GALUH SETIAWAN ROSMI, ST',
  pptkNip: '19790511 200312 1 006'
};

// Professional Government Header Component
function GovernmentHeader({ onExport, onPrint }) {
  return (
    <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 shadow-xl">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Logo Badge */}
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-slate-800" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">PERHITUNGAN RAP</h1>
              <p className="text-slate-300 text-sm">Normalisasi Sungai - Swakelola SDA</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Export Button */}
            <button
              onClick={onExport}
              className="group relative px-5 py-2.5 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-all shadow-lg hover:shadow-xl overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Excel
              </span>
            </button>

            {/* Print Button */}
            <button
              onClick={onPrint}
              className="group relative px-5 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-all shadow-lg hover:shadow-xl overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Gambar
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Decorative Bottom Border */}
      <div className="h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-blue-500" />
    </div>
  );
}

// Professional Tab Navigation
function TabNavigation({ tabs, activeTab, onTabChange }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-2 flex gap-1 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all duration-300 whitespace-nowrap
            ${activeTab === tab.id
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg scale-[1.02]'
              : 'hover:bg-slate-50 text-slate-600 hover:text-slate-800'}`}
        >
          <span className="text-lg">{tab.icon}</span>
          <span className="font-semibold text-sm">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

// Professional Card Component with Header Bar
function ProfessionalCard({ title, subtitle, children, headerColor = 'slate' }) {
  const headerClasses = {
    slate: 'bg-gradient-to-r from-slate-700 to-slate-800',
    blue: 'bg-gradient-to-r from-blue-600 to-blue-700',
    emerald: 'bg-gradient-to-r from-emerald-600 to-emerald-700',
    violet: 'bg-gradient-to-r from-violet-600 to-violet-700',
    amber: 'bg-gradient-to-r from-amber-600 to-amber-700',
    rose: 'bg-gradient-to-r from-rose-600 to-rose-700'
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <div className={`px-6 py-4 ${headerClasses[headerColor]}`}>
        <div className="flex items-center gap-3">
          <div className="w-1 h-10 bg-white/30 rounded-full" />
          <div>
            <h3 className="text-white font-bold text-lg">{title}</h3>
            {subtitle && <p className="text-white/70 text-sm">{subtitle}</p>}
          </div>
        </div>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

// Input Field Component - Government Style
function GovernmentInput({ label, value, onChange, unit, help, error, icon, variant = 'default' }) {
  const variants = {
    default: 'border-slate-200 focus:border-blue-500',
    success: 'border-emerald-200 bg-emerald-50 focus:border-emerald-500',
    warning: 'border-amber-200 bg-amber-50 focus:border-amber-500',
    danger: 'border-red-200 bg-red-50 focus:border-red-500'
  };

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
        {icon && <span className="text-blue-500">{icon}</span>}
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`w-full px-4 py-3.5 rounded-xl border-2 transition-all duration-200
            ${variants[error ? 'danger' : variant]}
            text-lg font-semibold text-slate-800 outline-none
            placeholder:text-slate-400
            hover:border-slate-300 focus:ring-4 focus:ring-blue-500/10`}
        />
        {unit && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
            {unit}
          </span>
        )}
      </div>
      {help && !error && <p className="text-xs text-slate-500 ml-1">{help}</p>}
      {error && <p className="text-xs text-red-600 ml-1 font-medium flex items-center gap-1">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0v-4a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        {error}
      </p>}
    </div>
  );
}

// Stat Card Component
function StatCard({ label, value, unit, icon, color = 'blue' }) {
  const colors = {
    blue: { bg: 'from-blue-50 to-blue-100', border: 'border-blue-200', text: 'text-blue-600' },
    emerald: { bg: 'from-emerald-50 to-emerald-100', border: 'border-emerald-200', text: 'text-emerald-600' },
    violet: { bg: 'from-violet-50 to-violet-100', border: 'border-violet-200', text: 'text-violet-600' },
    amber: { bg: 'from-amber-50 to-amber-100', border: 'border-amber-200', text: 'text-amber-600' },
    slate: { bg: 'from-slate-50 to-slate-100', border: 'border-slate-200', text: 'text-slate-600' }
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color].bg} rounded-xl p-4 border ${colors[color].border} text-center`}>
      <div className={`text-3xl font-bold ${colors[color].text}`}>{value}</div>
      <div className="text-sm font-medium text-slate-600 mt-1">{unit}</div>
      <div className="text-xs text-slate-500 mt-1 uppercase tracking-wide">{label}</div>
    </div>
  );
}

// Dimension Diagram Component
function DimensionDiagram({ b1, b2, b3, h, slope }) {
  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
      <div className="flex items-center justify-center">
        <svg width="320" height="200" className="drop-shadow-sm">
          {/* Background */}
          <rect x="0" y="0" width="320" height="200" fill="white" rx="8" />

          {/* Ground surface line */}
          <line x1="30" y1="35" x2="290" y2="35" stroke="#94a3b8" strokeWidth="3" strokeDasharray="8,4" />

          {/* Trapezoid body */}
          <polygon
            points="45,35 85,165 235,165 275,35"
            fill="#e0f2fe"
            stroke="#0369a1"
            strokeWidth="2.5"
          />

          {/* Left talud line */}
          <line x1="45" y1="35" x2="85" y2="165" stroke="#0369a1" strokeWidth="2" />

          {/* Right talud line */}
          <line x1="275" y1="35" x2="235" y2="165" stroke="#0369a1" strokeWidth="2" />

          {/* Bottom line (b1) */}
          <line x1="85" y1="165" x2="235" y2="165" stroke="#059669" strokeWidth="4" />

          {/* h dimension line */}
          <line x1="255" y1="35" x2="255" y2="165" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="5,3" />
          <line x1="248" y1="35" x2="262" y2="35" stroke="#7c3aed" strokeWidth="2" />
          <line x1="248" y1="165" x2="262" y2="165" stroke="#7c3aed" strokeWidth="2" />

          {/* Dimension text */}
          <text x="270" y="105" fontSize="12" fill="#7c3aed" fontWeight="bold">h</text>
          <text x="272" y="118" fontSize="10" fill="#7c3aed">{h.toFixed(2)}m</text>

          {/* b1 label */}
          <text x="160" y="190" fontSize="14" fill="#059669" fontWeight="bold" textAnchor="middle">b₁ = {b1.toFixed(2)}m</text>

          {/* b3 label */}
          <text x="160" y="25" fontSize="14" fill="#0369a1" fontWeight="bold" textAnchor="middle">b₃ = {b3.toFixed(2)}m</text>

          {/* Slope indicators */}
          <text x="20" y="90" fontSize="9" fill="#64748b">1:{slope}</text>
          <text x="280" y="90" fontSize="9" fill="#64748b">1:{slope}</text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 justify-center">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200">
          <div className="w-4 h-1 bg-emerald-500 rounded" />
          <span className="text-sm font-medium text-slate-600">b₁ = Dasar Saluran</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200">
          <div className="w-4 h-1 bg-cyan-500 rounded" />
          <span className="text-sm font-medium text-slate-600">b₃ = Muka Tanah</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200">
          <div className="w-4 h-1 bg-violet-500 rounded" />
          <span className="text-sm font-medium text-slate-600">h = Kedalaman</span>
        </div>
      </div>
    </div>
  );
}

// Excavator Selection Card
function ExcavatorCard({ type, spec, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border-2 transition-all duration-300 text-left w-full
        ${isSelected
          ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg scale-[1.02]'
          : 'border-slate-200 hover:border-slate-300 bg-white hover:shadow-md'}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`font-bold text-xl ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
          {type}
        </span>
        {isSelected && (
          <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
          <span className="text-sm text-slate-500">Power</span>
          <span className={`font-bold ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>{spec.hp} HP</span>
        </div>
        <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
          <span className="text-sm text-slate-500">Bucket</span>
          <span className={`font-bold ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>{spec.bucket} m³</span>
        </div>
        <div className="flex justify-between items-center py-1.5">
          <span className="text-sm text-slate-500">Efisiensi</span>
          <span className={`font-bold ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>{spec.fa}</span>
        </div>
      </div>
    </button>
  );
}

// Alert Banner Component
function AlertBanner({ type = 'warning', title, message }) {
  const styles = {
    warning: 'from-amber-50 to-orange-50 border-amber-300',
    info: 'from-blue-50 to-indigo-50 border-blue-300',
    success: 'from-emerald-50 to-teal-50 border-emerald-300',
    danger: 'from-red-50 to-rose-50 border-red-300'
  };

  const icons = {
    warning: (
      <svg className="w-6 h-6 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    info: (
      <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
    success: (
      <svg className="w-6 h-6 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    danger: (
      <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    )
  };

  return (
    <div className={`bg-gradient-to-r ${styles[type]} border rounded-xl p-4 flex items-start gap-4`}>
      {icons[type]}
      <div>
        <h4 className="font-bold text-slate-800">{title}</h4>
        <p className="text-sm text-slate-600 mt-1">{message}</p>
      </div>
    </div>
  );
}

// Main Page Component
export default function PerhitunganRapPage() {
  // State
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tab1');

  // Tab 1: Geometri
  const [geometri, setGeometri] = useState({
    panjang: 500,
    b1: 4.0,
    b2: 2.857,
    b3: 6.857,
    h: 1.0,
    hPrime: 2.5,
    slope: 1,
    stas: [],
    totalVolume: 0,
    kopData: {
      program: 'PROGRAM PENGELOLAAN SUMBER DAYA AIR (SDA)',
      kegiatan: 'PENGELOLAAN SDA DAN BANGUNAN PENGAMAN PANTAI PADA WILAYAH SUNGAI',
      pekerjaan: '',
      lokasi: '',
      tahun: new Date().getFullYear()
    }
  });

  // Tab 2: Excavator & Analisa
  const [selectedAlat, setSelectedAlat] = useState('PC200');
  const [analisaRencana, setAnalisaRencana] = useState({
    hp: 148,
    bucket: 0.93,
    fb: 0.90,
    fa: 0.83,
    fv: 1.0,
    fk: 0.8,
    loadFactor: 0.28,
    waktuGali: 38,
    t1: 0.659,
    q1: 89.57,
    q2: 716.60,
    h: 22.90,
    estimasiHari: 10,
    totalSolar: 1734.50
  });

  // Tab 3: Kebutuhan Realisasi
  const [assignments, setAssignments] = useState([]);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [kebutuhanRealisasi, setKebutuhanRealisasi] = useState({
    selectedAssignment: null,
    dailyData: [],
    totalGalian: 0,
    totalBBMterpakai: 0,
    sisaAkhir: 0,
    sisaTarget: 70
  });

  // Tab 4: Verifikasi
  const [verifikasi, setVerifikasi] = useState({
    t1: 0,
    dalamRange: false,
    status: '',
    warning: null
  });

  // Tab 5: Backup Pelaksanaan
  const [backupPelaksanaan, setBackupPelaksanaan] = useState({
    stas: [],
    totalVolume: 0
  });

  // Tab 6-8: Personil & RAB
  const [personil, setPersonil] = useState({ durasiHari: 0, totalHOK: 0, kebutuhanSolar: 0 });
  const [rabPersonil, setRabPersonil] = useState({ subtotal: 0, ppn12: 0, total: 0, pembulatan: 0 });
  const [rabFinal, setRabFinal] = useState({ hargaSatuan: 5701.51, hargaPPN: 6385.69, grandTotal: 0, pagu: 3600000000, sisaPagu: 0 });
  const [ttd, setTtd] = useState(DEFAULT_TTD);

  // Calculate STA when geometri changes
  useEffect(() => {
    const { stas, totalVolume } = generateSTAPerencanaan(
      geometri.panjang, geometri.b1, geometri.b3, geometri.h, geometri.hPrime, geometri.slope
    );
    setGeometri(prev => ({ ...prev, stas, totalVolume }));
  }, [geometri.panjang, geometri.b1, geometri.b3, geometri.h, geometri.hPrime, geometri.slope]);

  // Handle Export Excel
  const handleExportExcel = async () => {
    const rapState = {
      geometri,
      analisaRencana,
      kebutuhanRealisasi,
      verifikasi,
      backupPelaksanaan,
      personil,
      rabPersonil,
      rabFinal,
      ttd
    };
    const filename = `RAP_${geometri.kopData?.pekerjaan?.replace(/\s+/g, '_') || 'Perhitungan'}_${new Date().toISOString().slice(0,10)}.xlsx`;
    await downloadExcel(rapState, filename);
  };

  // Handle Print
  const handlePrint = () => {
    printCrossSections({ geometri, backupPelaksanaan });
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-600 font-medium">Memuat Data...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100">
      {/* Header */}
      <GovernmentHeader onExport={handleExportExcel} onPrint={handlePrint} />

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-6 py-5">
        <TabNavigation tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 pb-10">
        {/* TAB 1: GEOMETRI */}
        {activeTab === 'tab1' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Alert Banner */}
            <AlertBanner
              type="warning"
              title="Perhatian!"
              message="Jangan mengisi nilai sembarangan! Gunakan hasil pengukuran lapangan dan standar yang berlaku sesuai SE DJBK No.47 Tahun 2026."
            />

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Input Form */}
              <ProfessionalCard title="DIMENSI SALURAN" subtitle="Ukuran penampang melintang sungai" headerColor="blue">
                <div className="grid grid-cols-2 gap-5">
                  <GovernmentInput
                    label="Panjang Total"
                    value={geometri.panjang}
                    onChange={(v) => setGeometri({...geometri, panjang: v})}
                    unit="m"
                    help=" STA 0+000 sampai STA akhir"
                    icon="📏"
                  />
                  <GovernmentInput
                    label="b₁ Lebar Dasar"
                    value={geometri.b1}
                    onChange={(v) => setGeometri({...geometri, b1: v})}
                    unit="m"
                    help="Di DASAR saluran (paling sempit)"
                    icon="📐"
                  />
                  <GovernmentInput
                    label="b₂ Lebar Tengah"
                    value={geometri.b2}
                    onChange={(v) => setGeometri({...geometri, b2: v})}
                    unit="m"
                    help="Auto: b₁ + 2×(slope×h)"
                    icon="📏"
                  />
                  <GovernmentInput
                    label="b₃ Lebar Muka Tanah"
                    value={geometri.b3}
                    onChange={(v) => setGeometri({...geometri, b3: v})}
                    unit="m"
                    help="Di MUKA TANAH (paling lebar)"
                    icon="📐"
                  />
                  <GovernmentInput
                    label="h Kedalaman Galian"
                    value={geometri.h}
                    onChange={(v) => setGeometri({...geometri, h: v})}
                    unit="m"
                    error={geometri.h > 5 ? '> 5m - perlu pertimbangan khusus' : null}
                    icon="⬇️"
                  />
                  <GovernmentInput
                    label="h' Tinggi Air Eksisting"
                    value={geometri.hPrime}
                    onChange={(v) => setGeometri({...geometri, hPrime: v})}
                    unit="m"
                    help="Kedalaman air eksisting"
                    icon="〰️"
                  />
                  <div className="col-span-2">
                    <GovernmentInput
                      label="Slope (Talud)"
                      value={geometri.slope}
                      onChange={(v) => setGeometri({...geometri, slope: v})}
                      unit="1:n"
                      error={(geometri.slope < 0.5 || geometri.slope > 3) ? 'Di luar range normal (0.5-3)' : null}
                      icon="📊"
                    />
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <StatCard label="Total Volume" value={geometri.totalVolume.toFixed(2)} unit="m³" color="blue" />
                  <StatCard label="Jumlah STA" value={geometri.stas.length} unit=" STA" color="emerald" />
                  <StatCard label="Luas Rata-rata" value={
                    geometri.stas.length > 0 ? (geometri.totalVolume / geometri.stas.length / (geometri.panjang / geometri.stas.length)).toFixed(2) : '0'
                  } unit="m²" color="violet" />
                </div>
              </ProfessionalCard>

              {/* Diagram */}
              <ProfessionalCard title="DIAGRAM PENAMPANG" subtitle="Trapesium sama kaki terbalik" headerColor="emerald">
                <DimensionDiagram
                  b1={geometri.b1}
                  b2={geometri.b2}
                  b3={geometri.b3}
                  h={geometri.h}
                  slope={geometri.slope}
                />
              </ProfessionalCard>
            </div>

            {/* STA Table */}
            <ProfessionalCard title="DATA STA (Station)" subtitle="5 titik stasiun otomatis" headerColor="violet">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-100 to-slate-200">
                      <th className="px-5 py-3 text-left font-bold text-slate-700">STA</th>
                      <th className="px-5 py-3 text-right font-bold text-slate-700">b₁ (m)</th>
                      <th className="px-5 py-3 text-right font-bold text-slate-700">b₂ (m)</th>
                      <th className="px-5 py-3 text-right font-bold text-slate-700">b₃ (m)</th>
                      <th className="px-5 py-3 text-right font-bold text-slate-700">h (m)</th>
                      <th className="px-5 py-3 text-right font-bold text-slate-700">Luas (m²)</th>
                      <th className="px-5 py-3 text-right font-bold text-slate-700">Volume (m³)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {geometri.stas.map((sta, i) => (
                      <tr key={i} className={`border-b border-slate-100 ${i === 0 ? 'bg-blue-50/50' : ''}`}>
                        <td className="px-5 py-3 font-semibold">{sta.sta}{i === 0 && <span className="ml-2 text-blue-500 font-bold">★</span>}</td>
                        <td className="px-5 py-3 text-right">{sta.b1.toFixed(3)}</td>
                        <td className="px-5 py-3 text-right">{sta.b2.toFixed(3)}</td>
                        <td className="px-5 py-3 text-right">{sta.b3.toFixed(3)}</td>
                        <td className="px-5 py-3 text-right">{sta.h.toFixed(3)}</td>
                        <td className="px-5 py-3 text-right">{sta.luas.toFixed(3)}</td>
                        <td className="px-5 py-3 text-right font-bold text-blue-600">{(sta.volume || 0).toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gradient-to-r from-slate-800 to-slate-900 text-white font-bold">
                      <td className="px-5 py-3">TOTAL</td>
                      <td colSpan={5} className="px-5 py-3 text-right">Total Volume:</td>
                      <td className="px-5 py-3 text-right text-emerald-400">{geometri.totalVolume.toFixed(3)} m³</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </ProfessionalCard>

            {/* Cross Section Preview */}
            <ProfessionalCard title="PREVIEW GAMBAR CROSS SECTION" subtitle="5 STA Perencanaan" headerColor="amber">
              <div className="flex gap-5 overflow-x-auto pb-4">
                {geometri.stas.map((sta, i) => (
                  <div key={i} className="flex-shrink-0">
                    <div className="text-center font-bold text-sm mb-3 text-slate-600 bg-slate-50 rounded-lg py-2 px-3">
                      STA {sta.sta} {i === 0 && <span className="text-blue-500 ml-1">(Baseline)</span>}
                    </div>
                    <div className="border-2 border-slate-300 rounded-xl overflow-hidden bg-white shadow-inner">
                      <CrossSectionSVG
                        staData={{
                          dimensi: { b1: sta.b1, b2: sta.b2, b3: sta.b3, h: sta.h, hPrime: sta.hPrime, slope: geometri.slope },
                          luasGalian: sta.luas
                        }}
                        kopData={{
                          ...geometri.kopData,
                          sta: sta.sta,
                          noLembar: i + 1,
                          jumlahLembar: geometri.stas.length,
                          jenis: 'PERENCANAAN'
                        }}
                        width={340}
                        height={260}
                        showKop={true}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ProfessionalCard>
          </div>
        )}

        {/* TAB 2: EXCAVATOR */}
        {activeTab === 'tab2' && (
          <div className="space-y-6 animate-fadeIn">
            {/* SNI Reference Banner */}
            <AlertBanner
              type="info"
              title="Referensi SNI (SE DJBK No.47 Tahun 2026)"
              message="Gunakan nilai sesuai Tabel A.10-A.13 untuk hasil perhitungan yang valid"
            />

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Excavator Selection */}
              <ProfessionalCard title="PILIH EXCAVATOR" subtitle="Pilih jenis alat berdasarkan spesifikasi" headerColor="emerald">
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(MASTER_EXCAVATOR_SPECS).map(([key, spec]) => (
                    <ExcavatorCard
                      key={key}
                      type={key}
                      spec={spec}
                      isSelected={selectedAlat === key}
                      onClick={() => {
                        setSelectedAlat(key);
                        setAnalisaRencana(prev => ({
                          ...prev,
                          hp: spec.hp,
                          bucket: spec.bucket,
                          fa: spec.fa,
                          fb: 1.0,
                          loadFactor: spec.loadFactor || 0.28
                        }));
                      }}
                    />
                  ))}
                </div>
              </ProfessionalCard>

              {/* Parameter Input */}
              <ProfessionalCard title="PARAMETER ANALISA" subtitle="Faktor-faktor perhitungan sesuai SNI" headerColor="blue">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <GovernmentInput
                      label="HP (Horse Power)"
                      value={analisaRencana.hp}
                      onChange={(v) => setAnalisaRencana({...analisaRencana, hp: v})}
                      unit="HP"
                      icon="⚡"
                    />
                  </div>
                  <GovernmentInput
                    label="Bucket Capacity"
                    value={analisaRencana.bucket}
                    onChange={(v) => setAnalisaRencana({...analisaRencana, bucket: v})}
                    unit="m³"
                    icon="🪣"
                  />
                  <GovernmentInput
                    label="Fb (Faktor Bucket)"
                    value={analisaRencana.fb}
                    onChange={(v) => setAnalisaRencana({...analisaRencana, fb: v})}
                    help="Tabel A.10: 0.80-1.00"
                    icon="📊"
                  />
                  <GovernmentInput
                    label="Fa (Faktor Efisiensi)"
                    value={analisaRencana.fa}
                    onChange={(v) => setAnalisaRencana({...analisaRencana, fa: v})}
                    help="Tabel A.13: 0.67-0.90"
                    icon="⚙️"
                  />
                  <GovernmentInput
                    label="Fv (Faktor Konversi)"
                    value={analisaRencana.fv}
                    onChange={(v) => setAnalisaRencana({...analisaRencana, fv: v})}
                    help="Tabel A.12: 0.85-1.00"
                    icon="🔄"
                  />
                  <GovernmentInput
                    label="Load Factor"
                    value={analisaRencana.loadFactor}
                    onChange={(v) => setAnalisaRencana({...analisaRencana, loadFactor: v})}
                    help="Untuk perhitungan BBM"
                    icon="⛽"
                  />
                  <GovernmentInput
                    label="Waktu Gali"
                    value={analisaRencana.waktuGali}
                    onChange={(v) => setAnalisaRencana({...analisaRencana, waktuGali: v})}
                    unit="detik"
                    help="Waktu siklus (Tabel A.11)"
                    icon="⏱️"
                  />
                </div>
              </ProfessionalCard>
            </div>

            {/* Results */}
            <ProfessionalCard title="HASIL PERHITUNGAN ANALISA" subtitle="Kapasitas produksi dan estimasi" headerColor="violet">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="T.1 (Waktu Siklus)" value={analisaRencana.t1.toFixed(4)} unit="menit" color="blue" />
                <StatCard label="Q1 (Kap. Per Jam)" value={analisaRencana.q1.toFixed(2)} unit="m³/jam" color="emerald" />
                <StatCard label="Q2 (Kap. Per Hari)" value={analisaRencana.q2.toFixed(2)} unit="m³/hari" color="violet" />
                <StatCard label="H (Konsumsi BBM)" value={analisaRencana.h.toFixed(2)} unit="L/jam" color="amber" />
              </div>

              <div className="grid grid-cols-3 gap-4 mt-5">
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-5 text-center border border-slate-200">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Estimasi Hari</p>
                  <p className="text-4xl font-bold text-slate-700 mt-2">{analisaRencana.estimasiHari}</p>
                  <p className="text-sm text-slate-500">hari</p>
                </div>
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-5 text-center border border-slate-200">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total Solar</p>
                  <p className="text-4xl font-bold text-slate-700 mt-2">{analisaRencana.totalSolar.toFixed(0)}</p>
                  <p className="text-sm text-slate-500">liter</p>
                </div>
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-5 text-center border border-slate-200">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">H2 (Per Hari)</p>
                  <p className="text-4xl font-bold text-slate-700 mt-2">{analisaRencana.h2.toFixed(0)}</p>
                  <p className="text-sm text-slate-500">liter/hari</p>
                </div>
              </div>
            </ProfessionalCard>
          </div>
        )}

        {/* TAB 3-9: Simplified for now */}
        {(activeTab === 'tab3' || activeTab === 'tab4' || activeTab === 'tab5' || activeTab === 'tab6' || activeTab === 'tab7' || activeTab === 'tab8' || activeTab === 'tab9') && (
          <ProfessionalCard
            title={TABS.find(t => t.id === activeTab)?.title || ''}
            subtitle="Modul dalam pengembangan"
            headerColor="slate"
          >
            <div className="text-center py-16 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
              <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🔧</span>
              </div>
              <p className="text-slate-500 text-lg font-medium">Modul ini masih dalam pengembangan</p>
              <p className="text-slate-400 text-sm mt-2">Lengkapi tab sebelumnya terlebih dahulu</p>
            </div>
          </ProfessionalCard>
        )}
      </div>

      {/* Sync Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-[600px] max-h-[80vh] overflow-auto shadow-2xl">
            <h3 className="font-bold text-lg mb-4">Pilih Penugasan</h3>
            {assignments.length === 0 ? (
              <p className="text-slate-500 py-8 text-center">Tidak ada data penugasan.</p>
            ) : (
              <div className="space-y-2">
                {assignments.map(a => (
                  <div key={a.id} className="border rounded-xl p-4 hover:bg-slate-50 cursor-pointer transition-all hover:border-blue-300 hover:shadow-md">
                    <p className="font-semibold">{a.nama_pekerjaan || 'Pekerjaan'}</p>
                    <p className="text-sm text-slate-500">{new Date(a.tanggal).toLocaleDateString('id-ID')}</p>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowSyncModal(false)}
              className="mt-4 px-5 py-2.5 bg-slate-200 rounded-xl hover:bg-slate-300 transition-all font-medium"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}