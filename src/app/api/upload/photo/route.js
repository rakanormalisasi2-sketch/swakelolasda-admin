import { NextResponse } from 'next/server';
import { uploadPhotoToDrive } from '@/lib/gdrive-upload';

/**
 * POST /api/upload/photo
 *
 * Menerima foto dari Mobile App Operator dan menguploadnya ke Google Drive
 * sesuai seksi yang menugaskan operator tersebut.
 *
 * REQUEST (multipart/form-data ATAU JSON base64):
 * - photo          : file foto (multipart) ATAU photo_base64 (JSON)
 * - section_role   : 'seksi_normalisasi' | 'seksi_embung'
 * - operator_name  : Nama operator (untuk subfolder Drive)
 * - village        : Nama desa (untuk subfolder Drive)
 * - date           : Tanggal laporan format YYYY-MM-DD
 * - mime_type      : (opsional) default 'image/jpeg'
 * - filename       : (opsional) nama file
 *
 * RESPONSE:
 * { success: true, url: "https://drive.google.com/uc?export=view&id=..." }
 */
export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let photoBuffer, mimeType, filename, sectionRole, operatorName, village, date;

    if (contentType.includes('multipart/form-data')) {
      // --- Mode: multipart/form-data (React Native FormData) ---
      const formData = await request.formData();
      const file = formData.get('photo');

      if (!file || typeof file === 'string') {
        return NextResponse.json({ success: false, error: 'Field "photo" (file) tidak ditemukan.' }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      photoBuffer   = Buffer.from(arrayBuffer);
      mimeType      = file.type || 'image/jpeg';
      filename      = file.name || `foto_${Date.now()}.jpg`;
      sectionRole   = formData.get('section_role');
      operatorName  = formData.get('operator_name');
      village       = formData.get('village');
      date          = formData.get('date');

    } else {
      // --- Mode: JSON dengan photo_base64 ---
      const body = await request.json();
      if (!body.photo_base64) {
        return NextResponse.json({ success: false, error: 'Field "photo_base64" tidak ditemukan.' }, { status: 400 });
      }
      photoBuffer   = Buffer.from(body.photo_base64, 'base64');
      mimeType      = body.mime_type || 'image/jpeg';
      filename      = body.filename || `foto_${Date.now()}.jpg`;
      sectionRole   = body.section_role;
      operatorName  = body.operator_name;
      village       = body.village;
      date          = body.date;
    }

    if (!sectionRole) {
      return NextResponse.json({ success: false, error: 'Parameter "section_role" wajib diisi.' }, { status: 400 });
    }

    // Upload ke Google Drive
    const url = await uploadPhotoToDrive({
      sectionRole,
      operatorName,
      village,
      date,
      photoBuffer,
      mimeType,
      filename,
    });

    return NextResponse.json({ success: true, url });

  } catch (err) {
    console.error('[Upload Photo API] Error:', err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
