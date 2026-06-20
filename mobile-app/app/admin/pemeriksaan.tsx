import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet,
  Image, Alert, ActivityIndicator, Platform, KeyboardAvoidingView,
  Modal, FlatList, SafeAreaView, StatusBar, TouchableWithoutFeedback
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { supabaseWarehouse } from '@/lib/supabaseWarehouse';
import AsyncStorage from '@react-native-async-storage/async-storage';

type HeavyEquipment = { id: string; name: string; nomor_lambung: string; merk_type: string };
type WarehouseItem = { id: string; name: string; unit: string; current_stock: number; category?: { name: string } };
type RequestItem = { item: WarehouseItem; qty: string };

export default function MekanikPemeriksaanScreen() {
  const [equipList, setEquipList] = useState<HeavyEquipment[]>([]);
  const [selectedEquip, setSelectedEquip] = useState<HeavyEquipment | null>(null);
  const [equipOpen, setEquipOpen] = useState(false);
  
  const [pemeriksaanDetail, setPemeriksaanDetail] = useState('');
  const [kondisiAlat, setKondisiAlat] = useState<'baik' | 'rusak_ringan' | 'rusak_berat'>('baik');
  
  // Warehouse Catalog States
  const [showCatalog, setShowCatalog] = useState(false);
  const [warehouseItems, setWarehouseItems] = useState<WarehouseItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<WarehouseItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequests, setSelectedRequests] = useState<RequestItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Load Equipment
    const { data: equips } = await supabase
      .from('heavy_equipment')
      .select('id, name, nomor_lambung, merk_type')
      .order('name');
    setEquipList(equips || []);

    // Load Warehouse Items
    setLoadingItems(true);
    const { data: items } = await supabaseWarehouse
      .from('warehouse_items')
      .select('*, category:warehouse_categories(name)')
      .order('name');
    setWarehouseItems(items || []);
    setFilteredItems(items || []);
    setLoadingItems(false);
  };

  useEffect(() => {
    const q = searchTerm.toLowerCase();
    setFilteredItems(warehouseItems.filter(i => 
      i.name.toLowerCase().includes(q) || 
      i.category?.name.toLowerCase().includes(q)
    ));
  }, [searchTerm, warehouseItems]);

  const addRequest = (item: WarehouseItem) => {
    if (selectedRequests.find(r => r.item.id === item.id)) {
      Alert.alert('Info', 'Barang ini sudah ada di daftar permintaan.');
      return;
    }
    setSelectedRequests([...selectedRequests, { item, qty: '1' }]);
    setShowCatalog(false);
    setSearchTerm('');
  };

  const removeRequest = (id: string) => {
    setSelectedRequests(selectedRequests.filter(r => r.item.id !== id));
  };

  const updateQty = (id: string, qty: string) => {
    setSelectedRequests(selectedRequests.map(r => r.item.id === id ? { ...r, qty } : r));
  };

  const handleLogout = () => {
    Alert.alert('Keluar', 'Yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: async () => {
        await AsyncStorage.removeItem('apk_session');
        router.replace('/admin');
      }}
    ]);
  };

  const handleSubmit = async () => {
    if (!selectedEquip) return Alert.alert('Error', 'Pilih alat berat terlebih dahulu.');
    if (!pemeriksaanDetail) return Alert.alert('Error', 'Detail pemeriksaan wajib diisi.');

    setSubmitting(true);
    try {
      // 1. Simpan Laporan Pemeriksaan ke maintenance_logs
      const { data: log, error: logErr } = await supabase.from('maintenance_logs').insert({
        equipment_id: selectedEquip.id,
        damage_description: `[PEMERIKSAAN] ${pemeriksaanDetail}`,
        progress_status: kondisiAlat === 'baik' ? 'selesai' : 'pelaporan',
        repair_notes: `Kondisi: ${kondisiAlat.toUpperCase()}`,
        mechanic_details: { type: 'pemeriksaan', kondisi: kondisiAlat }
      }).select().single();

      if (logErr) throw logErr;

      // 2. Simpan Request ke Gudang (jika ada)
      if (selectedRequests.length > 0) {
        for (const req of selectedRequests) {
          const { error: reqErr } = await supabaseWarehouse.from('warehouse_requests').insert({
            request_type: 'mekanik_pemeriksaan',
            item_id: req.item.id,
            requested_qty: parseFloat(req.qty),
            requested_by: 'Mekanik APK', // Nanti bisa ambil dari session
            requester_role: 'mekanik',
            equipment_id: selectedEquip.id,
            equipment_name: selectedEquip.name,
            notes: `Request dari pemeriksaan alat ${selectedEquip.nomor_lambung}. Detail: ${pemeriksaanDetail}`,
            status: 'pending'
          });
          if (reqErr) console.warn('Gagal kirim request barang:', reqErr.message);
        }
      }

      // Update status alat jika rusak
      if (kondisiAlat !== 'baik') {
        await supabase.from('heavy_equipment').update({ status: 'maintenance' }).eq('id', selectedEquip.id);
      }

      Alert.alert('Berhasil', 'Laporan pemeriksaan & permintaan barang telah dikirim.', [
        { text: 'OK', onPress: () => router.replace('/admin/menu') }
      ]);
    } catch (e: any) {
      Alert.alert('Gagal', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#92400e" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/admin/menu')} style={styles.backBtn} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
          <Text style={styles.backText}>‹ Menu</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Laporan Pemeriksaan</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout 🚪</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 40 }}>
          
          <View style={styles.section}>
            <Text style={styles.label}>Pilih Alat Berat *</Text>
            <TouchableOpacity style={styles.selectBtn} onPress={() => setEquipOpen(!equipOpen)}>
              <Text style={selectedEquip ? styles.selectVal : styles.selectPlaceholder}>
                {selectedEquip ? `${selectedEquip.name} (${selectedEquip.nomor_lambung})` : '— Pilih Alat —'}
              </Text>
              <Text style={styles.chevron}>{equipOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {equipOpen && (
              <View style={styles.dropdown}>
                {equipList.map(e => (
                  <TouchableOpacity key={e.id} style={styles.dropdownItem} onPress={() => { setSelectedEquip(e); setEquipOpen(false); }}>
                    <Text style={styles.dropdownText}>{e.name} - {e.nomor_lambung}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Hasil Pemeriksaan / Temuan *</Text>
            <TextInput 
              style={[styles.input, { height: 100, textAlignVertical: 'top' }]} 
              placeholder="Jelaskan kondisi alat hasil pengecekan..." 
              multiline 
              value={pemeriksaanDetail} 
              onChangeText={setPemeriksaanDetail}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Kondisi Alat Saat Ini</Text>
            <View style={styles.radioGroup}>
              {(['baik', 'rusak_ringan', 'rusak_berat'] as const).map(k => (
                <TouchableOpacity 
                  key={k} 
                  style={[styles.radioBtn, kondisiAlat === k && styles.radioActive]} 
                  onPress={() => setKondisiAlat(k)}
                >
                  <Text style={[styles.radioText, kondisiAlat === k && styles.radioTextActive]}>
                    {k === 'baik' ? '🟢 Baik' : k === 'rusak_ringan' ? '🟡 Rusak Ringan' : '🔴 Rusak Berat'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* REQUEST BARANG SECTION */}
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={styles.label}>Request Barang ke Gudang</Text>
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowCatalog(true)}>
                <Text style={styles.addBtnText}>+ Pilih Barang</Text>
              </TouchableOpacity>
            </View>

            {selectedRequests.length === 0 ? (
              <View style={styles.emptyRequests}>
                <Text style={styles.emptyText}>Belum ada barang yang diminta</Text>
              </View>
            ) : (
              selectedRequests.map(req => (
                <View key={req.item.id} style={styles.requestCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.requestName}>{req.item.name}</Text>
                    <Text style={styles.requestSub}>{req.item.category?.name} · Stok: {req.item.current_stock}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TextInput 
                      style={styles.qtyInput} 
                      keyboardType="numeric" 
                      value={req.qty} 
                      onChangeText={t => updateQty(req.item.id, t)} 
                    />
                    <Text style={styles.unitText}>{req.item.unit}</Text>
                    <TouchableOpacity onPress={() => removeRequest(req.item.id)}>
                      <Text style={{ color: '#e53e3e', fontSize: 18, fontWeight: 'bold' }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>

          <TouchableOpacity 
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]} 
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Kirim Laporan & Request</Text>}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showCatalog} animationType="slide" transparent>
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowCatalog(false)}
        >
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Katalog Barang Gudang</Text>
                <TouchableOpacity onPress={() => setShowCatalog(false)}>
                  <Text style={{ fontSize: 24, color: '#64748b' }}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.searchBox}>
                <TextInput 
                  style={styles.searchInput} 
                  placeholder="Cari sparepart, oli, dll..." 
                  value={searchTerm} 
                  onChangeText={setSearchTerm}
                />
              </View>

              {loadingItems ? <ActivityIndicator style={{ margin: 20 }} /> : (
                <FlatList 
                  data={filteredItems}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.itemRow} onPress={() => addRequest(item)}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemSub}>{item.category?.name} · Unit: {item.unit}</Text>
                      </View>
                      <View style={styles.itemStock}>
                        <Text style={{ color: item.current_stock > 0 ? '#059669' : '#e53e3e', fontWeight: '700' }}>
                          {item.current_stock}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: '#94a3b8' }}>Barang tidak ditemukan</Text>}
                />
              )}
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fefce8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#92400e' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  backBtn: { marginRight: 10 },
  backText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  logoutText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  body: { flex: 1, padding: 16 },
  section: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e0', borderRadius: 10, padding: 12, fontSize: 15 },
  selectBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e0', borderRadius: 10, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectVal: { fontSize: 15, color: '#1e293b', fontWeight: '600' },
  selectPlaceholder: { fontSize: 15, color: '#94a3b8' },
  chevron: { color: '#94a3b8' },
  dropdown: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e0', borderRadius: 8, marginTop: 4, maxHeight: 200, overflow: 'hidden' },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  dropdownText: { fontSize: 14, color: '#1e293b' },
  radioGroup: { flexDirection: 'row', gap: 8 },
  radioBtn: { flex: 1, padding: 10, borderWidth: 1, borderColor: '#cbd5e0', borderRadius: 10, backgroundColor: '#fff', alignItems: 'center' },
  radioActive: { borderColor: '#92400e', backgroundColor: '#fffbeb' },
  radioText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  radioTextActive: { color: '#92400e' },
  addBtn: { backgroundColor: '#92400e', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  emptyRequests: { padding: 20, backgroundColor: '#fff', borderRadius: 10, borderStyle: 'dashed', borderWidth: 1, borderColor: '#cbd5e0', alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 13 },
  requestCard: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 8, alignItems: 'center', elevation: 1 },
  requestName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  requestSub: { fontSize: 11, color: '#64748b' },
  qtyInput: { width: 50, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, padding: 4, textAlign: 'center', fontSize: 14, color: '#1e293b' },
  unitText: { fontSize: 12, color: '#64748b', width: 40 },
  submitBtn: { backgroundColor: '#92400e', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '85%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  searchBox: { marginBottom: 12 },
  searchInput: { backgroundColor: '#f1f5f9', borderRadius: 10, padding: 12, fontSize: 15 },
  itemRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
  itemName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  itemSub: { fontSize: 12, color: '#64748b' },
  itemStock: { paddingHorizontal: 12, alignItems: 'center' }
});
