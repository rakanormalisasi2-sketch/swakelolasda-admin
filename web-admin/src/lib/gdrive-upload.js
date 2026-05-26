import { google } from 'googleapis';
import { supabaseAdmin } from './supabase-admin';
import { Readable } from 'stream';

// Using centralized supabaseAdmin instead of local getSupabaseAdmin()

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

export async function uploadWarehousePhotoToDrive({ transactionType, categoryName, itemName, date, photoBuffer, mimeType, filename }) {
  const { data: sectionData, error: dbErr } = await supabaseAdmin
    .from('section_settings')
    .select('google_refresh_token, google_root_folder_id')
    .eq('role', 'tim_peralatan')
    .single();

  if (dbErr || !sectionData?.google_refresh_token) {
    throw new Error('Google Drive belum terhubung. Admin Tim Peralatan harus login dulu di halaman Pengaturan.');
  }

  if (!sectionData.google_root_folder_id) {
    throw new Error('Root Folder ID Google Drive belum di-isi. Admin Tim Peralatan harus mengisinya di halaman Pengaturan.');
  }

  const oauth2Client = getOAuth2Client(sectionData.google_refresh_token);
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  const root = sectionData.google_root_folder_id;
  const gudangId = await getOrCreateFolder(drive, 'Gudang', root);
  const transTypeFolder = transactionType === 'masuk' ? 'Masuk' : 'Keluar';
  const typeId = await getOrCreateFolder(drive, transTypeFolder, gudangId);
  const safeCategory = (categoryName || 'Lainnya').toUpperCase();
  const catId = await getOrCreateFolder(drive, safeCategory, typeId);
  const safeItem = (itemName || 'Barang').toUpperCase();
  const itemId = await getOrCreateFolder(drive, safeItem, catId);

  const stream = Readable.from(photoBuffer);
  const fileRes = await drive.files.create({
    requestBody: {
      name: filename || `foto_${Date.now()}.jpg`,
      parents: [itemId],
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

export async function uploadRekapDocToDrive({ sectionRole, submenuName, proposalName, fileBuffer, mimeType, filename }) {
  const { data: sectionData, error: dbErr } = await supabaseAdmin
    .from('section_settings')
    .select('google_refresh_token, google_root_folder_id')
    .eq('role', sectionRole)
    .single();

  if (dbErr || !sectionData?.google_refresh_token) {
    throw new Error('Google Drive belum terhubung.');
  }

  const oauth2Client = getOAuth2Client(sectionData.google_refresh_token);
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  const root = sectionData.google_root_folder_id;

  const safeSubmenu = (submenuName || 'Perencanaan Proposal').replace(/[\\/:*?"<>|]/g, '_');
  const submenuId = await getOrCreateFolder(drive, safeSubmenu, root);
  const rekapId = await getOrCreateFolder(drive, 'Rekapitulasi Proposal', submenuId);
  const docId = await getOrCreateFolder(drive, 'Dokumen Proposal', rekapId);
  const safeProposal = (proposalName || 'Tanpa Nama').replace(/[\\/:*?"<>|]/g, '_');
  const proposalFolderId = await getOrCreateFolder(drive, safeProposal, docId);

  const stream = Readable.from(fileBuffer);
  const fileRes = await drive.files.create({
    requestBody: { name: filename, parents: [proposalFolderId] },
    media: { mimeType, body: stream },
    fields: 'id, webViewLink',
  });

  await drive.permissions.create({
    fileId: fileRes.data.id,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  return fileRes.data.webViewLink; // Return full link for PDF
}

export async function uploadSurveyDocToDrive({ sectionRole, submenuName, kecamatan, desa, proposalName, fileBuffer, mimeType, filename }) {
  const { data: sectionData, error: dbErr } = await supabaseAdmin
    .from('section_settings')
    .select('google_refresh_token, google_root_folder_id')
    .eq('role', sectionRole)
    .single();

  if (dbErr || !sectionData?.google_refresh_token) {
    throw new Error('Google Drive belum terhubung.');
  }

  const oauth2Client = getOAuth2Client(sectionData.google_refresh_token);
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  const root = sectionData.google_root_folder_id;

  const safeSubmenu = (submenuName || 'Perencanaan Proposal').replace(/[\\/:*?"<>|]/g, '_');
  const submenuId = await getOrCreateFolder(drive, safeSubmenu, root);
  const surveyId = await getOrCreateFolder(drive, 'Data Survei', submenuId);
  
  const safeKecDesa = `${kecamatan || 'Kec'}.${desa || 'Desa'}`.replace(/[\\/:*?"<>|]/g, '_');
  const kecDesaId = await getOrCreateFolder(drive, safeKecDesa, surveyId);
  
  const safeProposal = (proposalName || 'Tanpa Nama').replace(/[\\/:*?"<>|]/g, '_');
  const proposalFolderId = await getOrCreateFolder(drive, safeProposal, kecDesaId);

  const stream = Readable.from(fileBuffer);
  const fileRes = await drive.files.create({
    requestBody: { name: filename, parents: [proposalFolderId] },
    media: { mimeType, body: stream },
    fields: 'id, webViewLink',
  });

  await drive.permissions.create({
    fileId: fileRes.data.id,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  // If it's an image, return thumbnail link, otherwise webViewLink
  if (mimeType.startsWith('image/')) {
    return `https://drive.google.com/thumbnail?id=${fileRes.data.id}&sz=w800`;
  }
  return fileRes.data.webViewLink;
}
