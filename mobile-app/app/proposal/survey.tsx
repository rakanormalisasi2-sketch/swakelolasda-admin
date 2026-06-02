import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

export default function SurveySearchScreen() {
  const [role, setRole] = useState('seksi_normalisasi');
  const [search, setSearch] = useState('');
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('apk_session').then(sess => {
      let currentRole = 'seksi_normalisasi';
      if (sess) {
        let r = JSON.parse(sess).role;
        if (r === 'survey_normalisasi') r = 'seksi_normalisasi';
        if (r === 'survey_embung') r = 'seksi_embung';
        currentRole = r;
        setRole(r);
      }
      fetchProposals(currentRole);
    });
    checkOfflineQueue();
  }, []);

  const checkOfflineQueue = async () => {
    try {
      const q = await AsyncStorage.getItem('offline_surveys');
      if (q) setOfflineQueue(JSON.parse(q));
    } catch(e) {}
  };

  const syncOfflineData = async () => {
    if (offlineQueue.length === 0) return;
    setSyncing(true);
    let successCount = 0;
    
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.144:3000/api';
      const remainingQueue = [...offlineQueue];

      for (let i = 0; i < offlineQueue.length; i++) {
        const item = offlineQueue[i];
        
        const formData = new FormData();
        if (item.proposal_id) formData.append('proposal_id', item.proposal_id);
        formData.append('section_role', item.section_role);
        formData.append('kecamatan', item.kecamatan);
        formData.append('desa', item.desa);
        formData.append('nama_usulan', item.nama_usulan);
        formData.append('equipment_id', item.equipment_id);
        formData.append('dynamic_scores', JSON.stringify(item.dynamic_scores || item.scores));
        
        formData.append('pdf_file', {
          uri: item.pdfUri,
          name: 'BA_Survei_Offline.pdf',
          type: 'application/pdf'
        } as any);

        try {
          const res = await fetch(`${apiUrl}/proposal/survey-submit`, {
            method: 'POST',
            body: formData,
            headers: { 'Accept': 'application/json' }
          });
          
          if (res.ok) {
            successCount++;
            // Remove from remaining queue
            const idx = remainingQueue.findIndex(q => q.id === item.id);
            if (idx > -1) remainingQueue.splice(idx, 1);
            // Delete local temp pdf
            try { await FileSystem.deleteAsync(item.pdfUri); } catch(e) {}
          }
        } catch (err) {
          console.warn('Sync failed for item', item.id);
          // Stop syncing if network is still down
          break;
        }
      }

      setOfflineQueue(remainingQueue);
      await AsyncStorage.setItem('offline_surveys', JSON.stringify(remainingQueue));
      
      Alert.alert('Hasil Sinkronisasi', `Berhasil mensinkronkan ${successCount} data.`);
      if (successCount > 0) fetchProposals();
      
    } catch (e: any) {
      Alert.alert('Gagal Sync', e.message);
    } finally {
      setSyncing(false);
    }
  };

  const fetchProposals = async (currentRole = role) => {
    setLoading(true);
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.144:3000/api';
      const res = await fetch(`${apiUrl}/proposal/survey-search?role=${currentRole}`);
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

  const handleLogout = async () => {
    await AsyncStorage.removeItem('apk_session');
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Daftar Proposal (Survei)</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity 
            style={styles.urgentBtn}
            onPress={() => router.push('/proposal/form')}
          >
            <Text style={styles.urgentBtnText}>+ Survei Urgent</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.urgentBtn, { backgroundColor: '#64748b' }]}
            onPress={handleLogout}
          >
            <Text style={styles.urgentBtnText}>Logout</Text>
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
        <TouchableOpacity style={styles.searchBtn} onPress={() => { fetchProposals(); checkOfflineQueue(); }}>
          <Text style={{color: '#fff'}}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {offlineQueue.length > 0 && (
        <View style={styles.offlineBox}>
          <Text style={{flex: 1, color: '#854d0e', fontWeight: 'bold'}}>Ada {offlineQueue.length} survei belum terkirim.</Text>
          <TouchableOpacity style={styles.syncBtn} onPress={syncOfflineData} disabled={syncing}>
            {syncing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 12}}>🔄 Sync</Text>}
          </TouchableOpacity>
        </View>
      )}

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
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, paddingBottom: 10, flexWrap: 'wrap', gap: 10 },
  header: { fontSize: 20, fontWeight: 'bold', color: '#1e3a5f' },
  urgentBtn: { backgroundColor: '#ef4444', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  urgentBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  searchBox: { flexDirection: 'row', paddingHorizontal: 15, marginBottom: 10, gap: 10 },
  searchInput: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12 },
  searchBtn: { backgroundColor: '#1e3a5f', justifyContent: 'center', paddingHorizontal: 16, borderRadius: 8 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', flex: 1 },
  badge: { backgroundColor: '#dcfce7', color: '#16a34a', fontSize: 11, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginLeft: 8 },
  cardSub: { fontSize: 13, color: '#64748b', marginBottom: 4 },
  offlineBox: { backgroundColor: '#fef08a', marginHorizontal: 15, marginBottom: 10, padding: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  syncBtn: { backgroundColor: '#eab308', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 }
});
