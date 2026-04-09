import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, TextInput, ActivityIndicator, StatusBar
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

type Operator = { id: string; full_name: string; };

export default function PilihOperatorScreen() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [filtered, setFiltered]   = useState<Operator[]>([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    loadOperators();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(operators.filter(o => o.full_name.toLowerCase().includes(q)));
  }, [search, operators]);

  const loadOperators = async () => {
    setLoading(true);
    const { data: ops } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('role', 'operator')
      .order('full_name');

    const list: Operator[] = (ops || [])
      .filter(o => o.full_name.toLowerCase() !== 'operator test')
      .map(o => ({
        id: o.id,
        full_name: o.full_name,
      }));

    setOperators(list);
    setFiltered(list);
    setLoading(false);
  };

  const handlePilih = (op: Operator) => {
    // Pass operator data via params to laporan screen
    router.push({
      pathname: '/operator/laporan',
      params: { operatorId: op.id, operatorName: op.full_name },
    });
  };

  const renderItem = ({ item }: { item: Operator }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handlePilih(item)}
      activeOpacity={0.8}
    >
      <View style={styles.avatarBox}>
        <Text style={styles.avatarText}>
          {item.full_name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.nameBox}>
        <Text style={styles.opName}>{item.full_name}</Text>
      </View>
      <Text style={styles.arrowIcon}>›</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3a5f" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Siapa kamu?</Text>
        <Text style={styles.headerSub}>Pilih nama untuk melanjutkan ke form laporan</Text>
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Cari nama operator..."
          placeholderTextColor="#a0aec0"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1e3a5f" />
          <Text style={styles.loadingText}>Memuat data operator...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Tidak ada operator ditemukan</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fc' },
  header: {
    backgroundColor: '#1e3a5f',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 22,
  },
  backBtn: { marginBottom: 10 },
  backText: { color: 'rgba(255,255,255,0.8)', fontSize: 15 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 4 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 14,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, height: 46, fontSize: 14, color: '#1a202c' },
  list: { paddingHorizontal: 14, paddingBottom: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 1,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  nameBox: { flex: 1 },
  opName: { fontSize: 16, fontWeight: '700', color: '#1a202c' },
  arrowIcon: { fontSize: 26, color: '#cbd5e0' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: '#718096', fontSize: 14 },
  emptyText: { textAlign: 'center', color: '#a0aec0', marginTop: 40, fontSize: 14 },
});
