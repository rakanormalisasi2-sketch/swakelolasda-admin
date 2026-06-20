import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    async function checkSession() {
      try {
        const sessionData = await AsyncStorage.getItem('apk_session');
        if (sessionData) {
          const session = JSON.parse(sessionData);
          // Validasi session masih berlaku (expired check bisa ditambahkan)
          if (session.role === 'mekanik') {
            setInitialRoute('admin/form');
          } else if (session.role === 'gudang') {
            setInitialRoute('gudang/index');
          } else if (session.role === 'operator' && session.operatorId) {
            setInitialRoute('operator/laporan');
          }
        }
      } catch (e) {
        console.warn('Session check failed:', e);
      } finally {
        setIsReady(true);
      }
    }
    checkSession();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e3a5f" />
      </View>
    );
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#1e3a5f' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          contentStyle: { backgroundColor: '#edf2f7' },
        }}
        initialRouteName={initialRoute || 'index'}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="operator/index" options={{ title: 'Pilih Operator', headerShown: false }} />
        <Stack.Screen name="operator/laporan" options={{ title: 'Laporan Harian Alat Berat' }} />
        <Stack.Screen name="admin/index" options={{ title: 'Login Admin', headerShown: false }} />
        <Stack.Screen name="admin/form" options={{ title: 'Laporan Mekanik' }} />
        <Stack.Screen name="gudang/index" options={{ title: 'Dashboard Gudang', headerShown: false }} />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f8fc',
  },
});