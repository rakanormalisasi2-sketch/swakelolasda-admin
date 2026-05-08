---
name: project_web_admin_way_of_working
description: Antigravity-style systematic workflow untuk web-admin
type: project
---

## Cara Kerja Project web-admin (Antigravity System)

### Planning Mode
**WAJIB buat plan** untuk:
- Perubahan arsitektur besar
- Fitur baru kompleks (>5 file)
- DB schema change / breaking change
- Ambiguitas tinggi

**LANGSUNG eksekusi** untuk:
- Fix bug sederhana
- Perubahan 1-2 file jelas scope
- Syntax error fix
- Format kode

### Workflow Sistematis
1. **FASE 1 — RESEARCH**: Baca semua file relevan, cek `.claude/memory/`, Pahami arsitektur
2. **FASE 2 — PLAN**: Buat `.claude/implementation_plan.md`, STOP & minta persetujuan
3. **FASE 3 — EXECUTE**: Buat `.claude/task.md`, kerjakan sekuensial
4. **FASE 4 — VERIFY**: Test/build, buat `.claude/walkthrough.md`

### Anti-Looping (3-Strike Rule)
- Maksimal 3 percobaan untuk error yang sama
- Setelah 3x gagal → STOP & konsultasikan ke user
- Analisis stack trace penuh, bukan cuma baris terakhir
- Pahami root cause sebelum fix

### Desain Standar
- Premium SaaS quality (Glassmorphism, gradients, shadows)
- Font: Inter/Outfit/Roboto
- Micro-animations (200-300ms transitions)
- Semantic HTML, meta tags dinamis

### Database (2 Supabase Projects)
- DB1 (ratmptlcrjifuplokask): Auth, assignments, equipment, reports
- DB2 (rpggkbkmowdbxtgfgbop): BBM fuel management

### Komunikasi
- Bahasa Indonesia
- Ringkas, terstruktur (markdown GitHub-style)
- Artifak untuk output panjang
- Akhiri turn dengan status + next step

### Catatan
- Baca `.claude/memory/project_context.md` & `database_schema.md` di awal sesi
- Update memory saat ada perubahan arsitektur/signifikan
