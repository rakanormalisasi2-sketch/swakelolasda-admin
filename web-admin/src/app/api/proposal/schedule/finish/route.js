import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { differenceInDays } from 'date-fns';

// PUT - Finish an assignment and calculate real duration from logs
export async function PUT(request) {
  try {
    const { assignment_id } = await request.json();
    if (!assignment_id) return NextResponse.json({ error: 'assignment_id required' }, { status: 400 });

    // 1. Get operator logs for this assignment
    const { data: logs, error: logsErr } = await supabaseAdmin
      .from('operator_logs')
      .select('tanggal')
      .eq('assignment_id', assignment_id)
      .order('tanggal', { ascending: true });
      
    if (logsErr) throw logsErr;
    
    if (!logs || logs.length === 0) {
       // Just mark as finished without real dates if no logs
       await supabaseAdmin.from('work_schedules')
         .update({ status: 'selesai' })
         .eq('assignment_id', assignment_id);
       return NextResponse.json({ success: true, message: 'Finished without logs' });
    }

    // 2. Calculate real dates
    const startDate = logs[0].tanggal;
    const endDate = logs[logs.length - 1].tanggal;
    
    // Unique days (just in case multiple logs per day)
    const uniqueDays = new Set(logs.map(l => l.tanggal.split('T')[0])).size;

    // 3. Update work schedule
    const updates = {
      status: 'selesai',
      tanggal_mulai_real: startDate,
      tanggal_selesai_real: endDate,
      durasi_real_hari: uniqueDays,
      updated_at: new Date().toISOString()
    };

    const { data: schedule, error: updateErr } = await supabaseAdmin
      .from('work_schedules')
      .update(updates)
      .eq('assignment_id', assignment_id)
      .select()
      .single();

    if (updateErr) throw updateErr;
    
    // 4. (Optional) Auto-adjust logic for other items on the same equipment could go here, 
    // but for now we let the frontend handle the visual shift, or we can build a complex shift algorithm later.
    // The visual shift on frontend is usually enough since planned weeks are just planned weeks.

    return NextResponse.json(schedule);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
