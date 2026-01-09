import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = (globalThis as any).Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = (globalThis as any).Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, params } = await req.json();

    switch (action) {
      case 'get_kpis':
        return await getKPIs(supabase, params);
      case 'get_financial_metrics':
        return await getFinancialMetrics(supabase, params);
      case 'get_operational_metrics':
        return await getOperationalMetrics(supabase, params);
      case 'get_clinical_metrics':
        return await getClinicalMetrics(supabase, params);
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

async function getKPIs(supabase: any, { period = '30d' }: any) {
  const startDate = getStartDate(period);
  
  // Patient metrics
  const { data: patientStats } = await supabase
    .from('patients')
    .select('id, created_at')
    .gte('created_at', startDate);

  // Appointment metrics
  const { data: appointmentStats } = await supabase
    .from('appointments')
    .select('id, status, scheduled_at')
    .gte('scheduled_at', startDate);

  // Revenue metrics
  const { data: billingStats } = await supabase
    .from('billing')
    .select('amount, status, created_at')
    .gte('created_at', startDate);

  // Staff utilization
  const { data: consultationStats } = await supabase
    .from('consultations')
    .select('id, doctor_id, created_at')
    .gte('created_at', startDate);

  const kpis = {
    patient_metrics: {
      total_patients: patientStats?.length || 0,
      new_patients: patientStats?.filter(p => 
        new Date(p.created_at) >= new Date(startDate)
      ).length || 0,
    },
    appointment_metrics: {
      total_appointments: appointmentStats?.length || 0,
      completed_appointments: appointmentStats?.filter(a => a.status === 'completed').length || 0,
      cancelled_appointments: appointmentStats?.filter(a => a.status === 'cancelled').length || 0,
      no_show_rate: calculateRate(
        appointmentStats?.filter(a => a.status === 'no_show').length || 0,
        appointmentStats?.length || 0
      ),
    },
    financial_metrics: {
      total_revenue: billingStats?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0,
      pending_payments: billingStats?.filter(b => b.status === 'pending')
        .reduce((sum, b) => sum + (b.amount || 0), 0) || 0,
      collection_rate: calculateRate(
        billingStats?.filter(b => b.status === 'paid')
          .reduce((sum, b) => sum + (b.amount || 0), 0) || 0,
        billingStats?.reduce((sum, b) => sum + (b.amount || 0), 0) || 1
      ),
    },
    operational_metrics: {
      total_consultations: consultationStats?.length || 0,
      avg_consultations_per_doctor: calculateAverage(
        consultationStats?.length || 0,
        new Set(consultationStats?.map(c => c.doctor_id)).size || 1
      ),
    },
  };

  return new Response(
    JSON.stringify({ kpis, period }),
    { headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

async function getFinancialMetrics(supabase: any, { period = '30d' }: any) {
  const startDate = getStartDate(period);

  const { data: billing } = await supabase
    .from('billing')
    .select('*')
    .gte('created_at', startDate);

  const { data: prescriptions } = await supabase
    .from('prescriptions')
    .select('*, medications(*)')
    .gte('created_at', startDate);

  const revenue_by_service = billing?.reduce((acc: any, bill: any) => {
    const service = bill.service_type || 'consultation';
    acc[service] = (acc[service] || 0) + (bill.amount || 0);
    return acc;
  }, {}) || {};

  const pharmacy_revenue = prescriptions?.reduce((sum: number, p: any) => 
    sum + (p.medications?.reduce((medSum: number, m: any) => 
      medSum + (m.price * m.quantity || 0), 0) || 0), 0) || 0;

  return new Response(
    JSON.stringify({
      revenue_by_service,
      pharmacy_revenue,
      total_revenue: Object.values(revenue_by_service).reduce((a: any, b: any) => a + b, 0) + pharmacy_revenue,
      period
    }),
    { headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

async function getOperationalMetrics(supabase: any, { period = '30d' }: any) {
  const startDate = getStartDate(period);

  // Bed occupancy
  const { data: admissions } = await supabase
    .from('admissions')
    .select('*')
    .gte('admission_date', startDate);

  // Staff productivity
  const { data: consultations } = await supabase
    .from('consultations')
    .select('doctor_id, duration, created_at')
    .gte('created_at', startDate);

  // Wait times
  const { data: appointments } = await supabase
    .from('appointments')
    .select('scheduled_at, actual_start_time')
    .gte('scheduled_at', startDate)
    .not('actual_start_time', 'is', null);

  const avg_wait_time = appointments?.reduce((sum, apt) => {
    const scheduled = new Date(apt.scheduled_at);
    const actual = new Date(apt.actual_start_time);
    return sum + (actual.getTime() - scheduled.getTime());
  }, 0) / (appointments?.length || 1) / (1000 * 60); // Convert to minutes

  return new Response(
    JSON.stringify({
      bed_occupancy_rate: calculateRate(
        admissions?.filter(a => !a.discharge_date).length || 0,
        100 // Assuming 100 total beds
      ),
      avg_consultation_duration: calculateAverage(
        consultations?.reduce((sum, c) => sum + (c.duration || 30), 0) || 0,
        consultations?.length || 1
      ),
      avg_wait_time_minutes: Math.round(avg_wait_time || 0),
      period
    }),
    { headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

async function getClinicalMetrics(supabase: any, { period = '30d' }: any) {
  const startDate = getStartDate(period);

  const { data: consultations } = await supabase
    .from('consultations')
    .select('diagnosis, treatment_outcome, created_at')
    .gte('created_at', startDate);

  const { data: prescriptions } = await supabase
    .from('prescriptions')
    .select('*')
    .gte('created_at', startDate);

  const diagnosis_distribution = consultations?.reduce((acc: any, c: any) => {
    const diagnosis = c.diagnosis || 'unspecified';
    acc[diagnosis] = (acc[diagnosis] || 0) + 1;
    return acc;
  }, {}) || {};

  const treatment_success_rate = calculateRate(
    consultations?.filter(c => c.treatment_outcome === 'improved').length || 0,
    consultations?.length || 0
  );

  return new Response(
    JSON.stringify({
      diagnosis_distribution,
      treatment_success_rate,
      total_prescriptions: prescriptions?.length || 0,
      period
    }),
    { headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

function getStartDate(period: string): string {
  const now = new Date();
  switch (period) {
    case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    case '90d': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    case '1y': return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
    default: return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }
}

function calculateRate(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

function calculateAverage(total: number, count: number): number {
  return count > 0 ? Math.round(total / count) : 0;
}

serve(handler);