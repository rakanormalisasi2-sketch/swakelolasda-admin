'use client';
import React, { useState, useEffect, useCallback } from 'react';

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch schedules
      const res = await fetch(`/api/proposal/schedule?tahun=${tahun}&role=${role}`);
      const json = await res.json();
      
      // We also need all heavy equipments to group by
      const eqRes = await fetch(`/api/heavy-equipment`); // Assuming this exists or we can extract from data
      const eqJson = await eqRes.json();
      
      setData(json || []);
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
    } catch (e) {
      alert('Gagal update jadwal');
      fetchData(); // revert
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
  };

  const handleMouseEnter = (scheduleId, weekIdx) => {
    if (isDragging && dragStartInfo && dragStartInfo.scheduleId === scheduleId) {
      // Just visually update the range during drag (handled by render)
    }
  };

  const handleMouseUp = (scheduleId, weekIdx) => {
    if (isDragging && dragStartInfo && dragStartInfo.scheduleId === scheduleId) {
      updateScheduleWeeks(scheduleId, dragStartInfo.weekIdx, weekIdx);
    }
    setIsDragging(false);
    setDragStartInfo(null);
  };
  
  // Also stop drag if mouse leaves the table
  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragStartInfo(null);
    }
  };

  // Grouping
  const groupedData = equipments.map(eq => {
    return {
      equipment: eq,
      items: data.filter(d => d.equipment_id === eq.id)
    };
  }).filter(g => g.items.length > 0);

  const getCellColor = (item, weekIdx) => {
    // weekIdx is 0 to 47. DB stores 1 to 48
    const w = weekIdx + 1;
    
    // If it's the item currently being dragged
    if (isDragging && dragStartInfo && dragStartInfo.scheduleId === item.id) {
       const minW = Math.min(dragStartInfo.weekIdx, weekIdx) + 1;
       const maxW = Math.max(dragStartInfo.weekIdx, weekIdx) + 1;
       if (w >= minW && w <= maxW) return '#fed7aa'; // Dragging preview
    }

    if (!item.minggu_mulai || !item.minggu_selesai) return 'transparent';

    if (w >= item.minggu_mulai && w <= item.minggu_selesai) {
      if (item.status === 'selesai') return '#cbd5e1'; // Abu-abu
      if (item.status === 'sedang_berjalan') return '#fde047'; // Kuning
      return '#fdba74'; // Orange (estimasi)
    }
    return 'transparent';
  };

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
          <button className="btn btn-primary btn-sm">+ Tambah Pekerjaan</button>
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
                {MONTHS.map(m => (
                  <th key={m} colSpan={4} style={{ border: '1px solid #cbd5e1', background: '#f1f5f9', padding: '6px 0', textAlign: 'center', fontSize: 12 }}>
                    {m}
                  </th>
                ))}
              </tr>
              {/* Minggu Row */}
              <tr>
                {Array.from({ length: 48 }).map((_, i) => (
                  <th key={i} style={{ border: '1px solid #cbd5e1', background: '#f8fafc', padding: '4px 0', textAlign: 'center', fontSize: 10, width: 24, minWidth: 24 }}>
                    {(i % 4) + 1}
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
                        <div style={{ fontWeight: 'bold' }}>{item.nama_desa}, {item.kecamatan}</div>
                        {item.proposal?.nama_usulan && <div style={{ fontSize: 10, color: '#64748b' }}>{item.proposal.nama_usulan}</div>}
                      </td>
                      
                      {Array.from({ length: 48 }).map((_, wIdx) => {
                         const bg = getCellColor(item, wIdx);
                         const isFilled = bg !== 'transparent';
                         
                         return (
                           <td 
                             key={wIdx} 
                             style={{ 
                               border: '1px solid #e2e8f0', 
                               background: bg,
                               cursor: (item.status === 'estimasi_rencana' || !isFilled) ? 'pointer' : 'not-allowed',
                               borderRight: ((wIdx + 1) % 4 === 0) ? '2px solid #cbd5e1' : '1px solid #e2e8f0'
                             }}
                             onMouseDown={() => handleMouseDown(item.id, wIdx)}
                             onMouseEnter={() => handleMouseEnter(item.id, wIdx)}
                             onMouseUp={() => handleMouseUp(item.id, wIdx)}
                             title={`Minggu ${(wIdx % 4) + 1} ${MONTHS[Math.floor(wIdx/4)]}`}
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
    </div>
  );
}
