import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Modal, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

export default function RekapitulasiScreen() {
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

  useEffect(() => {
    AsyncStorage.getItem('apk_session').then(sess => {
      if (sess) {
        const { role } = JSON.parse(sess);
        setRole(role);
        setForm(f => ({ ...f, usulan_desa: role === 'seksi_embung' ? 'embung' : 'normalisasi' }));
      }
    });
  }, []);

  const submitForm = async () => {
    if (!form.nama_usulan || !form.kecamatan || !form.desa) {
      return Alert.alert('Error', 'Nama Usulan, Kecamatan, dan Desa wajib diisi!');
    }

    setLoading(true);
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:3000/api';
      
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
      
      Alert.alert('Sukses', 'Proposal berhasil disimpan!');
      setForm({
        ...form,
        nama_usulan: '',
        tanggal_usulan: '',
        desa: '',
        kecamatan: '',
        panjang_lokasi: '',
        keterangan: '',
        link_proposal: ''
      });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const kecamatanOptions = Object.keys(WILAYAH.Bojonegoro).sort();
  const desaOptions = form.kecamatan ? (WILAYAH.Bojonegoro[form.kecamatan] || []).sort() : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.header}>Input Rekap Proposal</Text>
      
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

      <Text style={styles.label}>Link Proposal (Google Drive)</Text>
      <TextInput style={styles.input} value={form.link_proposal} onChangeText={t => setForm({...form, link_proposal: t})} placeholder="https://..." />

      <TouchableOpacity style={styles.btn} onPress={submitForm} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Simpan Proposal</Text>}
      </TouchableOpacity>
    </ScrollView>
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
  modalCloseBtn: { marginTop: 15, backgroundColor: '#ef4444', padding: 12, borderRadius: 8, alignItems: 'center' }
});
