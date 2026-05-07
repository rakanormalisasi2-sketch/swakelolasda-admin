'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit, Check, X, Package, ArrowDownToLine, ArrowUpFromLine, Search } from 'lucide-react';

export default function GudangPage() {
  const [activeTab, setActiveTab] = useState('stok');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data states
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [requests, setRequests] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterCategoryMasuk, setFilterCategoryMasuk] = useState('');
  const [filterCategoryKeluar, setFilterCategoryKeluar] = useState('');
  const [searchTermMasuk, setSearchTermMasuk] = useState('');
  const [searchTermKeluar, setSearchTermKeluar] = useState('');

  // Modal states
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Form states
  const [itemForm, setItemForm] = useState({
    name: '', category_id: '', unit: '', current_stock: 0, min_stock: 0, description: '', sku: '', serial_number: '', photo_url: ''
  });
  const [photoFile, setPhotoFile] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, catRes, reqRes, transRes] = await Promise.all([
        fetch('/api/gudang?type=items').then(r => r.json()),
        fetch('/api/gudang?type=categories').then(r => r.json()),
        fetch('/api/gudang?type=requests').then(r => r.json()),
        fetch('/api/gudang?type=transactions').then(r => r.json()),
      ]);

      setItems(itemsRes.data || []);
      setCategories(catRes.data || []);
      setRequests(reqRes.data || []);
      setTransactions(transRes.data || []);
    } catch (e) {
      console.error('Gagal memuat data gudang:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Filtered items
  const filteredItems = items.filter(item => {
    const matchSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = !filterCategory || item.category_id === filterCategory;
    return matchSearch && matchCategory;
  });

  // Filtered transactions with category
  const filteredMasuk = transactions.filter(t => {
    if (t.transaction_type !== 'masuk') return false;
    if (filterCategoryMasuk && t.item?.category_id !== filterCategoryMasuk) return false;
    if (searchTermMasuk && !t.item?.name?.toLowerCase().includes(searchTermMasuk.toLowerCase())) return false;
    return true;
  });

  const filteredKeluar = transactions.filter(t => {
    if (t.transaction_type !== 'keluar') return false;
    if (filterCategoryKeluar && t.item?.category_id !== filterCategoryKeluar) return false;
    if (searchTermKeluar && !t.item?.name?.toLowerCase().includes(searchTermKeluar.toLowerCase())) return false;
    return true;
  });

  // Pending requests count
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  // ============ ITEM CRUD ============
  const openAddItem = () => {
    setEditingItem(null);
    setItemForm({ name: '', category_id: '', unit: '', current_stock: 0, min_stock: 0, description: '', sku: '', serial_number: '', photo_url: '' });
    setPhotoFile(null);
    setShowItemModal(true);
  };

  const openEditItem = (item) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      category_id: item.category_id || '',
      unit: item.unit,
      current_stock: item.current_stock || 0,
      min_stock: item.min_stock || 0,
      description: item.description || '',
      sku: item.sku || '',
      serial_number: item.serial_number || '',
      photo_url: item.photo_url || ''
    });
    setPhotoFile(null);
    setShowItemModal(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let finalPhotoUrl = itemForm.photo_url;
      
      if (photoFile) {
        const formData = new FormData();
        formData.append('photo', photoFile);
        formData.append('upload_type', 'gudang');
        formData.append('transaction_type', 'master_stok');
        formData.append('category_name', categories.find(c => c.id === itemForm.category_id)?.name || 'Lainnya');
        formData.append('item_name', itemForm.name);

        const uploadRes = await fetch('/api/upload/photo', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          finalPhotoUrl = uploadData.url;
        } else {
          alert('Gagal upload foto: ' + uploadData.error);
          setSaving(false);
          return;
        }
      }

      const payload = { ...itemForm, photo_url: finalPhotoUrl, current_stock: parseFloat(itemForm.current_stock) || 0, min_stock: parseFloat(itemForm.min_stock) || 0 };
      const res = editingItem
        ? await fetch('/api/gudang', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update_item', id: editingItem.id, ...payload })
          })
        : await fetch('/api/gudang', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create_item', ...payload })
          });

      if (res.ok) {
        setShowItemModal(false);
        loadData();
      } else {
        const err = await res.json();
        alert('Gagal: ' + err.error);
      }
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id) => {
    if (!confirm('Hapus barang ini?')) return;
    await fetch(`/api/gudang?type=item&id=${id}`, { method: 'DELETE' });
    loadData();
  };

  // ============ CATEGORY CRUD ============
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/gudang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_category', name: newCategoryName })
      });
      if (res.ok) {
        setNewCategoryName('');
        setShowCategoryModal(false);
        loadData();
      }
    } finally {
      setSaving(false);
    }
  };

  // ============ REQUEST HANDLING ============
  const handleApprove = async (request) => {
    if (!confirm(`Setujui permintaan ${request.requested_by}?`)) return;
    setSaving(true);
    try {
      await fetch('/api/gudang', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_request',
          id: request.id,
          approved_qty: request.requested_qty,
          approved_by: 'Admin Gudang'
        })
      });
      loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async (request) => {
    const notes = prompt('Alasan penolakan (opsional):') || '';
    setSaving(true);
    try {
      await fetch('/api/gudang', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject_request', id: request.id, notes })
      });
      loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleFulfill = async (request) => {
    if (!confirm(`Serahkan barang ke ${request.requested_by}? Stok akan dikurangi.`)) return;
    setSaving(true);
    try {
      await fetch('/api/gudang', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fulfill_request', id: request.id, fulfilled_by: 'Admin Gudang' })
      });
      loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleEditTransaction = async (trans) => {
    const newNotes = prompt('Edit keterangan:', trans.notes || '');
    if (newNotes === null) return;
    setSaving(true);
    try {
      await fetch('/api/gudang', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_transaction', id: trans.id, notes: newNotes })
      });
      loadData();
    } finally {
      setSaving(false);
    }
  };

  // ============ STOCK ADJUSTMENT ============
  const handleStockAdjustment = async (item, newStock) => {
    if (!confirm(`Update stok ${item.name} menjadi ${newStock}?`)) return;
    setSaving(true);
    try {
      // Create adjustment transaction
      await fetch('/api/gudang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_transaction',
          item_id: item.id,
          transaction_type: 'adjustment',
          qty: newStock,
          qty_after: newStock,
          notes: `Manual adjustment dari ${item.current_stock} ke ${newStock}`,
          created_by: 'Admin Gudang'
        })
      });
      loadData();
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'background:#fef3c7;color:#92400e',
      approved: 'background:#dbeafe;color:#1e40af',
      rejected: 'background:#fee2e2;color:#991b1b',
      fulfilled: 'background:#d1fae5;color:#065f46',
      cancelled: 'background:#f3f4f6;color:#6b7280'
    };
    const labels = {
      pending: 'Menunggu',
      approved: 'Disetujui',
      rejected: 'Ditolak',
      fulfilled: 'Selesai',
      cancelled: 'Batal'
    };
    return <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, ...styles[status] }}>{labels[status]}</span>;
  };

  return (
    <>
      <div className="header">
        <div>
          <div className="header-title">Sistem Pengelolaan Gudang</div>
          <div className="header-subtitle">Kelola stok barang, persetujuan permintaan, dan histori transaksi</div>
        </div>
        <div className="header-right" style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={() => setShowCategoryModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> Kategori Baru
          </button>
          <button className="btn btn-primary" onClick={openAddItem} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> Barang Baru
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e2e8f0', paddingBottom: 0 }}>
          <button onClick={() => setActiveTab('stok')} style={{
            padding: '12px 20px', background: 'transparent', border: 'none', borderBottom: activeTab === 'stok' ? '2px solid #2563eb' : '2px solid transparent',
            color: activeTab === 'stok' ? '#2563eb' : '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6
          }}>
            <Package size={18} /> Master Stok ({items.length})
          </button>
          <button onClick={() => setActiveTab('approval')} style={{
            padding: '12px 20px', background: 'transparent', border: 'none', borderBottom: activeTab === 'approval' ? '2px solid #2563eb' : '2px solid transparent',
            color: activeTab === 'approval' ? '#2563eb' : '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6
          }}>
            <Check size={18} /> Approval {pendingCount > 0 && <span style={{ background: '#dc2626', color: 'white', borderRadius: 10, padding: '0 6px', fontSize: 11 }}>{pendingCount}</span>}
          </button>
          <button onClick={() => setActiveTab('masuk')} style={{
            padding: '12px 20px', background: 'transparent', border: 'none', borderBottom: activeTab === 'masuk' ? '2px solid #2563eb' : '2px solid transparent',
            color: activeTab === 'masuk' ? '#2563eb' : '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6
          }}>
            <ArrowDownToLine size={18} /> Barang Masuk ({filteredMasuk.length})
          </button>
          <button onClick={() => setActiveTab('keluar')} style={{
            padding: '12px 20px', background: 'transparent', border: 'none', borderBottom: activeTab === 'keluar' ? '2px solid #2563eb' : '2px solid transparent',
            color: activeTab === 'keluar' ? '#2563eb' : '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6
          }}>
            <ArrowUpFromLine size={18} /> Barang Keluar ({filteredKeluar.length})
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>Memuat data gudang...</div>
        ) : (
          <>
            {/* =============== MASTER STOK =============== */}
            {activeTab === 'stok' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Low Stock Alerts */}
                {(() => {
                  const lowStockItems = items.filter(i => i.current_stock <= i.min_stock);
                  if (lowStockItems.length === 0) return null;
                  return (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 16 }}>
                      <h4 style={{ margin: '0 0 12px 0', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 8 }}>
                        ⚠️ Peringatan Stok Menipis ({lowStockItems.length} Barang)
                      </h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {lowStockItems.map(item => (
                          <div key={item.id} style={{ background: '#fff', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: 8, fontSize: 13, color: '#991b1b', display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ fontWeight: 600 }}>{item.name}</span>
                            <span style={{ background: '#fee2e2', padding: '2px 6px', borderRadius: 4, fontWeight: 'bold' }}>{item.current_stock} / {item.min_stock} {item.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

              <div className="card" style={{ padding: 0 }}>
                {/* Search & Filter */}
                <div style={{ padding: 16, borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input type="text" placeholder="Cari barang..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px 8px 36px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14 }} />
                  </div>
                  <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14 }}>
                    <option value="">Semua Kategori</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {/* Catalog Grid */}
                <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, background: '#f8fafc' }}>
                  {filteredItems.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: '#64748b', background: '#fff', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                      Belum ada barang. Klik "Barang Baru" untuk menambahkan.
                    </div>
                  ) : filteredItems.map(item => (
                    <div key={item.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      {/* Thumbnail */}
                      <div style={{ height: 160, background: '#f1f5f9', position: 'relative', borderBottom: '1px solid #e2e8f0' }}>
                        {item.photo_url ? (
                          <img src={item.photo_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                            <Package size={48} opacity={0.2} />
                          </div>
                        )}
                        <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.9)', padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, color: '#475569', backdropFilter: 'blur(4px)' }}>
                          {item.category?.name || 'Tanpa Kategori'}
                        </div>
                      </div>
                      
                      {/* Info */}
                      <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 16, marginBottom: 4 }}>{item.name}</div>
                        
                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                          {item.sku && <span style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>SKU: {item.sku}</span>}
                          {item.serial_number && <span style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: 4 }}>SN: {item.serial_number}</span>}
                        </div>

                        {item.description && <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16, flex: 1 }}>{item.description}</div>}
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto', paddingTop: 12, borderTop: '1px dashed #e2e8f0' }}>
                          <div>
                            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Stok Saat Ini</div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: item.current_stock <= item.min_stock ? '#dc2626' : '#059669', lineHeight: 1 }}>
                              {item.current_stock} <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>{item.unit}</span>
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => {
                                const newStock = prompt(`Update stok ${item.name} (saat ini: ${item.current_stock}):`, item.current_stock);
                                if (newStock && !isNaN(newStock)) handleStockAdjustment(item, parseFloat(newStock));
                              }} style={{ background: '#fef3c7', border: 'none', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#92400e' }} title="Adjust Stok">📦</button>
                            <button onClick={() => openEditItem(item)} style={{ background: '#dbeafe', border: 'none', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e40af' }} title="Edit"><Edit size={14} /></button>
                            <button onClick={() => handleDeleteItem(item.id)} style={{ background: '#fee2e2', border: 'none', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }} title="Hapus"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              </div>
            )}

            {/* =============== APPROVAL =============== */}
            {activeTab === 'approval' && (
              <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: 16, borderBottom: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: 0, fontSize: 16, color: '#1e293b' }}>Permintaan Barang</h3>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Setujui atau tolak permintaan barang dari Operator dan Mekanik</p>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f8fafc' }}>
                      <tr>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e2e8f0' }}>Tanggal</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e2e8f0' }}>Peminta</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e2e8f0' }}>Barang</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Jumlah</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.length === 0 ? (
                        <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Belum ada permintaan barang.</td></tr>
                      ) : requests.map(req => (
                        <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                            {new Date(req.created_at).toLocaleDateString('id-ID')}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 600 }}>{req.requested_by || '-'}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{req.requester_role} {req.equipment_name ? `- ${req.equipment_name}` : ''}</div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>{req.item?.name || '-'}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>{req.requested_qty} {req.item?.unit}</td>
                          <td style={{ padding: '12px 16px' }}>{getStatusBadge(req.status)}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            {req.status === 'pending' && (
                              <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                <button onClick={() => handleApprove(req)} style={{ background: '#10b981', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', color: 'white', fontSize: 12 }}>✓ Setuju</button>
                                <button onClick={() => handleReject(req)} style={{ background: '#dc2626', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', color: 'white', fontSize: 12 }}>✕ Tolak</button>
                              </div>
                            )}
                            {req.status === 'approved' && (
                              <button onClick={() => handleFulfill(req)} style={{ background: '#2563eb', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', color: 'white', fontSize: 12 }}>📦 Serahkan</button>
                            )}
                            {(req.status === 'fulfilled' || req.status === 'rejected') && <span style={{ color: '#64748b', fontSize: 12 }}>-</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* =============== BARANG MASUK =============== */}
            {activeTab === 'masuk' && (
              <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: 16, borderBottom: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: 0, fontSize: 16, color: '#1e293b' }}>Histori Barang Masuk</h3>
                </div>
                {/* Search & Filter */}
                <div style={{ padding: 16, borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 12, flexWrap: 'wrap', background: '#f8fafc' }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input type="text" placeholder="Cari barang masuk..." value={searchTermMasuk} onChange={e => setSearchTermMasuk(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px 8px 36px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14 }} />
                  </div>
                  <select value={filterCategoryMasuk} onChange={e => setFilterCategoryMasuk(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14 }}>
                    <option value="">Semua Kategori</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                {/* Summary by Category */}
                <div style={{ padding: '12px 16px', background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  <span style={{ fontWeight: 600, color: '#166534', fontSize: 13 }}>Summary per Kategori:</span>
                  {(() => {
                    const catSummary = {};
                    filteredMasuk.forEach(t => {
                      const catName = t.item?.category?.name || 'Lainnya';
                      if (!catSummary[catName]) catSummary[catName] = 0;
                      catSummary[catName] += t.qty;
                    });
                    return Object.entries(catSummary).map(([cat, qty]) => (
                      <span key={cat} style={{ background: '#dcfce7', padding: '4px 10px', borderRadius: 6, fontSize: 12, color: '#166534' }}>
                        {cat}: <strong>+{qty}</strong>
                      </span>
                    ));
                  })()}
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f8fafc' }}>
                      <tr>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e2e8f0' }}>Tanggal</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e2e8f0' }}>Barang</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e2e8f0' }}>Kategori</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Jumlah</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Stok Sebelum</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Stok Sesudah</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>Foto</th>
                                                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e2e8f0' }}>Keterangan</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>Aksi</th>

                      </tr>
                    </thead>
                    <tbody>
                      {filteredMasuk.length === 0 ? (
                        <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Belum ada histori barang masuk.</td></tr>
                      ) : filteredMasuk.map(trans => (
                        <tr key={trans.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>{new Date(trans.created_at).toLocaleDateString('id-ID')}</td>
                          <td style={{ padding: '12px 16px' }}>{trans.item?.name || '-'}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: 6, fontSize: 11, color: '#475569' }}>
                              {trans.item?.category?.name || '-'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#059669' }}>+ {trans.qty} {trans.item?.unit}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', color: '#64748b' }}>{trans.qty_before}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', color: '#059669' }}>{trans.qty_after}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            {trans.photo_url ? (
                              <a href={trans.photo_url.replace('&sz=w800', '')} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'none', display: 'flex', justifyContent: 'center' }}>
                                <img src={trans.photo_url} alt="Foto" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0' }} />
                              </a>
                            ) : <span style={{ color: '#94a3b8', fontSize: 12 }}>-</span>}
                          </td>
                                                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>{trans.notes || '-'}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <button className="btn btn-icon" onClick={() => handleEditTransaction(trans)} title="Edit Keterangan"><Edit size={14} /></button>
                          </td>
                        </tr>

                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* =============== BARANG KELUAR =============== */}
            {activeTab === 'keluar' && (
              <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: 16, borderBottom: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: 0, fontSize: 16, color: '#1e293b' }}>Histori Barang Keluar</h3>
                </div>
                {/* Search & Filter */}
                <div style={{ padding: 16, borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 12, flexWrap: 'wrap', background: '#f8fafc' }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input type="text" placeholder="Cari barang keluar..." value={searchTermKeluar} onChange={e => setSearchTermKeluar(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px 8px 36px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14 }} />
                  </div>
                  <select value={filterCategoryKeluar} onChange={e => setFilterCategoryKeluar(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14 }}>
                    <option value="">Semua Kategori</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                {/* Summary by Category */}
                <div style={{ padding: '12px 16px', background: '#fef2f2', borderBottom: '1px solid #fecaca', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  <span style={{ fontWeight: 600, color: '#991b1b', fontSize: 13 }}>Summary per Kategori:</span>
                  {(() => {
                    const catSummary = {};
                    filteredKeluar.forEach(t => {
                      const catName = t.item?.category?.name || 'Lainnya';
                      if (!catSummary[catName]) catSummary[catName] = 0;
                      catSummary[catName] += t.qty;
                    });
                    return Object.entries(catSummary).map(([cat, qty]) => (
                      <span key={cat} style={{ background: '#fee2e2', padding: '4px 10px', borderRadius: 6, fontSize: 12, color: '#991b1b' }}>
                        {cat}: <strong>-{qty}</strong>
                      </span>
                    ));
                  })()}
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f8fafc' }}>
                      <tr>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e2e8f0' }}>Tanggal</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e2e8f0' }}>Barang</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e2e8f0' }}>Kategori</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#374351', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Jumlah</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Stok Sebelum</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Stok Sesudah</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>Foto</th>
                                                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e2e8f0' }}>Keterangan</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>Aksi</th>

                      </tr>
                    </thead>
                    <tbody>
                      {filteredKeluar.length === 0 ? (
                        <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Belum ada histori barang keluar.</td></tr>
                      ) : filteredKeluar.map(trans => (
                        <tr key={trans.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>{new Date(trans.created_at).toLocaleDateString('id-ID')}</td>
                          <td style={{ padding: '12px 16px' }}>{trans.item?.name || '-'}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: 6, fontSize: 11, color: '#475569' }}>
                              {trans.item?.category?.name || '-'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>- {trans.qty} {trans.item?.unit}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', color: '#64748b' }}>{trans.qty_before}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', color: '#dc2626' }}>{trans.qty_after}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            {trans.photo_url ? (
                              <a href={trans.photo_url.replace('&sz=w800', '')} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'none', display: 'flex', justifyContent: 'center' }}>
                                <img src={trans.photo_url} alt="Foto" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0' }} />
                              </a>
                            ) : <span style={{ color: '#94a3b8', fontSize: 12 }}>-</span>}
                          </td>
                                                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>{trans.notes || '-'}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <button className="btn btn-icon" onClick={() => handleEditTransaction(trans)} title="Edit Keterangan"><Edit size={14} /></button>
                          </td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* =============== MODAL: TAMBAH/EDIT ITEM =============== */}
      {showItemModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowItemModal(false)}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingItem ? 'Edit Barang' : 'Tambah Barang Baru'}</h3>
              <button className="btn-icon" onClick={() => setShowItemModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveItem}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nama Barang *</label>
                  <input type="text" className="form-control" required value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} placeholder="cth: Grease Stempet 60gr" />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">SKU</label>
                    <input type="text" className="form-control" value={itemForm.sku} onChange={e => setItemForm({ ...itemForm, sku: e.target.value })} placeholder="Opsional" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Serial Number</label>
                    <input type="text" className="form-control" value={itemForm.serial_number} onChange={e => setItemForm({ ...itemForm, serial_number: e.target.value })} placeholder="Opsional" />
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Kategori</label>
                    <select className="form-control" value={itemForm.category_id} onChange={e => setItemForm({ ...itemForm, category_id: e.target.value })}>
                      <option value="">- Pilih Kategori -</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit *</label>
                    <input type="text" className="form-control" required value={itemForm.unit} onChange={e => setItemForm({ ...itemForm, unit: e.target.value })} placeholder="cth: Pail, Pcs, Liter" />
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Stok Awal</label>
                    <input type="number" className="form-control" value={itemForm.current_stock} onChange={e => setItemForm({ ...itemForm, current_stock: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Min. Stok Warning</label>
                    <input type="number" className="form-control" value={itemForm.min_stock} onChange={e => setItemForm({ ...itemForm, min_stock: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Deskripsi</label>
                  <textarea className="form-control" rows={2} value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} placeholder="Keterangan tambahan (opsional)" />
                </div>
                <div className="form-group" style={{ marginTop: 12 }}>
                  <label className="form-label">Foto Katalog Barang (Opsional)</label>
                  <input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files[0])} className="form-control" style={{ padding: '8px' }} />
                  {itemForm.photo_url && !photoFile && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#2563eb' }}>
                      <a href={itemForm.photo_url} target="_blank" rel="noreferrer">Lihat foto saat ini</a>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowItemModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =============== MODAL: TAMBAH KATEGORI =============== */}
      {showCategoryModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCategoryModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3 className="modal-title">Tambah Kategori Baru</h3>
              <button className="btn-icon" onClick={() => setShowCategoryModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddCategory}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nama Kategori *</label>
                  <input type="text" className="form-control" required value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="cth: Sparepart, Barang Habis Pakai" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowCategoryModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}