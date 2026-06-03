import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RekapitulasiListScreen() {
  const [role, setRole] = useState('seksi_normalisasi');
  const [search, setSearch] = useState('');
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tahun, setTahun] = useState(new Date().getFullYear());

  useEffect(() => {
    AsyncStorage.getItem('apk_session').then(sess => {
      let currentRole = 'seksi_normalisasi';
      if (sess) {
        currentRole = JSON.parse(sess).role;
        setRole(currentRole);
      }
      fetchProposals(currentRole, tahun);
    });
  }, []);

  const fetchProposals = async (currentRole = role, currentTahun = tahun) => {
    setLoading(true);
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.144:3000/api';
      const res = await fetch(`${apiUrl}/proposal?tahun=${currentTahun}&role=${currentRole}`);
      if (res.ok) {
        const data = await res.json();
        setProposals(data);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Gagal memuat data proposal');
    } finally {
      setLoading(false);
    }
  };

  const filtered = proposals.filter((p: any) => 
    p.nama_usulan?.toLowerCase().includes(search.toLowerCase()) || 
    p.desa?.toLowerCase().includes(search.toLowerCase()) ||
    p.kecamatan?.toLowerCase().includes(search.toLowerCase())
  );

  const handleLogout = async () => {
    await AsyncStorage.removeItem('apk_session');
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Rekapitulasi Proposal</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity 
            style={styles.addBtn}
            onPress={() => router.push('/proposal/form-rekap')}
          >
            <Text style={styles.addBtnText}>+ Tambah</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.addBtn, { backgroundColor: '#64748b' }]}
            onPress={handleLogout}
          >
            <Text style={styles.addBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.searchBox}>
        <TextInput 
          style={styles.searchInput} 
          placeholder="Cari Desa, Kecamatan, Nama Usulan..." 
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={() => fetchProposals()}>
          <Text style={{color: '#fff'}}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 50 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {filtered.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#64748b', marginTop: 50 }}>Tidak ada proposal ditemukan.</Text>
          ) : (
            filtered.map((item: any) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.nama_usulan}</Text>
                  {item.sudah_survey && <Text style={styles.badge}>✅ Disurvey</Text>}
                </View>
                <Text style={styles.cardSub}>📍 {item.desa || '-'}, Kec. {item.kecamatan || '-'}</Text>
                <Text style={styles.cardSub}>📅 {item.tanggal_usulan ? item.tanggal_usulan.split('T')[0] : '-'}</Text>
                <Text style={styles.cardSub}>📝 {item.keterangan || '-'}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, paddingBottom: 10, flexWrap: 'wrap', gap: 10 },
  header: { fontSize: 20, fontWeight: 'bold', color: '#1e3a5f' },
  addBtn: { backgroundColor: '#16a34a', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  searchBox: { flexDirection: 'row', paddingHorizontal: 15, marginBottom: 10, gap: 10 },
  searchInput: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12 },
  searchBtn: { backgroundColor: '#1e3a5f', justifyContent: 'center', paddingHorizontal: 16, borderRadius: 8 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', flex: 1 },
  badge: { backgroundColor: '#dcfce7', color: '#16a34a', fontSize: 11, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginLeft: 8 },
  cardSub: { fontSize: 13, color: '#64748b', marginBottom: 4 }
});
