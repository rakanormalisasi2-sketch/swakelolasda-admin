import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, Alert } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MekanikMenuScreen() {
  const handleLogout = () => {
    Alert.alert('Keluar', 'Yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: async () => {
        await AsyncStorage.removeItem('apk_session');
        router.replace('/admin');
      }}
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#92400e" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Menu Mekanik</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout 🚪</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <Text style={styles.welcome}>Selamat Bekerja, Mekanik</Text>
        <Text style={styles.subtitle}>Pilih jenis laporan yang ingin Anda buat hari ini:</Text>

        <TouchableOpacity 
          style={[styles.card, { borderLeftColor: '#f59e0b' }]} 
          onPress={() => router.push('/admin/pemeriksaan')}
          activeOpacity={0.8}
        >
          <View style={styles.iconBox}>
            <Text style={styles.icon}>🔍</Text>
          </View>
          <View style={styles.textBox}>
            <Text style={styles.cardTitle}>Laporan Pemeriksaan</Text>
            <Text style={styles.cardDesc}>Cek rutin, lapor kerusakan, & request suku cadang/BHP ke gudang.</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.card, { borderLeftColor: '#d97706' }]} 
          onPress={() => router.push('/admin/form')}
          activeOpacity={0.8}
        >
          <View style={styles.iconBox}>
            <Text style={styles.icon}>🔧</Text>
          </View>
          <View style={styles.textBox}>
            <Text style={styles.cardTitle}>Laporan Perbaikan</Text>
            <Text style={styles.cardDesc}>Update progres perbaikan alat yang sedang dikerjakan.</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>E-Monitoring Alat Berat v2.0</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fefce8' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#92400e',
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  logoutText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  body: { padding: 20, flex: 1 },
  welcome: { fontSize: 22, fontWeight: '800', color: '#1e293b', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 6,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#fffbeb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  icon: { fontSize: 28 },
  textBox: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  cardDesc: { fontSize: 12, color: '#64748b', lineHeight: 18 },
  arrow: { fontSize: 24, color: '#cbd5e1', fontWeight: '300' },
  footer: { textAlign: 'center', padding: 20, color: '#cbd5e1', fontSize: 12 },
});
