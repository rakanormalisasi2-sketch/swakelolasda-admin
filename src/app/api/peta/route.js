import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Koordinat kantor sebagai fallback
const KOORDINAT_KANTOR = {
  lat: 34.4806,
  lng: -75.4158
};

export default async function handler(req, res) {
  try {
    // Fetch semua alat dari database
    const { data, error } = await supabase
      .from('equipments')
      .select('*');

    if (error) {
      throw error;
    }

    // Konversi ke GeoJSON FeatureCollection
    const features = data.map(alat => {
      // Gunakan koordinat alat jika ada, jika tidak gunakan koordinat kantor
      let coordinates;
      if (alat.koordinat && typeof alat.koordinat === 'object') {
        coordinates = [alat.koordinat.lng, alat.koordinat.lat];
      } else {
        coordinates = [KOORDINAT_KANTOR.lng, KOORDINAT_KANTOR.lat];
      }

      return {
        type: 'Feature',
        properties: {
          id: alat.id,
          nama: alat.nama_alat,
          status: alat.status,
          operator: alat.operator || 'Tidak ditugaskan',
          desa: alat.desa,
          kecamatan: alat.kecamatan,
          kondisi: alat.kondisi || 'Tidak diketahui'
        },
        geometry: {
          type: 'Point',
          coordinates: coordinates
        }
      };
    });

    const geojson = {
      type: 'FeatureCollection',
      features: features
    };

    res.setHeader('Content-Type', 'application/geo+json');
    res.status(200).json(geojson);
  } catch (error) {
    console.error('Error fetching map data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}