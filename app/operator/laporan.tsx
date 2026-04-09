import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet,
  Image, Alert, ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '@/lib/supabase';

/* ─── KECAMATAN & DESA (dari CODE.gs getWilayah — hardcoded fallback) ─── */
const DESA_MAP: Record<string, string[]> = {
  BALEN: ['Balen','Growok','Kabunan','Kemamang','Kenep','Margomulyo','Mayangkawis','Mulyoagung','Ngadiluhur','Penganten','Pilanggede','Pungpungan','Sekaran','Simorejo','Sobontoro','Suwaloh','Tengger','Wadang'],
  BAURENO: ['Baureno','Blongsong','Bokitatah','Diyanti','Gunungsari','Jambean','Kadungrejo','Kalisari','Karangdayu','Kepohkidul','Klampok','Lebaksari','Lengkong','Ngampal','Prambatan','Sidorejo','Sraturejo','Sukoharjo','Trojalu','Trojanunsari'],
  BOJONEGORO: ['Bojonegoro','Banjarejo','Campurejo','Kadipaten','Kalirejo','Kauman','Kepatihan','Ledok Wetan','Mojokampung','Mulyoagung','Ngrowo','Pacul','Roundobayan','Semanding','Sumbang','Sukorejo','Trucuk'],
  BUBULAN: ['Bubulan','Cengkir','Drenges','Gayam','Ngrandu','Pejok','Sumbermas','Tlogoagung'],
  DANDER: ['Dander','Bendo','Growok','Kaliombo','Karangdowo','Ngumpak Dalem','Ngraho','Semen','Siwalan','Sumberrejo','Sumberrejo Kulon','Sumodikaran','Trenggulunan'],
  GAYAM: ['Gayam','Brabowan','Bonorejo','Guyangan','Karangnongko','Katur','Manukan','Mojodelik','Ngampel','Ngelambor','Ringin','Ringintunggal','Sumberwangi','Talok','Wonocolo'],
  GONDANG: ['Gondang','Brangkal','Bulurejo','Dukuhklopo','Grogol','Jidomulyo','Krondonan','Kumbo','Pragelan','Sambongrejo','Sidorejo','Sukowati','Tileng'],
  KALITIDU: ['Kalitidu','Bakung','Begadon','Brenggolo','Cengkong','Duwel','Katur','Menyurun','Mlaten','Mojosari','Mojorejo','Ngraho','Pilangsari','Pungpungan','Selodakon','Semanding','Tunggulrejo'],
  KANOR: ['Kanor','Bogem','Cengkir','Gedongarum','Kabalan','Kalirejo','Karangmangu','Kedungsumber','Kendung','Menjangan','Mojodelik','Mojokumpul','Ngujung','Palembon','Piyak','Pumpungan','Samberan','Sidomulyo','Sumber','Trayem','Tretes','Wotan'],
  KAPAS: ['Kapas','Bangilan','Banjarsari','Bajang','Bogo','Klampok','Klempun','Mojodeso','Mojomalang','Ngraho','Padang','Plesungan','Semambung','Sukorejo','Sumbertlaseh','Tapelan','Wedi'],
  KASIMAN: ['Kasiman','Batokan','Betet','Kadri','Kalirejo','Lugorejo','Mojorejo','Ngaglik','Padangmentoyo','Sekaran','Tambakromo','Tulungsari'],
  KEDEWAN: ['Kedewan','Beji','Hargomulyo','Kawengan','Minyak Hitam','Wonocolo'],
  KEDUNGADEM: ['Kedungadem','Banjarjo','Bareng','Belor','Drokilo','Geger','Gejug','Kalirejo','Kedungadem','Ngraho','Panjangan','Pejok','Semanding','Sugihwaras','Sumberarum','Tanjungharapan','Tlogorejo','Tondomulyo','Trambulak','Wayurejo'],
  KEPOHBARU: ['Kepohbaru','Banjarsari','Blimbing','Bulawen','Butoh','Demonharjo','Doropayung','Mulyorejo','Ngraho','Ringinrejo','Selorejo','Sidomukti','Sumberejo','Sumberwangi','Tambahrejo','Tlogorejo','Tombang'],
  MALO: ['Malo','Banaran','Dalegan','Dukoh','Jatiroto','Kalirejo','Kedungrejo','Kembangbilo','Ketingan','Klitik','Mojorejo','Ngraho','Padangan','Petak','Sidobandung','Sumbertlaseh'],
  MARGOMULYO: ['Margomulyo','Cerlang','Geneng','Klino','Ngelo','Pejok','Sumberejo','Temayang'],
  NGAMBON: ['Ngambon','Bareng','Japon','Ngraho','Sambong','Setren'],
  NGASEM: ['Ngasem','Bandungrejo','Brabowan','Duyungan','Jampet','Kalitengah','Ngasem','Ngeper','Ngraho'],
  NGRAHO: ['Ngraho','Jumok','Luwihaji','Mojorejo','Nganti','Ngraho','Sumberagung','Sugihwaras'],
  PADANGAN: ['Padangan','Betet','Cengkir','Gayam','Jatimulyo','Kalirejo','Ngraho','Njati','Padangan','Sendangrejo','Sonorejo','Sumberejo','Tebon','Tinap'],
  PURWOSARI: ['Purwosari','Bakalan','Gerih','Kaliombo','Kuniran','Mojorejo','Nghulun','Palar','Pojok','Prayungan','Pulutan','Sumbertlaseh'],
  SEKAR: ['Sekar','Balong','Bareng','Deling','Glagahan','Kemiri','Klanceng','Krompol','Miyono','Ngraho','Ngleri','Ngrencak','Nguluhan','Pungpungan'],
  SUGIHWARAS: ['Sugihwaras','Bareng','Cengkir','Duwet','Jati','Jatipayak','Klepek','Mekuris','Mojorejo','Pacing','Panunggalan','Pojok','Tlogohaji'],
  SUKOSEWU: ['Sukosewu','Godo','Kalicilik','Katur','Kincang','Kumbo','Mojorejo','Mulyoagung','Ngraho','Semambung','Sumberharjo','Tinumpuk','Tlogohaji'],
  SUMBERREJO: ['Sumberrejo','Bareng','Dander','Glagah','Karangdayu','Kayulemah','Mejuwet','Mojorejo','Ngraho','Pacal','Panjungan','Sukoharjo','Sumbergede','Talun','Tlogohaji','Tlogorejo','Wayurejo'],
  TAMBAKREJO: ['Tambakrejo','Jatimulyo','Malingmati','Napis','Ngrancang','Turi'],
  TEMAYANG: ['Temayang','Beran','Drenges','Kedungrejo','Kembang','Mojorejo','Ngrencak','Nglumber','Pambon','Penganten','Soko','Temayang','Toberen','Wonoayu'],
  TRUCUK: ['Trucuk','Glagahwangi','Bendo','Kandangan','Kalirejo','Ngumpak Dalem','Pagerwesi','Pejok','Trucuk'],
};

