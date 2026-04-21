# PROMPT UNTUK CLAUDE CODE — Rekonstruksi Modul Perhitungan RAP

> **INSTRUKSI UTAMA**: Copy-paste SELURUH isi file ini ke terminal Claude Code sebagai satu prompt tunggal.

---

Claude, ini adalah misi besar multi-agen. Kamu adalah pelaksana utama (implementor). Agen lain bernama **Antigravity** bertugas sebagai reviewer, tester, dan deployer. Semua konteks pekerjaan sudah didokumentasikan secara lengkap. Bacalah semua file referensi berikut SEBELUM menulis satu baris kode pun.

## FILE YANG WAJIB KAMU BACA DULU (Baca SEMUA sebelum coding!)

0. **Kronologi Sesi Hari Ini (BACA PERTAMA)**:
   ```
   c:\Users\dinas\OneDrive\Desktop\kode\web-admin\SESSION_HISTORY.md
   ```
   Berisi: Timeline lengkap dari jam 14:30 hingga 21:17 — semua keputusan desain, bug yang diperbaiki, perubahan arsitektur, dan status terkini. WAJIB baca agar kamu paham konteks penuh kenapa kode saat ini berbentuk seperti ini.

1. **Implementation Plan (Cetak Biru Arsitektur)**:
   ```
   C:\Users\dinas\.gemini\antigravity\brain\77f6933f-abeb-40c2-80a1-b3ffefde0f0e\implementation_plan.md
   ```
   Berisi: Pemetaan lengkap 9 Sheet Excel ke UI, formula kritis, alur GoalSeek, format KOP gambar teknik, pembagian tugas, dan open questions.

2. **Analisis Raw Data Excel Master**:
   ```
   c:\Users\dinas\OneDrive\Desktop\kode\web-admin\EXCEL_ANALYSIS.md
   ```
   Berisi: Dump lengkap byte-per-byte dari `pc 200.xlsx` — semua formula, tabel referensi SNI, struktur setiap sheet, contoh data riil.

3. **File Excel Master Asli** (baca untuk verifikasi):
   ```
   D:\DATA\GAWEAN 2025\laporan normalisasi\Laporan RAB normalisasi 2025\master\pc 200.xlsx
   D:\DATA\GAWEAN 2025\laporan normalisasi\Laporan RAB normalisasi 2025\master\PC75.xlsx
   D:\DATA\GAWEAN 2025\laporan normalisasi\Laporan RAB normalisasi 2025\master\pc 50.xlsx
   D:\DATA\GAWEAN 2025\laporan normalisasi\Laporan RAB normalisasi 2025\master\PC 100 .xlsx
   D:\DATA\GAWEAN 2025\laporan normalisasi\Laporan RAB normalisasi 2025\master\PC 200 LONG ARM.xlsx
   ```

4. **Referensi Gambar Teknik**:
   ```
   C:\Users\dinas\Downloads\gambar teknik.png          ← GAYA penampang melintang (bentuk sungai, arsiran, dimensi)
   C:\Users\dinas\Downloads\SUNGAI SEMAR MENDEM JEMBATAwwN.pdf   ← FORMAT KOP / Title Block (kolom vertikal di sisi KANAN gambar)
   ```
   **PENTING**: KOP gambar teknik Dinas PU SDA Bojonegoro menggunakan **kolom vertikal di SISI KANAN** gambar (bukan header horizontal di atas). Lihat implementation_plan.md untuk layout detail.

5. **Kode Eksisting yang akan kamu modifikasi**:
   ```
   c:\Users\dinas\OneDrive\Desktop\kode\web-admin\src\app\dashboard\seksi\perhitungan-rap\page.js
   c:\Users\dinas\OneDrive\Desktop\kode\web-admin\src\utils\calcRapMath.js
   c:\Users\dinas\OneDrive\Desktop\kode\web-admin\src\components\DrawCrossSection.js
   ```

## KONTEKS HISTORIS (Apa yang sudah dikerjakan sebelumnya)

Proyek ini adalah **Sistem Administrasi Swakelola Dinas PU SDA Bojonegoro** (Next.js 16 + Supabase). Berikut ringkasan progress:

### Database
- **DB1** (`ratmptlcrjifuplokask.supabase.co`): Auth, Assignments, Equipment, operator_logs, user_profiles, app_settings
- **DB2** (`rpggkbkmowdbxtgfgbop.supabase.co`): BBM (bbm_pengadaan, bbm_pemakaian)

