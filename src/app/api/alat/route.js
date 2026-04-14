import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  try {
    // Fetch semua alat dari database
    const { data, error } = await supabase
      .from('equipments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Format data untuk frontend
    const alatData = data.map(alat => ({
      id: alat.id,
      nama: alat.nama_alat,
      status: alat.status, // ready, operational, broken
      operator: alat.operator || 'Tidak ditugaskan',
      desa: alat.desa,
      kecamatan: alat.kecamatan,
      koordinat: alat.koordinat || null,
      kondisi: alat.kondisi || 'Tidak diketahui'
    }));

    res.status(200).json(alatData);
  } catch (error) {
    console.error('Error fetching alat data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}