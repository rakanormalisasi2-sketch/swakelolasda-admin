'use client';
import React, { useState, useEffect, useCallback } from 'react';
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
import { DimensionTooltipModal, EXCAVATOR_TOOLTIPS } from '@/utils/DimensionTooltips';
import { DIMENSION_TOOLTIPS } from '@/utils/DimensionTooltips';

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
  pptkNip: '19790511 200312 1 006',
  pptkJabatan: 'PPTK'
};

const fmt = (num, dec = 3) => Number(num?.toFixed(dec) || 0);
const fmtRp = (num) => Number(num?.toFixed(0) || 0);

function HelpBtn({ tooltipKey, type = 'dimension', onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-6 h-6 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 text-xs font-bold flex items-center justify-center transition-all hover:scale-110 shadow-sm"
      title="Panduan"
    >
      ?
    </button>
  );
}

function GovernmentHeader({ onExport, onPrint }) {
  return (
    <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 shadow-xl">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
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
      <div className="h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-blue-500" />
    </div>
  );
}

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

function GovernmentInput({ label, value, onChange, unit, help, error, icon, variant = 'default', tooltipKey, onHelpClick }) {
  const variants = {
    default: 'border-slate-200 focus:border-blue-500',
    success: 'border-emerald-200 bg-emerald-50 focus:border-emerald-500',
    warning: 'border-amber-200 bg-amber-50 focus:border-amber-500',
    danger: 'border-red-200 bg-red-50 focus:border-red-500'
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        {icon && <span className="text-blue-500">{icon}</span>}
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">{label}</label>
        {onHelpClick && (
          <HelpBtn onClick={onHelpClick} tooltipKey={tooltipKey} />
        )}
      </div>
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

function StatCard({ label, value, unit, icon, color = 'blue' }) {
  const colors = {
    blue: { bg: 'from-blue-50 to-blue-100', border: 'border-blue-200', text: 'text-blue-600' },
    emerald: { bg: 'from-emerald-50 to-emerald-100', border: 'border-emerald-200', text: 'text-emerald-600' },
    violet: { bg: 'from-violet-50 to-violet-100', border: 'border-violet-200', text: 'text-violet-600' },
    amber: { bg: 'from-amber-50 to-amber-100', border: 'border-amber-200', text: 'text-amber-600' },
    slate: { bg: 'from-slate-50 to-slate-100', border: 'border-slate-200', text: 'text-slate-600' },
    rose: { bg: 'from-rose-50 to-rose-100', border: 'border-rose-200', text: 'text-rose-600' }
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color].bg} rounded-xl p-4 border ${colors[color].border} text-center`}>
      <div className={`text-3xl font-bold ${colors[color].text}`}>{value}</div>
      <div className="text-sm font-medium text-slate-600 mt-1">{unit}</div>
      <div className="text-xs text-slate-500 mt-1 uppercase tracking-wide">{label}</div>
    </div>
  );
}

function AlertBanner({ type = 'warning', title, message }) {
  const styles = {
    warning: 'from-amber-50 to-orange-50 border-amber-300',
    info: 'from-blue-50 to-indigo-50 border-blue-300',
    success: 'from-emerald-50 to-teal-50 border-emerald-300',
    danger: 'from-red-50 to-rose-50 border-red-300'
  };

  const icons = {
    warning: <svg className="w-6 h-6 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>,
    info: <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>,
    success: <svg className="w-6 h-6 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>,
    danger: <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
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

function DimensionDiagram({ b1, b2, b3, h, slope }) {
  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
      <div className="flex items-center justify-center">
        <svg width="320" height="200" className="drop-shadow-sm">
          <rect x="0" y="0" width="320" height="200" fill="white" rx="8" />
          <line x1="30" y1="35" x2="290" y2="35" stroke="#94a3b8" strokeWidth="3" strokeDasharray="8,4" />
          <polygon points="45,35 85,165 235,165 275,35" fill="#e0f2fe" stroke="#0369a1" strokeWidth="2.5" />
          <line x1="45" y1="35" x2="85" y2="165" stroke="#0369a1" strokeWidth="2" />
          <line x1="275" y1="35" x2="235" y2="165" stroke="#0369a1" strokeWidth="2" />
          <line x1="85" y1="165" x2="235" y2="165" stroke="#059669" strokeWidth="4" />
          <line x1="255" y1="35" x2="255" y2="165" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="5,3" />
          <line x1="248" y1="35" x2="262" y2="35" stroke="#7c3aed" strokeWidth="2" />
          <line x1="248" y1="165" x2="262" y2="165" stroke="#7c3aed" strokeWidth="2" />
          <text x="270" y="105" fontSize="12" fill="#7c3aed" fontWeight="bold">h</text>
          <text x="272" y="118" fontSize="10" fill="#7c3aed">{h.toFixed(2)}m</text>
          <text x="160" y="190" fontSize="14" fill="#059669" fontWeight="bold" textAnchor="middle">b₁ = {b1.toFixed(2)}m</text>
          <text x="160" y="25" fontSize="14" fill="#0369a1" fontWeight="bold" textAnchor="middle">b₃ = {b3.toFixed(2)}m</text>
          <text x="20" y="90" fontSize="9" fill="#64748b">1:{slope}</text>
          <text x="280" y="90" fontSize="9" fill="#64748b">1:{slope}</text>
        </svg>
      </div>
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
        <span className={`font-bold text-xl ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>{type}</span>
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

function VerifikasiGauge({ value, min, max, label }) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const inRange = value >= min && value <= max;
  return (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
      <div className="flex justify-between text-xs mb-2">
        <span className="font-medium text-slate-600">{label}</span>
        <span className={`font-bold ${inRange ? 'text-emerald-600' : 'text-red-600'}`}>{value.toFixed(4)} menit</span>
      </div>
      <div className="h-3 bg-gray-200 rounded-full overflow-hidden relative">
        <div className="absolute inset-0 flex">
          <div className="h-full bg-red-100" style={{ width: `${((min - (min * 0.3)) / (max - min * 0.7)) * 100}%` }} />
          <div className="h-full bg-emerald-400" style={{ width: `${((max - min) / (max - min * 0.7)) * 100}%` }} />
        </div>
        <div
          className="absolute top-0 w-2 h-3 bg-blue-600 rounded-full shadow"
          style={{ left: `calc(${pct}% - 4px)` }}
        />
      </div>
      <div className="flex justify-between text-xs text-slate-400 mt-1">
        <span>Min: {min.toFixed(2)}</span>
        <span className={inRange ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
          {inRange ? '✓ DALAM RANGE' : '✗ LUAR RANGE'}
        </span>
        <span>Max: {max.toFixed(2)}</span>
      </div>
    </div>
  );
}

function TTDCard({ title, nama, nip, onNamaChange, onNipChange, color }) {
  const colors = {
    blue: { border: 'border-blue-300', bg: 'bg-blue-50', text: 'text-blue-700' },
    violet: { border: 'border-violet-300', bg: 'bg-violet-50', text: 'text-violet-700' }
  };
  const c = colors[color];

  return (
    <div className={`rounded-xl border-2 ${c.border} ${c.bg} p-5`}>
      <h4 className={`font-bold text-sm uppercase tracking-wider ${c.text} mb-4`}>{title}</h4>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase">Nama Lengkap</label>
          <input
            type="text"
            value={nama}
            onChange={(e) => onNamaChange(e.target.value)}
            className="w-full mt-1 px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase">NIP</label>
          <input
            type="text"
            value={nip}
            onChange={(e) => onNipChange(e.target.value)}
            className="w-full mt-1 px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
          />
        </div>
        <div className="border-t border-slate-300 pt-3 mt-3 text-center">
          <p className="text-xs text-slate-500">Tanda Tangan</p>
          <div className="h-20 border-2 border-dashed border-slate-300 rounded-lg mt-2 flex items-center justify-center bg-white">
            <span className="text-slate-400 text-xs">( Tanda Tangan basah )</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================
// MAIN PAGE
// =====================

export default function PerhitunganRapPage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tab1');
  const [tooltip, setTooltip] = useState({ isOpen: false, key: null, data: null });

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

  // Tab 2: Excavator
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
    h2: 183.20,
    estimasiHari: 10,
    totalSolar: 1734.50
  });

  // Tab 3: Realisasi
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
    t1: 0.659,
    dalamRange: true,
    status: 'WAJAR',
    sniMin: 0.31,
    sniMax: 0.66,
    warning: null
  });

  // Tab 5: Backup Pelaksanaan
  const [backupPelaksanaan, setBackupPelaksanaan] = useState({
    stas: [],
    totalVolume: 0
  });

  // Tab 6-8: Personil & RAB
  const [personil, setPersonil] = useState({
    durasiHari: 10,
    penjagaMalam: 2,
    supir: 1,
    operator: 1,
    pekerja: 4,
    totalHOK: 0,
    kebutuhanSolar: 0
  });

  const [rabPersonil, setRabPersonil] = useState({
    subtotalTenaga: 0,
    subtotalBahan: 0,
    sebelumPPN: 0,
    ppn12: 0,
    total: 0,
    pembulatan: 0
  });

  const [rabFinal, setRabFinal] = useState({
    hargaSatuan: 5701.51,
    hargaPPN: 6385.69,
    grandTotal: 0,
    pagu: 3600000000,
    sisaPagu: 0
  });

  const [ttd, setTtd] = useState(DEFAULT_TTD);

  // Tab 3 helpers
  const [dailyInput, setDailyInput] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    jam: 8,
    q1: 0,
    galian: 0,
    bbmJam: 0,
    bbmHarian: 0,
    diterima: 0,
    sisa: 0
  });

  // Calculate STA
  useEffect(() => {
    const { stas, totalVolume } = generateSTAPerencanaan(
      geometri.panjang, geometri.b1, geometri.b3, geometri.h, geometri.hPrime, geometri.slope
    );
    setGeometri(prev => ({ ...prev, stas, totalVolume }));
  }, [geometri.panjang, geometri.b1, geometri.b3, geometri.h, geometri.hPrime, geometri.slope]);

  // Recalculate analisa when excavator params change
  useEffect(() => {
    const result = calculateAnalisaRencana(geometri.totalVolume, {
      hp: analisaRencana.hp,
      bucket: analisaRencana.bucket,
      fb: analisaRencana.fb,
      fa: analisaRencana.fa,
      fv: analisaRencana.fv,
      loadFactor: analisaRencana.loadFactor,
      waktuGali: analisaRencana.waktuGali
    });
    setAnalisaRencana(prev => ({ ...prev, ...result }));
    setPersonil(p => ({ ...p, durasiHari: Math.ceil(result.estimasiHari) }));
  }, [geometri.totalVolume, analisaRencana.hp, analisaRencana.bucket, analisaRencana.fb, analisaRencana.fa, analisaRencana.fv, analisaRencana.loadFactor, analisaRencana.waktuGali]);

  // Recalculate personil RAB
  useEffect(() => {
    const pm = 75000;
    const sp = 130000;
    const sup = 120000;
    const op = 150000;
    const pk = 95000;
    const dur = personil.durasiHari || 1;

    const totalHOK =
      (personil.penjagaMalam * pm * dur) +
      (personil.supir * sup * dur) +
      (personil.operator * op * dur) +
      (personil.pekerja * pk * dur);

    const solarLiter = analisaRencana.h2 * dur;
    const solarCost = solarLiter * 22300;

    const subtotal = totalHOK + solarCost;
    const ppn = subtotal * 0.12;
    const total = subtotal + ppn;
    const pembulatan = Math.ceil(total / 1000) * 1000;

    setRabPersonil({ subtotalTenaga: totalHOK, subtotalBahan: solarCost, sebelumPPN: subtotal, ppn12: ppn, total, pembulatan });
    setPersonil(p => ({ ...p, kebutuhanSolar: solarLiter }));
  }, [personil.durasiHari, personil.penjagaMalam, personil.supir, personil.operator, personil.pekerja, analisaRencana.h2]);

  // Recalculate RAB Final
  useEffect(() => {
    const volume = geometri.totalVolume;
    const hargaSatuan = volume > 0 ? (rabPersonil.pembulatan / volume) : 0;
    const hargaPPN = hargaSatuan * 1.12;
    const grandTotal = volume * hargaPPN;
    const sisaPagu = rabFinal.pagu - grandTotal;

    setRabFinal(prev => ({ ...prev, hargaSatuan, hargaPPN, grandTotal, sisaPagu }));
  }, [rabPersonil.pembulatan, geometri.totalVolume]);

  // Recalculate verifikasi
  useEffect(() => {
    const spec = MASTER_EXCAVATOR_SPECS[selectedAlat] || MASTER_EXCAVATOR_SPECS.PC200;
    const sniMin = spec.t1Range?.min || 0.31;
    const sniMax = spec.t1Range?.max || 0.66;
    const dalamRange = verifikasi.t1 >= sniMin && verifikasi.t1 <= sniMax;

    setVerifikasi(prev => ({
      ...prev,
      sniMin,
      sniMax,
      dalamRange,
      status: dalamRange ? 'WAJAR' : 'TIDAK WAJAR',
      warning: !dalamRange ? 'T.1 di luar range SNI - periksa ulang data' : null
    }));
  }, [verifikasi.t1, selectedAlat]);

  // Generate backup pelaksanaan from geometri
  useEffect(() => {
    if (geometri.stas.length > 0) {
      const { stas, totalVolume } = generateSTAPelaksanaan(geometri.stas);
      setBackupPelaksanaan({ stas: stas.length > 0 ? stas : geometri.stas, totalVolume: totalVolume || geometri.totalVolume });
    }
  }, [geometri.stas, geometri.totalVolume]);

  // Add daily realization entry
  const handleAddDaily = () => {
    if (!dailyInput.galian || !dailyInput.bbmHarian) return;
    const newEntry = {
      ...dailyInput,
      sisa: (kebutuhanRealisasi.sisaAkhir || 0) + (analisaRencana.h2 || 0) - dailyInput.bbmHarian,
      accepted: false
    };
    setKebutuhanRealisasi(prev => {
      const total = prev.dailyData.reduce((a, d) => a + (d.galian || 0), 0) + dailyInput.galian;
      const bbm = prev.dailyData.reduce((a, d) => a + (d.bbmHarian || 0), 0) + dailyInput.bbmHarian;
      return {
        ...prev,
        dailyData: [...prev.dailyData, newEntry],
        totalGalian: total,
        totalBBMterpakai: bbm,
        sisaAkhir: (prev.sisaAkhir || 0) + (analisaRencana.h2 || 0) - bbm
      };
    });
    setDailyInput(prev => ({ ...prev, galian: 0, bbmHarian: 0, diterima: 0, jam: 8 }));
  };

  // Export Excel
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
    const filename = `RAP_${geometri.kopData?.pekerjaan?.replace(/\s+/g, '_') || 'Perhitungan'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    await downloadExcel(rapState, filename);
  };

  // Print
  const handlePrint = () => {
    printCrossSections({ geometri, backupPelaksanaan });
  };

  const openTooltip = (key, type = 'dimension') => {
    const data = type === 'excavator' ? EXCAVATOR_TOOLTIPS[key] : DIMENSION_TOOLTIPS[key];
    setTooltip({ isOpen: true, key, type, data });
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
      <GovernmentHeader onExport={handleExportExcel} onPrint={handlePrint} />

      <div className="max-w-7xl mx-auto px-6 py-5">
        <TabNavigation tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-10">

        {/* ===================== TAB 1: GEOMETRI ===================== */}
        {activeTab === 'tab1' && (
          <div className="space-y-6">
            <AlertBanner
              type="warning"
              title="Perhatian!"
              message="Jangan mengisi nilai sembarangan! Gunakan hasil pengukuran lapangan dan standar yang berlaku sesuai SE DJBK No.47 Tahun 2026."
            />

            <div className="grid lg:grid-cols-2 gap-6">
              <ProfessionalCard title="DIMENSI SALURAN" subtitle="Ukuran penampang melintang sungai" headerColor="blue">
                <div className="grid grid-cols-2 gap-5">
                  <GovernmentInput
                    label="Panjang Total"
                    value={geometri.panjang}
                    onChange={(v) => setGeometri({ ...geometri, panjang: v })}
                    unit="m"
                    help=" STA 0+000 sampai STA akhir"
                    icon="📏"
                    tooltipKey="panjang"
                    onHelpClick={() => openTooltip('panjang')}
                  />
                  <div className="relative">
                    <GovernmentInput
                      label="b₁ Lebar Dasar"
                      value={geometri.b1}
                      onChange={(v) => setGeometri({ ...geometri, b1: v })}
                      unit="m"
                      help="Di DASAR saluran (paling sempit)"
                      icon="📐"
                      tooltipKey="b1"
                      onHelpClick={() => openTooltip('b1')}
                    />
                  </div>
                  <GovernmentInput
                    label="b₂ Lebar Tengah"
                    value={geometri.b2}
                    onChange={(v) => setGeometri({ ...geometri, b2: v })}
                    unit="m"
                    help="Auto: b₁ + 2×(slope×h)"
                    icon="📏"
                    tooltipKey="b2"
                    onHelpClick={() => openTooltip('b2')}
                  />
                  <GovernmentInput
                    label="b₃ Lebar Muka Tanah"
                    value={geometri.b3}
                    onChange={(v) => setGeometri({ ...geometri, b3: v })}
                    unit="m"
                    help="Di MUKA TANAH (paling lebar)"
                    icon="📐"
                    tooltipKey="b3"
                    onHelpClick={() => openTooltip('b3')}
                  />
                  <GovernmentInput
                    label="h Kedalaman Galian"
                    value={geometri.h}
                    onChange={(v) => setGeometri({ ...geometri, h: v })}
                    unit="m"
                    error={geometri.h > 5 ? '> 5m - perlu pertimbangan khusus' : null}
                    icon="⬇️"
                    tooltipKey="h"
                    onHelpClick={() => openTooltip('h')}
                  />
                  <GovernmentInput
                    label="h' Tinggi Air Eksisting"
                    value={geometri.hPrime}
                    onChange={(v) => setGeometri({ ...geometri, hPrime: v })}
                    unit="m"
                    help="Kedalaman air eksisting"
                    icon="〰️"
                    tooltipKey="hPrime"
                    onHelpClick={() => openTooltip('hPrime')}
                  />
                  <div className="col-span-2">
                    <GovernmentInput
                      label="Slope (Kemiringan Talud)"
                      value={geometri.slope}
                      onChange={(v) => setGeometri({ ...geometri, slope: v })}
                      unit="1:n"
                      error={(geometri.slope < 0.5 || geometri.slope > 3) ? 'Di luar range normal (0.5-3)' : null}
                      icon="📊"
                      tooltipKey="slope"
                      onHelpClick={() => openTooltip('slope')}
                    />
                  </div>
                </div>

                {/* Kop Data */}
                <div className="mt-5 pt-5 border-t border-slate-200">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-wider">📋 Kop Dokumen</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 font-semibold uppercase">Pekerjaan</label>
                      <input
                        type="text"
                        value={geometri.kopData.pekerjaan}
                        onChange={(e) => setGeometri({ ...geometri, kopData: { ...geometri.kopData, pekerjaan: e.target.value } })}
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        placeholder="Nama Pekerjaan"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 font-semibold uppercase">Lokasi</label>
                      <input
                        type="text"
                        value={geometri.kopData.lokasi}
                        onChange={(e) => setGeometri({ ...geometri, kopData: { ...geometri.kopData, lokasi: e.target.value } })}
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        placeholder="Lokasi Pekerjaan"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6">
                  <StatCard label="Total Volume" value={geometri.totalVolume.toFixed(2)} unit="m³" color="blue" />
                  <StatCard label="Jumlah STA" value={geometri.stas.length} unit=" STA" color="emerald" />
                  <StatCard label="Luas Rata-rata" value={
                    geometri.stas.length > 0 ? (geometri.totalVolume / geometri.stas.length / (geometri.panjang / geometri.stas.length)).toFixed(2) : '0'
                  } unit="m²" color="violet" />
                </div>
              </ProfessionalCard>

              <div className="space-y-6">
                <ProfessionalCard title="DIAGRAM PENAMPANG" subtitle="Trapesium sama kaki terbalik" headerColor="emerald">
                  <DimensionDiagram b1={geometri.b1} b2={geometri.b2} b3={geometri.b3} h={geometri.h} slope={geometri.slope} />
                </ProfessionalCard>
                <ProfessionalCard title="📚 REFERENSI UKURAN" subtitle="Penjelasan setiap dimensi" headerColor="amber">
                  <div className="space-y-2">
                    {[
                      { key: 'b1', color: 'emerald', label: 'b₁ - Lebar Dasar', desc: 'Diukur di dasar saluran (paling sempit)' },
                      { key: 'b2', color: 'amber', label: 'b₂ - Lebar Tengah', desc: 'Auto: b₁ + 2×(slope×h)' },
                      { key: 'b3', color: 'violet', label: 'b₃ - Lebar Muka Tanah', desc: 'Diukur di permukaan (paling lebar)' },
                      { key: 'h', color: 'rose', label: 'h - Kedalaman Galian', desc: 'Dari muka tanah ke dasar saluran' },
                      { key: 'slope', color: 'orange', label: 'Slope - Talud', desc: 'Kemiringan dinding 1:n' }
                    ].map(item => (
                      <button
                        key={item.key}
                        onClick={() => openTooltip(item.key)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-lg bg-${item.color}-50 border border-${item.color}-200 hover:border-${item.color}-400 transition-all text-left`}
                      >
                        <span className={`w-8 text-center font-bold text-${item.color}-600 text-sm`}>b₁</span>
                        <div>
                          <p className="text-sm font-semibold text-slate-700">{item.label}</p>
                          <p className="text-xs text-slate-500">{item.desc}</p>
                        </div>
                        <span className="ml-auto text-xs text-blue-500">? Panduan</span>
                      </button>
                    ))}
                  </div>
                </ProfessionalCard>
              </div>
            </div>

            {/* STA Table */}
            <ProfessionalCard title="DATA STA (Station)" subtitle={`${geometri.stas.length} titik stasiun otomatis (setiap ${geometri.panjang > 0 ? (geometri.panjang / Math.max(geometri.stas.length, 1)).toFixed(0) : 100}m`} headerColor="violet">
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
            <ProfessionalCard title="PREVIEW GAMBAR CROSS SECTION" subtitle={`${geometri.stas.length} STA Perencanaan`} headerColor="amber">
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

        {/* ===================== TAB 2: EXCAVATOR ===================== */}
        {activeTab === 'tab2' && (
          <div className="space-y-6">
            <AlertBanner
              type="info"
              title="Referensi SNI (SE DJBK No.47 Tahun 2026)"
              message="Gunakan nilai sesuai Tabel A.10-A.13 untuk hasil perhitungan yang valid dan dapat dipertanggungjawabkan."
            />

            <div className="grid lg:grid-cols-2 gap-6">
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
                <p className="text-xs text-slate-500 mt-3 text-center">Klik tombol <span className="bg-blue-100 text-blue-600 px-1.5 rounded font-bold">?</span> pada parameter di bawah untuk panduan lengkap</p>
              </ProfessionalCard>

              <ProfessionalCard title="PARAMETER ANALISA" subtitle="Faktor-faktor perhitungan sesuai SNI" headerColor="blue">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <GovernmentInput
                      label="HP (Horse Power)"
                      value={analisaRencana.hp}
                      onChange={(v) => setAnalisaRencana({ ...analisaRencana, hp: v })}
                      unit="HP"
                      icon="⚡"
                      tooltipKey="hp"
                      onHelpClick={() => openTooltip('hp', 'excavator')}
                    />
                  </div>
                  <GovernmentInput
                    label="Bucket Capacity"
                    value={analisaRencana.bucket}
                    onChange={(v) => setAnalisaRencana({ ...analisaRencana, bucket: v })}
                    unit="m³"
                    icon="🪣"
                    tooltipKey="bucket"
                    onHelpClick={() => openTooltip('bucket', 'excavator')}
                  />
                  <GovernmentInput
                    label="Fb (Faktor Bucket)"
                    value={analisaRencana.fb}
                    onChange={(v) => setAnalisaRencana({ ...analisaRencana, fb: v })}
                    help="Tabel A.10: 0.80-1.00"
                    icon="📊"
                    tooltipKey="fb"
                    onHelpClick={() => openTooltip('fb', 'excavator')}
                  />
                  <GovernmentInput
                    label="Fa (Faktor Efisiensi)"
                    value={analisaRencana.fa}
                    onChange={(v) => setAnalisaRencana({ ...analisaRencana, fa: v })}
                    help="Tabel A.13: 0.67-0.90"
                    icon="⚙️"
                    tooltipKey="fa"
                    onHelpClick={() => openTooltip('fa', 'excavator')}
                  />
                  <GovernmentInput
                    label="Fv (Faktor Konversi)"
                    value={analisaRencana.fv}
                    onChange={(v) => setAnalisaRencana({ ...analisaRencana, fv: v })}
                    help="Tabel A.12: 0.85-1.00"
                    icon="🔄"
                    tooltipKey="fv"
                    onHelpClick={() => openTooltip('fv', 'excavator')}
                  />
                  <GovernmentInput
                    label="Load Factor"
                    value={analisaRencana.loadFactor}
                    onChange={(v) => setAnalisaRencana({ ...analisaRencana, loadFactor: v })}
                    help="Untuk perhitungan BBM"
                    icon="⛽"
                    tooltipKey="loadFactor"
                    onHelpClick={() => openTooltip('loadFactor', 'excavator')}
                  />
                  <GovernmentInput
                    label="Waktu Gali (Cycle)"
                    value={analisaRencana.waktuGali}
                    onChange={(v) => setAnalisaRencana({ ...analisaRencana, waktuGali: v })}
                    unit="detik"
                    help="Waktu siklus (Tabel A.11)"
                    icon="⏱️"
                    tooltipKey="waktuGali"
                    onHelpClick={() => openTooltip('waktuGali', 'excavator')}
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
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 text-center border border-blue-200">
                  <p className="text-xs text-blue-500 font-medium uppercase tracking-wide">Estimasi Hari</p>
                  <p className="text-4xl font-bold text-blue-700 mt-2">{analisaRencana.estimasiHari.toFixed(0)}</p>
                  <p className="text-sm text-blue-500">hari</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-5 text-center border border-amber-200">
                  <p className="text-xs text-amber-500 font-medium uppercase tracking-wide">Total Solar</p>
                  <p className="text-4xl font-bold text-amber-700 mt-2">{analisaRencana.totalSolar.toFixed(0)}</p>
                  <p className="text-sm text-amber-500">liter</p>
                </div>
                <div className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl p-5 text-center border border-violet-200">
                  <p className="text-xs text-violet-500 font-medium uppercase tracking-wide">H2 (Per Hari)</p>
                  <p className="text-4xl font-bold text-violet-700 mt-2">{analisaRencana.h2.toFixed(0)}</p>
                  <p className="text-sm text-violet-500">liter/hari</p>
                </div>
              </div>

              {/* Formula Reference */}
              <div className="mt-5 bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                <h4 className="text-xs font-bold text-yellow-800 uppercase mb-2">📐 Rumus Perhitungan</h4>
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <div className="bg-white rounded-lg p-3 border border-yellow-100">
                    <p className="text-slate-600">T.1 (menit) = Waktu Gali / 60</p>
                    <p className="font-mono text-blue-700 font-semibold mt-1">= {analisaRencana.waktuGali} / 60 = <span className="text-emerald-600">{analisaRencana.t1.toFixed(4)} menit</span></p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-yellow-100">
                    <p className="text-slate-600">Q1 (m³/jam) = 60×{analisaRencana.bucket}×{analisaRencana.fb}×{analisaRencana.fa}×{analisaRencana.fv} / {analisaRencana.t1.toFixed(4)}</p>
                    <p className="font-mono text-blue-700 font-semibold mt-1">= <span className="text-emerald-600">{analisaRencana.q1.toFixed(2)} m³/jam</span></p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-yellow-100">
                    <p className="text-slate-600">Q2 (m³/hari) = Q1 × 8 jam × 0.8</p>
                    <p className="font-mono text-blue-700 font-semibold mt-1">= <span className="text-emerald-600">{analisaRencana.q2.toFixed(2)} m³/hari</span></p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-yellow-100">
                    <p className="text-slate-600">H (L/jam) = HP × LoadFactor × 0.8</p>
                    <p className="font-mono text-blue-700 font-semibold mt-1">= {analisaRencana.hp} × {analisaRencana.loadFactor} × 0.8 = <span className="text-amber-600">{analisaRencana.h.toFixed(2)} L/jam</span></p>
                  </div>
                </div>
              </div>
            </ProfessionalCard>
          </div>
        )}

        {/* ===================== TAB 3: REALISASI ===================== */}
        {activeTab === 'tab3' && (
          <div className="space-y-6">
            <AlertBanner
              type="info"
              title="Data Realisasi Harian"
              message="Input data galian dan konsumsi BBM harian dari lapangan untuk verifikasi analisa rencana."
            />

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Input Form */}
              <ProfessionalCard title="INPUT DATA HARIAN" subtitle="Catat hasil kerja Excavator" headerColor="emerald">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">Tanggal</label>
                    <input
                      type="date"
                      value={dailyInput.tanggal}
                      onChange={(e) => setDailyInput({ ...dailyInput, tanggal: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-lg font-semibold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <GovernmentInput
                    label="Jam Kerja"
                    value={dailyInput.jam}
                    onChange={(v) => setDailyInput({ ...dailyInput, jam: v })}
                    unit="jam"
                    help="Total jam kerja efektif"
                    icon="🕐"
                  />
                  <GovernmentInput
                    label="Galian (m³)"
                    value={dailyInput.galian}
                    onChange={(v) => setDailyInput({ ...dailyInput, galian: v, q1: v > 0 && dailyInput.jam > 0 ? (v / dailyInput.jam).toFixed(2) : 0 })}
                    unit="m³"
                    help="Total galian hari ini"
                    icon="⛏️"
                  />
                  <GovernmentInput
                    label="Q1 Realisasi (m³/jam)"
                    value={dailyInput.q1}
                    onChange={(v) => setDailyInput({ ...dailyInput, q1: v })}
                    unit="m³/jam"
                    help="Auto: galian / jam"
                    icon="📊"
                  />
                  <GovernmentInput
                    label="BBM Harian"
                    value={dailyInput.bbmHarian}
                    onChange={(v) => setDailyInput({ ...dailyInput, bbmHarian: v })}
                    unit="liter"
                    help="Total BBM terpakai"
                    icon="⛽"
                  />
                  <GovernmentInput
                    label="Diterima (liter)"
                    value={dailyInput.diterima}
                    onChange={(v) => setDailyInput({ ...dailyInput, diterima: v })}
                    unit="liter"
                    help="BBM yang diterima hari ini"
                    icon="✓"
                  />
                  <button
                    onClick={handleAddDaily}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Tambah Data
                  </button>
                </div>
              </ProfessionalCard>

              {/* Summary Stats */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <StatCard label="Total Galian" value={kebutuhanRealisasi.totalGalian.toFixed(0)} unit="m³" color="emerald" />
                  <StatCard label="Total BBM" value={kebutuhanRealisasi.totalBBMterpakai.toFixed(0)} unit="liter" color="amber" />
                  <StatCard label="Rata-rata Q1" value={kebutuhanRealisasi.dailyData.length > 0 ? (kebutuhanRealisasi.totalGalian / kebutuhanRealisasi.dailyData.reduce((a, d) => a + d.jam, 0) || 0).toFixed(2) : '0'} unit="m³/jam" color="blue" />
                  <StatCard label="Jumlah Data" value={kebutuhanRealisasi.dailyData.length} unit="entri" color="violet" />
                </div>
                <ProfessionalCard title="KETERANGAN" subtitle="Sisa BBM" headerColor="rose">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">BBM Rencana (Total)</span>
                      <span className="font-bold text-rose-600">{analisaRencana.totalSolar.toFixed(0)} L</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">BBM Terpakai</span>
                      <span className="font-bold text-amber-600">{kebutuhanRealisasi.totalBBMterpakai.toFixed(0)} L</span>
                    </div>
                    <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-700">Sisa BBM</span>
                      <span className="font-bold text-emerald-600 text-xl">{(analisaRencana.totalSolar - kebutuhanRealisasi.totalBBMterpakai).toFixed(0)} L</span>
                    </div>
                  </div>
                </ProfessionalCard>
              </div>

              {/* Daily Data Table */}
              <div className="lg:col-span-1">
                <ProfessionalCard title="DAFTAR DATA HARIAN" subtitle={`${kebutuhanRealisasi.dailyData.length} entri`} headerColor="violet">
                  {kebutuhanRealisasi.dailyData.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                      <div className="text-4xl mb-2">📋</div>
                      <p className="text-sm">Belum ada data harian</p>
                      <p className="text-xs mt-1">Mulai input data di form kiri</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {kebutuhanRealisasi.dailyData.map((d, i) => (
                        <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-sm">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-slate-700">#{i + 1} - {new Date(d.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                            <span className="text-xs text-slate-400">{d.jam} jam</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1 text-xs">
                            <div><span className="text-slate-500">Galian:</span> <span className="font-semibold">{d.galian} m³</span></div>
                            <div><span className="text-slate-500">Q1:</span> <span className="font-semibold">{d.q1} m³/j</span></div>
                            <div><span className="text-slate-500">BBM:</span> <span className="font-semibold text-amber-600">{d.bbmHarian} L</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ProfessionalCard>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 4: VERIFIKASI ===================== */}
        {activeTab === 'tab4' && (
          <div className="space-y-6">
            <AlertBanner
              type={verifikasi.dalamRange ? 'success' : 'danger'}
              title={verifikasi.dalamRange ? '✓ Analisa WAJAR - Dalam Range SNI' : '✗ Analisa TIDAK WAJAR - Di luar Range SNI'}
              message={verifikasi.warning || `T.1 = ${verifikasi.t1.toFixed(4)} menit. Range SNI: ${verifikasi.sniMin.toFixed(2)} - ${verifikasi.sniMax.toFixed(2)} menit (PC ${selectedAlat.replace('PC', '')})`}
            />

            <div className="grid lg:grid-cols-2 gap-6">
              <ProfessionalCard title="PARAMETER VERIFIKASI" subtitle="Verifikasi hasil perhitungan terhadap SNI" headerColor="violet">
                <div className="space-y-4">
                  <GovernmentInput
                    label="T.1 Rencana (menit)"
                    value={analisaRencana.t1}
                    onChange={(v) => setAnalisaRencana({ ...analisaRencana, t1: v })}
                    unit="menit"
                    help="Waktu siklus rencana"
                    icon="⏱️"
                  />
                  <GovernmentInput
                    label="T.1 Verifikasi (menit)"
                    value={verifikasi.t1}
                    onChange={(v) => setVerifikasi({ ...verifikasi, t1: v })}
                    unit="menit"
                    help="Waktu siklus aktual di lapangan"
                    icon="✅"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center">
                      <p className="text-xs text-slate-500 uppercase font-bold">Range Min SNI</p>
                      <p className="text-2xl font-bold text-emerald-600 mt-1">{verifikasi.sniMin.toFixed(2)}</p>
                      <p className="text-xs text-slate-500">menit</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center">
                      <p className="text-xs text-slate-500 uppercase font-bold">Range Max SNI</p>
                      <p className="text-2xl font-bold text-emerald-600 mt-1">{verifikasi.sniMax.toFixed(2)}</p>
                      <p className="text-xs text-slate-500">menit</p>
                    </div>
                  </div>
                </div>
              </ProfessionalCard>

              <ProfessionalCard title="HASIL VERIFIKASI" subtitle="Visualisasi range SNI" headerColor="blue">
                <VerifikasiGauge
                  label="T.1 Hasil"
                  value={verifikasi.t1}
                  min={verifikasi.sniMin * 0.5}
                  max={verifikasi.sniMax * 1.5}
                />
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Status:</span>
                    <span className={`font-bold px-3 py-1 rounded-full text-sm ${verifikasi.dalamRange ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {verifikasi.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Selisih T.1:</span>
                    <span className="font-bold text-slate-700">{(verifikasi.t1 - analisaRencana.t1).toFixed(4)} menit</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Keterangan:</span>
                    <span className="font-medium text-slate-700">
                      {Math.abs(verifikasi.t1 - analisaRencana.t1) < 0.1 ? 'Sangat Baik' :
                       Math.abs(verifikasi.t1 - analisaRencana.t1) < 0.3 ? 'Baik' :
                       'Perlu Evaluasi'}
                    </span>
                  </div>
                </div>
                <div className="mt-4 bg-indigo-50 rounded-xl p-3 border border-indigo-200">
                  <h4 className="text-xs font-bold text-indigo-700 uppercase mb-2">📚 Referensi SNI</h4>
                  <p className="text-xs text-indigo-600">
                    Tabel A.11 - SE DJBK No.47 Tahun 2026: Waktu siklus berdasarkan bucket capacity,
                    jenis tanah, dan sudut swing excavator.
                  </p>
                </div>
              </ProfessionalCard>
            </div>

            {/* Verifikasi RAB */}
            <ProfessionalCard title="VERIFIKASI ANGGARAN" subtitle="Perbandingan rencana vs aktual" headerColor="emerald">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 uppercase font-bold">Volume Rencana</p>
                  <p className="text-xl font-bold text-slate-700 mt-1">{geometri.totalVolume.toFixed(0)} m³</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 uppercase font-bold">Volume Realisasi</p>
                  <p className="text-xl font-bold text-emerald-600 mt-1">{kebutuhanRealisasi.totalGalian.toFixed(0)} m³</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 uppercase font-bold">Selisih Volume</p>
                  <p className="text-xl font-bold text-amber-600 mt-1">{(geometri.totalVolume - kebutuhanRealisasi.totalGalian).toFixed(0)} m³</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 uppercase font-bold">Persentase</p>
                  <p className="text-xl font-bold text-blue-600 mt-1">
                    {kebutuhanRealisasi.totalGalian > 0 ? ((kebutuhanRealisasi.totalGalian / geometri.totalVolume) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
            </ProfessionalCard>
          </div>
        )}

        {/* ===================== TAB 5: VOLUME ===================== */}
        {activeTab === 'tab5' && (
          <div className="space-y-6">
            <AlertBanner
              type="info"
              title="Volume Pelaksanaan"
              message="Data volume galian untuk setiap STA pelaksanaan. Bandingkan dengan perencanaan."
            />

            <div className="grid lg:grid-cols-2 gap-6">
              <ProfessionalCard title="VOLUME RENCANA" subtitle="Data dari Tab Dimensi" headerColor="blue">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-blue-50 to-blue-100">
                        <th className="px-4 py-3 text-left font-bold text-blue-700">STA</th>
                        <th className="px-4 py-3 text-right font-bold text-blue-700">Luas (m²)</th>
                        <th className="px-4 py-3 text-right font-bold text-blue-700">Volume (m³)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {geometri.stas.map((sta, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          <td className="px-4 py-2 font-semibold">{sta.sta}</td>
                          <td className="px-4 py-2 text-right">{sta.luas.toFixed(3)}</td>
                          <td className="px-4 py-2 text-right font-bold text-blue-600">{(sta.volume || 0).toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-blue-600 text-white font-bold">
                        <td className="px-4 py-3">TOTAL</td>
                        <td className="px-4 py-3 text-right">{geometri.stas.reduce((a, s) => a + s.luas, 0).toFixed(3)}</td>
                        <td className="px-4 py-3 text-right">{geometri.totalVolume.toFixed(3)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </ProfessionalCard>

              <ProfessionalCard title="VOLUME PELAKSANAAN" subtitle="Data aktual/lapangan" headerColor="emerald">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-emerald-50 to-emerald-100">
                        <th className="px-4 py-3 text-left font-bold text-emerald-700">STA</th>
                        <th className="px-4 py-3 text-right font-bold text-emerald-700">Luas (m²)</th>
                        <th className="px-4 py-3 text-right font-bold text-emerald-700">Volume (m³)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backupPelaksanaan.stas.map((sta, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          <td className="px-4 py-2 font-semibold">{sta.sta}</td>
                          <td className="px-4 py-2 text-right">{sta.luas?.toFixed(3) || '0.000'}</td>
                          <td className="px-4 py-2 text-right font-bold text-emerald-600">{(sta.volume || 0).toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-emerald-600 text-white font-bold">
                        <td className="px-4 py-3">TOTAL</td>
                        <td className="px-4 py-3 text-right">{backupPelaksanaan.stas.reduce((a, s) => a + (s.luas || 0), 0).toFixed(3)}</td>
                        <td className="px-4 py-3 text-right">{backupPelaksanaan.totalVolume.toFixed(3)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </ProfessionalCard>
            </div>

            {/* Comparison */}
            <ProfessionalCard title="PERBANDINGAN RENCANA vs PELAKSANAAN" subtitle="Selisih volume" headerColor="amber">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-100 to-slate-200">
                      <th className="px-4 py-3 text-left font-bold text-slate-700">STA</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-700">Vol. Rencana (m³)</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-700">Vol. Pelaksanaan (m³)</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-700">Selisih (m³)</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-700">Selisih (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {geometri.stas.map((sta, i) => {
                      const exec = backupPelaksanaan.stas[i] || { volume: 0 };
                      const selisih = (exec.volume || 0) - (sta.volume || 0);
                      const pct = sta.volume > 0 ? ((selisih / sta.volume) * 100).toFixed(1) : 0;
                      return (
                        <tr key={i} className={`border-b border-slate-100 ${Math.abs(selisih) > 10 ? 'bg-red-50' : ''}`}>
                          <td className="px-4 py-2 font-semibold">{sta.sta}</td>
                          <td className="px-4 py-2 text-right">{(sta.volume || 0).toFixed(3)}</td>
                          <td className="px-4 py-2 text-right">{(exec.volume || 0).toFixed(3)}</td>
                          <td className={`px-4 py-2 text-right font-bold ${selisih > 0 ? 'text-emerald-600' : selisih < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                            {selisih.toFixed(3)}
                          </td>
                          <td className={`px-4 py-2 text-right font-semibold ${Math.abs(pct) > 10 ? 'text-red-600' : 'text-slate-600'}`}>
                            {pct > 0 ? '+' : ''}{pct}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </ProfessionalCard>
          </div>
        )}

        {/* ===================== TAB 6: PERSONIL ===================== */}
        {activeTab === 'tab6' && (
          <div className="space-y-6">
            <AlertBanner
              type="info"
              title="Perencanaan Personil"
              message="Tentukan jumlah dan durasi tenaga kerja yang dibutuhkan untuk proyek ini."
            />

            <div className="grid lg:grid-cols-2 gap-6">
              <ProfessionalCard title="KONFIGURASI PERSONIL" subtitle="Atur jumlah dan durasi tenaga kerja" headerColor="blue">
                <div className="space-y-4">
                  <GovernmentInput
                    label="Durasi Pekerjaan"
                    value={personil.durasiHari}
                    onChange={(v) => setPersonil({ ...personil, durasiHari: v })}
                    unit="hari"
                    help="Estimasi hari kerja"
                    icon="📅"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <GovernmentInput
                      label="Penjaga Malam"
                      value={personil.penjagaMalam}
                      onChange={(v) => setPersonil({ ...personil, penjagaMalam: v })}
                      unit="orang"
                      help="@ Rp 75.000/hari"
                      icon="🛡️"
                    />
                    <GovernmentInput
                      label="Supir"
                      value={personil.supir}
                      onChange={(v) => setPersonil({ ...personil, supir: v })}
                      unit="orang"
                      help="@ Rp 120.000/hari"
                      icon="🚛"
                    />
                    <GovernmentInput
                      label="Operator Excavator"
                      value={personil.operator}
                      onChange={(v) => setPersonil({ ...personil, operator: v })}
                      unit="orang"
                      help="@ Rp 150.000/hari"
                      icon="🚜"
                    />
                    <GovernmentInput
                      label="Pekerja"
                      value={personil.pekerja}
                      onChange={(v) => setPersonil({ ...personil, pekerja: v })}
                      unit="orang"
                      help="@ Rp 95.000/hari"
                      icon="👷"
                    />
                  </div>
                </div>
              </ProfessionalCard>

              <ProfessionalCard title="REKAPITULASI PERSONIL" subtitle="Total HOK dan kebutuhan" headerColor="emerald">
                <div className="space-y-3">
                  {[
                    { label: 'Penjaga Malam', qty: personil.penjagaMalam, dur: personil.durasiHari, harga: 75000, icon: '🛡️' },
                    { label: 'Supir', qty: personil.supir, dur: personil.durasiHari, harga: 120000, icon: '🚛' },
                    { label: 'Operator Excavator', qty: personil.operator, dur: personil.durasiHari, harga: 150000, icon: '🚜' },
                    { label: 'Pekerja', qty: personil.pekerja, dur: personil.durasiHari, harga: 95000, icon: '👷' }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{item.icon}</span>
                        <div>
                          <p className="font-semibold text-slate-700">{item.label}</p>
                          <p className="text-xs text-slate-500">{item.qty} org × {item.dur} hari × Rp {item.harga.toLocaleString('id-ID')}</p>
                        </div>
                      </div>
                      <span className="font-bold text-emerald-600">Rp {(item.qty * item.dur * item.harga).toLocaleString('id-ID')}</span>
                    </div>
                  ))}

                  <div className="border-t-2 border-slate-300 pt-3 mt-3">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-slate-700">Total Biaya Tenaga</span>
                      <span className="font-bold text-xl text-emerald-600">Rp {rabPersonil.subtotalTenaga.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-700">Total Kebutuhan Solar</span>
                      <span className="font-bold text-xl text-amber-600">{personil.kebutuhanSolar.toFixed(0)} liter</span>
                    </div>
                  </div>
                </div>
              </ProfessionalCard>
            </div>

            {/* Solar Needs */}
            <ProfessionalCard title="KEBUTUHAN BAHAN BAKAR" subtitle="Rincian solar untuk seluruh pekerjaan" headerColor="amber">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-5 border border-amber-200 text-center">
                  <p className="text-xs text-amber-500 uppercase font-bold tracking-wide">Konsumsi/Hari</p>
                  <p className="text-3xl font-bold text-amber-700 mt-2">{analisaRencana.h2.toFixed(0)}</p>
                  <p className="text-sm text-amber-500">liter/hari</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5 border border-orange-200 text-center">
                  <p className="text-xs text-orange-500 uppercase font-bold tracking-wide">Durasi</p>
                  <p className="text-3xl font-bold text-orange-700 mt-2">{personil.durasiHari}</p>
                  <p className="text-sm text-orange-500">hari</p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-5 border border-red-200 text-center">
                  <p className="text-xs text-red-500 uppercase font-bold tracking-wide">Total Kebutuhan</p>
                  <p className="text-3xl font-bold text-red-700 mt-2">{personil.kebutuhanSolar.toFixed(0)}</p>
                  <p className="text-sm text-red-500">liter</p>
                </div>
              </div>
            </ProfessionalCard>
          </div>
        )}

        {/* ===================== TAB 7: RAB PERSONIL ===================== */}
        {activeTab === 'tab7' && (
          <div className="space-y-6">
            <AlertBanner
              type="success"
              title="RAB Personil"
              message="Rincian anggaran biaya personil dan bahan bakar termasuk PPN 12%."
            />

            <div className="grid lg:grid-cols-2 gap-6">
              {/* RAB Table */}
              <ProfessionalCard title="RENCANA ANGGARAN BIAYA PERSONIL" subtitle="Breakdown biaya per komponen" headerColor="blue">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-blue-50 to-blue-100">
                        <th className="px-4 py-3 text-left font-bold text-blue-700">No</th>
                        <th className="px-4 py-3 text-left font-bold text-blue-700">Uraian</th>
                        <th className="px-4 py-3 text-right font-bold text-blue-700">Volume</th>
                        <th className="px-4 py-3 text-right font-bold text-blue-700">Satuan</th>
                        <th className="px-4 py-3 text-right font-bold text-blue-700">Harga</th>
                        <th className="px-4 py-3 text-right font-bold text-blue-700">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-slate-50"><td colSpan={6} className="px-4 py-2 font-bold text-slate-700">A. TENAGA KERJA</td></tr>
                      {[
                        { no: 1, uraian: 'Penjaga Malam', volume: personil.penjagaMalam * personil.durasiHari, satuan: 'OH', harga: 75000 },
                        { no: 2, uraian: 'Supir', volume: personil.supir * personil.durasiHari, satuan: 'OH', harga: 120000 },
                        { no: 3, uraian: 'Operator Excavator', volume: personil.operator * personil.durasiHari, satuan: 'OH', harga: 150000 },
                        { no: 4, uraian: 'Pekerja', volume: personil.pekerja * personil.durasiHari, satuan: 'OH', harga: 95000 }
                      ].map((row, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          <td className="px-4 py-2">{row.no}</td>
                          <td className="px-4 py-2 font-medium">{row.uraian}</td>
                          <td className="px-4 py-2 text-right">{row.volume}</td>
                          <td className="px-4 py-2 text-right">{row.satuan}</td>
                          <td className="px-4 py-2 text-right">Rp {row.harga.toLocaleString('id-ID')}</td>
                          <td className="px-4 py-2 text-right font-bold">Rp {(row.volume * row.harga).toLocaleString('id-ID')}</td>
                        </tr>
                      ))}
                      <tr className="bg-blue-50 font-bold">
                        <td colSpan={5} className="px-4 py-3 text-right">Sub Total Tenaga</td>
                        <td className="px-4 py-3 text-right text-blue-700">Rp {rabPersonil.subtotalTenaga.toLocaleString('id-ID')}</td>
                      </tr>

                      <tr className="bg-slate-50"><td colSpan={6} className="px-4 py-2 font-bold text-slate-700">B. BAHAN</td></tr>
                      <tr className="border-b border-slate-100">
                        <td className="px-4 py-2">1</td>
                        <td className="px-4 py-2 font-medium">Solar</td>
                        <td className="px-4 py-2 text-right">{personil.kebutuhanSolar.toFixed(0)}</td>
                        <td className="px-4 py-2 text-right">Liter</td>
                        <td className="px-4 py-2 text-right">Rp 22.300</td>
                        <td className="px-4 py-2 text-right font-bold">Rp {rabPersonil.subtotalBahan.toLocaleString('id-ID')}</td>
                      </tr>
                      <tr className="bg-emerald-50 font-bold">
                        <td colSpan={5} className="px-4 py-3 text-right">Sub Total Bahan</td>
                        <td className="px-4 py-3 text-right text-emerald-700">Rp {rabPersonil.subtotalBahan.toLocaleString('id-ID')}</td>
                      </tr>

                      <tr className="bg-amber-50 font-bold border-t-2 border-amber-300">
                        <td colSpan={5} className="px-4 py-3 text-right">TOTAL SEBELUM PPN</td>
                        <td className="px-4 py-3 text-right text-amber-700">Rp {rabPersonil.sebelumPPN.toLocaleString('id-ID')}</td>
                      </tr>
                      <tr className="bg-amber-100 font-bold">
                        <td colSpan={5} className="px-4 py-3 text-right">PPN 12%</td>
                        <td className="px-4 py-3 text-right text-amber-700">Rp {rabPersonil.ppn12.toLocaleString('id-ID')}</td>
                      </tr>
                      <tr className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold border-t-2 border-emerald-300">
                        <td colSpan={5} className="px-4 py-4 text-right text-lg">TOTAL RAB PERSONIL + PPN</td>
                        <td className="px-4 py-4 text-right text-xl text-yellow-300">Rp {rabPersonil.pembulatan.toLocaleString('id-ID')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </ProfessionalCard>

              {/* Summary Cards */}
              <div className="space-y-4">
                <ProfessionalCard title="RINGKASAN ANGGARAN" subtitle="Total biaya personil" headerColor="emerald">
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-5 border border-emerald-200 text-center">
                      <p className="text-xs text-emerald-500 uppercase font-bold tracking-wide">Total Biaya Personil + PPN</p>
                      <p className="text-4xl font-bold text-emerald-700 mt-2">Rp {rabPersonil.pembulatan.toLocaleString('id-ID')}</p>
                      <p className="text-sm text-emerald-600 mt-1">Sudah termasuk PPN 12%</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center">
                        <p className="text-xs text-slate-500 uppercase font-bold">Total HOK</p>
                        <p className="text-xl font-bold text-slate-700 mt-1">
                          {(personil.penjagaMalam + personil.supir + personil.operator + personil.pekerja) * personil.durasiHari}
                        </p>
                        <p className="text-xs text-slate-500">OH</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center">
                        <p className="text-xs text-slate-500 uppercase font-bold">Total Solar</p>
                        <p className="text-xl font-bold text-amber-600 mt-1">{personil.kebutuhanSolar.toFixed(0)}</p>
                        <p className="text-xs text-slate-500">liter</p>
                      </div>
                    </div>
                  </div>
                </ProfessionalCard>

                <ProfessionalCard title="BREAKDOWN PPN" subtitle="Perhitungan pajak 12%" headerColor="amber">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Sub Total</span>
                      <span className="font-semibold">Rp {rabPersonil.sebelumPPN.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                      <span className="text-slate-600">PPN 12%</span>
                      <span className="font-semibold text-amber-600">Rp {rabPersonil.ppn12.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-700">Total + PPN</span>
                      <span className="font-bold text-emerald-600">Rp {(rabPersonil.sebelumPPN + rabPersonil.ppn12).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between items-center bg-blue-50 rounded-lg p-3">
                      <span className="font-bold text-blue-700">Pembulatan (ke atas)</span>
                      <span className="font-bold text-xl text-blue-700">Rp {rabPersonil.pembulatan.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </ProfessionalCard>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 8: RAB FINAL ===================== */}
        {activeTab === 'tab8' && (
          <div className="space-y-6">
            <AlertBanner
              type={rabFinal.sisaPagu > 0 ? 'success' : 'danger'}
              title={rabFinal.sisaPagu > 0 ? '✓ PAGU MENCUKUPI' : '⚠️ PAGU MELEBIHI ANGGARAN'}
              message={`Grand Total: Rp ${rabFinal.grandTotal.toLocaleString('id-ID')} | Pagu: Rp ${rabFinal.pagu.toLocaleString('id-ID')} | Sisa: Rp ${rabFinal.sisaPagu.toLocaleString('id-ID')}`}
            />

            <ProfessionalCard title="RENCANA ANGGARAN BIAYA (RAB) AKHIR" subtitle="Total pekerjaan galian dengan excavator" headerColor="blue">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-50 to-blue-100">
                      <th className="px-4 py-3 text-left font-bold text-blue-700">No</th>
                      <th className="px-4 py-3 text-left font-bold text-blue-700">Uraian Pekerjaan</th>
                      <th className="px-4 py-3 text-right font-bold text-blue-700">Volume</th>
                      <th className="px-4 py-3 text-center font-bold text-blue-700">Satuan</th>
                      <th className="px-4 py-3 text-right font-bold text-blue-700">Harga Satuan</th>
                      <th className="px-4 py-3 text-right font-bold text-blue-700">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="px-4 py-3 font-bold">1</td>
                      <td className="px-4 py-3 font-medium">Galian Tanah + Menimbun dengan Excavator</td>
                      <td className="px-4 py-3 text-right">{geometri.totalVolume.toFixed(3)}</td>
                      <td className="px-4 py-3 text-center">m³</td>
                      <td className="px-4 py-3 text-right">Rp {rabFinal.hargaPPN.toLocaleString('id-ID')}</td>
                      <td className="px-4 py-3 text-right font-bold text-blue-700">Rp {rabFinal.grandTotal.toLocaleString('id-ID')}</td>
                    </tr>
                    <tr className="bg-gradient-to-r from-emerald-50 to-emerald-100 font-bold border-t-2 border-emerald-300">
                      <td colSpan={5} className="px-4 py-4 text-right text-lg text-emerald-800">TOTAL RAB</td>
                      <td className="px-4 py-4 text-right text-xl text-emerald-700">Rp {rabFinal.grandTotal.toLocaleString('id-ID')}</td>
                    </tr>
                    <tr className="bg-gradient-to-r from-violet-50 to-violet-100 font-bold">
                      <td colSpan={5} className="px-4 py-3 text-right">PAGU ANGGARAN</td>
                      <td className="px-4 py-3 text-right text-violet-700">Rp {rabFinal.pagu.toLocaleString('id-ID')}</td>
                    </tr>
                    <tr className={`font-bold ${rabFinal.sisaPagu >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                      <td colSpan={5} className={`px-4 py-3 text-right ${rabFinal.sisaPagu >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>SISA PAGU</td>
                      <td className={`px-4 py-3 text-right text-xl ${rabFinal.sisaPagu >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Rp {rabFinal.sisaPagu.toLocaleString('id-ID')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </ProfessionalCard>

            <div className="grid md:grid-cols-4 gap-4">
              <StatCard label="Volume Galian" value={geometri.totalVolume.toFixed(0)} unit="m³" color="blue" />
              <StatCard label="Harga Satuan" value={`Rp ${(rabFinal.hargaPPN).toLocaleString('id-ID')}`} unit="/m³" color="emerald" />
              <StatCard label="Grand Total" value={`Rp ${(rabFinal.grandTotal / 1000000).toFixed(1)}`} unit="Juta" color="violet" />
              <StatCard label="Sisa Pagu" value={`Rp ${(rabFinal.sisaPagu / 1000000).toFixed(1)}`} unit="Juta" color={rabFinal.sisaPagu >= 0 ? 'emerald' : 'rose'} />
            </div>

            {/* Pagu Editor */}
            <ProfessionalCard title="PAGU ANGGARAN" subtitle="Edit pagu kegiatan" headerColor="amber">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">Nilai Pagu (Rp)</label>
                  <input
                    type="number"
                    value={rabFinal.pagu}
                    onChange={(e) => setRabFinal({ ...rabFinal, pagu: Number(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-amber-200 bg-amber-50 text-lg font-semibold focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none"
                  />
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase font-bold">Terbilang</p>
                  <p className="text-sm font-semibold text-slate-700 mt-1">
                    {(rabFinal.pagu / 1000000000).toFixed(0)} Milyar + {(Math.floor((rabFinal.pagu % 1000000000) / 1000000)).toFixed(0)} Juta
                  </p>
                </div>
              </div>
            </ProfessionalCard>
          </div>
        )}

        {/* ===================== TAB 9: TTD ===================== */}
        {activeTab === 'tab9' && (
          <div className="space-y-6">
            <AlertBanner
              type="info"
              title="Tanda Tangan"
              message="Masukkan nama dan NIP pejabat yang menandatangani dokumen RAP."
            />

            <div className="grid md:grid-cols-2 gap-6">
              <TTDCard
                title="KPA - Kuasa Pengguna Anggaran"
                nama={ttd.kpaNama}
                nip={ttd.kpaNip}
                onNamaChange={(v) => setTtd({ ...ttd, kpaNama: v })}
                onNipChange={(v) => setTtd({ ...ttd, kpaNip: v })}
                color="blue"
              />
              <TTDCard
                title="PPTK - Pejabat Pembuat Komitmen"
                nama={ttd.pptkNama}
                nip={ttd.pptkNip}
                onNamaChange={(v) => setTtd({ ...ttd, pptkNama: v })}
                onNipChange={(v) => setTtd({ ...ttd, pptkNip: v })}
                color="violet"
              />
            </div>

            {/* Preview Kop */}
            <ProfessionalCard title="PREVIEW KOP DOKUMEN" subtitle="Tampilan kop di gambar teknik" headerColor="slate">
              <div className="border-2 border-slate-300 rounded-xl p-6 bg-white max-w-2xl mx-auto">
                <div className="border-b-2 border-black pb-3 mb-3 text-center">
                  <p className="font-bold text-sm">PEMERINTAH KABUPATEN BOJONEGORO</p>
                  <p className="font-bold text-sm">DINAS PU SUMBER DAYA AIR</p>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex gap-2">
                    <span className="font-bold w-20">PROGRAM:</span>
                    <span className="flex-1">{geometri.kopData.program}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold w-20">KEGIATAN:</span>
                    <span className="flex-1">{geometri.kopData.kegiatan}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold w-20">PEKERJAAN:</span>
                    <span className="flex-1">{geometri.kopData.pekerjaan || '-'}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold w-20">LOKASI:</span>
                    <span className="flex-1">{geometri.kopData.lokasi || '-'}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold w-20">TAHUN:</span>
                    <span className="flex-1">{geometri.kopData.tahun}</span>
                  </div>
                </div>
                <div className="border-t-2 border-black pt-3 mt-3 text-center">
                  <p className="font-bold text-xs">PERHITUNGAN RENCANA ANGGARAN BIAYA (RAP)</p>
                  <p className="text-xs mt-1">
                    {ttd.kpaNama ? `KPA: ${ttd.kpaNama}, NIP. ${ttd.kpaNip}` : ''}
                  </p>
                  <p className="text-xs">
                    {ttd.pptkNama ? `PPTK: ${ttd.pptkNama}, NIP. ${ttd.pptkNip}` : ''}
                  </p>
                </div>
              </div>
            </ProfessionalCard>

            {/* Summary before TTD */}
            <ProfessionalCard title="REKAP FINAL" subtitle="Ringkasan akhir sebelum ditandatangani" headerColor="emerald">
              <div className="grid md:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 uppercase font-bold">Volume</p>
                  <p className="text-2xl font-bold text-slate-700 mt-1">{geometri.totalVolume.toFixed(0)} m³</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 uppercase font-bold">Durasi</p>
                  <p className="text-2xl font-bold text-slate-700 mt-1">{personil.durasiHari} Hari</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 text-center">
                  <p className="text-xs text-emerald-500 uppercase font-bold">Total RAB</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">Rp {(rabFinal.grandTotal / 1000000).toFixed(1)} Jt</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 text-center">
                  <p className="text-xs text-blue-500 uppercase font-bold">Sisa Pagu</p>
                  <p className="text-2xl font-bold text-blue-700 mt-1">Rp {(rabFinal.sisaPagu / 1000000).toFixed(1)} Jt</p>
                </div>
              </div>
            </ProfessionalCard>
          </div>
        )}
      </div>

      {/* Tooltip Modal */}
      <DimensionTooltipModal
        isOpen={tooltip.isOpen}
        onClose={() => setTooltip({ isOpen: false, key: null, data: null })}
        dimensionKey={tooltip.key}
        data={tooltip.data}
      />
    </div>
  );
}
