import { NextResponse } from 'next/server';
import { uploadSurveyDocToDrive } from '@/lib/gdrive-upload';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const sectionRole = formData.get('section_role');
    const proposalName = formData.get('proposal_name') || 'Tanpa Nama';
    const kecamatan = formData.get('kecamatan') || '';
    const desa = formData.get('desa') || '';
    const noUrut = formData.get('no_urut') || '';

    if (!file || typeof file === 'string') {
      return NextResponse.json({ success: false, error: 'Field "file" tidak ditemukan atau invalid.' }, { status: 400 });
    }
    if (!sectionRole) {
      return NextResponse.json({ success: false, error: 'Parameter "section_role" wajib diisi.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || 'application/pdf';
    const filename = file.name || `survey_${Date.now()}`;

    const pdfLinks = await uploadSurveyDocToDrive({
      sectionRole,
      submenuName: 'Perencanaan Proposal',
      kecamatan,
      desa,
      noUrut,
      proposalName,
      fileBuffer,
      mimeType,
      filename,
      isPhoto: mimeType.startsWith('image/')
    });

    // uploadSurveyDocToDrive returns a string for images, or an object for others.
    const finalUrl = typeof pdfLinks === 'string' ? pdfLinks : pdfLinks.webViewLink;

    return NextResponse.json({ success: true, url: finalUrl });

  } catch (err) {
    console.error('[Upload Survey Doc Manual API] Error:', err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
