'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const PROGRESS_STEPS = ['pelaporan', 'diterima', 'pengerjaan', 'selesai'];
const STEP_LABELS = { pelaporan: 'Laporan Masuk', diterima: 'Diterima', pengerjaan: 'Pengerjaan', selesai: 'Selesai' };

export default function RekapPerbaikanPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('aktif');
  const [expandedId, setExpandedId] = useState(null);

  // Filter state
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  // Edit State
  const [editingLog, setEditingLog] = useState(null);
  const [form, setForm] = useState({ progress_status: '', repair_notes: '' });
  const [saving, setSaving] = useState(false);
  const [batchDeleteIds, setBatchDeleteIds] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLogForm, setNewLogForm] = useState({
    equipment_id: '', damage_description: '', damage_type: 'mekanik'
  });
  const [availableEquipment, setAvailableEquipment] = useState([]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('maintenance_logs')
      .select('*, equipment:heavy_equipment(name, merk_type, nomor_lambung)')
      .order('reported_at', { ascending: false });
    setLogs(data || []);

    // Load available equipment for manual insert
    const { data: eqData } = await supabase.from('heavy_equipment').select('id, name, merk_type, nomor_lambung').order('name');
    setAvailableEquipment(eqData || []);

    setLoading(false);
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  // Filter logs berdasarkan tab + range tanggal
  const applyDateFilter = (arr) => {
    if (!filterFrom && !filterTo) return arr;
    return arr.filter(l => {
      const d = new Date(l.reported_at);
      if (filterFrom && d < new Date(filterFrom)) return false;
      if (filterTo && d > new Date(filterTo + 'T23:59:59')) return false;
      return true;
    });
  };

  const filteredByTab = logs.filter(l =>
    activeTab === 'aktif' ? l.progress_status !== 'selesai' : l.progress_status === 'selesai'
  );
  const filtered = applyDateFilter(filteredByTab);

  // Pisahkan: laporan urgency dari operator (pelaporan) vs normal
  const urgentLogs = filtered.filter(l => l.progress_status === 'pelaporan');
  const normalLogs = filtered.filter(l => l.progress_status !== 'pelaporan');
  const orderedLogs = activeTab === 'aktif' ? [...urgentLogs, ...normalLogs] : filtered;

  const toggleExpand = (id) => setExpandedId(expandedId === id ? null : id);

  const openEdit = (log) => {
    setEditingLog(log);
    setForm({ progress_status: log.progress_status, repair_notes: log.repair_notes || '' });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from('maintenance_logs').update({
      progress_status: form.progress_status,
      repair_notes: form.repair_notes,
      ...(form.progress_status === 'selesai' ? { resolved_at: new Date().toISOString() } : {}),
    }).eq('id', editingLog.id);

    if (form.progress_status === 'selesai') {
      const { data: activeAsg } = await supabase
        .from('assignments')
        .select('id')
        .eq('equipment_id', editingLog.equipment_id)
        .eq('status', 'active');
      const newStatus = (activeAsg && activeAsg.length > 0) ? 'operating' : 'ready';
      await supabase.from('heavy_equipment').update({ status: newStatus }).eq('id', editingLog.equipment_id);
    }
    setSaving(false);
    setEditingLog(null);
    loadLogs();
  };

  const deleteLog = async (id) => {
    if (!confirm('Hapus log perbaikan ini?')) return;
    await supabase.from('maintenance_logs').delete().eq('id', id);
    loadLogs();
  };

  // Batch Delete Functions
  const toggleBatchDelete = (id) => {
    setBatchDeleteIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleBatchDeleteAll = () => {
    if (batchDeleteIds.length === orderedLogs.length) {
      setBatchDeleteIds([]);
    } else {
      setBatchDeleteIds(orderedLogs.map(l => l.id));
    }
  };

  const deleteBatch = async () => {
    if (batchDeleteIds.length === 0) return;
    if (!confirm(`Hapus ${batchDeleteIds.length} log perbaikan yang dipilih?`)) return;
    setSaving(true);
    try {
      await supabase.from('maintenance_logs').delete().in('id', batchDeleteIds);
      setBatchDeleteIds([]);
      loadLogs();
    } catch (e) {
      alert('Gagal hapus masal');
    } finally {
      setSaving(false);
    }
  };

  // Manual Insert Functions
  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!newLogForm.equipment_id) {
      alert('Pilih alat berat terlebih dahulu');
      return;
    }
    setSaving(true);
    try {
      await supabase.from('maintenance_logs').insert({
        equipment_id: newLogForm.equipment_id,
        damage_description: `[Input Manual] ${newLogForm.damage_description}`,
        damage_type: newLogForm.damage_type,
        progress_status: 'pelaporan',
        reported_at: new Date().toISOString(),
      });
      setShowAddModal(false);
      setNewLogForm({ equipment_id: '', damage_description: '', damage_type: 'mekanik' });
      loadLogs();
    } catch (e) {
      alert('Gagal menambahkan log');
    } finally {
      setSaving(false);
    }
  };

  // ============ EXPORT EXCEL ============
  const exportExcel = async () => {
    if (filtered.length === 0) return alert('Tidak ada data untuk diekspor.');
    const wsData = filtered.map((l, i) => ({
      'No': i + 1,
      'Tanggal Laporan': new Date(l.reported_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
      'No. Lambung': l.equipment?.nomor_lambung || '-',
      'Nama Alat': l.equipment?.name || '-',
      'Merk / Tipe': l.equipment?.merk_type || '-',
      'Deskripsi Kerusakan': l.damage_description || '-',
      'Catatan Perbaikan': l.repair_notes || '-',
      'Status': (STEP_LABELS[l.progress_status] || l.progress_status).toUpperCase(),
      'Tanggal Selesai': l.resolved_at ? new Date(l.resolved_at).toLocaleDateString('id-ID') : '-',
      'Dari Operator': l.damage_description?.match(/\[Laporan Operator: ([^\]]+)\]/)?.[1] || '-',
    }));
    
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(wsData);
    ws['!cols'] = [
      { wch: 4 }, { wch: 20 }, { wch: 14 }, { wch: 25 }, { wch: 20 },
      { wch: 40 }, { wch: 40 }, { wch: 16 }, { wch: 16 }, { wch: 20 }
    ];
    const wb = XLSX.utils.book_new();
    const label = activeTab === 'aktif' ? 'Antrean_Aktif' : 'Riwayat_Selesai';
    XLSX.utils.book_append_sheet(wb, ws, label);
    const range = filterFrom || filterTo
      ? `_${filterFrom || 'awal'}_sd_${filterTo || 'sekarang'}`
      : '';
    const xlOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const xlBlob = new Blob([xlOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const xlUrl = URL.createObjectURL(xlBlob);
    const a = document.createElement('a');
    a.href = xlUrl;
    a.download = `Rekap_Perbaikan_${label}${range}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(xlUrl), 1000);
  };

  // ============ CETAK REKAP PDF ============
  const printRekapAll = () => {
    if (filtered.length === 0) return alert('Tidak ada data untuk dicetak.');
    const rangeLabel = filterFrom || filterTo
      ? `Periode: ${filterFrom ? new Date(filterFrom).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Awal'} s/d ${filterTo ? new Date(filterTo).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Sekarang'}`
      : 'Semua Periode';
    const printWin = window.open('', '_blank');
    let html = `<html><head><title>Rekap Perbaikan Alat Berat</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap');
        @page { size: legal portrait; margin: 15mm 20mm; }
        body { font-family: 'Open Sans', sans-serif; padding: 10px; font-size: 11px; }
        h2 { text-align: center; margin-bottom: 4px; color: #1e3a5f; font-size: 15px; }
        .sub { text-align: center; margin-bottom: 4px; font-size: 10px; color: #666; }
        .range-label { text-align:center; font-size:11px; font-weight:bold; color:#1e3a5f; margin-bottom:16px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10.5px; }
        th, td { border: 1px solid #333; padding: 5px 8px; vertical-align: top; }
        th { background: #d9ead3; font-weight: 700; text-align: center; }
        .tc { text-align: center; }
        .urgent { background: #fff5f5 !important; }
        .urgent td:first-child::before { content: '⚠️ '; }
        @media print { body { -webkit-print-color-adjust: exact; } }
      </style></head><body>
      <h2>REKAPITULASI PERBAIKAN ALAT BERAT</h2>
      <p class="sub">Dinas PU SDA Kabupaten Bojonegoro — Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      <p class="range-label">${rangeLabel} | Tab: ${activeTab === 'aktif' ? 'Antrean Aktif' : 'Riwayat Selesai'}</p>
      <table>
        <thead><tr>
          <th style="width:30px">No</th><th>Tgl Laporan</th><th>No. Lambung</th><th>Nama Alat</th>
          <th>Merk/Tipe</th><th>Deskripsi Kerusakan</th><th>Catatan Perbaikan</th><th>Status</th><th>Tgl Selesai</th>
        </tr></thead><tbody>`;
    orderedLogs.forEach((log, i) => {
      const isUrgent = log.progress_status === 'pelaporan';
      html += `<tr${isUrgent ? ' class="urgent"' : ''}>
        <td class="tc">${i + 1}</td>
        <td class="tc">${new Date(log.reported_at).toLocaleDateString('id-ID')}</td>
        <td class="tc">${log.equipment?.nomor_lambung || '-'}</td>
        <td>${log.equipment?.name || '-'}</td>
        <td>${log.equipment?.merk_type || '-'}</td>
        <td>${(log.damage_description || '-').replace(/\[Laporan Operator: [^\]]+\]\s*/g, '⚠️ ')}</td>
        <td>${log.repair_notes || '-'}</td>
        <td class="tc" style="font-weight:bold; color:${isUrgent ? '#dc2626' : '#166534'}">${STEP_LABELS[log.progress_status] || log.progress_status}</td>
        <td class="tc">${log.resolved_at ? new Date(log.resolved_at).toLocaleDateString('id-ID') : '—'}</td>
      </tr>`;
    });
    html += `</tbody></table>
      <div style="display:flex;justify-content:space-between;margin-top:40px;">
        <div style="text-align:center;width:200px;">Diverifikasi Oleh,<br><br><br><br><b>Ka. Seksi Peralatan</b></div>
        <div style="text-align:center;width:200px;">Dikerjakan Oleh,<br><br><br><br><b>Mekanik Lapangan</b></div>
      </div>
    </body></html>`;
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 800);
  };

  // ============ CETAK SATU BARIS ============
  const printSingleLog = (log) => {
    const printWin = window.open('', '_blank');
    printWin.document.write(`<html><head><title>Laporan Maintenance - ${log.equipment?.name}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@700&family=Open+Sans:wght@400;600&display=swap');
        body { font-family: 'Open Sans', sans-serif; padding: 40px; color: #1a1a1a; }
        h1 { font-family: 'Merriweather', serif; color: #496350; letter-spacing: 2px; text-transform: uppercase; font-size: 24px; border-bottom: 2px solid #8ba391; padding-bottom: 10px; }
        .meta { font-size: 13px; line-height: 1.7; margin-bottom: 25px; }
        .sec { font-weight: 700; font-size: 14px; margin-top: 25px; margin-bottom: 8px; text-transform: uppercase; border-left: 4px solid #496350; padding-left: 10px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 13px; }
        th, td { border: 1px solid #4a4a4a; padding: 8px; }
        th { font-weight: 700; text-align: center; background: #f0f4f0; }
        .tc { text-align: center; }
        .sig { margin-top: 50px; display: flex; justify-content: space-between; }
        .sig div { text-align: center; width: 200px; }
        @media print { body { -webkit-print-color-adjust: exact; } }
      </style></head><body>
      <h1>LAPORAN MAINTENANCE ALAT BERAT</h1>
      <div class="meta">
        <b>Tanggal Laporan:</b> ${new Date(log.reported_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br>
        <b>Nama Alat:</b> ${log.equipment?.name || '-'}<br>
        <b>No. Lambung:</b> ${log.equipment?.nomor_lambung || '-'}<br>
        <b>Merk / Tipe:</b> ${log.equipment?.merk_type || '-'}<br>
        <b>Lokasi:</b> Operasi Dinas PU SDA Kab. Bojonegoro
      </div>
      <div class="sec">Deskripsi Kerusakan / Keluhan</div>
      <table><tr><td>${(log.damage_description || '-').replace(/\[Laporan Operator: [^\]]+\]\s*/g, '⚠️ Laporan Operator: ')}</td></tr></table>
      <div class="sec">Catatan Perbaikan Mekanik</div>
      <table><tr><td>${log.repair_notes || '<i>Belum ada catatan perbaikan</i>'}</td></tr></table>
      <div class="sec">Status Penanganan</div>
      <table>
        <tr><th>Tahap</th><th>Status</th></tr>
        ${PROGRESS_STEPS.map(s => {
          const idx = PROGRESS_STEPS.indexOf(s);
          const currentIdx = PROGRESS_STEPS.indexOf(log.progress_status);
          const isDone = idx <= currentIdx;
          return `<tr><td>${STEP_LABELS[s]}</td><td class="tc" style="color:${isDone ? '#16a34a' : '#9ca3af'};font-weight:700;">${isDone ? '✓ Selesai' : '○ Menunggu'}</td></tr>`;
        }).join('')}
      </table>
      <div class="sig">
        <div>Diverifikasi Oleh,<br><br><br><br><b>Ka. Seksi Peralatan</b></div>
        <div>Mekanik Penanggung Jawab,<br><br><br><br><b>[Nama Mekanik]</b></div>
      </div>
    </body></html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 800);
  };

  const getProgressColor = (status) => {
    if (status === 'selesai') return '#16a34a';
    if (status === 'pengerjaan') return '#f59e0b';
    if (status === 'diterima') return '#3b82f6';
    if (status === 'pelaporan') return '#dc2626';
    return '#9ca3af';
  };

  const urgentCount = logs.filter(l => l.progress_status === 'pelaporan').length;

  return (
    <>
      <div className="header">
        <div>
          <div className="header-title">Rekap Data Perbaikan</div>
          <div className="header-subtitle">Kelola seluruh laporan kerusakan &amp; maintenance alat berat. Laporan operator ditandai merah di atas.</div>
        </div>
        <div className="header-right" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowAddModal(true)}>
            ➕ Tambah Manual
          </button>
          {batchDeleteIds.length > 0 && (
            <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#dc3545', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: 'bold' }} onClick={deleteBatch}>
              🗑️ Hapus Terpilih ({batchDeleteIds.length})
            </button>
          )}
          <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={exportExcel}>
            📥 Export Excel
          </button>
          <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={printRekapAll}>
            🖨️ Cetak PDF
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* ── TABS ── */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, borderBottom: '2px solid #e2e8f0', paddingBottom: 8 }}>
          <button
            className={`tab-btn ${activeTab === 'aktif' ? 'active' : ''}`}
            onClick={() => { setActiveTab('aktif'); setExpandedId(null); }}
            style={{ position: 'relative' }}
          >
            🔧 Antrean Aktif ({logs.filter(l => l.progress_status !== 'selesai').length})
            {urgentCount > 0 && (
              <span style={{
                position: 'absolute', top: -6, right: -8, background: '#dc2626', color: '#fff',
                borderRadius: '50%', width: 18, height: 18, fontSize: 11, fontWeight: 'bold',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>{urgentCount}</span>
            )}
          </button>
          <button
            className={`tab-btn ${activeTab === 'selesai' ? 'active' : ''}`}
            onClick={() => { setActiveTab('selesai'); setExpandedId(null); }}
          >
            ✅ Riwayat Selesai ({logs.filter(l => l.progress_status === 'selesai').length})
          </button>
        </div>

        {/* ── FILTER TANGGAL ── */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>📅 Filter Tanggal:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, color: '#64748b' }}>Dari:</label>
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, color: '#64748b' }}>Sampai:</label>
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }} />
          </div>
          {(filterFrom || filterTo) && (
            <button onClick={() => { setFilterFrom(''); setFilterTo(''); }}
              style={{ padding: '6px 12px', fontSize: 12, background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
              ✕ Reset Filter
            </button>
          )}
          {filtered.length !== filteredByTab.length && (
            <span style={{ fontSize: 12, color: '#64748b' }}>→ Menampilkan {filtered.length} dari {filteredByTab.length} data</span>
          )}
        </div>

        {/* ── URGENT BANNER ── */}
        {activeTab === 'aktif' && urgentLogs.length > 0 && (
          <div style={{ background: '#fef2f2', border: '2px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>🚨</span>
            <div>
              <div style={{ fontWeight: 700, color: '#991b1b', fontSize: 14 }}>
                {urgentLogs.length} Laporan Kerusakan Baru dari Operator — Butuh Perhatian Segera!
              </div>
              <div style={{ fontSize: 12, color: '#dc2626', marginTop: 2 }}>
                Status alat sudah otomatis Maintenance. Klik baris merah di bawah untuk mulai proses penanganan.
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="table-wrapper">
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center' }}>Memuat data perbaikan...</div>
            ) : orderedLogs.length === 0 ? (
              <div className="empty-state">
                <h3>{activeTab === 'aktif' ? 'Tidak Ada Antrean Aktif' : 'Belum Ada Riwayat'}</h3>
                <p>{activeTab === 'aktif' ? 'Semua alat beres!' : 'Belum ada perbaikan yang diselesaikan.'}</p>
              </div>
            ) : (
              <table style={{ fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: '#e8f5e9' }}>
                    <th style={{ width: 40, textAlign: 'center' }}>
                      <input type="checkbox" onChange={toggleBatchDeleteAll} checked={orderedLogs.length > 0 && batchDeleteIds.length === orderedLogs.length} />
                    </th>
                    <th style={{ width: 40 }}>No</th>
                    <th>Tanggal</th>
                    <th>No. Lambung</th>
                    <th>Nama Alat</th>
                    <th>Kerusakan (Ringkasan)</th>
                    <th style={{ width: 160 }}>Progress</th>
                    <th style={{ width: 110 }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {orderedLogs.map((log, idx) => {
                    const isUrgent = log.progress_status === 'pelaporan';
                    const stepIdx = PROGRESS_STEPS.indexOf(log.progress_status);
                    const isExpanded = expandedId === log.id;
                    return (
                      <>
                        <tr key={log.id} onClick={() => toggleExpand(log.id)}
                          style={{
                            cursor: 'pointer',
                            background: batchDeleteIds.includes(log.id) ? '#fee2e2' : (isUrgent ? '#fff5f5' : (isExpanded ? '#f0f9ff' : 'white')),
                            borderLeft: isUrgent ? '4px solid #dc2626' : '4px solid transparent',
                            transition: 'background 0.2s',
                          }}>
                          <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                            <input type="checkbox" checked={batchDeleteIds.includes(log.id)} onChange={() => toggleBatchDelete(log.id)} />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {isUrgent && <span title="Laporan dari operator — perlu segera ditangani">🚨</span>}
                            {idx + 1}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {new Date(log.reported_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td style={{ fontWeight: 'bold', color: '#1e3a5f' }}>
                            {log.equipment?.nomor_lambung || '—'}
                          </td>
                          <td>
                            <div className="font-semibold">{log.equipment?.name}</div>
                            <div className="text-xs text-muted">{log.equipment?.merk_type || ''}</div>
                          </td>
                          <td style={{ maxWidth: 250 }}>
                            {isUrgent && (
                              <span style={{ fontSize: 10, background: '#fecaca', color: '#991b1b', padding: '1px 6px', borderRadius: 8, fontWeight: 700, marginRight: 4 }}>
                                DARI OPERATOR
                              </span>
                            )}
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {(log.damage_description || '').replace(/\[Laporan Operator: [^\]]+\]\s*/g, '')}
                            </div>
                            {isUrgent && (
                              <div style={{ fontSize: 10, color: '#dc2626', marginTop: 2 }}>
                                📍 Operator: {log.damage_description?.match(/\[Laporan Operator: ([^\]]+)\]/)?.[1] || '—'}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 2, marginBottom: 3 }}>
                              {PROGRESS_STEPS.map((s, i) => (
                                <div key={s} style={{
                                  flex: 1, height: 6, borderRadius: 3,
                                  background: i <= stepIdx ? getProgressColor(log.progress_status) : '#e5e7eb'
                                }} />
                              ))}
                            </div>
                            <div style={{
                              fontSize: 10, textAlign: 'center', textTransform: 'capitalize', fontWeight: 700,
                              color: getProgressColor(log.progress_status)
                            }}>{STEP_LABELS[log.progress_status]}</div>
                          </td>
                          <td onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {isUrgent && (
                                <button className="btn btn-sm" style={{ fontSize: 10, padding: '3px 7px', background: '#1e3a5f', color: '#fff', border: 'none' }}
                                  onClick={() => openEdit(log)}>✅ Terima</button>
                              )}
                              {!isUrgent && (
                                <button className="btn btn-sm btn-primary" style={{ fontSize: 10, padding: '3px 7px' }} onClick={() => openEdit(log)}>✏️ Edit</button>
                              )}
                              <button className="btn btn-sm btn-outline" style={{ fontSize: 10, padding: '3px 7px' }} onClick={() => printSingleLog(log)}>PDF</button>
                              <button className="btn btn-sm" style={{ fontSize: 10, padding: '3px 7px', background: '#fee2e2', color: '#dc2626', border: 'none' }} onClick={() => deleteLog(log.id)}>🗑️</button>
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr key={log.id + '-detail'}>
                            <td colSpan={7} style={{ padding: 0, background: '#f8fafc' }}>
                              <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                <div>
                                  <h4 style={{ fontSize: 14, marginBottom: 12, color: '#374151' }}>📋 Detail Laporan Kerusakan</h4>
                                  <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 12 }}>
                                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Deskripsi Lengkap</div>
                                    <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                                      {(log.damage_description || '-').replace(/\[Laporan Operator: ([^\]]+)\]/, '⚠️ Dilaporkan Operator: $1 —')}
                                    </div>
                                  </div>
                                  <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 12 }}>
                                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Catatan Perbaikan Mekanik</div>
                                    <div style={{ fontSize: 13, lineHeight: 1.6 }}>{log.repair_notes || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Belum ada catatan</span>}</div>
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
                                      <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Dilaporkan</div>
                                      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{new Date(log.reported_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                                    </div>
                                    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
                                      <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Diselesaikan</div>
                                      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{log.resolved_at ? new Date(log.resolved_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '— (Dalam Proses)'}</div>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <h4 style={{ fontSize: 14, marginBottom: 12, color: '#374151' }}>📊 Progress Penanganan</h4>
                                  <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 12 }}>
                                    {PROGRESS_STEPS.map((step, i) => {
                                      const isDone = i <= stepIdx;
                                      const isCurrent = i === stepIdx;
                                      return (
                                        <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: i < 3 ? '1px solid #f3f4f6' : 'none' }}>
                                          <div style={{
                                            width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 12, fontWeight: 700, flexShrink: 0,
                                            background: isDone ? getProgressColor(log.progress_status) : '#f3f4f6',
                                            color: isDone ? 'white' : '#9ca3af',
                                            border: isCurrent ? `2px solid ${getProgressColor(log.progress_status)}` : 'none',
                                          }}>
                                            {isDone && i < stepIdx ? '✓' : i + 1}
                                          </div>
                                          <div>
                                            <div style={{ fontSize: 13, fontWeight: isCurrent ? 700 : 400, color: isDone ? '#111' : '#9ca3af' }}>{STEP_LABELS[step]}</div>
                                            {isCurrent && <div style={{ fontSize: 10, color: getProgressColor(log.progress_status), fontWeight: 600 }}>← Saat ini</div>}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                    <button className="btn btn-outline" style={{ flex: 1, fontSize: 11 }} onClick={() => printSingleLog(log)}>🖨️ Cetak PDF</button>
                                    <button className="btn" style={{ fontSize: 11, background: 'transparent', color: '#dc2626', border: '1px solid #fecaca' }} onClick={() => deleteLog(log.id)}>🗑️ Hapus</button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Edit/Olah Modal */}
      {editingLog && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditingLog(null)}>
          <div className="modal" style={{ maxWidth: 550 }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Olah Tindakan Perbaikan</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{editingLog.equipment?.name} — {editingLog.equipment?.merk_type}</p>
              </div>
              <button className="btn-icon" onClick={() => setEditingLog(null)}>
                <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={saveEdit}>
              <div className="modal-body">
                <div style={{ background: editingLog.progress_status === 'pelaporan' ? '#fff5f5' : 'var(--bg-base)', padding: 12, borderRadius: 8, marginBottom: 16, border: `1px solid ${editingLog.progress_status === 'pelaporan' ? '#fecaca' : 'var(--border)'}` }}>
                  {editingLog.progress_status === 'pelaporan' && (
                    <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 700, marginBottom: 6 }}>🚨 Laporan dari Operator — Segera Tanggapi</div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Keluhan Awal</div>
                  <div style={{ fontSize: 13 }}>{(editingLog.damage_description || '').replace(/\[Laporan Operator: ([^\]]+)\]\s*/g, '⚠️ Operator: $1 — ')}</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Update Status Perbaikan</label>
                  <select className="form-control" value={form.progress_status} onChange={e => setForm({ ...form, progress_status: e.target.value })}>
                    <option value="pelaporan">Laporan Masuk (Baru masuk)</option>
                    <option value="diterima">Diterima (Sedang disiapkan)</option>
                    <option value="pengerjaan">Pengerjaan (Proses mekanik)</option>
                    <option value="selesai">Selesai (Alat bisa bertugas normal)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Catatan Perbaikan Mekanik Lapangan</label>
                  <textarea className="form-control" rows={4}
                    placeholder="Jelaskan tindakan perbaikan yang dilakukan, suku cadang yang diganti, dll..."
                    value={form.repair_notes} onChange={e => setForm({ ...form, repair_notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setEditingLog(null)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Manual Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="modal-title">Tambah Log Perbaikan Manual</h3>
              <button className="btn-icon" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddLog}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Alat Berat *</label>
                  <select className="form-control" required value={newLogForm.equipment_id} onChange={e => setNewLogForm({ ...newLogForm, equipment_id: e.target.value })}>
                    <option value="">— Pilih Alat Berat —</option>
                    {availableEquipment.map(eq => (
                      <option key={eq.id} value={eq.id}>
                        {eq.nomor_lambung} — {eq.name} ({eq.merk_type || '-'})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Jenis Kerusakan</label>
                  <select className="form-control" value={newLogForm.damage_type} onChange={e => setNewLogForm({ ...newLogForm, damage_type: e.target.value })}>
                    <option value="mekanik">Mekanik</option>
                    <option value="elektrik">Elektrik</option>
                    <option value="body">Body / Chassis</option>
                    <option value="hidrolik">Sistem Hidrolik</option>
                    <option value="lainnya">Lainnya</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Deskripsi Kerusakan *</label>
                  <textarea className="form-control" rows={4} required
                    placeholder="Jelaskan kerusakan atau keluhan yang ditemukan..."
                    value={newLogForm.damage_description} onChange={e => setNewLogForm({ ...newLogForm, damage_description: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Tambah Log'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
