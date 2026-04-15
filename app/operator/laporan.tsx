import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet,
  Image, Alert, ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '@/lib/supabase';
import DESA_MAP from '@/lib/wilayah';

const API_URL = 'https://swakelolasda.vercel.app';

type Photo = { uri: string; base64: string; };
type EquipmentOption = {
  id: string;
  name: string;
  merk_type?: string | null;
  nomor_lambung?: string | null;
};
type Assignment = {
  id: string;
  location_district: string;
  location_village: string;
  job_type: string;
  job_sub_type: string;
  created_by_role?: string | null;
  equipment_id?: string | null;
  equipment: EquipmentOption | null;
  helper_override?: string | null;
  helper?: { full_name: string } | null;
};

type ColumnConfig = {
  id: string;
  column_key: string;
  column_label: string;
  column_type: string;
  dropdown_options?: string[] | null;
  is_required?: boolean;
  position: number;
};

export default function LaporanScreen() {
  const { operatorId, operatorName } = useLocalSearchParams<{ operatorId: string; operatorName: string }>();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [customColumns, setCustomColumns] = useState<ColumnConfig[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [customDropdownOpen, setCustomDropdownOpen] = useState<string | null>(null);

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateObj, setDateObj] = useState(new Date());

  // Helper dropdown state
  const [helperOpen, setHelperOpen] = useState(false);
  const [operatorList, setOperatorList] = useState<{ id: string; full_name: string }[]>([]);
  const [equipmentList, setEquipmentList] = useState<EquipmentOption[]>([]);

  const [keteranganKategori, setKeteranganKategori] = useState<'Kerusakan'|'Cuaca'|'Lainnya'|''>('');
  const [kateOpen, setKateOpen] = useState(false);
  const KATEGORI_OPTIONS = ['Kerusakan', 'Cuaca', 'Lainnya'];

  const formatEquipmentLabel = (equipment?: EquipmentOption | null) => {
    if (!equipment) return '';
    return [
      equipment.nomor_lambung,
      equipment.merk_type ? `(${equipment.merk_type})` : null,
      equipment.name,
    ].filter(Boolean).join(' ');
  };

  const normalizeDistrict = (value?: string | null) => (value || '').trim().toUpperCase();

  const syncEquipmentStatusForAssignment = async (equipmentId: string, hasActiveAssignment: boolean) => {
    const nextStatus = hasActiveAssignment ? 'operating' : 'ready';
    await supabase.from('heavy_equipment').update({ status: nextStatus }).eq('id', equipmentId);
  };

  const [form, setForm] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    helper: '',
    kecamatan: '',
    desa: '',
    jenisAlat: '',
    progress: '',
    keteranganDetail: '',
    hmAwal: '',
    hmAkhir: '',
    panjangPekerjaan: '',
  });
  const [desaOptions, setDesaOptions] = useState<string[]>([]);
  const [kecOpen, setKecOpen] = useState(false);
  const [desaOpen, setDesaOpen] = useState(false);
  const [alatOpen, setAlatOpen] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const jamKerja = (() => {
    const a = parseFloat(form.hmAwal.replace(',', '.'));
    const b = parseFloat(form.hmAkhir.replace(',', '.'));
    return (!isNaN(a) && !isNaN(b) && b > a) ? (b - a).toFixed(1) : null;
  })();

  // Load semua operator untuk dropdown helper
  useEffect(() => {
    supabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('role', 'operator')
      .order('full_name')
      .then(({ data }) => {
        setOperatorList((data || []).filter(o => o.full_name?.toLowerCase() !== 'operator test'));
      });

    supabase
      .from('heavy_equipment')
      .select('id, name, merk_type, nomor_lambung')
      .order('name')
      .then(({ data }) => {
        setEquipmentList(data || []);
      });
  }, []);

  // Load assignment aktif operator
  useEffect(() => {
    if (!operatorId) return;
    supabase
      .from('assignments')
      .select('id, location_district, location_village, job_type, job_sub_type, created_by_role, equipment_id, equipment:heavy_equipment(id, name, merk_type, nomor_lambung), helper_override, helper:user_profiles!assignments_helper_id_fkey(full_name)')
      .eq('operator_id', operatorId)
      .eq('status', 'active')
      .single()
      .then(async ({ data, error }) => {
        if (error) {
          console.warn('Gagal memuat detail penugasan:', error.message);
          return;
        }
        if (data) {
          setAssignment(data as unknown as Assignment);
          const kec = normalizeDistrict(data.location_district);
          const desa = data.location_village || '';
          const eq = Array.isArray(data.equipment) ? data.equipment[0] : (data.equipment as any);
          const equipDetail = formatEquipmentLabel(eq);
          const assignedHelper = data.helper_override || (data.helper as any)?.full_name || '';
          setForm(f => ({ ...f, kecamatan: kec, desa, jenisAlat: equipDetail || '', helper: assignedHelper }));
          setDesaOptions(DESA_MAP[kec] || []);

          // Fetch custom columns sesuai role seksi yang menugaskan operator
          const sectionRole = data.created_by_role ||
            (data.job_type === 'embung' ? 'seksi_embung' : 'seksi_normalisasi');
          const { data: colConfigs } = await supabase
            .from('section_column_configs')
            .select('*')
            .eq('role', sectionRole)
            .neq('column_type', 'formula') // formula hanya di web, bukan input operator
            .order('position', { ascending: true });
          setCustomColumns(colConfigs || []);
        }
      });
  }, [operatorId]);

  // Update desa options when kecamatan changes
  useEffect(() => {
    const normalizedDistrict = normalizeDistrict(form.kecamatan);
    const nextDesaOptions = DESA_MAP[normalizedDistrict] || [];
    setDesaOptions(nextDesaOptions);
    if (form.kecamatan !== normalizedDistrict) {
      setForm(f => ({ ...f, kecamatan: normalizedDistrict }));
      return;
    }
    if (form.desa && !nextDesaOptions.includes(form.desa)) {
      setForm(f => ({ ...f, desa: '' }));
    }
  }, [form.kecamatan, form.desa]);

  // Compress and pick photos
  const pickPhotos = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Izin Diperlukan', 'Izinkan akses galeri untuk upload foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
    });
    if (result.canceled) return;

    const MAX = 6;
    if (photos.length + result.assets.length > MAX) {
      Alert.alert('Batas Foto', `Maksimal ${MAX} foto per laporan.`);
      return;
    }

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
    setPhotos(p => [...p, ...compressed].slice(0, MAX));
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Izin Diperlukan', 'Izinkan akses kamera untuk mengambil foto.');
      return;
    }
    const MAX = 6;
    if (photos.length >= MAX) {
      Alert.alert('Batas Foto', `Maksimal ${MAX} foto per laporan.`);
      return;
    }

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
      setPhotos(p => [...p, { uri: res.uri, base64: res.base64 || '' }].slice(0, MAX));
    } catch (_) {}
  };

  const removePhoto = (i: number) => {
    setPhotos(p => p.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async () => {
    if (!form.tanggal) return Alert.alert('Error', 'Tanggal wajib diisi.');
    if (!form.kecamatan) return Alert.alert('Error', 'Kecamatan wajib diisi.');
    if (!form.desa) return Alert.alert('Error', 'Desa wajib diisi.');
    if (!form.jenisAlat) return Alert.alert('Error', 'Jenis Alat wajib diisi.');
    if (!form.progress) return Alert.alert('Error', 'Progress Pekerjaan wajib diisi.');

    setSubmitting(true);
    try {
      // 1. Upload foto ke Google Drive (satu per satu agar tidak timeout)
      const uploadedUrls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        try {
          const res = await fetch(`${API_URL}/api/upload/photo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              photo_base64: photo.base64,
              mime_type: 'image/jpeg',
              filename: `foto_${Date.now()}_${i}.jpg`,
              section_role: assignment?.job_type === 'embung' ? 'seksi_embung' : 'seksi_normalisasi',
              operator_name: operatorName,
              village: form.desa,
              district: form.kecamatan,
              equipment: form.jenisAlat,
              date: form.tanggal,
            }),
          });
          const json = await res.json();
          if (json.success) {
            uploadedUrls.push(json.url);
          } else {
            throw new Error(json.error || 'Terjadi kesalahan server saat upload foto.');
          }
        } catch (e: any) {
          throw new Error(`Upload foto gagal: ${e.message}`);
        }
      }

      // 2. Simpan ke Supabase operator_logs
      const hmAwal = parseFloat(form.hmAwal.replace(',', '.')) || null;
      const hmAkhir = parseFloat(form.hmAkhir.replace(',', '.')) || null;

      // Ambil equipment_id dari assignment untuk relasi ke heavy_equipment
      const equipmentId = assignment?.equipment_id || null;
      // Nama alat yang dipilih operator (sebagai override fallback)
      const alatDipilih = form.jenisAlat || null;

      // Validasi custom field yang required
      for (const col of customColumns) {
        if (col.is_required && !customFieldValues[col.column_key]) {
          setSubmitting(false);
          return Alert.alert('Error', `${col.column_label} wajib diisi.`);
        }
      }

      const { error } = await supabase.from('operator_logs').insert({
        assignment_id: assignment?.id || null,
        operator_id: operatorId,                    // relasi ke user_profiles → nama operator
        operator_name: operatorName,                // teks fallback nama operator
        equipment_id: equipmentId,                  // relasi ke heavy_equipment → nama alat
        jenis_alat: form.jenisAlat || null,         // teks fallback jenis alat berat
        override_alat: alatDipilih,                 // override manual jika ingin ubah
        tanggal: form.tanggal,
        override_kecamatan: form.kecamatan !== normalizeDistrict(assignment?.location_district) ? form.kecamatan : null,
        override_desa: form.desa !== (assignment?.location_village || '') ? form.desa : null,
        progress_pekerjaan: form.progress,
        keterangan_tambahan: keteranganKategori ? `[${keteranganKategori}] ${form.keteranganDetail}`.trim() : (form.keteranganDetail || null),
        hm_awal: hmAwal,
        hm_akhir: hmAkhir,
        jam_kerja: jamKerja ? parseFloat(jamKerja) : null,
        panjang_pekerjaan: form.panjangPekerjaan || null,
        foto_lapangan_urls: uploadedUrls.join(','),  // simpan sebagai string koma agar web bisa split
        helper_name: form.helper || null,
        submitted_by_operator_id: operatorId,
        custom_fields: Object.keys(customFieldValues).length > 0 ? customFieldValues : null,
      });

      if (error) throw new Error(error.message);

      // Jika kategori Kerusakan → set equipment maintenance + buat / update maintenance_log aktif
      if (assignment?.equipment_id) {
        if (keteranganKategori === 'Kerusakan') {
          await supabase.from('heavy_equipment').update({ status: 'maintenance' }).eq('id', assignment.equipment_id);

          const damageDescription = `[Laporan Operator: ${operatorName}] ${form.keteranganDetail}`.trim();
          const { data: existingMaintenanceLog } = await supabase
            .from('maintenance_logs')
            .select('id')
            .eq('equipment_id', assignment.equipment_id)
            .neq('progress_status', 'selesai')
            .order('reported_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existingMaintenanceLog?.id) {
            await supabase
              .from('maintenance_logs')
              .update({
                reported_by: operatorId,
                damage_description: damageDescription,
                progress_status: 'pelaporan',
                resolved_at: null,
              })
              .eq('id', existingMaintenanceLog.id);
          } else {
            await supabase.from('maintenance_logs').insert({
              equipment_id: assignment.equipment_id,
              reported_by: operatorId,
              damage_description: damageDescription,
              progress_status: 'pelaporan',
              mechanic_details: {},
            });
          }
        } else {
          const { data: activeMaintenanceLog } = await supabase
            .from('maintenance_logs')
            .select('id')
            .eq('equipment_id', assignment.equipment_id)
            .neq('progress_status', 'selesai')
            .order('reported_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!activeMaintenanceLog?.id) {
            const { data: activeAssignments } = await supabase
              .from('assignments')
              .select('id')
              .eq('equipment_id', assignment.equipment_id)
              .eq('status', 'active');

            await syncEquipmentStatusForAssignment(assignment.equipment_id, (activeAssignments || []).length > 0);
          }
        }
      }

      Alert.alert(
        '✅ Berhasil!',
        `Laporan berhasil dikirim${uploadedUrls.length > 0 ? ` dengan ${uploadedUrls.length} foto` : ''}.`,
        [{ text: 'OK', onPress: () => router.replace('/operator') }]
      );

    } catch (e: any) {
      Alert.alert('❌ Gagal', e.message || 'Terjadi kesalahan saat mengirim laporan.');
    } finally {
      setSubmitting(false);
    }
  };

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Operator Badge */}
        <View style={styles.opBadge}>
          <Text style={styles.opBadgeIcon}>👷</Text>
          <Text style={styles.opBadgeName}>{operatorName}</Text>
          {assignment && <Text style={styles.opBadgeSub}>Penugasan aktif: {assignment.job_sub_type || assignment.job_type}</Text>}
        </View>

        {/* TANGGAL — Date Picker Kalender */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Tanggal *</Text>
          <TouchableOpacity
            style={styles.selectBtn}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.selectVal}>📅  {form.tanggal}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={dateObj}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={(event, selected) => {
                setShowDatePicker(Platform.OS === 'ios'); // iOS tetap terbuka sampai dismiss
                if (selected) {
                  setDateObj(selected);
                  const iso = selected.toISOString().split('T')[0];
                  set('tanggal', iso);
                }
              }}
            />
          )}
          {Platform.OS === 'ios' && showDatePicker && (
            <TouchableOpacity
              style={{ alignSelf: 'flex-end', padding: 8 }}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={{ color: '#1e3a5f', fontWeight: '700' }}>Selesai</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* HELPER — Dropdown semua operator */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Helper / Pembantu (Opsional)
            {(assignment?.helper_override || assignment?.helper?.full_name)
              ? ` (penugasan: ${assignment.helper_override || assignment.helper?.full_name})`
              : ''}
          </Text>
          <TouchableOpacity
            style={styles.selectBtn}
            onPress={() => setHelperOpen(v => !v)}
          >
            <Text style={form.helper ? styles.selectVal : styles.selectPlaceholder}>
              {form.helper || '— Pilih Helper (Opsional) —'}
            </Text>
            <Text style={styles.chevron}>{helperOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {helperOpen && (
            <View style={styles.dropdownBox}>
              <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                {/* Opsi kosong */}
                <TouchableOpacity style={styles.dropdownItem} onPress={() => { set('helper', ''); setHelperOpen(false); }}>
                  <Text style={[styles.dropdownText, { color: '#a0aec0', fontStyle: 'italic' }]}>— Tidak Ada Helper —</Text>
                </TouchableOpacity>
                {operatorList.map(op => (
                  <TouchableOpacity
                    key={op.id}
                    style={styles.dropdownItem}
                    onPress={() => { set('helper', op.full_name); setHelperOpen(false); }}
                  >
                    <Text style={[styles.dropdownText, form.helper === op.full_name && styles.dropdownActive]}>
                      {op.full_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* KECAMATAN */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Kecamatan *</Text>
          <TouchableOpacity style={styles.selectBtn} onPress={() => setKecOpen(v => !v)}>
            <Text style={form.kecamatan ? styles.selectVal : styles.selectPlaceholder}>
              {form.kecamatan || '— Pilih Kecamatan —'}
            </Text>
            <Text style={styles.chevron}>{kecOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {kecOpen && (
            <View style={styles.dropdownBox}>
              <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                {Object.keys(DESA_MAP).sort().map(k => (
                  <TouchableOpacity key={k} style={styles.dropdownItem} onPress={() => { set('kecamatan', k); setKecOpen(false); }}>
                    <Text style={[styles.dropdownText, form.kecamatan === k && styles.dropdownActive]}>{k}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* DESA */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Desa *{assignment?.location_village ? ` (dari penugasan: ${assignment.location_village})` : ''}</Text>
          <TouchableOpacity
            style={[styles.selectBtn, !form.kecamatan && styles.selectDisabled]}
            onPress={() => form.kecamatan && setDesaOpen(v => !v)}
          >
            <Text style={form.desa ? styles.selectVal : styles.selectPlaceholder}>
              {form.desa || (form.kecamatan ? '— Pilih Desa —' : '— Pilih Kecamatan Dulu —')}
            </Text>
            <Text style={styles.chevron}>{desaOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {desaOpen && (
            <View style={styles.dropdownBox}>
              <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                {desaOptions.sort().map(d => (
                  <TouchableOpacity key={d} style={styles.dropdownItem} onPress={() => { set('desa', d); setDesaOpen(false); }}>
                    <Text style={[styles.dropdownText, form.desa === d && styles.dropdownActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          {assignment?.location_village && form.desa !== assignment.location_village && (
            <Text style={styles.hintChanged}>⚠️ Desa diubah dari penugasan awal</Text>
          )}
        </View>

        {/* JENIS ALAT */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Jenis Alat Berat *</Text>
          <TouchableOpacity style={styles.selectBtn} onPress={() => setAlatOpen(v => !v)}>
            <Text style={form.jenisAlat ? styles.selectVal : styles.selectPlaceholder}>
              {form.jenisAlat || '— Pilih Alat —'}
            </Text>
            <Text style={styles.chevron}>{alatOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {alatOpen && (
            <View style={styles.dropdownBox}>
              <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }}>
                {equipmentList.map(equipment => {
                  const label = formatEquipmentLabel(equipment);
                  return (
                    <TouchableOpacity
                      key={equipment.id}
                      style={styles.dropdownItem}
                      onPress={() => {
                        set('jenisAlat', label || equipment.name || '');
                        setAlatOpen(false);
                      }}
                    >
                      <Text style={[styles.dropdownText, form.jenisAlat === label && styles.dropdownActive]}>
                        {label || equipment.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        {/* PROGRESS — Numerik 0-100 */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Progress Pekerjaan (%) *</Text>
          <View style={styles.progressRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 10 }]}
              value={form.progress}
              onChangeText={v => {
                // Hanya angka 0-100
                const num = v.replace(/[^0-9]/g, '');
                const n = parseInt(num, 10);
                if (num === '') set('progress', '');
                else if (!isNaN(n) && n >= 0 && n <= 100) set('progress', num);
              }}
              placeholder="0 – 100"
              keyboardType="number-pad"
              maxLength={3}
            />
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${parseInt(form.progress || '0', 10)}%` as any }]} />
              <Text style={styles.progressPct}>{form.progress || '0'}%</Text>
            </View>
          </View>
        </View>

        {/* KETERANGAN — Kategori + Detail */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Keterangan Tambahan</Text>
          {/* Dropdown Kategori */}
          <TouchableOpacity style={styles.selectBtn} onPress={() => setKateOpen(v => !v)}>
            <Text style={keteranganKategori ? styles.selectVal : styles.selectPlaceholder}>
              {keteranganKategori || '— Pilih Kategori (Opsional) —'}
            </Text>
            <Text style={styles.chevron}>{kateOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {kateOpen && (
            <View style={styles.dropdownBox}>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => { setKeteranganKategori(''); setKateOpen(false); }}>
                <Text style={[styles.dropdownText, { color: '#a0aec0', fontStyle: 'italic' }]}>— Tidak Ada Kategori —</Text>
              </TouchableOpacity>
              {KATEGORI_OPTIONS.map(opt => (
                <TouchableOpacity key={opt} style={styles.dropdownItem} onPress={() => { setKeteranganKategori(opt as any); setKateOpen(false); }}>
                  <Text style={[styles.dropdownText, keteranganKategori === opt && styles.dropdownActive,
                    opt === 'Kerusakan' && { color: '#e53e3e', fontWeight: '700' }]}>
                    {opt === 'Kerusakan' ? '🔴 Kerusakan Alat' : opt === 'Cuaca' ? '🌧️ Cuaca' : '📝 Lainnya'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {/* Warning jika Kerusakan */}
          {keteranganKategori === 'Kerusakan' && (
            <View style={{ marginTop: 8, padding: 10, backgroundColor: '#fff5f5', borderLeftWidth: 4, borderLeftColor: '#e53e3e', borderRadius: 6 }}>
              <Text style={{ color: '#c53030', fontSize: 12, fontWeight: '700' }}>⚠️ Laporan kerusakan akan dikirim ke Tim Peralatan</Text>
              <Text style={{ color: '#c53030', fontSize: 11, marginTop: 2 }}>Status alat akan berubah ke MAINTENANCE otomatis</Text>
            </View>
          )}
          {/* Text input detail — muncul setelah pilih kategori */}
          {keteranganKategori !== '' && (
            <TextInput
              style={[styles.input, styles.textarea, { marginTop: 8 }]}
              value={form.keteranganDetail}
              onChangeText={v => set('keteranganDetail', v)}
              placeholder={keteranganKategori === 'Kerusakan' ? 'Jelaskan gejala kerusakan...' :
                keteranganKategori === 'Cuaca' ? 'Contoh: Hujan dari jam 8-16...' : 'Keterangan tambahan...'}
              multiline
              numberOfLines={3}
            />
          )}
        </View>

        {/* HOURMETER ROW */}
        <View style={styles.rowGroup}>
          <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>HM Awal</Text>
            <TextInput
              style={styles.input}
              value={form.hmAwal}
              onChangeText={v => set('hmAwal', v)}
              placeholder="0"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>HM Akhir</Text>
            <TextInput
              style={styles.input}
              value={form.hmAkhir}
              onChangeText={v => set('hmAkhir', v)}
              placeholder="0"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Jam Kerja</Text>
            <View style={styles.jamDisplay}>
              <Text style={styles.jamText}>{jamKerja ? jamKerja + ' jam' : '–'}</Text>
            </View>
          </View>
        </View>

        {/* PANJANG PEKERJAAN — Numerik */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Panjang Pekerjaan (meter)</Text>
          <TextInput
            style={styles.input}
            value={form.panjangPekerjaan}
            onChangeText={v => set('panjangPekerjaan', v.replace(/[^0-9.]/g, ''))}
            placeholder="Contoh: 150"
            keyboardType="decimal-pad"
          />
        </View>

        {/* KOLOM CUSTOM SEKSI */}
        {customColumns.length > 0 && (
          <View style={[styles.fieldGroup, { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 12 }]}>
            <Text style={[styles.label, { color: '#5a67d8', fontSize: 14, marginBottom: 10 }]}>📋 Data Tambahan Seksi</Text>
            {customColumns.map(col => (
              <View key={col.column_key} style={[styles.fieldGroup, { marginBottom: 12 }]}>
                <Text style={styles.label}>
                  {col.column_label}{col.is_required ? ' *' : ''}
                </Text>
                {col.column_type === 'dropdown' && col.dropdown_options ? (
                  <>
                    <TouchableOpacity
                      style={styles.selectBtn}
                      onPress={() => setCustomDropdownOpen(customDropdownOpen === col.column_key ? null : col.column_key)}
                    >
                      <Text style={customFieldValues[col.column_key] ? styles.selectVal : styles.selectPlaceholder}>
                        {customFieldValues[col.column_key] || `— Pilih ${col.column_label} —`}
                      </Text>
                      <Text style={styles.chevron}>{customDropdownOpen === col.column_key ? '▲' : '▼'}</Text>
                    </TouchableOpacity>
                    {customDropdownOpen === col.column_key && (
                      <View style={styles.dropdownBox}>
                        <ScrollView nestedScrollEnabled style={{ maxHeight: 180 }}>
                          {col.dropdown_options.map(opt => (
                            <TouchableOpacity key={opt} style={styles.dropdownItem}
                              onPress={() => {
                                setCustomFieldValues(v => ({ ...v, [col.column_key]: opt }));
                                setCustomDropdownOpen(null);
                              }}>
                              <Text style={[styles.dropdownText, customFieldValues[col.column_key] === opt && styles.dropdownActive]}>{opt}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </>
                ) : col.column_type === 'checkbox' ? (
                  <TouchableOpacity
                    style={[styles.selectBtn, { justifyContent: 'flex-start', gap: 10 }]}
                    onPress={() => setCustomFieldValues(v => ({ ...v, [col.column_key]: v[col.column_key] === 'ya' ? 'tidak' : 'ya' }))}
                  >
                    <Text style={{ fontSize: 18 }}>{customFieldValues[col.column_key] === 'ya' ? '☑️' : '⬜'}</Text>
                    <Text style={styles.selectVal}>{customFieldValues[col.column_key] === 'ya' ? 'Ya' : 'Tidak'}</Text>
                  </TouchableOpacity>
                ) : (
                  <TextInput
                    style={styles.input}
                    value={customFieldValues[col.column_key] || ''}
                    onChangeText={v => setCustomFieldValues(prev => ({ ...prev, [col.column_key]: v }))}
                    placeholder={`Isi ${col.column_label}...`}
                    keyboardType={col.column_type === 'number' ? 'decimal-pad' : 'default'}
                  />
                )}
              </View>
            ))}
          </View>
        )}

        {/* FOTO */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Upload Foto (Maks 6)</Text>
          <View style={styles.hintBox}>
            <Text style={styles.hintText}>📸 Upload foto progress & HM layar monitor. Foto dikompres otomatis.</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            <TouchableOpacity style={[styles.photoAddBtn, { flex: 1, marginBottom: 0 }]} onPress={pickPhotos} disabled={photos.length >= 6}>
              <Text style={styles.photoAddText}>🖼️ Dari Galeri</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.photoAddBtn, { flex: 1, marginBottom: 0, backgroundColor: '#3182ce' }]} onPress={takePhoto} disabled={photos.length >= 6}>
              <Text style={styles.photoAddText}>📷 Kamera</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.photoGrid}>
            {photos.map((p, i) => (
              <View key={i} style={styles.photoThumb}>
                <Image source={{ uri: p.uri }} style={styles.photoImg} />
                <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(i)}>
                  <Text style={styles.photoRemoveText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* SUBMIT */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>📤 Kirim Laporan</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const S = '#1e3a5f';
const A = '#d69e2e';
const styles = StyleSheet.create({
  scroll: { backgroundColor: '#edf2f7' },
  container: { padding: 16 },
  opBadge: {
    backgroundColor: S,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  opBadgeIcon: { fontSize: 30, marginBottom: 4 },
  opBadgeName: { color: '#fff', fontSize: 17, fontWeight: '700' },
  opBadgeSub: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 },
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
  textarea: { height: 80, textAlignVertical: 'top' },
  selectBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e0',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectDisabled: { backgroundColor: '#f7fafc', opacity: 0.7 },
  selectVal: { fontSize: 15, color: '#1a202c' },
  selectPlaceholder: { fontSize: 15, color: '#a0aec0' },
  chevron: { fontSize: 12, color: '#a0aec0' },
  dropdownBox: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e0',
    borderRadius: 8,
    marginTop: 4,
    overflow: 'hidden',
    elevation: 4,
    zIndex: 999,
  },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  dropdownText: { fontSize: 14, color: '#1a202c' },
  dropdownActive: { color: S, fontWeight: '700' },
  hintChanged: { fontSize: 12, color: A, marginTop: 4, fontStyle: 'italic' },
  rowGroup: { flexDirection: 'row', marginBottom: 14 },
  jamDisplay: {
    backgroundColor: '#f7fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  jamText: { color: S, fontWeight: '700', fontSize: 14 },
  hintBox: {
    backgroundColor: '#ebf8ff',
    borderLeftWidth: 4,
    borderLeftColor: S,
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  hintText: { fontSize: 12, color: '#2c5282', lineHeight: 18 },
  photoAddBtn: {
    backgroundColor: S,
    borderRadius: 10,
    padding: 13,
    alignItems: 'center',
    marginBottom: 12,
  },
  photoAddText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoThumb: {
    width: 90,
    height: 90,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  photoImg: { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(229,62,62,0.9)',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveText: { color: '#fff', fontSize: 14, fontWeight: '700', lineHeight: 20 },
  submitBtn: {
    backgroundColor: S,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    elevation: 3,
  },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  progressRow: { flexDirection: 'row', alignItems: 'center' },
  progressBar: {
    flex: 1,
    height: 44,
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e0',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#48bb78',
    borderRadius: 10,
  },
  progressPct: { fontSize: 14, fontWeight: '700', color: '#1a202c', zIndex: 1 },
});
