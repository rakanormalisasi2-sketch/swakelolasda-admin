'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import CrossSectionSVG from '@/components/CrossSectionSVG';
import { printCrossSections } from '@/utils/rapPrint';
import { downloadExcel } from '@/utils/rapExport';
import {
  calculateAnalisaRencana,
  calculateAnalisaWithGoalSeek,
  goalSeekBisectionPerencanaan,
  generateSTAPerencanaan,
  MASTER_EXCAVATOR_SPECS,
  SNI_WAKTU_SIKLUS,
  SNI_BUCKET_FACTOR,
  SNI_EFFICIENCY_FACTOR,
  LOAD_FACTOR
} from '@/utils/calcRapMath';
import {
  Ruler, ArrowDown, Route, Wrench, Settings2,
  CheckCircle2, ChevronLeft, ChevronRight, Eye,
  ZoomIn, ZoomOut, Focus, Fuel, Download, Printer,
  FileText, BarChart3, Table2, Image as ImageIcon,
  HelpCircle, BookOpen, Plus, Check, CloudOff, PenLine
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   CIVIC PRECISION DESIGN SYSTEM — Dinas PU Engineering Portal
   ═══════════════════════════════════════════════════════════ */

// --- NAV ITEMS ---
const NAV_ICONS = { 1: Ruler, 2: Wrench, 3: FileText, 4: CheckCircle2 };
const NAV_ITEMS = [
  { id: 1, label: 'Geometri' },
  { id: 2, label: 'Alat' },
  { id: 3, label: 'Log' },
  { id: 4, label: 'Finalisasi' },
];

const EXCAVATOR_OPTIONS = [
  { key: 'PC50',  label: 'PC 50',  bucket: 0.22, hp: 42 },
  { key: 'PC75',  label: 'PC 75',  bucket: 0.35, hp: 65 },
  { key: 'PC100', label: 'PC 100', bucket: 0.45, hp: 97 },
  { key: 'PC200', label: 'PC 200', bucket: 0.93, hp: 143 },
  { key: 'PC200LA', label: 'PC 200 Long Arm', bucket: 0.46, hp: 148 },
];

// ─── Reusable: Engineering Input ───
function EngInput({ label, value, onChange, unit, type = 'number', step, helperText }) {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <div className="relative group mb-4">
      <label className="block text-xs font-semibold text-[#424751] mb-1 ml-1 transition-colors group-focus-within:text-[#00346f]">
        {label}
        {helperText && <span className="ml-1 text-[10px] text-amber-500 font-normal border border-amber-200 bg-amber-50 px-1 rounded">SNI</span>}
      </label>
      <div className="relative flex items-center">
        <input
          type={type}
          step={step}
          value={value}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={e => onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
          className="w-full bg-[#f8f9ff] border-0 border-b-2 border-transparent focus:border-[#00346f] px-4 py-3 text-[#0b1c30] text-sm focus:ring-0 transition-all rounded-t-sm outline-none"
          style={{ fontFamily: "'Roboto Mono', monospace" }}
        />
        {unit && <span className="absolute right-4 text-xs font-mono text-[#424751]">{unit}</span>}
      </div>
      {helperText && (
        <div className={`absolute z-10 left-0 top-[calc(100%+4px)] w-[120%] bg-[#0b1c30] text-white text-[10px] leading-relaxed p-2.5 rounded-lg shadow-xl transition-all duration-200 pointer-events-none origin-top ${isFocused ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <div className="font-bold text-amber-400 mb-1 border-b border-white/20 pb-1">Standar AHSP / SNI:</div>
          {helperText}
          <div className="absolute -top-1 left-4 w-2 h-2 bg-[#0b1c30] rotate-45"></div>
        </div>
      )}
    </div>
  );
}

// ─── Reusable: Section Card ───
function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-[#eff4ff] rounded-xl p-6 mb-6">
      <h3 className="text-xs font-bold text-[#00346f] uppercase tracking-wider mb-4 flex items-center gap-2">
        {Icon && <Icon size={16} />}
        {title}
      </h3>
      {children}
    </div>
  );
}

// ─── Reusable: Stat Metric ───
function MetricCard({ label, value, unit, sub, accent = false }) {
  return (
    <div className={`p-5 rounded-xl border ${accent ? 'bg-[#00346f] text-white border-[#004a99]' : 'bg-white border-[#c2c6d3]/15'}`}>
      <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${accent ? 'text-blue-200' : 'text-[#424751]'}`}>
        {label}
      </p>
      <div className="flex items-baseline gap-1">
        <span className={`text-3xl font-black tracking-tight ${accent ? 'text-white' : 'text-[#0b1c30]'}`}
              style={{ fontFamily: "'Roboto Mono', monospace" }}>
          {value}
        </span>
        {unit && <span className={`text-sm font-medium ${accent ? 'text-blue-300' : 'text-[#424751]'}`}>{unit}</span>}
      </div>
      {sub && <p className={`text-[10px] mt-1 ${accent ? 'text-blue-300' : 'text-[#737783]'}`}>{sub}</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function RapWizard() {
  const [step, setStep] = useState(1);

  // ── STATE: Step 1 — Geometri ──
  const [geometri, setGeometri] = useState({
    b1: 4.0, b3: 6.857, h: 1.0, hGalian: 1.0, slope: 1, panjang: 540,
    lebarStripping: 2.0, kedalamanStripping: 0.10
  });

  // ── STATE: Step 2 — Alat ──
  const [selectedExcavator, setSelectedExcavator] = useState('PC200');
  const [alatParams, setAlatParams] = useState({
    hp: 143, bucket: 0.93, fb: 0.9, fa: 0.83, fv: 0.8, fk: 0.8,
    loadFactor: 0.28, waktuGali: 38, tk: 7, totalBBM: 600
  });

  // ── STATE: Step 3 — Realisasi ──
  const [dailyData, setDailyData] = useState([]);
  const [checkedIds, setCheckedIds] = useState(new Set());

  // ── STATE: Step 4 — Finalisasi ──
  const [kopData, setKopData] = useState({
    pekerjaan: 'Normalisasi Sungai',
    lokasi: '-7.2912, 112.7314',
    preparedBy: 'Ir. Budi Santoso, MT',
    approvedBy: 'Dr. Hendra Wijaya, IAI'
  });

  // ════════════════════════════════════
  // DERIVED CALCULATIONS (Real-time)
  // ════════════════════════════════════
  const b2 = useMemo(() => Math.max(geometri.b3 - 2 * geometri.slope * geometri.h, 0.1), [geometri]);
  const luasGalian = useMemo(() => ((geometri.b1 + geometri.b3) / 2) * geometri.hGalian, [geometri]);
  const volumeGalian = useMemo(() => luasGalian * geometri.panjang, [luasGalian, geometri.panjang]);
  const volumeStripping = useMemo(() => geometri.lebarStripping * geometri.kedalamanStripping * geometri.panjang, [geometri.lebarStripping, geometri.kedalamanStripping, geometri.panjang]);
  const totalVolume = useMemo(() => volumeGalian + volumeStripping, [volumeGalian, volumeStripping]);

  // GoalSeek-powered analysis
  const analisa = useMemo(() => {
    try {
      return calculateAnalisaWithGoalSeek(totalVolume, {
        ...alatParams,
        totalBBM: alatParams.totalBBM
      });
    } catch {
      return calculateAnalisaRencana(totalVolume, alatParams);
    }
  }, [totalVolume, alatParams]);

  // Checkbox aggregation
  const selectedData = useMemo(() => dailyData.filter(d => checkedIds.has(d.id)), [dailyData, checkedIds]);
  const selTotals = useMemo(() => selectedData.reduce((acc, d) => ({
    jam: acc.jam + (d.jam || 0),
    galian: acc.galian + (d.galian || 0),
    bbm: acc.bbm + (d.bbm || 0),
  }), { jam: 0, galian: 0, bbm: 0 }), [selectedData]);

  const durasiHOK = selectedData.length;
  const costBBM = selTotals.bbm * 22300;
  const costPenjaga = 2 * 75000 * durasiHOK; // 2 penjaga malam
  const grandTotal = (costBBM + costPenjaga) * 1.12; // + PPN 12%

  // ── Sync excavator selection ──
  useEffect(() => {
    const spec = MASTER_EXCAVATOR_SPECS[selectedExcavator];
    if (spec) {
      setAlatParams(p => ({ 
        ...p, 
        hp: spec.hp, 
        bucket: spec.bucket,
        fb: spec.fb,
        fa: spec.fa,
        loadFactor: spec.loadFactor
      }));
    }
  }, [selectedExcavator]);

  // ── Fetch daily data from Supabase ──
  useEffect(() => {
    async function fetchLogs() {
      try {
        const { data } = await supabase.from('operator_logs').select('*').order('tanggal');
        if (data && data.length > 0) {
          setDailyData(data.map(d => ({
            id: d.id,
            tanggal: d.tanggal,
            jam: d.jam_kerja || 7,
            galian: (d.jam_kerja || 7) * (analisa?.q1 || 50),
            bbm: (d.jam_kerja || 7) * (analisa?.H || 6),
            unit: d.unit_alat || selectedExcavator,
            keterangan: d.keterangan || 'Galian saluran'
          })));
        } else {
          // Demo data if DB empty
          setDailyData([
            { id: 1, tanggal: '2025-07-17', jam: 6.7, galian: 355.6, bbm: 46.2, unit: 'EXC-01', keterangan: 'Galian Segmen A' },
            { id: 2, tanggal: '2025-07-21', jam: 8.0, galian: 424.6, bbm: 55.1, unit: 'EXC-01', keterangan: 'Galian Segmen B' },
            { id: 3, tanggal: '2025-07-22', jam: 6.2, galian: 329.1, bbm: 42.7, unit: 'EXC-01', keterangan: 'Galian Saluran' },
            { id: 4, tanggal: '2025-07-23', jam: 7.4, galian: 392.8, bbm: 51.0, unit: 'EXC-01', keterangan: 'Galian Tanah Biasa' },
          ]);
        }
      } catch {
        setDailyData([]);
      }
    }
    fetchLogs();
  }, []);

  const groupedLogs = useMemo(() => {
    return dailyData.reduce((acc, curr) => {
      const groupName = curr.keterangan || 'Pekerjaan Umum';
      if (!acc[groupName]) acc[groupName] = [];
      acc[groupName].push(curr);
      return acc;
    }, {});
  }, [dailyData]);

  const toggleCheck = (id) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleGroup = (groupName) => {
    const logsInGroup = groupedLogs[groupName] || [];
    const allChecked = logsInGroup.every(log => checkedIds.has(log.id));
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (allChecked) {
        logsInGroup.forEach(log => next.delete(log.id));
      } else {
        logsInGroup.forEach(log => next.add(log.id));
      }
      return next;
    });
  };

  // ── Handlers ──
  const handlePrint = () => {
    const stasRencana = generateSTAPerencanaan({ ...geometri, b1: geometri.b1, b3: geometri.b3, h: geometri.h, hPrime: geometri.hGalian, panjang: geometri.panjang });
    
    // Auto-GoalSeek Pelaksanaan: mencari b1 agar volume galian cocok dgn Log Realisasi
    const targetVolumeSaluran = selTotals.galian - volumeStripping;
    let b1Pelaksanaan = geometri.b1;
    if (targetVolumeSaluran > 0 && geometri.hGalian > 0 && geometri.panjang > 0) {
       const targetLuas = targetVolumeSaluran / geometri.panjang;
       b1Pelaksanaan = (2 * targetLuas / geometri.hGalian) - geometri.b3;
       if (b1Pelaksanaan < 0.1) b1Pelaksanaan = 0.1; // batas minimal
    }
    const stasPelaksanaan = generateSTAPerencanaan({ ...geometri, b1: b1Pelaksanaan, b3: geometri.b3, h: geometri.h, hPrime: geometri.hGalian, panjang: geometri.panjang });

    const rapStateForPrint = {
      geometri: { stas: stasRencana.stas, kopData, slope: geometri.slope, ...geometri, hPrime: geometri.hGalian },
      backupPelaksanaan: { stas: stasPelaksanaan.stas, b1: b1Pelaksanaan },
      analisaRencana: alatParams,
      personil: { durasiHari: durasiHOK, penjagaMalam: 2 },
      selTotals,
      dailyData: dailyData.filter(d => checkedIds.has(d.id)),
      kopData,
      grandTotal,
      costBBM,
      costPenjaga,
      analisaCalculated: analisa
    };
    
    printCrossSections(rapStateForPrint);
  };

  const handleExportExcel = () => {
    const stasRencana = generateSTAPerencanaan({ ...geometri, b1: geometri.b1, b3: geometri.b3, h: geometri.h, hPrime: geometri.hGalian, panjang: geometri.panjang });
    
    // Auto-GoalSeek Pelaksanaan
    const targetVolumeSaluran = selTotals.galian - volumeStripping;
    let b1Pelaksanaan = geometri.b1;
    if (targetVolumeSaluran > 0 && geometri.hGalian > 0 && geometri.panjang > 0) {
       const targetLuas = targetVolumeSaluran / geometri.panjang;
       b1Pelaksanaan = (2 * targetLuas / geometri.hGalian) - geometri.b3;
       if (b1Pelaksanaan < 0.1) b1Pelaksanaan = 0.1;
    }
    const stasPelaksanaan = generateSTAPerencanaan({ ...geometri, b1: b1Pelaksanaan, b3: geometri.b3, h: geometri.h, hPrime: geometri.hGalian, panjang: geometri.panjang });

    const rapStateForPrint = {
      geometri: { stas: stasRencana.stas, kopData, slope: geometri.slope, ...geometri, hPrime: geometri.hGalian, volumeGalian, volumeStripping, totalVolume },
      backupPelaksanaan: { stas: stasPelaksanaan.stas, b1: b1Pelaksanaan },
      analisaRencana: alatParams,
      personil: { durasiHari: durasiHOK, penjagaMalam: 2 },
      selTotals,
      dailyData: dailyData.filter(d => checkedIds.has(d.id)),
      kopData,
      grandTotal,
      costBBM,
      costPenjaga,
      analisaCalculated: analisa
    };

    downloadExcel({
      ...rapStateForPrint,
      selectedExcavator,
      selectedDailyIndices: [...checkedIds].map(id => dailyData.findIndex(d => d.id === id)).filter(i => i >= 0),
      dailyData
    });
  };

  // ════════════════════════════════════
  // RENDER
  // ════════════════════════════════════
  return (
    <>
      <div style={{ display: 'flex', width: '100%', backgroundColor: '#f8f9ff', borderTop: '1px solid #e2e8f0', overflow: 'hidden', height: 'calc(100vh - 85px)', position: 'relative' }}>

        {/* ─── LEFT: Input Form (Fixed Sidebar) ─── */}
        <div style={{ width: '400px', height: '100%', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', zIndex: 10, flexShrink: 0, borderRight: '1px solid #e2e8f0', boxShadow: '4px 0 24px -8px rgba(11,28,48,0.05)' }}>

            {/* Stepper */}
            <div style={{ padding: '16px 20px', backgroundColor: '#f8f9ff', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', width: '100%' }}>
                <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: '100%', height: '1px', backgroundColor: '#e2e8f0', zIndex: -1 }} />
                {NAV_ITEMS.map(item => {
                  const active = step === item.id;
                  const done = step > item.id;
                  const Icon = NAV_ICONS[item.id];
                  return (
                    <button key={item.id} onClick={() => setStep(item.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#f8f9ff', padding: '0 8px', outline: 'none', border: 'none', cursor: 'pointer' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', transition: 'all 0.2s', ...(active ? { backgroundColor: '#00346f', color: '#ffffff', boxShadow: '0 4px 6px -1px rgba(0, 52, 111, 0.2)' } : done ? { backgroundColor: '#10b981', color: '#ffffff' } : { backgroundColor: '#eff4ff', border: '1px solid #c2c6d3', color: '#424751' }) }}>
                        {done ? <Check size={14} /> : item.id}
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px', color: active ? '#00346f' : 'rgba(66, 71, 81, 0.5)' }}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable Form Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

              {/* ══ STEP 1: GEOMETRI ══ */}
              {step === 1 && (
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-[#0b1c30] mb-2">Geometri Saluran</h2>
                  <p className="text-sm text-[#424751] mb-8">Definisikan parameter dimensi profil trapesium terbalik saluran.</p>

                  <Section icon={Ruler} title="Parameter Lebar">
                    <EngInput label="Lebar Dasar — b1 (m)" value={geometri.b1} onChange={v => setGeometri(g => ({...g, b1: v}))} unit="m" step="0.1" />
                    <EngInput label="Lebar Atas — b3 (m)" value={geometri.b3} onChange={v => setGeometri(g => ({...g, b3: v}))} unit="m" step="0.1" />
                  </Section>

                  <Section icon={ArrowDown} title="Parameter Kedalaman">
                    <EngInput label="Tinggi Saluran Rencana — h (m)" value={geometri.h} onChange={v => setGeometri(g => ({...g, h: v}))} unit="m" step="0.1" />
                    <EngInput label="Tinggi Galian dari Eksisting — h' (m)" value={geometri.hGalian} onChange={v => setGeometri(g => ({...g, hGalian: v}))} unit="m" step="0.1" />
                  </Section>

                  <Section icon={Route} title="Parameter Memanjang">
                    <EngInput label="Panjang Total Saluran — L (m)" value={geometri.panjang} onChange={v => setGeometri(g => ({...g, panjang: v}))} unit="m" />
                  </Section>

                  <Section icon={Ruler} title="Stripping Area (Jalur Alat)">
                    <EngInput label="Lebar Stripping (m)" value={geometri.lebarStripping} onChange={v => setGeometri(g => ({...g, lebarStripping: v}))} unit="m" step="0.1" />
                    <EngInput label="Kedalaman Stripping (m)" value={geometri.kedalamanStripping} onChange={v => setGeometri(g => ({...g, kedalamanStripping: v}))} unit="m" step="0.01" />
                  </Section>
                </div>
              )}

              {/* ══ STEP 2: ALAT & SNI ══ */}
              {step === 2 && (
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-[#0b1c30] mb-2">Alat & Standar SNI</h2>
                  <p className="text-sm text-[#424751] mb-8">Konfigurasi parameter alat berat sesuai spesifikasi teknis.</p>

                  <Section icon={Wrench} title="Kelas Excavator">
                    <div className="grid grid-cols-2 gap-3">
                      {EXCAVATOR_OPTIONS.map(exc => (
                        <button key={exc.key} onClick={() => setSelectedExcavator(exc.key)}
                          className={`text-left p-4 rounded-xl border-2 transition-all outline-none ${
                            selectedExcavator === exc.key
                              ? 'border-[#00346f] bg-[#d7e2ff]/30 shadow-md'
                              : 'border-[#c2c6d3]/30 bg-white hover:border-[#c2c6d3]'
                          }`}>
                          <div className="font-bold text-[#0b1c30] text-sm">{exc.label}</div>
                          <div className="text-[10px] text-[#424751] font-mono mt-1">{exc.bucket} m³ / {exc.hp} HP</div>
                        </button>
                      ))}
                    </div>
                  </Section>

                  <Section icon={Settings2} title="Faktor Efisiensi (SNI / AHSP)">
                    <div className="grid grid-cols-2 gap-4">
                      <EngInput label="Kapasitas Bucket (V)" value={alatParams.bucket} onChange={v => setAlatParams(p => ({...p, bucket: v}))} unit="m³" step="0.01" />
                      <EngInput label="Tenaga Alat (HP)" value={alatParams.hp} onChange={v => setAlatParams(p => ({...p, hp: v}))} unit="HP" step="1" />
                      
                      <EngInput 
                        label="Faktor Bucket (Fb)" value={alatParams.fb} onChange={v => setAlatParams(p => ({...p, fb: v}))} step="0.01" 
                        helperText={<div>• Pasir/Kerikil: 0.8 - 1.0<br/>• Tanah Biasa: 0.6 - 0.8<br/>• Lempung Keras: 0.5 - 0.6<br/>• Batuan Pecah: 0.4 - 0.5</div>} 
                      />
                      <EngInput 
                        label="Efisiensi Alat (Fa)" value={alatParams.fa} onChange={v => setAlatParams(p => ({...p, fa: v}))} step="0.01" 
                        helperText={<div>• Kondisi Baik Sekali: 0.83<br/>• Kondisi Baik: 0.75<br/>• Kondisi Sedang: 0.69<br/>• Kondisi Buruk: 0.52</div>}
                      />
                      <EngInput 
                        label="Konversi Galian (Fv)" value={alatParams.fv} onChange={v => setAlatParams(p => ({...p, fv: v}))} step="0.01" 
                        helperText={<div>• Tanah Biasa: 0.8<br/>• Tanah Keras: 0.6<br/>• Batu: 0.5</div>}
                      />
                      <EngInput 
                        label="Efisiensi Wkt (Fe menit)" value={alatParams.feMenit || 48} onChange={v => setAlatParams(p => ({...p, feMenit: v}))} unit="min" step="1" 
                        helperText={<div>• Standar AHSP: 45 menit (0.75)<br/>• Optimal: 48 - 50 menit<br/>(Disesuaikan untuk GoalSeek BBM)</div>}
                      />
                      
                      <EngInput label="Waktu Gali (Fd)" value={alatParams.waktuGali} onChange={v => setAlatParams(p => ({...p, waktuGali: v}))} unit="sec" step="0.1" />
                      <EngInput label="Jam Efektif Harian (Tk)" value={alatParams.tk} onChange={v => setAlatParams(p => ({...p, tk: v}))} unit="jam" step="1" />
                    </div>
                    <div className="mt-4 pt-4 border-t border-[#c2c6d3]/20">
                      <EngInput label="Total Budget BBM" value={alatParams.totalBBM} onChange={v => setAlatParams(p => ({...p, totalBBM: v}))} unit="L" />
                    </div>
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                      <HelpCircle size={16} className="text-amber-600 mt-0.5" />
                      <p className="text-[10px] text-amber-800 leading-relaxed">
                        <strong>Panduan AHSP:</strong> Perubahan manual pada nilai Efisiensi dan Kapasitas sangat memengaruhi kalkulasi <i>GoalSeek</i> BBM dan Waktu Siklus. Pastikan Anda mengacu pada batas toleransi SNI agar realisasi pelaporan tidak ditolak.
                      </p>
                    </div>
                  </Section>
                </div>
              )}

              {/* ══ STEP 3: LOG REALISASI ══ */}
              {step === 3 && (
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-[#0b1c30] mb-2">Daily Logs</h2>
                  <p className="text-sm text-[#424751] mb-6">Pilih entri untuk disertakan dalam laporan realisasi.</p>

                  <div className="space-y-6">
                    {Object.entries(groupedLogs).map(([groupName, logs]) => {
                      const allChecked = logs.every(log => checkedIds.has(log.id));
                      const someChecked = logs.some(log => checkedIds.has(log.id));
                      
                      return (
                        <div key={groupName} className="bg-white rounded-xl border border-[#c2c6d3]/20 overflow-hidden shadow-sm">
                          <div 
                            className="flex items-center justify-between p-4 bg-[#eff4ff]/50 border-b border-[#c2c6d3]/20 cursor-pointer hover:bg-[#eff4ff] transition-colors"
                            onClick={() => toggleGroup(groupName)}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                                allChecked ? 'bg-[#00346f] text-white' : someChecked ? 'bg-[#00346f]/60 text-white' : 'border-2 border-[#c2c6d3]'
                              }`}>
                                {(allChecked || someChecked) && <span className="material-symbols-outlined text-[14px]">{allChecked ? 'check' : 'remove'}</span>}
                              </div>
                              <h3 className="font-bold text-sm text-[#0b1c30] uppercase tracking-wide">{groupName}</h3>
                            </div>
                            <span className="text-xs font-semibold text-[#424751] bg-white px-2 py-1 rounded-md border border-[#c2c6d3]/20">
                              {logs.length} Log Harian
                            </span>
                          </div>
                          <div className="p-2 space-y-1 bg-[#f8f9ff]">
                            {logs.map(d => {
                              const checked = checkedIds.has(d.id);
                              return (
                                <button key={d.id} onClick={() => toggleCheck(d.id)}
                                  className={`w-full text-left p-3 rounded-lg border flex items-center gap-4 transition-all outline-none ${
                                    checked ? 'border-[#00346f] bg-white shadow-sm' : 'border-transparent hover:bg-white hover:border-[#c2c6d3]/30'
                                  }`}>
                                  <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                                    checked ? 'bg-[#00346f] text-white' : 'border-2 border-[#c2c6d3]'
                                  }`}>
                                    {checked && <span className="material-symbols-outlined text-[12px]">check</span>}
                                  </div>
                                  <div className="flex-1 min-w-0 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <span className="font-bold text-sm text-[#0b1c30] w-24">{d.tanggal}</span>
                                      <span className="px-2 py-0.5 rounded bg-[#eff4ff] text-[10px] font-mono font-bold text-[#00346f]">{d.unit}</span>
                                    </div>
                                    <span className="font-mono text-xs font-bold text-[#424751]">{d.jam} Jam</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    {dailyData.length === 0 && (
                      <div className="text-center py-16 text-[#424751] text-sm">
                        <span className="material-symbols-outlined text-4xl mb-2 block opacity-30">cloud_off</span>
                        Belum ada data log harian.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ══ STEP 4: FINALISASI ══ */}
              {step === 4 && (
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-[#0b1c30] mb-2">Report Metadata</h2>
                  <p className="text-sm text-[#424751] mb-8">Finalisasi detail proyek sebelum ekspor.</p>

                  <Section icon={FileText} title="Identitas Proyek">
                    <EngInput label="Nama Pekerjaan" value={kopData.pekerjaan} onChange={v => setKopData(k => ({...k, pekerjaan: v}))} type="text" />
                    <EngInput label="Lokasi / Koordinat" value={kopData.lokasi} onChange={v => setKopData(k => ({...k, lokasi: v}))} type="text" />
                  </Section>

                  <Section icon={PenLine} title="Signatories">
                    <EngInput label="Prepared By" value={kopData.preparedBy} onChange={v => setKopData(k => ({...k, preparedBy: v}))} type="text" />
                    <EngInput label="Approved By" value={kopData.approvedBy} onChange={v => setKopData(k => ({...k, approvedBy: v}))} type="text" />
                  </Section>
                </div>
              )}
            </div>

            {/* Bottom Nav Buttons */}
            <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, boxShadow: '0 -4px 12px rgba(0,0,0,0.02)', marginTop: 'auto' }}>
              <button disabled={step === 1} onClick={() => setStep(s => s - 1)}
                style={{ cursor: step === 1 ? 'not-allowed' : 'pointer', opacity: step === 1 ? 0.3 : 1, padding: '8px 24px', borderRadius: '8px', border: '1px solid rgba(194,198,211,0.5)', color: '#424751', fontWeight: 600, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'transparent', transition: 'all 0.2s' }}>
                <ChevronLeft size={18} /> Back
              </button>
              {step < 4 ? (
                <button onClick={() => setStep(s => s + 1)}
                  style={{ padding: '8px 24px', borderRadius: '8px', color: '#ffffff', fontWeight: 600, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #00346f, #004a99)', boxShadow: '0 8px 24px -4px rgba(0,52,111,0.2)' }}>
                  Next Step <ChevronRight size={18} />
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={handlePrint}
                    style={{ padding: '8px 20px', borderRadius: '8px', border: '2px solid #00346f', color: '#00346f', fontWeight: 600, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <Printer size={18} /> Cetak Langsung
                  </button>
                  <button onClick={handleExportExcel}
                    style={{ padding: '8px 20px', borderRadius: '8px', color: '#ffffff', fontWeight: 600, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #00346f, #004a99)', boxShadow: '0 8px 24px -4px rgba(0,52,111,0.2)' }}>
                    <Download size={18} /> Unduh XLSX
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ─── RIGHT: Live Preview Panel (Flex-1) ─── */}
          <div style={{ display: 'flex', flex: 1, minWidth: 0, flexDirection: 'column', position: 'relative', overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
            {/* Blueprint Dot Grid */}
            <div style={{ position: 'absolute', inset: 0, opacity: 0.03, pointerEvents: 'none', backgroundImage: 'radial-gradient(#0b1c30 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

            <div style={{ flex: 1, overflowY: 'auto', padding: '32px', position: 'relative', zIndex: 10 }}>

              {/* ══ STEP 1 & 2: CAD PREVIEW ══ */}
              {step <= 2 && (
                <div style={{ maxWidth: '896px', margin: '0 auto', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column' }}>
                  {/* Telemetry Header */}
                  {step === 2 && (
                    <div className="mb-6">
                      <p className="text-[10px] font-bold text-[#00346f] uppercase tracking-widest mb-1">Real-Time Telemetry</p>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-2xl font-black text-[#0b1c30] tracking-tight">Calculation Dashboard</h3>
                        <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-[#c2c6d3]/20">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Synced</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <MetricCard
                          label="Production Rate (Q1)"
                          value={(analisa?.q1 || 0).toFixed(2)}
                          unit="m³/hour"
                          sub={`Target > 40.00 ${analisa?.q1 > 40 ? '✅ Optimal' : '⚠️ Low'}`}
                        />
                        <MetricCard
                          label="Daily Output (Q2)"
                          value={(analisa?.q2 || 0).toFixed(2)}
                          unit="m³/day"
                          sub={`Based on ${alatParams.tk} effective working hours`}
                        />
                      </div>
                      <div className="bg-white p-5 rounded-xl border border-[#c2c6d3]/15 flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                          <Fuel size={24} className="text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-[#424751] font-semibold">Estimated BBM Consumption</p>
                          <p className="text-3xl font-black text-[#0b1c30] font-mono">{(analisa?.H || 0).toFixed(1)} <span className="text-sm font-medium text-[#424751]">Liters/hour</span></p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-[#424751] font-mono">Formula: {alatParams.loadFactor} x HP</p>
                          <p className="text-[10px] font-bold text-[#00346f]">Multiplier: SNI 2023</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Live CAD Panel */}
                  <div className="bg-[#eff4ff]/70 backdrop-blur-lg rounded-xl border border-[#c2c6d3]/20 overflow-hidden"
                       style={{ boxShadow: '0 32px 64px -12px rgba(11,28,48,0.1)' }}>
                    <div className="px-6 py-4 border-b border-[#c2c6d3]/15 flex justify-between items-center bg-white/50">
                      <div className="flex items-center gap-3">
                        <Eye size={20} className="text-[#00346f]" />
                        <h3 className="font-semibold text-sm tracking-tight text-[#0b1c30]">Live CAD Preview</h3>
                      </div>
                      <div className="flex gap-2">
                        <button className="p-1.5 rounded-md hover:bg-[#eff4ff] text-[#424751] transition-colors">
                          <ZoomIn size={20} />
                        </button>
                        <button className="p-1.5 rounded-md hover:bg-[#eff4ff] text-[#424751] transition-colors">
                          <ZoomOut size={20} />
                        </button>
                        <button className="p-1.5 rounded-md hover:bg-[#eff4ff] text-[#424751] transition-colors">
                          <Focus size={20} />
                        </button>
                      </div>
                    </div>
                    <div className="p-4 aspect-[16/10]">
                      <CrossSectionSVG
                        staData={{ dimensi: { ...geometri, hPrime: geometri.hGalian }, luasGalian }}
                        kopData={kopData}
                        width={1200}
                        height={750}
                      />
                    </div>
                    <div className="bg-[#d3e4fe]/60 backdrop-blur-md border-t border-[#c2c6d3]/20 px-6 py-2 flex items-center justify-between text-[10px] font-mono text-[#424751]">
                      <div className="flex gap-6">
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Scale: 1:50</span>
                        <span>Unit: Meters (m)</span>
                      </div>
                      <span>Total Vol: {totalVolume.toFixed(2)} m³ (Galian: {volumeGalian.toFixed(2)} | Stripping: {volumeStripping.toFixed(2)})</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ══ STEP 3: REALISASI DASHBOARD ══ */}
              {step === 3 && (
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-black text-[#0b1c30] tracking-tight">Accumulated Realization</h3>
                    <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-[#c2c6d3]/20">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Metrics Updated</span>
                    </div>
                  </div>
                  <p className="text-sm text-[#424751] mb-6">Real-time metrics based on {checkedIds.size} selected logs.</p>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <MetricCard label="Total Duration" value={selTotals.jam.toFixed(1)} unit="h" sub={durasiHOK > 0 ? `${durasiHOK} hari kerja (HOK)` : 'Belum ada yang dipilih'} />
                    <MetricCard label="Total BBM Used" value={selTotals.bbm.toFixed(0)} unit="L" sub={`Efficiency: ${analisa?.H?.toFixed(1) || '—'}L/hr`} />
                  </div>

                  {/* Grand Total Card */}
                  <div className="p-6 rounded-xl text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #00346f, #004a99)' }}>
                    <div className="absolute right-0 bottom-0 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
                    <div className="relative z-10">
                      <h4 className="text-sm font-bold text-blue-200 mb-1">Grand Total Realization Cost</h4>
                      <p className="text-xs text-blue-300 mb-4">Includes equipment rental and fuel costs.</p>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                          <p className="text-[10px] text-blue-200 uppercase font-bold tracking-wider">Fuel</p>
                          <p className="text-lg font-black font-mono">Rp {costBBM.toLocaleString('id-ID', {maximumFractionDigits: 0})}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                          <p className="text-[10px] text-blue-200 uppercase font-bold tracking-wider">Personnel</p>
                          <p className="text-lg font-black font-mono">Rp {costPenjaga.toLocaleString('id-ID', {maximumFractionDigits: 0})}</p>
                        </div>
                      </div>
                      <div className="flex items-end justify-end">
                        <span className="text-2xl font-bold text-blue-300 mr-2">Rp</span>
                        <span className="text-5xl font-black font-mono tracking-tight">{grandTotal.toLocaleString('id-ID', {maximumFractionDigits: 0})}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ══ STEP 4: REPORT SUMMARY ══ */}
              {step === 4 && (
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-2xl font-black text-[#0b1c30] tracking-tight">Report Summary</h3>
                      <p className="text-xs text-[#424751] font-mono mt-1">DOC-ID: PU-{new Date().getFullYear()}-{Math.floor(Math.random()*9000+1000)}-FIN</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-emerald-200">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Ready for Export</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white p-6 rounded-xl border border-[#c2c6d3]/15 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <BarChart3 size={24} className="text-[#00346f]" />
                        <span className="text-xs text-[#424751] font-mono">Pg 1-4</span>
                      </div>
                      <h4 className="font-bold text-[#0b1c30] mb-1">Calculation Summary</h4>
                      <p className="text-xs text-[#424751]">RAB, Analisa Perencanaan, Personil, dan Volume backup.</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-[#c2c6d3]/15 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <Table2 size={24} className="text-[#00346f]" />
                        <span className="text-xs text-[#424751] font-mono">Pg 5-12</span>
                      </div>
                      <h4 className="font-bold text-[#0b1c30] mb-1">Data Logs</h4>
                      <p className="text-xs text-[#424751]">Tabel kebutuhan realisasi harian dan running balance BBM.</p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-[#c2c6d3]/15 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-[#eff4ff] flex items-center justify-center">
                      <ImageIcon size={32} className="text-[#00346f]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#0b1c30]">CAD Schematics</h4>
                      <p className="text-xs text-[#424751]">5 High-resolution cross-section drawings ready for print (2 per A4 landscape).</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
      </div>
    </>
  );
}
