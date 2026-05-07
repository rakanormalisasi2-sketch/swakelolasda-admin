# PROMPT: Bangun Ulang Sub Menu "Perhitungan RAP" (Dari NOL)

> Copy-paste prompt di bawah ini ke AI coding assistant (Claude Code / Antigravity / Cursor) untuk membangun ulang seluruh modul Perhitungan RAP dari awal.

---

## PROMPT MULAI DI SINI ⬇️

```
Saya membutuhkan sub-menu "Perhitungan RAP" (Rencana Anggaran Pelaksanaan) untuk web-admin Next.js saya. Teknologi yang sudah terpasang: Next.js App Router, Tailwind CSS, Supabase, library `exceljs`.

### KONTEKS PROYEK
Ini adalah aplikasi internal Dinas PU Kabupaten Bojonegoro untuk menghitung biaya pelaksanaan pekerjaan normalisasi saluran/sungai menggunakan Excavator. Outputnya adalah Laporan RAB dalam format Excel (.xlsx) dan Gambar Teknik CAD Potongan Melintang Saluran dalam format cetak/PDF.

### LOKASI FILE
- Halaman utama: `src/app/dashboard/seksi/perhitungan-rap/page.js`
- Komponen gambar CAD: `src/components/CrossSectionSVG.js`
- Engine matematika: `src/utils/calcRapMath.js`
- Engine cetak gambar: `src/utils/rapPrint.js`
- Engine ekspor Excel: `src/utils/rapExport.js`
- Template Excel master: `public/master-template.xlsx` (file Excel asli yang harus di-clone formatnya)
- Supabase client: `src/lib/supabase.js` (sudah ada)

### DESAIN UI/UX (WAJIB)
Buat antarmuka **Premium Split-Pane Wizard** (bukan form biasa/tab biasa):
- **Layout**: Layar terbagi dua — Panel Kiri (35%) untuk input form Step-by-Step, Panel Kanan (65%) untuk Live Preview/Dashboard.
- **Navigasi**: 4 Langkah berurutan dengan Stepper visual di atas panel kiri:
  1. **Geometri Saluran** — Input dimensi trapesium (b1, b3, h, h'=tinggi galian dari tanah eksisting, panjang). Panel kanan menampilkan Live SVG CAD.
  2. **Alat & Standar SNI** — Input parameter Excavator (HP, Bucket, Fb, Fa, Fv, Fk). Panel kanan menampilkan hasil kalkulasi Q1, Q2, BBM otomatis.
  3. **Log Realisasi** — Tabel data harian dari database dengan **Checkbox** per baris. Panel kanan menampilkan dashboard akumulasi (Durasi, BBM Terpakai, Grand Total RAB) yang berubah dinamis sesuai baris yang dicentang.
  4. **Finalisasi** — Input KOP laporan (Nama Pekerjaan, Lokasi, TTD). Tombol Cetak Gambar CAD dan Export Excel.
- **Estetika**: Glassmorphism, animasi transisi antar-step, warna premium (slate/blue/emerald), micro-interactions pada hover/focus. Font modern. Harus terlihat seperti aplikasi enterprise kelas atas yang WOW.
- **Prinsip**: Mudah dimengerti siapapun, alur jelas, tidak membingungkan, tidak berantakan.

### LOGIKA MATEMATIKA (INTI PERHITUNGAN)
Semua rumus mengikuti standar SNI dan format Excel Master PC 200:

#### A. Analisa Perencanaan (Kapasitas Excavator)
```
Q1 (m³/jam) = (V × Fb × Fa × 60) / (T1 × Fv × Fk)
Q2 (m³/hari) = Q1 × Tk (jam kerja = 7)

