'use client';
import React, { useState, useEffect } from 'react';
import imageCompression from 'browser-image-compression';

function extractDriveId(url) {
  if (!url) return null;
  const m = url.match(/\/d\/([a-zA-Z0-9_-]{25,})/)
    || url.match(/id=([a-zA-Z0-9_-]{25,})/);
  return m ? m[1] : null;
}

function toImg(url) {
  if (!url) return null;
  const id = extractDriveId(url.trim());
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w800` : url.trim();
}

function toView(url) {
  if (!url) return null;
  const id = extractDriveId(url.trim());
  return id ? `https://drive.google.com/file/d/${id}/view` : url.trim();
}

export default function EditFotoModal({ log, onClose, onSave, profileRole }) {
  const [urls, setUrls] = useState([]);
  const [newUrl, setNewUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (log && log.foto_lapangan_urls) {
      const existingUrls = log.foto_lapangan_urls.split(',').map(u => u.trim()).filter(Boolean);
      setUrls(existingUrls);
    }
  }, [log]);

  const moveUp = (idx) => {
    if (idx === 0) return;
    const newArr = [...urls];
    [newArr[idx - 1], newArr[idx]] = [newArr[idx], newArr[idx - 1]];
    setUrls(newArr);
  };

  const moveDown = (idx) => {
    if (idx === urls.length - 1) return;
    const newArr = [...urls];
    [newArr[idx + 1], newArr[idx]] = [newArr[idx], newArr[idx + 1]];
    setUrls(newArr);
  };

  const removeUrl = (idx) => {
    if (!window.confirm('Hapus foto ini?')) return;
    const newArr = urls.filter((_, i) => i !== idx);
    setUrls(newArr);
  };

  const addLink = () => {
    if (!newUrl.trim()) return;
    setUrls([...urls, newUrl.trim()]);
    setNewUrl('');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      // 1. Kompresi gambar
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1280,
        useWebWorker: true
      };
      const compressedFile = await imageCompression(file, options);

      // 2. Siapkan data upload
      const formData = new FormData();
      formData.append('photo', compressedFile, compressedFile.name);
      formData.append('section_role', profileRole);
      formData.append('operator_name', log.override_operator || log.operator?.full_name || log.operator_name || 'Admin');
      formData.append('village', log.override_desa || log.assignment?.location_village || 'Unknown');
      formData.append('district', log.override_kecamatan || log.assignment?.location_district || 'Unknown');
      formData.append('date', log.tanggal || new Date().toISOString().split('T')[0]);

      // 3. Upload ke Google Drive
      const res = await fetch('/api/upload/photo', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success && data.url) {
        setUrls([...urls, data.url]);
      } else {
        alert('Gagal mengupload foto: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Terjadi kesalahan saat mengupload: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = null; // reset input
    }
  };

  const handleSave = () => {
    onSave(urls.join(','));
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(2px)' }}>
      <div style={{ background:'#fff', width:'600px', maxHeight:'90vh', borderRadius:12, display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 10px 25px rgba(0,0,0,0.4)' }}>
        <div style={{ padding:20, background:'#1e3a8a', color:'#fff', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ margin:0, display:'flex', alignItems:'center', gap:8 }}>
            <span>🖼️</span> Kelola Foto Lapangan
          </h3>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:'#fff', cursor:'pointer', fontSize:20 }}>✖</button>
        </div>
        
        <div style={{ padding:20, flex:1, overflowY:'auto', background:'#f8fafc' }}>
          <div style={{ marginBottom:20, background:'#eff6ff', padding:15, borderRadius:8, border:'1px solid #bfdbfe' }}>
            <div style={{ fontWeight:'bold', color:'#1e40af', marginBottom:10 }}>Tambah Foto Baru</div>
            <div style={{ display:'flex', gap:10, marginBottom:10 }}>
              <input 
                type="text" 
                placeholder="Paste link Google Drive / URL foto..." 
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                style={{ flex:1, padding:'8px 12px', borderRadius:6, border:'1px solid #cbd5e1', fontSize:13 }}
              />
              <button onClick={addLink} style={{ padding:'8px 16px', background:'#2563eb', color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontWeight:'bold', fontSize:13 }}>
                Tambah Link
              </button>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ fontSize:12, color:'#64748b', fontWeight:'bold' }}>ATAU</div>
              <label style={{ padding:'8px 16px', background:'#059669', color:'#fff', borderRadius:6, cursor: uploading ? 'not-allowed' : 'pointer', fontWeight:'bold', fontSize:13, display:'inline-block' }}>
                {uploading ? '⏳ Mengupload...' : '📤 Upload dari Perangkat (Otomatis Kompres)'}
                <input type="file" accept="image/*" style={{ display:'none' }} onChange={handleFileUpload} disabled={uploading} />
              </label>
            </div>
          </div>

          <div style={{ fontWeight:'bold', color:'#334155', marginBottom:12 }}>
            Susunan Foto ({urls.length})
          </div>

          {urls.length === 0 ? (
            <div style={{ padding:30, textAlign:'center', color:'#94a3b8', background:'#fff', borderRadius:8, border:'1px dashed #cbd5e1' }}>
              Belum ada foto lapangan.
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {urls.map((url, idx) => (
                <div key={idx} style={{ display:'flex', alignItems:'center', gap:12, padding:10, background:'#fff', border:'1px solid #e2e8f0', borderRadius:8, boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ width:80, height:60, borderRadius:4, overflow:'hidden', background:'#f1f5f9', flexShrink:0 }}>
                    <img src={toImg(url)} style={{ width:'100%', height:'100%', objectFit:'cover' }} 
                      onError={e => { e.target.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="60"><rect fill="%23e2e8f0" width="80" height="60"/><text x="40" y="35" font-size="10" text-anchor="middle" fill="%2394a3b8">No Preview</text></svg>`; }}
                    />
                  </div>
                  <div style={{ flex:1, overflow:'hidden' }}>
                    <div style={{ fontSize:12, fontWeight:'bold', color:'#334155', marginBottom:4 }}>Foto {idx + 1}</div>
                    <a href={toView(url)} target="_blank" rel="noreferrer" style={{ fontSize:11, color:'#2563eb', textDecoration:'none', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', display:'block' }}>
                      {url}
                    </a>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4, flexShrink:0 }}>
                    <button onClick={() => moveUp(idx)} disabled={idx === 0} style={{ padding:'2px 8px', fontSize:10, background: idx === 0 ? '#f1f5f9' : '#e0f2fe', color: idx === 0 ? '#cbd5e1' : '#0369a1', border:'none', borderRadius:4, cursor: idx === 0 ? 'not-allowed' : 'pointer' }}>
                      ▲ Naik
                    </button>
                    <button onClick={() => moveDown(idx)} disabled={idx === urls.length - 1} style={{ padding:'2px 8px', fontSize:10, background: idx === urls.length - 1 ? '#f1f5f9' : '#e0f2fe', color: idx === urls.length - 1 ? '#cbd5e1' : '#0369a1', border:'none', borderRadius:4, cursor: idx === urls.length - 1 ? 'not-allowed' : 'pointer' }}>
                      ▼ Turun
                    </button>
                  </div>
                  <div style={{ flexShrink:0, borderLeft:'1px solid #e2e8f0', paddingLeft:12 }}>
                    <button onClick={() => removeUrl(idx)} style={{ padding:'6px', background:'#fee2e2', color:'#ef4444', border:'none', borderRadius:4, cursor:'pointer' }} title="Hapus">
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding:'15px 20px', background:'#fff', borderTop:'1px solid #e2e8f0', display:'flex', justifyContent:'flex-end', gap:10 }}>
          <button onClick={onClose} style={{ padding:'8px 16px', borderRadius:6, border:'1px solid #cbd5e1', background:'#fff', color:'#475569', cursor:'pointer', fontWeight:'bold' }}>
            Batal
          </button>
          <button onClick={handleSave} style={{ padding:'8px 24px', borderRadius:6, border:'none', background:'#16a34a', color:'#fff', cursor:'pointer', fontWeight:'bold' }}>
            💾 Simpan Perubahan
          </button>
        </div>
      </div>
    </div>
  );
}
