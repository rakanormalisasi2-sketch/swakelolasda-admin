import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image, TextInput, Modal, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SignatureScreen from 'react-native-signature-canvas';
import DateTimePicker from '@react-native-community/datetimepicker';
import { logoBase64 } from './logoBase64';

// Helper for dates
const numToWords = (num: number): string => {
  const units = ['Nol', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  if (num < 12) return units[num];
  if (num < 20) return units[num - 10] + ' Belas';
  if (num < 100) return units[Math.floor(num / 10)] + ' Puluh ' + (num % 10 !== 0 ? units[num % 10] : '');
  if (num < 200) return 'Seratus ' + numToWords(num - 100);
  if (num < 1000) return units[Math.floor(num / 100)] + ' Ratus ' + (num % 100 !== 0 ? numToWords(num % 100) : '');
  if (num < 2000) return 'Seribu ' + numToWords(num - 1000);
  if (num < 1000000) return numToWords(Math.floor(num / 1000)) + ' Ribu ' + (num % 1000 !== 0 ? numToWords(num % 1000) : '');
  return num.toString();
};

const getDayName = (date: Date) => ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][date.getDay()];
const getMonthName = (date: Date) => ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][date.getMonth()];

export default function SurveyFormScreen() {
  const { id, nama, kecamatan, desa } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  
  const [photos, setPhotos] = useState<string[]>([]);
  const [signatureSurveyor, setSignatureSurveyor] = useState<string | null>(null);
  const [namaSurveyor, setNamaSurveyor] = useState('');
  const [signatureNarasumber, setSignatureNarasumber] = useState<string | null>(null);
  const [namaNarasumber, setNamaNarasumber] = useState('');
  const [activeSignTarget, setActiveSignTarget] = useState<'surveyor' | 'narasumber' | null>(null);
  const [saveLocal, setSaveLocal] = useState(false);
  
  const signatureRef = useRef<any>(null);

  // Data Primer
  const [kecamatanForm, setKecamatanForm] = useState((kecamatan as string) || '');
  const [desaForm, setDesaForm] = useState((desa as string) || '');
  const [namaUsulanForm, setNamaUsulanForm] = useState((nama as string) || '');

  // Field Form Tambahan
  const [tanggal, setTanggal] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sungai, setSungai] = useState('');
  const [penyebab, setPenyebab] = useState('');
  const [kewenangan, setKewenangan] = useState('');
  const [panjangUsulan, setPanjangUsulan] = useState('');
  const [keteranganLapangan, setKeteranganLapangan] = useState('');

  // Equipments (Hardcoded categories as requested)
  const [selectedEq, setSelectedEq] = useState<string>('');
  const equipmentCategories = [
    "Excavator 20 ton Longarm",
    "Bulldozer",
    "Excavator 20 ton",
    "Excavator 13 Ton",
    "Excavator 7,5 Ton",
    "Excavator 5 Ton",
    "Speeder"
  ];

  const [scores, setScores] = useState({
    kerawanan_bencana: '', skor_kerawanan: null as any,
    dampak_kerusakan: '', skor_dampak: null as any,
    kelas_bahaya: '', skor_bahaya: null as any,
    bentuk_kegiatan: '', skor_bentuk: null as any,
    jarak_akses: '', skor_jarak: null as any,
  });

  useEffect(() => {
    loadSavedSignature();
  }, []);

  const loadSavedSignature = async () => {
    try {
      const savedSig = await AsyncStorage.getItem('saved_surveyor_signature');
      const savedName = await AsyncStorage.getItem('saved_surveyor_name');
      if (savedSig) setSignatureSurveyor(savedSig);
      if (savedName) setNamaSurveyor(savedName);
    } catch(e) {}
  };



  const scanDocument = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Izin Ditolak', 'Maaf, kami memerlukan akses kamera untuk mengambil foto.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.2,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotos(prev => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      Alert.alert('Scanner Error', 'Gagal membuka kamera');
    }
  };

  const pickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Izin Ditolak', 'Maaf, kami memerlukan akses galeri.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.2,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newUris = result.assets.map(a => a.uri);
        setPhotos(prev => [...prev, ...newUris]);
      }
    } catch (error) {
      Alert.alert('Gallery Error', 'Gagal membuka galeri');
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSignature = async (sig: string) => {
    if (activeSignTarget === 'surveyor') {
      setSignatureSurveyor(sig);
      try {
        await AsyncStorage.setItem('saved_surveyor_signature', sig);
        if (namaSurveyor) await AsyncStorage.setItem('saved_surveyor_name', namaSurveyor);
      } catch(e) {}
    }
    if (activeSignTarget === 'narasumber') setSignatureNarasumber(sig);
    setActiveSignTarget(null);
  };

  const submitSurvey = async () => {
    const isAnyEmpty = !kecamatanForm || !desaForm || !namaUsulanForm || !sungai || !penyebab || !kewenangan || !panjangUsulan || 
                       !scores.skor_kerawanan || !scores.skor_dampak || !scores.skor_bahaya || !scores.skor_bentuk || !scores.skor_jarak ||
                       !selectedEq || photos.length === 0 || !signatureSurveyor || !signatureNarasumber || !namaSurveyor || !namaNarasumber;
                       
    if (isAnyEmpty) {
      Alert.alert(
        'Peringatan',
        'Ada beberapa field yang belum terisi (termasuk kriteria, foto, atau tanda tangan). Jika Anda melanjutkan, data tersebut akan dikosongkan pada Berita Acara resmi. Lanjutkan?',
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Ya, Lanjutkan', onPress: processSubmit }
        ]
      );
    } else {
      processSubmit();
    }
  };

  const processSubmit = async () => {
    setLoading(true);
    try {
      const sess = await AsyncStorage.getItem('apk_session');
      let role = sess ? JSON.parse(sess).role : 'seksi_normalisasi';
      if (role === 'survey_normalisasi') role = 'seksi_normalisasi';
      if (role === 'survey_embung') role = 'seksi_embung';
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://swakelolasda.vercel.app/api';
      
      // 1. Convert all Images to Base64
      const photosBase64: string[] = [];
      for (const p of photos) {
        try {
          const b64 = await FileSystem.readAsStringAsync(p, { encoding: 'base64' });
          photosBase64.push(`data:image/jpeg;base64,${b64}`);
        } catch (e) {
          console.warn('Skip foto gagal convert:', p);
        }
      }

      // 2. Generate HTML
      const htmlContent = `
      <html>
      <head>
      <style>
        @page { size: 215.9mm 330.2mm; margin: 20mm; }
        body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: black; line-height: 1.5; padding: 0; margin: 0; }
        .header { text-align: center; font-weight: bold; font-size: 13pt; margin-bottom: 20px; position: relative; line-height: 1.2; }
        .logo { position: absolute; left: 0; top: -5px; width: 85px; }
        .title { text-decoration: underline; font-weight: bold; text-align: center; margin-top: 30px; margin-bottom: 20px; font-size: 11pt; }
        .table-list { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 15px; }
        .table-list td { padding: 4px; vertical-align: top; }
        .table-grid { width: 100%; border-collapse: collapse; margin-top: 5px; margin-bottom: 15px; page-break-inside: avoid; }
        .table-grid td, .table-grid th { border: 1px solid black; padding: 6px 8px; font-size: 10pt; }
        .table-grid .check-col { width: 40px; text-align: center; font-weight: bold; }
        .page-break { page-break-before: always; }
        .sign-container { margin-top: 50px; display: flex; justify-content: space-between; text-align: center; page-break-inside: avoid; }
        .criteria-row { display: flex; page-break-inside: avoid; }
      </style>
      </head>
      <body>
      <!-- Page 1 -->
      <div class="header">
        <img src="${logoBase64}" class="logo" />
        PEMERINTAH KABUPATEN BOJONEGORO<br/>
        DINAS PEKERJAAN UMUM SUMBER DAYA AIR<br/>
        BIDANG OPERASI DAN PEMELIHARAAN<br/>
        <span style="font-size:10pt; font-weight:normal;">Jl. Basuki Rachmad Nomor 04 A Telp. 0353-881491</span>
      </div>

      <div class="title">BERITA ACARA VERIFIKASI PROPOSAL</div>

      <p style="text-align: justify;">
        Pada hari ini <b>${getDayName(tanggal)}</b> tanggal <b>${numToWords(tanggal.getDate()).toLowerCase()}</b> bulan <b>${getMonthName(tanggal).toLowerCase()}</b> tahun <b>${numToWords(tanggal.getFullYear()).toLowerCase()}</b>, Tim Verifikasi SKPD Dinas Pekerjaan Umum Sumber Daya Air Kab. Bojonegoro telah melaksanakan verifikasi lapangan ke lokasi usulan kegiatan di
      </p>
      
      <table class="table-list">
        <tr><td style="width: 150px;">Sungai/Avoer</td><td style="width: 10px;">:</td><td>${sungai || '...........................................'}</td></tr>
        <tr><td>Desa</td><td>:</td><td>${desaForm || '...........................................'}</td></tr>
        <tr><td>Kecamatan</td><td>:</td><td>${kecamatanForm || '...........................................'}</td></tr>
        <tr><td>Penyebab</td><td>:</td><td>${penyebab || '...........................................'}</td></tr>
        <tr><td>Kewenangan</td><td>:</td><td>${kewenangan || '...........................................'}</td></tr>
      </table>

      <!-- Kriteria -->
      <div class="criteria-row">
        <div style="width:150px;">Kerawanan Bencana</div><div style="width:10px;">:</div>
        <div style="flex:1;">
          <table class="table-grid">
            <tr><td>Kekeringan</td><td class="check-col">${scores.kerawanan_bencana === 'Kekeringan' ? 'V' : ''}</td></tr>
            <tr><td>Banjir Luapan</td><td class="check-col">${scores.kerawanan_bencana === 'Banjir Luapan' ? 'V' : ''}</td></tr>
            <tr><td>Longsor</td><td class="check-col">${scores.kerawanan_bencana === 'Longsor' ? 'V' : ''}</td></tr>
            <tr><td>Banjir Bandang</td><td class="check-col">${scores.kerawanan_bencana === 'Banjir Bandang' ? 'V' : ''}</td></tr>
          </table>
        </div>
      </div>

      <div class="criteria-row">
        <div style="width:150px;">Dampak Kerusakan</div><div style="width:10px;">:</div>
        <div style="flex:1;">
          <table class="table-grid">
            <tr><td>Lahan Non Produktif</td><td class="check-col">${scores.dampak_kerusakan === 'Lahan Non Produktif' ? 'V' : ''}</td></tr>
            <tr><td>Lahan Produktif</td><td class="check-col">${scores.dampak_kerusakan === 'Lahan Produktif' ? 'V' : ''}</td></tr>
            <tr><td>Sarana Umum</td><td class="check-col">${scores.dampak_kerusakan === 'Sarana Umum' ? 'V' : ''}</td></tr>
            <tr><td>Permukiman</td><td class="check-col">${scores.dampak_kerusakan === 'Permukiman' ? 'V' : ''}</td></tr>
          </table>
        </div>
      </div>

      <div class="criteria-row">
        <div style="width:150px;">Kelas Bahaya</div><div style="width:10px;">:</div>
        <div style="flex:1;">
          <table class="table-grid">
            <tr><td>Kecil</td><td class="check-col">${scores.kelas_bahaya === 'Kecil' ? 'V' : ''}</td></tr>
            <tr><td>Sedang</td><td class="check-col">${scores.kelas_bahaya === 'Sedang' ? 'V' : ''}</td></tr>
            <tr><td>Tinggi</td><td class="check-col">${scores.kelas_bahaya === 'Tinggi' ? 'V' : ''}</td></tr>
          </table>
        </div>
      </div>

      <div class="criteria-row">
        <div style="width:150px;">Bentuk Kegiatan</div><div style="width:10px;">:</div>
        <div style="flex:1;">
          <table class="table-grid">
            <tr><td>Pembangunan Baru</td><td class="check-col">${scores.bentuk_kegiatan === 'Pembangunan Baru' ? 'V' : ''}</td></tr>
            <tr><td>Perbaikan</td><td class="check-col">${scores.bentuk_kegiatan === 'Perbaikan' ? 'V' : ''}</td></tr>
            <tr><td>Penggalian/Penimbunan</td><td class="check-col">${scores.bentuk_kegiatan === 'Penggalian/Penimbunan' ? 'V' : ''}</td></tr>
            <tr><td>Mitigasi Bencana</td><td class="check-col">${scores.bentuk_kegiatan === 'Mitigasi Bencana' ? 'V' : ''}</td></tr>
          </table>
        </div>
      </div>

      <div class="criteria-row">
        <div style="width:150px;">Jarak Lokasi & Akses</div><div style="width:10px;">:</div>
        <div style="flex:1;">
          <table class="table-grid">
            <tr><td>Jauh (> 15 km)</td><td class="check-col">${scores.jarak_akses === 'Jauh (> 15 km)' ? 'V' : ''}</td></tr>
            <tr><td>Menengah (10-15 km)</td><td class="check-col">${scores.jarak_akses === 'Menengah (10-15 km)' ? 'V' : ''}</td></tr>
            <tr><td>Dekat (5-10 km)</td><td class="check-col">${scores.jarak_akses === 'Dekat (5-10 km)' ? 'V' : ''}</td></tr>
            <tr><td>Sangat Dekat (< 5 km)</td><td class="check-col">${scores.jarak_akses === 'Sangat Dekat (< 5 km)' ? 'V' : ''}</td></tr>
          </table>
        </div>
      </div>
      
      <div class="criteria-row">
        <div style="width:150px;">Kebutuhan Alat Berat</div><div style="width:10px;">:</div>
        <div style="flex:1;">
          <table class="table-grid">
            ${equipmentCategories.map(cat => `
              <tr><td>${cat}</td><td class="check-col">${selectedEq === cat ? 'V' : ''}</td></tr>
            `).join('')}
          </table>
        </div>
      </div>

      <table class="table-list">
        <tr><td style="width: 150px;">Panjang Usulan</td><td style="width: 10px;">:</td><td>${panjangUsulan || '...........................................'}</td></tr>
      </table>

      <div class="page-break"></div>
      
      <!-- Page 2: Dokumentasi Foto -->
      <table style="width:100%; border-collapse: collapse; page-break-inside: avoid;">
        <tr><td style="border:1px solid black; text-align:center; font-weight:bold; padding:8px;">SKETSA / GAMBAR / DENAH</td></tr>
        <tr><td style="border:1px solid black; text-align:center; vertical-align:middle; padding: 10px;">
          ${photosBase64.length > 0 ? (
            photosBase64.length === 1 
              ? `<img src="${photosBase64[0]}" style="max-width:100%; max-height:430px; object-fit: contain;" />`
              : `<div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;">
                  ${photosBase64.map((pb, i) => `<div style="text-align:center;"><img src="${pb}" style="max-width:${photosBase64.length === 2 ? '48%' : '31%'}; max-height:280px; object-fit: contain; border: 1px solid #ccc; padding: 4px;" /><br/><small>Foto ${i+1}</small></div>`).join('')}
                </div>`
          ) : ''}
        </td></tr>
        <tr><td style="border:1px solid black; padding:10px; height:120px; vertical-align:top;">
          <span style="text-decoration:underline; font-weight:bold;">KETERANGAN :</span><br/><br/>
          ${keteranganLapangan || '..................................................................................'}
        </td></tr>
      </table>

      <p style="margin-top:30px; text-align: justify;">
      Demikian Berita Acara Peninjauan Lapangan / Pengukuran Bersama ini dibuat dan dipergunakan sebagaimana mestinya.
      </p>

      <div class="sign-container">
        <div style="width:45%; text-align:center;">
          <b>NARASUMBER</b><br/><br/>
          ${signatureNarasumber ? `<img src="${signatureNarasumber}" style="height:150px; width:100%; object-fit: contain;" />` : '<br/><br/><br/><br/><br/>'}
          <br/>
          <span style="text-decoration:underline; font-weight:bold;">${namaNarasumber || '(......................................)'}</span>
        </div>
        <div style="width:45%; text-align:center;">
          <b>SURVEYOR/VERIFIKATOR</b><br/><br/>
          ${signatureSurveyor ? `<img src="${signatureSurveyor}" style="height:150px; width:100%; object-fit: contain;" />` : '<br/><br/><br/><br/><br/>'}
          <br/>
          <span style="text-decoration:underline; font-weight:bold;">${namaSurveyor || '(......................................)'}</span>
        </div>
      </div>

      </body>
      </html>
      `;

      // 3. Generate PDF
      const { uri: pdfUri } = await Print.printToFileAsync({ html: htmlContent, base64: false });

      // OPSI SIMPAN LOKAL (Storage Access Framework)
      if (saveLocal) {
        try {
          let dirUri = await AsyncStorage.getItem('saved_pdf_folder');
          if (!dirUri) {
            const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted) {
              dirUri = permissions.directoryUri;
              await AsyncStorage.setItem('saved_pdf_folder', dirUri);
            }
          }
          if (dirUri) {
            const pdfBase64 = await FileSystem.readAsStringAsync(pdfUri, { encoding: 'base64' });
            const filename = `BA_Survei_${namaUsulanForm.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
            const newUri = await FileSystem.StorageAccessFramework.createFileAsync(dirUri, filename, 'application/pdf');
            await FileSystem.writeAsStringAsync(newUri, pdfBase64, { encoding: 'base64' });
          }
        } catch (storageErr) {
          console.warn('Gagal simpan lokal', storageErr);
        }
      }

      // 4. Submit PDF to API
      const formData = new FormData();
      if (id) formData.append('proposal_id', id as string);
      
      formData.append('section_role', role);
      formData.append('kecamatan', kecamatanForm);
      formData.append('desa', desaForm);
      formData.append('nama_usulan', namaUsulanForm);
      formData.append('equipment_category', selectedEq);
      formData.append('sungai', sungai);
      formData.append('penyebab', penyebab);
      formData.append('kewenangan', kewenangan);
      formData.append('panjang_usulan', panjangUsulan);
      formData.append('keterangan_lapangan', keteranganLapangan);

      // Score for the system (keeps percentage logic for database/schedule prioritization)
      formData.append('dynamic_scores', JSON.stringify(Object.keys(scores).filter(k => k.startsWith('skor_')).map(k => ({
        criteria_id: k.replace('skor_', ''),
        pilihan_label: (scores as any)[k.replace('skor_', '')] || '',
        skor: (scores as any)[k] || 0
      }))));

      formData.append('pdf_file', {
        uri: pdfUri,
        name: 'BA_Survei.pdf',
        type: 'application/pdf'
      } as any);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout
        
        const res = await fetch(`${apiUrl}/proposal/survey-submit`, {
          method: 'POST',
          body: formData,
          headers: { 'Accept': 'application/json' },
          signal: controller.signal as any
        });
        
        clearTimeout(timeoutId);

        if (!res.ok) {
          const err = await res.text();
          throw new Error(err);
        }

        const data = await res.json();
        
        Alert.alert(
          'Sukses',
          'Survei berhasil disubmit. BA PDF telah dibuat dan di-upload.',
          [
            { text: 'Tutup', onPress: () => router.back(), style: 'cancel' }
          ]
        );
      } catch (apiError: any) {
        if (apiError.name === 'AbortError' || apiError.message?.includes('Network request failed') || apiError.message?.includes('Failed to fetch')) {
          // OFFLINE QUEUE LOGIC
          // Karena FormData tidak bisa disimpan ke AsyncStorage dengan mudah,
          // Kita simpan file PDF asli ke documentDirectory agar aman, lalu simpan payload JSON
          const offlinePdfUri = FileSystem.documentDirectory + `offline_${Date.now()}.pdf`;
          await FileSystem.copyAsync({ from: pdfUri, to: offlinePdfUri });
          
          const offlinePayload = {
            id: Date.now().toString(),
            proposal_id: id || null,
            section_role: role,
            kecamatan: kecamatanForm,
            desa: desaForm,
            nama_usulan: namaUsulanForm,
            equipment_category: selectedEq,
            sungai,
            penyebab,
            kewenangan,
            panjang_usulan: panjangUsulan,
            keterangan_lapangan: keteranganLapangan,
            dynamic_scores: Object.keys(scores).filter(k => k.startsWith('skor_')).map(k => ({
              criteria_id: k.replace('skor_', ''),
              pilihan_label: (scores as any)[k.replace('skor_', '')] || '',
              skor: (scores as any)[k] || 0
            })),
            pdfUri: offlinePdfUri,
            timestamp: new Date().toISOString()
          };

          const existingQ = await AsyncStorage.getItem('offline_surveys');
          const queue = existingQ ? JSON.parse(existingQ) : [];
          queue.push(offlinePayload);
          await AsyncStorage.setItem('offline_surveys', JSON.stringify(queue));

          Alert.alert(
            'Mode Offline Aktif',
            'Anda sedang tidak terhubung ke internet. Survei telah disimpan ke Antrean Offline. Jangan lupa tekan "Sync Data Offline" di tab Survei saat internet sudah kembali.',
            [{ text: 'Mengerti', onPress: () => router.back() }]
          );
        } else {
          throw apiError;
        }
      }
    } catch (e: any) {
      Alert.alert('Gagal Submit', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.header}>{id ? `Survei: ${nama}` : 'Survei Urgent (Baru)'}</Text>

        {!id && (
          <View style={styles.urgentSection}>
            <Text style={styles.label}>Nama Usulan</Text>
            <TextInput style={styles.input} value={namaUsulanForm} onChangeText={setNamaUsulanForm} placeholder="Contoh: Normalisasi Kali..." />
            
            <Text style={styles.label}>Kecamatan</Text>
            <TextInput style={styles.input} value={kecamatanForm} onChangeText={setKecamatanForm} placeholder="Kecamatan..." />
            
            <Text style={styles.label}>Desa</Text>
            <TextInput style={styles.input} value={desaForm} onChangeText={setDesaForm} placeholder="Desa..." />
          </View>
        )}

        <Text style={styles.sectionTitle}>Data Berita Acara</Text>
        
        <Text style={styles.label}>Tanggal Survei</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
          <Text style={{color: '#1e293b'}}>{getDayName(tanggal)}, {tanggal.getDate()} {getMonthName(tanggal)} {tanggal.getFullYear()}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={tanggal}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setTanggal(selectedDate);
            }}
          />
        )}
        
        <Text style={styles.label}>Sungai/Avoer</Text>
        <TextInput style={styles.input} value={sungai} onChangeText={setSungai} placeholder="Nama Sungai" />

        <Text style={styles.label}>Penyebab</Text>
        <TextInput style={styles.input} value={penyebab} onChangeText={setPenyebab} placeholder="Penyebab kerusakan/masalah" />

        <Text style={styles.label}>Kewenangan</Text>
        <TextInput style={styles.input} value={kewenangan} onChangeText={setKewenangan} placeholder="Kewenangan (Pusat/Prov/Kab)" />

        <Text style={styles.label}>Panjang Usulan</Text>
        <TextInput style={styles.input} value={panjangUsulan} onChangeText={setPanjangUsulan} placeholder="Contoh: 1500 Meter" />

        <Text style={styles.sectionTitle}>Skoring Kriteria</Text>
        <Text style={styles.label}>1. Kerawanan Bencana</Text>
        <View style={styles.btnRow}>
          {[ {l: 'Kekeringan', s: 1}, {l: 'Banjir Luapan', s: 2}, {l: 'Longsor', s: 3}, {l: 'Banjir Bandang', s: 4} ].map(opt => (
            <TouchableOpacity key={opt.s} style={[styles.optBtn, scores.skor_kerawanan === opt.s && styles.optBtnActive]} 
              onPress={() => setScores({...scores, kerawanan_bencana: opt.l, skor_kerawanan: opt.s})}>
              <Text style={[styles.optText, scores.skor_kerawanan === opt.s && styles.optTextActive]}>{opt.l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>2. Dampak Kerusakan</Text>
        <View style={styles.btnRow}>
          {[ {l: 'Lahan Non Produktif', s: 1}, {l: 'Lahan Produktif', s: 2}, {l: 'Sarana Umum', s: 3}, {l: 'Permukiman', s: 4} ].map(opt => (
            <TouchableOpacity key={opt.s} style={[styles.optBtn, scores.skor_dampak === opt.s && styles.optBtnActive]} 
              onPress={() => setScores({...scores, dampak_kerusakan: opt.l, skor_dampak: opt.s})}>
              <Text style={[styles.optText, scores.skor_dampak === opt.s && styles.optTextActive]}>{opt.l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>3. Kelas Bahaya</Text>
        <View style={styles.btnRow}>
          {[ {l: 'Kecil', s: 1}, {l: 'Sedang', s: 2}, {l: 'Tinggi', s: 3} ].map(opt => (
            <TouchableOpacity key={opt.s} style={[styles.optBtn, scores.skor_bahaya === opt.s && styles.optBtnActive]} 
              onPress={() => setScores({...scores, kelas_bahaya: opt.l, skor_bahaya: opt.s})}>
              <Text style={[styles.optText, scores.skor_bahaya === opt.s && styles.optTextActive]}>{opt.l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>4. Bentuk Kegiatan</Text>
        <View style={styles.btnRow}>
          {[ {l: 'Pembangunan Baru', s: 1}, {l: 'Perbaikan', s: 2}, {l: 'Penggalian/Penimbunan', s: 3}, {l: 'Mitigasi Bencana', s: 4} ].map(opt => (
            <TouchableOpacity key={opt.s} style={[styles.optBtn, scores.skor_bentuk === opt.s && styles.optBtnActive]} 
              onPress={() => setScores({...scores, bentuk_kegiatan: opt.l, skor_bentuk: opt.s})}>
              <Text style={[styles.optText, scores.skor_bentuk === opt.s && styles.optTextActive]}>{opt.l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>5. Jarak Akses</Text>
        <View style={styles.btnRow}>
          {[ {l: 'Jauh (> 15 km)', s: 1}, {l: 'Menengah (10-15 km)', s: 3}, {l: 'Dekat (5-10 km)', s: 6}, {l: 'Sangat Dekat (< 5 km)', s: 9} ].map(opt => (
            <TouchableOpacity key={opt.s} style={[styles.optBtn, scores.skor_jarak === opt.s && styles.optBtnActive]} 
              onPress={() => setScores({...scores, jarak_akses: opt.l, skor_jarak: opt.s})}>
              <Text style={[styles.optText, scores.skor_jarak === opt.s && styles.optTextActive]}>{opt.l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Kebutuhan Alat Berat (Otomatis Jadwal)</Text>
        <View style={styles.btnRow}>
          {equipmentCategories.map(cat => (
            <TouchableOpacity key={cat} style={[styles.optBtn, selectedEq === cat && styles.optBtnActive]} 
              onPress={() => setSelectedEq(cat)}>
              <Text style={[styles.optText, selectedEq === cat && styles.optTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Dokumentasi Lapangan</Text>
        <Text style={styles.desc}>Foto lokasi akan ditaruh di kotak SKETSA/DENAH pada BA. Bisa menambahkan lebih dari 1 foto.</Text>
        <View style={styles.btnRow}>
          <TouchableOpacity style={[styles.actionBtn, { flex: 1 }]} onPress={scanDocument}>
            <Text style={styles.actionBtnText}>📷 Kamera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtnAlt, { flex: 1, marginTop: 5 }]} onPress={pickFromGallery}>
            <Text style={styles.actionBtnAltText}>🖼️ Galeri (Multi-Pilih)</Text>
          </TouchableOpacity>
        </View>
        {photos.length > 0 && (
          <View style={{ marginTop: 10 }}>
            <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{photos.length} foto terpilih</Text>
            {photos.map((p, idx) => (
              <View key={idx} style={{ position: 'relative', marginBottom: 10 }}>
                <Image source={{ uri: p }} style={styles.previewImg} />
                <TouchableOpacity
                  style={{ position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(239,68,68,0.9)', borderRadius: 14, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}
                  onPress={() => removePhoto(idx)}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>✕</Text>
                </TouchableOpacity>
                <Text style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Foto {idx + 1}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Keterangan Lapangan</Text>
        <TextInput style={[styles.input, {height: 80}]} multiline value={keteranganLapangan} onChangeText={setKeteranganLapangan} placeholder="Catatan tambahan surveyor..." />

        <Text style={styles.sectionTitle}>Tanda Tangan Narasumber</Text>
        <TextInput style={styles.input} value={namaNarasumber} onChangeText={setNamaNarasumber} placeholder="Nama Jelas Narasumber" />
        {signatureNarasumber ? (
          <View>
            <Image source={{ uri: signatureNarasumber }} style={styles.previewSign} />
            <TouchableOpacity style={styles.actionBtnAlt} onPress={() => setActiveSignTarget('narasumber')}>
              <Text style={styles.actionBtnAltText}>Ulangi Tanda Tangan Narasumber</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.actionBtn} onPress={() => setActiveSignTarget('narasumber')}>
            <Text style={styles.actionBtnText}>✍️ Buat Tanda Tangan Narasumber</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>Tanda Tangan Surveyor</Text>
        <TextInput style={styles.input} value={namaSurveyor} onChangeText={setNamaSurveyor} placeholder="Nama Jelas Surveyor" />
        {signatureSurveyor ? (
          <View>
            <Image source={{ uri: signatureSurveyor }} style={styles.previewSign} />
            <TouchableOpacity style={styles.actionBtnAlt} onPress={() => setActiveSignTarget('surveyor')}>
              <Text style={styles.actionBtnAltText}>Ulangi Tanda Tangan Surveyor</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.actionBtn} onPress={() => setActiveSignTarget('surveyor')}>
            <Text style={styles.actionBtnText}>✍️ Buat Tanda Tangan Surveyor</Text>
          </TouchableOpacity>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 30, padding: 15, backgroundColor: '#e0f2fe', borderRadius: 8 }}>
          <Text style={{ flex: 1, color: '#0369a1', fontWeight: 'bold' }}>Simpan salinan BA PDF ke folder perangkat?</Text>
          <Switch value={saveLocal} onValueChange={setSaveLocal} />
        </View>
        {saveLocal && <Text style={{ fontSize: 11, color: '#64748b', marginTop: 5, paddingHorizontal: 5 }}>Anda akan diminta memilih/membuat folder saat submit pertama kali.</Text>}

        <TouchableOpacity style={styles.submitBtn} onPress={submitSurvey} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit & Generate BA PDF</Text>}
        </TouchableOpacity>

      </ScrollView>
      </KeyboardAvoidingView>

      {/* Signature Modal */}
      <Modal visible={activeSignTarget !== null} animationType="slide">
        <View style={{flex: 1, backgroundColor: '#fff', paddingTop: 40}}>
          <Text style={{textAlign: 'center', fontSize: 18, fontWeight: 'bold', marginBottom: 10}}>
            Tanda Tangan {activeSignTarget === 'surveyor' ? 'Surveyor' : 'Narasumber'}
          </Text>
          <View style={{flex: 1}}>
            <SignatureScreen
              ref={signatureRef}
              onOK={handleSignature}
              onEmpty={() => Alert.alert('Error', 'Tanda tangan kosong')}
              descriptionText="Tanda Tangan"
              clearText="Hapus"
              confirmText="Simpan"
              webStyle={`.m-signature-pad {box-shadow: none; border: 1px solid #ccc;} .m-signature-pad--footer {display: none; margin: 0px;}`}
            />
          </View>
          <View style={{flexDirection: 'row', padding: 20, gap: 10, paddingBottom: 10}}>
             <TouchableOpacity style={{flex: 1, backgroundColor: '#f59e0b', padding: 15, borderRadius: 8, alignItems: 'center'}} onPress={() => signatureRef.current?.clearSignature()}>
               <Text style={{color: '#fff', fontWeight: 'bold'}}>Hapus</Text>
             </TouchableOpacity>
             <TouchableOpacity style={{flex: 1, backgroundColor: '#16a34a', padding: 15, borderRadius: 8, alignItems: 'center'}} onPress={() => signatureRef.current?.readSignature()}>
               <Text style={{color: '#fff', fontWeight: 'bold'}}>Simpan</Text>
             </TouchableOpacity>
          </View>
          <TouchableOpacity style={{backgroundColor: '#ef4444', padding: 15, marginHorizontal: 20, marginBottom: 20, borderRadius: 8, alignItems: 'center'}} onPress={() => setActiveSignTarget(null)}>
             <Text style={{color: '#fff', fontWeight: 'bold'}}>Batal</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { fontSize: 20, fontWeight: 'bold', color: '#1e3a5f', marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginTop: 25, marginBottom: 5, paddingBottom: 5, borderBottomWidth: 1, borderColor: '#e2e8f0' },
  urgentSection: { backgroundColor: '#fef2f2', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#fca5a5' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#334155', marginTop: 15, marginBottom: 8 },
  desc: { fontSize: 12, color: '#64748b', marginBottom: 10 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, color: '#1e293b' },
  btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optBtn: { padding: 8, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, backgroundColor: '#fff' },
  optBtnActive: { backgroundColor: '#dbeafe', borderColor: '#3b82f6' },
  optText: { fontSize: 12, color: '#475569' },
  optTextActive: { color: '#1d4ed8', fontWeight: 'bold' },
  actionBtn: { backgroundColor: '#1e3a5f', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 5 },
  actionBtnAlt: { backgroundColor: '#f1f5f9', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 5, borderWidth: 1, borderColor: '#cbd5e1' },
  actionBtnText: { color: '#fff', fontWeight: 'bold' },
  actionBtnAltText: { color: '#334155', fontWeight: 'bold' },
  previewImg: { width: '100%', height: 300, borderRadius: 8, marginTop: 10, resizeMode: 'contain' },
  previewSign: { width: '100%', height: 150, borderRadius: 8, marginTop: 10, resizeMode: 'contain', backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1' },
  submitBtn: { backgroundColor: '#16a34a', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 40, marginBottom: 40 },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
