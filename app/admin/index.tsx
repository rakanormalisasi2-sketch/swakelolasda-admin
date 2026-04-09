import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';

const PASSWORD = 'mekanik';

export default function AdminPasswordScreen() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = () => {
    if (!password) return Alert.alert('Error', 'Masukkan password.');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const pass = password.toLowerCase().trim();
      
      if (pass === 'mekanik') {
        router.replace('/admin/form');
      } else if (pass === 'gudang') {
        Alert.alert('⏳ Segera Hadir', 'Halaman Gudang akan segera tersedia pada pengembangan selanjutnya.');
        setPassword('');
      } else {
        Alert.alert('❌ Akses Ditolak', 'Password tidak dikenali. Hubungi operator sistem.');
        setPassword('');
      }
    }, 600);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#92400e" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.icon}>🔐</Text>
        <Text style={styles.title}>Portal Admin</Text>
        <Text style={styles.subtitle}>Akses Fitur Khusus E-Monitoring</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Masukkan Kredensial</Text>
        <Text style={styles.cardSub}>Akses akan menyesuaikan dengan password Anda</Text>

        <View style={styles.passRow}>
          <TextInput
            style={styles.passInput}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPass}
            placeholder="Password..."
            placeholderTextColor="#a0aec0"
            autoCapitalize="none"
            onSubmitEditing={handleLogin}
          />
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPass(v => !v)}
          >
            <Text style={styles.eyeText}>{showPass ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.loginText}>Masuk →</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#92400e' },
  header: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  backBtn: { position: 'absolute', top: 16, left: 20 },
  backText: { color: 'rgba(255,255,255,0.8)', fontSize: 15 },
  icon: { fontSize: 60, marginBottom: 12 },
  title: { color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: 1 },
  subtitle: { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 4 },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 30,
    paddingTop: 36,
  },
  cardTitle: { fontSize: 20, fontWeight: '800', color: '#1a202c', marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#718096', marginBottom: 28 },
  passRow: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: '#cbd5e0',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  passInput: {
    flex: 1,
    padding: 14,
    fontSize: 15,
    color: '#1a202c',
    backgroundColor: '#f7fafc',
  },
  eyeBtn: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    backgroundColor: '#f7fafc',
  },
  eyeText: { fontSize: 20 },
  loginBtn: {
    backgroundColor: '#92400e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
