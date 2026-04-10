import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { Readable } from 'stream';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Cari atau buat folder di Google Drive
 */
async function getOrCreateFolder(drive, name, parentId) {
  const safeName = (name || 'UNKNOWN').toString().replace(/[\\/:*?"<>|]/g, '_').trim() || 'UNKNOWN';
  const escaped = safeName.replace(/'/g, "\\'");
  const q = `name='${escaped}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const res = await drive.files.list({ q, fields: 'files(id)', spaces: 'drive' });

  if (res.data.files.length > 0) return res.data.files[0].id;

  const folder = await drive.files.create({
    requestBody: {
      name: safeName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  });
  return folder.data.id;
}

/**
 * Upload foto ke Google Drive dengan hierarki folder sesuai legacy CODE.gs:
 * [Root Folder] / [Tahun] / [Kecamatan] / [Desa] / [Jenis Alat] / [Nama Operator] / [Tanggal YYYY-MM-DD]
 *
 * @param {object} params
 * @param {string} params.sectionRole     - 'seksi_normalisasi' | 'seksi_embung' | 'tim_peralatan'
 * @param {string} params.operatorName    - Nama operator (untuk subfolder)
 * @param {string} params.village         - Nama desa (untuk subfolder)
 * @param {string} params.district        - Nama kecamatan (untuk subfolder)
 * @param {string} params.equipment       - Jenis alat berat (untuk subfolder)
 * @param {string} params.date            - Tanggal laporan (YYYY-MM-DD)
 * @param {Buffer} params.photoBuffer     - Isi file foto sebagai Buffer
 * @param {string} params.mimeType        - MIME type, default 'image/jpeg'
 * @param {string} params.filename        - Nama file
 * @returns {Promise<string>}             - URL view langsung
 */
export async function uploadPhotoToDrive({ sectionRole, operatorName, village, district, equipment, date, photoBuffer, mimeType, filename }) {
  // 1. Ambil kredensial dari database
  const { data: sectionData, error: dbErr } = await supabaseAdmin
    .from('section_settings')
    .select('google_refresh_token, google_root_folder_id')
    .eq('role', sectionRole)
    .single();

  if (dbErr || !sectionData?.google_refresh_token) {
    throw new Error('Google Drive belum terhubung. Admin seksi harus login dulu di halaman Pengaturan.');
  }
  if (!sectionData.google_root_folder_id) {
    throw new Error('Root Folder ID Google Drive belum di-isi. Admin harus mengisinya di halaman Pengaturan.');
  }

  // 2. Inisialisasi OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  );
  oauth2Client.setCredentials({ refresh_token: sectionData.google_refresh_token });
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  // 3. Bangun hierarki folder: Root / Tahun / Kecamatan / Desa / Alat / Operator / Tanggal
  const d = date ? new Date(date) : new Date();
  const year       = d.getFullYear().toString();
  const dateFolder = d.toISOString().split('T')[0]; // YYYY-MM-DD

  const safeDistrict  = (district  || 'TIDAK DIKETAHUI').toUpperCase();
  const safeVillage   = (village   || 'TIDAK DIKETAHUI').toUpperCase();
  const safeEquipment = (equipment || 'ALAT BERAT').toUpperCase();
  const safeOperator  = (operatorName || 'OPERATOR').toUpperCase();

  const root      = sectionData.google_root_folder_id;
  const yearId    = await getOrCreateFolder(drive, year,          root);
  const kecId     = await getOrCreateFolder(drive, safeDistrict,  yearId);
  const desaId    = await getOrCreateFolder(drive, safeVillage,   kecId);
  const alatId    = await getOrCreateFolder(drive, safeEquipment, desaId);
  const opId      = await getOrCreateFolder(drive, safeOperator,  alatId);
  const tanggalId = await getOrCreateFolder(drive, dateFolder,    opId);

  // 4. Upload file
  const stream = Readable.from(photoBuffer);
  const fileRes = await drive.files.create({
    requestBody: {
      name: filename || `foto_${Date.now()}.jpg`,
      parents: [tanggalId],
    },
    media: {
      mimeType: mimeType || 'image/jpeg',
      body: stream,
    },
    fields: 'id',
  });

  const fileId = fileRes.data.id;

  // 5. Set permission: publik baca
  await drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  // 6. Return dua format URL:
  //    - thumbnail: untuk dipakai sebagai <img src> di cetak dokumentasi/hourmeter
  //    - view: untuk dibuka user di browser
  // Simpan keduanya? Cukup simpan thumbnail format karena bisa derive view dari ID
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
}
