import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Modal, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import DocumentScanner from '@preeternal/react-native-document-scanner-plugin';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import WILAYAH from '@/lib/wilayah';

const CustomPicker = ({ label, value, options, onSelect }: { label: string, value: string, options: string[], onSelect: (val: string) => void }) => {
  const [modalVisible, setModalVisible] = useState(false);
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>{label} *</Text>
      <TouchableOpacity style={styles.input} onPress={() => setModalVisible(true)}>
        <Text style={{ color: value ? '#1e293b' : '#94a3b8' }}>{value || `Pilih ${label}...`}</Text>
      </TouchableOpacity>
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pilih {label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => { onSelect(item); setModalVisible(false); }}>
                  <Text style={{ fontSize: 16 }}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalVisible(false)}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default function FormRekapScreen() {
  const [role, setRole] = useState('seksi_normalisasi');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nama_usulan: '',
    tanggal_usulan: '',
    desa: '',
    kecamatan: '',
    kabupaten: 'Bojonegoro',
    panjang_lokasi: '',
    usulan_desa: '',
    tahun_pelaksanaan: new Date().getFullYear().toString(),
    keterangan: '',
    link_proposal: ''
  });

  const [uploadingDoc, setUploadingDoc] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('apk_session').then(sess => {
      if (sess) {
        const { role } = JSON.parse(sess);
        setRole(role);
        setForm(f => ({ ...f, usulan_desa: role === 'seksi_embung' ? 'embung' : 'normalisasi' }));
      }
    });
  }, []);

  const uploadToBackend = async (uri: string, name: string, mimeType: string) => {
    if (!form.nama_usulan) {
      Alert.alert('Perhatian', 'Harap isi Nama Usulan terlebih dahulu sebelum mengupload dokumen.');
      return null;
    }
    
    setUploadingDoc(true);
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.144:3000/api';
      const formData = new FormData();
      formData.append('file', {
        uri,
        name,
        type: mimeType
      } as any);
      formData.append('section_role', role);
      formData.append('proposal_name', form.nama_usulan);

      const res = await fetch(`${apiUrl}/upload/proposal-doc`, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      
      Alert.alert('Berhasil', 'Dokumen terupload ke Google Drive!');
      return data.url;
    } catch (e: any) {
      Alert.alert('Gagal Upload', e.message);
      return null;
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleScanAI = async () => {
    try {
      const { scannedImages } = await DocumentScanner.scanDocument({
        maxNumDocuments: 10,
        croppedImageQuality: 70
      });

      if (scannedImages && scannedImages.length > 0) {
        setUploadingDoc(true);
        // Convert scanned images to PDF
        let html = '';
        for (const imgUri of scannedImages) {
          const base64 = await FileSystem.readAsStringAsync(imgUri, { encoding: FileSystem.EncodingType.Base64 });
          html += `<div style="page-break-after: always;"><img src="data:image/jpeg;base64,${base64}" style="width: 100%;" /></div>`;
        }
        
        const { uri: pdfUri } = await Print.printToFileAsync({ html });
        const name = `Proposal_Scanned_${Date.now()}.pdf`;
        const link = await uploadToBackend(pdfUri, name, 'application/pdf');
        
        if (link) setForm({...form, link_proposal: link});
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal membuka Scanner AI.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handlePickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true
      });

      if (!res.canceled && res.assets.length > 0) {
        const file = res.assets[0];
        const link = await uploadToBackend(file.uri, file.name, file.mimeType || 'application/pdf');
        if (link) setForm({...form, link_proposal: link});
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal memilih file.');
    }
  };

  const submitForm = async () => {
    if (!form.nama_usulan || !form.kecamatan || !form.desa) {
      return Alert.alert('Error', 'Nama Usulan, Kecamatan, dan Desa wajib diisi!');
    }

    setLoading(true);
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.144:3000/api';
      
      const payload = {
        ...form,
        tahun: new Date().getFullYear(),
        created_by_role: role,
        tahun_pelaksanaan: form.tahun_pelaksanaan ? parseInt(form.tahun_pelaksanaan) : null
      };

      const res = await fetch(`${apiUrl}/proposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Gagal menyimpan');
      
      Alert.alert('Sukses', 'Proposal berhasil disimpan!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const kecamatanOptions = Object.keys(WILAYAH).sort();
  const desaOptions = form.kecamatan ? (WILAYAH[form.kecamatan] || []).sort() : [];

  const handleLogout = async () => {
    await AsyncStorage.removeItem('apk_session');
    router.replace('/');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Text style={[styles.header, { marginBottom: 0 }]}>Input Rekap Proposal</Text>
          <TouchableOpacity 
            style={{ backgroundColor: '#64748b', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
            onPress={() => router.back()}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>Kembali</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.label}>Nama Usulan *</Text>
        <TextInput style={styles.input} value={form.nama_usulan} onChangeText={t => setForm({...form, nama_usulan: t})} placeholder="Contoh: Normalisasi Kali X" />

        <Text style={styles.label}>Tanggal Usulan (YYYY-MM-DD)</Text>
        <TextInput style={styles.input} value={form.tanggal_usulan} onChangeText={t => setForm({...form, tanggal_usulan: t})} placeholder="2026-05-20" />

        <CustomPicker 
          label="Kecamatan" 
          value={form.kecamatan} 
          options={kecamatanOptions} 
          onSelect={(val) => setForm({...form, kecamatan: val, desa: ''})} 
        />

        <CustomPicker 
          label="Desa" 
          value={form.desa} 
          options={desaOptions} 
          onSelect={(val) => setForm({...form, desa: val})} 
        />

        <Text style={styles.label}>Kabupaten</Text>
        <TextInput style={styles.input} value={form.kabupaten} onChangeText={t => setForm({...form, kabupaten: t})} />

        <Text style={styles.label}>Panjang Lokasi</Text>
        <TextInput style={styles.input} value={form.panjang_lokasi} onChangeText={t => setForm({...form, panjang_lokasi: t})} placeholder="Contoh: 1000m" />

        <Text style={styles.label}>Usulan Desa</Text>
        <TextInput style={styles.input} value={form.usulan_desa} onChangeText={t => setForm({...form, usulan_desa: t})} />

        <Text style={styles.label}>Tahun Pelaksanaan</Text>
        <TextInput style={styles.input} value={form.tahun_pelaksanaan} keyboardType="numeric" onChangeText={t => setForm({...form, tahun_pelaksanaan: t})} />

        <Text style={styles.label}>Keterangan</Text>
        <TextInput style={styles.input} value={form.keterangan} multiline onChangeText={t => setForm({...form, keterangan: t})} />

        <Text style={styles.label}>Dokumen Proposal (Pilih salah satu metode)</Text>
        
        <View style={styles.docActions}>
          <TouchableOpacity style={styles.docBtn} onPress={handleScanAI} disabled={uploadingDoc}>
            <Text style={styles.docBtnText}>📸 Scan AI</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.docBtn} onPress={handlePickFile} disabled={uploadingDoc}>
            <Text style={styles.docBtnText}>📁 Pilih File</Text>
          </TouchableOpacity>
        </View>
        
        {uploadingDoc && <Text style={{color: '#3b82f6', marginBottom: 10}}>Mengupload dokumen ke Google Drive...</Text>}

        <Text style={styles.label}>Link Dokumen Proposal (Opsional)</Text>
        <TextInput 
          style={styles.input} 
          value={form.link_proposal} 
          onChangeText={t => setForm({...form, link_proposal: t})} 
          placeholder="Paste Link Google Drive di sini..." 
        />

        <TouchableOpacity style={styles.btn} onPress={submitForm} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Simpan Proposal</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { fontSize: 22, fontWeight: 'bold', color: '#1e3a5f', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, marginBottom: 16, color: '#1e293b' },
  btn: { backgroundColor: '#16a34a', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 10, marginBottom: 40 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, maxHeight: '80%', padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#1e3a5f' },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalCloseBtn: { marginTop: 15, backgroundColor: '#ef4444', padding: 12, borderRadius: 8, alignItems: 'center' },
  docActions: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  docBtn: { flex: 1, backgroundColor: '#3b82f6', padding: 12, borderRadius: 8, alignItems: 'center' },
  docBtnText: { color: '#fff', fontWeight: 'bold' }
});
