// supabase/functions/billing-reconciliation/index.ts
// Billing Reconciliation Report — matches services rendered to invoiced line items,
// flags unbilled services and overdue balances.
// Roles: admin, super_admin
// Rate limit: 20 req / 60s

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { authorize } from "../_shared/authorize.ts";
import { withRateLimit } from "../_shared/rateLimit.ts";
import { validateRequest, validationErrorResponse } from "../_shared/validation.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const requestSchema = z.object({
  hospital_id:  z.string().uuid(),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),  // YYYY-MM-DD
  period_end:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  include_line_items: z.boolean().optional().default(false),
});

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authError = await authorize(req, ['admin', 'super_admin']);
  if (authError) return authError;

  const validation = await validateRequest(req, requestSchema);
  if (!validation.success) return validationErrorResponse(validation.error);

  const { hospital_id, period_start, period_end, include_line_items } = validation.data;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const startTs = `${period_start}T00:00:00`;
    const endTs   = `${period_end}T23:59:59`;

    // ── 1. Invoice summary ────────────────────────────────────────────────────
    const { data: invoices, error: e1 } = await supabase
      .from('invoices')
      .select(`
        id, status, total_amount, amount_paid, amount_due,
        created_at, due_date,
        patients ( first_name, last_name, mrn )
      `)
      .eq('hospital_id', hospital_id)
      .gte('created_at', startTs)
      .lte('created_at', endTs);

    if (e1) throw e1;

    const invoiceList = (invoices ?? []) as Array<{
      id: string;
      status: string;
      total_amount: number;
      amount_paid: number;
      amount_due: number;
      created_at: string;
      due_date: string | null;
      patients: { first_name: string; last_name: string; mrn: string } | null;
    }>;

    // ── 2. Payment summary ────────────────────────────────────────────────────
    const { data: payments } = await supabase
      .from('invoice_payments')
      .select('id, amount, payment_method, created_at')
      .eq('hospital_id', hospital_id)
      .gte('created_at', startTs)
      .lte('created_at', endTs);

    // ── 3. Unbilled completed consultations ───────────────────────────────────
    const { data: unbilledConsults } = await supabase
      .from('consultations')
      .select('id, patient_id, created_at, chief_complaint')
      .eq('hospital_id', hospital_id)
      .eq('status', 'completed')
      .gte('created_at', startTs)
      .lte('created_at', endTs)
      .is('invoice_id', null);  // No invoice linked

    // ── 4. Overdue invoices ───────────────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0];
    const overdueInvoices = invoiceList.filter(
      i => i.status === 'pending' && i.due_date && i.due_date < today
    );

    // ── 5. Revenue aggregates ─────────────────────────────────────────────────
    const totalBilled = invoiceList.reduce((s, i) => s + (i.total_amount ?? 0), 0);
    const totalCollected = invoiceList.reduce((s, i) => s + (i.amount_paid ?? 0), 0);
    const totalOutstanding = invoiceList.reduce((s, i) => s + (i.amount_due ?? 0), 0);

    const byStatus = invoiceList.reduce((acc: Record<string, { count: number; amount: number }>, i) => {
      acc[i.status] ??= { count: 0, amount: 0 };
      acc[i.status].count += 1;
      acc[i.status].amount += i.total_amount ?? 0;
      return acc;
    }, {});

    const lineItems = include_line_items ? invoiceList.map(i => ({
      invoice_id: i.id,
      patient: i.patients,
      status: i.status,
      total: i.total_amount,
      paid: i.amount_paid,
      outstanding: i.amount_due,
      due_date: i.due_date,
      created_at: i.created_at,
    })) : undefined;

    const report = {
      period_start,
      period_end,
      generated_at: new Date().toISOString(),
      revenue: {
        total_billed:       totalBilled,
        total_collected:    totalCollected,
        total_outstanding:  totalOutstanding,
        collection_rate:    totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0,
      },
      invoices: {
        total_count: invoiceList.length,
        by_status: byStatus,
        overdue_count:  overdueInvoices.length,
        overdue_amount: overdueInvoices.reduce((s, i) => s + (i.amount_due ?? 0), 0),
      },
      payments: {
        total_count: payments?.length ?? 0,
        total_amount: (payments ?? []).reduce((s: number, p: { amount: number }) => s + (p.amount ?? 0), 0),
        by_method: (payments ?? []).reduce((acc: Record<string, number>, p: { payment_method: string; amount: number }) => {
          acc[p.payment_method] = (acc[p.payment_method] ?? 0) + p.amount;
          return acc;
        }, {}),
      },
      unbilled_consultations: {
        count:   unbilledConsults?.length ?? 0,
        details: (unbilledConsults ?? []).map(c => ({
          consultation_id: c.id,
          patient_id: c.patient_id,
          completed_at: c.created_at,
          chief_complaint: c.chief_complaint,
        })),
      },
      line_items: lineItems,
    };

    return new Response(JSON.stringify(report), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (err) {
    console.error("Billing reconciliation error:", (err as Error).message);
    return new Response(
      JSON.stringify({ error: 'Failed to generate billing reconciliation report' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve((req) => withRateLimit(req, handler, { maxRequests: 20, windowMs: 60_000 }));
