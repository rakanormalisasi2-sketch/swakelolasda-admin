'use client';
import { useEffect, useState, useCallback, Fragment } from 'react';
import React from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { MASTER_EXCAVATOR_SPECS, calculateFuelPerHour } from '@/utils/calcRapMath';
import KolomManager from './KolomManager';
import DokumentasiModal from './DokumentasiModal';
import HourmeterModal from './HourmeterModal';

// ─── Evaluasi formula sederhana ─────────────────────────────────────
function evaluateFormula(formula, log) {
  if (!formula) return '';
  try {
    // Ganti {field_key} dengan nilai dari log atau custom_fields
    let expr = formula.replace(/\{(\w+)\}/g, (_, key) => {
      const sysVal = log[key];
      if (sysVal !== undefined && sysVal !== null) return String(sysVal);
      const customVal = (log.custom_fields || {})[key];
      if (customVal !== undefined && customVal !== null) return String(customVal);
      return '0';
    });
    // Ganti × dan ÷ ke operator js
    expr = expr.replace(/×/g, '*').replace(/÷/g, '/');
    // SUM(a, b, c) → a + b + c
    expr = expr.replace(/SUM\(([^)]+)\)/gi, (_, args) =>
      args.split(',').map(s => s.trim()).join('+')
    );
    // Evaluasi
    const result = Function('"use strict"; return (' + expr + ')')();
    return isNaN(result) ? '' : (+result.toFixed(4)).toString();
  } catch { return ''; }
}

// ─── Ekstrak Google Drive File ID dari berbagai format URL ────────────
function extractDriveFileId(url) {
  if (!url) return null;
  const m = url.match(/\/d\/([a-zA-Z0-9_-]{25,})/)       // /file/d/{id}/view
    || url.match(/id=([a-zA-Z0-9_-]{25,})/)               // uc?export=view&id= atau thumbnail?id=
    || url.match(/\/([a-zA-Z0-9_-]{25,})\?/);             // format lain
  return m ? m[1] : null;
}

// Konversi URL ke format yang bisa dipakai sebagai <img src> (untuk cetak)
function driveUrlToImg(url) {
  const id = extractDriveFileId(url.trim());
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w800` : url.trim();
}

// Konversi URL ke format view yang bisa dibuka di tab baru (untuk link tabel)
function driveUrlToView(url) {
  const id = extractDriveFileId(url.trim());
  return id ? `https://drive.google.com/file/d/${id}/view` : url.trim();
}


