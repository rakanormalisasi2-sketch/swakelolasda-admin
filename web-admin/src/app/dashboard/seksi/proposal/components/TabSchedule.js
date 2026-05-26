'use client';
import React, { useState, useEffect, useCallback } from 'react';
import ManualRowModal from './ManualRowModal';

// Helpers for 12 months x 4 weeks
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const WEEKS_TOTAL = 48;

export default function TabSchedule({ tahun, role }) {
  const [data, setData] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // State for dragging/selecting weeks
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartInfo, setDragStartInfo] = useState(null); // { scheduleId, weekIdx }
  const [dragCurrentWeek, setDragCurrentWeek] = useState(null); // weekIdx while dragging
  
  const [showManualModal, setShowManualModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/proposal/schedule?tahun=${tahun}&role=${role}`, { cache: 'no-store' });
      const rawJson = await res.json();
      const json = Array.isArray(rawJson) ? rawJson : [];
      
      const eqRes = await fetch(`/api/heavy-equipment`, { cache: 'no-store' });
      const eqRaw = await eqRes.json();
      const eqJson = Array.isArray(eqRaw) ? eqRaw : [];
      
      // Fetch priority proposals to find unassigned ones
      const prioRes = await fetch(`/api/proposal/priority?tahun=${tahun}&role=${role}`, { cache: 'no-store' });
      const prioJson = await prioRes.json();
      
      const priorityProposals = (prioJson.proposals || []).filter(p => p.prioritas);
      
      const schedules = (json || []).map(s => {
        if (s.proposal_id) {
          const matchedProp = priorityProposals.find(p => p.id === s.proposal_id);
          if (matchedProp) {
            s.proposal = {
              ...s.proposal,
              prioritas: matchedProp.prioritas,
              presentase_total: matchedProp.presentase_total
            };
          } else if (s.proposal) {
            // Just ensure it doesn't render an array as a string
            s.proposal.prioritas = null;
          }
        }
        return s;
      });
      
      // Find unassigned
      const unassigned = priorityProposals.filter(p => !schedules.some(s => s.proposal_id === p.id));
      const unassignedSchedules = unassigned.map(p => ({
        id: `temp-${p.id}`,
        isTemp: true,
        tahun,
        proposal_id: p.id,
        equipment_id: null,
        nama_desa: p.desa,
        kecamatan: p.kecamatan,
        proposal: p,
        status: 'estimasi_rencana'
      }));
      
      setData([...schedules, ...unassignedSchedules]);
      setEquipments(eqJson || []);
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [tahun, role]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateScheduleWeeks = async (id, startWeek, endWeek) => {
    // startWeek and endWeek are 0-indexed (0 to 47)
    setSaving(true);
    
    // Auto-adjust visually (optimistic)
    const newData = [...data];
    const idx = newData.findIndex(d => d.id === id);
    if (idx > -1) {
      newData[idx] = { 
        ...newData[idx], 
        minggu_mulai: Math.min(startWeek, endWeek) + 1, // 1-indexed for DB
        minggu_selesai: Math.max(startWeek, endWeek) + 1,
        durasi_rencana_minggu: Math.abs(endWeek - startWeek) + 1
      };
      setData(newData);
    }

    try {
      if (id.startsWith('temp-')) {
        // Find temp item
        const item = data.find(d => d.id === id);
        const res = await fetch('/api/proposal/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            tahun: item.tahun,
            proposal_id: item.proposal_id,
            nama_desa: item.nama_desa || '',
            kecamatan: item.kecamatan || '',
            minggu_mulai: Math.min(startWeek, endWeek) + 1,
            minggu_selesai: Math.max(startWeek, endWeek) + 1,
            durasi_rencana_minggu: Math.abs(endWeek - startWeek) + 1,
            created_by_role: role
          }),
        });
        const saved = await res.json();
        if (saved && saved.id) {
           setData(prev => prev.map(d => d.id === id ? { ...d, ...saved, isTemp: false, proposal: item.proposal } : d));
        }
      } else {
        await fetch('/api/proposal/schedule', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            id, 
            minggu_mulai: Math.min(startWeek, endWeek) + 1,
            minggu_selesai: Math.max(startWeek, endWeek) + 1,
            durasi_rencana_minggu: Math.abs(endWeek - startWeek) + 1
          }),
        });
      }
    } catch (e) {
      alert('Gagal update jadwal');
      fetchData(); // revert
    } finally {
      setSaving(false);
    }
  };

  const updateEquipment = async (id, newEqId) => {
    setSaving(true);
    try {
      if (id.startsWith('temp-')) {
        const item = data.find(d => d.id === id);
        const res = await fetch('/api/proposal/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            tahun: item.tahun,
            proposal_id: item.proposal_id,
            equipment_id: newEqId || null,
            nama_desa: item.nama_desa || '',
            kecamatan: item.kecamatan || '',
            created_by_role: role
          }),
        });
        const saved = await res.json();
        if (saved && saved.id) {
           setData(prev => prev.map(d => d.id === id ? { ...d, ...saved, isTemp: false, proposal: item.proposal } : d));
        }
      } else {
        setData(prev => prev.map(d => d.id === id ? { ...d, equipment_id: newEqId || null } : d));
        await fetch('/api/proposal/schedule', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, equipment_id: newEqId || null }),
        });
      }
    } catch (e) {
      alert('Gagal ubah alat berat');
    } finally {
      setSaving(false);
    }
  };

  const addManualRow = () => {
    setShowManualModal(true);
  };

  const deleteRow = async (id) => {
    if (!confirm('Hapus baris ini dari jadwal?')) return;
    if (id.startsWith('temp-')) {
      // Just visually hide or do nothing since it's auto-generated from proposal, 
      // but user wants to "reject" it? Actually unassigned proposals shouldn't be deleteable from here, 
      // they have to remove the priority score. We'll just alert.
      alert('Ini adalah usulan otomatis dari Tab Prioritas. Untuk menghilangkannya, hapus nilai prioritas di Tab Prioritas.');
      return;
    }
    
    setSaving(true);
    try {
      await fetch(`/api/proposal/schedule?id=${id}`, { method: 'DELETE' });
      setData(prev => prev.filter(d => d.id !== id));
      // Re-fetch to bring back to "Unassigned" if it was linked to a proposal
      fetchData();
    } catch (e) {
      alert('Gagal menghapus jadwal');
    } finally {
      setSaving(false);
    }
  };

  // Drag logic
  const handleMouseDown = (scheduleId, weekIdx) => {
    const item = data.find(d => d.id === scheduleId);
    if (item.status === 'selesai' || item.status === 'sedang_berjalan') return; // Cannot edit active/finished
    
    setIsDragging(true);
    setDragStartInfo({ scheduleId, weekIdx });
    setDragCurrentWeek(weekIdx);
  };

  const handleMouseEnter = (scheduleId, weekIdx) => {
    if (isDragging && dragStartInfo && dragStartInfo.scheduleId === scheduleId) {
      setDragCurrentWeek(weekIdx);
    }
  };

  const handleMouseUp = (scheduleId, weekIdx) => {
    if (isDragging && dragStartInfo && dragStartInfo.scheduleId === scheduleId) {
      updateScheduleWeeks(scheduleId, dragStartInfo.weekIdx, weekIdx);
    }
    setIsDragging(false);
    setDragStartInfo(null);
    setDragCurrentWeek(null);
  };
  
  // Also stop drag if mouse leaves the table
  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragStartInfo(null);
      setDragCurrentWeek(null);
    }
  };

  // Grouping
  let groupedData = equipments.map(eq => {
    return {
      equipment: eq,
      items: data.filter(d => d.equipment_id === eq.id)
    };
  }).filter(g => g.items.length > 0);
  
  const unassignedItems = data.filter(d => !d.equipment_id);
  if (unassignedItems.length > 0) {
    groupedData.push({
      equipment: { id: 'unassigned', merk_type: 'Belum Dialokasikan Alat', nomor_lambung: '-' },
      items: unassignedItems
    });
  }

  const getCellColor = (item, weekIdx) => {
    // weekIdx is 0-indexed. DB stores 1-indexed (w)
    const w = weekIdx + 1;
    
    // If it's the item currently being dragged
    if (isDragging && dragStartInfo && dragStartInfo.scheduleId === item.id) {
       if (dragCurrentWeek !== null) {
         const minW = Math.min(dragStartInfo.weekIdx, dragCurrentWeek) + 1;
         const maxW = Math.max(dragStartInfo.weekIdx, dragCurrentWeek) + 1;
         if (w >= minW && w <= maxW) return '#fed7aa'; // Dragging preview
       }
    }

    // Determine real start/end weeks
    let realStartW = item.minggu_mulai;
    let realEndW = item.minggu_selesai;

    if (item.status === 'sedang_berjalan' || item.status === 'selesai') {
      // Find week for tanggal_mulai_real
      if (item.tanggal_mulai_real) {
        const dStart = new Date(item.tanggal_mulai_real);
        const matchStart = calendarWeeks.find(cw => dStart >= cw.startDate && dStart <= cw.endDate);
        if (matchStart) realStartW = matchStart.weekNum;
      }

      if (item.status === 'selesai' && item.tanggal_selesai_real) {
        const dEnd = new Date(item.tanggal_selesai_real);
        const matchEnd = calendarWeeks.find(cw => dEnd >= cw.startDate && dEnd <= cw.endDate);
        if (matchEnd) realEndW = matchEnd.weekNum;
      } else if (item.status === 'sedang_berjalan') {
        // extends up to current date
        const dNow = new Date();
        // If current year is different, cap it or extend it? 
        // We'll just find the week for today
        const matchNow = calendarWeeks.find(cw => dNow >= cw.startDate && dNow <= cw.endDate);
        if (matchNow) {
           realEndW = matchNow.weekNum;
        } else if (dNow.getFullYear() > y) {
           realEndW = 53; // cap at end of year
        } else {
           realEndW = 1;
        }
      }
    }

    // Is it in the real block?
    const isReal = (w >= realStartW && w <= realEndW) && (item.status === 'sedang_berjalan' || item.status === 'selesai');
    // Is it in the planned block?
    const isPlan = (w >= item.minggu_mulai && w <= item.minggu_selesai);

    if (isReal) {
      return item.status === 'selesai' ? '#cbd5e1' : '#fde047'; // Abu-abu or Kuning
    } else if (isPlan) {
      // Planned but not yet executed (or it didn't overlap actual)
      return '#fdba74'; // Orange
    }

    return 'transparent';
  };

  // Dynamic Weeks Calculation
  const y = parseInt(tahun) || new Date().getFullYear();
  const calendarWeeks = [];
  let d = new Date(y, 0, 1);
  let weekNum = 1;
  let currentMonth = 0;
  let weekInMonth = 1;
  
  while (d.getFullYear() === y) {
    if (d.getMonth() !== currentMonth) {
      currentMonth = d.getMonth();
      weekInMonth = 1;
    }
    
    const startDate = new Date(d);
    const endDate = new Date(d);
    endDate.setDate(endDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
    
    calendarWeeks.push({ weekNum, month: currentMonth, weekInMonth, startDate, endDate });
    d.setDate(d.getDate() + 7);
    weekNum++;
    weekInMonth++;
  }

  const monthsData = MONTHS.map((name, index) => {
    return {
      name,
      weeks: calendarWeeks.filter(w => w.month === index)
    };
  }).filter(m => m.weeks.length > 0);

  return (
    <div style={{ padding: 20 }}>
      {/* Legend */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 20, display: 'flex', gap: 24, fontSize: 13, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 16, height: 16, background: '#fdba74', borderRadius: 4 }}></div>
          <span><strong>Estimasi Rencana</strong> (Bisa diklik/drag)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 16, height: 16, background: '#fde047', borderRadius: 4 }}></div>
          <span><strong>Sedang Bekerja</strong> (Aktif)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 16, height: 16, background: '#cbd5e1', borderRadius: 4 }}></div>
          <span><strong>Selesai</strong> (Real)</span>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={addManualRow} disabled={saving} className="btn btn-primary btn-sm">+ Tambah Pekerjaan Manual</button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid #dde2eb', borderRadius: 8, maxHeight: 'calc(100vh - 350px)' }} onMouseLeave={handleMouseLeave}>
        {loading ? (
           <div style={{ padding: 50, textAlign: 'center' }}>Memuat jadwal...</div>
        ) : (
          <table style={{ borderCollapse: 'collapse', minWidth: 2000, userSelect: 'none' }}>
            <thead>
              {/* Bulan Row */}
              <tr>
                <th rowSpan={2} style={{ position: 'sticky', left: 0, zIndex: 10, background: '#f1f5f9', width: 250, border: '1px solid #cbd5e1', padding: '8px 12px', textAlign: 'left' }}>
                  Lokasi / Usulan
                </th>
                {monthsData.map(m => (
                  <th key={m.name} colSpan={m.weeks.length} style={{ border: '1px solid #cbd5e1', background: '#f1f5f9', padding: '6px 0', textAlign: 'center', fontSize: 12 }}>
                    {m.name}
                  </th>
                ))}
              </tr>
              {/* Minggu Row */}
              <tr>
                {calendarWeeks.map((w, i) => (
                  <th key={i} style={{ border: '1px solid #cbd5e1', background: '#f8fafc', padding: '4px 0', textAlign: 'center', fontSize: 10, width: 24, minWidth: 24 }} title={`Minggu ${w.weekNum}`}>
                    {w.weekInMonth}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupedData.map(group => (
                <React.Fragment key={group.equipment.id}>
                  {/* Group Header */}
                  <tr>
                    <td colSpan={49} style={{ background: '#1e293b', color: '#fff', padding: '8px 12px', fontSize: 13, fontWeight: 'bold' }}>
                      🚜 {group.equipment.merk_type} ({group.equipment.nomor_lambung})
                    </td>
                  </tr>
                  
                  {/* Items */}
                  {group.items.map((item, idx) => (
                    <tr key={item.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                      <td style={{ position: 'sticky', left: 0, zIndex: 5, background: idx % 2 === 0 ? '#fff' : '#f8fafc', border: '1px solid #e2e8f0', padding: '6px 12px', fontSize: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 'bold' }}>{item.nama_desa}, {item.kecamatan}</div>
                            {item.proposal?.nama_usulan && (
                              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                                {item.proposal.nama_usulan}
                                {item.proposal.prioritas && (
                                  <span style={{ marginLeft: 6, display: 'inline-block', padding: '1px 6px', borderRadius: 4, background: '#dcfce7', color: '#16a34a', fontWeight: 'bold' }}>
                                    {item.proposal.prioritas} ({item.proposal.presentase_total || item.proposal.prioritas?.skor || '-'}%)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <button onClick={() => deleteRow(item.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}>&times;</button>
                        </div>
                        
                        <div style={{ marginTop: 6 }}>
                          <select 
                            className="form-control" 
                            style={{ fontSize: 10, padding: '2px 4px', width: '100%' }}
                            value={item.equipment_id || ''}
                            onChange={(e) => updateEquipment(item.id, e.target.value)}
                          >
                            <option value="">-- Pilih Alat --</option>
                            {equipments.map(eq => (
                              <option key={eq.id} value={eq.id}>{eq.merk_type} ({eq.nomor_lambung})</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      
                      {calendarWeeks.map((w, wIdx) => {
                         const bg = getCellColor(item, wIdx);
                         const isFilled = bg !== 'transparent';
                         
                         return (
                           <td 
                             key={wIdx} 
                             style={{ 
                               border: '1px solid #e2e8f0', 
                               background: bg,
                               cursor: (item.status === 'estimasi_rencana' || !isFilled) ? 'pointer' : 'not-allowed',
                               borderRight: (w.weekInMonth === monthsData[w.month].weeks.length) ? '2px solid #cbd5e1' : '1px solid #e2e8f0'
                             }}
                             onMouseDown={() => handleMouseDown(item.id, wIdx)}
                             onMouseEnter={() => handleMouseEnter(item.id, wIdx)}
                             onMouseUp={() => handleMouseUp(item.id, wIdx)}
                             title={`Minggu ke-${w.weekInMonth} ${monthsData[w.month].name} (Minggu Total ${w.weekNum})`}
                           >
                           </td>
                         );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ManualRowModal 
        show={showManualModal}
        onClose={() => setShowManualModal(false)}
        onSaved={() => {
          fetchData(); // Refresh data to fetch new proposal and schedule
        }}
        tahun={tahun}
        role={role}
      />
    </div>
  );
}
