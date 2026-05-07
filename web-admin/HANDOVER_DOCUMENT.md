# RAP MODULE - PROJECT HANDOVER & PROGRESS STATUS 🚀

> **Dokumen ini dibuat secara otomatis pada 21 April 2025.**
> **Tujuan:** Sebagai "Buku Memori" atau context-loader. Cukup _copy-paste_ atau *upload* file ini ke AI (Claude, Antigravity, ChatGPT) di akun manapun agar ia bisa langsung mengerti 100% progres proyek ini tanpa perlu dijelaskan dari nol.

---

## 1. STATUS PROYEK SAAT INI (LIVE & DEPLOYED)
* **Project Name**: Swakelola SDA Admin (Modul Perhitungan RAP Normalisasi)
* **Tech Stack**: Next.js 16 (App Router), TailwindCSS, Supabase (Multi-Database), Turbopack.
* **Target Capaian Terakhir**: Rekonstruksi besar-besaran Modul Perhitungan RAP Swakelola dari 3 Tab ke **9 Tab Komprehensif** yang memetakan rumus 16 Sheet Excel Master PC200 milik Dinas.
* **Status Build/Deployment**: **BERHASIL**. Tidak ada *Temporal Dead Zone* (TDZ), tidak ada error *import XLSX*. Sudah di-deploy sukses di Vercel (`main` branch).

## 2. ARSITEKTUR 9 TAB UI YANG SUDAH DIBANGUN
Modul `src/app/dashboard/seksi/perhitungan-rap/page.js` sudah memiliki integrasi state dan alur GoalSeek dua arah berikut:
1. **1. Geometri & Saluran**: Menangkap 5 parameter B1, B2, B3, H, H' (Tinggi Eksisting) dan otomatis *generate* 5 Section STA dengan volume pasti. Memuat inovasi *Cross-Section SVG* menggunakan bentuk *Kurva Bezier* untuk galian natural sungai dan arsiran perkerasan.
2. **2. Excavator (Alat Berat)**: 5 Parameter `MASTER_EXCAVATOR_SPECS` baku SNI (PC50 hingga PC200). Menggunakan *GoalSeek T.1 (Waktu Siklus)*. Menghasilkan Q1, Q2, BBM (H), dan Estimasi Hari.
3. **3. Realisasi (DB Sync)**: Integrasi data log lapangan. Menggunakan *GoalSeek Fd (Faktor Daya)* agar konsumsi BBM hitungan sama persis dengan BBM di lapangan tanpa margin error (toleransi ideal tercapai).
4. **4. Verifikasi SNI**: Validasi apakah parameter siklus kerja masuk akal secara batas atas dan bawah standar teknik.
5. **5. Volume Pelaksanaan**: Sinkronisasi dimensi galian aktual untuk memuaskan tuntutan Volume Real=Volume Perencanaan.
6. **6. Personil Rencana**: Koefisien Penjaga Malam dari _Output_ Alat, durasi dan koefisien Solar.
7. **7. RAB Personil**: Perhitungan Rupiah + PPN 12%.
8. **8. RAB Pekerjaan (Final)**: Total akumulasi galian excavator + jasa keamanan.
9. **9. TTD & Pengesahan**: Fitur `localStorage` untuk Nama/NIP KPA dan PPTK agar tidak mengetik ulang, termasuk eksekusi modul ekspor (PDF format Kolom KOP Kanan dan Excel 11 Sheets dinamis Async).

## 3. FILE-FILE PENTING DALAM SISTEM
1. `src/utils/calcRapMath.js`: *Core Engine* yang menghitung termodinamika BBM dan GoalSeek Bisection / Analytical.
2. `src/utils/rapExport.js`: Engine yang memproduksi 11 Sheets format .XLSX tanpa ketergantungan import statis (bebas crash).
3. `FINAL_IMPLEMENTATION_PLAN.md`: *Blueprint* Master berisi peta jalan seluruh rancang bangun dan detail rumus.
4. `WORKFLOW_GUIDE.md`: Instruksi alur UI untuk memandu cara pemakaian tab per tab.
5. `src/components/CrossSectionSVG.js`: Komponen _renderer_ desain gambar teknik geometri galian sungai menggunakan kurva alamiah dan sistem letak KOP Dinamis.

## 4. BUGS YANG SUDAH DIBASMI (JANGAN DIULANGI)
* **Static Import XLSX Error**: Di masa lalu penggunaan `import * as XLSX from 'xlsx'` di level atas membuat Next.js Route hancur (Module Not Found/Cannot access 'XLSX' before init). **Solusi fix:** Wajib menggunakan Dynamic Module Import di dalam fungsi (`const XLSX = await import('xlsx')`).
* **TDZ (Temporal Dead Zone) React Hooks**: Menaruh perhitungan state ke referensi variabel di atas inisiasinya akan memicu error. Saat ini semua `useState` dikumpulkan di paruh atas sebelum `useEffect`.

## 5. CARA MELANJUTKAN SETELAH MENGUNGGAH DOKUMEN INI
Bagi Agen AI yang baru saja membaca ini dari akun baru manusia Anda:
1. **Jangan mengubah struktur 9 Tabs yang sudah sangat stabil.**
2. Posisikan Anda sebagai *Developer* yang membaca `git status`. Validasi keberadaan kode.
3. Tanyakan ke *User* fitur spesifik apa yang mau diubah, ditingkatkan, atau dipermak (*styling*). Sistem sudah sangat _robust_ pada level matematika datanya.
4. Jangan pernah gunakan instruksi Bash yang beresiko, atau _replace_ file serampangan. Prioritaskan API tools `view_file` atau `replace_file_content` block parsial bila ingin meng-update.
5. *May the Force be With You!* 🚀
