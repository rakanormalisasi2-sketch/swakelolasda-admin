# Perbaikan Total Cetak Langsung (PDF) & Export XLSX — RAP

## Latar Belakang
Output PDF dan Excel dari sub menu Perhitungan RAP tidak sesuai dengan format `pc 50.pdf`. Perlu perbaikan di 3 area: **Header/KOP**, **Konten Halaman**, dan **Gambar Teknik**.

---

## User Review Required

> [!IMPORTANT]
> **Template XLSX per Alat**: Anda menyediakan 5 template Excel (PC 50, PC 75, PC 100, PC 200, PC 200 Long Arm). Apakah template yang dipilih harus bergantung pada kelas excavator yang dipilih di Step 2? Atau tetap pakai `pc 50.xlsx` untuk semua?

> [!IMPORTANT]
> **Drop BBM Default**: Saat ini hari pertama default 400L jika tidak ada info di keterangan. Apakah nilai ini harus bisa di-set manual oleh user, atau tetap 400?

---

## Proposed Changes

### A. Header KOP PDF — Sesuai `pc 50.pdf`

Saat ini header terlalu sederhana. Header di `pc 50.pdf` memiliki format:

```
PEMERINTAH KABUPATEN BOJONEGORO
DINAS PEKERJAAN UMUM SUMBER DAYA AIR
────────────────────────────────────
SUB KEGIATAN : [dari pengaturan sistem → pdf_sub_kegiatan]
PEKERJAAN    : [dari judul daily log yang dipilih → rincian + desa + kecamatan]
VOLUME       : [dari backup volume rencana/pelaksanaan]
DURASI       : [dari estimasi hari analisa]
TAHUN ANGGARAN : 2025/2026
```

#### [MODIFY] [rapPrint.js](file:///c:/Users/dinas/OneDrive/Desktop/kode/web-admin/src/utils/rapPrint.js)
- Rewrite fungsi `kop()` agar mengikuti format `pc 50.pdf` persis
- Tambah parameter: `subKegiatan`, `pekerjaan`, `volume`, `durasi`
- Untuk sheet **Rencana**: volume dari backup volume rencana, durasi dari analisa perencanaan
- Untuk sheet **Pelaksanaan**: volume dari backup volume pelaksanaan, durasi = jumlah daily log yang dipilih

#### [MODIFY] [page.js](file:///c:/Users/dinas/OneDrive/Desktop/kode/web-admin/src/app/dashboard/seksi/perhitungan-rap/page.js)
- Fetch `section_settings` dari Supabase untuk mendapatkan `pdf_sub_kegiatan`
- Pass `subKegiatan` dan `pekerjaan` (dari judul group daily log) ke `rapState`
- Judul pekerjaan = gabungan dari rincian pekerjaan + desa + kecamatan di baris daily log

---

### B. Konten Halaman PDF — Align dengan `pc 50.pdf`

#### Rencana
- **Hal 1**: Backup Volume Rencana — header volume dari total backup
- **Hal 2**: Analisa Harga Satuan — portrait, sama seperti sekarang tapi durasi dari analisa
- **Hal 3**: AHSP Pekerjaan — landscape
- **Hal 4**: Tenaga dan Bahan — landscape
- **Hal 5**: RAB per Bahan — landscape  
- **Hal 6**: RAB Rencana — landscape

#### Pelaksanaan
- **Hal 7**: Kebutuhan Realisasi (daily log) — landscape, drop BBM dari keterangan
- **Hal 8**: Analisa Pelaksanaan — portrait, durasi = jumlah hari daily log
- **Hal 9**: Backup Volume Pelaksanaan — landscape, volume dari backup pelaksanaan
- **Hal 10-13**: AHSP, Tenaga Bahan, RAB pelaksanaan

---

### C. Gambar Teknik CAD — Lampiran

#### [MODIFY] [rapPrint.js](file:///c:/Users/dinas/OneDrive/Desktop/kode/web-admin/src/utils/rapPrint.js)
- Pisahkan gambar perencanaan dan pelaksanaan
- Tambahkan halaman judul "LAMPIRAN GAMBAR TEKNIK PERENCANAAN" dan "LAMPIRAN GAMBAR TEKNIK PELAKSANAAN"
- Setiap gambar 1 halaman landscape, **fit-to-page** (memenuhi seluruh halaman)

---

### D. XLSX Export — Template Dinamis

#### [MODIFY] [rapExport.js](file:///c:/Users/dinas/OneDrive/Desktop/kode/web-admin/src/utils/rapExport.js)
- Pilih template berdasarkan kelas excavator: `PC50 → pc 50.xlsx`, `PC75 → PC75.xlsx`, dll
- Copy semua 5 template ke folder `public/`
- **Hydrate semua cell** yang berisi data input: geometri, parameter alat, daily log
- Pastikan angka berubah sesuai input website (saat ini tidak berubah karena formula di-strip tanpa di-replace nilainya)
- Cell yang perlu diisi:
  - Sheet "backup volume rencana": b1, b3, h, h', panjang, stripping
  - Sheet "ANALISA perencanaan": HP, Bucket, Fb, Fa, Fv, T.1, Fe, Fd, LoadFactor
  - Sheet "Kebutuhan realisasi": daily log rows dengan Drop BBM
  - Sheet "backup volume pelaksanaan": STA data pelaksanaan
  - Sheet "Analisa Pelaksanaan": sama dengan perencanaan tapi data pelaksanaan

---

### E. UI Step 2 — Override + GoalSeek Hidden

#### [MODIFY] [page.js](file:///c:/Users/dinas/OneDrive/Desktop/kode/web-admin/src/app/dashboard/seksi/perhitungan-rap/page.js)
- Kelas excavator = default preset, tapi semua field tetap editable
- **Hapus panel "Hasil Kalkulasi GoalSeek (Auto)"** dari tampilan depan
- GoalSeek tetap jalan di belakang layar (via `useMemo`)
- Ketika user mengubah field → tampilkan **toast notification** kecil yang menampilkan hasil GoalSeek terbaru (T.1, Q1, H, sisa BBM)
- Toast otomatis hilang setelah 5 detik

---

## Verification Plan

### Automated Tests
- Build Next.js berhasil tanpa error (`npm run build`)
- Deploy ke Vercel production berhasil

### Manual Verification
- Cetak Langsung (PDF): bandingkan header dengan `pc 50.pdf`
- Unduh XLSX: buka file, verifikasi angka berubah sesuai input
- Gambar teknik: verifikasi ada di akhir dokumen, landscape, fit-to-page
