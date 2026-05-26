import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { uploadSurveyDocToDrive } from '@/lib/gdrive-upload';

export async function POST(request) {
  try {
    const formData = await request.formData();
    
    const proposal_id = formData.get('proposal_id');
    const scoresStr = formData.get('scores'); // JSON string
    const sectionRole = formData.get('section_role');
    const kecamatan = formData.get('kecamatan');
    const desa = formData.get('desa');
    const nama_usulan = formData.get('nama_usulan');
    
    const pdfFile = formData.get('pdf_file'); // File object
    const photoFile = formData.get('photo_file'); // File object
    
    if (!proposal_id || !scoresStr) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    const scores = JSON.parse(scoresStr);

    let pdfUrl = null;
    let photoUrl = null;

    // 1. Upload PDF to Google Drive
    if (pdfFile && typeof pdfFile !== 'string') {
      const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());
      pdfUrl = await uploadSurveyDocToDrive({
        sectionRole,
        submenuName: 'Perencanaan Proposal',
        kecamatan,
        desa,
        proposalName: nama_usulan,
        fileBuffer: pdfBuffer,
        mimeType: 'application/pdf',
        filename: `BA_Survei_${nama_usulan.replace(/\s+/g, '_')}.pdf`
      });
    }

    // 2. Upload Photo to Google Drive
    if (photoFile && typeof photoFile !== 'string') {
      const photoBuffer = Buffer.from(await photoFile.arrayBuffer());
      photoUrl = await uploadSurveyDocToDrive({
        sectionRole,
        submenuName: 'Perencanaan Proposal',
        kecamatan,
        desa,
        proposalName: nama_usulan,
        fileBuffer: photoBuffer,
        mimeType: photoFile.type || 'image/jpeg',
        filename: `Foto_Survei_${nama_usulan.replace(/\s+/g, '_')}.jpg`
      });
    }

    // 3. Update DB
    // First update the proposal to sudah_survey = true
    await supabaseAdmin.from('proposals').update({
      sudah_survey: true,
      tanggal_survey: new Date().toISOString().split('T')[0],
      link_proposal: pdfUrl || undefined // Store the BA link in link_proposal
    }).eq('id', proposal_id);

    // Calculate presentase
    // We assume the criteria structure from TabPrioritas
    // Kerawanan Bencana (1-4, 30%), Dampak (1-4, 25%), Bahaya (1-3, 20%), Bentuk (1-4, 15%), Jarak (1-9, 10%)
    let skor_kerawanan = scores.skor_kerawanan || null;
    let skor_dampak = scores.skor_dampak || null;
    let skor_bahaya = scores.skor_bahaya || null;
    let skor_bentuk = scores.skor_bentuk || null;
    let skor_jarak = scores.skor_jarak || null;

    let presentase = 0;
    let filledCount = 0;

    if (skor_kerawanan) { presentase += (skor_kerawanan / 4) * 0.30; filledCount++; }
    if (skor_dampak) { presentase += (skor_dampak / 4) * 0.25; filledCount++; }
    if (skor_bahaya) { presentase += (skor_bahaya / 3) * 0.20; filledCount++; }
    if (skor_bentuk) { presentase += (skor_bentuk / 4) * 0.15; filledCount++; }
    if (skor_jarak) { presentase += (skor_jarak / 9) * 0.10; filledCount++; }

    let prioritas = null;
    let presentase_total = null;

    if (filledCount > 0) {
      presentase_total = Math.round(presentase * 100 * 100) / 100;
      if (filledCount === 5) {
        prioritas = presentase_total > 75 ? 'A' : presentase_total > 50 ? 'B' : presentase_total > 25 ? 'C' : 'D';
      }
    }

    const { data: priorityData, error: priorityErr } = await supabaseAdmin
      .from('proposal_priorities')
      .upsert({
        proposal_id,
        kerawanan_bencana: scores.kerawanan_bencana,
        skor_kerawanan,
        dampak_kerusakan: scores.dampak_kerusakan,
        skor_dampak,
        kelas_bahaya: scores.kelas_bahaya,
        skor_bahaya,
        bentuk_kegiatan: scores.bentuk_kegiatan,
        skor_bentuk,
        jarak_akses: scores.jarak_akses,
        skor_jarak,
        presentase_total,
        prioritas,
        updated_at: new Date().toISOString()
      }, { onConflict: 'proposal_id' })
      .select();

    if (priorityErr) throw priorityErr;

    return NextResponse.json({ success: true, pdfUrl, photoUrl });
  } catch (error) {
    console.error('Survey Submit Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
