# PROMPT UNTUK CLAUDE CODE — Rekonstruksi Modul Perhitungan RAP (REVISI MULTI-AGEN)

> **INSTRUKSI UTAMA**: Copy-paste SELURUH isi file ini ke terminal Claude Code sebagai satu prompt tunggal.

---

Claude, ini adalah misi besar multi-agen. **Kamu adalah Pelaksana Utama (Implementor)**. Agen rekan kerjamu, **Antigravity (Saya)**, bertindak sebagai **Supervisor Kualitas, Analis Desain Visual, Reviewer, dan Deployer**.

Berdasarkan riwayat `rangka.md`, desain UI, rendering SVG Cross-Section, serta export Excel 16 Sheets telah melenceng dari standar awal yang kita sepakati. Kamu CLI *text-based* yang sulit membaca format referensi Excel mentah dan gambar, karenanya, **Antigravity akan menjadi Mata dan Pengawas-mu**.

## PEMBAGIAN TUGAS (AGREEMENT)

### 👨‍💻 TUGAS CLAUDE CODE (Kamu):
1. **Perbaikan Syntax & Logic (React/Next.js)**: Menyelesaikan kode `page.js`, `CrossSectionSVG.js` dan sinkronisasi DB sesuai `IMPLEMENTATION_PLAN_SUMMARY.md`.
2. **Koreksi Tata Letak Ekspor Excel (`rapExport.js`)**: Memastikan 16 sheet Excel 100% diproduksi dengan format yang selaras dengan file `PC 200.xlsx` / `PC75.xlsx` (kolom lebar, mata uang `Rp`, tabel cell kuning/merah, dsb).
3. **Penyempurnaan Tab Data (1-9)**: Mensukseskan UX (User Experience) di ke-9 Tab yang merangkum keseluruhan pipeline RAP tanpa ada bug re-render atau state yang hilang (misal TDZ hooks).
4. **Tidak Menganalisa Gambar Sendiri**: Kalau bingung soal ukuran KOP kanan, atau bentuk Bezier Curve lengkungan SVG, tanyakan kepada Antigravity, BUKAN meraba-raba sendiri!

### 🧙‍♂️ TUGAS ANTIGRAVITY (Pengawas & Quality Assurance):
1. **Inspeksi Desain Visual**: Antigravity akan menilai apakah `CrossSectionSVG.js` sudah menampilkan Sungai yang melengkung (bukan kaku trapesium kotak), KOP Gambar format vertikal di sisi kanan, serta arsiran (vertical hatch) sesuai perintah PDF dan `gambar teknik.png`.
2. **Verifikasi Export**: Mengekstrak format PDF `Lampiran-II-AHSP.pdf` dan mengevaluasi bentuk layout 16 Sheets `.xlsx` untuk disesuaikan secara proporsional.
3. **Pemberian Aba-aba (Checkpoint)**: Mencegah kamu (Claude Code) mengacak-acak state ketika ada fitur baru. Antigravity akan me-review `git status` dan build error (`npm run build`).

---

## DAFTAR REVISI KRITIS YANG HARUS KAMU EKSEKUSI SEKARANG

Berdasarkan kesalahan eksekusi terakhir yang dinilai _melenceng_, perbaiki komponen ini SEKARANG:

### REVISI 1: EXCEL EXPORT (16 SHEETS) `rapExport.js`
Format aslimu salah dan terlalu generik! 
- Kamu harus memasukkan properti warna background (merah muda untuk input dimensi/alat, kuning untuk hasil Goalseek/T.1).
- Header *KOP EXCEL* (Program, Kegiatan, Lokasi, Pekerjaan) harus di-_merge cell_ di bagian atas setiap sheet persis tata letaknya dengan `PC 200.xlsx`.
- Format angka ke `Intl.NumberFormat` standar Indonesia (titik untuk ribuan, koma untuk desimal).
- WAJIB gunakan *Dynamic Import*: `const XLSX = await import('xlsx');` (JANGAN STATIC IMPORT!).

### REVISI 2: GAMBAR SVG (`CrossSectionSVG.js`)
Desainmu masih kaku dan pattern arsirannya error!
- **Arsiran (Hatching)**: SVG `#hatch-pattern` harus berupa garis VERTIKAL `| | | |` tegak (bukan miring). Lebar spasi 6px.
- **Bentuk Visual Galian**: Jangan pakai pure Polygon/Trapesium kaku untuk kontur atas eksisting. Gunakan `<path d="...">` dengan *Quadratic Bezier Curve* (`q`, `c`) untuk menggambarkan "permukaan dasar dan batas tebing" bumi sebelum digali agar terlihat seperti *Natural River*!
- **Kop Gambar (KOP Inline)**: Letakkan kolom Tabel Teks di SEBELAH KANAN gambar `width: 200px` berisi (Logo Bojonegoro, Dinas PU SDA, Pekerjaan, STA, Skala, Kode Lembar 1/5).

### REVISI 3: UI/UX DI DASBOR WEB (`page.js`)
Desain awal "Web-Admin" sudah keren dengan gaya pemerintahan, jangan dirusak!
- Tab jangan cuma sekadar link biasa. Gunakan _Card Layout_ dengan shadow, _Badge active_, warna kebiruan (#1e40af) saat aktif.
- Pisahkan antara form INPUT (Background White) dengan Area Hasil Hitungan/Kuning (Background Yellow-50).
- Input *GoalSeek* di Tab 3 Realisasi dan Tab 4 Verifikasi harus responsif dan ada tombol "Sinkronkan dengan DB Laporan", memberikan alert/warning jika Sisa BBM jauh dari margin logika (idealnya 40-100 liter).

## CARA BEKERJA KELOMPOK (Workflow)

1. **Jalankan Revisi Terpilih**: Pilih salah satu fasa di atas (Cth: Perbaiki `CrossSectionSVG` SVG curve). 
2. **Kabari User**: Jika selesai, tulis laporan di terminal: `"Selesai merevisi SVG Cross Section, silakan minta Antigravity mengecek styling-nya di branch lokal."`
3. Antigravity (Saya) akan me-review kode dan memberikan _feedback_ atau meng-ACC (Accept) langsung melalui User.

**JANGAN COBA MEMBORONG SEMUA DALAM 1 LANGKAH.** Bangun per-modul, pastikan _build_ berhasil, lalu lanjut.
Silakan buat file `IMPLEMENTATION_PLAN_SUMMARY.md` yang merinci fasa perbaikannya, dan tunggu komando eksekusi! Happy Coding! 🫡
