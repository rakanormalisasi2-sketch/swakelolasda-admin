import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { goalSeekBisectionPerencanaan, goalSeekBisectionPelaksanaan } from '@/utils/calcRapMath';

/**
 * GET /api/rap/calculations
 * Ambil calculation results by project_id
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const activeOnly = searchParams.get('active');

    let query = supabase
      .from('rap_calculations')
      .select('*')
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (activeOnly === 'true') {
      query = query.eq('is_active', true).limit(1);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/rap/calculations
 * Jalankan GoalSeek + simpan hasil ke Supabase
 *
 * Body:
 * {
 *   project_id: UUID,
 *   // GoalSeek params
 *   mode: 'perencanaan' | 'pelaksanaan',
 *   // Perencanaan
 *   volume?: number,
 *   totalBBM?: number,
 *   // Excavator specs
 *   excavator_type?: string,
 *   hp?: number,
 *   bucket?: number,
 *   fb?: number,
 *   fa?: number,
 *   fv?: number,
 *   fk?: number,
 *   loadFactor?: number,
 *   waktuGali?: number,
 *   // Pelaksanaan
 *   dailyData?: Array<{ jamKerja, galian, bbmPakai }>
 * }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      project_id,
      mode = 'perencanaan',
      // GoalSeek params
      volume,
      totalBBM,
      targetSisaMin = 40,
      targetSisaMax = 100,
      targetSisaIdeal = 70,
      // Excavator specs
      excavator_type = 'PC200',
      hp = 148,
      bucket = 0.9,
      fb = 1.0,
      fa = 0.7,
      fv = 0.8,
      fk = 0.8,
      loadFactor = 0.28,
      waktuGali = 38,
      tk = 8,
      // Pelaksanaan
      dailyData = [],
      totalBBMditerima = 0
    } = body;

    if (!project_id) {
      return NextResponse.json({ error: 'project_id required' }, { status: 400 });
    }

    // Run GoalSeek
    let goalseekResult;
    if (mode === 'perencanaan') {
      if (!volume || !totalBBM) {
        return NextResponse.json(
          { error: 'volume and totalBBM required for perencanaan mode' },
          { status: 400 }
        );
      }
      goalseekResult = goalSeekBisectionPerencanaan({
        volume,
        totalBBM,
        targetSisaMin,
        targetSisaMax,
        targetSisaIdeal,
        hp,
        bucket,
        fb,
        fa,
        fv,
        fk,
        loadFactor,
        waktuGali,
        tk
      });
    } else {
      if (!volume || !totalBBMditerima) {
        return NextResponse.json(
          { error: 'volume and totalBBMditerima required for pelaksanaan mode' },
          { status: 400 }
        );
      }
      goalseekResult = goalSeekBisectionPelaksanaan({
        totalVolume: volume,
        totalBBMditerima,
        dailyData,
        targetSisaMin,
        targetSisaMax,
        hp,
        loadFactor
      });
    }

    // Deactivate previous calculations for this project
    await supabase
      .from('rap_calculations')
      .update({ is_active: false, version: supabase.rpc('increment_version', { x: 1 }) })
      .eq('project_id', project_id)
      .eq('is_active', true);

    // Get current max version
    const { data: existing } = await supabase
      .from('rap_calculations')
      .select('version')
      .eq('project_id', project_id)
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = (existing?.[0]?.version || 0) + 1;

    // Insert new calculation
    const insertData = {
      project_id,
      excavator_type,
      hp,
      bucket,
      fb,
      fa,
      fv,
      fk,
      load_factor: loadFactor,
      waktu_gali: waktuGali,
      // GoalSeek results
      t1: goalseekResult.t1,
      t1_detik: goalseekResult.t1_detik,
      q1: goalseekResult.q1,
      q2: goalseekResult.q2,
      h_liter_jam: goalseekResult.h,
      h2: goalseekResult.h2,
      koef_bbm: goalseekResult.koefBBM,
      estimasi_hari: goalseekResult.estimasiHari,
      total_solar_used: goalseekResult.totalSolarUsed,
      sisa_akhir: goalseekResult.sisaAkhir,
      // Metadata
      goalseek_status: goalseekResult.status,
      goalseek_converged: goalseekResult.converged,
      dalam_range_sni: goalseekResult.dalamRangeSNI,
      version: nextVersion,
      is_active: true
    };

    const { data, error } = await supabase
      .from('rap_calculations')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      goalseek: goalseekResult
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
