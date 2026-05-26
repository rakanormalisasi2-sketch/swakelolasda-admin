import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET - Surveyed proposals with priority scores and all active criteria
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tahun = searchParams.get('tahun') || new Date().getFullYear();
    const role = searchParams.get('role');

    // 1. Get all active criteria
    let critQuery = supabaseAdmin
      .from('priority_criteria')
      .select('*')
      .eq('is_active', true)
      .order('urutan', { ascending: true });
    
    // role_scope can be null (applies to both) or match the specific role
    if (role) {
      critQuery = critQuery.or(`role_scope.is.null,role_scope.eq.${role}`);
    }

    const { data: criteria, error: critErr } = await critQuery;
    if (critErr) throw critErr;

    // 2. Get proposals (fetch up to current year, to support carry-forward of unfinished work)
    let propQuery = supabaseAdmin
      .from('proposals')
      .select('*, proposal_scores(*), work_schedules(status)')
      .lte('tahun', tahun)
      .eq('sudah_survey', true)
      .order('nomor_urut', { ascending: true })
      .order('created_at', { ascending: true });
      
    if (role) {
      propQuery = propQuery.eq('created_by_role', role);
    }

    const { data: rawProposals, error: propErr } = await propQuery;
    if (propErr) throw propErr;

    // Filter carry-forward: 
    // If proposal is from a previous year, it must NOT have any work_schedule with status 'selesai'
    const currentTahun = parseInt(tahun);
    const proposals = (rawProposals || []).filter(p => {
      if (p.tahun < currentTahun) {
        const isSelesai = p.work_schedules && p.work_schedules.some(ws => ws.status === 'selesai');
        if (isSelesai) return false;
      }
      return true;
    });

    // 3. Process each proposal to calculate presentase based on current active criteria
    const result = (proposals || []).map(p => {
      let presentase = 0;
      let filledCount = 0;
      
      const scoresByCriteria = {};
      if (p.proposal_scores) {
        p.proposal_scores.forEach(s => {
          scoresByCriteria[s.criteria_id] = s;
        });
      }

      criteria.forEach(c => {
        const s = scoresByCriteria[c.id];
        if (s && s.skor != null) {
          presentase += (s.skor / c.skor_maksimal) * (c.bobot / 100);
          filledCount++;
        }
      });

      presentase = presentase * 100;
      const rounded = Math.round(presentase * 100) / 100;
      
      // Require all criteria to be filled to get a priority grade
      const prioritas = filledCount === criteria.length ? 
        (rounded > 75 ? 'A' : rounded > 50 ? 'B' : rounded > 25 ? 'C' : 'D') : null;

      return {
        ...p,
        scores: scoresByCriteria,
        presentase_total: filledCount > 0 ? rounded : null,
        prioritas
      };
    });

    return NextResponse.json({ proposals: result, criteria });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Upsert a score for a specific criteria
export async function PUT(request) {
  try {
    const body = await request.json();
    const { proposal_id, criteria_id, pilihan_label, skor } = body;
    
    if (!proposal_id || !criteria_id) {
      return NextResponse.json({ error: 'proposal_id and criteria_id required' }, { status: 400 });
    }

    const row = {
      proposal_id,
      criteria_id,
      pilihan_label,
      skor
    };

    const { data, error } = await supabaseAdmin
      .from('proposal_scores')
      .upsert(row, { onConflict: 'proposal_id, criteria_id' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
