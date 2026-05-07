import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, Image, SafeAreaView, Animated, Easing
} from 'react-native';
import { router } from 'expo-router';

export default function SplashScreen() {
  const [isReady, setIsReady] = useState(false);
  
  // Animation Values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const contentFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Jalankan animasi denyut (pulse) berulang pada logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Simulasi loading 2 detik sebelum masuk menu
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setIsReady(true);
        Animated.timing(contentFade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3a5f" />

      {/* --- MENU UTAMA (Menunggu Ready) --- */}
      {isReady && (
        <Animated.View style={[{ flex: 1, opacity: contentFade }]}>
          {/* Header Internal */}
          <View style={styles.header}>
            <View style={styles.logoCircleSmall}>
              {/* Gambar Logo dari aset lokal pengguna */}
              <Image 
                source={require('../assets/images/logo.png')} 
                style={{ width: 45, height: 45, resizeMode: 'contain' }}
                defaultSource={{ uri: 'https://via.placeholder.com/45/1e3a5f/FFFFFF?text=Logo' }} 
              />
            </View>
            <Text style={styles.appName}>SWAKELOLASDA</Text>
            <Text style={styles.appSubtitle}>Dinas PU SDA Kabupaten Bojonegoro</Text>
          </View>

          {/* Body Menu Utama */}
          <View style={styles.body}>
            <Text style={styles.welcomeText}>Selamat Datang</Text>
            <Text style={styles.chooseText}>Pilih peran Anda untuk melanjutkan</Text>

            <TouchableOpacity style={[styles.roleCard, styles.operatorCard]} onPress={() => router.push('/operator')} activeOpacity={0.85}>
              <Text style={styles.roleIcon}>👷</Text>
              <View style={styles.roleTextBox}>
                <Text style={styles.roleTitle}>Operator</Text>
                <Text style={styles.roleDesc}>Input laporan harian alat berat & upload foto progress</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.roleCard, styles.mekanikCard]} onPress={() => router.push('/admin/' as any)} activeOpacity={0.85}>
              <Text style={styles.roleIcon}>🔧</Text>
              <View style={styles.roleTextBox}>
                <Text style={styles.roleTitle}>Admin</Text>
                <Text style={styles.roleDesc}>Akses untuk Mekanik, Gudang, dan fitur khusus lainnya</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>v2.0 · E-Monitoring Alat Berat</Text>
        </Animated.View>
      )}

      {/* --- OVERLAY ANIMASI LOADING AWAL --- */}
      {!isReady && (
        <Animated.View style={[styles.splashOverlay, { opacity: fadeAnim }]}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }], alignItems: 'center' }}>
            <View style={styles.logoCircleBig}>
              {/* Gambar Logo Start */}
              <Image 
                source={require('../assets/images/logo.png')} 
                style={{ width: 150, height: 150, resizeMode: 'contain', borderRadius: 75 }} 
              />
            </View>
            <Text style={styles.splashTitle}>SWAKELOLASDA</Text>
            <Text style={styles.splashSub}>PU SDA Bojonegoro</Text>
          </Animated.View>

          <View style={styles.loadingBox}>
            <View style={styles.loadingBarOutline}>
              <Animated.View style={[styles.loadingBarFill, { opacity: pulseAnim }]} />
            </View>
            <Text style={styles.loadingText}>Memuat sistem...</Text>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e3a5f' },
  header: { flex: 0.35, alignItems: 'center', justifyContent: 'center', paddingTop: 10 },
  logoCircleSmall: {
    width: 65, height: 65, borderRadius: 32.5, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
    elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 3
  },
  appName: { color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: 1 },
  appSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4, textAlign: 'center' },
  body: {
    flex: 0.65, backgroundColor: '#edf2f7', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 20, paddingTop: 32,
  },
  welcomeText: { fontSize: 24, fontWeight: '800', color: '#1e3a5f', marginBottom: 4 },
  chooseText: { fontSize: 13.5, color: '#64748b', marginBottom: 28 },
  roleCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 18, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  operatorCard: { backgroundColor: '#fff', borderLeftWidth: 5, borderLeftColor: '#1e3a5f' },
  mekanikCard: { backgroundColor: '#fff', borderLeftWidth: 5, borderLeftColor: '#d69e2e' },
  roleIcon: { fontSize: 36, marginRight: 16 },
  roleTextBox: { flex: 1 },
  roleTitle: { fontSize: 17, fontWeight: '700', color: '#1a202c', marginBottom: 4 },
  roleDesc: { fontSize: 12.5, color: '#718096', lineHeight: 18 },
  arrow: { fontSize: 24, color: '#cbd5e1', fontWeight: '300' },
  footer: { position: 'absolute', bottom: 10, alignSelf: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  
  // Gaya Animasi Overlay Loading
  splashOverlay: {
    position: 'absolute', inset: 0, backgroundColor: '#1e3a5f',
    alignItems: 'center', justifyContent: 'center', zIndex: 999
  },
  logoCircleBig: {
    width: 160, height: 160, borderRadius: 80, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
    elevation: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10
  },
  splashTitle: { color: '#fff', fontSize: 32, fontWeight: '800', letterSpacing: 2 },
  splashSub: { color: '#93c5fd', fontSize: 16, marginTop: 6, fontWeight: '500', letterSpacing: 1 },
  loadingBox: { position: 'absolute', bottom: 60, alignItems: 'center', width: '100%' },
  loadingBarOutline: { width: 140, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden', marginBottom: 12 },
  loadingBarFill: { width: '60%', height: '100%', backgroundColor: '#fff', borderRadius: 3 },
  loadingText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '500' }
});