### Fitur yang SUDAH JADI (jangan sentuh/rusak):
- Login/Auth system (AuthContext.js)
- Dashboard Operator, Peralatan, Peralatan/Perbaikan
- Manajemen BBM (Seksi > BBM) — sudah ada tombol Unduh Excel
- Laporan Pelaksanaan (Seksi > Laporan) — sudah ada cetak PDF/Excel harian+mingguan
- Penugasan, Proposal, Pengaturan Sistem
- Peta GIS, Status Operasional
- Superadmin panel (pengguna, backup-restore)

### Bug yang SUDAH DIPERBAIKI (penting untuk kamu tahu):
- **"Cannot access 'E' before initialization"**: Disebabkan oleh static `import * as XLSX from 'xlsx'`. SOLUSI: Selalu gunakan `const XLSX = await import('xlsx')` di dalam fungsi async. JANGAN PERNAH taruh import xlsx di top-level.
- **Temporal Dead Zone**: State `totalVol` dipakai di useEffect sebelum dideklarasikan. Sudah dipindahkan ke atas.

### Modul Perhitungan RAP (STATUS SAAT INI):
File: `seksi/perhitungan-rap/page.js` (732 baris)
Memiliki 3 tab:
1. **Backup Volume Rencana**: Input geometri (H, B, Slope, Panjang) → 5 STA → 1 gambar preview
2. **Analisa Perencanaan (RAB)**: Sinkronisasi DB, parameter mesin, GoalSeek T1
3. **Kebutuhan Realisasi**: Tabel RAB Final, Harga Satuan, Cetak PDF/Excel

**MASALAH**: Modul ini BELUM LENGKAP. Masih jauh dari format Excel master Dinas. User meminta rekonstruksi total agar sesuai persis dengan format di file Excel.

## TUGAS KAMU (Implementasi)

### Fase 1: Perkuat Engine Matematika (`calcRapMath.js`)

Tambahkan fungsi-fungsi baru:

1. **`generateSTAPelaksanaan(panjang, nSTA, baseDimensions, targetVolume)`**
   - Input: panjang total, jumlah STA (5), dimensi dasar {b1, b3, h, hPrime}, volume target
   - Output: Array 5 STA dengan variasi wajar (deviasi 5-10%), total volume = targetVolume
   - STA 0 = dimensi dasar (tanpa deviasi)

2. **`calculateAnalisaPerencanaan(params)`**  
   - params: {Pw, V, Fb, Fa, Fv, Fk, Tk, T1, loadFactor_LkWh}
   - Output: {Q1, Q2, H_lPerJam, h2_lPerHari, koefAlat, koefBBM, estimasiHari, totalBBM}
   - Formula sesuai EXCEL_ANALYSIS.md Bagian III-V

3. **`goalSeekT1ForVolume(targetVol, jamKerjaPerHari, totalHariKerja, params)`**
   - Mencari T1 agar (Q1 × total_jam_kerja) = targetVol
   - Menggunakan bisection method dengan batas T1: 0.1 - 5.0 menit

4. **`SNI_REFERENCE_TABLES`** — Object berisi tabel-tabel acuan:
   - Fb berdasarkan jenis tanah
   - Fa berdasarkan kondisi operasi
   - Waktu menggali berdasarkan kedalaman
   - Waktu swing berdasarkan sudut

### Fase 2: Rekonstruksi UI (`perhitungan-rap/page.js`)

Ubah dari 3 tab menjadi **6 tab** yang memetakan ke sheet Excel:

**Tab 1: Backup Volume Perencanaan**
- Input: Panjang, H, B (b1), B Atas (b3), Slope, Tinggi Eksisting
- Output: 5 STA dengan tabel dimensi + **5 GAMBAR Cross-Section** yang dirender langsung di UI (BUKAN tersembunyi)
- Setiap gambar punya KOP gambar teknik

**Tab 2: Analisa Perencanaan**
- Cell Merah: Pw, V, Fb, Fa, Fv, Fk (dengan tombol ℹ️ yang menampilkan tabel SNI rujukan)
- Cell Kuning: T1 (editable, bisa manual atau GoalSeek)
- Output otomatis: Q1, Q2, BBM/jam, Estimasi Hari, Total BBM
- Sumber referensi: muat tabel dari SNI_REFERENCE_TABLES

