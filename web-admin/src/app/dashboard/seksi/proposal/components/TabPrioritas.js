'use client';
import { useState, useEffect, useCallback } from 'react';
import CriteriaModal from './CriteriaModal';

export default function TabPrioritas({ tahun, role }) {
  const [data, setData] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  
  const [showCriteriaModal, setShowCriteriaModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/proposal/priority?tahun=${tahun}&role=${role}`);
      const json = await res.json();
      
      setCriteria(json.criteria || []);
      
      // Sort: A -> D, then by presentase desc
      const sorted = (json.proposals || []).sort((a, b) => {
        if (a.prioritas !== b.prioritas) {
          if (!a.prioritas) return 1;
          if (!b.prioritas) return -1;
          return a.prioritas.localeCompare(b.prioritas);
        }
        return (b.presentase_total || 0) - (a.presentase_total || 0);
      });
      
      setData(sorted);
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [tahun, role]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleReject = async (id) => {
    if (!confirm('Tolak proposal ini? Proposal akan disembunyikan dari Rencana Prioritas & Schedule dihapus, tapi tetap ada di Rekapitulasi.')) return;
    try {
      await fetch('/api/proposal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_rejected_priority: true })
      });
      fetchData();
    } catch (e) {
      alert('Gagal menolak proposal');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus permanen proposal ini? Data akan hilang dari SEMUA tab.')) return;
    try {
      await fetch(`/api/proposal?id=${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) {
      alert('Gagal menghapus proposal');
    }
  };

  const updateScore = async (proposalId, criteriaObj, selectedOptionIdx) => {
    setSavingId(proposalId);
    
    let skor = null;
    let label = null;
    
    if (selectedOptionIdx !== '') {
      const opt = criteriaObj.opsi[selectedOptionIdx];
      skor = opt.skor;
      label = opt.label;
    }

    try {
      // Optimistic calc
      const newData = [...data];
      const pIdx = newData.findIndex(p => p.id === proposalId);
      if (pIdx > -1) {
        const p = { ...newData[pIdx] };
        p.scores = { ...p.scores };
        
        if (skor !== null) {
           p.scores[criteriaObj.id] = { skor, pilihan_label: label };
        } else {
           delete p.scores[criteriaObj.id];
        }

        // Recalc
        let presentase = 0;
        let filledCount = 0;
        criteria.forEach(c => {
          const s = p.scores[c.id];
          if (s && s.skor != null) {
            presentase += (s.skor / c.skor_maksimal) * (c.bobot / 100);
            filledCount++;
          }
        });
        
        const rounded = Math.round(presentase * 100 * 100) / 100;
        p.presentase_total = filledCount > 0 ? rounded : null;
        p.prioritas = filledCount === criteria.length ? 
          (rounded > 75 ? 'A' : rounded > 50 ? 'B' : rounded > 25 ? 'C' : 'D') : null;
        
        newData[pIdx] = p;
        
        // Resort
        newData.sort((a, b) => {
          if (a.prioritas !== b.prioritas) {
            if (!a.prioritas) return 1;
            if (!b.prioritas) return -1;
            return a.prioritas.localeCompare(b.prioritas);
          }
          return (b.presentase_total || 0) - (a.presentase_total || 0);
        });
        
        setData(newData);
      }

      // API call
      await fetch('/api/proposal/priority', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal_id: proposalId,
          criteria_id: criteriaObj.id,
          pilihan_label: label,
          skor: skor
        })
      });
      
    } catch (e) {
      console.error(e);
      alert('Gagal menyimpan nilai');
    } finally {
      setSavingId(null);
    }
  };

  const stats = {
    A: data.filter(d => d.prioritas === 'A').length,
    B: data.filter(d => d.prioritas === 'B').length,
    C: data.filter(d => d.prioritas === 'C').length,
    D: data.filter(d => d.prioritas === 'D').length,
    None: data.filter(d => !d.prioritas).length
  };

  const getBadgeColor = (p) => {
    switch(p) {
      case 'A': return { bg: '#dcfce7', color: '#16a34a' };
      case 'B': return { bg: '#e8f0fe', color: '#1a56db' };
      case 'C': return { bg: '#fef3c7', color: '#d97706' };
      case 'D': return { bg: '#fee2e2', color: '#dc2626' };
      default: return { bg: '#f1f5f9', color: '#64748b' };
    }
  };

  const thStyle = { padding: '10px 8px', border: '1px solid #dde2eb', background: '#f0f4ff', color: '#1e3a5f', fontSize: 11, fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 5 };
  const tdStyle = { padding: '6px 8px', border: '1px solid #e5e9f0', fontSize: 12 };
  
  return (
    <div style={{ padding: 20 }}>
      {/* Stats & Tools */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {['A','B','C','D'].map(p => (
            <div key={p} style={{ background: getBadgeColor(p).bg, border: `1px solid ${getBadgeColor(p).color}40`, padding: '10px 16px', borderRadius: 8, minWidth: 100 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: getBadgeColor(p).color, opacity: 0.8 }}>PRIORITAS {p}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: getBadgeColor(p).color }}>{stats[p]}</div>
            </div>
          ))}
          {stats.None > 0 && (
            <div style={{ background: '#f1f5f9', border: `1px solid #cbd5e1`, padding: '10px 16px', borderRadius: 8, minWidth: 100 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', opacity: 0.8 }}>BELUM LENGKAP</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#64748b' }}>{stats.None}</div>
            </div>
          )}
        </div>
        
        <button onClick={() => setShowCriteriaModal(true)} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ width: 16, height: 16 }}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          Kelola Kriteria
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', border: '1px solid #dde2eb', borderRadius: 8, maxHeight: 'calc(100vh - 350px)' }}>
        {loading ? (
          <div style={{ padding: 50, textAlign: 'center', color: 'var(--text-muted)' }}>Memuat data prioritas...</div>
        ) : data.length === 0 ? (
          <div className="empty-state" style={{ padding: 50 }}>
            <h3>Belum ada proposal yang di-survey</h3>
            <p>Silakan tandai "Sudah Survey" pada Tab Rekapitulasi terlebih dahulu.</p>
          </div>
        ) : (
          <table style={{ width: '100%', minWidth: 1400, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 40 }}>No</th>
                <th style={{ ...thStyle, width: 60 }}>No.Urut</th>
                <th style={{ ...thStyle, width: 220, textAlign: 'left' }}>Nama Usulan</th>
                <th style={{ ...thStyle, width: 90 }}>Tgl Proposal</th>
                <th style={{ ...thStyle, width: 100 }}>Desa</th>
                {criteria.map(c => (
                  <th key={c.id} style={{ ...thStyle, width: 150 }}>
                    <div style={{ whiteSpace: 'normal', lineHeight: 1.2 }}>{c.nama_kriteria}</div>
                    <div style={{ fontSize: 9, opacity: 0.7, marginTop: 2 }}>{c.bobot}% (Max {c.skor_maksimal})</div>
                  </th>
                ))}
                <th style={{ ...thStyle, width: 120 }}>Presentase</th>
                <th style={{ ...thStyle, width: 80 }}>Prioritas</th>
                <th style={{ ...thStyle, width: 90 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={row.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbfd' }}>
                  <td style={{ ...tdStyle, textAlign: 'center', color: '#64748b' }}>{i + 1}</td>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold' }}>{row.nomor_urut || '-'}</td>
                  <td style={{ ...tdStyle, fontWeight: 500 }}>
                    <div>{row.nama_usulan}</div>
                    {row.tahun < tahun && (
                      <div style={{ fontSize: 10, color: '#d97706', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Carry forward dari {row.tahun}
                      </div>
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center', fontSize: 11 }}>
                    {row.tanggal_usulan ? row.tanggal_usulan.split('T')[0] : '-'}
                    <div style={{ fontWeight: 'bold', marginTop: 2 }}>{row.tahun}</div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{row.desa}</td>
                  
                  {criteria.map(c => {
                    const scoreObj = row.scores?.[c.id];
                    let selectedIdx = '';
                    if (scoreObj && scoreObj.skor != null) {
                       selectedIdx = c.opsi.findIndex(o => o.skor === scoreObj.skor);
                    }
                    
                    return (
                      <td key={c.id} style={{ ...tdStyle, padding: '4px 6px' }}>
                        <select 
                          className="form-control" 
                          style={{ width: '100%', fontSize: 11, padding: '4px 6px', height: 28 }}
                          value={selectedIdx}
                          onChange={(e) => updateScore(row.id, c, e.target.value)}
                        >
                          <option value="">-- Pilih --</option>
                          {c.opsi.map((opt, idx) => (
                            <option key={idx} value={idx}>{opt.label} ({opt.skor})</option>
                          ))}
                        </select>
                      </td>
                    );
                  })}
                  
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ 
                          height: '100%', 
                          width: `${Math.min(row.presentase_total || 0, 100)}%`, 
                          background: getBadgeColor(row.prioritas).color,
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, width: 45, textAlign: 'right' }}>
                        {row.presentase_total != null ? `${row.presentase_total}%` : '-'}
                      </span>
                    </div>
                  </td>
                  
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {row.prioritas ? (
                      <span style={{ 
                        display: 'inline-block', padding: '4px 12px', borderRadius: 12, 
                        background: getBadgeColor(row.prioritas).bg, 
                        color: getBadgeColor(row.prioritas).color, 
                        fontWeight: 800, fontSize: 14 
                      }}>
                        {row.prioritas}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: 11 }}>-</span>
                    )}
                  </td>
                  
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      <button 
                        title="Tolak (Sembunyikan dari Prioritas & Schedule)"
                        onClick={() => handleReject(row.id)}
                        style={{ padding: 4, background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer' }}
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                      <button 
                        title="Hapus Permanen"
                        onClick={() => handleDelete(row.id)}
                        style={{ padding: 4, background: '#fef2f2', color: '#991b1b', border: '1px solid #f87171', borderRadius: 4, cursor: 'pointer' }}
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      {showCriteriaModal && (
        <CriteriaModal
          show={showCriteriaModal}
          onClose={() => setShowCriteriaModal(false)}
          currentCriteria={criteria}
          role={role}
          onSaved={fetchData}
        />
      )}
    </div>
  );
}
