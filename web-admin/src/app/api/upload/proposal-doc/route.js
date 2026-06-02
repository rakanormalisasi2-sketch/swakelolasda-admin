import { NextResponse } from 'next/server';
import { uploadRekapDocToDrive } from '@/lib/gdrive-upload';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const sectionRole = formData.get('section_role');
    const proposalName = formData.get('proposal_name') || 'Tanpa Nama';

    if (!file || typeof file === 'string') {
      return NextResponse.json({ success: false, error: 'Field "file" tidak ditemukan atau invalid.' }, { status: 400 });
    }
    if (!sectionRole) {
      return NextResponse.json({ success: false, error: 'Parameter "section_role" wajib diisi.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || 'application/pdf';
    const filename = file.name || `proposal_${Date.now()}.pdf`;

    const webViewLink = await uploadRekapDocToDrive({
      sectionRole,
      submenuName: 'Perencanaan Proposal',
      proposalName,
      fileBuffer,
      mimeType,
      filename,
    });

    return NextResponse.json({ success: true, url: webViewLink });

  } catch (err) {
    console.error('[Upload Proposal Doc API] Error:', err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
