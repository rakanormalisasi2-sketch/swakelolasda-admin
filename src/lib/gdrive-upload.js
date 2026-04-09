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
  const safeName = name.replace(/[\\/:*?"<>|]/g, '_'); // sanitize
  const q = `name='${safeName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
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
 * Upload foto ke Google Drive dengan hierarki folder:
 * [Root Folder] / [Tahun] / [Bulan] / [Desa] / [Nama Operator]
 *
 * @param {object} params
 * @param {string} params.sectionRole     - 'seksi_normalisasi' | 'seksi_embung'
 * @param {string} params.operatorName    - Nama operator (untuk subfolder)
 * @param {string} params.village         - Nama desa (untuk subfolder)
 * @param {string} params.date            - Tanggal laporan (ISO string / YYYY-MM-DD)
 * @param {Buffer} params.photoBuffer     - Isi file foto sebagai Buffer
 * @param {string} params.mimeType        - MIME type, default 'image/jpeg'
 * @param {string} params.filename        - Nama file
 * @returns {Promise<string>}             - URL langsung untuk embed gambar
 */
export async function uploadPhotoToDrive({ sectionRole, operatorName, village, date, photoBuffer, mimeType, filename }) {
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

  // 3. Bangun hierarki folder
  const d = date ? new Date(date) : new Date();
  const year = d.getFullYear().toString();
  const month = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }); // e.g. "April 2026"
  const safeVillage = (village || 'Tidak Diketahui').toUpperCase();
  const safeOperator = (operatorName || 'Operator').toUpperCase();

  const root = sectionData.google_root_folder_id;
  const yearId    = await getOrCreateFolder(drive, year, root);
  const monthId   = await getOrCreateFolder(drive, month, yearId);
  const villageId = await getOrCreateFolder(drive, safeVillage, monthId);
  const opId      = await getOrCreateFolder(drive, safeOperator, villageId);

  // 4. Upload file
  const stream = Readable.from(photoBuffer);
  const fileRes = await drive.files.create({
    requestBody: {
      name: filename || `foto_${Date.now()}.jpg`,
      parents: [opId],
    },
    media: {
      mimeType: mimeType || 'image/jpeg',
      body: stream,
    },
    fields: 'id',
  });

  const fileId = fileRes.data.id;

  // 5. Set permission: publik baca (agar bisa ditampilkan di web)
  await drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  // 6. Return URL embed langsung (bisa ditampilkan di <img>)
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}
