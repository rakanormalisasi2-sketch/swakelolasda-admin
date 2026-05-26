import { useState } from 'react';
import WILAYAH from '@/lib/wilayah';

export default function ManualRowModal({ show, onClose, onSaved, tahun, role }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nama_usulan: '',
    desa: '',
    kecamatan: ''
  });

  if (!show) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // 1. Create Proposal (auto set sudah_survey = true so it appears in Priority)
      const resProp = await fetch('/api/proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tahun,
          nama_usulan: formData.nama_usulan || 'Pekerjaan Manual (Tanpa Nama)',
          desa: formData.desa,
          kecamatan: formData.kecamatan,
          kabupaten: 'Bojonegoro',
          usulan_desa: role === 'seksi_embung' ? 'embung' : 'normalisasi',
          created_by_role: role,
          sudah_survey: true,
          tanggal_survey: new Date().toISOString().split('T')[0]
        })
      });
      const savedProp = await resProp.json();

      if (!savedProp || !savedProp.id) throw new Error('Gagal membuat proposal');

      // 2. Create Schedule Row
      await fetch('/api/proposal/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tahun,
          proposal_id: savedProp.id,
          nama_desa: formData.desa || 'Desa Manual',
          kecamatan: formData.kecamatan || '',
          status: 'estimasi_rencana',
          created_by_role: role
        })
      });

      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      alert('Gagal menambah pekerjaan manual');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h3 className="modal-title">Tambah Pekerjaan Manual</h3>
          <button onClick={onClose} className="btn-icon">&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="alert alert-info" style={{ marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: 13 }}>
              Data ini akan otomatis tercatat di <b>Tab Rekapitulasi</b> (sebagai sudah disurvey) dan <b>Tab Rencana Prioritas</b>. Anda dapat melengkapi datanya nanti.
            </p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="form-label">Nama Usulan / Pekerjaan</label>
              <input 
                type="text" 
                className="form-control" 
                value={formData.nama_usulan}
                onChange={e => handleChange('nama_usulan', e.target.value)}
                placeholder="Contoh: Normalisasi Kali X"
              />
            </div>
            
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">Kecamatan</label>
                <select 
                  className="form-control" 
                  value={formData.kecamatan}
                  onChange={e => {
                    handleChange('kecamatan', e.target.value);
                    handleChange('desa', ''); // reset desa
                  }}
                >
                  <option value="">-- Pilih --</option>
                  {Object.keys(WILAYAH).map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">Desa</label>
                {formData.kecamatan && WILAYAH[formData.kecamatan] ? (
                  <select 
                    className="form-control" 
                    value={formData.desa}
                    onChange={e => handleChange('desa', e.target.value)}
                  >
                    <option value="">-- Pilih --</option>
                    {WILAYAH[formData.kecamatan].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                ) : (
                  <input 
                    type="text" 
                    className="form-control" 
                    value={formData.desa}
                    onChange={e => handleChange('desa', e.target.value)}
                    placeholder="Pilih Kec. dulu"
                    disabled
                  />
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-outline" disabled={loading}>Batal</button>
          <button onClick={handleSave} className="btn btn-primary" disabled={loading}>
            {loading ? 'Menyimpan...' : 'Simpan & Tambahkan'}
          </button>
        </div>
      </div>
    </div>
  );
}
