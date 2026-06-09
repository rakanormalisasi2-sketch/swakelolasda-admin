import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import ImageModule from 'docxtemplater-image-module-free';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { uploadSurveyDocToDrive, uploadDocxAsPdfToDrive } from '@/lib/gdrive-upload';

export async function POST(request) {
  try {
    const formData = await request.formData();
    
    const proposal_id = formData.get('proposal_id');
    const dynamicScoresStr = formData.get('dynamic_scores'); // Array of { criteria_id, pilihan_label, skor }
    const sectionRole = formData.get('section_role');
    const kecamatan = formData.get('kecamatan') || '';
    const desa = formData.get('desa') || '';
    const nama_usulan = formData.get('nama_usulan') || '';
    const panjang_usulan = formData.get('panjang_usulan') || '';
    const keterangan_lapangan = formData.get('keterangan_lapangan') || '';
    
    // New fields for the BA template
    const sungai = formData.get('sungai') || '';
    const penyebab = formData.get('penyebab') || '';
    const kewenangan = formData.get('kewenangan') || '';
    
    const pdfFile = formData.get('pdf_file'); // File object
    const equipment_id = formData.get('equipment_id'); // From APK (legacy)
    const equipment_category = formData.get('equipment_category'); // From new APK
    
    // Append equipment_category to keterangan_lapangan if provided
    let finalKeterangan = keterangan_lapangan;
    if (equipment_category) {
      finalKeterangan = finalKeterangan 
        ? `${finalKeterangan}\n\nKebutuhan Alat: ${equipment_category}`
        : `Kebutuhan Alat: ${equipment_category}`;
    }
    if (!dynamicScoresStr) {
      return NextResponse.json({ error: 'Missing scores data' }, { status: 400 });
    }

    const dynamicScores = JSON.parse(dynamicScoresStr);
    
    // If no proposal_id, this is an Urgent Survey. We create a stub proposal first.
    let currentProposalId = proposal_id;
    let noUrut = '';
    
    if (!currentProposalId || currentProposalId === 'null') {
      const { data: newProp, error: propErr } = await supabaseAdmin
        .from('proposals')
        .insert({
          tahun: new Date().getFullYear(),
          nama_usulan: nama_usulan || `Survei Urgent - ${kecamatan} ${desa}`.trim(),
          desa,
          kecamatan,
          panjang_lokasi: panjang_usulan,
          created_by_role: sectionRole,
          sudah_survey: true,
          tanggal_survey: new Date().toISOString().split('T')[0],
          tanggal_usulan: new Date().toISOString().split('T')[0],
          keterangan: finalKeterangan
        })
        .select('id, nomor_urut')
        .single();
        
      if (propErr) throw propErr;
      currentProposalId = newProp.id;
      noUrut = newProp.nomor_urut || newProp.id;
    } else {
      const { data: existingProp } = await supabaseAdmin
        .from('proposals')
        .select('nomor_urut')
        .eq('id', currentProposalId)
        .single();
      noUrut = existingProp?.nomor_urut || currentProposalId;
    }

    let pdfLinks = null;

    // 1. Upload PDF directly to Google Drive (sent from APK)
    if (pdfFile && typeof pdfFile !== 'string') {
      try {
        const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());
        pdfLinks = await uploadSurveyDocToDrive({
          sectionRole,
          submenuName: 'Perencanaan Proposal',
          kecamatan,
          desa,
          noUrut,
          proposalName: nama_usulan || 'Urgent',
          fileBuffer: pdfBuffer,
          mimeType: pdfFile.type || 'application/pdf',
          filename: `BA_Survei_${(nama_usulan || 'Urgent').replace(/\s+/g, '_')}.pdf`,
          isPhoto: false
        });
      } catch (err) {
        console.error('Google Drive Upload Failed in survey-submit:', err.message);
      }
    }

    // 2. Update DB
    if (currentProposalId) {
      const updatePayload = {
        sudah_survey: true,
        tanggal_survey: new Date().toISOString().split('T')[0],
      };
      if (pdfLinks?.webViewLink) updatePayload.link_ba_survey = pdfLinks.webViewLink;
      if (finalKeterangan) updatePayload.keterangan = finalKeterangan;
      if (panjang_usulan) updatePayload.panjang_lokasi = panjang_usulan;
      if (nama_usulan) updatePayload.nama_usulan = nama_usulan;
      await supabaseAdmin.from('proposals').update(updatePayload).eq('id', currentProposalId);
    }

    // 3. Insert dynamic scores into proposal_scores
    // APK sends criteria_id as shorthand keys (e.g. 'kerawanan', 'dampak').
    // We need to match them to actual UUID criteria IDs from priority_criteria table.
    if (Array.isArray(dynamicScores) && dynamicScores.length > 0) {
      // Fetch actual criteria from DB to map APK shorthand -> real UUID
      let critQuery = supabaseAdmin
        .from('priority_criteria')
        .select('id, nama_kriteria, opsi')
        .eq('is_active', true);
      if (sectionRole) {
        critQuery = critQuery.or(`role_scope.is.null,role_scope.eq.${sectionRole}`);
      }
      const { data: dbCriteria } = await critQuery;

      const scoreInserts = [];
      for (const score of dynamicScores) {
        if (!score.skor && score.skor !== 0) continue;
        
        // Try to find matching criteria: first try direct UUID match,
        // then try matching by APK shorthand key against criteria name
        let matchedCriteria = dbCriteria?.find(c => c.id === score.criteria_id);
        
        if (!matchedCriteria && dbCriteria) {
          // APK sends keys like 'kerawanan', 'dampak', etc.
          // Match against criteria name containing that keyword
          const apkKey = score.criteria_id?.toLowerCase();
          matchedCriteria = dbCriteria.find(c => 
            c.nama_kriteria?.toLowerCase().includes(apkKey)
          );
        }

        if (matchedCriteria) {
          scoreInserts.push({
            proposal_id: currentProposalId,
            criteria_id: matchedCriteria.id,
            pilihan_label: score.pilihan_label || '',
            skor: score.skor
          });
        }
      }

      if (scoreInserts.length > 0) {
        const { error: scoresErr } = await supabaseAdmin
          .from('proposal_scores')
          .upsert(scoreInserts, { onConflict: 'proposal_id, criteria_id' });

        if (scoresErr) console.error('Score upsert error:', scoresErr);
      }
    }

    // 4. Auto-Schedule if Equipment is selected
    if (equipment_id) {
      // Calculate current week
      const d = new Date();
      const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
      const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
      const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);

      const { error: scheduleErr } = await supabaseAdmin
        .from('schedule')
        .upsert({
          proposal_id: currentProposalId,
          tahun: d.getFullYear(),
          equipment_id: equipment_id,
          nama_desa: desa,
          kecamatan: kecamatan,
          minggu_mulai: weekNum,
          minggu_selesai: weekNum + 1,
          durasi_rencana_minggu: 2,
          created_by_role: sectionRole
        }, { onConflict: 'proposal_id, tahun' });

      if (scheduleErr) console.error('Schedule upsert error:', scheduleErr);
    }

    return NextResponse.json({ 
      success: true, 
      pdfUrl: pdfLinks?.webViewLink, 
      downloadUrl: pdfLinks?.webContentLink 
    });
  } catch (error) {
    console.error('Survey Submit Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
