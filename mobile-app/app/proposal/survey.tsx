import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SurveySearchScreen() {
  const [role, setRole] = useState('seksi_normalisasi');
  const [search, setSearch] = useState('');
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('apk_session').then(sess => {
      if (sess) {
        setRole(JSON.parse(sess).role);
      }
      fetchProposals();
    });
  }, []);

  const fetchProposals = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:3000/api';
      const res = await fetch(`${apiUrl}/proposal/survey-search?role=${role}`);
      if (res.ok) {
        const data = await res.json();
        setProposals(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = proposals.filter((p: any) => 
    p.nama_usulan?.toLowerCase().includes(search.toLowerCase()) || 
    p.desa?.toLowerCase().includes(search.toLowerCase()) ||
    p.kecamatan?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Daftar Proposal (Survei)</Text>
      
      <View style={styles.searchBox}>
        <TextInput 
          style={styles.searchInput} 
          placeholder="Cari Desa, Kecamatan, Nama Usulan..." 
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={fetchProposals}>
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
              <TouchableOpacity 
                key={item.id} 
                style={styles.card}
                onPress={() => router.push(`/proposal/form?id=${item.id}&nama=${encodeURIComponent(item.nama_usulan)}&kecamatan=${item.kecamatan || ''}&desa=${item.desa || ''}`)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.nama_usulan}</Text>
                  {item.sudah_survey && <Text style={styles.badge}>✅ Disurvey</Text>}
                </View>
                <Text style={styles.cardSub}>📍 {item.desa || '-'}, Kec. {item.kecamatan || '-'}</Text>
                <Text style={styles.cardSub}>📅 {item.tanggal_usulan ? item.tanggal_usulan.split('T')[0] : '-'}</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { fontSize: 22, fontWeight: 'bold', color: '#1e3a5f', padding: 20, paddingBottom: 10 },
  searchBox: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 10, gap: 10 },
  searchInput: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12 },
  searchBtn: { backgroundColor: '#1e3a5f', justifyContent: 'center', paddingHorizontal: 16, borderRadius: 8 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', flex: 1 },
  badge: { backgroundColor: '#dcfce7', color: '#16a34a', fontSize: 11, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginLeft: 8 },
  cardSub: { fontSize: 13, color: '#64748b', marginBottom: 4 }
});