**Tab 3: Kebutuhan Realisasi**
- Header: Sub Kegiatan, Pekerjaan, Lokasi (dari laporan terpilih)
- Tabel: No, Tanggal, Jam Kerja, Galian/Jam, Galian/Hari, BBM/Jam, BBM/Hari, Diterima, Sisa
- Data Tanggal+Jam = dari DB (operator_logs). BBM Diterima = dari DB (bbm_pemakaian)
- GoalSeek: Q1 agar total volume galian = volume backup

**Tab 4: Analisa Pelaksanaan**
- Identik dengan Tab 2, TAPI Cell Kuning T1 di-adjust agar BBM cocok
- Constraint: T1 tidak boleh melebihi standar SNI

**Tab 5: Backup Volume Pelaksanaan**
- 5 STA dengan dimensi yang divariasikan
- STA 0 = sama dengan STA 0 di Tab 1
- Total volume = total volume galian di Tab 3
- + 5 GAMBAR Cross-Section

**Tab 6: Personil & RAB**
- Sub-tab: Personil Pelaksanaan | RAB Personil | RAB Pelaksanaan
- Form tanda tangan: Nama KPA, NIP KPA, Nama PPTK, NIP PPTK (editable + simpan ke localStorage)
- Kalkulasi: Solar (liter × harga × PPN), Penjaga Malam (hari × tarif)

### Fase 3: Gambar Teknik (`DrawCrossSection.js`)

Modifikasi komponen agar:
- Menampilkan bentuk sungai natural (seperti gambar referensi: `gambar teknik.png`) — BUKAN trapesium kaku
- Arsiran stripping layer (0.1m) di dasar
- Dimensi label: Lebar Atas (b3), Lebar Dasar (b1), Lebar Bawah (b2), Tinggi (h), Tinggi Eksisting (h')
- KOP gambar teknik lengkap (Program, Kegiatan, Pekerjaan, Lokasi, Tahun, Kode Gambar, Skala, No/Jumlah Lembar)
- Data KOP: Program & Kegiatan dari `app_settings` DB, Pekerjaan & Lokasi dari laporan terpilih

### Fase 4: Export Multi-Format

**XLSX Export** (`handleExportExcel`):
- WAJIB gunakan `const XLSX = await import('xlsx')` — JANGAN static import!
- Menghasilkan workbook dengan 7-8 sheet sekaligus (sesuai urutan di Excel master)

**PDF/Print**:
- Halaman 1-3: RAB, Personil, Analisa
- Halaman 4+: Gambar teknik (landscape A4/A3) — 5 perencanaan + 5 pelaksanaan
- CSS @media print dengan page-break antar halaman

### Fase 5: Sinkronisasi Data

**Pilih Laporan** (UI mirip dengan modal cetak di halaman Laporan):
- Tampilkan daftar assignment dari DB1 dengan checkbox
- Setelah dipilih: tarik operator_logs (tanggal, jam_kerja) dan bbm_pemakaian (jumlah_liter, tanggal)
- Auto-fill: Pekerjaan, Lokasi, Desa, Kecamatan ke header semua sheet

## ATURAN TEKNIS MUTLAK

1. **JANGAN** static import xlsx. Selalu `const XLSX = await import('xlsx')` di dalam fungsi
2. **JANGAN** hapus kode yang sudah berjalan di modul lain (Laporan, BBM, Peralatan)
3. **JANGAN** mengubah AuthContext, Sidebar, atau layout global
4. Gunakan `import React, { useState, useEffect } from 'react'` (dengan React explicit)
5. Pastikan semua useState dideklarasikan SEBELUM useEffect yang memakainya
6. Test build: `npm run build` harus 0 error sebelum commit

## URUTAN KERJA YANG DISARANKAN

1. Baca `implementation_plan.md` dan `EXCEL_ANALYSIS.md` seluruhnya
2. Baca `pc 200.xlsx` untuk verifikasi
3. Modifikasi `calcRapMath.js` dulu (engine matematika)
4. Modifikasi `DrawCrossSection.js` (tambah dimensi label + KOP)
5. Rekonstruksi `perhitungan-rap/page.js` (6 tab + export)
6. Test: `npm run build` → harus sukses
7. Laporkan ke user bahwa sudah selesai. Antigravity yang akan review, test di browser, dan push ke production.

## CATATAN AKHIR

Kerjakan secara bertahap. Jika terlalu besar untuk 1 sesi, prioritaskan Tab 1-3 dulu (Volume + Analisa Perencanaan + Kebutuhan Realisasi). Tab 4-6 bisa di sesi berikutnya. Yang penting: **build harus sukses di setiap tahap**.

Selamat bekerja, kolega! 🫡
