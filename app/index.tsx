import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, Image, SafeAreaView
} from 'react-native';
import { router } from 'expo-router';

export default function SplashScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3a5f" />

      {/* Header / Logo Area */}
      <View style={styles.header}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>🏗️</Text>
        </View>
        <Text style={styles.appName}>SWAKELOLASDA</Text>
        <Text style={styles.appSubtitle}>Dinas PU SDA Kabupaten Bojonegoro</Text>
      </View>

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.welcomeText}>Selamat Datang</Text>
        <Text style={styles.chooseText}>Pilih peran Anda untuk melanjutkan</Text>

        <TouchableOpacity
          style={[styles.roleCard, styles.operatorCard]}
          onPress={() => router.push('/operator')}
          activeOpacity={0.85}
        >
          <Text style={styles.roleIcon}>👷</Text>
          <View style={styles.roleTextBox}>
            <Text style={styles.roleTitle}>Operator</Text>
            <Text style={styles.roleDesc}>Input laporan harian alat berat & upload foto progress</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.roleCard, styles.mekanikCard]}
          onPress={() => router.push('/admin')}
          activeOpacity={0.85}
        >
          <Text style={styles.roleIcon}>🔧</Text>
          <View style={styles.roleTextBox}>
            <Text style={styles.roleTitle}>Admin</Text>
            <Text style={styles.roleDesc}>Akses untuk Mekanik, Gudang, dan fitur khusus lainnya</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>v2.0 · E-Monitoring Alat Berat</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e3a5f',
  },
  header: {
    flex: 0.42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  logoText: { fontSize: 44 },
  appName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1,
  },
  appSubtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  body: {
    flex: 0.52,
    backgroundColor: '#edf2f7',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e3a5f',
    marginBottom: 4,
  },
  chooseText: {
    fontSize: 13,
    color: '#718096',
    marginBottom: 22,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  operatorCard: { backgroundColor: '#fff', borderLeftWidth: 4, borderLeftColor: '#1e3a5f' },
  mekanikCard: { backgroundColor: '#fff', borderLeftWidth: 4, borderLeftColor: '#d69e2e' },
  roleIcon: { fontSize: 34, marginRight: 14 },
  roleTextBox: { flex: 1 },
  roleTitle: { fontSize: 16, fontWeight: '700', color: '#1a202c', marginBottom: 3 },
  roleDesc: { fontSize: 12, color: '#718096', lineHeight: 16 },
  arrow: { fontSize: 24, color: '#a0aec0', fontWeight: '300' },
  footer: {
    flex: 0.06,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    paddingBottom: 8,
    backgroundColor: '#edf2f7',
  },
});
