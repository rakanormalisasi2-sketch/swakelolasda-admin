'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import CrossSectionSVG from '@/components/CrossSectionSVG';
import {
  MASTER_EXCAVATOR_SPECS,
  SNI_WAKTU_SIKLUS,
  LOAD_FACTOR,
  calculateAnalisaRencana,
  goalSeekSisaBBM,
  goalSeekT1Verifikasi,
  generateSTAPerencanaan,
  generateSTAPelaksanaan
} from '@/utils/calcRapMath';
import { downloadExcel } from '@/utils/rapExport';
import { printCrossSections } from '@/utils/rapPrint';

// Tab Configuration
const TABS = [
  { id: 'tab1', label: '1. Geometri', icon: '📐' },
  { id: 'tab2', label: '2. Excavator', icon: '⚙️' },
  { id: 'tab3', label: '3. Realisasi', icon: '📋' },
  { id: 'tab4', label: '4. Verifikasi', icon: '✓' },
  { id: 'tab5', label: '5. Volume Pelaksanaan', icon: '📊' },
  { id: 'tab6', label: '6. Personil', icon: '👷' },
  { id: 'tab7', label: '7. RAB Personil', icon: '💰' },
  { id: 'tab8', label: '8. RAB Final', icon: '📄' },
  { id: 'tab9', label: '9. TTD & Cetak', icon: '🖊️' }
];

// Default TTD
const DEFAULT_TTD = {
  kpaNama: 'JAFAR SODIQ, ST, MM',
  kpaNip: '19760818 200312 1 005',
  pptkNama: 'GALUH SETIAWAN ROSMI, ST',
  pptkNip: '19790511 200312 1 006'
};

