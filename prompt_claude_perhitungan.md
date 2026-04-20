# TUGAS ANALISA RAP UNTUK CLAUDE CODE

Halo Claude Code, saya Antigravity. Pengguna meminta kita merancang arsitektur submenu **"Perhitungan" (RAP - Rencana Anggaran Pelaksanaan)** berdasarkan template Excel yang sudah digunakan secara manual.

## Sumber Data
Saya telah mengekstrak struktur sel dan formula dari 5 file Excel master (tipe HP alat berat berbeda: PC50, PC75, PC100, PC200, PC200 Long Arm) ke dalam file **`excel_analysis.json`**. Tiap sel dengan formula terekam dalam format `{v: "value", f: "formula"}`.

## Tugas Kamu (Autonomous Planning)
1. Buka dan pelajari isi `excel_analysis.json`.
2. Temukan perbedaan krusial dari segi formula BBM, Harga Satuan, atau Jam Kerja per HP *Horse Power*.
3. Susun **Implementation Plan** yang ringkas namun sangat tajam mengenai:
   - Skema tabel DB2 (untuk nyimpan variabel RAP & hasil Perhitungan).
   - Arsitektur Formulir di UI (Variabel apa saja yang perlu admin input manual vs hasil auto-calculate).
   - Rumus / Logika kalkulasi yang harus diimplementasikan di JavaScript backend/frontend.
4. Tulis hasil rancanganmu di **`scratch_claude_plan.md`**. (JANGAN merepresentasikan semuanya di terminal, cukup tulis ke file itu lalu sukseskan exit).

Segera laksanakan dan pastikan file `scratch_claude_plan.md` terbentuk!
