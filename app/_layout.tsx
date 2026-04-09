import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#1e3a5f' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          contentStyle: { backgroundColor: '#edf2f7' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="operator/index" options={{ title: 'Pilih Operator', headerShown: false }} />
        <Stack.Screen name="operator/laporan" options={{ title: 'Laporan Harian Alat Berat' }} />
        <Stack.Screen name="mekanik/index" options={{ title: 'Login Admin Mekanik', headerShown: false }} />
        <Stack.Screen name="mekanik/form" options={{ title: 'Laporan Mekanik' }} />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
