import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { Readable } from 'stream';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase admin environment variables are missing.');
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

function getOAuth2Client(refreshToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!clientId || !clientSecret || !appUrl) {
    throw new Error('Google Drive environment variables are missing.');
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    `${appUrl}/api/auth/google/callback`
  );

  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

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

export async function uploadPhotoToDrive({ sectionRole, operatorName, village, district, equipment, date, photoBuffer, mimeType, filename }) {
  const supabaseAdmin = getSupabaseAdmin();

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

  const oauth2Client = getOAuth2Client(sectionData.google_refresh_token);
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  const d = date ? new Date(date) : new Date();
  const year = d.getFullYear().toString();
  const dateFolder = d.toISOString().split('T')[0];

  const safeDistrict = (district || 'TIDAK DIKETAHUI').toUpperCase();
  const safeVillage = (village || 'TIDAK DIKETAHUI').toUpperCase();
  const safeEquipment = (equipment || 'ALAT BERAT').toUpperCase();
  const safeOperator = (operatorName || 'OPERATOR').toUpperCase();

  const root = sectionData.google_root_folder_id;
  const yearId = await getOrCreateFolder(drive, year, root);
  const kecId = await getOrCreateFolder(drive, safeDistrict, yearId);
  const desaId = await getOrCreateFolder(drive, safeVillage, kecId);
  const alatId = await getOrCreateFolder(drive, safeEquipment, desaId);
  const opId = await getOrCreateFolder(drive, safeOperator, alatId);
  const tanggalId = await getOrCreateFolder(drive, dateFolder, opId);

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

  await drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
}
