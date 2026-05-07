'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import CrossSectionSVG from '@/components/CrossSectionSVG';
import {
  MASTER_EXCAVATOR_SPECS,
  calculateAnalisaRencana,
  calculateAnalisaWithGoalSeek,
  goalSeekSisaBBM,
  goalSeekT1Verifikasi,
  goalSeekBisectionPerencanaan,
  goalSeekBisectionPelaksanaan,
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
      className="w-5 h-5 rounded-full bg-[#1E3A5F]/10 hover:bg-[#1E3A5F]/20 text-[#1E3A5F]/60 hover:text-[#1E3A5F] text-[10px] font-black flex items-center justify-center transition-all hover:scale-110"
      title="Panduan SNI"
    >
      ?
    </button>
  );
}

function GovernmentHeader({ onExport, onPrint, saveStatus = 'idle' }) {
  const statusConfig = {
    idle: null,
    saving: { color: 'text-amber-300', label: 'Menyimpan...', dot: 'bg-amber-400 animate-pulse' },
    saved: { color: 'text-emerald-300', label: '✓ Tersimpan', dot: 'bg-emerald-400' },
    error: { color: 'text-red-300', label: '⚠ Gagal menyimpan', dot: 'bg-red-400' }
  };
  const sc = statusConfig[saveStatus];
  return (
    <div className="bg-[#1E3A5F] shadow-xl">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Government Badge + Title */}
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl border border-[#FFD700]/40 flex items-center justify-center">
                <div className="text-center leading-none">
                  <div className="text-[8px] font-bold text-white/80 uppercase tracking-wider">PEMERINTAH</div>
                  <div className="text-[9px] font-black text-[#FFD700] tracking-tight">KAB. BOJONEGORO</div>
                  <div className="w-8 h-px bg-[#FFD700]/50 mx-auto my-0.5" />
                  <div className="text-[7px] font-bold text-white/70 uppercase">DINAS PU SDA</div>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-white tracking-tight">PERHITUNGAN RAP</h1>
                <span className="px-2 py-0.5 bg-[#FFD700]/20 border border-[#FFD700]/40 rounded text-[10px] font-bold text-[#FFD700] uppercase tracking-widest">Swakelola</span>
              </div>
              <p className="text-white/60 text-sm mt-0.5">Normalisasi Sungai — Rencana Anggaran Biaya</p>
            </div>
          </div>
          {/* Right: Save Status + Action Buttons */}
          <div className="flex items-center gap-3">
            {sc && (
              <div className={`flex items-center gap-1.5 ${sc.color} text-xs font-semibold`}>
                <div className={`w-2 h-2 rounded-full ${sc.dot}`} />
                <span>{sc.label}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5">
            <button
              onClick={onExport}
              className="group flex items-center gap-2.5 px-5 py-2.5 bg-[#0D6E3F] hover:bg-[#0a5833] text-white rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all border border-white/10"
            >
              <svg className="w-4 h-4 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Excel
            </button>
            <button
              onClick={onPrint}
              className="group flex items-center gap-2.5 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all border border-white/10 backdrop-blur-sm"
            >
              <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Gambar
            </button>
          </div>
          </div>
        </div>
      </div>
      <div className="h-[3px] bg-gradient-to-r from-transparent via-[#FFD700]/80 to-transparent" />
    </div>
  );
}

function TabNavigation({ tabs, activeTab, onTabChange }) {
  // Exclude TTD tab (tab9) - not needed per user instruction
  const visibleTabs = tabs.filter(t => t.id !== 'tab9');
  return (
    <div className="bg-slate-100/60 backdrop-blur-sm p-1.5 rounded-2xl flex gap-1 overflow-x-auto shadow-inner border border-slate-200/50">
      {visibleTabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-200 whitespace-nowrap font-semibold text-sm
              ${isActive
                ? 'bg-[#1E3A5F] text-white shadow-lg scale-[1.02]'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/80'}`}
          >
            {isActive && <span className="absolute inset-0 rounded-xl bg-gradient-to-b from-[#FFD700]/10 to-transparent pointer-events-none" />}
            <span className="text-base leading-none">{tab.icon}</span>
            <span>{tab.label}</span>
            {isActive && <div className="ml-1 w-1.5 h-1.5 rounded-full bg-[#FFD700] shadow-sm" />}
          </button>
        );
      })}
    </div>
  );
}

function ProfessionalCard({ title, subtitle, children, headerColor = 'navy' }) {
  const headerClasses = {
    navy: 'bg-[#1E3A5F]',
    blue: 'bg-gradient-to-r from-blue-600 to-blue-700',
    emerald: 'bg-[#0D6E3F]',
    slate: 'bg-slate-700'
  };

  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className={`px-5 py-3.5 ${headerClasses[headerColor] || headerClasses.navy} border-b border-black/10`}>
        <div className="flex items-center gap-3">
          <div className="w-0.5 h-8 bg-[#FFD700]/70 rounded-full" />
          <div>
            <h3 className="text-white font-bold text-base tracking-tight">{title}</h3>
            {subtitle && <p className="text-white/60 text-xs mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </div>
      <div className="p-5">
        {children}
      </div>
    </div>
  );
}

