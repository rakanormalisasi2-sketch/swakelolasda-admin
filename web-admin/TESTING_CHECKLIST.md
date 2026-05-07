# RAP Module - Testing Checklist

## Prerequisites
- [ ] Login sebagai role `seksi_normalisasi`
- [ ] Pastikan ada data assignments di database

---

## 1. Test Export Excel

### Test Case: EXP-001 - Export Excel 11 Sheets

**Steps:**
1. Buka halaman `/dashboard/seksi/perhitungan-rap`
2. Login sebagai seksi_normalisasi
3. Klik Tab 1 "Geometri"
4. Isi data geometri:
   - Panjang: 500
   - b₁: 4.000
   - b₂: 2.857
   - b₃: 6.857
   - h: 1.000
   - h': 2.500
5. Lihat 5 STA otomatis ter-generate
6. Klik tombol **"📊 Export Excel"** di header

**Expected Result:**
- [ ] Browser mendownload file `.xlsx`
- [ ] Nama file sesuai format: `RAP_NAMA_PEKERJAAN_YYYY-MM-DD.xlsx`
- [ ] File bisa dibuka di Excel/Google Sheets

**Verification - Buka file Excel, cek setiap sheet:**
- [ ] Sheet 1: `ANALISA perencanaan` - Ada data T.1, Q1, Q2, H
- [ ] Sheet 2: `backup volume rencana` - Ada 5 STA dengan dimensi
- [ ] Sheet 3: `PERSONIL` - Ada data personil
- [ ] Sheet 4: `RAB PERSONIL` - Ada subtotal + PPN 12%
- [ ] Sheet 5: `RAB PEKERJAAN` - Ada Grand Total + Pagu + Sisa
- [ ] Sheet 6: `ANALISA pelaksanaan` - Ada verifikasi T.1
- [ ] Sheet 7: `Kebutuhan realismo` - Ada tabel harian
- [ ] Sheet 8: `backup volume Pelaksanaan` - Ada 5 STA
- [ ] Sheet 9: `PERSONIL pelaksanaan` - Ada koefisien
- [ ] Sheet 10: `RAB PERSONIL PELAKSANAAN` - Ada total
- [ ] Sheet 11: `RAB PELAKSANAAN` - Ada Pagu + Sisa Pagu

**Total: 11 sheets**

---

## 2. Test Print Gambar

### Test Case: PRN-001 - Print Cross-Section Images

**Steps:**
1. Di halaman yang sama
2. Scroll ke bawah ke bagian "Gambar Cross-Section (5 STA)"
3. Pastikan ada 5 gambar ter-render
4. Klik tombol **"🖨️ Print Gambar"** di header

**Expected Result:**
- [ ] Window baru terbuka dengan print preview
- [ ] Ada 10 gambar cross-section (5 Perencanaan + 5 Pelaksanaan)
- [ ] Setiap gambar punya:
  - Kontur eksisting (garis biru meliuk-liuk)
  - Garis rencana (trapesium hitam)
  - Area galian di-arsir VERTIKAL (│ │ │ │)
  - Kop vertikal di kanan dengan data program/kegiatan

**Verification per gambar:**
- [ ] STA label visible
- [ ] Dimensi labels (b₁, b₃, h, h') visible
- [ ] Luas area galian ter-label
- [ ] Legenda ada (Kontur Eksisting, Rencana Galian, Area Galian)
- [ ] Ground level line (Muka Tanah) visible

---

## 3. Test Tab Navigation

**Steps:**
1. Klik Tab 2 "Excavator"
   - [ ] Pilih excavator PC200/PC100/PC75/PC50/PC200LA
   - [ ] Cell kuning ter-update (T.1, Q1, Q2, H)

2. Klik Tab 3 "Realisasi"
   - [ ] Klik "Pilih Laporan dari Database"
   - [ ] Pilih salah satu assignment
   - [ ] Data daily muncul
   - [ ] GoalSeek result menampilkan sisa BBM 40-100 liter

3. Klik Tab 4 "Verifikasi"
   - [ ] T.1 hasil terlihat
   - [ ] Range SNI PC200 = 0.31 - 0.66 menit
   - [ ] Status: WAJAR/TERLALU_CEPAT/TERLALU_LAMBAT

4. Klik Tab 5 "Volume Pelaksanaan"
   - [ ] 5 STA ter-generate
   - [ ] Total volume = Total galian dari Tab 3
   - [ ] STA 0 = STA 0 Tab 1
   - [ ] Gambar cross-section ada

5. Klik Tab 6 "Personil"
   - [ ] Durasi Hari ter-hitung
   - [ ] Total HOK = durasi × 2
   - [ ] Kebutuhan Solar ter-hitung

6. Klik Tab 7 "RAB Personil"
   - [ ] Subtotal ter-hitung
   - [ ] PPN 12% ter-hitung
   - [ ] Total pembulatan ter-显示

7. Klik Tab 8 "RAB Final"
   - [ ] Grand Total ter-hitung
   - [ ] Pagu = 3,600,000,000
   - [ ] Sisa Pagu = Pagu - Grand Total

8. Klik Tab 9 "TTD & Cetak"
   - [ ] Form TTD editable
   - [ ] Tombol Export Excel berfungsi

---

## 4. Test Data Persistence

**Steps:**
1. Isi semua data di Tab 1-8
2. Refresh browser (F5)
3. Login lagi

**Expected Result:**
- [ ] TTD tetap tersimpan (dari localStorage)
- [ ] Data geometri perlu di-input ulang (session-based)

---

## Bug Report Template

Jika menemukan bug, gunakan format ini:

```
## Bug Report

**Test Case:** [EXP-001 / PRN-001 / etc]
**Date:** YYYY-MM-DD
**Browser:** Chrome/Firefox/Edge
**Screenshot:** [attach screenshot]

**Description:**
[Jelaskan bug yang ditemukan]

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]

**Expected:**
[Apa yang seharusnya terjadi]

**Actual:**
[Apa yang terjadi sebenarnya]

**Severity:** [Critical / Major / Minor]
```

---

## Test Results Log

| Date | Tester | Test Case | Result | Notes |
|------|--------|-----------|--------|-------|
| 2026-04-21 | - | EXP-001 | PENDING | - |
| 2026-04-21 | - | PRN-001 | PENDING | - |

---

## Quick Test - Minimal Flow

1. Login → Buka RAP page
2. Tab 1 → Lihat 5 STA + gambar
3. Tab 9 → Export Excel
4. Tab 9 → Print Gambar

**Minimum pass criteria:**
- [ ] Export Excel download works
- [ ] Print window opens with images
- [ ] 5 gambar cross-section render per tab