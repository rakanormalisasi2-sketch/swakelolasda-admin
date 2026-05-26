import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image, Modal } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SignatureCanvas from 'react-native-signature-canvas';

export default function SurveyFormScreen() {
  const { id, nama, kecamatan, desa } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  
  const [photo, setPhoto] = useState<string | null>(null);
  const [scores, setScores] = useState({
    kerawanan_bencana: '', skor_kerawanan: null as any,
    dampak_kerusakan: '', skor_dampak: null as any,
    kelas_bahaya: '', skor_bahaya: null as any,
    bentuk_kegiatan: '', skor_bentuk: null as any,
    jarak_akses: '', skor_jarak: null as any,
  });

  const [sigSurveyor, setSigSurveyor] = useState<string | null>(null);
  const [sigPengusul, setSigPengusul] = useState<string | null>(null);
  const [showSigModal, setShowSigModal] = useState<'surveyor' | 'pengusul' | null>(null);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Error', 'Izin kamera ditolak');

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const generateHTML = () => {
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.5; }
            h2 { text-align: center; text-decoration: underline; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            .signatures { width: 100%; margin-top: 50px; text-align: center; }
            .sig-box { display: inline-block; width: 45%; }
            img { max-width: 150px; height: auto; }
          </style>
        </head>
        <body>
          <h2>BERITA ACARA VERIFIKASI PROPOSAL TAHUN 2026</h2>
          <p>Pada hari ini tanggal <b>${new Date().toLocaleDateString('id-ID')}</b> telah dilakukan survei untuk usulan pekerjaan:</p>
          <table>
            <tr><td><b>Nama Pekerjaan</b></td><td>${nama}</td></tr>
            <tr><td><b>Desa</b></td><td>${desa}</td></tr>
            <tr><td><b>Kecamatan</b></td><td>${kecamatan}</td></tr>
            <tr><td><b>Kerawanan Bencana</b></td><td>${scores.kerawanan_bencana} (Skor: ${scores.skor_kerawanan})</td></tr>
            <tr><td><b>Dampak Kerusakan</b></td><td>${scores.dampak_kerusakan} (Skor: ${scores.skor_dampak})</td></tr>
            <tr><td><b>Kelas Bahaya</b></td><td>${scores.kelas_bahaya} (Skor: ${scores.skor_bahaya})</td></tr>
            <tr><td><b>Bentuk Kegiatan</b></td><td>${scores.bentuk_kegiatan} (Skor: ${scores.skor_bentuk})</td></tr>
            <tr><td><b>Jarak Akses</b></td><td>${scores.jarak_akses} (Skor: ${scores.skor_jarak})</td></tr>
          </table>

          <div class="signatures">
            <div class="sig-box">
              <p>Pengusul</p>
              ${sigPengusul ? `<img src="${sigPengusul}" />` : '<br><br><br>'}
              <p>(______________________)</p>
            </div>
            <div class="sig-box">
              <p>Tim Verifikator</p>
              ${sigSurveyor ? `<img src="${sigSurveyor}" />` : '<br><br><br>'}
              <p>(______________________)</p>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const submitSurvey = async () => {
    if (!scores.skor_kerawanan || !scores.skor_dampak || !scores.skor_bahaya || !scores.skor_bentuk || !scores.skor_jarak) {
      return Alert.alert('Error', 'Semua kriteria wajib diisi');
    }
    if (!sigSurveyor || !sigPengusul) {
      return Alert.alert('Error', 'Kedua tanda tangan wajib diisi');
    }

    setLoading(true);
    try {
      // 1. Generate PDF
      const { uri: pdfUri } = await Print.printToFileAsync({ html: generateHTML() });
      
      // Provide option to save locally or share before upload
      try {
        await Sharing.shareAsync(pdfUri, { dialogTitle: 'Simpan / Bagikan Berita Acara PDF' });
      } catch (e) {
        console.warn('Share cancelled or failed', e);
      }
      
      const sess = await AsyncStorage.getItem('apk_session');
      const role = sess ? JSON.parse(sess).role : 'seksi_normalisasi';

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:3000/api';
      
      // 2. Prepare Form Data
      const formData = new FormData();
      formData.append('proposal_id', id as string);
      formData.append('scores', JSON.stringify(scores));
      formData.append('section_role', role);
      formData.append('kecamatan', kecamatan as string);
      formData.append('desa', desa as string);
      formData.append('nama_usulan', nama as string);

      // Attach PDF
      formData.append('pdf_file', {
        uri: pdfUri,
        name: 'ba_survei.pdf',
        type: 'application/pdf'
      } as any);

      // Attach Photo
      if (photo) {
        formData.append('photo_file', {
          uri: photo,
          name: 'foto.jpg',
          type: 'image/jpeg'
        } as any);
      }

      // 3. Send
      const res = await fetch(`${apiUrl}/proposal/survey-submit`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          // Note: fetch will set the multipart/form-data boundary automatically
        }
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      Alert.alert('Sukses', 'Survey berhasil diupload ke Google Drive dan Database!');
      router.back();
    } catch (e: any) {
      Alert.alert('Gagal Upload', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.header}>Survei: {nama}</Text>

        {/* Criterias - simplified for code size, just using Picker or Buttons. We'll use simple touchable lists for UX */}
        <Text style={styles.label}>1. Kerawanan Bencana (Max 4)</Text>
        <View style={styles.btnRow}>
          {[ {l: 'Kekeringan', s: 1}, {l: 'Banjir Luapan', s: 2}, {l: 'Longsor', s: 3}, {l: 'Banjir Bandang', s: 4} ].map(opt => (
            <TouchableOpacity key={opt.s} style={[styles.optBtn, scores.skor_kerawanan === opt.s && styles.optBtnActive]} 
              onPress={() => setScores({...scores, kerawanan_bencana: opt.l, skor_kerawanan: opt.s})}>
              <Text style={[styles.optText, scores.skor_kerawanan === opt.s && styles.optTextActive]}>{opt.l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>2. Dampak Kerusakan (Max 4)</Text>
        <View style={styles.btnRow}>
          {[ {l: 'Lahan Non Produktif', s: 1}, {l: 'Lahan Produktif', s: 2}, {l: 'Sarana Umum', s: 3}, {l: 'Permukiman', s: 4} ].map(opt => (
            <TouchableOpacity key={opt.s} style={[styles.optBtn, scores.skor_dampak === opt.s && styles.optBtnActive]} 
              onPress={() => setScores({...scores, dampak_kerusakan: opt.l, skor_dampak: opt.s})}>
              <Text style={[styles.optText, scores.skor_dampak === opt.s && styles.optTextActive]}>{opt.l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>3. Kelas Bahaya (Max 3)</Text>
        <View style={styles.btnRow}>
          {[ {l: 'Kecil', s: 1}, {l: 'Sedang', s: 2}, {l: 'Tinggi', s: 3} ].map(opt => (
            <TouchableOpacity key={opt.s} style={[styles.optBtn, scores.skor_bahaya === opt.s && styles.optBtnActive]} 
              onPress={() => setScores({...scores, kelas_bahaya: opt.l, skor_bahaya: opt.s})}>
              <Text style={[styles.optText, scores.skor_bahaya === opt.s && styles.optTextActive]}>{opt.l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>4. Bentuk Kegiatan (Max 4)</Text>
        <View style={styles.btnRow}>
          {[ {l: 'Pembangunan Baru', s: 1}, {l: 'Perbaikan', s: 2}, {l: 'Penggalian', s: 3}, {l: 'Mitigasi', s: 4} ].map(opt => (
            <TouchableOpacity key={opt.s} style={[styles.optBtn, scores.skor_bentuk === opt.s && styles.optBtnActive]} 
              onPress={() => setScores({...scores, bentuk_kegiatan: opt.l, skor_bentuk: opt.s})}>
              <Text style={[styles.optText, scores.skor_bentuk === opt.s && styles.optTextActive]}>{opt.l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>5. Jarak Akses (Max 9)</Text>
        <View style={styles.btnRow}>
          {[ {l: '15km', s: 1}, {l: '10-15km', s: 3}, {l: '5-10km', s: 6}, {l: '<5km', s: 9} ].map(opt => (
            <TouchableOpacity key={opt.s} style={[styles.optBtn, scores.skor_jarak === opt.s && styles.optBtnActive]} 
              onPress={() => setScores({...scores, jarak_akses: opt.l, skor_jarak: opt.s})}>
              <Text style={[styles.optText, scores.skor_jarak === opt.s && styles.optTextActive]}>{opt.l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Dokumentasi Lapangan</Text>
        <TouchableOpacity style={styles.actionBtn} onPress={takePhoto}>
          <Text style={styles.actionBtnText}>📷 Ambil Foto</Text>
        </TouchableOpacity>
        {photo && <Image source={{ uri: photo }} style={styles.previewImg} />}

        <Text style={styles.label}>Tanda Tangan</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={[styles.actionBtn, {flex:1, backgroundColor: sigPengusul ? '#16a34a' : '#1e3a5f'}]} onPress={() => setShowSigModal('pengusul')}>
            <Text style={styles.actionBtnText}>{sigPengusul ? '✅ TTD Pengusul' : '✍️ TTD Pengusul'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, {flex:1, backgroundColor: sigSurveyor ? '#16a34a' : '#1e3a5f'}]} onPress={() => setShowSigModal('surveyor')}>
            <Text style={styles.actionBtnText}>{sigSurveyor ? '✅ TTD Surveyor' : '✍️ TTD Surveyor'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={submitSurvey} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Simpan & Upload BA (PDF)</Text>}
        </TouchableOpacity>

      </ScrollView>

      {/* Signature Modal */}
      <Modal visible={!!showSigModal} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#fff', padding: 20, paddingTop: 50 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
            Tanda Tangan {showSigModal === 'pengusul' ? 'Pengusul' : 'Surveyor'}
          </Text>
          <View style={{ height: 300, borderColor: '#ccc', borderWidth: 1 }}>
            <SignatureCanvas
              onOK={(signature) => {
                if (showSigModal === 'pengusul') setSigPengusul(signature);
                else setSigSurveyor(signature);
                setShowSigModal(null);
              }}
              onEmpty={() => Alert.alert('Error', 'Tanda tangan kosong')}
              descriptionText="Tanda Tangan di atas"
              clearText="Hapus"
              confirmText="Simpan"
            />
          </View>
          <TouchableOpacity style={[styles.actionBtn, {marginTop: 20, backgroundColor: '#ef4444'}]} onPress={() => setShowSigModal(null)}>
            <Text style={styles.actionBtnText}>Batal</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { fontSize: 20, fontWeight: 'bold', color: '#1e3a5f', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#334155', marginTop: 15, marginBottom: 8 },
  btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optBtn: { padding: 8, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, backgroundColor: '#fff' },
  optBtnActive: { backgroundColor: '#dbeafe', borderColor: '#3b82f6' },
  optText: { fontSize: 12, color: '#475569' },
  optTextActive: { color: '#1d4ed8', fontWeight: 'bold' },
  actionBtn: { backgroundColor: '#1e3a5f', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 5 },
  actionBtnText: { color: '#fff', fontWeight: 'bold' },
  previewImg: { width: '100%', height: 200, borderRadius: 8, marginTop: 10, resizeMode: 'cover' },
  submitBtn: { backgroundColor: '#16a34a', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 30, marginBottom: 40 },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