function GovernmentInput({ label, value, onChange, unit, help, error, icon, variant = 'default', tooltipKey, onHelpClick }) {
  const baseVariant = error ? 'danger' : variant;
  const variants = {
    default: 'border-slate-200 focus:border-[#1E3A5F] focus:ring-[#1E3A5F]/10 bg-white',
    success: 'border-emerald-200 bg-emerald-50/50 focus:border-emerald-500',
    warning: 'border-amber-200 bg-amber-50/50 focus:border-amber-500',
    danger: 'border-red-300 bg-red-50/50 focus:border-red-400'
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        {icon && <span className="text-[#1E3A5F]/70">{icon}</span>}
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
        {onHelpClick && (
          <HelpBtn onClick={onHelpClick} tooltipKey={tooltipKey} />
        )}
      </div>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`w-full px-3.5 py-3 rounded-xl border-2 transition-all duration-200
            ${variants[baseVariant]}
            text-base font-semibold text-slate-800 outline-none
            placeholder:text-slate-300
            hover:border-slate-300 focus:ring-4`}
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
            {unit}
          </span>
        )}
      </div>
      {help && !error && <p className="text-[11px] text-slate-400 ml-0.5">{help}</p>}
      {error && <p className="text-[11px] text-red-500 ml-0.5 font-medium flex items-center gap-1">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0v-4a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        {error}
      </p>}
    </div>
  );
}

function StatCard({ label, value, unit, icon, color = 'navy' }) {
  const colors = {
    navy:   { bg: 'bg-[#1E3A5F]/5',   border: 'border-[#1E3A5F]/20', text: 'text-[#1E3A5F]', label: 'text-slate-500' },
    emerald:{ bg: 'bg-emerald-50',     border: 'border-emerald-200',   text: 'text-emerald-600', label: 'text-slate-500' },
    gold:   { bg: 'bg-[#FFD700]/10',  border: 'border-[#FFD700]/30',  text: 'text-amber-600',   label: 'text-slate-500' },
    rose:   { bg: 'bg-rose-50',       border: 'border-rose-200',      text: 'text-rose-600',    label: 'text-slate-500' },
    slate:  { bg: 'bg-slate-50',      border: 'border-slate-200',     text: 'text-slate-600',   label: 'text-slate-400' }
  };
  const c = colors[color] || colors.navy;
  return (
    <div className={`${c.bg} rounded-xl p-4 border ${c.border} text-center`}>
      {icon && <div className={`${c.text} mb-1`}>{icon}</div>}
      <div className={`text-2xl font-black ${c.text}`}>{value}</div>
      <div className={`text-xs font-medium ${c.label} mt-0.5`}>{unit}</div>
      <div className={`text-[10px] uppercase tracking-wider font-bold ${c.label} mt-1`}>{label}</div>
    </div>
  );
}

