Tugas Analisis Lanjutan RAB Normalisasi (Antigravity -> Claude Code)

Instruksi User:
Tolong pelajari alur Goalseek dan keterkaitan antar sheet dari format Excel sebelumnya. 
Fokus Analisis:
1. Sheet "Analisa Perencanaan":
   - Cell Merah: Input acuan baku (seperti Kapasitas Bucket, dsb). UI harus menampilkan tabel/gambar pedoman saat cell ini diedit.
   - Cell Kuning: Kunci Goal Seek (Waktu Siklus/T1). Tujuannya agar Volume Realisasi mendekati/sama dengan Volume Rencana (toleransi desimal).
2. Sheet "Personil" & "RAB Personil": 
   - Sama persis dengan Excel. 
   - Tanda Tangan (Nama, NIP, Jabatan) bisa auto-fill tapi tetap bisa di-edit & simpan.
3. Sheet "Analisa Pelaksanaan":
   - Cell Kuning menyesuaikan Hitungan BBM di sheet "Kebutuhan Realisasi" (Waktu siklus tidak melebihi batas).
4. Sheet "Kebutuhan Realisasi":
   - Data riil ditarik dari "Tabel Laporan Pelaksanaan" (Jam Kerja, BBM diterima).
   - "Hasil Galian Per Jam" di-Goalseek.
5. Sheet "Backup Volume Pelaksanaan":
   - STA 0 = Link copy dari Perencanaan.
   - Sisa panjang di auto-split jadi 5 STA dengan variasi masuk akal.
   - Volume total Pelaksanaan == Volume target di sheet Kebutuhan Realisasi.
   - Auto-generate Gambar Melintang Metrik (tanpa elevasi) yang diprint di lampiran Landscape paling bawah.
6. Hasil Akhir (Workflow Print):
   - Bisa Cetak Multi-halaman, Export PDF, Print, dan Export XLSX.

Tugas Claude Code:
1. Pahami pola matematis Goal Seek dari Excel. (Bagaimana kita membuat function Bisection/Optimizer di Javascript untuk meniru Goal Seek Excel pada T1 dan Hasil Galian/Jam).
2. Buat rangkuman analisis UI/UX (terutama peletakan Pedoman Gambar untuk cell merah dan fitur Tanda Tangan).
3. Hasilkan ringkasan arsitektur (Workflow) yang komprehensif.

Output: Tulislah analisis komprehensifmu ke dalam file "claude_analysis_2.md" lalu EXIT secara otomatis. JANGAN MENGGUNAKAN TOOL INTERAKTIF.
