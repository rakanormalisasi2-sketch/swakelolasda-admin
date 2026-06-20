import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Modal, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

export default function ListProposalScreen() {
  const [role, setRole] = useState('seksi_normalisasi');
  const [search, setSearch] = useState('');
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tahun, setTahun] = useState(new Date().getFullYear().toString());

  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('apk_session').then(sess => {
      let currentRole = 'seksi_normalisasi';
      if (sess) {
        currentRole = JSON.parse(sess).role;
        setRole(currentRole);
      }
      fetchProposals(currentRole, tahun);
    });
  }, []);

  const fetchProposals = async (currentRole = role, currentTahun = tahun) => {
    setLoading(true);
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://swakelolasda.vercel.app/api';
      const res = await fetch(`${apiUrl}/proposal?tahun=${currentTahun}&role=${currentRole}`);
      if (res.ok) {
        const data = await res.json();
        setProposals(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Gagal memuat data proposal');
    } finally {
      setLoading(false);
    }
  };

  const filtered = proposals.filter((p: any) => {
    const term = search.toLowerCase();
    return (
      (p.nama_usulan || '').toLowerCase().includes(term) ||
      (p.desa || '').toLowerCase().includes(term) ||
      (p.kecamatan || '').toLowerCase().includes(term) ||
      (p.nomor_urut?.toString() || '').includes(term)
    );
  });

  const openDetail = (item: any) => {
    setSelectedProposal(item);
    setIsEditMode(false);
    setEditData({
      nama_usulan: item.nama_usulan || '',
      desa: item.desa || '',
      kecamatan: item.kecamatan || '',
      kabupaten: item.kabupaten || '',
      panjang_lokasi: item.panjang_lokasi || '',
      keterangan: item.keterangan || '',
      usulan_desa: item.usulan_desa || '',
    });
  };

  const handleSave = async () => {
    if (!selectedProposal) return;
    setSaving(true);
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://swakelolasda.vercel.app/api';
      const res = await fetch(`${apiUrl}/proposal`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedProposal.id, ...editData })
      });
      if (res.ok) {
        Alert.alert('Berhasil', 'Data proposal berhasil diperbarui');
        setIsEditMode(false);
        // Update local data
        setProposals(prev => prev.map((p: any) =>
          p.id === selectedProposal.id ? { ...p, ...editData } : p
        ));
        setSelectedProposal((prev: any) => ({ ...prev, ...editData }));
      } else {
        Alert.alert('Gagal', 'Gagal menyimpan perubahan');
      }
    } catch (e) {
      Alert.alert('Error', 'Terjadi kesalahan saat menyimpan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>List Proposal</Text>
      </View>

      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Cari Usulan, Desa, Kecamatan..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#94a3b8"
        />
        <TextInput
          style={[styles.searchInput, { flex: 0.35 }]}
          placeholder="Tahun"
          value={tahun}
          onChangeText={setTahun}
          keyboardType="numeric"
          placeholderTextColor="#94a3b8"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={() => fetchProposals()}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cari</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 50 }} color="#1e3a5f" />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {filtered.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#64748b', marginTop: 50 }}>Tidak ada data proposal.</Text>
          ) : (
            filtered.map((item: any, idx: number) => (
              <TouchableOpacity key={item.id} style={styles.card} onPress={() => openDetail(item)}>
                <View style={styles.cardHeader}>
                  <View style={styles.noUrutBadge}>
                    <Text style={styles.noUrutText}>{item.nomor_urut || idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{item.nama_usulan || '-'}</Text>
                    <Text style={styles.cardSub}>📍 {item.desa || '-'}, Kec. {item.kecamatan || '-'}</Text>
                  </View>
                  <View style={[styles.surveyBadge, { backgroundColor: item.sudah_survey ? '#dcfce7' : '#fef3c7' }]}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: item.sudah_survey ? '#16a34a' : '#d97706' }}>
                      {item.sudah_survey ? '✅ Survei' : '⏳ Belum'}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardFooter}>
                  <Text style={styles.footerText}>📅 {item.tanggal_usulan ? item.tanggal_usulan.split('T')[0] : '-'}</Text>
                  <Text style={styles.footerText}>📐 {item.panjang_lokasi || '-'} m</Text>
                  {item.link_proposal && <Text style={[styles.footerText, { color: '#3b82f6' }]}>🔗 Link BA</Text>}
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* Modal Detail */}
      {selectedProposal && (
        <Modal visible={true} animationType="slide" transparent={true} onRequestClose={() => setSelectedProposal(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Detail Proposal</Text>
                <TouchableOpacity onPress={() => setSelectedProposal(null)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>Tutup</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ padding: 16 }}>
                {/* No Urut & Nama Usulan */}
                <View style={styles.detailRow}>
                  <View style={{ width: 80 }}>
                    <Text style={styles.detailLabel}>No. Urut</Text>
                    <Text style={styles.detailValue}>{selectedProposal.nomor_urut || '-'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailLabel}>Nama Usulan</Text>
                    {isEditMode ? (
                      <TextInput style={styles.editInput} value={editData.nama_usulan} onChangeText={v => setEditData({...editData, nama_usulan: v})} />
                    ) : (
                      <Text style={styles.detailValue}>{selectedProposal.nama_usulan || '-'}</Text>
                    )}
                  </View>
                </View>

                {/* Tanggal Usulan */}
                <Text style={[styles.detailLabel, { marginTop: 12 }]}>Tanggal Usulan</Text>
                <Text style={styles.detailValue}>{selectedProposal.tanggal_usulan ? selectedProposal.tanggal_usulan.split('T')[0] : '-'}</Text>

                {/* Kecamatan & Desa */}
                <View style={[styles.detailRow, { marginTop: 12 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailLabel}>Kecamatan</Text>
                    {isEditMode ? (
                      <TextInput style={styles.editInput} value={editData.kecamatan} onChangeText={v => setEditData({...editData, kecamatan: v})} />
                    ) : (
                      <Text style={styles.detailValue}>{selectedProposal.kecamatan || '-'}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailLabel}>Desa</Text>
                    {isEditMode ? (
                      <TextInput style={styles.editInput} value={editData.desa} onChangeText={v => setEditData({...editData, desa: v})} />
                    ) : (
                      <Text style={styles.detailValue}>{selectedProposal.desa || '-'}</Text>
                    )}
                  </View>
                </View>

                {/* Kabupaten */}
                <Text style={[styles.detailLabel, { marginTop: 12 }]}>Kabupaten</Text>
                {isEditMode ? (
                  <TextInput style={styles.editInput} value={editData.kabupaten} onChangeText={v => setEditData({...editData, kabupaten: v})} />
                ) : (
                  <Text style={styles.detailValue}>{selectedProposal.kabupaten || '-'}</Text>
                )}

                {/* Panjang Lokasi */}
                <Text style={[styles.detailLabel, { marginTop: 12 }]}>Panjang Lokasi</Text>
                {isEditMode ? (
                  <TextInput style={styles.editInput} value={editData.panjang_lokasi} onChangeText={v => setEditData({...editData, panjang_lokasi: v})} keyboardType="numeric" />
                ) : (
                  <Text style={styles.detailValue}>{selectedProposal.panjang_lokasi || '-'}</Text>
                )}

                {/* Usulan */}
                <Text style={[styles.detailLabel, { marginTop: 12 }]}>Usulan</Text>
                {isEditMode ? (
                  <TextInput style={styles.editInput} value={editData.usulan_desa} onChangeText={v => setEditData({...editData, usulan_desa: v})} />
                ) : (
                  <Text style={styles.detailValue}>{selectedProposal.usulan_desa || '-'}</Text>
                )}

                {/* Keterangan */}
                <Text style={[styles.detailLabel, { marginTop: 12 }]}>Keterangan</Text>
                {isEditMode ? (
                  <TextInput style={[styles.editInput, { minHeight: 60 }]} value={editData.keterangan} onChangeText={v => setEditData({...editData, keterangan: v})} multiline />
                ) : (
                  <Text style={styles.detailValue}>{selectedProposal.keterangan || '-'}</Text>
                )}

                {/* Link BA */}
                {selectedProposal.link_proposal && (
                  <>
                    <Text style={[styles.detailLabel, { marginTop: 12 }]}>Link Berita Acara</Text>
                    <TouchableOpacity onPress={() => Linking.openURL(selectedProposal.link_proposal)}>
                      <Text style={[styles.detailValue, { color: '#3b82f6', textDecorationLine: 'underline' }]}>📎 Buka Dokumen BA</Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* Status Survey */}
                <View style={styles.divider} />
                <View style={styles.statusRow}>
                  <Text style={styles.detailLabel}>Status Survey</Text>
                  <View style={[styles.statusBadge, { backgroundColor: selectedProposal.sudah_survey ? '#dcfce7' : '#fef3c7' }]}>
                    <Text style={{ color: selectedProposal.sudah_survey ? '#16a34a' : '#d97706', fontWeight: 'bold', fontSize: 12 }}>
                      {selectedProposal.sudah_survey ? '✅ Sudah Disurvey' : '⏳ Belum Disurvey'}
                    </Text>
                  </View>
                </View>
                {selectedProposal.tanggal_survey && (
                  <>
                    <Text style={[styles.detailLabel, { marginTop: 8 }]}>Tanggal Survey</Text>
                    <Text style={styles.detailValue}>{selectedProposal.tanggal_survey.split('T')[0]}</Text>
                  </>
                )}

                <View style={styles.divider} />

                {/* Edit / Save Buttons */}
                <View style={{ flexDirection: 'column', gap: 10 }}>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      style={[styles.actionBtn, isEditMode && styles.actionBtnDanger]}
                      onPress={() => {
                        if (isEditMode) {
                          setIsEditMode(false);
                          // Reset edit data
                          setEditData({
                            nama_usulan: selectedProposal.nama_usulan || '',
                            desa: selectedProposal.desa || '',
                            kecamatan: selectedProposal.kecamatan || '',
                            kabupaten: selectedProposal.kabupaten || '',
                            panjang_lokasi: selectedProposal.panjang_lokasi || '',
                            keterangan: selectedProposal.keterangan || '',
                            usulan_desa: selectedProposal.usulan_desa || '',
                          });
                        } else {
                          setIsEditMode(true);
                        }
                      }}
                    >
                      <Text style={[styles.actionBtnText, isEditMode && { color: '#dc2626' }]}>
                        {isEditMode ? 'Batal Edit' : '✏️ Edit Data'}
                      </Text>
                    </TouchableOpacity>

                    {isEditMode && (
                      <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSave]} onPress={handleSave} disabled={saving}>
                        <Text style={[styles.actionBtnText, { color: '#fff' }]}>
                          {saving ? 'Menyimpan...' : '💾 Simpan'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Tombol Buat Ulang BA Survei jika sudah disurvey */}
                  {!isEditMode && selectedProposal.sudah_survey && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#e0f2fe', borderColor: '#bae6fd' }]}
                      onPress={() => {
                        const { id, nama_usulan, kecamatan, desa } = selectedProposal;
                        setSelectedProposal(null);
                        router.push({
                          pathname: '/proposal/form',
                          params: { id, nama: nama_usulan, kecamatan, desa }
                        });
                      }}
                    >
                      <Text style={[styles.actionBtnText, { color: '#0369a1' }]}>
                        📝 Edit / Buat Ulang BA Survei (Generate PDF)
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  headerContainer: { padding: 15, paddingBottom: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  header: { fontSize: 20, fontWeight: 'bold', color: '#1e3a5f' },
  searchBox: { flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 10, gap: 8, backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  searchInput: { flex: 1, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, height: 44, fontSize: 13 },
  searchBtn: { backgroundColor: '#1e3a5f', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, borderRadius: 8, height: 44 },

  card: { backgroundColor: '#fff', padding: 14, borderRadius: 12, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  noUrutBadge: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#1e3a5f', justifyContent: 'center', alignItems: 'center' },
  noUrutText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  cardSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  surveyBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  surveyBadgeText: { fontSize: 14 },
  cardFooter: { flexDirection: 'row', gap: 12, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderColor: '#f1f5f9' },
  footerText: { fontSize: 11, color: '#64748b' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#e2e8f0' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e3a5f' },
  closeBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  closeBtnText: { color: '#64748b', fontWeight: 'bold', fontSize: 13 },

  detailRow: { flexDirection: 'row', gap: 10 },
  detailLabel: { fontSize: 11, color: '#64748b', fontWeight: 'bold', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { fontSize: 14, color: '#0f172a', backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  editInput: { fontSize: 14, color: '#0f172a', backgroundColor: '#fff', padding: 10, borderRadius: 8, borderWidth: 1.5, borderColor: '#3b82f6' },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 16 },

  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },

  actionBtn: { flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1' },
  actionBtnDanger: { backgroundColor: '#fef2f2', borderColor: '#fca5a5' },
  actionBtnSave: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  actionBtnText: { fontWeight: 'bold', fontSize: 13, color: '#334155' },
});
