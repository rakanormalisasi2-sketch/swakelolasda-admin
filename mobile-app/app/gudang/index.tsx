import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  StatusBar, FlatList, Alert, ActivityIndicator, RefreshControl,
  TextInput, ScrollView, Modal, Platform, Image, TouchableWithoutFeedback
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabaseWarehouse } from '../../lib/supabaseWarehouse';

// Terra Design System Colors
const COLORS = {
  primary: '#4a7c59',
  primaryContainer: '#78a886',
  onPrimary: '#ffffff',
  background: '#faf6f0',
  surface: '#ffffff',
  surfaceContainer: '#f0ece4',
  textMain: '#2e3230',
  textVariant: '#6b6358',
  tertiary: '#705c30',
  tertiaryContainer: '#c4a66a',
  error: '#b83230',
  errorContainer: '#ffdad8',
  border: '#e4e0d8',
};

export default function GudangIndexScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [laporanTab, setLaporanTab] = useState<'masuk' | 'keluar'>('masuk');
  
  // Data
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  
  // UI States
  const [search, setSearch] = useState('');
  const [laporanSearch, setLaporanSearch] = useState('');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  
  // Modals
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustType, setAdjustType] = useState<'masuk' | 'keluar'>('masuk');
  const [isNewItem, setIsNewItem] = useState(false);
  const [adjustItem, setAdjustItem] = useState<any>(null); // For existing item
  
  // Form New Item
  const [newItemForm, setNewItemForm] = useState({
    name: '', category_id: '', unit: '', min_stock: ''
  });
  
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjustPhoto, setAdjustPhoto] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  // Edit Report Modal
  const [showEditReportModal, setShowEditReportModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const session = await AsyncStorage.getItem('apk_session');
      if (!session || JSON.parse(session).role !== 'gudang') {
        router.replace('/admin/index');
        return;
      }

      const [resCat, resItems, resReq, resTrans] = await Promise.all([
        supabaseWarehouse.from('warehouse_categories').select('*').order('name'),
        supabaseWarehouse.from('warehouse_items').select('*, category:warehouse_categories(name)').order('name'),
        supabaseWarehouse.from('warehouse_requests').select('*, item:warehouse_items(name, unit)').order('created_at', { ascending: false }),
        supabaseWarehouse.from('warehouse_transactions').select('*, item:warehouse_items(name, unit, category:warehouse_categories(name))').order('created_at', { ascending: false }),
      ]);

      if (resCat.data) setCategories(resCat.data);
      if (resItems.data) setItems(resItems.data);
      if (resReq.data) setRequests(resReq.data);
      if (resTrans.data) setTransactions(resTrans.data);
    } catch (e) {
      console.error('Load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Yakin keluar?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('apk_session');
          router.replace('/admin/index');
        },
      },
    ]);
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    setLoading(true);
    const { error } = await supabaseWarehouse.from('warehouse_categories').insert({ name: newCatName });
    if (!error) {
      setNewCatName('');
      setShowCatModal(false);
      await loadData();
    } else {
      Alert.alert('Error', error.message);
    }
    setLoading(false);
  };

  const handleDeleteCategory = async (id: string) => {
    Alert.alert('Hapus Kategori', 'Yakin menghapus kategori ini? Barang terkait akan menjadi tanpa kategori.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: async () => {
        setLoading(true);
        const { error } = await supabaseWarehouse.from('warehouse_categories').delete().eq('id', id);
        if (!error) {
          await loadData();
        } else {
          Alert.alert('Error', error.message);
        }
        setLoading(false);
      }}
    ]);
  };

  const pickImage = async (setter: any) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      setter(result.assets[0].uri);
    }
  };

  const submitAdjustStock = async () => {
    if (!adjustQty || isNaN(Number(adjustQty)) || Number(adjustQty) <= 0) {
      Alert.alert('Error', 'Jumlah tidak valid');
      return;
    }
    if (!isNewItem && !adjustItem) {
      Alert.alert('Error', 'Pilih barang terlebih dahulu');
      return;
    }
    if (isNewItem && (!newItemForm.name || !newItemForm.unit || !newItemForm.category_id)) {
      Alert.alert('Error', 'Mohon lengkapi data barang baru');
      return;
    }

    setLoading(true);
    const qty = Number(adjustQty);
    let targetItemId = adjustItem?.id;
    let categoryName = adjustItem?.category?.name || 'Lainnya';
    let itemName = adjustItem?.name || 'Barang';

    // 1. Create New Item if requested
    if (isNewItem) {
      const { data: insertedItem, error: itemError } = await supabaseWarehouse.from('warehouse_items').insert({
        name: newItemForm.name,
        category_id: newItemForm.category_id,
        unit: newItemForm.unit,
        min_stock: Number(newItemForm.min_stock) || 0,
        current_stock: 0 // trigger will handle the addition
      }).select('*, category:warehouse_categories(name)').single();

      if (itemError) {
        Alert.alert('Error Membuat Barang', itemError.message);
        setLoading(false);
        return;
      }
      targetItemId = insertedItem.id;
      categoryName = insertedItem.category?.name || 'Lainnya';
      itemName = insertedItem.name;
    }
    
    let photo_url = null;
    
    // 2. Upload Photo
    if (adjustPhoto) {
      try {
        const manipResult = await ImageManipulator.manipulateAsync(
          adjustPhoto,
          [{ resize: { width: 1024 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );

        const formData = new FormData();
        const filename = manipResult.uri.split('/').pop() || `foto_${Date.now()}.jpg`;
        formData.append('photo', {
          uri: manipResult.uri,
          name: filename,
          type: 'image/jpeg'
        } as any);
        formData.append('upload_type', 'gudang');
        formData.append('transaction_type', adjustType);
        formData.append('category_name', categoryName);
        formData.append('item_name', itemName);

        const uploadUrl = `${process.env.EXPO_PUBLIC_WEB_ADMIN_URL}/api/upload/photo`;
        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
        });
        
        const uploadJson = await uploadRes.json();
        if (uploadJson.success) {
          photo_url = uploadJson.url;
        } else {
          Alert.alert('Gagal Upload Foto', uploadJson.error || 'Server error');
        }
      } catch (err: any) {
        Alert.alert('Warning', 'Gagal memproses/mengupload foto: ' + err.message);
      }
    }

    // 3. Handle Insertion based on adjustType and selectedRequestId
    if (adjustType === 'keluar' && !selectedRequestId) {
      // Manual Out -> Create Pending Request
      const { error } = await supabaseWarehouse.from('warehouse_requests').insert({
        request_type: 'Manual',
        item_id: targetItemId,
        requested_qty: qty,
        requested_by: 'Petugas Gudang',
        requester_role: 'gudang',
        notes: adjustNotes || `Manual request dari APK`,
        status: 'pending',
        photo_url: photo_url // Note: If the backend supports saving photo on request, else we might lose it, but it's fine for now
      });
      if (!error) {
        setShowAdjustModal(false);
        resetAdjustForm();
        await loadData();
        Alert.alert('Pending Approval', `Pengeluaran manual butuh persetujuan Admin Web.`);
      } else {
        Alert.alert('Error', error.message);
      }
    } else {
      // Masuk OR Keluar (Fulfillment)
      const { error } = await supabaseWarehouse.from('warehouse_transactions').insert({
        item_id: targetItemId,
        transaction_type: adjustType,
        qty: qty,
        notes: adjustNotes || `Input via APK`,
        created_by: 'Petugas Gudang (APK)',
        photo_url: photo_url,
        reference_id: selectedRequestId || null
      });

      if (!error) {
        if (selectedRequestId) {
           await supabaseWarehouse.from('warehouse_requests').update({ status: 'fulfilled' }).eq('id', selectedRequestId);
        }
        setShowAdjustModal(false);
        resetAdjustForm();
        await loadData();
        Alert.alert('Sukses', `Laporan ${adjustType} berhasil disimpan!`);
      } else {
        Alert.alert('Error', error.message);
      }
    }
    setLoading(false);
  };

  const resetAdjustForm = () => {
    setAdjustQty('');
    setAdjustNotes('');
    setAdjustPhoto(null);
    setNewItemForm({ name: '', category_id: '', unit: '', min_stock: '' });
    setAdjustItem(null);
    setSelectedRequestId(null);
  };

  const submitEditReport = async () => {
    setLoading(true);
    let new_photo_url = editingTransaction.photo_url;
    
    if (adjustPhoto && adjustPhoto !== editingTransaction.photo_url) {
      try {
        const manipResult = await ImageManipulator.manipulateAsync(
          adjustPhoto,
          [{ resize: { width: 1024 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );

        const formData = new FormData();
        const filename = manipResult.uri.split('/').pop() || `foto_${Date.now()}.jpg`;
        formData.append('photo', {
          uri: manipResult.uri,
          name: filename,
          type: 'image/jpeg'
        } as any);
        formData.append('upload_type', 'gudang');
        formData.append('transaction_type', editingTransaction.transaction_type);
        formData.append('category_name', editingTransaction.item?.category?.name || 'Lainnya');
        formData.append('item_name', editingTransaction.item?.name || 'Barang');

        const uploadUrl = `${process.env.EXPO_PUBLIC_WEB_ADMIN_URL}/api/upload/photo`;
        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
        });
        
        const uploadJson = await uploadRes.json();
        if (uploadJson.success) {
          new_photo_url = uploadJson.url;
        } else {
          Alert.alert('Gagal Upload Foto', uploadJson.error || 'Server error');
        }
      } catch (err: any) {
        Alert.alert('Warning', 'Gagal memproses/mengupload foto: ' + err.message);
      }
    }

    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_WEB_ADMIN_URL}/api/gudang`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_transaction',
          id: editingTransaction.id,
          notes: adjustNotes,
          photo_url: new_photo_url
        })
      });

      if (res.ok) {
        setShowEditReportModal(false);
        setEditingTransaction(null);
        setAdjustNotes('');
        setAdjustPhoto(null);
        await loadData();
        Alert.alert('Sukses', 'Laporan berhasil diperbarui');
      } else {
        const err = await res.json();
        Alert.alert('Error', err.error || 'Gagal update');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFulfill = async (request: any) => {
    Alert.alert(
      'Serahkan Barang',
      `Serahkan barang ke ${request.requested_by}? Stok akan otomatis berkurang.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Serahkan',
          onPress: async () => {
            setLoading(true);
            const qty = request.approved_qty || request.requested_qty;
            
            // 1. Insert transaction (trigger will reduce stock)
            await supabaseWarehouse.from('warehouse_transactions').insert({
              item_id: request.item_id,
              transaction_type: 'keluar',
              qty: qty,
              reference_id: request.id,
              notes: `Fulfillment via APK`,
              created_by: 'Petugas Gudang'
            });

            // 2. Update request status
            await supabaseWarehouse.from('warehouse_requests').update({ status: 'fulfilled' }).eq('id', request.id);
            
            await loadData();
            setLoading(false);
            Alert.alert('Berhasil', 'Barang telah diserahkan');
          },
        },
      ]
    );
  };

  // Computations for Dashboard
  const alerts = items.filter(i => i.current_stock <= i.min_stock);
  const pendingRequests = requests.filter(r => r.status === 'pending');
  
  // Computations for Category Progress
  const categoryStats = categories.map(cat => {
    const catItems = items.filter(i => i.category_id === cat.id);
    const totalCurrent = catItems.reduce((acc, curr) => acc + curr.current_stock, 0);
    const totalMax = catItems.reduce((acc, curr) => acc + Math.max(curr.min_stock * 3, curr.current_stock, 10), 0);
    const percentage = totalMax > 0 ? (totalCurrent / totalMax) * 100 : 0;
    
    return { name: cat.name, percentage: Math.min(percentage, 100), count: catItems.length };
  }).filter(c => c.count > 0);

  const filteredItems = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    (i.sku && i.sku.toLowerCase().includes(search.toLowerCase())) ||
    (i.serial_number && i.serial_number.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredTransactions = transactions.filter(t => 
    t.transaction_type === laporanTab &&
    (t.item?.name?.toLowerCase().includes(laporanSearch.toLowerCase()) || 
     (t.notes && t.notes.toLowerCase().includes(laporanSearch.toLowerCase())))
  );

  const approvedRequests = requests.filter(r => r.status === 'approved');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={styles.headerTitle}>Gudang Peralatan</Text>
            <Text style={styles.headerSub}>Kelola Stok & Inventaris</Text>
          </View>
          <TouchableOpacity 
            onPress={async () => {
              Alert.alert('Keluar', 'Apakah Anda yakin ingin keluar?', [
                { text: 'Batal', style: 'cancel' },
                { text: 'Keluar', style: 'destructive', onPress: async () => {
                  await AsyncStorage.removeItem('apk_session');
                  router.replace('/admin');
                }}
              ]);
            }}
            style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8 }}
          >
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Logout 🚪</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'dashboard' && styles.tabActive]} onPress={() => setActiveTab('dashboard')}>
          <Text style={[styles.tabText, activeTab === 'dashboard' && styles.tabTextActive]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'inventory' && styles.tabActive]} onPress={() => setActiveTab('inventory')}>
          <Text style={[styles.tabText, activeTab === 'inventory' && styles.tabTextActive]}>Inventory</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'laporan' && styles.tabActive]} onPress={() => setActiveTab('laporan')}>
          <Text style={[styles.tabText, activeTab === 'laporan' && styles.tabTextActive]}>Laporan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'requests' && styles.tabActive]} onPress={() => setActiveTab('requests')}>
          <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
            Requests {pendingRequests.length > 0 ? `(${pendingRequests.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing && (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      )}

      {/* CONTENT: DASHBOARD */}
      {!loading && activeTab === 'dashboard' && (
        <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <Text style={styles.pageTitle}>Dashboard</Text>
          <Text style={styles.pageSubtitle}>Real-time status of Terra facilities.</Text>

          {alerts.length > 0 && (
            <View style={styles.widgetError}>
              <Text style={styles.widgetTitleError}>⚠️ Inventory Alerts ({alerts.length})</Text>
              {alerts.slice(0, 3).map(item => (
                <View key={item.id} style={styles.alertItem}>
                  <Text style={styles.alertItemName}>{item.name}</Text>
                  <Text style={styles.alertItemStock}>Stok: {item.current_stock} / Min: {item.min_stock}</Text>
                </View>
              ))}
              {alerts.length > 3 && <Text style={styles.alertMore}>+ {alerts.length - 3} lainnya...</Text>}
            </View>
          )}

          <Text style={[styles.pageTitle, { marginTop: 24, fontSize: 18 }]}>Stock Levels by Category</Text>
          {categoryStats.map((stat, idx) => (
            <View key={idx} style={styles.categoryCard}>
              <View style={styles.catCardHeader}>
                <Text style={styles.catCardName}>{stat.name}</Text>
                <Text style={styles.catCardPercent}>{stat.percentage.toFixed(0)}%</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${stat.percentage}%`, backgroundColor: stat.percentage < 20 ? COLORS.error : COLORS.primary }]} />
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* CONTENT: INVENTORY */}
      {!loading && activeTab === 'inventory' && (
        <View style={styles.content}>
          <View style={styles.invHeader}>
            <TextInput
              style={styles.searchInput}
              placeholder="Cari Barang, SKU, SN..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor="#999"
            />
            <TouchableOpacity style={styles.addCatBtn} onPress={() => setShowCatModal(true)}>
              <Text style={styles.addCatBtnText}>+ Kategori</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={filteredItems}
            keyExtractor={item => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderItem={({ item }) => {
              const isExpanded = expandedItemId === item.id;
              const isLow = item.current_stock <= item.min_stock;
              return (
                <View style={styles.itemCard}>
                  <TouchableOpacity 
                    style={styles.itemHeader} 
                    activeOpacity={0.7}
                    onPress={() => setExpandedItemId(isExpanded ? null : item.id)}
                  >
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemCategory}>{item.category?.name || 'Tanpa Kategori'}</Text>
                    </View>
                    <View style={styles.itemStockWrapper}>
                      <Text style={[styles.itemStock, isLow && { color: COLORS.error }]}>
                        {item.current_stock}
                      </Text>
                      <Text style={styles.itemUnit}>{item.unit}</Text>
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.itemAccordion}>
                      <View style={styles.itemDetails}>
                        <Text style={styles.itemDetailText}><Text style={{fontWeight: 'bold'}}>SKU:</Text> {item.sku || '-'}</Text>
                        <Text style={styles.itemDetailText}><Text style={{fontWeight: 'bold'}}>SN:</Text> {item.serial_number || '-'}</Text>
                        <Text style={styles.itemDetailText}><Text style={{fontWeight: 'bold'}}>Min Stok:</Text> {item.min_stock}</Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            }}
          />
        </View>
      )}

      {/* CONTENT: LAPORAN (NEW) */}
      {!loading && activeTab === 'laporan' && (
        <View style={styles.content}>
          {/* Segmented Control */}
          <View style={{ flexDirection: 'row', backgroundColor: COLORS.surfaceContainer, borderRadius: 12, padding: 4, marginBottom: 16 }}>
            <TouchableOpacity 
              style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: laporanTab === 'masuk' ? COLORS.surface : 'transparent', shadowColor: laporanTab === 'masuk' ? '#000' : 'transparent', shadowOpacity: 0.1, shadowRadius: 4, elevation: laporanTab === 'masuk' ? 2 : 0 }}
              onPress={() => setLaporanTab('masuk')}
            >
              <Text style={{ fontWeight: 'bold', color: laporanTab === 'masuk' ? COLORS.primary : COLORS.textVariant }}>Masuk</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: laporanTab === 'keluar' ? COLORS.surface : 'transparent', shadowColor: laporanTab === 'keluar' ? '#000' : 'transparent', shadowOpacity: 0.1, shadowRadius: 4, elevation: laporanTab === 'keluar' ? 2 : 0 }}
              onPress={() => setLaporanTab('keluar')}
            >
              <Text style={{ fontWeight: 'bold', color: laporanTab === 'keluar' ? COLORS.tertiary : COLORS.textVariant }}>Keluar</Text>
            </TouchableOpacity>
          </View>

          {/* Action Button */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <TextInput
              style={[styles.searchInput, { flex: 1, marginBottom: 0 }]}
              placeholder="Cari Laporan..."
              value={laporanSearch}
              onChangeText={setLaporanSearch}
              placeholderTextColor="#999"
            />
            <TouchableOpacity 
              style={[styles.fulfillBtn, { backgroundColor: laporanTab === 'masuk' ? COLORS.primary : COLORS.tertiary, marginTop: 0, paddingHorizontal: 16 }]}
              onPress={() => {
                setAdjustType(laporanTab);
                setIsNewItem(false);
                resetAdjustForm();
                setShowAdjustModal(true);
              }}
            >
              <Text style={styles.fulfillBtnText}>+ Input</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={filteredTransactions}
            keyExtractor={item => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={<Text style={styles.emptyText}>Belum ada laporan {laporanTab}.</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.reqCard} 
                activeOpacity={0.7}
                onPress={() => {
                  setEditingTransaction(item);
                  setAdjustNotes(item.notes || '');
                  setAdjustPhoto(item.photo_url || null);
                  setShowEditReportModal(true);
                }}
              >
                <View style={styles.reqHeader}>
                  <Text style={styles.reqItemName}>{item.item?.name}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: laporanTab === 'masuk' ? COLORS.primaryContainer : COLORS.errorContainer }]}>
                    <Text style={[styles.statusText, { color: laporanTab === 'masuk' ? COLORS.onPrimary : COLORS.error }]}>
                      {laporanTab === 'masuk' ? '+' : '-'} {item.qty} {item.item?.unit}
                    </Text>
                  </View>
                </View>
                <Text style={styles.reqDetail}>{new Date(item.created_at).toLocaleString('id-ID')} • {item.created_by}</Text>
                <Text style={styles.reqInfo}>{item.notes || 'Tidak ada keterangan'}</Text>
                {item.photo_url && (
                  <Text style={{ marginTop: 8, color: COLORS.primary, fontSize: 12, fontWeight: 'bold' }}>📸 Ada Lampiran Foto (Ketuk untuk Edit)</Text>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* CONTENT: REQUESTS */}
      {!loading && activeTab === 'requests' && (
        <View style={styles.content}>
          <FlatList
            data={requests}
            keyExtractor={item => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={<Text style={styles.emptyText}>Belum ada permintaan.</Text>}
            renderItem={({ item }) => (
              <View style={styles.reqCard}>
                <View style={styles.reqHeader}>
                  <Text style={styles.reqItemName}>{item.item?.name}</Text>
                  <View style={[styles.statusBadge, 
                    item.status === 'pending' ? {backgroundColor: COLORS.tertiaryContainer} : 
                    item.status === 'approved' ? {backgroundColor: COLORS.primaryContainer} : 
                    {backgroundColor: COLORS.surfaceContainer}
                  ]}>
                    <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.reqDetail}>{item.requested_qty} {item.item?.unit} • {item.requested_by}</Text>
                
                {item.status === 'pending' && (
                  <Text style={styles.reqInfo}>Menunggu persetujuan Admin Web.</Text>
                )}
                
                {item.status === 'approved' && (
                  <TouchableOpacity style={styles.fulfillBtn} onPress={() => handleFulfill(item)}>
                    <Text style={styles.fulfillBtnText}>📦 Serahkan Barang</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          />
        </View>
      )}

      {/* MODAL: Tambah Kategori */}
      <Modal visible={showCatModal} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowCatModal(false)}
        >
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { maxHeight: '80%' }]}>
              <Text style={styles.modalTitle}>Kategori Barang</Text>
              
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16, marginTop: 10 }}>
                <TextInput style={[styles.modalInput, { flex: 1, marginBottom: 0 }]} placeholder="Nama Kategori Baru" value={newCatName} onChangeText={setNewCatName} />
                <TouchableOpacity style={[styles.modalSubmit, { flex: 0, paddingHorizontal: 16, justifyContent: 'center' }]} onPress={handleAddCategory}>
                  <Text style={styles.modalSubmitText}>Tambah</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {categories.map(c => (
                  <View key={c.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: COLORS.surfaceContainer, borderRadius: 8, marginBottom: 8 }}>
                    <Text style={{ fontWeight: '600', color: COLORS.textMain }}>{c.name}</Text>
                    <TouchableOpacity onPress={() => handleDeleteCategory(c.id)}>
                      <Text style={{ color: COLORS.error, fontWeight: 'bold' }}>Hapus</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>

              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowCatModal(false)}>
                <Text style={styles.modalCancelText}>Tutup</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* MODAL: Laporan Masuk/Keluar (Adjust Stock / New Item) */}
      <Modal visible={showAdjustModal} transparent animationType="slide">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => { setShowAdjustModal(false); setAdjustPhoto(null); }}
        >
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { maxHeight: '90%' }]}>
              <Text style={styles.modalTitle}>Input Laporan {adjustType === 'masuk' ? 'Masuk' : 'Keluar'}</Text>
              
              <ScrollView showsVerticalScrollIndicator={false}>
                {adjustType === 'masuk' && (
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16, marginTop: 10 }}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: !isNewItem ? COLORS.primary : COLORS.surfaceContainer }]} onPress={() => setIsNewItem(false)}>
                      <Text style={[styles.actionBtnText, { color: !isNewItem ? COLORS.onPrimary : COLORS.textVariant }]}>Barang Lama</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: isNewItem ? COLORS.primary : COLORS.surfaceContainer }]} onPress={() => { setIsNewItem(true); setAdjustItem(null); }}>
                      <Text style={[styles.actionBtnText, { color: isNewItem ? COLORS.onPrimary : COLORS.textVariant }]}>Barang Baru</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {!isNewItem ? (
                  <>
                    <Text style={styles.label}>Pilih Barang:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                      {items.map(i => (
                        <TouchableOpacity 
                          key={i.id} 
                          style={{ padding: 10, borderWidth: 1, borderColor: adjustItem?.id === i.id ? COLORS.primary : COLORS.border, borderRadius: 8, marginRight: 8, backgroundColor: adjustItem?.id === i.id ? COLORS.primaryContainer + '30' : COLORS.surface }}
                          onPress={() => setAdjustItem(i)}
                        >
                          <Text style={{ fontWeight: adjustItem?.id === i.id ? 'bold' : 'normal', color: COLORS.textMain }}>{i.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                ) : (
                  <View style={{ gap: 10, marginBottom: 16 }}>
                    <Text style={styles.label}>Data Barang Baru:</Text>
                    <TextInput style={styles.modalInput} placeholder="Nama Barang" value={newItemForm.name} onChangeText={t => setNewItemForm({...newItemForm, name: t})} />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                      {categories.map(c => (
                        <TouchableOpacity 
                          key={c.id} 
                          style={{ padding: 8, borderWidth: 1, borderColor: newItemForm.category_id === c.id ? COLORS.primary : COLORS.border, borderRadius: 8, marginRight: 8, backgroundColor: newItemForm.category_id === c.id ? COLORS.primaryContainer + '30' : COLORS.surface }}
                          onPress={() => setNewItemForm({...newItemForm, category_id: c.id})}
                        >
                          <Text style={{ fontWeight: newItemForm.category_id === c.id ? 'bold' : 'normal', color: COLORS.textMain }}>{c.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <TextInput style={styles.modalInput} placeholder="Unit (Misal: Pcs, Liter)" value={newItemForm.unit} onChangeText={t => setNewItemForm({...newItemForm, unit: t})} />
                    <TextInput style={styles.modalInput} placeholder="Min Stok Warning (Opsional)" keyboardType="numeric" value={newItemForm.min_stock} onChangeText={t => setNewItemForm({...newItemForm, min_stock: t})} />
                  </View>
                )}
                
                {adjustType === 'keluar' && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={styles.label}>Pilih Request (Jika Ada):</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <TouchableOpacity 
                        style={{ padding: 10, borderWidth: 1, borderColor: !selectedRequestId ? COLORS.tertiary : COLORS.border, borderRadius: 8, marginRight: 8, backgroundColor: !selectedRequestId ? COLORS.tertiaryContainer + '30' : COLORS.surface }}
                        onPress={() => {
                          setSelectedRequestId(null);
                          setAdjustItem(null);
                          setAdjustQty('');
                        }}
                      >
                        <Text style={{ fontWeight: !selectedRequestId ? 'bold' : 'normal', color: COLORS.textMain }}>Keluar Manual (Pending)</Text>
                      </TouchableOpacity>
                      {approvedRequests.map(r => (
                        <TouchableOpacity 
                          key={r.id} 
                          style={{ padding: 10, borderWidth: 1, borderColor: selectedRequestId === r.id ? COLORS.primary : COLORS.border, borderRadius: 8, marginRight: 8, backgroundColor: selectedRequestId === r.id ? COLORS.primaryContainer + '30' : COLORS.surface }}
                          onPress={() => {
                            setSelectedRequestId(r.id);
                            setAdjustItem(items.find(i => i.id === r.item_id) || null);
                            setAdjustQty(r.approved_qty?.toString() || r.requested_qty?.toString() || '');
                          }}
                        >
                          <Text style={{ fontWeight: selectedRequestId === r.id ? 'bold' : 'normal', color: COLORS.textMain }}>{r.requested_by} - {r.item?.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    {!selectedRequestId && <Text style={{ fontSize: 11, color: COLORS.error, marginTop: 4 }}>*Barang Keluar Manual harus di-approve Admin.</Text>}
                  </View>
                )}

                <Text style={styles.label}>Jumlah {adjustType}:</Text>
                <TextInput style={styles.modalInput} placeholder="Kuantitas" keyboardType="numeric" value={adjustQty} onChangeText={setAdjustQty} />
                
                <Text style={styles.label}>Keterangan:</Text>
                <TextInput style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]} placeholder="Catatan (Opsional)" multiline value={adjustNotes} onChangeText={setAdjustNotes} />
                
                <TouchableOpacity style={styles.photoBtn} onPress={() => pickImage(setAdjustPhoto)}>
                  <Text style={styles.photoBtnText}>{adjustPhoto ? '✅ Foto Dipilih (Ganti?)' : '📸 Lampirkan Foto (Wajib untuk Laporan Baru)'}</Text>
                </TouchableOpacity>
                
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowAdjustModal(false); setAdjustPhoto(null); }}>
                    <Text style={styles.modalCancelText}>Batal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalSubmit, adjustType === 'keluar' && {backgroundColor: COLORS.tertiary}]} onPress={submitAdjustStock}>
                    <Text style={styles.modalSubmitText}>Simpan Laporan</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* MODAL: Edit Report */}
      <Modal visible={showEditReportModal} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => { setShowEditReportModal(false); setAdjustPhoto(null); }}
        >
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { maxHeight: '90%' }]}>
              <Text style={styles.modalTitle}>Edit Laporan</Text>
              <Text style={styles.modalSub}>{editingTransaction?.item?.name} ({editingTransaction?.qty} {editingTransaction?.item?.unit})</Text>
              
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.label}>Ubah Keterangan:</Text>
                <TextInput style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]} placeholder="Catatan" multiline value={adjustNotes} onChangeText={setAdjustNotes} />
                
                <Text style={styles.label}>Ubah Foto Lampiran:</Text>
                {editingTransaction?.photo_url && !adjustPhoto && (
                   <Image source={{ uri: editingTransaction.photo_url }} style={{ width: '100%', height: 150, borderRadius: 12, marginBottom: 12, backgroundColor: COLORS.surfaceContainer }} />
                )}
                {adjustPhoto && adjustPhoto !== editingTransaction?.photo_url && (
                   <Image source={{ uri: adjustPhoto }} style={{ width: '100%', height: 150, borderRadius: 12, marginBottom: 12, backgroundColor: COLORS.surfaceContainer }} />
                )}

                <TouchableOpacity style={styles.photoBtn} onPress={() => pickImage(setAdjustPhoto)}>
                  <Text style={styles.photoBtnText}>{adjustPhoto ? 'Ganti Foto Lain' : 'Pilih Foto Baru'}</Text>
                </TouchableOpacity>
                
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowEditReportModal(false); setAdjustPhoto(null); }}>
                    <Text style={styles.modalCancelText}>Batal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalSubmit} onPress={submitEditReport}>
                    <Text style={styles.modalSubmitText}>Update Laporan</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 20 : 0, paddingBottom: 15,
  },
  headerTitleContainer: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary },
  logoutBtn: { backgroundColor: COLORS.surfaceContainer, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  logoutText: { fontSize: 12, fontWeight: 'bold', color: COLORS.textVariant },
  
  tabContainer: { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 12, fontWeight: '600', color: COLORS.textVariant },
  tabTextActive: { color: COLORS.primary },
  
  content: { flex: 1, padding: 20 },
  pageTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.textMain, marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: COLORS.textVariant, marginBottom: 20 },
  
  widgetError: { backgroundColor: COLORS.errorContainer, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#fca5a5' },
  widgetTitleError: { fontSize: 16, fontWeight: 'bold', color: COLORS.error, marginBottom: 12 },
  alertItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(184, 50, 48, 0.1)' },
  alertItemName: { fontSize: 14, fontWeight: '600', color: COLORS.textMain, flex: 1 },
  alertItemStock: { fontSize: 12, fontWeight: 'bold', color: COLORS.error },
  alertMore: { fontSize: 12, color: COLORS.error, marginTop: 4, fontStyle: 'italic' },
  
  categoryCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: COLORS.border },
  catCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  catCardName: { fontSize: 16, fontWeight: 'bold', color: COLORS.textMain },
  catCardPercent: { fontSize: 14, fontWeight: 'bold', color: COLORS.textVariant },
  progressBarBg: { height: 8, backgroundColor: COLORS.surfaceContainer, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },

  invHeader: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  searchInput: { flex: 1, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: COLORS.textMain },
  addCatBtn: { backgroundColor: COLORS.primaryContainer, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },
  addCatBtnText: { color: COLORS.onPrimary, fontWeight: 'bold', fontSize: 13 },

  itemCard: { backgroundColor: COLORS.surface, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  itemHeader: { flexDirection: 'row', padding: 16, alignItems: 'center' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: 'bold', color: COLORS.textMain, marginBottom: 4 },
  itemCategory: { fontSize: 12, color: COLORS.textVariant },
  itemStockWrapper: { alignItems: 'flex-end' },
  itemStock: { fontSize: 24, fontWeight: 'bold', color: COLORS.textMain },
  itemUnit: { fontSize: 12, color: COLORS.textVariant },
  
  itemAccordion: { backgroundColor: COLORS.surfaceContainer, padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  itemDetails: { marginBottom: 4 },
  itemDetailText: { fontSize: 13, color: COLORS.textVariant, marginBottom: 4 },
  
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  actionBtnText: { color: COLORS.onPrimary, fontWeight: 'bold', fontSize: 14 },

  reqCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  reqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  reqItemName: { fontSize: 16, fontWeight: 'bold', color: COLORS.textMain, flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: 'bold', color: COLORS.surface },
  reqDetail: { fontSize: 14, color: COLORS.textVariant, marginBottom: 4 },
  reqInfo: { fontSize: 12, color: COLORS.tertiary, fontStyle: 'italic', backgroundColor: COLORS.tertiaryContainer + '40', padding: 8, borderRadius: 8 },
  fulfillBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  fulfillBtnText: { color: COLORS.onPrimary, fontWeight: 'bold', fontSize: 14 },
  
  emptyText: { textAlign: 'center', color: COLORS.textVariant, marginTop: 40 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textMain, marginBottom: 4 },
  modalSub: { fontSize: 14, color: COLORS.textVariant, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textMain, marginBottom: 6 },
  modalInput: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 16, color: COLORS.textMain },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancel: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: COLORS.surfaceContainer },
  modalCancelText: { color: COLORS.textVariant, fontWeight: 'bold', fontSize: 15 },
  modalSubmit: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: COLORS.primary },
  modalSubmitText: { color: COLORS.onPrimary, fontWeight: 'bold', fontSize: 15 },
  photoBtn: { backgroundColor: COLORS.surfaceContainer, padding: 12, borderRadius: 12, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed' },
  photoBtnText: { color: COLORS.textMain, fontWeight: '600' }
});