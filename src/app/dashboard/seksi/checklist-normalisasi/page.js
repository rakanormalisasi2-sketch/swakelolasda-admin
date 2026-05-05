'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Download, Plus, Trash2, Printer, Save, Check, X } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export default function ChecklistNormalisasi() {
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [data, setData] = useState([]);
  const [targetTahunan, setTargetTahunan] = useState(0);
  const [targetInput, setTargetInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [tahun]);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch target
      const resTarget = await fetch(`/api/checklist-normalisasi/target?tahun=${tahun}`);
      const targetData = await resTarget.json();
      setTargetTahunan(targetData?.target_panjang_normalisasi || 0);
      setTargetInput(targetData?.target_panjang_normalisasi || 0);

      // Fetch checklist
      const resChecklist = await fetch(`/api/checklist-normalisasi?tahun=${tahun}`);
      const checklistData = await resChecklist.json();
      setData(checklistData || []);
    } catch (e) {
      console.error(e);
      alert('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }

  async function updateTarget() {
    setSaving(true);
    try {
      const val = parseFloat(targetInput) || 0;
      await fetch('/api/checklist-normalisasi/target', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tahun, target_panjang_normalisasi: val })
      });
      setTargetTahunan(val);
      alert('Target berhasil disimpan');
    } catch (e) {
      alert('Gagal menyimpan target');
    } finally {
      setSaving(false);
    }
  }

  async function addRow() {
    const newRow = {
      tahun,
      kegiatan: 'Kegiatan Baru',
      jam_total: 0,
      desa: '',
      solar: 0,
      panjang: 0,
      tanggal_mulai: null,
      tanggal_selesai: null
    };
    try {
      const res = await fetch('/api/checklist-normalisasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRow)
      });
      const saved = await res.json();
      setData([...data, saved]);
    } catch (e) {
      alert('Gagal tambah baris');
    }
  }

  async function deleteRow(id) {
    if (!confirm('Yakin hapus baris ini?')) return;
    try {
      const res = await fetch(`/api/checklist-normalisasi?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json().catch(()=>({}));
        throw new Error(errData.error || 'Gagal dari server');
      }
      setData(data.filter(d => d.id !== id));
    } catch (e) {
      alert('Gagal hapus baris: ' + e.message);
    }
  }

  async function updateCell(id, field, value) {
    // Optimistic UI update
    setData(data.map(d => d.id === id ? { ...d, [field]: value } : d));
    
    try {
      await fetch('/api/checklist-normalisasi', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, [field]: value })
      });
    } catch (e) {
      console.error('Failed to update', e);
      // rollback? (too complex for simple edit, ignore for now)
    }
  }

  const totalPanjang = data.reduce((sum, item) => sum + (Number(item.panjang) || 0), 0);
  const totalSolar = data.reduce((sum, item) => sum + (Number(item.solar) || 0), 0);
  const totalJam = data.reduce((sum, item) => sum + (Number(item.jam_total) || 0), 0);
  
  let deviasi = 0;
  let deviasiPersen = 0;
  let deviasiText = '';
  if (targetTahunan > 0) {
    deviasi = totalPanjang - targetTahunan;
    deviasiPersen = Math.abs(deviasi) / targetTahunan * 100;
    if (deviasi < 0) deviasiText = `Kurang ${Math.abs(deviasi).toLocaleString('id-ID')} m (${deviasiPersen.toFixed(1)}% dari target)`;
    else if (deviasi > 0) deviasiText = `Surplus ${deviasi.toLocaleString('id-ID')} m (+${deviasiPersen.toFixed(1)}% dari target)`;
    else deviasiText = 'Sesuai Target (100%)';
  }

  const fN = n => Number(n||0).toLocaleString('id-ID', {maximumFractionDigits: 2});

  function exportPDF() {
    const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`CHECKLIST PELAKSANAAN SWAKELOLA ALAT BERAT`, 14, 15);
    doc.text(`DINAS PU SUMBER DAYA AIR KABUPATEN BOJONEGORO`, 14, 21);
    doc.text(`TAHUN ANGGARAN ${tahun}`, 14, 27);
    
    doc.autoTable({
      startY: 35,
      head: [['No', 'Kegiatan', 'Jam', 'Desa', 'Solar(L)', 'Panjang(m)', 'Proposal', 'KAK', 'SPEK', 'RPTdB', 'Peta sit', 'LP', 'Fodok', 'Tgl Mulai', 'Tgl Selesai']],
      body: data.map((d, i) => [
        i + 1,
        d.kegiatan,
        d.jam_total,
        d.desa,
        d.solar,
        d.panjang,
        d.chk_proposal ? '✓' : '',
        d.chk_kak ? '✓' : '',
        d.chk_spek ? '✓' : '',
        d.chk_rptdb ? '✓' : '',
        d.chk_peta_sit ? '✓' : '',
        d.chk_lp ? '✓' : '',
        d.chk_fodok ? '✓' : '',
        d.tanggal_mulai ? new Date(d.tanggal_mulai).toLocaleDateString('id-ID') : '',
        d.tanggal_selesai ? new Date(d.tanggal_selesai).toLocaleDateString('id-ID') : ''
      ]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1.5, halign: 'center' },
      columnStyles: {
        1: { halign: 'left', cellWidth: 50 }
      },
      headStyles: { fillColor: [0, 52, 111], textColor: [255, 255, 255], fontStyle: 'bold' }
    });
    
    doc.save(`Checklist_Normalisasi_${tahun}.pdf`);
  }

  async function exportExcel() {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Checklist Normalisasi');
    
    ws.mergeCells('A1:O1'); ws.getCell('A1').value = `CHECKLIST PELAKSANAAN SWAKELOLA ALAT BERAT`;
    ws.mergeCells('A2:O2'); ws.getCell('A2').value = `DINAS PU SUMBER DAYA AIR KABUPATEN BOJONEGORO`;
    ws.mergeCells('A3:O3'); ws.getCell('A3').value = `TAHUN ANGGARAN ${tahun}`;
    
    ws.getCell('A1').font = { bold: true, size: 14 };
    ws.getCell('A2').font = { bold: true, size: 14 };
    ws.getCell('A3').font = { bold: true, size: 14 };
    
    const headers = ['No', 'Kegiatan', 'Jam', 'Desa', 'Solar (L)', 'Panjang (m)', 'Proposal', 'KAK', 'SPEK', 'RPTdB', 'Peta sit', 'LP', 'Fodok', 'Tgl Mulai', 'Tgl Selesai'];
    const headerRow = ws.addRow(headers);
    headerRow.eachCell(c => {
      c.font = { bold: true };
      c.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
    });
    
    data.forEach((d, i) => {
      const row = ws.addRow([
        i + 1,
        d.kegiatan,
        d.jam_total,
        d.desa,
        d.solar,
        d.panjang,
        d.chk_proposal ? 'v' : '',
        d.chk_kak ? 'v' : '',
        d.chk_spek ? 'v' : '',
        d.chk_rptdb ? 'v' : '',
        d.chk_peta_sit ? 'v' : '',
        d.chk_lp ? 'v' : '',
        d.chk_fodok ? 'v' : '',
        d.tanggal_mulai || '',
        d.tanggal_selesai || ''
      ]);
      row.eachCell(c => {
        c.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
        c.alignment = { horizontal: c.col === 2 ? 'left' : 'center', vertical: 'middle' };
      });
    });
    
    ws.columns = [
      { width: 5 }, { width: 40 }, { width: 10 }, { width: 15 }, { width: 10 }, { width: 15 },
      { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 },
      { width: 15 }, { width: 15 }
    ];
    
    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Checklist_Normalisasi_${tahun}.xlsx`);
  }

  const Th = ({ children, w }) => <th style={{ padding:'12px 8px', border:'1px solid #c2c6d3', background:'#f8f9ff', color:'#00346f', fontSize:12, fontWeight:600, textAlign:'center', width: w }}>{children}</th>;
  const Td = ({ children, align='center' }) => <td style={{ padding:'8px', border:'1px solid #c2c6d3', textAlign: align, fontSize:12 }}>{children}</td>;
  
  const TdEdit = ({ val, type='text', onChange, align='center' }) => (
    <td style={{ padding:0, border:'1px solid #c2c6d3' }}>
      <input type={type} value={val||''} onChange={e => onChange(e.target.value)} 
        style={{ width:'100%', height:'100%', padding:'8px', border:'none', background:'transparent', textAlign: align, outline:'none', fontSize:12 }} />
    </td>
  );

  const TdCheck = ({ val, onChange }) => (
    <Td>
      <input type="checkbox" checked={!!val} onChange={e => onChange(e.target.checked)} style={{ cursor: 'pointer', width: 16, height: 16, accentColor: '#00346f' }} />
    </Td>
  );

  return (
    <>
      <div className="header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div className="header-title">Checklist Swakelola Normalisasi</div>
          <div className="header-subtitle">Rekapitulasi pelaksanaan kegiatan swakelola normalisasi</div>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ display:'flex', flexDirection:'column' }}>
            <label style={{ fontSize:10, fontWeight:'bold', color:'#64748b', marginBottom:4 }}>TAHUN</label>
            <select value={tahun} onChange={e => setTahun(Number(e.target.value))} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #c2c6d3', outline:'none', fontWeight:'bold' }}>
              {[2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div style={{ display:'flex', flexDirection:'column' }}>
            <label style={{ fontSize:10, fontWeight:'bold', color:'#64748b', marginBottom:4 }}>TARGET TAHUNAN (METER)</label>
            <div style={{ display:'flex' }}>
              <input type="number" value={targetInput} onChange={e => setTargetInput(e.target.value)} style={{ padding:'8px 12px', border:'1px solid #c2c6d3', borderRadius:'8px 0 0 8px', outline:'none', width: 120 }} />
              <button onClick={updateTarget} disabled={saving} style={{ padding:'8px 16px', border:'none', background:'#00346f', color:'white', borderRadius:'0 8px 8px 0', cursor:'pointer', fontWeight:'bold', fontSize:12 }}>
                {saving ? '...' : 'SIMPAN'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 16 }}>
            <button onClick={addRow} style={{ padding: '8px 16px', borderRadius: 8, background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', gap: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              <Plus size={16} /> Tambah Data
            </button>
            <div style={{ display:'flex', gap: 8 }}>
              <button onClick={exportPDF} style={{ padding: '8px 16px', borderRadius: 8, background: '#ef4444', color: 'white', display: 'flex', alignItems: 'center', gap: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                <Printer size={16} /> Unduh PDF
              </button>
              <button onClick={exportExcel} style={{ padding: '8px 16px', borderRadius: 8, background: '#0ea5e9', color: 'white', display: 'flex', alignItems: 'center', gap: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                <Download size={16} /> Unduh XLSX
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #c2c6d3', borderRadius: 8 }}>
            {loading ? <div style={{ padding: 40, textAlign: 'center' }}>Memuat...</div> : (
              <table style={{ width: '100%', minWidth: 1400, borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <Th w={40}>No</Th>
                    <Th w={250}>Kegiatan</Th>
                    <Th w={60}>Jam</Th>
                    <Th w={120}>Desa</Th>
                    <Th w={80}>Solar (L)</Th>
                    <Th w={80}>Panjang (m)</Th>
                    <Th w={60}>Proposal</Th>
                    <Th w={60}>KAK</Th>
                    <Th w={60}>SPEK</Th>
                    <Th w={60}>RPTdB</Th>
                    <Th w={60}>Peta sit</Th>
                    <Th w={60}>LP</Th>
                    <Th w={60}>Fodok</Th>
                    <Th w={120}>Tgl Mulai</Th>
                    <Th w={120}>Tgl Selesai</Th>
                    <Th w={40}></Th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 && (
                    <tr><td colSpan={16} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>Belum ada data checklist untuk tahun {tahun}</td></tr>
                  )}
                  {data.map((row, i) => (
                    <tr key={row.id} style={{ transition: 'background 0.2s' }}>
                      <Td>{i + 1}</Td>
                      <TdEdit val={row.kegiatan} onChange={v => updateCell(row.id, 'kegiatan', v)} align="left" />
                      <TdEdit val={row.jam_total} type="number" onChange={v => updateCell(row.id, 'jam_total', v)} />
                      <TdEdit val={row.desa} onChange={v => updateCell(row.id, 'desa', v)} />
                      <TdEdit val={row.solar} type="number" onChange={v => updateCell(row.id, 'solar', v)} />
                      <TdEdit val={row.panjang} type="number" onChange={v => updateCell(row.id, 'panjang', v)} />
                      
                      <TdCheck val={row.chk_proposal} onChange={v => updateCell(row.id, 'chk_proposal', v)} />
                      <TdCheck val={row.chk_kak} onChange={v => updateCell(row.id, 'chk_kak', v)} />
                      <TdCheck val={row.chk_spek} onChange={v => updateCell(row.id, 'chk_spek', v)} />
                      <TdCheck val={row.chk_rptdb} onChange={v => updateCell(row.id, 'chk_rptdb', v)} />
                      <TdCheck val={row.chk_peta_sit} onChange={v => updateCell(row.id, 'chk_peta_sit', v)} />
                      <TdCheck val={row.chk_lp} onChange={v => updateCell(row.id, 'chk_lp', v)} />
                      <TdCheck val={row.chk_fodok} onChange={v => updateCell(row.id, 'chk_fodok', v)} />
                      
                      <TdEdit val={row.tanggal_mulai ? new Date(row.tanggal_mulai).toISOString().split('T')[0] : ''} type="date" onChange={v => updateCell(row.id, 'tanggal_mulai', v)} />
                      <TdEdit val={row.tanggal_selesai ? new Date(row.tanggal_selesai).toISOString().split('T')[0] : ''} type="date" onChange={v => updateCell(row.id, 'tanggal_selesai', v)} />
                      
                      <td style={{ padding:'8px', border:'1px solid #c2c6d3', textAlign: 'center' }}>
                        <button onClick={() => deleteRow(row.id)} style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }} title="Hapus baris">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
          {/* Summary / Deviasi Footer */}
          {!loading && (
            <div style={{ marginTop: 24, padding: 20, background: '#f8f9ff', border: '1px solid #c2c6d3', borderRadius: 8, display: 'flex', gap: 40, flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: 11, color: '#64748b', fontWeight: 'bold', marginBottom: 4 }}>TOTAL PANJANG PEKERJAAN</p>
                <p style={{ fontSize: 24, color: '#0b1c30', fontWeight: 900 }}>{fN(totalPanjang)} <span style={{ fontSize: 14, fontWeight: 'normal' }}>meter</span></p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#64748b', fontWeight: 'bold', marginBottom: 4 }}>TARGET TAHUN {tahun}</p>
                <p style={{ fontSize: 24, color: '#0b1c30', fontWeight: 900 }}>{fN(targetTahunan)} <span style={{ fontSize: 14, fontWeight: 'normal' }}>meter</span></p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#64748b', fontWeight: 'bold', marginBottom: 4 }}>DEVIASI TARGET</p>
                <p style={{ fontSize: 18, color: deviasi < 0 ? '#ef4444' : (deviasi > 0 ? '#10b981' : '#0ea5e9'), fontWeight: 'bold', marginTop: 4 }}>
                  {targetTahunan > 0 ? deviasiText : 'Target belum diisi'}
                </p>
              </div>
              <div style={{ borderLeft: '1px solid #c2c6d3', paddingLeft: 40 }}>
                <p style={{ fontSize: 11, color: '#64748b', fontWeight: 'bold', marginBottom: 4 }}>TOTAL SOLAR</p>
                <p style={{ fontSize: 20, color: '#0b1c30', fontWeight: 900 }}>{fN(totalSolar)} <span style={{ fontSize: 14, fontWeight: 'normal' }}>Liter</span></p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#64748b', fontWeight: 'bold', marginBottom: 4 }}>JUMLAH LOKASI</p>
                <p style={{ fontSize: 20, color: '#0b1c30', fontWeight: 900 }}>{data.length} <span style={{ fontSize: 14, fontWeight: 'normal' }}>lokasi</span></p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