function AlertBanner({ type = 'warning', title, message }) {
  const cfg = {
    warning: { bar: '#F59E0B', bg: 'bg-amber-50/70', border: 'border-amber-200', tc: 'text-amber-800', mc: 'text-amber-900' },
    info:    { bar: '#1E3A5F', bg: 'bg-blue-50/70',  border: 'border-blue-200',  tc: 'text-blue-800',  mc: 'text-blue-900'   },
    success: { bar: '#0D6E3F', bg: 'bg-emerald-50/70',border: 'border-emerald-200',tc:'text-emerald-800',mc:'text-emerald-900' },
    danger:  { bar: '#DC2626', bg: 'bg-red-50/70',    border: 'border-red-200',   tc: 'text-red-800',   mc: 'text-red-900'    }
  };
  const s = cfg[type] || cfg.warning;
  const icons = {
    warning: <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>,
    info:    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>,
    success: <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>,
    danger:  <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
  };
  return (
    <div className={`${s.bg} border-l-4 ${s.border} border-r border-t border-b rounded-r-xl px-5 py-3.5 flex items-start gap-4`}>
      <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5" style={{ backgroundColor: s.bar }}>
        {icons[type]}
      </div>
      <div>
        <h4 className={`font-bold text-sm ${s.tc}`}>{title}</h4>
        <p className={`text-xs mt-0.5 ${s.mc}`}>{message}</p>
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
  const [totalBBM, setTotalBBM] = useState(0);        // Total BBM budget for GoalSeek
  const [goalseekStatus, setGoalseekStatus] = useState(null); // GoalSeek metadata
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
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'

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

  // =====================
  // SUPABASE DATA FETCHING (Phase 3.5: Data Binding)
  // =====================

  // Load user profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(profileData || user);
      }
      setLoading(false);
    };
    loadProfile();
  }, []);

  // Fetch assignments for Tab 3 assignment selector
  const fetchAssignments = useCallback(async () => {
    const { data, error } = await supabase
      .from('assignments')
      .select('id, name, lokasi, tanggal_mulai, tanggal_selesai')
      .eq('status', 'active')
      .order('tanggal_mulai', { ascending: false });
    if (!error && data) {
      return data;
    }
    return [];
  }, []);

  // Fetch operator_logs + bbm_pemakaian for a specific assignment
  const fetchDailyDataFromDB = useCallback(async (assignmentId) => {
    if (!assignmentId) return [];

    const [logsRes, bbmRes] = await Promise.all([
      supabase
        .from('operator_logs')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('tanggal', { ascending: true }),
      supabase
        .from('bbm_pemakaian')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('tanggal', { ascending: true })
    ]);

    // Merge logs + bbm by date into daily entries
    const mergedMap = {};

    if (logsRes.data) {
      logsRes.data.forEach(log => {
        const key = log.tanggal;
        if (!mergedMap[key]) mergedMap[key] = { tanggal: key, jam: 0, galian: 0, bbmHarian: 0, diterima: 0, q1: 0 };
        mergedMap[key].jam += log.jam_kerja || 0;
        mergedMap[key].galian += log.volume_galian || 0;
        mergedMap[key].q1 = log.q1_aktual || 0;
      });
    }

    if (bbmRes.data) {
      bbmRes.data.forEach(bbm => {
        const key = bbm.tanggal;
        if (!mergedMap[key]) mergedMap[key] = { tanggal: key, jam: 0, galian: 0, bbmHarian: 0, diterima: 0, q1: 0 };
        mergedMap[key].bbmHarian += bbm.jumlah_liter || 0;
        mergedMap[key].diterima += bbm.diterima_liter || 0;
      });
    }

    return Object.values(mergedMap)
      .map(entry => ({ ...entry, checked: true }))  // DB rows checked by default
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  }, []);

  // Recalculate GoalSeek for Pelaksanaan — ONLY from checked rows
  useEffect(() => {
    if (!kebutuhanRealisasi.dailyData || kebutuhanRealisasi.dailyData.length === 0) return;
    if (!geometri.totalVolume || geometri.totalVolume <= 0) return;

    // Filter only checked rows (checkbox = checked means data is included in totals)
    const checkedRows = kebutuhanRealisasi.dailyData.filter(d => d.checked !== false);

    const totalJam = checkedRows.reduce((a, d) => a + (d.jam || 0), 0);
    const totalGalian = checkedRows.reduce((a, d) => a + (d.galian || 0), 0);
    const totalBBMpakai = checkedRows.reduce((a, d) => a + (d.bbmHarian || 0), 0);
    const totalBBMditerima = checkedRows.reduce((a, d) => a + (d.diterima || 0), 0);

    if (totalBBMditerima <= 0) return;

    // Pass only checked rows to GoalSeek
    const dailyArray = checkedRows.map(d => ({
      jamKerja: d.jam || 8,
      galian: d.galian || 0,
      bbmPakai: d.bbmHarian || 0
    }));

    try {
      const gsResult = goalSeekBisectionPelaksanaan({
        totalVolume: geometri.totalVolume,
        totalBBMditerima,
        dailyData: dailyArray,
        targetSisaMin: 40,
        targetSisaMax: 100,
        hp: analisaRencana.hp,
        loadFactor: analisaRencana.loadFactor
      });

      setKebutuhanRealisasi(prev => ({
        ...prev,
        totalGalian,
        totalBBMterpakai: totalBBMpakai,
        sisaAkhir: gsResult.sisaAkhir,
        goalSeekPelaksanaan: gsResult
      }));
    } catch (err) {
      // Fallback: simple remaining calculation
      setKebutuhanRealisasi(prev => ({
        ...prev,
        totalGalian,
        totalBBMterpakai: totalBBMpakai,
        sisaAkhir: totalBBMditerima - totalBBMpakai
      }));
    }
  }, [
    kebutuhanRealisasi.dailyData,
    geometri.totalVolume,
    analisaRencana.hp,
    analisaRencana.loadFactor
  ]);

  // Calculate STA
  useEffect(() => {
    const { stas, totalVolume } = generateSTAPerencanaan(
      geometri.panjang, geometri.b1, geometri.b3, geometri.h, geometri.hPrime, geometri.slope
    );
    setGeometri(prev => ({ ...prev, stas, totalVolume }));
  }, [geometri.panjang, geometri.b1, geometri.b3, geometri.h, geometri.hPrime, geometri.slope]);

  // Recalculate analisa when excavator params change — powered by GoalSeek Bisection
  useEffect(() => {
    if (!geometri.totalVolume || geometri.totalVolume <= 0) return;

    const params = {
      hp: analisaRencana.hp,
      bucket: analisaRencana.bucket,
      fb: analisaRencana.fb,
      fa: analisaRencana.fa,
      fv: analisaRencana.fv,
      fk: analisaRencana.fk,
      loadFactor: analisaRencana.loadFactor,
      waktuGali: analisaRencana.waktuGali,
      tk: 8,
      feMenit: 45
    };

    // Run GoalSeek only when totalBBM budget is set (planning mode)
    const result = totalBBM > 0
      ? calculateAnalisaWithGoalSeek(geometri.totalVolume, { ...params, totalBBM })
      : calculateAnalisaRencana(geometri.totalVolume, params);

    setAnalisaRencana(prev => ({ ...prev, ...result }));

    // Extract and store GoalSeek metadata
    if (totalBBM > 0) {
      setGoalseekStatus({
        converged: result.converged,
        status: result.goalseekStatus,
        dalamRangeSNI: result.dalamRangeSNI,
        sisaAkhir: result.sisaAkhir,
        targetSisaIdeal: result.targetSisaIdeal,
        t1_detik: result.t1_detik
      });
    } else {
      setGoalseekStatus(null);
    }

    setPersonil(p => ({ ...p, durasiHari: Math.ceil(result.estimasiHari) }));
  }, [
    geometri.totalVolume,
    analisaRencana.hp,
    analisaRencana.bucket,
    analisaRencana.fb,
    analisaRencana.fa,
    analisaRencana.fv,
    analisaRencana.fk,
    analisaRencana.loadFactor,
    analisaRencana.waktuGali,
    totalBBM
  ]);

  // Recalculate personil RAB
  useEffect(() => {
    const pm = 75000;
    const sp = 130000;
    const sup = 120000;
    const op = 150000;
    const pk = 95000;
    const dur = personil.durasiHari || 1;

    const totalHOK =
      (personil.penjagaMalam * pm * dur);

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
  // Add daily realization entry — syncs to Supabase rap_realisasi_harian
  const handleAddDaily = async () => {
    if (!dailyInput.galian && !dailyInput.bbmHarian) return;

    const newEntry = {
      ...dailyInput,
      checked: true,   // new entries are checked by default (included in totals)
      _syncing: true
    };

    // Optimistic update to local state — totals stay reactive via useEffect
    setKebutuhanRealisasi(prev => ({
      ...prev,
      dailyData: [...prev.dailyData, newEntry]
    }));
    setDailyInput(prev => ({ ...prev, galian: 0, bbmHarian: 0, diterima: 0, jam: 8 }));

    // Persist to Supabase — non-blocking
    try {
      await fetch('/api/rap/realisasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: kebutuhanRealisasi.projectId || null,
          tanggal: dailyInput.tanggal,
          jam_kerja: dailyInput.jam,
          galian: dailyInput.galian,
          bbm_harian: dailyInput.bbmHarian,
          diterima: dailyInput.diterima,
          assignment_id: kebutuhanRealisasi.selectedAssignment || null
        })
      });
    } catch (err) {
      // Sync failed — entry stays in local state (will be re-synced later)
      console.warn('Failed to sync daily entry to Supabase:', err.message);
    }
  };

  // Toggle checkbox for a daily data row — only checked rows count toward totals
  const toggleDailyChecked = (index) => {
    setKebutuhanRealisasi(prev => {
      const updated = [...prev.dailyData];
      updated[index] = { ...updated[index], checked: !updated[index].checked };
      return { ...prev, dailyData: updated };
    });
  };

  // Auto-sync durasiHari from checked rows count — only if user hasn't manually overridden
  useEffect(() => {
    const checkedCount = (kebutuhanRealisasi.dailyData || []).filter(d => d.checked !== false).length;
    if (checkedCount > 0) {
      setPersonil(p => {
        // Only sync if durasi is still equal to the last auto-synced value (no manual override)
        if (p._lastAutoDurasi && p.durasiHari !== p._lastAutoDurasi) return p;
        return { ...p, durasiHari: checkedCount, _lastAutoDurasi: checkedCount };
      });
    }
  }, [kebutuhanRealisasi.dailyData]);

  // =====================
  // SUPABASE PROJECT PERSISTENCE (Phase 3.5)
  // =====================

  // Save RAP project + all related data to Supabase
  const saveProject = useCallback(async () => {
    if (!profile?.id) return;
    setSaveStatus('saving');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Upsert project
      const projectPayload = {
        program: geometri.kopData.program,
        kegiatan: geometri.kopData.kegiatan,
        pekerjaan: geometri.kopData.pekerjaan,
        lokasi: geometri.kopData.lokasi,
        tahun_anggaran: geometri.kopData.tahun,
        panjang: geometri.panjang,
        b1: geometri.b1,
        b2: geometri.b2,
        b3: geometri.b3,
        h: geometri.h,
        h_prime: geometri.hPrime,
        slope: geometri.slope,
        assignment_id: kebutuhanRealisasi.selectedAssignment,
        created_by: user.id,
        is_latest: true
      };

      const { data: project, error: projErr } = await supabase
        .from('rap_projects')
        .upsert(projectPayload, { onConflict: 'created_by' })
        .select()
        .single();

      if (projErr || !project) return;
      const projectId = project.id;

      // 2. Save STA perencanaan
      await fetch('/api/rap/sta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, type: 'perencanaan', stas: geometri.stas })
      });

      // 3. Save calculations (GoalSeek results)
      if (totalBBM > 0 && geometri.totalVolume > 0) {
        await fetch('/api/rap/calculations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: projectId,
            mode: 'perencanaan',
            volume: geometri.totalVolume,
            totalBBM,
            hp: analisaRencana.hp,
            bucket: analisaRencana.bucket,
            fb: analisaRencana.fb,
            fa: analisaRencana.fa,
            fv: analisaRencana.fv,
            fk: analisaRencana.fk,
            loadFactor: analisaRencana.loadFactor,
            waktuGali: analisaRencana.waktuGali,
            excavator_type: selectedAlat
          })
        });
      }

      // 4. Save personil
      const personilPayload = {
        project_id: projectId,
        durasi_hari: personil.durasiHari,
        supir: personil.supir,
        operator: personil.operator,
        pekerja: personil.pekerja,
        penjaga_malam: personil.penjagaMalam,
        total_hok: (personil.penjagaMalam + personil.supir + personil.operator + personil.pekerja) * personil.durasiHari,
        kebutuhan_solar: personil.kebutuhanSolar,
        subtotal_tenaga: rabPersonil.subtotalTenaga,
        subtotal_bahan: rabPersonil.subtotalBahan,
        sebelum_ppn: rabPersonil.sebelumPPN,
        ppn12: rabPersonil.ppn12,
        total: rabPersonil.total,
        pembulatan: rabPersonil.pembulatan
      };
      await supabase.from('rap_personil').upsert(personilPayload, { onConflict: 'project_id' });

      // 5. Save RAB final
      await supabase.from('rap_rab_final').upsert({
        project_id: projectId,
        volume: geometri.totalVolume,
        harga_satuan: rabFinal.hargaSatuan,
        grand_total: rabFinal.grandTotal,
        pagu: rabFinal.pagu,
        sisa_pagu: rabFinal.sisaPagu
      }, { onConflict: 'project_id' });

      // 6. Save TTD
      await supabase.from('rap_ttd').upsert({
        project_id: projectId,
        kpa_nama: ttd.kpaNama,
        kpa_nip: ttd.kpaNip,
        pptk_nama: ttd.pptkNama,
        pptk_nip: ttd.pptkNip,
        pptk_jabatan: ttd.pptkJabatan
      }, { onConflict: 'project_id' });

      // Update local state with saved projectId
      setKebutuhanRealisasi(prev => ({ ...prev, projectId }));

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
      return projectId;
    } catch (err) {
      setSaveStatus('error');
      console.warn('Auto-save failed:', err.message);
    }
  }, [profile, geometri, personil, rabPersonil, rabFinal, ttd, totalBBM, analisaRencana, selectedAlat, kebutuhanRealisasi.selectedAssignment]);

  // Load latest RAP project from Supabase on mount
  const loadLatestProject = useCallback(async () => {
    try {
      const { data: projects, error } = await supabase
        .from('rap_projects')
        .select(`
          *,
          rap_sta_perencanaan(*),
          rap_calculations(*),
          rap_personil(*),
          rap_rab_final(*),
          rap_ttd(*)
        `)
        .eq('is_latest', true)
        .limit(1);

      if (error || !projects || projects.length === 0) return;

      const proj = projects[0];

      // Restore geometri state
      if (proj.rap_sta_perencanaan?.length > 0) {
        const stas = proj.rap_sta_perencanaan.map(s => ({
          sta: s.sta_label,
          b1: s.b1, b2: s.b2, b3: s.b3, h: s.h, hPrime: s.h_prime,
          luas: s.luas, volume: s.volume
        }));
        setGeometri(prev => ({
          ...prev,
          panjang: proj.panjang || prev.panjang,
          b1: proj.b1 || prev.b1,
          b2: proj.b2 || prev.b2,
          b3: proj.b3 || prev.b3,
          h: proj.h || prev.h,
          hPrime: proj.h_prime || prev.hPrime,
          slope: proj.slope || prev.slope,
          stas,
          totalVolume: proj.rap_sta_perencanaan.reduce((a, s) => a + (s.volume || 0), 0)
        }));
        if (proj.kopData) {
          setGeometri(prev => ({ ...prev, kopData: { ...prev.kopData, ...proj } }));
        }
      }

      // Restore calculations (GoalSeek results)
      const activeCalc = (proj.rap_calculations || []).find(c => c.is_active);
      if (activeCalc) {
        setAnalisaRencana(prev => ({
          ...prev,
          hp: activeCalc.hp,
          bucket: activeCalc.bucket,
          fb: activeCalc.fb,
          fa: activeCalc.fa,
          fv: activeCalc.fv,
          fk: activeCalc.fk,
          loadFactor: activeCalc.load_factor,
          waktuGali: activeCalc.waktu_gali,
          t1: activeCalc.t1,
          q1: activeCalc.q1,
          q2: activeCalc.q2,
          h: activeCalc.h_liter_jam,
          h2: activeCalc.h2,
          estimasiHari: activeCalc.estimasi_hari,
          totalSolar: activeCalc.total_solar_used
        }));
        setTotalBBM(Math.round(activeCalc.total_solar_used + (activeCalc.sisa_akhir || 70)));
        setGoalseekStatus({
          converged: activeCalc.goalseek_converged,
          dalamRangeSNI: activeCalc.dalam_range_sni,
          sisaAkhir: activeCalc.sisa_akhir,
          targetSisaIdeal: 70,
          t1_detik: activeCalc.t1_detik
        });
      }

      // Restore personil
      if (proj.rap_personil) {
        const rp = proj.rap_personil;
        setPersonil(prev => ({
          ...prev,
          durasiHari: rp.durasi_hari || prev.durasiHari,
          supir: rp.supir || prev.supir,
          operator: rp.operator || prev.operator,
          pekerja: rp.pekerja || prev.pekerja,
          penjagaMalam: rp.penjaga_malam || prev.penjagaMalam,
          kebutuhanSolar: rp.kebutuhan_solar || prev.kebutuhanSolar
        }));
        setRabPersonil(prev => ({
          ...prev,
          subtotalTenaga: rp.subtotal_tenaga || prev.subtotalTenaga,
          subtotalBahan: rp.subtotal_bahan || prev.subtotalBahan,
          sebelumPPN: rp.sebelum_ppn || prev.sebelumPPN,
          ppn12: rp.ppn12 || prev.ppn12,
          total: rp.total || prev.total,
          pembulatan: rp.pembulatan || prev.pembulatan
        }));
      }

      // Restore RAB final
      if (proj.rap_rab_final) {
        setRabFinal(prev => ({
          ...prev,
          hargaSatuan: proj.rap_rab_final.harga_satuan || prev.hargaSatuan,
          grandTotal: proj.rap_rab_final.grand_total || prev.grandTotal,
          pagu: proj.rap_rab_final.pagu || prev.pagu,
          sisaPagu: proj.rap_rab_final.sisa_pagu || prev.sisaPagu
        }));
      }

      // Restore TTD
      if (proj.rap_ttd) {
        setTtd({
          kpaNama: proj.rap_ttd.kpa_nama || DEFAULT_TTD.kpaNama,
          kpaNip: proj.rap_ttd.kpa_nip || DEFAULT_TTD.kpaNip,
          pptkNama: proj.rap_ttd.pptk_nama || DEFAULT_TTD.pptkNama,
          pptkNip: proj.rap_ttd.pptk_nip || DEFAULT_TTD.pptkNip,
          pptkJabatan: proj.rap_ttd.pptk_jabatan || DEFAULT_TTD.pptkJabatan
        });
      }

      setKebutuhanRealisasi(prev => ({ ...prev, projectId: proj.id, selectedAssignment: proj.assignment_id }));
    } catch (err) {
      console.warn('Failed to load project from Supabase:', err.message);
    }
  }, [supabase]);

  // Trigger load after profile is known
  useEffect(() => {
    if (profile?.id) {
      loadLatestProject();
    }
  }, [profile]);

  // Auto-save project when key state changes (debounced by 2s)
  useEffect(() => {
    if (!profile?.id) return;
    if (!geometri.totalVolume || geometri.totalVolume <= 0) return;
    const timer = setTimeout(() => {
      saveProject();
    }, 2000);
    return () => clearTimeout(timer);
  }, [profile, geometri.totalVolume, personil, rabPersonil, rabFinal, ttd, totalBBM]);

  // Export Excel — pass only checked rows for Sheet 9
  const handleExportExcel = async () => {
    // Filter: only checked daily data rows contribute to totals
    const checkedDailyData = kebutuhanRealisasi.dailyData.filter(d => d.checked !== false);
    const totalJam = checkedDailyData.reduce((a, d) => a + (d.jam || 0), 0);
    const totalGalian = checkedDailyData.reduce((a, d) => a + (d.galian || 0), 0);
    const totalBBMpakai = checkedDailyData.reduce((a, d) => a + (d.bbmHarian || 0), 0);
    const totalBBMditerima = checkedDailyData.reduce((a, d) => a + (d.diterima || 0), 0);

    const rapState = {
      geometri,
      analisaRencana,
      kebutuhanRealisasi: {
        ...kebutuhanRealisasi,
        dailyData: checkedDailyData,
        totalGalian,
        totalBBMterpakai: totalBBMpakai,
        totalJam,
        totalBBMditerima,
        sisaAkhir: totalBBMditerima - totalBBMpakai
      },
      verifikasi,
      backupPelaksanaan,
      personil: {
        ...personil,
        durasiHari: checkedDailyData.length || personil.durasiHari
      },
      rabPersonil,
      rabFinal,
      ttd,
      checkedDailyData
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
    <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 border-[3px] border-[#1E3A5F]/20 border-t-[#1E3A5F] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#1E3A5F]/60 font-semibold text-sm tracking-wide">Memuat Perhitungan RAP...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <GovernmentHeader onExport={handleExportExcel} onPrint={handlePrint} saveStatus={saveStatus} />

      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#1E3A5F]/10 shadow-sm">
        <div className="max-w-7xl mx-auto px-5 py-3">
          <TabNavigation tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 py-6 pb-16">

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
                  {/* GoalSeek: Total BBM Budget */}
                  <div className="col-span-2">
                    <GovernmentInput
                      label="Total BBM Budget (GoalSeek)"
                      value={totalBBM}
                      onChange={(v) => setTotalBBM(v)}
                      unit="liter"
                      help={totalBBM > 0 ? `GoalSeek aktif — sisa target: ${goalseekStatus?.targetSisaIdeal || 70}L` : 'Isi untuk mengaktifkan GoalSeek bisection'}
                      icon="⛽"
                    />
                    {goalseekStatus && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${goalseekStatus.converged ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {goalseekStatus.converged ? '✓ Konvergen' : '⚠ Approksimasi'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${goalseekStatus.dalamRangeSNI ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                          {goalseekStatus.dalamRangeSNI ? '✓ Dalam Range SNI' : '✗ Luar SNI'}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                          Sisa BBM: {goalseekStatus.sisaAkhir?.toFixed(1)}L
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          T.1: {goalseekStatus.t1_detik?.toFixed(2)}s
                        </span>
                      </div>
                    )}
                  </div>
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
            {/* Assignment Selector + Supabase Sync Status */}
            <div className="grid lg:grid-cols-3 gap-4">
              <ProfessionalCard title="📡 ASSIGNMENTS (DARI DATABASE)" subtitle="Ambil data dari tabel assignments" headerColor="blue">
                <div className="space-y-3">
                  <select
                    value={kebutuhanRealisasi.selectedAssignment || ''}
                    onChange={async (e) => {
                      const assignmentId = e.target.value;
                      setKebutuhanRealisasi(prev => ({ ...prev, selectedAssignment: assignmentId || null }));
                      if (assignmentId) {
                        const entries = await fetchDailyDataFromDB(assignmentId);
                        setKebutuhanRealisasi(prev => ({ ...prev, dailyData: entries }));
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-blue-200 bg-white font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  >
                    <option value="">— Pilih Assignment —</option>
                    <option value="__manual__">+ Input Manual</option>
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Memilih assignment akan otomatis menarik data dari <code className="bg-slate-100 px-1 rounded">operator_logs</code> + <code className="bg-slate-100 px-1 rounded">bbm_pemakaian</code>
                  </p>
                </div>
              </ProfessionalCard>

              {/* GoalSeek Pelaksanaan Result */}
              {kebutuhanRealisasi.goalSeekPelaksanaan && (
                <ProfessionalCard title="🎯 GOALSEEK PELAKSANAAN" subtitle="Estimasi akhir berdasarkan data lapangan" headerColor="violet">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-violet-50 rounded-lg p-2 text-center border border-violet-200">
                      <p className="text-violet-500 font-bold uppercase text-[10px]">Estimasi Hari</p>
                      <p className="text-xl font-black text-violet-700">{kebutuhanRealisasi.goalSeekPelaksanaan.fd?.toFixed(1) || '—'}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-2 text-center border border-emerald-200">
                      <p className="text-emerald-500 font-bold uppercase text-[10px]">Sisa BBM</p>
                      <p className="text-xl font-black text-emerald-700">{kebutuhanRealisasi.goalSeekPelaksanaan.sisaAkhir?.toFixed(1) || '—'} L</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-2 text-center border border-amber-200">
                      <p className="text-amber-500 font-bold uppercase text-[10px]">Total Galian</p>
                      <p className="text-xl font-black text-amber-700">{kebutuhanRealisasi.goalSeekPelaksanaan.totalGalianPrediksi?.toFixed(0) || '—'} m³</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 text-center border border-slate-200">
                      <p className="text-slate-500 font-bold uppercase text-[10px]">Deviasi</p>
                      <p className="text-xl font-black text-slate-700">{kebutuhanRealisasi.goalSeekPelaksanaan.deviasiVolume != null ? `${kebutuhanRealisasi.goalSeekPelaksanaan.deviasiVolume > 0 ? '+' : ''}${kebutuhanRealisasi.goalSeekPelaksanaan.deviasiVolume.toFixed(1)}%` : '—'}</p>
                    </div>
                  </div>
                </ProfessionalCard>
              )}

              {/* Sisa BBM Summary */}
              <ProfessionalCard title="📊 SISA BBM" subtitle={`${kebutuhanRealisasi.dailyData.filter(d => d.checked !== false).length} baris aktif`} headerColor={kebutuhanRealisasi.sisaAkhir > 40 ? 'emerald' : 'rose'}>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">BBM Diterima</span>
                    <span className="font-bold">{kebutuhanRealisasi.dailyData.filter(d => d.checked !== false).reduce((a, d) => a + (d.diterima || 0), 0).toFixed(0)} L</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">BBM Terpakai</span>
                    <span className="font-bold text-amber-600">{kebutuhanRealisasi.totalBBMterpakai.toFixed(0)} L</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between">
                    <span className="font-bold text-slate-700">Sisa</span>
                    <span className={`font-black text-xl ${kebutuhanRealisasi.sisaAkhir >= 40 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {kebutuhanRealisasi.sisaAkhir.toFixed(1)} L
                    </span>
                  </div>
                  <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-center ${kebutuhanRealisasi.sisaAkhir >= 40 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {kebutuhanRealisasi.sisaAkhir >= 40 ? '✓ Dalam Target (40-100L)' : '⚠ Di bawah target'}
                  </div>
                </div>
              </ProfessionalCard>
            </div>

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

              {/* Summary Stats — totals from checked rows only */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <StatCard label="Total Galian" value={kebutuhanRealisasi.totalGalian.toFixed(0)} unit="m³" color="emerald" />
                  <StatCard label="Total BBM" value={kebutuhanRealisasi.totalBBMterpakai.toFixed(0)} unit="liter" color="amber" />
                  <StatCard label="Rata-rata Q1" value={(() => {
                    const checked = kebutuhanRealisasi.dailyData.filter(d => d.checked !== false);
                    const totalJam = checked.reduce((a, d) => a + (d.jam || 0), 0);
                    return checked.length > 0 && totalJam > 0
                      ? (kebutuhanRealisasi.totalGalian / totalJam).toFixed(2)
                      : '0';
                  })()} unit="m³/jam" color="blue" />
                  <StatCard label="Tercentang" value={kebutuhanRealisasi.dailyData.filter(d => d.checked !== false).length} unit="entri" color="violet" />
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
                      {/* Header row */}
                      <div className="flex items-center gap-2 px-1 pb-1">
                        <input
                          type="checkbox"
                          checked={kebutuhanRealisasi.dailyData.every(d => d.checked !== false)}
                          onChange={(e) => {
                            setKebutuhanRealisasi(prev => ({
                              ...prev,
                              dailyData: prev.dailyData.map(d => ({ ...d, checked: e.target.checked }))
                            }));
                          }}
                          className="w-4 h-4 rounded accent-blue-600"
                          title="Pilih semua"
                        />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Ceklis untuk ikut dihitung</span>
                        <span className="ml-auto text-[10px] font-bold text-blue-600">
                          {kebutuhanRealisasi.dailyData.filter(d => d.checked !== false).length}/{kebutuhanRealisasi.dailyData.length} tercentang
                        </span>
                      </div>
                      {kebutuhanRealisasi.dailyData.map((d, i) => (
                        <div
                          key={i}
                          className={`rounded-lg p-3 border text-sm transition-all ${
                            d.checked !== false
                              ? 'bg-white border-blue-200 shadow-sm'
                              : 'bg-slate-100 border-slate-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="checkbox"
                              checked={d.checked !== false}
                              onChange={() => toggleDailyChecked(i)}
                              className="w-4 h-4 rounded accent-blue-600 flex-shrink-0"
                              title={d.checked !== false ? 'Klik untukExclude dari total' : 'Klik untuk masukkan ke total'}
                            />
                            <span className={`font-bold ${d.checked !== false ? 'text-slate-700' : 'text-slate-400'} text-xs`}>
                              #{i + 1} — {new Date(d.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                            <span className="ml-auto text-xs text-slate-400">{d.jam} jam</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${d.checked !== false ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>
                              {d.checked !== false ? '✓ Aktif' : '○ 非aktif'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-1 text-xs">
                            <div><span className="text-slate-500">Galian:</span> <span className={`font-semibold ${d.checked === false ? 'line-through' : ''}`}>{d.galian} m³</span></div>
                            <div><span className="text-slate-500">Q1:</span> <span className={`font-semibold ${d.checked === false ? 'line-through' : ''}`}>{d.q1} m³/j</span></div>
                            <div><span className="text-slate-500">BBM:</span> <span className={`font-semibold text-amber-600 ${d.checked === false ? 'line-through' : ''}`}>{d.bbmHarian} L</span></div>
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
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 text-center">
                  <p className="text-xs text-blue-500 uppercase font-bold">Persentase</p>
                  <p className="text-xl font-bold text-blue-600 mt-1">
                    {kebutuhanRealisasi.totalGalian > 0 ? ((kebutuhanRealisasi.totalGalian / geometri.totalVolume) * 100).toFixed(1) : 0}%
                  </p>
                  <p className="text-[10px] text-blue-400 mt-0.5">dari rencana</p>
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
                    onChange={(v) => setPersonil({ ...personil, durasiHari: v, _lastAutoDurasi: null })}
                    unit="hari"
                    help={`Auto-sync dari ${kebutuhanRealisasi.dailyData.filter(d => d.checked !== false).length} baris tercentang`}
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
                  </div>
                </div>
              </ProfessionalCard>

              <ProfessionalCard title="REKAPITULASI PERSONIL" subtitle="Total HOK dan kebutuhan" headerColor="emerald">
                <div className="space-y-3">
                  {[
                    { label: 'Penjaga Malam', qty: personil.penjagaMalam, dur: personil.durasiHari, harga: 75000, icon: '🛡️' }
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
