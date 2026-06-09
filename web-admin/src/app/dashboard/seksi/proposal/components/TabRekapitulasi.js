'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import WILAYAH from '@/lib/wilayah';
import * as XLSX from 'xlsx';

export default function TabRekapitulasi({ tahun, role }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('semua');
  const [search, setSearch] = useState('');
  const [batchIds, setBatchIds] = useState([]);
  const fileInputRef = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/proposal?tahun=${tahun}&role=${role}`);
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch (e) {
      console.error('Fetch proposals error:', e);
    } finally {
      setLoading(false);
    }
  }, [tahun, role]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = data.filter(d => {
    if (filter === 'sudah' && !d.sudah_survey) return false;
    if (filter === 'belum' && d.sudah_survey) return false;
    if (search) {
      const term = search.toLowerCase();
      const match = 
        (d.nama_usulan || '').toLowerCase().includes(term) ||
        (d.desa || '').toLowerCase().includes(term) ||
        (d.kecamatan || '').toLowerCase().includes(term);
      if (!match) return false;
    }
    return true;
  });

  const addRow = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tahun,
          nama_usulan: 'Proposal Baru',
          kabupaten: 'Bojonegoro',
          usulan_desa: role === 'seksi_embung' ? 'embung' : 'normalisasi',
          created_by_role: role,
        }),
      });
      const saved = await res.json();
      if (saved.id) setData(prev => [...prev, saved]);
    } catch (e) {
      alert('Gagal menambah proposal');
    } finally {
      setSaving(false);
    }
  };

  const updateCell = async (id, field, value) => {
    setData(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
    try {
      await fetch('/api/proposal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, [field]: value }),
      });
    } catch (e) {
      console.error('Update failed:', e);
    }
  };

  const toggleSurvey = async (id, current) => {
    const newVal = !current;
    setData(prev => prev.map(d => d.id === id ? { ...d, sudah_survey: newVal, tanggal_survey: newVal ? new Date().toISOString().split('T')[0] : null } : d));
    try {
      await fetch('/api/proposal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, sudah_survey: newVal }),
      });
    } catch (e) {
      console.error('Toggle survey failed:', e);
    }
  };

  const restoreToPriority = async (id) => {
    if (!confirm('Kembalikan proposal ini ke Rencana Prioritas?')) return;
    setData(prev => prev.map(d => d.id === id ? { ...d, is_rejected_priority: false } : d));
    try {
      await fetch('/api/proposal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_rejected_priority: false }),
      });
    } catch (e) {
      console.error('Restore failed:', e);
      alert('Gagal memulihkan ke prioritas');
    }
  };

  const deleteRow = async (id) => {
    if (!confirm('Hapus proposal ini?')) return;
    try {
      await fetch(`/api/proposal?id=${id}`, { method: 'DELETE' });
      setData(prev => prev.filter(d => d.id !== id));
      setBatchIds(prev => prev.filter(x => x !== id));
    } catch (e) {
      alert('Gagal menghapus');
    }
  };

  const deleteBatch = async () => {
    if (!batchIds.length || !confirm(`Hapus ${batchIds.length} proposal?`)) return;
    setSaving(true);
    try {
      await fetch(`/api/proposal?ids=${batchIds.join(',')}`, { method: 'DELETE' });
      setData(prev => prev.filter(d => !batchIds.includes(d.id)));
      setBatchIds([]);
    } catch (e) {
      alert('Gagal menghapus masal');
    } finally {
      setSaving(false);
    }
  };

  const toggleBatch = (id) => setBatchIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAllBatch = () => {
    if (batchIds.length === filtered.length) setBatchIds([]);
    else setBatchIds(filtered.map(d => d.id));
  };

  const totalSurvey = data.filter(d => d.sudah_survey).length;
  const totalBelum = data.length - totalSurvey;

  const handleDownloadTemplate = () => {
    const wsData = [
      ['nama_usulan', 'tanggal_usulan', 'desa', 'kecamatan', 'kabupaten', 'panjang_lokasi', 'usulan_desa', 'tahun_pelaksanaan', 'keterangan', 'link_proposal'],
      ['Contoh Proposal', '2026-05-20', 'Sukorejo', 'Bojonegoro', 'Bojonegoro', '100m', role === 'seksi_embung' ? 'embung' : 'normalisasi', tahun, 'Keterangan tambahan', '']
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `Template_Proposal_${tahun}.xlsx`);
  };

  const handleUploadExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('section_role', role);

      const res = await fetch('/api/proposal/bulk-upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        alert(`Berhasil upload ${data.count || ''} proposal!`);
        fetchData();
      } else {
        alert('Gagal upload data: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Error memproses file');
    } finally {
      setSaving(false);
      e.target.value = ''; // reset file input
    }
  };

  const thStyle = { padding: '10px 8px', border: '1px solid #dde2eb', background: '#f0f4ff', color: '#1e3a5f', fontSize: 11, fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 5 };
  const tdStyle = { padding: 0, border: '1px solid #e5e9f0', fontSize: 12 };
  const inputStyle = { width: '100%', padding: '8px 6px', border: 'none', background: 'transparent', outline: 'none', fontSize: 12 };

  return (
    <div style={{ padding: 20 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={addRow} disabled={saving} className="btn btn-success" style={{ fontSize: 13 }}>
            <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Tambah
          </button>
          
          <button onClick={handleDownloadTemplate} disabled={saving} className="btn btn-outline" style={{ fontSize: 13 }}>
            <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Template
          </button>

          <input 
            type="file" 
            accept=".xlsx, .xls" 
            style={{ display: 'none' }} 
            ref={fileInputRef}
            onChange={handleUploadExcel} 
          />
          <button onClick={() => fileInputRef.current.click()} disabled={saving} className="btn btn-outline" style={{ fontSize: 13 }}>
            <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Upload
          </button>

          {batchIds.length > 0 && (
            <button onClick={deleteBatch} disabled={saving} className="btn btn-danger" style={{ fontSize: 13 }}>
              Hapus ({batchIds.length})
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="search-bar" style={{ position: 'relative' }}>
            <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-muted)', pointerEvents: 'none' }}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              className="form-control"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama usulan..."
              style={{ paddingLeft: 32, width: 220, fontSize: 12.5 }}
            />
          </div>
          <select className="form-control" value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 160, fontSize: 12.5, padding: '7px 10px' }}>
            <option value="semua">Semua ({data.length})</option>
            <option value="sudah">✅ Sudah Survey ({totalSurvey})</option>
            <option value="belum">⏳ Belum Survey ({totalBelum})</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', border: '1px solid #dde2eb', borderRadius: 8, maxHeight: 'calc(100vh - 340px)' }}>
        {loading ? (
          <div style={{ padding: 50, textAlign: 'center', color: 'var(--text-muted)' }}>Memuat data proposal...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: 50 }}>
            <svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" style={{ width: 48, height: 48, margin: '0 auto 12px', color: 'var(--text-muted)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3>Belum ada proposal untuk tahun {tahun}</h3>
            <p>Klik "Tambah Proposal" untuk mulai menginput data.</p>
          </div>
        ) : (
          <table style={{ width: '100%', minWidth: 1500, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 36 }}>
                  <input type="checkbox" onChange={toggleAllBatch} checked={filtered.length > 0 && batchIds.length === filtered.length} style={{ cursor: 'pointer' }} />
                </th>
                <th style={{ ...thStyle, width: 60 }}>No. Urut</th>
                <th style={{ ...thStyle, width: 280 }}>Nama Usulan</th>
                <th style={{ ...thStyle, width: 100 }}>Tgl Usulan</th>
                <th style={{ ...thStyle, width: 110 }}>Desa</th>
                <th style={{ ...thStyle, width: 120 }}>Kecamatan</th>
                <th style={{ ...thStyle, width: 110 }}>Kabupaten</th>
                <th style={{ ...thStyle, width: 90 }}>Panjang</th>
                <th style={{ ...thStyle, width: 100 }}>Usulan</th>
                <th style={{ ...thStyle, width: 70 }}>Tahun</th>
                <th style={{ ...thStyle, width: 140 }}>Keterangan</th>
                <th style={{ ...thStyle, width: 100 }}>Link</th>
                <th style={{ ...thStyle, width: 70, background: '#e8fdf0', color: '#0d6832' }}>Survey</th>
                <th style={{ ...thStyle, width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr
                  key={row.id}
                  style={{
                    background: batchIds.includes(row.id) ? '#fee2e2' : row.sudah_survey ? '#f0fdf4' : (i % 2 === 0 ? '#fff' : '#fafbfd'),
                    borderLeft: row.sudah_survey ? '3px solid #16a34a' : '3px solid transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <td style={{ ...tdStyle, textAlign: 'center', padding: 8 }}>
                    <input type="checkbox" checked={batchIds.includes(row.id)} onChange={() => toggleBatch(row.id)} style={{ cursor: 'pointer' }} />
                  </td>
                  <td style={tdStyle}>
                    <input type="number" value={row.nomor_urut || ''} onChange={e => updateCell(row.id, 'nomor_urut', parseInt(e.target.value) || null)} style={{ ...inputStyle, textAlign: 'center', fontWeight: 'bold' }} />
                  </td>
                  <td style={tdStyle}>
                    <input value={row.nama_usulan || ''} onChange={e => updateCell(row.id, 'nama_usulan', e.target.value)} style={{ ...inputStyle, textAlign: 'left', fontWeight: 500 }} />
                  </td>
                  <td style={tdStyle}>
                    <input type="date" value={row.tanggal_usulan ? row.tanggal_usulan.split('T')[0] : ''} onChange={e => updateCell(row.id, 'tanggal_usulan', e.target.value)} style={{ ...inputStyle, textAlign: 'center' }} />
                  </td>
                  <td style={tdStyle}>
                    {row.kecamatan && WILAYAH[row.kecamatan] ? (
                      <select value={row.desa || ''} onChange={e => updateCell(row.id, 'desa', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                        <option value="">— Pilih Desa —</option>
                        {WILAYAH[row.kecamatan].map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    ) : (
                      <input value={row.desa || ''} onChange={e => updateCell(row.id, 'desa', e.target.value)} style={inputStyle} placeholder="Pilih Kec. dulu" />
                    )}
                  </td>
                  <td style={tdStyle}>
                    <select value={row.kecamatan || ''} onChange={e => updateCell(row.id, 'kecamatan', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                      <option value="">— Pilih —</option>
                      {Object.keys(WILAYAH).map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </td>
                  <td style={tdStyle}>
                    <input value={row.kabupaten || ''} onChange={e => updateCell(row.id, 'kabupaten', e.target.value)} style={inputStyle} />
                  </td>
                  <td style={tdStyle}>
                    <input value={row.panjang_lokasi || ''} onChange={e => updateCell(row.id, 'panjang_lokasi', e.target.value)} style={{ ...inputStyle, textAlign: 'center' }} />
                  </td>
                  <td style={tdStyle}>
                    <input value={row.usulan_desa || ''} onChange={e => updateCell(row.id, 'usulan_desa', e.target.value)} style={inputStyle} />
                  </td>
                  <td style={tdStyle}>
                    <input type="number" value={row.tahun_pelaksanaan || ''} onChange={e => updateCell(row.id, 'tahun_pelaksanaan', parseInt(e.target.value) || null)} style={{ ...inputStyle, textAlign: 'center' }} />
                  </td>
                  <td style={tdStyle}>
                    <input value={row.keterangan || ''} onChange={e => updateCell(row.id, 'keterangan', e.target.value)} style={inputStyle} />
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <input value={row.link_proposal || ''} onChange={e => updateCell(row.id, 'link_proposal', e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="URL..." />
                      {row.link_proposal && (
                        <a href={row.link_proposal} target="_blank" rel="noopener noreferrer" style={{ padding: '0 6px', color: '#3b82f6', textDecoration: 'none' }} title="Buka Link">
                          <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                      )}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center', padding: 6, background: row.sudah_survey ? '#dcfce7' : '#fffbeb' }}>
                    <button
                      onClick={() => toggleSurvey(row.id, row.sudah_survey)}
                      style={{
                        width: 32, height: 32, borderRadius: 8, border: '2px solid',
                        borderColor: row.sudah_survey ? '#16a34a' : '#d4d4d8',
                        background: row.sudah_survey ? '#16a34a' : '#fff',
                        color: row.sudah_survey ? '#fff' : '#d4d4d8',
                        cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s',
                        margin: '0 auto'
                      }}
                      title={row.sudah_survey ? 'Sudah Survey ✓' : 'Belum Survey'}
                    >
                      {row.sudah_survey ? '✓' : ''}
                    </button>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center', padding: 4 }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      {row.is_rejected_priority && (
                        <button onClick={() => restoreToPriority(row.id)} style={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', padding: 4 }} title="Pulihkan ke Rencana Prioritas">
                          <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ width: 15, height: 15 }}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                        </button>
                      )}
                      <button onClick={() => deleteRow(row.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }} title="Hapus">
                        <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ width: 15, height: 15 }}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary Footer */}
      {!loading && data.length > 0 && (
        <div style={{ marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ padding: '14px 20px', background: '#f8f9ff', border: '1px solid #dde2eb', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>📋</span>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Proposal</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{data.length}</div>
            </div>
          </div>
          <div style={{ padding: '14px 20px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>✅</span>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Sudah Survey</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>{totalSurvey}</div>
            </div>
          </div>
          <div style={{ padding: '14px 20px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>⏳</span>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>Belum Survey</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#d97706' }}>{totalBelum}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
