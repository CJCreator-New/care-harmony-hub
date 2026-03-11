// supabase/functions/census-reports/index.ts
// Ward Census Report — server-side aggregation offloaded from the SPA.
// Roles: admin, doctor, nurse, super_admin
// Rate limit: 30 req / 60s (analytics preset)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { authorize } from "../_shared/authorize.ts";
import { withRateLimit } from "../_shared/rateLimit.ts";
import { validateRequest, validationErrorResponse } from "../_shared/validation.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const requestSchema = z.object({
  hospital_id: z.string().uuid(),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD, defaults to today
  view:        z.enum(['daily', 'weekly', 'monthly']).optional().default('daily'),
});

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authError = await authorize(req, ['admin', 'super_admin', 'doctor', 'nurse']);
  if (authError) return authError;

  const validation = await validateRequest(req, requestSchema);
  if (!validation.success) return validationErrorResponse(validation.error);

  const { hospital_id, date, view } = validation.data;
  const reportDate = date ?? new Date().toISOString().split('T')[0];

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── 1. Active inpatients ──────────────────────────────────────────────────
    const { data: activeConsultations, error: e1 } = await supabase
      .from('consultations')
      .select(`
        id,
        status,
        chief_complaint,
        department,
        created_at,
        patients ( id, first_name, last_name, mrn, gender, date_of_birth ),
        profiles!consultations_doctor_id_fkey ( first_name, last_name )
      `)
      .eq('hospital_id', hospital_id)
      .in('status', ['in_progress', 'admitted'])
      .order('created_at', { ascending: true });

    if (e1) throw e1;

    // ── 2. Admissions today ───────────────────────────────────────────────────
    const { count: admissionsToday } = await supabase
      .from('consultations')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hospital_id)
      .gte('created_at', `${reportDate}T00:00:00`)
      .lte('created_at', `${reportDate}T23:59:59`);

    // ── 3. Discharges today ───────────────────────────────────────────────────
    const { count: dischargesToday } = await supabase
      .from('consultations')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hospital_id)
      .eq('status', 'completed')
      .gte('updated_at', `${reportDate}T00:00:00`)
      .lte('updated_at', `${reportDate}T23:59:59`);

    // ── 4. Department breakdown ───────────────────────────────────────────────
    const deptBreakdown: Record<string, number> = {};
    for (const c of activeConsultations ?? []) {
      const dept = (c.department as string) ?? 'General';
      deptBreakdown[dept] = (deptBreakdown[dept] ?? 0) + 1;
    }

    // ── 5. Queue summary ──────────────────────────────────────────────────────
    const { data: queueData } = await supabase
      .from('queue_entries')
      .select('status')
      .eq('hospital_id', hospital_id)
      .gte('created_at', `${reportDate}T00:00:00`);

    const queueSummary = (queueData ?? []).reduce(
      (acc: Record<string, number>, entry: { status: string }) => {
        acc[entry.status] = (acc[entry.status] ?? 0) + 1;
        return acc;
      },
      {}
    );

    // ── 6. Critical labs pending acknowledgement ──────────────────────────────
    const { count: pendingCriticalAlerts } = await supabase
      .from('lab_critical_acknowledgements')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hospital_id)
      .eq('status', 'pending');

    // ── 7. Trend data (weekly/monthly view) ──────────────────────────────────
    let trendData: unknown[] = [];
    if (view !== 'daily') {
      const daysBack = view === 'weekly' ? 7 : 30;
      const startDate = new Date(reportDate);
      startDate.setDate(startDate.getDate() - daysBack);

      const { data: trend } = await supabase
        .from('consultations')
        .select('created_at, status')
        .eq('hospital_id', hospital_id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', `${reportDate}T23:59:59`);

      // Group by date
      const byDate: Record<string, { admissions: number; discharges: number }> = {};
      for (const row of trend ?? []) {
        const day = (row.created_at as string).split('T')[0];
        byDate[day] ??= { admissions: 0, discharges: 0 };
        byDate[day].admissions += 1;
        if (row.status === 'completed') byDate[day].discharges += 1;
      }
      trendData = Object.entries(byDate).map(([date, counts]) => ({ date, ...counts }));
    }

    const report = {
      report_date: reportDate,
      view,
      generated_at: new Date().toISOString(),
      census: {
        current_inpatient_count: activeConsultations?.length ?? 0,
        admissions_today: admissionsToday ?? 0,
        discharges_today: dischargesToday ?? 0,
        occupancy_by_department: deptBreakdown,
      },
      queue: queueSummary,
      alerts: {
        pending_critical_lab_acks: pendingCriticalAlerts ?? 0,
      },
      inpatients: (activeConsultations ?? []).map(c => ({
        consultation_id: c.id,
        status: c.status,
        chief_complaint: c.chief_complaint,
        department: c.department ?? 'General',
        admitted_at: c.created_at,
        patient: c.patients,
        attending_physician: c.profiles,
      })),
      trend: trendData,
    };

    return new Response(JSON.stringify(report), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (err) {
    console.error("Census report error:", (err as Error).message);
    return new Response(
      JSON.stringify({ error: 'Failed to generate census report' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve((req) => withRateLimit(req, handler, { maxRequests: 30, windowMs: 60_000 }));