Dimana:
- V = Kapasitas Bucket (m³)
- Fb = Faktor Bucket (0.8 - 1.0, dari Tabel SNI)
- Fa = Faktor Efisiensi Alat (0.65 - 0.83, dari Tabel SNI)
- Fv = Faktor Konversi Galian (0.8 normal)
- Fk = Faktor Pengembangan Material (0.8)
- T1 = Waktu Siklus (menit) — ini adalah TARGET GoalSeek
- Tk = Jam Kerja per Hari (default 7)
```

#### B. Konsumsi BBM (Solar)
```
kW = HP × 0.7457
Fe = 0.75 (efisiensi waktu: 45 menit efektif dari 60)
Fd = waktu_gali / waktu_siklus (rasio daya)
H (Liter/jam) = Fd × Fe × kW × LoadFactor
h2 (Liter/hari) = H × Tk
```

#### C. GoalSeek (Metode Bisection)
Sistem harus punya fungsi GoalSeek yang mencari nilai T1 (Waktu Siklus) optimal agar Sisa BBM di akhir pekerjaan berada di kisaran 40-100 liter. Gunakan metode Bisection (binary search) dengan toleransi 0.0001.

#### D. Tabel Referensi SNI yang harus tertanam:
- Spek Excavator: PC50 (42HP, bucket 0.22), PC75 (65HP, bucket 0.35), PC100 (97HP, bucket 0.5), PC200 (143HP, bucket 0.93)
- Faktor Bucket Fb: Pasir 1.0-0.8, Tanah Biasa 0.8-0.6, Berbatu 0.6-0.4
- Efisiensi Alat Fa: Baik Sekali 0.83, Baik 0.75, Sedang 0.69
- Load Factor BBM: PC50=0.15, PC200=0.28, PC300=0.35

### GAMBAR TEKNIK CAD (CrossSectionSVG)
Buat komponen SVG yang menggambar Potongan Melintang Saluran bergaya gambar teknik kaku (hitam-putih, garis tegas):
- **Bentuk**: Trapesium sama kaki TERBALIK (lebar di atas/b3, sempit di bawah/b1) — ini adalah bentuk galian saluran.
- **Kontur Eksisting**: Garis zigzag kaku di atas yang merepresentasikan tanah asli sebelum digali.
- **Area Galian**: Area irisan antara kontur eksisting dan garis rencana, diarsir dengan garis-garis vertikal (hatch pattern).
- **Dimensi**: Tampilkan ukuran dimensional saja (b1, b3, h, h') dengan garis panah/leader. TIDAK PAKAI elevasi mdpl.
- **Gaya**: Hitam putih, garis tegas, font engineering, seperti output AutoCAD. Bukan gambar berwarna-warni.

### CETAK/PRINT (rapPrint.js)
- Membuka jendela cetak baru (window.open) berisi halaman A4 landscape.
- Setiap halaman memuat **2 Gambar Potongan Melintang** (atas dan bawah).
- Di bawah masing-masing gambar ada tabel kecil berisi dimensi (STA, b1, b3, h, luas galian).
- Halaman JUGA harus berisi lembar laporan RAB (tabel pekerjaan, volume, harga satuan, jumlah harga) — bukan hanya gambar saja.

### EKSPOR EXCEL (rapExport.js) — KRITIKAL
**Pendekatan**: JANGAN buat Excel dari nol. GUNAKAN file template `public/master-template.xlsx` yang sudah ada, lalu isi/hydrate datanya menggunakan library `exceljs`. Ini menjamin format, border, style, merge cell, dan tata letak PERSIS seperti master asli.

Sheet yang AKTIF (harus diisi data):
1. **RAB PELAKSANAAN** — Tabel biaya total (Galian × Harga Satuan + Personil)
2. **ANALISA perencanaan** — Parameter alat (HP, Bucket, Fb, Fa, Fv, T1, Q1, Q2, BBM)
3. **Analisa Pelaksanaan** — Sama seperti perencanaan tapi data aktual
4. **Kebutuhan realisasi** — Tabel harian: No, Tgl, Bln, Thn, Jam, Q1/jam, Galian/hari, BBM/jam, BBM/hari, BBM Diterima, Sisa BBM (running balance), Kumulatif
5. **backup volume Pelaksanaan** — Data per-STA (dimensi dan luas per segment)
6. **PERSONIL pelaksanaan** — Daftar tenaga kerja (HANYA Penjaga Malam) + kebutuhan Solar
7. **RAB PERSONIL PELAKSANAAN** — Biaya Penjaga Malam + Solar × harga × PPN 12%

Sheet yang HIDDEN (abaikan, jangan diisi):
- Backup Galian (2), Bahan Upah, Backup Galian, ELEVASI, Sheet1

**Logika kunci di Sheet Kebutuhan Realisasi:**
- Baris data diambil dari CHECKBOX yang dicentang user di Langkah 3 UI
- Urutan berdasarkan tanggal ascending
- Running Balance: Sisa BBM = Sisa Hari Kemarin - BBM Hari Ini + BBM Diterima Hari Ini
- Kumulatif Galian bersambung dari baris ke baris

### DATABASE (Supabase)
- Tabel `operator_logs`: berisi log harian operator di lapangan (tanggal, jam_kerja, dll)
- Tabel `bbm_pemakaian`: data BBM
- Data dari tabel ini ditarik ke Langkah 3 (Realisasi) untuk ditampilkan sebagai baris checkbox
- Durasi personil (HOK Penjaga Malam) = jumlah baris yang dicentang user

### PERSONIL
HANYA ada **Penjaga Malam** (tidak ada operator, supir, pekerja — mereka sudah masuk di kontrak excavator). Gaji Rp 75.000/hari/orang.

### PENTING
1. Semua perhitungan harus reaktif — ubah satu angka, seluruh kalkulasi berubah instan.
2. Auto-save ke Supabase setiap ada perubahan (debounce 2 detik).
3. File Excel output harus bisa dibuka sempurna di MS Excel tanpa error/corrupt.
4. Gambar CAD harus KAKU seperti gambar teknik, bukan ilustrasi artistik.
5. Grand Total = (Solar × Harga Solar × PPN 12%) + (Penjaga Malam × Gaji × Durasi).
```

## PROMPT SELESAI ⬆️

---

### Catatan Tambahan untuk Pengguna:
- Pastikan file `pc 50.xlsx` (atau `pc 200.xlsx`) sudah dicopy ke `public/master-template.xlsx` sebelum menjalankan
- Library yang dibutuhkan: `npm install exceljs file-saver`
- Pastikan `src/lib/supabase.js` sudah dikonfigurasi dengan benar
- Referensi gambar teknik: sertakan file `gambar teknik.png` sebagai contoh visual