export default function LaporanPelaksanaanPage() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pdfConfig, setPdfConfig] = useState(null);
  const [customColumns, setCustomColumns] = useState([]);
  const [kolomManagerOpen, setKolomManagerOpen] = useState(false);
  const [savingKolom, setSavingKolom] = useState(false);
  const [bbmMap, setBbmMap] = useState({}); // Kumpulan data BBM dari DB2
  const [tahunLaporan, setTahunLaporan] = useState(new Date().getFullYear().toString());

  
  // Modals Data & Flow
  const [filterTab, setFilterTab] = useState('semua');
  const [printModalInfo, setPrintModalInfo] = useState({ open: false, type: '' });
  const [printSelectedIds, setPrintSelectedIds] = useState([]);
  const [customPrintPekerjaan, setCustomPrintPekerjaan] = useState('');
  
  const [dokModalOpen, setDokModalOpen] = useState(false);
  const [dokSelection, setDokSelection] = useState({}); // { [logId+'_'+fotoIdx]: '0%'|'50%'|'100%'|'skip' }
  const [dokAccordion, setDokAccordion] = useState(null); // logId yang sedang terbuka

  const [hmModalOpen, setHmModalOpen] = useState(false);
  const [hmSelection, setHmSelection] = useState({});   // { [logId]: { before: url, after: url } }
  const [hmLastAfter, setHmLastAfter] = useState(null);  // last after url untuk auto-fill before berikutnya
  const [hmAccordion, setHmAccordion] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (!profile?.role) return;

      // Fetch section configuration
      const { data: sectionData } = await supabase.from('section_settings').select('*').eq('role', profile.role).single();
      if (sectionData) {
        setPdfConfig({
          program: sectionData.pdf_program || 'PENGELOLAAN SUMBER DAYA AIR',
          kegiatan: sectionData.pdf_kegiatan || 'PENGELOLAAN SDA DAN BANGUNAN PENGAMAN PANTAI PADA WILAYAH SUNGAI (WS) DALAM 1 (SATU) DAERAH KABUPATEN/KOTA',
          subKegiatan: sectionData.pdf_sub_kegiatan || 'NORMALISASI / RESTORASI SUNGAI',
          pekerjaanPrefix: sectionData.pdf_pekerjaan_prefix || 'NORMALISASI SUNGAI',
          namaStaf: sectionData.pdf_nama_staf || 'PANGESTU EKA DEWANTO W, A.Md.T',
          nipStaf: sectionData.pdf_nip_staf || '19980711 202204 1 001',
        });
      }

      // Fetch konfigurasi kolom custom untuk seksi ini
      const { data: colConfigs } = await supabase
        .from('section_column_configs')
        .select('*')
        .eq('role', profile.role)
        .order('position', { ascending: true });
      setCustomColumns(colConfigs || []);

      const { data: assignments } = await supabase
        .from('assignments')
        .select('id, status')
        .eq('created_by_role', profile.role);

      const assignmentIds = assignments?.map(a => a.id) || [];

      if (assignmentIds.length > 0) {
        const { data: logsData } = await supabase
          .from('operator_logs')
          .select(`
            *,
            assignment:assignments(id, status, job_type, job_sub_type, location_district, location_village, helper_override, helper:user_profiles!assignments_helper_id_fkey(full_name)),
            operator:user_profiles!operator_logs_operator_id_fkey(full_name),
            equipment:heavy_equipment(name, merk_type, nomor_lambung)
          `)
          .in('assignment_id', assignmentIds)
          .gte('tanggal', `${tahunLaporan}-01-01`)
          .lte('tanggal', `${tahunLaporan}-12-31`)
          .order('assignment_id', { ascending: true })
          .order('tanggal', { ascending: true });

        if (logsData && logsData.length > 0) {
          logsData.sort((a, b) => {
             const opA = a.override_operator || a.operator?.full_name || '';
             const alA = a.override_alat || a.equipment?.name || '';
             const kA = a.override_kecamatan || a.assignment?.location_district || '';
             const dA = a.override_desa || a.assignment?.location_village || '';

             const opB = b.override_operator || b.operator?.full_name || '';
             const alB = b.override_alat || b.equipment?.name || '';
             const kB = b.override_kecamatan || b.assignment?.location_district || '';
             const dB = b.override_desa || b.assignment?.location_village || '';

             const groupA = `${opA} ${alA} ${kA} ${dA}`;
             const groupB = `${opB} ${alB} ${kB} ${dB}`;
             
             if (groupA < groupB) return -1;
             if (groupA > groupB) return 1;
             return new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime();
          });
        }
        setLogs(logsData || []);

        // Fetch BBM data dari DB2 (API)
        try {
          const resBbm = await fetch(`/api/bbm/pemakaian?seksi=${profile.role}`);
          if (resBbm.ok) {
            const resultBbm = await resBbm.json();
            const map = {};
            (resultBbm.data || []).forEach(b => {
              // Simpan berdasarkan assignment_id dan tanggal_kirim (format YYYY-MM-DD)
              const tglStr = b.tanggal_kirim.split('T')[0];
              const key = `${b.assignment_id}|${tglStr}`;
              if (!map[key]) map[key] = [];
              map[key].push(b);
            });
            setBbmMap(map);
          }
        } catch (e) {
             console.warn('BBM API belum tersedia:', e);
        }

      } else {
        setLogs([]);
        setBbmMap({});
      }
    } catch (err) {
      console.error('Error loading reports data:', err);
    } finally {
      setLoading(false);
    }
  }, [profile, filterTab, tahunLaporan]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Simpan konfigurasi kolom ke DB ────────────────────────────────
  const saveKolomConfig = async (newCols) => {
    setSavingKolom(true);
    // Hapus semua kolom lama milik seksi ini
    await supabase.from('section_column_configs').delete().eq('role', profile.role);
    // Insert kolom baru
    if (newCols.length > 0) {
      const rows = newCols.map((c, i) => ({
        role: profile.role,
        column_key: c.column_key,
        column_label: c.column_label,
        column_type: c.column_type || 'text',
        dropdown_options: c.dropdown_options || null,
        formula: c.formula || null,
        position: i,
        is_required: c.is_required || false,
      }));
      await supabase.from('section_column_configs').insert(rows);
    }
    setSavingKolom(false);
    setKolomManagerOpen(false);
    loadData(); // Refresh data
  };


  // ============ INLINE SPREADSHEET LOGIC ============
  const handleInlineEdit = (id, field, value) => {
    setLogs(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const handleBlurSave = async (id, field, value) => {
    setSaving(true);
    const { error } = await supabase.from('operator_logs').update({ [field]: value }).eq('id', id);
    if (error) alert('Gagal menyimpan perubahan: ' + error.message);
    else setLogs(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
    setSaving(false);
  };
  
  const handleDeleteRow = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus laporan harian ini secara permanen?')) return;
    setSaving(true);
    const { error } = await supabase.from('operator_logs').delete().eq('id', id);
    setSaving(false);
    if (error) alert('Gagal menghapus baris: ' + error.message);
    else loadData();
  };

  const handleUploadTambahan = async (event, logId, type = 'lapangan') => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setSaving(true);
    let uploadedUrls = [];
    for (let file of files) {
      const fileName = `manual_${logId}_${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('laporan-photos').upload(fileName, file);
      if (!error) {
        const { data: publicData } = supabase.storage.from('laporan-photos').getPublicUrl(fileName);
        uploadedUrls.push(publicData.publicUrl);
      } else {
        alert('Gagal upload foto: ' + error.message);
      }
    }
    if (uploadedUrls.length > 0) {
      const targetLog = logs.find(l => l.id === logId);
      if (targetLog) {
         let fieldName = type === 'lapangan' ? 'foto_lapangan_urls' : 'foto_hourmeter_urls';
         let currentUrls = targetLog[fieldName] ? targetLog[fieldName].split(',').map(s=>s.trim()).filter(Boolean) : [];
         let newUrls = [...currentUrls, ...uploadedUrls].join(',');
         await handleBlurSave(logId, fieldName, newUrls);
      }
    }
    setSaving(false);
  };

  // ============ MAIN TABLE GROUPING ============
  const mainTableGroups = {};
  logs.filter(log => {
      if (filterTab === 'semua') return true;
      const st = (log.assignment?.status || '').toLowerCase();
      if (filterTab === 'active') return st === 'active';
      if (filterTab === 'finished') return st === 'finished' || st === 'selesai';
      return true;
  }).forEach(log => {
      const op = log.override_operator || log.operator?.full_name || '-';
      const eq = log.equipment;
      const alatLabel = log.override_alat || (
        eq ? [eq.nomor_lambung, eq.merk_type ? `(${eq.merk_type})` : null, eq.name].filter(Boolean).join(' ') : null
      ) || log.jenis_alat || '-';
      const k = log.override_kecamatan || log.assignment?.location_district || '-';
      const d = log.override_desa || log.assignment?.location_village || '-';
      const gId = `${op} | ${alatLabel} | Kec. ${k} - Desa ${d}`;
      
      if(!mainTableGroups[gId]) mainTableGroups[gId] = [];
      mainTableGroups[gId].push(log);
  });

  const handleCustomPekerjaanApply = async (gId, customVal) => {
    if(!confirm(`Terapkan label pekerjaan khusus "${customVal || '(Default)'}" ke seluruh baris pada kelompok ini (${mainTableGroups[gId].length} baris)?`)) return;
    setSaving(true);
    const targetIds = mainTableGroups[gId].map(l => l.id);
    const { error } = await supabase.from('operator_logs').update({ custom_pekerjaan: customVal || null }).in('id', targetIds);
    if(error){
      alert("Gagal terapkan: " + error.message);
    } else {
      setLogs(prev => prev.map(l => targetIds.includes(l.id) ? {...l, custom_pekerjaan: customVal || null} : l));
    }
    setSaving(false);
  };



  // ============ MODAL SELECTION LOGIC ============
  const openPrintModal = (type) => {
    setPrintSelectedIds([]);
    setCustomPrintPekerjaan('');
    setPrintModalInfo({ open: true, type });
  };

  const togglePrintRow = (id) => {
    setPrintSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  };

  const togglePrintGroup = (groupIds) => {
    const allSelected = groupIds.every(id => printSelectedIds.includes(id));
    if (allSelected) {
        setPrintSelectedIds(p => p.filter(id => !groupIds.includes(id)));
    } else {
        const n = [...printSelectedIds];
        groupIds.forEach(id => { if(!n.includes(id)) n.push(id) });
        setPrintSelectedIds(n);
    }
  };

  const getModalGroups = () => {
    const groups = {};
    logs.forEach(log => {
      const op = log.override_operator || log.operator?.full_name || '-';
      const eq = log.equipment;
      const al = log.override_alat || (eq ? [eq.nomor_lambung, eq.merk_type ? `(${eq.merk_type})` : null, eq.name].filter(Boolean).join(' ') : null) || log.jenis_alat || '-';
      const d = log.override_desa || log.assignment?.location_village || '-';
      const gId = `${op} | ${al} | ${d}`;
      if(!groups[gId]) groups[gId] = [];
      groups[gId].push(log);
    });
    return groups;
  };


  // ============ SPREADSHEET & PDF GENERATORS ============
  const executeExcelBatch = () => {
    if (printSelectedIds.length === 0) return alert('Pilih minimal 1 baris log laporan terlebih dahulu.');
    
    // 1. Dapatkan daftar Log yang difilter dari Checkbox
    const selectedLogs = logs.filter(row => printSelectedIds.includes(row.id));
    
    // 2. Kalkulasi Parameter (HOK)
    const uniqueDates = new Set(selectedLogs.map(l => l.tanggal));
    const realisasiHOK = uniqueDates.size;
    
    // Asumsi default Harga untuk Sheet Master jika diunduh dari Laporan BBM
    const hargaSolar = 15000;
    const hargaSewa = 250000;
    const upahPekerja = 100000;
    const upahMandor = 125000;

    // Kalkulasi Total Liter BBM dan Total Jam menggunakan Termodinamika & Nilai HM
    let totalLiterBbm = 0;
    let totalJamKerja = 0;
    let namaAlatTerkait = 'Excavator Master';

    selectedLogs.forEach(log => {
         // Coba ambil dari Log HM jika ada
         const HMDiff = (log.hm_akhir || 0) - (log.hm_awal || 0);
         const jam = Number(log.jam_kerja) || (HMDiff > 0 ? HMDiff : 0);
         totalJamKerja += jam;
         
         const alatRaw = log.override_alat || log.equipment?.name || '';
         if(alatRaw) namaAlatTerkait = alatRaw;
         
         // Jika ada bbm di custom_fields
         let liter = Number((log.custom_fields || {}).volume_bbm) || 0;
         
         // Jika nol tapi ada Jam, konversi via Termodinamika default PC200
         if(liter === 0 && jam > 0) {
              const LJam_Termo = calculateFuelPerHour(138, 0.65, 0.22); // PC200 Load Biasa
              liter = jam * LJam_Termo;
         }
         totalLiterBbm += liter;
    });

    // 3. Susun Kerangka Master Format PC200 (Analisa Harga Satuan Pekerjaan)
    const ws1Data = [
       ["ANALISA HARGA SATUAN PEKERJAAN (AHS)"],
       ["REKAPITULASI PELAKSANAAN LOGISTIK & LAPORAN ALAT BERAT"],
       [""],
       ["Pekerjaan", ": " + (customPrintPekerjaan || "Normalisasi Sungai Realisasi")],
       ["Alat Utama", ": " + namaAlatTerkait],
       ["Periode", ": " + realisasiHOK + " HOK "],
       [""],
       ["NO", "URAIAN", "KODE", "SATUAN", "KUANTITAS", "HARGA SATUAN (Rp)", "JUMLAH HARGA (Rp)"]
    ];

    // Kolom Bahan
    const costBbm = totalLiterBbm * hargaSolar;
    ws1Data.push(["A", "BAHAN", "", "", "", "", ""]);
    ws1Data.push(["1", "Minyak Solar / BBM (Limit Log)", "M.12a", "Liter", totalLiterBbm.toFixed(2), hargaSolar, costBbm]);
    ws1Data.push(["", "", "", "", "Jumlah Harga Bahan", "", costBbm]);
    ws1Data.push([""]);

    // Kolom Tenaga Kerja
    const costPekerja = realisasiHOK * upahPekerja;
    const costMandor = realisasiHOK * upahMandor;
    const totalTenaga = costPekerja + costMandor;
    ws1Data.push(["B", "TENAGA KERJA", "", "", "", "", ""]);
    ws1Data.push(["1", "Pekerja / Operator", "L.01", "Hari (OH)", realisasiHOK, upahPekerja, costPekerja]);
    ws1Data.push(["2", "Mandor", "L.03", "Hari (OH)", realisasiHOK, upahMandor, costMandor]);
    ws1Data.push(["", "", "", "", "Jumlah Harga Tenaga", "", totalTenaga]);
    ws1Data.push([""]);

    // Kolom Peralatan
    const costAlat = totalJamKerja * hargaSewa;
    const totalSemua = costBbm + totalTenaga + costAlat;
    ws1Data.push(["C", "PERALATAN", "", "", "", "", ""]);
    ws1Data.push(["1", namaAlatTerkait, "E.10", "Jam", totalJamKerja.toFixed(2), hargaSewa, costAlat]);
    ws1Data.push(["", "", "", "", "Jumlah Harga Peralatan", "", costAlat]);
    ws1Data.push([""]);
    
    // Grand Total
    ws1Data.push(["D", "JUMLAH HARGA TENAGA, BAHAN DAN ALAT (A + B + C)", "", "", "", "", totalSemua]);

    const worksheet = XLSX.utils.aoa_to_sheet(ws1Data);
    const workbook = XLSX.utils.book_new();

    // Set Lebar Kolom Biar Tampak Seperti Master
    worksheet["!cols"] = [
       { wch: 5 },  // No
       { wch: 45 }, // Uraian
       { wch: 10 }, // Kode
       { wch: 15 }, // Satuan
       { wch: 15 }, // Kuantitas
       { wch: 20 }, // Harga Satuan
       { wch: 20 }  // Jumlah Harga
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Format_Master_RAB");

    // Download!
    XLSX.writeFile(workbook, `Rekap_RAB_Alat_Berat_${new Date().getTime()}.xlsx`);
    setPrintModalInfo({open:false, type:''});
  };

  const executePrintBatch = () => {
    const selectedData = logs.filter(l => printSelectedIds.includes(l.id));
    if (selectedData.length === 0) return alert('Pilih minimal 1 baris.');
    
    if (printModalInfo.type === 'harian') printHarianLogic(selectedData, customPrintPekerjaan.trim().toUpperCase() || null);
    if (printModalInfo.type === 'mingguan') printMingguanLogic(selectedData, customPrintPekerjaan.trim().toUpperCase() || null);
    
    setPrintModalInfo({ open: false, type: '' });
  };

  const printHarianLogic = (selectedData, overridePekerjaan) => {
    // Gunakan pdfConfig global atau fallback Default
    const config = pdfConfig || {
      subKegiatan: 'NORMALISASI / RESTORASI SUNGAI',
      pekerjaanPrefix: 'NORMALISASI SUNGAI',
      namaStaf: 'PANGESTU EKA DEWANTO W, A.Md.T',
      nipStaf: '19980711 202204 1 001'
    };

    const printWin = window.open('', '_blank');
    let html = `<html><head><title>Batch Cetak Harian</title>
      <style>
        @page { size: legal portrait; margin: 12mm 15mm; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        body { font-family: "Times New Roman", Times, serif; padding: 20px; font-size: 12px; line-height: 1.4; }
        .page-break { page-break-after: always; }
        .header { text-align: center; font-weight: bold; font-size: 14px; text-decoration: underline; margin-bottom: 15px; }
        .sub-header { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 12px; font-weight: bold; }
        .sub-header td { padding: 3px 4px; font-size: 12px; }
        .main-table { width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 12px; }
        .main-table th, .main-table td { border: 1px solid #000; padding: 4px 5px; vertical-align: top; font-size: 12px; }
        .signature-table { width: 100%; border-collapse: collapse; margin-top: 0px; border-top: none; font-size: 12px; }
        .signature-table td { padding: 5px; vertical-align: top; border: 1px solid #000; border-top: none; font-size: 11px; }
      </style></head><body>`;

    // Map sub_type ke label pekerjaan PDF (sesuai definisi resmi per seksi)
    const SUB_TYPE_MAP = {
      normalisasi_sungai: 'NORMALISASI SUNGAI',
      normalisasi_saluran_irigasi: 'NORMALISASI SALURAN / IRIGASI',
      rehabilitasi_embung: 'REHABILITASI EMBUNG',
      pembangunan_embung: 'PEMBANGUNAN EMBUNG',
      // backward compat nilai lama
      saluran_afvoer: 'SALURAN AIR / AFVOER',
      normalisasi_embung: 'NORMALISASI EMBUNG',
    };

    selectedData.forEach((log, idx) => {
      const kec = (log.override_kecamatan || log.assignment?.location_district || '').toUpperCase();
      const desa = (log.override_desa || log.assignment?.location_village || '').toUpperCase();
      const oprName = (log.override_operator || log.operator?.full_name || '').toUpperCase();
      const alatName = (log.override_alat || log.equipment?.name || '').toUpperCase();
      const helperName = (log.assignment?.helper_override || log.assignment?.helper?.full_name || '').toUpperCase();
      const tglStr = new Date(log.tanggal).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}).toUpperCase();
      // Resolve pekerjaan: log.custom_pekerjaan > custom override > job_sub_type > config.pekerjaanPrefix
      const resolvedPekerjaan = log.custom_pekerjaan || overridePekerjaan || SUB_TYPE_MAP[log.assignment?.job_sub_type] || config.pekerjaanPrefix;

      html += `<div class="header">LAPORAN HARIAN</div>
        <table class="sub-header">
          <tr><td width="15%">SUB KEGIATAN</td><td width="2%">:</td><td width="53%"><span style="background-color: yellow;">${config.subKegiatan}</span></td><td width="30%">CATATAN HARIAN :</td></tr>
          <tr><td>PEKERJAAN</td><td>:</td><td colspan="2">${resolvedPekerjaan} DESA ${desa} KECAMATAN ${kec}</td></tr>
          <tr><td>LOKASI</td><td>:</td><td colspan="2">DESA ${desa} KECAMATAN ${kec}</td></tr>
        </table>
        
        <table class="main-table">
          <tr>
            <th colspan="2" width="40%" style="text-align:left;">TENAGA KERJA</th>
            <th colspan="2" width="30%" style="text-align:left;">BAHAN</th>
            <th width="30%" style="text-align:left;">Hasil Capaian Pekerjaan</th>
          </tr>
          <tr>
            <td width="20%">Pekerja</td>
            <td width="20%">Waktu</td>
            <td width="15%">Barang Habis<br/>Pakai</td>
            <td width="15%">Jumlah<br/>yang ambil</td>
            <td rowspan="6">
               1. PANJANG PEKERJAAN<br/>
               <div style="margin-left:15px; margin-top:5px; font-weight:bold;">${log.panjang_pekerjaan || '-'}</div>
            </td>
          </tr>
          <tr style="text-align:left; font-weight:bold;">
            <td>1</td><td>2</td><td>3</td><td>4</td>
          </tr>
          <tr>
            <td>
              <div style="margin-bottom:4px;">1. OPERATOR</div>
              <div style="margin-bottom:4px;">2. PEMBANTU OPERATOR</div>
              <div style="margin-bottom:4px;">3. SOPIR</div>
              <div>4. PEMBANTU SOPIR</div>
            </td>
            <td>
              <div style="margin-bottom:4px;">1. ${log.jam_kerja || '-'} Jam</div>
              <div style="margin-bottom:4px;">2. ${log.jam_kerja ? log.jam_kerja : '-'} Jam</div>
              <div style="margin-bottom:4px;">3. &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Jam</div>
              <div>4. &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Jam</div>
            </td>
            <td>
              <div style="margin-bottom:4px;">1. SOLAR</div>
              <div>2. GREASE</div>
            </td>
            <td style="text-align:right">
              <div style="margin-bottom:4px;"><b>${bbmMap[`${log.assignment_id}|${log.tanggal.split('T')[0]}`] ? bbmMap[`${log.assignment_id}|${log.tanggal.split('T')[0]}`].reduce((sum, b) => sum + Number(b.jumlah_liter), 0) : '......'}</b> Liter</div>
              <div>...... Kg</div>
            </td>
          </tr>
          <tr>
            <th colspan="4" style="text-align:left;">PERALATAN</th>
          </tr>
          <tr>
            <td>JENIS ALAT</td>
            <td>HM<br/>AKHIR</td>
            <td>HM AWAL</td>
            <td></td>
          </tr>
          <tr>
            <td>
              <div style="margin-bottom:4px;">1. EXCAVATOR</div>
              <div style="margin-bottom:4px;">2. BULLDOZER</div>
              <div>3. DUMP TRUCK</div>
            </td>
            <td>
              <br/><b>${log.hm_akhir || '-'}</b><br/><br/>
            </td>
            <td>
              <br/><b>${log.hm_awal || '-'}</b><br/><br/>
            </td>
            <td>
              MODEL/TYPE<br/>
              <b>${alatName}</b><br/>
              MODEL/TYPE<br/>
              <br/>
              MODEL/TYPE<br/>
              <br/>
            </td>
          </tr>
        </table>
        
        <table class="signature-table">
          <tr>
            <td width="45%" style="font-size:11px;">
               Pekerjaan mulai pukul 08.00 WIB pagi sampai 16.00 WIB sore (apabila lebih dianggap lembur)<br/>
               (untuk penjaga malam mulai 16.00 WIB sore sampai dengan 08.00 WIB pagi)<br/>
               Sepenuhnya dapat dikerjakan.<br/>
               &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
               &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="font-weight:bold;">Tanggal: </span> ${tglStr}<br/>
               dan jika tidak dipergunakan untuk bekerja oleh karena :<br/>
               <b>${log.keterangan_tambahan || '-'}</b><br/><br/>
               <hr style="border:0; border-top:1px solid #000; margin:10px 0;" />
               Catatan tentang pekerjaan/Direksi
            </td>
            <td width="55%">
               <div style="margin-bottom:15px;">BOJONEGORO, Tanggal <b>${tglStr}</b></div>
               <table style="width:100%; border:none;">
                 <tr>
                   <td style="width:50%; border:none; text-align:left; vertical-align:top; font-size:11px;">
                     Menyetujui :<br/><br/><br/><br/><br/>
                     Staf Administrasi<br/>
                     Dinas PU SDA Kabupaten Bojonegoro<br/>
                     Nama : <span style="background-color: yellow;">${config.namaStaf}</span><br/>
                     <hr style="border:0; border-top:1px solid #000; margin:2px 0; width:90%; float:left;" />
                     <div style="clear:both;"></div>
                     NIP. <span style="background-color: yellow;">${config.nipStaf}</span>
                   </td>
                   <td style="width:50%; border:none; text-align:center; vertical-align:top; font-size:11px;">
                     Dibuat Oleh<br/><br/><br/><br/><br/><br/>
                     Pelaksana Lapangan<br/>
                     <b>${oprName}</b>
                   </td>
                 </tr>
               </table>
            </td>
          </tr>
        </table>
      `;
      if (idx < selectedData.length - 1) html += `<div class="page-break"></div>`;
    });
    html += `</body></html>`;
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 800);
  };

  const printMingguanLogic = (selectedData, overridePekerjaan) => {
    // Gunakan pdfConfig global 
    const config = pdfConfig || {
      subKegiatan: 'NORMALISASI / RESTORASI SUNGAI',
      pekerjaanPrefix: 'NORMALISASI SUNGAI',
      namaStaf: 'PANGESTU EKA DEWANTO W, A.Md.T',
      nipStaf: '19980711 202204 1 001'
    };

    // Map sub_type ke label pekerjaan PDF (sesuai definisi resmi per seksi)
    const SUB_TYPE_MAP = {
      normalisasi_sungai: 'NORMALISASI SUNGAI',
      normalisasi_saluran_irigasi: 'NORMALISASI SALURAN / IRIGASI',
      rehabilitasi_embung: 'REHABILITASI EMBUNG',
      pembangunan_embung: 'PEMBANGUNAN EMBUNG',
      saluran_afvoer: 'SALURAN AIR / AFVOER',
      normalisasi_embung: 'NORMALISASI EMBUNG',
    };

    const grouped = {};
    selectedData.forEach(log => {
      const d = new Date(log.tanggal);
      const dayNum = d.getUTCDay() || 7;
      const thu = new Date(d);
      thu.setUTCDate(thu.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(thu.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((thu - yearStart) / 86400000) + 1) / 7);
      const weekKey = thu.getUTCFullYear() + '-W' + String(weekNo).padStart(2, '0');
      
      const opr = log.override_operator || log.operator?.full_name || 'Unknown';
      const alat = log.override_alat || log.equipment?.name || 'Unknown';
      const desa = log.override_desa || log.assignment?.location_village || '';
      const kec = log.override_kecamatan || log.assignment?.location_district || '';
      const subType = log.assignment?.job_sub_type || '';
      
      const key = weekKey + '|' + opr + '|' + alat;
      if (!grouped[key]) grouped[key] = { operator: opr, alat: alat, desa: desa, kec: kec, subType: subType, rows: [] };
      grouped[key].rows.push(log);
    });

    const printWin = window.open('', '_blank');
    let html = `<html><head><title>Rekap Mingguan</title>
      <style>
        body { font-family: "Times New Roman", Times, serif; padding: 20px; font-size: 11px; }
        .page-break { page-break-after: always; }
        .header { text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 25px; }
        .header-info { width: 100%; border-collapse: collapse; margin-bottom: 5px; font-size: 11px; font-weight: bold; }
        .header-info td { padding: 4px; vertical-align: top; }
        table.data { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        table.data th, table.data td { border: 1px solid #000; padding: 5px 6px; }
        table.data th { background: #fff; font-weight: bold; text-align: center; }
        @page { size: legal portrait; margin: 12mm 15mm; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>`;

    const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    Object.keys(grouped).forEach((key, gIdx) => {
      const g = grouped[key];
      g.rows.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));
      
      const resolvedPekerjaan = g.rows[0]?.custom_pekerjaan || overridePekerjaan || SUB_TYPE_MAP[g.subType] || config.pekerjaanPrefix;

      html += `<div class="header">REKAPITULASI KEGIATAN</div>
        <table class="sub-header">
          <tr><td width="15%">SUB KEGIATAN</td><td width="2%">:</td><td width="53%"><span style="background-color:yellow;">${config.subKegiatan}</span></td><td width="30%">CATATAN HARIAN :</td></tr>
          <tr><td>PEKERJAAN</td><td>:</td><td colspan="2">${resolvedPekerjaan} DESA ${(g.desa || '').toUpperCase()} KECAMATAN ${(g.kec || '').toUpperCase()}</td></tr>
          <tr><td>LOKASI</td><td>:</td><td colspan="2">DESA ${(g.desa || '').toUpperCase()} KECAMATAN ${(g.kec || '').toUpperCase()}</td></tr>
        </table>
        
        <table class="data">
          <thead>
            <tr>
              <th rowspan="2" width="3%">NO</th>
              <th rowspan="2" width="8%">HARI</th>
              <th rowspan="2" width="9%">TANGGAL</th>
              <th colspan="2" width="22%">PERSONIL</th>
              <th rowspan="2" width="16%">LOKASI</th>
              <th colspan="2" width="14%">HM</th>
              <th rowspan="2" width="18%">KETERANGAN</th>
              <th rowspan="2" width="10%">SKETSA LAPANGAN</th>
            </tr>
            <tr>
              <th>OPERATOR</th>
              <th>HELPER</th>
              <th>AWAL</th>
              <th>AKHIR</th>
            </tr>
          </thead>
          <tbody>`;
          
      // Render 31 rows pad
      let rowCounter = 0;
      for (let i = 0; i < 31; i++) {
        let r = g.rows[i];
        if (r) {
          const d = new Date(r.tanggal);
          const hari = days[d.getDay()];
          const tglStr = d.toLocaleDateString('id-ID', {day:'numeric',month:'short',year:'numeric'}).toUpperCase();
          const pOP = (r.override_operator || r.operator?.full_name || '-').toUpperCase();
          const pHL = (r.assignment?.helper_override || r.assignment?.helper?.full_name || '').toUpperCase();
          const dLoc = (r.override_desa || r.assignment?.location_village || '').toUpperCase();
          const hmA = r.hm_awal || '';
          const hmB = r.hm_akhir || '';
          const keta = r.progress_pekerjaan ? r.progress_pekerjaan + (r.jam_kerja ? ` (J.Kerja: ${r.jam_kerja})` : '') : '';

          html += `<tr>
            <td style="text-align:center">${i + 1}</td>
            <td>${hari}</td><td>${tglStr}</td>
            <td>${pOP}</td><td>${pHL}</td>
            <td>${dLoc}</td>
            <td style="text-align:center;">${hmA}</td>
            <td style="text-align:center;">${hmB}</td>
            <td>${keta}</td>
            <td></td>
          </tr>`;
        } else {
          // Empty Rows to match exactly user's spreadsheet template
          html += `<tr><td style="text-align:center; height:18px;">${i + 1}</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`;
        }
      }

      html += `</tbody></table>`;
      if (gIdx < Object.keys(grouped).length - 1) html += `<div class="page-break"></div>`;
    });
    html += `</body></html>`;
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 800);
  };

  const openDokumentasi = () => { setDokSelection({}); setDokAccordion(null); setDokModalOpen(true); };
  const executePrintDokumentasi = () => {
    // Gunakan pdfConfig global
    const config = pdfConfig || {
      program: 'PENGELOLAAN SUMBER DAYA AIR',
      kegiatan: 'PENGELOLAAN SDA DAN BANGUNAN PENGAMAN PANTAI PADA WILAYAH SUNGAI (WS) DALAM 1 (SATU) DAERAH KABUPATEN/KOTA',
      pekerjaanPrefix: 'NORMALISASI SUNGAI'
    };

    const printWin = window.open('', '_blank');
    let html = `<html><head><title>Cetak Dokumentasi</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; font-size: 13px; line-height: 1.5; }
        .page-break { page-break-after: always; }
        .header-title { font-size: 20px; font-weight: bold; text-align: center; margin-bottom: 40px; }
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .header-table td { padding: 8px 5px; vertical-align: top; font-weight: bold; }
        .photo-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; page-break-inside: avoid; }
        .photo-table td { padding: 10px; border: 1px solid #000; vertical-align: middle; }
        .img-container { width: 450px; text-align: center; }
        .img-container img { max-width: 440px; max-height: 250px; object-fit: contain; }
      </style></head><body>`;

    let hasPage = false;
    logs.forEach((log) => {
      if(!log.foto_lapangan_urls) return;
      const urls = log.foto_lapangan_urls.split(',').map(u=>u.trim()).filter(Boolean);
      const selectedForThisLog = urls.map((url, idx) => {
         const prog = dokSelection[log.id + '_' + idx];
         return prog && prog !== 'skip' ? { url, prog } : null;
      }).filter(Boolean);

      if (selectedForThisLog.length === 0) return; 
      if (hasPage) html += `<div class="page-break"></div>`;
      hasPage = true;

      const v = log.override_desa || log.assignment?.location_village || '';
      const k = log.override_kecamatan || log.assignment?.location_district || '';
      const loc = `DESA ${v} KECAMATAN ${k}`.toUpperCase();
      const tglStr = new Date(log.tanggal).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}).toUpperCase();
      // Resolve pekerjaan dari job_sub_type per log
      const SUB_TYPE_MAP_DOK = {
        normalisasi_sungai: 'NORMALISASI SUNGAI',
        normalisasi_saluran_irigasi: 'NORMALISASI SALURAN / IRIGASI',
        rehabilitasi_embung: 'REHABILITASI EMBUNG',
        pembangunan_embung: 'PEMBANGUNAN EMBUNG',
        saluran_afvoer: 'SALURAN AIR / AFVOER',
        normalisasi_embung: 'NORMALISASI EMBUNG',
      };
      const resolvedPekerjaan = SUB_TYPE_MAP_DOK[log.assignment?.job_sub_type] || config.pekerjaanPrefix;

      html += `
        <div class="header-title">FOTO DOKUMENTASI</div>
        <table class="header-table">
          <tr><td width="20%">PROGRAM</td><td width="2%">:</td><td>${config.program}</td></tr>
          <tr><td>KEGIATAN</td><td>:</td><td>${config.kegiatan}</td></tr>
          <tr><td>PEKERJAAN</td><td>:</td><td>${resolvedPekerjaan} ${loc}</td></tr>
          <tr><td>TAHUN ANGGARAN</td><td>:</td><td>${new Date(log.tanggal).getFullYear()}</td></tr>
          <tr><td>LOKASI</td><td>:</td><td>${loc}</td></tr>
          <tr><td>TANGGAL</td><td>:</td><td>${tglStr}</td></tr>
        </table>`;

      selectedForThisLog.sort((a,b) => { const ord = {'0%':0, '50%':1, '100%':2}; return ord[a.prog] - ord[b.prog]; });
      selectedForThisLog.forEach(item => {
        html += `<table class="photo-table"><tr>
          <td width="60%"><div class="img-container"><img src="${driveUrlToImg(item.url)}" /></div></td>
          <td width="40%"><b>KETERANGAN :</b><br/><br/>FOTO PROSES PELAKSANAAN<br/>${item.prog}</td>
        </tr></table>`;
      });
    });

    html += `</body></html>`;
    printWin.document.write(html); printWin.document.close(); printWin.focus();
    setTimeout(() => { printWin.print(); }, 1500);
    setDokModalOpen(false);
  };

  const openHourmeter = () => { setHmSelection({}); setHmLastAfter(null); setHmAccordion(null); setHmModalOpen(true); };
  const executePrintHourmeter = () => {
    // Gunakan pdfConfig global
    const config = pdfConfig || {
      pekerjaanPrefix: 'NORMALISASI SUNGAI'
    };

    const printWin = window.open('', '_blank');
    let html = `<html><head><title>Cetak Hourmeter</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; font-size: 13px; line-height: 1.5; }
        .page-break { page-break-after: always; }
        .header-title { font-size: 22px; font-weight: bold; text-align: center; margin-bottom: 40px; }
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-weight: bold; font-size: 14px; }
        .header-table td { padding: 5px; vertical-align: top; }
        .master-table { width: 100%; border-collapse: collapse; border: 1.5px solid #000; margin-bottom: 30px; page-break-inside: auto; }
        .master-table tr { page-break-inside: avoid; page-break-after: auto; }
        .master-table td { border: 1px solid #000; padding: 12px; }
        .img-cell { text-align: center; vertical-align: middle; width: 50%; height: 260px; }
        .img-cell img { max-width: 320px; max-height: 240px; object-fit: contain; display: block; margin: auto; }
      </style></head><body>`;

    const groupedHM = {};
    logs.forEach(log => {
       const selection = hmSelection[log.id];
       if (!selection || !selection.before || !selection.after) return;
       const v = log.override_desa || log.assignment?.location_village || '';
       const k = log.override_kecamatan || log.assignment?.location_district || '';
       // Resolve pekerjaan dari job_sub_type
       const SUB_TYPE_MAP_HM = {
         normalisasi_sungai: 'NORMALISASI SUNGAI',
         normalisasi_saluran_irigasi: 'NORMALISASI SALURAN / IRIGASI',
         rehabilitasi_embung: 'REHABILITASI EMBUNG',
         pembangunan_embung: 'PEMBANGUNAN EMBUNG',
         saluran_afvoer: 'SALURAN AIR / AFVOER',
         normalisasi_embung: 'NORMALISASI EMBUNG',
       };
       const resolvedPek = log.custom_pekerjaan || SUB_TYPE_MAP_HM[log.assignment?.job_sub_type] || config.pekerjaanPrefix;
       const locStr = `DESA ${v} KECAMATAN ${k}`.toUpperCase();
       const key = `${resolvedPek} ${locStr}`;
       if(!groupedHM[key]) groupedHM[key] = [];
       groupedHM[key].push(log);
    });

    Object.keys(groupedHM).forEach((keyTitle, gIdx) => {
      html += `
        <div class="header-title">FOTO HOURMETER</div>
        <table class="header-table">
          <tr><td width="15%">PEKERJAAN</td><td width="2%">:</td><td>${keyTitle}</td></tr>
        </table>
        <table class="master-table">`;
      groupedHM[keyTitle].sort((a,b) => new Date(a.tanggal) - new Date(b.tanggal)).forEach((log, idx) => {
         const selection = hmSelection[log.id];
         const tgl = new Date(log.tanggal).toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric'}).toUpperCase();
         html += `<tr><td colspan="2" style="padding:15px; font-size: 14px;"><b>${idx + 1}. &nbsp;&nbsp;&nbsp; ${tgl}</b></td></tr>
          <tr>
            <td class="img-cell">${selection.before ? '<img src="' + driveUrlToImg(selection.before) + '" />' : '<i>Belum ada foto</i>'}</td>
            <td class="img-cell">${selection.after ? '<img src="' + driveUrlToImg(selection.after) + '" />' : '<i>Belum ada foto</i>'}</td>
          </tr>`;
      });
      html += `</table>`;
      if (gIdx < Object.keys(groupedHM).length - 1) html += `<div class="page-break"></div>`;
    });
    html += `</body></html>`;
    printWin.document.write(html); printWin.document.close(); printWin.focus();
    setTimeout(() => { printWin.print(); }, 1500);
    setHmModalOpen(false);
  };


  return (
    <>
      <div className="header">
        <div>
          <div className="header-title">Spreadsheet Laporan Pelaksanaan</div>
          <div className="header-subtitle">Edit Data Secara Langsung & Menu Cetak</div>
        </div>
        <div className="header-right" style={{display:'flex', gap: 8, flexWrap:'wrap', justifyContent:'flex-end'}}>
           {saving && <span style={{marginRight: 10, color:'#1e3a5f', fontWeight:'bold', display:'flex', alignItems:'center'}}>💾 Memproses...</span>}
           <button className="btn btn-outline" onClick={() => openPrintModal('harian')}>📄 Cetak Harian</button>
           <button className="btn btn-outline" onClick={() => openPrintModal('mingguan')}>📘 Cetak Mingguan</button>
           <button className="btn btn-outline" onClick={openDokumentasi}>📷 Buat Dokumentasi</button>
           <button className="btn btn-outline" onClick={openHourmeter}>⏱️ Susun Hourmeter</button>
           <button className="btn btn-outline" onClick={() => setKolomManagerOpen(true)} style={{borderColor:'#7c3aed', color:'#7c3aed'}}>⚙️ Kelola Kolom</button>
        </div>
      </div>

      <div className="page-body" style={{padding: '0 20px 20px 20px'}}>
        <div style={{display:'flex', gap: 10, marginBottom: 15, alignItems:'center'}}>
           <select className="form-control" style={{width:140, fontWeight:'bold'}} value={tahunLaporan} onChange={e=>setTahunLaporan(e.target.value)}>
             <option value="2024">Tahun 2024</option>
             <option value="2025">Tahun 2025</option>
             <option value="2026">Tahun 2026</option>
             <option value="2027">Tahun 2027</option>
           </select>
           {['semua', 'active', 'finished'].map(t => (
              <button key={t} onClick={() => setFilterTab(t)} style={{
                  padding: '8px 16px', background: filterTab === t ? '#1e3a8a' : '#e2e8f0',
                  color: filterTab === t ? '#fff' : '#334155', border: 'none', borderRadius: 20, 
                  fontSize: 13, fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s'
              }}>
                 {t === 'semua' ? 'Semua Pekerjaan' : t === 'active' ? '🟢 Sedang Aktif' : '✅ Sudah Selesai'}
              </button>
           ))}
        </div>

        <div className="card" style={{padding:0, overflow:'hidden', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}>
          <div className="table-wrapper" style={{margin:0, overflowX:'auto', maxHeight: '70vh'}}>
            {loading ? (
              <div style={{padding: 40, textAlign: 'center'}}>Memuat Spreadsheet...</div>
            ) : Object.keys(mainTableGroups).length === 0 ? (
              <div className="empty-state" style={{padding:40}}><h3>Belum Ada Data</h3></div>
            ) : (
              <table style={{fontSize: 12, borderCollapse:'collapse', minWidth: 1500, whiteSpace:'nowrap'}}>
                <thead style={{position:'sticky', top:0, zIndex:10}}>
                  <tr style={{background:'#d9ead3', color:'#000'}}>
                    <th style={{padding:'8px 12px', border:'1px solid #ccc', fontWeight:'bold', textAlign:'center'}}>Aksi</th>
                    <th style={{padding:'8px 12px', border:'1px solid #ccc', fontWeight:'bold'}}>Timestamp</th>
                    <th style={{padding:'8px 12px', border:'1px solid #ccc', fontWeight:'bold'}}>Tanggal</th>
                    <th style={{padding:'8px 12px', border:'1px solid #ccc', fontWeight:'bold', background:'#fef9c3'}} title="⚠️ OPSIONAL: Biarkan kosong untuk otomatis sistem. Isi hanya jika baris / kelompok pekerjaan ini memiliki pengecualian / butuh penamaan laporan spesifik.">Custom Nama Pekerjaan ℹ️</th>
                    <th style={{padding:'8px 12px', border:'1px solid #ccc', fontWeight:'bold'}}>Nama Operator</th>
                    <th style={{padding:'8px 12px', border:'1px solid #ccc', fontWeight:'bold'}}>Nama Helper</th>
                    <th style={{padding:'8px 12px', border:'1px solid #ccc', fontWeight:'bold'}}>Kecamatan</th>
                    <th style={{padding:'8px 12px', border:'1px solid #ccc', fontWeight:'bold'}}>Desa</th>
                    <th style={{padding:'8px 12px', border:'1px solid #ccc', fontWeight:'bold'}}>Jenis Alat Berat</th>
                    <th style={{padding:'8px 12px', border:'1px solid #ccc', fontWeight:'bold'}}>Progress Pekerjaan</th>
                    <th style={{padding:'8px 12px', border:'1px solid #ccc', fontWeight:'bold'}}>HM Awal</th>
                    <th style={{padding:'8px 12px', border:'1px solid #ccc', fontWeight:'bold'}}>HM Akhir</th>
                    <th style={{padding:'8px 12px', border:'1px solid #ccc', fontWeight:'bold'}}>Jam Kerja</th>
                    <th style={{padding:'8px 12px', border:'1px solid #ccc', fontWeight:'bold'}}>Foto Lapangan</th>
                    <th style={{padding:'8px 12px', border:'1px solid #ccc', fontWeight:'bold'}}>Panjang Pekerjaan</th>
                    <th style={{padding:'8px 12px', border:'1px solid #ccc', fontWeight:'bold'}}>Keterangan Tambahan</th>
                    {customColumns.map(col => (
                      <th key={col.column_key} style={{padding:'8px 12px', border:'1px solid #ccc', fontWeight:'bold',
                        background: col.column_type === 'formula' ? '#fef9c3' : '#d9ead3'}}>
                        {col.column_label}
                        {col.column_type === 'formula' && <span style={{fontSize:9, display:'block', color:'#92400e', opacity:0.8}}>🧮 formula</span>}
                        {col.is_required && <span style={{color:'#dc2626'}}>*</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(mainTableGroups).map(gId => (
                     <Fragment key={gId}>
                        <tr className="group-header">
                           <td colSpan={16 + customColumns.length} style={{background:'#e2e8f0', color:'#1e3a5f', padding:'10px 15px', fontWeight:'bold', border:'1px solid #ccc', fontSize:14}}>🗂️ {gId}</td>
                        </tr>
                        {mainTableGroups[gId].map(log => {
                           const helper = log.assignment?.helper_override || log.assignment?.helper?.full_name || '';
                           const inputStyle = { width:'100%', border:'1px dashed transparent', background:'transparent', padding:'4px', fontSize:12 };
                           const isSelesai = log.assignment?.status?.toLowerCase() === 'selesai' || log.assignment?.status?.toLowerCase() === 'finished';
                           const openInputStyle = { width:'100%', border:'1px dashed #bbb', background:'#fff', padding:'4px', fontSize:12, borderRadius:4 };

                           return (
                             <tr key={log.id} style={{background: '#fff', color:'#000'}}>
                               <td style={{padding:'6px 12px', border:'1px solid rgba(0,0,0,0.1)', textAlign:'center'}}>
                                  <button onClick={() => handleDeleteRow(log.id)} style={{background:'#dc3545', color:'white', border:'none', padding:'4px 8px', borderRadius:4, cursor:'pointer', fontSize:10}}>Hapus</button>
                               </td>
                               <td style={{padding:'6px 12px', border:'1px solid rgba(0,0,0,0.1)'}}>{new Date(log.reported_at).toLocaleString('id-ID')}</td>
                               
                               <td style={{padding:'2px 6px', border:'1px solid rgba(0,0,0,0.1)'}}>
                                  <input type="date" style={inputStyle} value={log.tanggal || ''} 
                                         onChange={e => handleInlineEdit(log.id, 'tanggal', e.target.value)} 
                                         onBlur={e => handleBlurSave(log.id, 'tanggal', e.target.value)} />
                               </td>

                               <td style={{padding:'2px', border:'1px solid rgba(0,0,0,0.1)', background:'#fef9c3', minWidth:160}}>
                                  <div style={{display:'flex', alignItems:'center', gap:4}}>
                                     <input type="text" placeholder="Default otomatis..." style={{flex:1, border:'1px solid #d1d5db', borderRadius:4, padding:'4px 6px', fontSize:11}}
                                            value={log.custom_pekerjaan || ''}
                                            onChange={e => handleInlineEdit(log.id, 'custom_pekerjaan', e.target.value)}
                                            onBlur={e => handleBlurSave(log.id, 'custom_pekerjaan', e.target.value)} />
                                     {(log.custom_pekerjaan && log.custom_pekerjaan.trim() !== '') && (
                                        <button onClick={() => handleCustomPekerjaanApply(gId, log.custom_pekerjaan)} 
                                                title="Terapkan custom pekerjaan ini ke seluruh grup di atas" 
                                                style={{background:'#059669', color:'white', border:'none', borderRadius:4, padding:'4px 6px', cursor:'pointer', fontSize:10}}>👇</button>
                                     )}
                                  </div>
                               </td>

                               {/* OVERRIDE FIELDS — urutan: Operator, Helper, Kecamatan, Desa, Alat */}
                               <td style={{padding:'2px 6px', border:'1px solid rgba(0,0,0,0.1)', fontWeight:'500'}}>
                                  {isSelesai ? (
                                    <input type="text" style={openInputStyle} value={log.override_operator || log.operator?.full_name || log.operator_name || ''}
                                         onChange={e => handleInlineEdit(log.id, 'override_operator', e.target.value)}
                                         onBlur={e => handleBlurSave(log.id, 'override_operator', e.target.value)} />
                                  ) : ( log.override_operator || log.operator?.full_name || log.operator_name || '-' )}
                               </td>

                               {/* HELPER (di samping Operator) */}
                               <td style={{padding:'6px 12px', border:'1px solid rgba(0,0,0,0.1)'}}>{helper}</td>

                               <td style={{padding:'2px 6px', border:'1px solid rgba(0,0,0,0.1)'}}>
                                  {isSelesai ? (
                                    <input type="text" style={openInputStyle} value={log.override_kecamatan || log.assignment?.location_district || ''}
                                         onChange={e => handleInlineEdit(log.id, 'override_kecamatan', e.target.value)}
                                         onBlur={e => handleBlurSave(log.id, 'override_kecamatan', e.target.value)} />
                                  ) : ( log.override_kecamatan || log.assignment?.location_district || '-' )}
                               </td>
                               <td style={{padding:'2px 6px', border:'1px solid rgba(0,0,0,0.1)'}}>
                                  {isSelesai ? (
                                    <input type="text" style={openInputStyle} value={log.override_desa || log.assignment?.location_village || ''}
                                         onChange={e => handleInlineEdit(log.id, 'override_desa', e.target.value)}
                                         onBlur={e => handleBlurSave(log.id, 'override_desa', e.target.value)} />
                                  ) : ( log.override_desa || log.assignment?.location_village || '-' )}
                               </td>
                               <td style={{padding:'2px 6px', border:'1px solid rgba(0,0,0,0.1)'}}>
                                  {isSelesai ? (
                                    <input type="text" style={openInputStyle}
                                         value={log.override_alat != null ? log.override_alat : (
                                           log.equipment ? [log.equipment.nomor_lambung, log.equipment.merk_type ? `(${log.equipment.merk_type})` : null, log.equipment.name].filter(Boolean).join(' ') : (log.jenis_alat || '')
                                         )}
                                         onChange={e => handleInlineEdit(log.id, 'override_alat', e.target.value)}
                                         onBlur={e => handleBlurSave(log.id, 'override_alat', e.target.value)} />
                                  ) : ( log.override_alat || (
                                    log.equipment ? (
                                      <span>
                                        {log.equipment.nomor_lambung && <strong>{log.equipment.nomor_lambung}</strong>}
                                        {log.equipment.merk_type && <span style={{color:'#64748b'}}> ({log.equipment.merk_type})</span>}
                                        {log.equipment.name && <span> {log.equipment.name}</span>}
                                      </span>
                                    ) : (log.jenis_alat || '-')
                                  ))}
                               </td>

                               {/* NORMAL EDITABLE FIELDS */}
                               <td style={{padding:'2px 6px', border:'1px solid rgba(0,0,0,0.1)'}}>
                                  <input type="text" style={inputStyle} value={log.progress_pekerjaan || ''} 
                                         onChange={e => handleInlineEdit(log.id, 'progress_pekerjaan', e.target.value)} 
                                         onBlur={e => handleBlurSave(log.id, 'progress_pekerjaan', e.target.value)} />
                               </td>

                               {/* HM Awal → HM Akhir → Jam Kerja */}
                               <td style={{padding:'2px 6px', border:'1px solid rgba(0,0,0,0.1)'}}>
                                  <input type="text" style={inputStyle} value={log.hm_awal || ''} 
                                         onChange={e => handleInlineEdit(log.id, 'hm_awal', e.target.value)} 
                                         onBlur={e => handleBlurSave(log.id, 'hm_awal', e.target.value)} />
                               </td>
                               <td style={{padding:'2px 6px', border:'1px solid rgba(0,0,0,0.1)'}}>
                                  <input type="text" style={inputStyle} value={log.hm_akhir || ''} 
                                         onChange={e => handleInlineEdit(log.id, 'hm_akhir', e.target.value)} 
                                         onBlur={e => handleBlurSave(log.id, 'hm_akhir', e.target.value)} />
                               </td>
                               <td style={{padding:'2px 6px', border:'1px solid rgba(0,0,0,0.1)'}}>
                                  <input type="text" style={inputStyle} value={log.jam_kerja || ''} 
                                         onChange={e => handleInlineEdit(log.id, 'jam_kerja', e.target.value)} 
                                         onBlur={e => handleBlurSave(log.id, 'jam_kerja', e.target.value)} />
                               </td>

                               <td style={{padding:'4px 8px', border:'1px solid rgba(0,0,0,0.1)', minWidth: 200}}>
                                 <textarea style={{...inputStyle, width:'100%', minHeight:34, resize:'vertical'}} value={log.keterangan_tambahan || ''} 
                                        onChange={e => handleInlineEdit(log.id, 'keterangan_tambahan', e.target.value)} 
                                        onBlur={e => handleBlurSave(log.id, 'keterangan_tambahan', e.target.value)} />
                                 
                                 {/* Tampilan BBM Otomatis */}
                                 {bbmMap[`${log.assignment_id}|${log.tanggal?.split('T')[0]}`]?.map((bbm, i) => (
                                   <div key={i} style={{ background: '#fef3c7', color: '#92400e', padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: 'bold', marginTop: 4, display:'inline-block'}}>
                                     ⛽ BBM Diterima: {bbm.jumlah_liter} LTR
                                   </div>
                                 ))}
                               </td>

                               {/* Foto — link view untuk dibuka di tab baru */}
                               <td style={{padding:'4px 8px', border:'1px solid rgba(0,0,0,0.1)', maxWidth: 140}}>
                                 {log.foto_lapangan_urls ? (
                                   <div style={{display:'flex', flexDirection:'column', gap:2}}>
                                     {log.foto_lapangan_urls.split(',').map((url, fi) => {
                                       const trimmed = url.trim();
                                       if (!trimmed) return null;
                                       return (
                                         <a key={fi} href={driveUrlToView(trimmed)} target="_blank" rel="noreferrer"
                                           style={{color:'#1a0dab', textDecoration:'underline', fontSize:11, whiteSpace:'nowrap'}}>
                                           📷 Foto {fi + 1}
                                         </a>
                                       );
                                     })}
                                   </div>
                                 ) : '-'}
                               </td>

                               {/* Panjang Pekerjaan */}
                               <td style={{padding:'2px 6px', border:'1px solid rgba(0,0,0,0.1)'}}>
                                  <input type="text" style={inputStyle} value={log.panjang_pekerjaan || ''} 
                                         onChange={e => handleInlineEdit(log.id, 'panjang_pekerjaan', e.target.value)} 
                                         onBlur={e => handleBlurSave(log.id, 'panjang_pekerjaan', e.target.value)} />
                               </td>

                               {/* Keterangan Tambahan — di akhir kolom sistem */}
                               <td style={{padding:'2px 6px', border:'1px solid rgba(0,0,0,0.1)'}}>
                                  <input type="text" style={inputStyle} value={log.keterangan_tambahan || ''} 
                                         onChange={e => handleInlineEdit(log.id, 'keterangan_tambahan', e.target.value)} 
                                         onBlur={e => handleBlurSave(log.id, 'keterangan_tambahan', e.target.value)} />
                               </td>

                               {/* KOLOM CUSTOM DINAMIS */}
                               {customColumns.map(col => {
                                 const customVal = (log.custom_fields || {})[col.column_key] ?? '';
                                 if (col.column_type === 'formula') {
                                   const result = evaluateFormula(col.formula, log);
                                   return (
                                     <td key={col.column_key} style={{padding:'6px 12px', border:'1px solid rgba(0,0,0,0.1)', background:'#fefce8', textAlign:'right', fontWeight:600, color:'#92400e'}}>
                                       {result || '—'}
                                     </td>
                                   );
                                 }
                                 return (
                                   <td key={col.column_key} style={{padding:'2px 6px', border:'1px solid rgba(0,0,0,0.1)'}}>
                                     <input
                                       type={col.column_type === 'number' ? 'number' : 'text'}
                                       style={inputStyle}
                                       value={customVal}
                                       onChange={e => {
                                         const newCF = { ...(log.custom_fields || {}), [col.column_key]: e.target.value };
                                         handleInlineEdit(log.id, 'custom_fields', newCF);
                                       }}
                                       onBlur={e => {
                                         const newCF = { ...(log.custom_fields || {}), [col.column_key]: e.target.value };
                                         handleBlurSave(log.id, 'custom_fields', newCF);
                                       }}
                                     />
                                   </td>
                                 );
                               })}
                             </tr>
                           );
                        })}
                     </Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>


      {/* ================= MODAL SELEKSI CETAK ================= */}
      {printModalInfo.open && (() => {
         const groups = getModalGroups();
         return (
         <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.6)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center'}}>
           <div style={{background:'#fff', width:'60%', height:'80%', borderRadius:10, display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 10px 25px rgba(0,0,0,0.5)'}}>
               <div style={{padding:20, background:'#1e3a5f', color:'#fff', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <h3 style={{margin:0}}>Pemilihan Baris - Cetak {printModalInfo.type === 'harian' ? 'Harian' : 'Rekap Mingguan'}</h3>
                  <button onClick={() => setPrintModalInfo({open:false, type:''})} style={{background:'transparent', border:'none', color:'#fff', cursor:'pointer', fontSize:20}}>✖</button>
               </div>
               <div style={{flex:1, overflowY:'auto', padding:20, background:'#f8f9fa'}}>
                  <p style={{marginTop:0, marginBottom:12, color:'#555'}}>Centang baris yang ingin disertakan ke dalam dokumen cetak.</p>
               <div style={{marginBottom:16, display:'flex', alignItems:'center', gap:10, background:'#fff9e6', border:'1px solid #f59e0b', borderRadius:8, padding:'10px 14px'}}>
                 <span style={{fontSize:14, whiteSpace:'nowrap', fontWeight:600, color:'#92400e'}}>✏️ Custom Pekerjaan:</span>
                 <input
                   value={customPrintPekerjaan}
                   onChange={e => setCustomPrintPekerjaan(e.target.value)}
                   placeholder="Kosongkan = pakai nama pekerjaan default per baris"
                   style={{flex:1, padding:'7px 10px', border:'1px solid #d97706', borderRadius:6, fontSize:13, outline:'none'}}
                 />
               </div>
                  <table style={{width:'100%', borderCollapse:'collapse', fontSize:13, background:'#fff'}}>
                    <thead>
                      <tr style={{background:'#e2e8f0', color:'#333'}}>
                        <th style={{padding:10}}></th><th style={{padding:10, textAlign:'left'}}>Tanggal</th><th style={{padding:10, textAlign:'left'}}>Desa</th><th style={{padding:10, textAlign:'left'}}>Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(groups).map((groupKey, gIdx) => {
                         const rows = groups[groupKey];
                         const rowIds = rows.map(r => r.id);
                         const isGroupSel = rowIds.every(id => printSelectedIds.includes(id)) && rowIds.length > 0;
                         return <Fragment key={gIdx}>
                           <tr style={{background:'#f1f5f9', borderTop:'2px solid #cbd5e1', cursor:'pointer'}} onClick={() => togglePrintGroup(rowIds)}>
                              <td style={{padding:10, textAlign:'center'}}><input type="checkbox" checked={isGroupSel} onChange={()=>togglePrintGroup(rowIds)} onClick={e=>e.stopPropagation()}/></td>
                              <td colSpan={3} style={{padding:10, fontWeight:'bold', color:'#0f172a'}}>🗂️ {groupKey}</td>
                           </tr>
                           {rows.map(row => (
                              <tr key={row.id} style={{borderBottom:'1px solid #e2e8f0', cursor:'pointer', background: printSelectedIds.includes(row.id) ? '#eff6ff' : '#fff'}} onClick={()=>togglePrintRow(row.id)}>
                                 <td style={{padding:8, textAlign:'center'}}><input type="checkbox" checked={printSelectedIds.includes(row.id)} onChange={()=>togglePrintRow(row.id)} onClick={e=>e.stopPropagation()}/></td>
                                 <td style={{padding:8}}>{new Date(row.tanggal).toLocaleDateString('id-ID')}</td>
                                 <td style={{padding:8}}>{row.override_desa || row.assignment?.location_village}</td>
                                 <td style={{padding:8, color:'#64748b'}}>{row.progress_pekerjaan || '-'}</td>
                              </tr>
                           ))}
                         </Fragment>
                      })}
                    </tbody>
                  </table>
               </div>
               <div style={{padding:20, background:'#fff', borderTop:'1px solid #ddd', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                   <div style={{fontWeight:'bold', color:'#1e3a5f'}}>{printSelectedIds.length} baris dipilih</div>
                   <div>
                     <button className="btn btn-outline" style={{marginRight:10}} onClick={() => setPrintModalInfo({open:false, type:''})}>Batal</button>
                     <button className="btn btn-secondary" style={{marginRight:10, background:'#16a34a', color:'white', borderColor:'#16a34a'}} disabled={printSelectedIds.length===0} onClick={executeExcelBatch}>📊 Unduh XLSX Format Master</button>
                     <button className="btn btn-primary" disabled={printSelectedIds.length===0} onClick={executePrintBatch}>🖨️ Mulai Print PDF</button>
                   </div>
               </div>
           </div>
         </div>
       )})()}

      {/* ================= MODAL DOKUMENTASI ================= */}
      {dokModalOpen && (
        <DokumentasiModal
          logs={logs}
          pdfConfig={pdfConfig}
          onClose={() => setDokModalOpen(false)}
          handleUploadTambahan={handleUploadTambahan}
        />
      )}

      {/* ================= MODAL HOURMETER ================= */}
      {hmModalOpen && (
        <HourmeterModal
          logs={logs}
          pdfConfig={pdfConfig}
          onClose={() => setHmModalOpen(false)}
          handleUploadTambahan={handleUploadTambahan}
        />
      )}

      {/* ================= MODAL KELOLA KOLOM CUSTOM ================= */}
      {kolomManagerOpen && (
        <KolomManager
          columns={customColumns}
          onSave={saveKolomConfig}
          onClose={() => setKolomManagerOpen(false)}
          saving={savingKolom}
        />
      )}
    </>
  );
}