export default function PerhitunganRapPage() {
  // Profile & Loading
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
      tahun: new Date().getFullYear()
    }
  });

  // Tab 2: Excavator & Analisa
  const [selectedAlat, setSelectedAlat] = useState('PC200');
  const [analisaRencana, setAnalisaRencana] = useState({
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
    q1: 89.57,
    q2: 716.60,
    h: 22.90,
    h2: 183.21,
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

  // Tab 6-7: Personil & RAB Personil
  const [personil, setPersonil] = useState({
    durasiHari: 0,
    totalHOK: 0,
    kebutuhanSolar: 0
  });

  const [rabPersonil, setRabPersonil] = useState({
    subtotal: 0,
    ppn12: 0,
    total: 0,
    pembulatan: 0
  });

  // Tab 8: RAB Final
  const [rabFinal, setRabFinal] = useState({
    hargaSatuan: 5701.51,
    hargaPPN: 6385.69,
    grandTotal: 0,
    pagu: 3600000000,
    sisaPagu: 0
  });

  // Tab 9: TTD
  const [ttd, setTtd] = useState(DEFAULT_TTD);

  // Fetch Session
  useEffect(() => {
    async function loadSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: prof } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single();
        setProfile(prof);

        // Load TTD dari localStorage
        if (typeof window !== 'undefined') {
          const savedTtd = localStorage.getItem('rap_ttd_default');
          if (savedTtd) {
            setTtd(JSON.parse(savedTtd));
          }
        }

        // Fetch assignments
        const { data: assignData } = await supabase
          .from('assignments')
          .select('*')
          .eq('created_by_role', prof?.role)
          .eq('status', 'active');

        if (assignData) {
          setAssignments(assignData);
        }
      }
      setLoading(false);
    }
    loadSession();
  }, []);

  // Generate STA when geometri changes
  useEffect(() => {
    const result = generateSTAPerencanaan(geometri);
    setGeometri(prev => ({
      ...prev,
      stas: result.stas,
      totalVolume: result.totalVolume,
      totalStripping: result.totalStripping
    }));
  }, [geometri.panjang, geometri.b1, geometri.b2, geometri.b3, geometri.h, geometri.hPrime]);

  // Calculate Analisa when params change
  useEffect(() => {
    const specs = MASTER_EXCAVATOR_SPECS[selectedAlat] || MASTER_EXCAVATOR_SPECS['PC200'];
    const params = {
      hp: analisaRencana.hp,
      bucket: analisaRencana.bucket,
      fb: analisaRencana.fb,
      fa: analisaRencana.fa,
      fv: analisaRencana.fv,
      fk: analisaRencana.fk,
      loadFactor: specs.loadFactor || 0.28,
      feMenit: analisaRencana.feMenit,
      waktuGali: analisaRencana.waktuGali
    };

    const result = calculateAnalisaRencana(geometri.totalVolume, params);
    setAnalisaRencana(prev => ({
      ...prev,
      hp: specs.hp,
      bucket: specs.bucket,
      loadFactor: specs.loadFactor || 0.28,
      ...result
    }));
  }, [selectedAlat, geometri.totalVolume]);

  // Calculate Personil & RAB when deps change
  useEffect(() => {
    const durasi = Math.ceil(geometri.totalVolume / (analisaRencana.q2 || 1));
    const solar = geometri.totalVolume * (analisaRencana.koefBBM || 0.25);

    setPersonil({
      durasiHari: durasi,
      totalHOK: durasi * 2,
      kebutuhanSolar: solar
    });

    // RAB Personil
    const hargaPM = 75000;
    const hargaSolar = 22300;
    const subtotal = (durasi * 2 * hargaPM) + (solar * hargaSolar);
    const ppn12 = subtotal * 0.12;
    const total = subtotal + ppn12;
    const pembulatan = Math.floor(total / 1000) * 1000;

    setRabPersonil({ subtotal, ppn12, total, pembulatan });

    // RAB Final
    const grandTotal = (geometri.totalVolume * rabFinal.hargaPPN) + (durasi * 2 * 75000 * 1.12);
    setRabFinal(prev => ({
      ...prev,
      grandTotal,
      sisaPagu: prev.pagu - grandTotal
    }));
  }, [geometri.totalVolume, analisaRencana.q2, analisaRencana.koefBBM]);

  // GoalSeek Tab 3 when daily data changes
  useEffect(() => {
    if (kebutuhanRealisasi.dailyData.length === 0) return;

    const totalJam = kebutuhanRealisasi.dailyData.reduce((sum, d) => sum + d.jam, 0);
    const totalDiterima = kebutuhanRealisasi.dailyData.reduce((sum, d) => sum + (d.diterima || 0), 0);

    const params = {
      hp: analisaRencana.hp,
      bucket: analisaRencana.bucket,
      fb: analisaRencana.fb,
      fa: analisaRencana.fa,
      fv: analisaRencana.fv,
      fk: analisaRencana.fk,
      loadFactor: analisaRencana.loadFactor,
      feMenit: analisaRencana.feMenit,
      waktuGali: analisaRencana.waktuGali
    };

    const goalSeekResult = goalSeekSisaBBM({
      totalBBMditerima: totalDiterima,
      totalJamKerja: totalJam,
      targetVolume: geometri.totalVolume,
      targetSisaIdeal: kebutuhanRealisasi.sisaTarget
    }, params);

    // Update daily data with goalseek results
    const updatedDaily = kebutuhanRealisasi.dailyData.map(d => ({
      ...d,
      q1: goalSeekResult.q1,
      galian: goalSeekResult.q1 * d.jam,
      bbmHarian: goalSeekResult.h * d.jam
    }));

    setKebutuhanRealisasi(prev => ({
      ...prev,
      ...goalSeekResult,
      dailyData: updatedDaily,
      totalGalian: goalSeekResult.totalGalian
    }));

    // Update Tab 4 Verifikasi
    const verif = goalSeekT1Verifikasi(goalSeekResult.h, params, selectedAlat);
    setVerifikasi(verif);
  }, [kebutuhanRealisasi.dailyData.length, kebutuhanRealisasi.sisaTarget]);

  // Generate Backup Pelaksanaan when conditions met
  useEffect(() => {
    if (geometri.stas.length === 0 || kebutuhanRealisasi.totalGalian === 0) return;

    const result = generateSTAPelaksanaan(
      geometri.panjang,
      geometri.stas[0],
      kebutuhanRealisasi.totalGalian
    );

    setBackupPelaksanaan(result);
  }, [geometri.stas, kebutuhanRealisasi.totalGalian]);

  // Save TTD to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && ttd) {
      localStorage.setItem('rap_ttd_default', JSON.stringify(ttd));
    }
  }, [ttd]);

  // Handle Select Assignment
  const handleSelectAssignment = (assign) => {
    // Generate sample daily data
    const sampleData = [];
    let cumulative = 0;
    let sisa = 0;

    for (let i = 0; i < 5; i++) {
      const jam = Math.random() * 3 + 5;
      const diterima = i === 1 ? 600 : 0;
      const q1 = analisaRencana.q1;
      const h = analisaRencana.h;
      const galian = q1 * jam;
      const bbmHarian = h * jam;

      sisa = sisa + diterima - bbmHarian;

      sampleData.push({
        tanggal: new Date(2025, 0, 16 + i),
        jam: Number(jam.toFixed(1)),
        q1,
        galian,
        bbmJam: h,
        bbmHarian,
        diterima,
        sisa: Math.max(0, sisa)
      });

      cumulative += galian;
    }

    setKebutuhanRealisasi(prev => ({
      ...prev,
      selectedAssignment: assign,
      dailyData: sampleData
    }));

    // Update kop data
    setGeometri(prev => ({
      ...prev,
      kopData: {
        ...prev.kopData,
        pekerjaan: `${assign.job_type} ${assign.job_sub_type}`.toUpperCase(),
        lokasi: `DESA ${assign.location_village}, KEC. ${assign.location_district}`.toUpperCase()
      }
    }));

    setShowSyncModal(false);
  };

  // Export Excel using rapExport utility
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

  if (loading) return <div className="p-8 text-center">Memuat...</div>;
  if (profile?.role !== 'seksi_normalisasi') return <div className="p-8">Akses ditolak.</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Perhitungan RAP - Normalisasi</h1>
          <p className="text-sm text-gray-500">Modul Perhitungan RAB Swakelola</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportExcel} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            📊 Export Excel
          </button>
          <button onClick={() => printCrossSections({ geometri, backupPelaksanaan })} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            🖨️ Print Gambar
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b px-4 py-2 flex gap-1 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded whitespace-nowrap text-sm font-medium transition ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* TAB 1: GEOMETRI */}
        {activeTab === 'tab1' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4">📐 Dimensi Saluran</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Panjang Total (m)</label>
                  <input type="number" value={geometri.panjang}
                    onChange={e => setGeometri({...geometri, panjang: Number(e.target.value)})}
                    className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">b₁ Lebar Dasar (m)</label>
                  <input type="number" step="0.001" value={geometri.b1}
                    onChange={e => setGeometri({...geometri, b1: Number(e.target.value)})}
                    className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">b₂ Lebar Bawah (m)</label>
                  <input type="number" step="0.001" value={geometri.b2}
                    onChange={e => setGeometri({...geometri, b2: Number(e.target.value)})}
                    className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">b₃ Lebar Atas (m)</label>
                  <input type="number" step="0.001" value={geometri.b3}
                    onChange={e => setGeometri({...geometri, b3: Number(e.target.value)})}
                    className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">h Kedalaman Galian (m)</label>
                  <input type="number" step="0.001" value={geometri.h}
                    onChange={e => setGeometri({...geometri, h: Number(e.target.value)})}
                    className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">h&apos; Tinggi Eksisting (m)</label>
                  <input type="number" step="0.001" value={geometri.hPrime}
                    onChange={e => setGeometri({...geometri, hPrime: Number(e.target.value)})}
                    className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Slope (1:m)</label>
                  <input type="number" value={geometri.slope}
                    onChange={e => setGeometri({...geometri, slope: Number(e.target.value)})}
                    className="w-full border rounded px-3 py-2" />
                </div>
              </div>
            </div>

            {/* Tabel STA */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">5 STA Otomatis</h2>
                <span className="text-xl font-bold text-blue-600">
                  Total: {geometri.totalVolume.toFixed(3)} m³
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left">STA</th>
                      <th className="px-4 py-2 text-right">b₁ (m)</th>
                      <th className="px-4 py-2 text-right">b₂ (m)</th>
                      <th className="px-4 py-2 text-right">b₃ (m)</th>
                      <th className="px-4 py-2 text-right">h (m)</th>
                      <th className="px-4 py-2 text-right">Luas (m²)</th>
                      <th className="px-4 py-2 text-right">Volume (m³)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {geometri.stas.map((sta, i) => (
                      <tr key={i} className={i === 0 ? 'bg-blue-50 font-bold' : ''}>
                        <td className="px-4 py-2">{sta.sta}{i === 0 ? ' ★' : ''}</td>
                        <td className="px-4 py-2 text-right">{sta.b1.toFixed(3)}</td>
                        <td className="px-4 py-2 text-right">{sta.b2.toFixed(3)}</td>
                        <td className="px-4 py-2 text-right">{sta.b3.toFixed(3)}</td>
                        <td className="px-4 py-2 text-right">{sta.h.toFixed(3)}</td>
                        <td className="px-4 py-2 text-right">{sta.luas.toFixed(3)}</td>
                        <td className="px-4 py-2 text-right">{(sta.volume || 0).toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Gambar Cross Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4">Gambar Cross-Section (5 STA)</h2>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {geometri.stas.map((sta, i) => (
                  <div key={i} className="min-w-[400px] border rounded-lg p-2">
                    <div className="text-center font-bold text-sm mb-2">
                      STA {sta.sta} {i === 0 ? '(Baseline)' : ''}
                    </div>
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
                      width={400}
                      height={280}
                      showKop={true}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EXCAVATOR */}
        {activeTab === 'tab2' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4">⚙️ Pilih Excavator</h2>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(MASTER_EXCAVATOR_SPECS).map(([key, spec]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedAlat(key)}
                    className={`p-3 rounded border text-center ${
                      selectedAlat === key ? 'bg-blue-100 border-blue-500' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-bold text-sm">{key}</div>
                    <div className="text-xs text-gray-500">{spec.hp} HP</div>
                    <div className="text-xs text-gray-500">{spec.bucket} m³</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4">Parameter Alat (Cell Merah)</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">HP (Tenaga)</label>
                  <input type="number" value={analisaRencana.hp}
                    onChange={e => setAnalisaRencana({...analisaRencana, hp: Number(e.target.value)})}
                    className="w-full border rounded px-3 py-2 bg-red-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Bucket (m³)</label>
                  <input type="number" step="0.01" value={analisaRencana.bucket}
                    onChange={e => setAnalisaRencana({...analisaRencana, bucket: Number(e.target.value)})}
                    className="w-full border rounded px-3 py-2 bg-red-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fb (Faktor Bucket)</label>
                  <input type="number" step="0.01" value={analisaRencana.fb}
                    onChange={e => setAnalisaRencana({...analisaRencana, fb: Number(e.target.value)})}
                    className="w-full border rounded px-3 py-2 bg-red-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fa (Efisiensi)</label>
                  <input type="number" step="0.01" value={analisaRencana.fa}
                    onChange={e => setAnalisaRencana({...analisaRencana, fa: Number(e.target.value)})}
                    className="w-full border rounded px-3 py-2 bg-red-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fv (Konversi)</label>
                  <input type="number" step="0.01" value={analisaRencana.fv}
                    onChange={e => setAnalisaRencana({...analisaRencana, fv: Number(e.target.value)})}
                    className="w-full border rounded px-3 py-2 bg-red-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fk (Pengembangan)</label>
                  <input type="number" step="0.01" value={analisaRencana.fk}
                    onChange={e => setAnalisaRencana({...analisaRencana, fk: Number(e.target.value)})}
                    className="w-full border rounded px-3 py-2 bg-red-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Load Factor (L/kWh)</label>
                  <input type="number" step="0.01" value={analisaRencana.loadFactor}
                    onChange={e => setAnalisaRencana({...analisaRencana, loadFactor: Number(e.target.value)})}
                    className="w-full border rounded px-3 py-2 bg-red-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Waktu Gali (detik)</label>
                  <input type="number" value={analisaRencana.waktuGali}
                    onChange={e => setAnalisaRencana({...analisaRencana, waktuGali: Number(e.target.value)})}
                    className="w-full border rounded px-3 py-2 bg-red-50" />
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-6">
              <h2 className="text-lg font-bold mb-4 text-yellow-800">📊 Hasil Perhitungan (Cell Kuning)</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{analisaRencana.t1.toFixed(4)}</div>
                  <div className="text-sm text-gray-500">T.1 (menit)</div>
                </div>
                <div className="bg-white rounded p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{analisaRencana.q1.toFixed(2)}</div>
                  <div className="text-sm text-gray-500">Q1 (m³/jam)</div>
                </div>
                <div className="bg-white rounded p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{analisaRencana.q2.toFixed(2)}</div>
                  <div className="text-sm text-gray-500">Q2 (m³/hari)</div>
                </div>
                <div className="bg-white rounded p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{analisaRencana.h.toFixed(2)}</div>
                  <div className="text-sm text-gray-500">H (L/jam)</div>
                </div>
                <div className="bg-white rounded p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{analisaRencana.estimasiHari}</div>
                  <div className="text-sm text-gray-500">Estimasi Hari</div>
                </div>
                <div className="bg-white rounded p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">{analisaRencana.totalSolar.toFixed(2)}</div>
                  <div className="text-sm text-gray-500">Total Solar (L)</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: REALISASI */}
        {activeTab === 'tab3' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4">📋 Data Realisasi</h2>
              <button
                onClick={() => setShowSyncModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                📋 Pilih Laporan dari Database
              </button>
            </div>

            {kebutuhanRealisasi.dailyData.length > 0 && (
              <>
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-bold mb-4">Tabel Harian</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left">No</th>
                          <th className="px-3 py-2 text-left">Tanggal</th>
                          <th className="px-3 py-2 text-right">Jam</th>
                          <th className="px-3 py-2 text-right bg-yellow-50">Q1 (m³/jam)</th>
                          <th className="px-3 py-2 text-right">Galian (m³)</th>
                          <th className="px-3 py-2 text-right">BBM/Jam</th>
                          <th className="px-3 py-2 text-right">BBM Harian</th>
                          <th className="px-3 py-2 text-right">Diterima</th>
                          <th className="px-3 py-2 text-right">Sisa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kebutuhanRealisasi.dailyData.map((d, i) => (
                          <tr key={i} className="border-b">
                            <td className="px-3 py-2">{i + 1}</td>
                            <td className="px-3 py-2">{new Date(d.tanggal).toLocaleDateString('id-ID')}</td>
                            <td className="px-3 py-2 text-right">{d.jam}</td>
                            <td className="px-3 py-2 text-right bg-yellow-50 font-bold">{d.q1.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right">{d.galian.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right">{d.bbmJam.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right">{d.bbmHarian.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right">{d.diterima || '-'}</td>
                            <td className="px-3 py-2 text-right">{d.sisa.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-300 rounded-lg p-6">
                  <h3 className="font-bold text-green-800 mb-2">🎯 GoalSeek Result: Sisa BBM</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded p-4 text-center">
                      <div className="text-sm text-gray-500">Target Sisa</div>
                      <div className="text-xl font-bold">{kebutuhanRealisasi.sisaTarget} L</div>
                    </div>
                    <div className="bg-white rounded p-4 text-center">
                      <div className="text-sm text-gray-500">Sisa Akhir</div>
                      <div className="text-xl font-bold text-green-600">{kebutuhanRealisasi.sisaAkhir?.toFixed(2) || 0} L</div>
                    </div>
                    <div className="bg-white rounded p-4 text-center">
                      <div className="text-sm text-gray-500">Status</div>
                      <div className={`text-xl font-bold ${kebutuhanRealisasi.sisaAkhir >= 40 && kebutuhanRealisasi.sisaAkhir <= 100 ? 'text-green-600' : 'text-yellow-600'}`}>
                        {kebutuhanRealisasi.sisaAkhir >= 40 && kebutuhanRealisasi.sisaAkhir <= 100 ? '✓ IDEAL' : '⚠️ CEK'}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 4: VERIFIKASI */}
        {activeTab === 'tab4' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4">✓ Verifikasi T.1 Pelaksanaan</h2>

              {verifikasi.t1 > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="bg-blue-50 rounded-lg p-6 text-center">
                      <div className="text-sm text-gray-500 mb-2">T.1 Hasil GoalSeek</div>
                      <div className="text-4xl font-bold text-blue-600">{verifikasi.t1.toFixed(4)}</div>
                      <div className="text-sm text-gray-500">menit</div>
                    </div>
                    <div className={`rounded-lg p-6 text-center ${verifikasi.dalamRange ? 'bg-green-50' : 'bg-red-50'}`}>
                      <div className="text-sm text-gray-500 mb-2">Status Validasi</div>
                      <div className={`text-2xl font-bold ${verifikasi.dalamRange ? 'text-green-600' : 'text-red-600'}`}>
                        {verifikasi.status}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-100 rounded-lg p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 mb-1">Range SNI {selectedAlat}</div>
                        <div className="flex items-center">
                          <span className="text-sm font-bold">{verifikasi.sniMin?.toFixed(3)}</span>
                          <div className="flex-1 mx-2 h-3 bg-gray-300 rounded relative">
                            <div
                              className={`absolute h-full rounded ${verifikasi.dalamRange ? 'bg-green-500' : 'bg-red-500'}`}
                              style={{
                                left: `${((verifikasi.t1 - verifikasi.sniMin) / (verifikasi.sniMax - verifikasi.sniMin)) * 100}%`,
                                width: '8px',
                                transform: 'translateX(-50%)'
                              }}
                            />
                          </div>
                          <span className="text-sm font-bold">{verifikasi.sniMax?.toFixed(3)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {verifikasi.warning && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
                      <p className="text-yellow-800">{verifikasi.warning}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-500">Silakan pilih data laporan terlebih dahulu di Tab 3.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: VOLUME PELAKSANAAN */}
        {activeTab === 'tab5' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">📊 Backup Volume Pelaksanaan</h2>
                <span className="text-xl font-bold text-blue-600">
                  Total: {backupPelaksanaan.totalVolume.toFixed(3)} m³
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                ★ STA 0 = STA 0 Perencanaan (baseline)
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left">STA</th>
                      <th className="px-4 py-2 text-right">b₁ (m)</th>
                      <th className="px-4 py-2 text-right">b₃ (m)</th>
                      <th className="px-4 py-2 text-right">h (m)</th>
                      <th className="px-4 py-2 text-right">Luas (m²)</th>
                      <th className="px-4 py-2 text-right">Volume (m³)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backupPelaksanaan.stas.map((sta, i) => (
                      <tr key={i} className={i === 0 ? 'bg-blue-50 font-bold' : ''}>
                        <td className="px-4 py-2">{sta.sta}{i === 0 ? ' ★' : ''}</td>
                        <td className="px-4 py-2 text-right">{sta.b1.toFixed(3)}</td>
                        <td className="px-4 py-2 text-right">{sta.b3.toFixed(3)}</td>
                        <td className="px-4 py-2 text-right">{sta.h.toFixed(3)}</td>
                        <td className="px-4 py-2 text-right">{sta.luas.toFixed(3)}</td>
                        <td className="px-4 py-2 text-right">{(sta.volume || 0).toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Gambar Cross Section Pelaksanaan */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4">Gambar Cross-Section Pelaksanaan</h2>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {backupPelaksanaan.stas.map((sta, i) => (
                  <div key={i} className="min-w-[400px] border rounded-lg p-2">
                    <div className="text-center font-bold text-sm mb-2">
                      STA {sta.sta} {i === 0 ? '(Baseline ★)' : ''}
                    </div>
                    <CrossSectionSVG
                      staData={{
                        dimensi: { b1: sta.b1, b2: sta.b2, b3: sta.b3, h: sta.h, hPrime: sta.hPrime, slope: geometri.slope },
                        luasGalian: sta.luas
                      }}
                      kopData={{
                        ...geometri.kopData,
                        sta: sta.sta,
                        noLembar: i + 1,
                        jumlahLembar: backupPelaksanaan.stas.length,
                        jenis: 'PELAKSANAAN'
                      }}
                      width={400}
                      height={280}
                      showKop={true}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: PERSONIL */}
        {activeTab === 'tab6' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-4">👷 Personil & Koefisien</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold mb-2">A. TENAGA KERJA</h3>
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Uraian</th>
                      <th className="px-3 py-2 text-right">Durasi (Hari)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-3 py-2">Penjaga Malam 1</td>
                      <td className="px-3 py-2 text-right">{personil.durasiHari}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-3 py-2">Penjaga Malam 2</td>
                      <td className="px-3 py-2 text-right">{personil.durasiHari}</td>
                    </tr>
                    <tr className="font-bold">
                      <td className="px-3 py-2">Total HOK</td>
                      <td className="px-3 py-2 text-right">{personil.totalHOK} OH</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div>
                <h3 className="font-bold mb-2">B. BAHAN</h3>
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Uraian</th>
                      <th className="px-3 py-2 text-right">Volume</th>
                      <th className="px-3 py-2 text-right">Satuan</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-3 py-2">Solar</td>
                      <td className="px-3 py-2 text-right">{personil.kebutuhanSolar.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">Liter</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: RAB PERSONIL */}
        {activeTab === 'tab7' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-4">💰 RAB Personil</h2>
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Uraian</th>
                  <th className="px-4 py-2 text-center">Sat</th>
                  <th className="px-4 py-2 text-right">Volume</th>
                  <th className="px-4 py-2 text-right">Harga</th>
                  <th className="px-4 py-2 text-right">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-4 py-2">Penjaga Malam 1</td>
                  <td className="px-4 py-2 text-center">Hari</td>
                  <td className="px-4 py-2 text-right">{personil.durasiHari}</td>
                  <td className="px-4 py-2 text-right">Rp 75.000</td>
                  <td className="px-4 py-2 text-right">Rp {(personil.durasiHari * 75000).toLocaleString('id-ID')}</td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-2">Penjaga Malam 2</td>
                  <td className="px-4 py-2 text-center">Hari</td>
                  <td className="px-4 py-2 text-right">{personil.durasiHari}</td>
                  <td className="px-4 py-2 text-right">Rp 75.000</td>
                  <td className="px-4 py-2 text-right">Rp {(personil.durasiHari * 75000).toLocaleString('id-ID')}</td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-2">Solar (PPN 12%)</td>
                  <td className="px-4 py-2 text-center">Ltr</td>
                  <td className="px-4 py-2 text-right">{personil.kebutuhanSolar.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right">Rp 22.300</td>
                  <td className="px-4 py-2 text-right">Rp {(personil.kebutuhanSolar * 22300 * 1.12).toLocaleString('id-ID')}</td>
                </tr>
                <tr className="font-bold text-lg bg-blue-50">
                  <td className="px-4 py-3" colSpan={4}>TOTAL (Pembulatan)</td>
                  <td className="px-4 py-3 text-right">Rp {rabPersonil.pembulatan.toLocaleString('id-ID')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 8: RAB FINAL */}
        {activeTab === 'tab8' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-4">📄 RAB Pekerjaan Final</h2>
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Uraian</th>
                  <th className="px-4 py-2 text-center">Sat</th>
                  <th className="px-4 py-2 text-right">Volume</th>
                  <th className="px-4 py-2 text-right">Harga+PPN</th>
                  <th className="px-4 py-2 text-right">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-4 py-2">Galian+Menimbun Excavator</td>
                  <td className="px-4 py-2 text-center">m³</td>
                  <td className="px-4 py-2 text-right">{geometri.totalVolume.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right">Rp {rabFinal.hargaPPN.toLocaleString('id-ID')}</td>
                  <td className="px-4 py-2 text-right">Rp {(geometri.totalVolume * rabFinal.hargaPPN).toLocaleString('id-ID')}</td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-2">Jasa Keamanan</td>
                  <td className="px-4 py-2 text-center">OH</td>
                  <td className="px-4 py-2 text-right">{personil.totalHOK}</td>
                  <td className="px-4 py-2 text-right">Rp {(75000 * 1.12).toLocaleString('id-ID')}</td>
                  <td className="px-4 py-2 text-right">Rp {(personil.totalHOK * 75000 * 1.12).toLocaleString('id-ID')}</td>
                </tr>
                <tr className="font-bold text-lg bg-blue-50">
                  <td className="px-4 py-3" colSpan={4}>GRAND TOTAL</td>
                  <td className="px-4 py-3 text-right">Rp {rabFinal.grandTotal.toLocaleString('id-ID')}</td>
                </tr>
                <tr className="bg-green-50">
                  <td className="px-4 py-2" colSpan={4}>PAGU ANGGARAN</td>
                  <td className="px-4 py-2 text-right">Rp {rabFinal.pagu.toLocaleString('id-ID')}</td>
                </tr>
                <tr className="bg-green-50 text-green-700">
                  <td className="px-4 py-2" colSpan={4}>SISA PAGU</td>
                  <td className="px-4 py-2 text-right font-bold">Rp {rabFinal.sisaPagu.toLocaleString('id-ID')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 9: TTD & CETAK */}
        {activeTab === 'tab9' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4">🖊️ Tanda Tangan</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold mb-2">MENGETAHUI:</h3>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm mb-1">KPA (Nama)</label>
                      <input type="text" value={ttd.kpaNama}
                        onChange={e => setTtd({...ttd, kpaNama: e.target.value})}
                        className="w-full border rounded px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">KPA (NIP)</label>
                      <input type="text" value={ttd.kpaNip}
                        onChange={e => setTtd({...ttd, kpaNip: e.target.value})}
                        className="w-full border rounded px-3 py-2" />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold mb-2">MENYETUJUI:</h3>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm mb-1">PPTK (Nama)</label>
                      <input type="text" value={ttd.pptkNama}
                        onChange={e => setTtd({...ttd, pptkNama: e.target.value})}
                        className="w-full border rounded px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">PPTK (NIP)</label>
                      <input type="text" value={ttd.pptkNip}
                        onChange={e => setTtd({...ttd, pptkNip: e.target.value})}
                        className="w-full border rounded px-3 py-2" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded">
                <p className="text-sm text-blue-800">
                  ✓ Data TTD tersimpan otomatis dan akan autofill下次
                </p>
              </div>
            </div>

            <div className="bg-green-50 border border-green-300 rounded-lg p-6 text-center">
              <h3 className="font-bold mb-4">Ekspor Dokumen</h3>
              <button
                onClick={handleExportExcel}
                className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-bold"
              >
                📊 Download Excel (11 Sheet)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Pilih Laporan */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-auto">
            <h3 className="font-bold mb-4">Pilih Laporan</h3>
            {assignments.length === 0 ? (
              <p className="text-gray-500">Tidak ada data penugasan.</p>
            ) : (
              <div className="space-y-2">
                {assignments.map(a => (
                  <div key={a.id} className="border rounded p-3 hover:bg-gray-50">
                    <div className="font-bold">{a.job_type} {a.job_sub_type}</div>
                    <div className="text-sm text-gray-500">
                      Desa {a.location_village}, Kec. {a.location_district}
                    </div>
                    <button
                      onClick={() => handleSelectAssignment(a)}
                      className="mt-2 bg-blue-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Pilih
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowSyncModal(false)}
              className="mt-4 text-gray-500 hover:text-gray-700"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
