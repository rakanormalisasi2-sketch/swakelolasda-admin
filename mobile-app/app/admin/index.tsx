import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabaseWarehouse } from '@/lib/supabaseWarehouse';

export default function AdminPasswordScreen() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const sessionStr = await AsyncStorage.getItem('apk_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (session.role === 'mekanik') {
          router.replace('/admin/menu');
          return;
        } else if (session.role === 'gudang') {
          router.replace('/gudang/index');
          return;
        }
      }
    } catch (e) {
      console.warn('Gagal cek sesi:', e);
    } finally {
      setCheckingSession(false);
    }
  };

  const handleLogin = async () => {
    if (!password) return Alert.alert('Error', 'Masukkan password.');
    setLoading(true);

    try {
      const passInput = password.trim();

      // Ambil password terbaru dari server (DB2)
      const { data: settings, error } = await supabaseWarehouse
        .from('app_settings')
        .select('config_key, config_value')
        .in('config_key', ['apk_password_mekanik', 'apk_password_gudang']);

      if (error) throw error;

      const passMekanik = settings?.find(s => s.config_key === 'apk_password_mekanik')?.config_value || 'mekanik2024';
      const passGudang = settings?.find(s => s.config_key === 'apk_password_gudang')?.config_value || 'gudang2024';

      // Validasi
      if (passInput === passMekanik) {
        await AsyncStorage.setItem('apk_session', JSON.stringify({
          role: 'mekanik',
          loggedInAt: new Date().toISOString(),
        }));
        router.replace('/admin/menu');
      } else if (passInput === passGudang) {
        await AsyncStorage.setItem('apk_session', JSON.stringify({
          role: 'gudang',
          loggedInAt: new Date().toISOString(),
        }));
        router.replace('/gudang/index');
      } else {
        Alert.alert('Akses Ditolak', 'Password tidak dikenali. Silakan hubungi Superadmin.');
        setPassword('');
      }
    } catch (e: any) {
      Alert.alert('Error', 'Gagal verifikasi ke server: ' + e.message);
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#92400e" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/')} style={styles.backBtn} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 24, marginRight: 4 }}>‹</Text>
            <Text style={styles.backText}>Beranda</Text>
          </View>
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

        <Text style={styles.hint}>
          Hint: Password default adalah "mekanik" atau "gudang"
        </Text>
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
  backBtn: { position: 'absolute', top: 10, left: 20, zIndex: 10 },
  backText: { color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: '600' },
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
  hint: {
    marginTop: 20,
    fontSize: 12,
    color: '#a0aec0',
    textAlign: 'center',
  },
});