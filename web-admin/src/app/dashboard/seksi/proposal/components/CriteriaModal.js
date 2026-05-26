import { useState, useEffect } from 'react';

export default function CriteriaModal({ show, onClose, currentCriteria, role, onSaved }) {
  const [criteriaList, setCriteriaList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show) {
      setCriteriaList(JSON.parse(JSON.stringify(currentCriteria)));
    }
  }, [show, currentCriteria]);

  if (!show) return null;

  const totalBobot = criteriaList.reduce((acc, c) => acc + Number(c.bobot || 0), 0);
  const isValid = totalBobot === 100;

  const handleUpdate = (idx, field, value) => {
    const list = [...criteriaList];
    list[idx][field] = value;
    setCriteriaList(list);
  };

  const handleUpdateOption = (cIdx, oIdx, field, value) => {
    const list = [...criteriaList];
    list[cIdx].opsi[oIdx][field] = field === 'skor' ? Number(value) : value;
    
    // Update max_skor
    list[cIdx].skor_maksimal = Math.max(...list[cIdx].opsi.map(o => o.skor || 0), 0);
    
    setCriteriaList(list);
  };

  const addOption = (cIdx) => {
    const list = [...criteriaList];
    list[cIdx].opsi.push({ label: 'Opsi Baru', skor: 1 });
    list[cIdx].skor_maksimal = Math.max(...list[cIdx].opsi.map(o => o.skor || 0), 0);
    setCriteriaList(list);
  };

  const removeOption = (cIdx, oIdx) => {
    const list = [...criteriaList];
    list[cIdx].opsi.splice(oIdx, 1);
    list[cIdx].skor_maksimal = Math.max(...list[cIdx].opsi.map(o => o.skor || 0), 0);
    setCriteriaList(list);
  };

  const addCriteria = () => {
    setCriteriaList([
      ...criteriaList,
      {
        nama_kriteria: 'Kriteria Baru',
        bobot: 0,
        skor_maksimal: 1,
        urutan: criteriaList.length + 1,
        role_scope: null,
        opsi: [{ label: 'Opsi 1', skor: 1 }],
        is_active: true,
        isNew: true
      }
    ]);
  };

  const removeCriteria = (idx) => {
    const list = [...criteriaList];
    list.splice(idx, 1);
    setCriteriaList(list);
  };

  const handleSave = async () => {
    if (totalBobot !== 100) {
      alert('Total bobot harus persis 100%!');
      return;
    }

    setLoading(true);
    try {
      // API calls
      for (const c of criteriaList) {
        if (c.isNew) {
          await fetch('/api/proposal/priority/criteria', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nama_kriteria: c.nama_kriteria,
              bobot: Number(c.bobot),
              skor_maksimal: c.skor_maksimal,
              opsi: c.opsi,
              urutan: c.urutan,
              role_scope: c.role_scope
            })
          });
        } else {
          await fetch('/api/proposal/priority/criteria', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: c.id,
              nama_kriteria: c.nama_kriteria,
              bobot: Number(c.bobot),
              skor_maksimal: c.skor_maksimal,
              opsi: c.opsi,
              urutan: c.urutan,
              role_scope: c.role_scope
            })
          });
        }
      }
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      alert('Gagal menyimpan kriteria');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 800 }}>
        <div className="modal-header">
          <h3 className="modal-title">Kelola Kriteria Prioritas</h3>
          <button onClick={onClose} className="btn-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="modal-body" style={{ background: '#f8fafc' }}>
          <div className={`alert ${isValid ? 'alert-success' : 'alert-danger'}`}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>Total Bobot Kriteria: {totalBobot}%</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Pastikan total semua kriteria aktif berjumlah 100%.</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {criteriaList.map((c, cIdx) => (
              <div key={c.id || cIdx} className="card" style={{ padding: 16, borderLeft: '3px solid var(--primary)' }}>
                <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Nama Kriteria</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={c.nama_kriteria} 
                      onChange={e => handleUpdate(cIdx, 'nama_kriteria', e.target.value)}
                    />
                  </div>
                  <div style={{ width: 100 }}>
                    <label className="form-label">Bobot (%)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={c.bobot} 
                      onChange={e => handleUpdate(cIdx, 'bobot', e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button onClick={() => removeCriteria(cIdx)} className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger-light)' }}>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>

                <div style={{ background: '#f1f5f9', padding: 12, borderRadius: 8 }}>
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    Opsi Penilaian (Max Skor: {c.skor_maksimal})
                    <button onClick={() => addOption(cIdx)} className="btn-icon" style={{ padding: 2, color: 'var(--primary)' }}>+ Tambah Opsi</button>
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {c.opsi.map((opt, oIdx) => (
                      <div key={oIdx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input 
                          type="text" 
                          className="form-control" 
                          style={{ padding: '6px 10px', fontSize: 12, flex: 1 }}
                          value={opt.label}
                          onChange={e => handleUpdateOption(cIdx, oIdx, 'label', e.target.value)}
                        />
                        <input 
                          type="number" 
                          className="form-control" 
                          style={{ padding: '6px 10px', fontSize: 12, width: 70 }}
                          value={opt.skor}
                          onChange={e => handleUpdateOption(cIdx, oIdx, 'skor', e.target.value)}
                        />
                        <button onClick={() => removeOption(cIdx, oIdx)} className="btn-icon" style={{ color: 'var(--danger)' }}>&times;</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <button onClick={addCriteria} className="btn btn-outline w-full" style={{ marginTop: 16, borderStyle: 'dashed' }}>
            + Tambah Kriteria Baru
          </button>
        </div>
        
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-outline" disabled={loading}>Batal</button>
          <button onClick={handleSave} className="btn btn-primary" disabled={loading || !isValid}>
            {loading ? 'Menyimpan...' : 'Simpan Kriteria'}
          </button>
        </div>
      </div>
    </div>
  );
}