const ALAT_LIST = [
  'Excavator 5 Ton (PC 50)',
  'Excavator 7,5 Ton (PC 75)',
  'Excavator 13 Ton (313D / PC 100)',
  'Excavator 20 Ton Standard (PC 200)',
  'Excavator 20 Ton Long Arm',
  'Bulldozer',
  'Wheel Excavator',
];

const API_URL = 'https://swakelolasda.vercel.app';

type Photo = { uri: string; base64: string; };
type Assignment = {
  id: string;
  location_district: string;
  location_village: string;
  job_type: string;
  job_sub_type: string;
  equipment: { name: string } | null;
  helper_override?: string | null;
  helper?: { full_name: string } | null;
};

export default function LaporanScreen() {
  const { operatorId, operatorName } = useLocalSearchParams<{ operatorId: string; operatorName: string }>();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    helper: '',
    kecamatan: '',
    desa: '',
    jenisAlat: '',
    progress: '',
    keterangan: '',
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

  // Load assignment aktif operator
  useEffect(() => {
    if (!operatorId) return;
    supabase
      .from('assignments')
      .select('id, location_district, location_village, job_type, job_sub_type, equipment:heavy_equipment(name), helper_override, helper:user_profiles!assignments_helper_id_fkey(full_name)')
      .eq('operator_id', operatorId)
      .eq('status', 'active')
      .single()
      .then(({ data }) => {
        if (data) {
          setAssignment(data as unknown as Assignment);
          const kec = (data.location_district || '').toUpperCase();
          const desa = data.location_village || '';
          const equipName = Array.isArray(data.equipment) ? data.equipment[0]?.name : (data.equipment as any)?.name;
          const assignedHelper = data.helper_override || (data.helper as any)?.full_name || '';
          setForm(f => ({ ...f, kecamatan: kec, desa, jenisAlat: equipName || '', helper: assignedHelper }));
          setDesaOptions(DESA_MAP[kec] || []);
        }
      });
  }, [operatorId]);

  // Update desa options when kecamatan changes
  useEffect(() => {
    setDesaOptions(DESA_MAP[form.kecamatan] || []);
    if (!DESA_MAP[form.kecamatan]?.includes(form.desa)) {
      setForm(f => ({ ...f, desa: '' }));
    }
  }, [form.kecamatan]);

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
              date: form.tanggal,
            }),
          });
          const json = await res.json();
          if (json.success) uploadedUrls.push(json.url);
        } catch (e) {
          console.warn('Upload foto gagal:', e);
        }
      }

      // 2. Simpan ke Supabase operator_logs
      const hmAwal = parseFloat(form.hmAwal.replace(',', '.')) || null;
      const hmAkhir = parseFloat(form.hmAkhir.replace(',', '.')) || null;

      const { error } = await supabase.from('operator_logs').insert({
        assignment_id: assignment?.id || null,
        tanggal: form.tanggal,
        override_kecamatan: form.kecamatan !== assignment?.location_district ? form.kecamatan : null,
        override_desa: form.desa !== assignment?.location_village ? form.desa : null,
        progress_pekerjaan: form.progress,
        keterangan_tambahan: form.keterangan || null,
        hm_awal: hmAwal,
        hm_akhir: hmAkhir,
        jam_kerja: jamKerja ? parseFloat(jamKerja) : null,
        panjang_pekerjaan: form.panjangPekerjaan || null,
        foto_lapangan_urls: uploadedUrls,
        helper_name: form.helper || null,
        submitted_by_operator_id: operatorId,
      });

      if (error) throw new Error(error.message);

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

        {/* TANGGAL */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Tanggal *</Text>
          <TextInput
            style={styles.input}
            value={form.tanggal}
            onChangeText={v => set('tanggal', v)}
            placeholder="YYYY-MM-DD"
          />
        </View>

        {/* HELPER */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Helper / Pembantu (Opsional){(assignment?.helper_override || assignment?.helper?.full_name) ? ` (dari penugasan: ${assignment.helper_override || assignment.helper?.full_name})` : ''}</Text>
          <TextInput
            style={styles.input}
            value={form.helper}
            onChangeText={v => set('helper', v)}
            placeholder="Nama helper..."
          />
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
              {ALAT_LIST.map(a => (
                <TouchableOpacity key={a} style={styles.dropdownItem} onPress={() => { set('jenisAlat', a); setAlatOpen(false); }}>
                  <Text style={[styles.dropdownText, form.jenisAlat === a && styles.dropdownActive]}>{a}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* PROGRESS */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Progress Pekerjaan *</Text>
          <TextInput
            style={styles.input}
            value={form.progress}
            onChangeText={v => set('progress', v)}
            placeholder="Contoh: Galian saluran 50%"
          />
        </View>

        {/* KETERANGAN */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Keterangan Tambahan</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={form.keterangan}
            onChangeText={v => set('keterangan', v)}
            placeholder="Keterangan tambahan..."
            multiline
            numberOfLines={3}
          />
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

        {/* PANJANG PEKERJAAN */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Panjang Pekerjaan</Text>
          <TextInput
            style={styles.input}
            value={form.panjangPekerjaan}
            onChangeText={v => set('panjangPekerjaan', v)}
            placeholder="Contoh: 150 meter"
          />
        </View>

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
});
