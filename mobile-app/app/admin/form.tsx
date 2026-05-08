import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet,
  Image, Alert, ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://swakelolasda.vercel.app';

const JENIS_MAINTENANCE = [
  'Servis Rutin',
  'Ganti Oli & Filter',
  'Perbaikan Mekanis',
  'Perbaikan Hidrolik',
  'Penggantian Sparepart',
  'Overhaul',
  'Lainnya',
];

type Photo = { uri: string; base64: string };
type FieldItem = { text: string; fotos: Photo[] };
type HeavyEquipment = { id: string; name: string; nomor_lambung: string; merk_type: string };

// Komponen field dinamis: list item + foto per item
function DynamicField({
  title,
  items,
  onChange,
}: {
  title: string;
  items: FieldItem[];
  onChange: (items: FieldItem[]) => void;
}) {
  const addItem = () => onChange([...items, { text: '', fotos: [] }]);
  const removeItem = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const updateText = (i: number, text: string) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, text } : it)));

  const addFoto = async (itemIdx: number) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Izin Diperlukan', 'Izinkan akses galeri.'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
    });
    if (result.canceled) return;

    const compressed: Photo[] = [];
    for (const asset of result.assets) {
      try {
        const res = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 800 } }],
          { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        compressed.push({ uri: res.uri, base64: res.base64 || '' });
      } catch (_) {}
    }

    const updated = items.map((it, idx) =>
      idx === itemIdx ? { ...it, fotos: [...it.fotos, ...compressed].slice(0, 5) } : it
    );
    onChange(updated);
  };

  const removeFoto = (itemIdx: number, fotoIdx: number) => {
    const updated = items.map((it, idx) =>
      idx === itemIdx ? { ...it, fotos: it.fotos.filter((_, fi) => fi !== fotoIdx) } : it
    );
    onChange(updated);
  };

  const takeFoto = async (itemIdx: number) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Izin Diperlukan', 'Izinkan akses kamera.'); return; }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (result.canceled) return;

    try {
      const res = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 800 } }],
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      const updated = items.map((it, idx) =>
        idx === itemIdx ? { ...it, fotos: [...it.fotos, { uri: res.uri, base64: res.base64 || '' }].slice(0, 5) } : it
      );
      onChange(updated);
    } catch (_) {}
  };

  return (
    <View style={dStyles.wrapper}>
      <View style={dStyles.titleRow}>
        <Text style={dStyles.title}>{title}</Text>
        <TouchableOpacity style={dStyles.addBtn} onPress={addItem}>
          <Text style={dStyles.addText}>+ Tambah</Text>
        </TouchableOpacity>
      </View>

      {items.map((item, i) => (
        <View key={i} style={dStyles.item}>
          {/* Item number + remove */}
          <View style={dStyles.itemHeader}>
            <Text style={dStyles.itemNum}>{i + 1}.</Text>
            <TextInput
              style={dStyles.itemInput}
              value={item.text}
              onChangeText={t => updateText(i, t)}
              placeholder={`Keterangan ${title.toLowerCase()}...`}
              multiline
            />
            <TouchableOpacity onPress={() => removeItem(i)} style={dStyles.removeBtn}>
              <Text style={dStyles.removeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Foto untuk item ini */}
          <View style={dStyles.fotoSection}>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <TouchableOpacity
                style={[dStyles.fotoAddBtn, { flex: 1, marginBottom: 0 }]}
                onPress={() => addFoto(i)}
                disabled={item.fotos.length >= 5}
              >
                <Text style={dStyles.fotoAddText}>🖼️ Galeri</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[dStyles.fotoAddBtn, { flex: 1, marginBottom: 0, backgroundColor: '#3182ce' }]}
                onPress={() => takeFoto(i)}
                disabled={item.fotos.length >= 5}
              >
                <Text style={[dStyles.fotoAddText, { color: '#fff' }]}>📷 Kamera</Text>
              </TouchableOpacity>
            </View>
            <View style={dStyles.fotoGrid}>
              {item.fotos.map((f, fi) => (
                <View key={fi} style={dStyles.fotoThumb}>
                  <Image source={{ uri: f.uri }} style={dStyles.fotoImg} />
                  <TouchableOpacity style={dStyles.fotoRemove} onPress={() => removeFoto(i, fi)}>
                    <Text style={dStyles.fotoRemoveText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        </View>
      ))}

      {items.length === 0 && (
        <Text style={dStyles.emptyHint}>Tekan "+ Tambah" untuk menambahkan {title.toLowerCase()}.</Text>
      )}
    </View>
  );
}

/* ─────────────────────────── MAIN SCREEN ─────────────────────────── */
export default function MekanikFormScreen() {
  const [equipList, setEquipList] = useState<HeavyEquipment[]>([]);
  const [selectedEquip, setSelectedEquip] = useState<HeavyEquipment | null>(null);
  const [equipOpen, setEquipOpen] = useState(false);
  const [jenisOpen, setJenisOpen] = useState(false);

  const [form, setForm] = useState({
    gejala: '',
    jenisMaintenance: '',
    tahunProduksi: '',
    hmOperasional: '',
    catatanUmum: '',
  });

  const [pekerjaan, setPekerjaan] = useState<FieldItem[]>([]);
  const [temuan, setTemuan] = useState<FieldItem[]>([]);
  const [tindakan, setTindakan] = useState<FieldItem[]>([]);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase
      .from('heavy_equipment')
      .select('id, name, nomor_lambung, merk_type')
      .order('name')
      .then(({ data }) => setEquipList(data || []));
  }, []);

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  /**
   * Upload foto dari satu field (array FieldItem) ke Google Drive
   * Return: items dengan fotos diganti jadi [] (sudah diupload) + urls per item
   */
  const uploadFieldPhotos = async (
    fieldItems: FieldItem[],
    fieldLabel: string
  ): Promise<{ text: string; fotos: string[] }[]> => {
    const result: { text: string; fotos: string[] }[] = [];
    for (const item of fieldItems) {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < item.fotos.length; i++) {
        const photo = item.fotos[i];
        try {
          const res = await fetch(`${API_URL}/api/upload/photo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              photo_base64: photo.base64,
              mime_type: 'image/jpeg',
              filename: `mekanik_${fieldLabel}_${Date.now()}_${i}.jpg`,
              section_role: 'tim_peralatan',
              operator_name: selectedEquip?.name || 'Alat',
              village: fieldLabel,
              date: new Date().toISOString().split('T')[0],
            }),
          });
          const json = await res.json();
          if (json.success) {
            uploadedUrls.push(json.url);
          } else {
            throw new Error(json.error || 'Terjadi kesalahan tidak diketahui dari server.');
          }
        } catch (e: any) {
          throw new Error(`Upload foto gagal: ${e.message}`);
        }
      }
      result.push({ text: item.text, fotos: uploadedUrls });
    }
    return result;
  };

  const handleSubmit = async () => {
    if (!selectedEquip) return Alert.alert('Error', 'Pilih alat berat terlebih dahulu.');
    if (!form.gejala) return Alert.alert('Error', 'Gejala / deskripsi kerusakan wajib diisi.');

    setSubmitting(true);
    try {
      // Upload foto per field
      const pekerjaanResult  = await uploadFieldPhotos(pekerjaan, 'Pekerjaan');
      const temuanResult     = await uploadFieldPhotos(temuan, 'Temuan');
      const tindakanResult   = await uploadFieldPhotos(tindakan, 'Tindakan');

      const mechanicDetails = {
        jenis_maintenance: form.jenisMaintenance || null,
        tahun_produksi: form.tahunProduksi || null,
        jam_operasional: form.hmOperasional || null,
        pekerjaan: pekerjaanResult,
        temuan: temuanResult,
        tindakan: tindakanResult,
      };

      // Cari log maintenance aktif ATAU buat baru
      const { data: existingLog } = await supabase
        .from('maintenance_logs')
        .select('id')
        .eq('equipment_id', selectedEquip.id)
        .neq('progress_status', 'selesai')
        .order('reported_at', { ascending: false })
        .limit(1)
        .single();

      let error;
      if (existingLog) {
        // Update log yang ada
        const { error: err } = await supabase
          .from('maintenance_logs')
          .update({
            damage_description: form.gejala,
            repair_notes: form.catatanUmum || null,
            mechanic_details: mechanicDetails,
          })
          .eq('id', existingLog.id);
        error = err;
      } else {
        // Buat log baru
        const { error: err } = await supabase.from('maintenance_logs').insert({
          equipment_id: selectedEquip.id,
          damage_description: form.gejala,
          repair_notes: form.catatanUmum || null,
          mechanic_details: mechanicDetails,
          progress_status: 'pengerjaan',
        });
        error = err;
      }

      if (error) throw new Error(error.message);

      Alert.alert(
        '✅ Laporan Tersimpan!',
        'Data laporan mekanik berhasil dikirim dan dapat dilihat di web admin.',
        [{ text: 'OK', onPress: () => router.replace('/admin' as any) }]
      );
    } catch (e: any) {
      Alert.alert('❌ Gagal', e.message || 'Gagal menyimpan laporan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/admin/menu')} style={styles.backBtn} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
          <Text style={styles.backText}>‹ Menu</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Laporan Perbaikan</Text>
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
          style={styles.logoutBtn}
        >
          <Text style={styles.logoutText}>Logout 🚪</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* PILIH ALAT BERAT */}
        <View style={styles.fieldGroup}>
          <Text style={styles.sectionTitle}>🔧 Identitas Alat</Text>
          <Text style={styles.label}>Alat Berat *</Text>
          <TouchableOpacity style={styles.selectBtn} onPress={() => setEquipOpen(v => !v)}>
            <View style={{ flex: 1 }}>
              {selectedEquip ? (
                <>
                  <Text style={styles.selectVal}>{selectedEquip.name}</Text>
                  <Text style={styles.selectSub}>{selectedEquip.nomor_lambung} · {selectedEquip.merk_type}</Text>
                </>
              ) : (
                <Text style={styles.selectPlaceholder}>— Pilih Alat Berat —</Text>
              )}
            </View>
            <Text style={styles.chevron}>{equipOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {equipOpen && (
            <View style={styles.dropdownBox}>
              <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }}>
                {equipList.map(e => (
                  <TouchableOpacity
                    key={e.id}
                    style={styles.dropdownItem}
                    onPress={() => { setSelectedEquip(e); setEquipOpen(false); }}
                  >
                    <Text style={[styles.dropdownText, selectedEquip?.id === e.id && styles.dropdownActive]}>
                      {e.name}
                    </Text>
                    <Text style={styles.dropdownSub}>{e.nomor_lambung} · {e.merk_type}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* GEJALA */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Gejala / Deskripsi Kerusakan *</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={form.gejala}
            onChangeText={v => set('gejala', v)}
            placeholder="Jelaskan gejala kerusakan yang ditemukan..."
            multiline
            numberOfLines={4}
          />
        </View>

        {/* JENIS MAINTENANCE */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Jenis Maintenance</Text>
          <TouchableOpacity style={styles.selectBtn} onPress={() => setJenisOpen(v => !v)}>
            <Text style={form.jenisMaintenance ? styles.selectVal : styles.selectPlaceholder}>
              {form.jenisMaintenance || '— Pilih Jenis —'}
            </Text>
            <Text style={styles.chevron}>{jenisOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {jenisOpen && (
            <View style={styles.dropdownBox}>
              {JENIS_MAINTENANCE.map(j => (
                <TouchableOpacity key={j} style={styles.dropdownItem}
                  onPress={() => { set('jenisMaintenance', j); setJenisOpen(false); }}>
                  <Text style={[styles.dropdownText, form.jenisMaintenance === j && styles.dropdownActive]}>{j}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* TAHUN PRODUKSI & HM */}
        <View style={styles.rowGroup}>
          <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Tahun Produksi</Text>
            <TextInput
              style={styles.input}
              value={form.tahunProduksi}
              onChangeText={v => set('tahunProduksi', v)}
              placeholder="2010"
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>HM Operasional</Text>
            <TextInput
              style={styles.input}
              value={form.hmOperasional}
              onChangeText={v => set('hmOperasional', v)}
              placeholder="5000 HM"
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* DIVIDER */}
        <Text style={styles.sectionTitle}>📋 Detail Pekerjaan</Text>

        {/* PEKERJAAN DINAMIS */}
        <DynamicField title="Pekerjaan Spesifik" items={pekerjaan} onChange={setPekerjaan} />

        {/* TEMUAN DINAMIS */}
        <DynamicField title="Temuan / Defek Lain" items={temuan} onChange={setTemuan} />

        {/* TINDAKAN DINAMIS */}
        <DynamicField title="Tindakan Korektif & Sparepart" items={tindakan} onChange={setTindakan} />

        {/* CATATAN UMUM */}
        <View style={styles.fieldGroup}>
          <Text style={styles.sectionTitle}>📝 Catatan Umum</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={form.catatanUmum}
            onChangeText={v => set('catatanUmum', v)}
            placeholder="Catatan tambahan untuk admin/pengawas..."
            multiline
            numberOfLines={3}
          />
        </View>

        {/* SUBMIT */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting
            ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.submitText}>Mengunggah & Menyimpan...</Text>
              </View>
            : <Text style={styles.submitText}>📤 Kirim Laporan Mekanik</Text>
          }
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const P = '#92400e'; // primary mekanik = amber dark
const styles = StyleSheet.create({
  scroll: { backgroundColor: '#fefce8' },
  container: { padding: 16 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: P,
    marginBottom: 12,
    marginTop: 8,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: '#fde68a',
  },
  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#2d3748', marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#1a202c',
  },
  textarea: { height: 90, textAlignVertical: 'top' },
  selectBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e0',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
  },
  selectVal: { fontSize: 15, color: '#1a202c', fontWeight: '600' },
  selectSub: { fontSize: 11, color: '#718096', marginTop: 2 },
  selectPlaceholder: { fontSize: 15, color: '#a0aec0' },
  chevron: { fontSize: 12, color: '#a0aec0' },
  dropdownBox: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e0',
    borderRadius: 8,
    marginTop: 4,
    elevation: 4,
    zIndex: 99,
  },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  dropdownText: { fontSize: 14, color: '#1a202c' },
  dropdownSub: { fontSize: 11, color: '#a0aec0', marginTop: 2 },
  dropdownActive: { color: P, fontWeight: '700' },
  rowGroup: { flexDirection: 'row', marginBottom: 0 },
  submitBtn: {
    backgroundColor: P,
    borderRadius: 12,
    padding: 17,
    alignItems: 'center',
    marginTop: 12,
    elevation: 3,
  },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: P,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  backBtn: { marginRight: 10 },
  backText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  logoutText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});

const dStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 14, fontWeight: '700', color: '#1a202c' },
  addBtn: {
    backgroundColor: '#fde68a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addText: { color: '#92400e', fontWeight: '700', fontSize: 13 },
  item: {
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fffbeb',
  },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  itemNum: { color: '#92400e', fontWeight: '700', fontSize: 15, marginRight: 6, paddingTop: 12 },
  itemInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#1a202c',
    minHeight: 40,
    textAlignVertical: 'top',
  },
  removeBtn: {
    marginLeft: 8,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  removeText: { color: '#e53e3e', fontWeight: '700', fontSize: 14 },
  fotoSection: {},
  fotoAddBtn: {
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    padding: 9,
    alignItems: 'center',
    marginBottom: 8,
  },
  fotoAddText: { color: '#4a5568', fontSize: 13, fontWeight: '600' },
  fotoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fotoThumb: {
    width: 76,
    height: 76,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  fotoImg: { width: '100%', height: '100%' },
  fotoRemove: {
    position: 'absolute',
    top: 3,
    right: 3,
    backgroundColor: 'rgba(229,62,62,0.9)',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fotoRemoveText: { color: '#fff', fontSize: 13, fontWeight: '700', lineHeight: 18 },
  emptyHint: { color: '#a0aec0', fontSize: 13, fontStyle: 'italic', textAlign: 'center', padding: 10 },
});
