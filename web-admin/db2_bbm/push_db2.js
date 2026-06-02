const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:Rakaganteng@db.rpggkbkmowdbxtgfgbop.supabase.co:5432/postgres'
});

async function runMigration() {
  try {
    await client.connect();
    console.log('Connected to DB2 (BBM)');

    const sql = `
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS bbm_pengadaan (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seksi TEXT NOT NULL,
        tanggal_pesan DATE NOT NULL,
        tanggal_terima DATE NOT NULL,
        jumlah_liter NUMERIC(10,2) NOT NULL DEFAULT 0,
        keterangan TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS bbm_pemakaian (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        assignment_id UUID NOT NULL,
        seksi TEXT NOT NULL,
        kegiatan TEXT,
        tipe_alat TEXT,
        desa TEXT,
        kecamatan TEXT,
        tanggal_kirim DATE NOT NULL,
        jumlah_liter NUMERIC(10,2) NOT NULL DEFAULT 0,
        keterangan TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      ALTER TABLE bbm_pemakaian 
      ADD COLUMN IF NOT EXISTS operator_log_id UUID,
      ALTER COLUMN assignment_id DROP NOT NULL;

      ALTER TABLE bbm_pengadaan ENABLE ROW LEVEL SECURITY;
      ALTER TABLE bbm_pemakaian ENABLE ROW LEVEL SECURITY;
      
      -- Drop policies if exist to recreate safely
      DROP POLICY IF EXISTS allow_all_pengadaan ON bbm_pengadaan;
      DROP POLICY IF EXISTS allow_all_pemakaian ON bbm_pemakaian;

      CREATE POLICY allow_all_pengadaan ON bbm_pengadaan FOR ALL USING (true) WITH CHECK (true);
      CREATE POLICY allow_all_pemakaian ON bbm_pemakaian FOR ALL USING (true) WITH CHECK (true);
    `;

    await client.query(sql);
    console.log('Migration successful! Tables bbm_pengadaan & bbm_pemakaian created.');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

runMigration();
