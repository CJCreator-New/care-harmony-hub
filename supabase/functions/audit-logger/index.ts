import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, corsHeaders as defaultCorsHeaders } from "../_shared/cors.ts";
import { authorize } from "../_shared/authorize.ts";
import { withRateLimit } from "../_shared/rateLimit.ts";
import { validateRequest } from "../_shared/validation.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const auditSchema = z.object({
  action: z.string().min(1),
  events: z.any().optional(),
});

interface AuditEvent {
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authError = await authorize(req, ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'accountant', 'super_admin']);
  if (authError) return authError;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const validation = await validateRequest(req, auditSchema);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: validation.error }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    const { action, events } = validation.data;

    switch (action) {
      case 'log_event':
        return await logAuditEvent(supabase, events, req);
      case 'get_audit_trail':
        return await getAuditTrail(supabase, events);
      case 'search_logs':
        return await searchAuditLogs(supabase, events);
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

async function logAuditEvent(supabase: any, event: AuditEvent, req: Request) {
  const clientIP = req.headers.get('x-forwarded-for') || 
                   req.headers.get('x-real-ip') || 
                   'unknown';
  
  const userAgent = req.headers.get('user-agent') || 'unknown';

  // Derive hospital_id server-side from the event user's profile (R9)
  const { data: profile } = await supabase
    .from('profiles')
    .select('hospital_id')
    .eq('user_id', event.user_id)
    .maybeSingle();

  const auditRecord = {
    ...event,
    hospital_id: profile?.hospital_id ?? null,
    ip_address: clientIP,
    user_agent: userAgent,
    timestamp: new Date().toISOString(),
    severity: getSeverityLevel(event.action, event.resource_type),
  };

  const { error } = await supabase
    .from('audit_logs')
    .insert(auditRecord);

  if (error) throw error;

  // Check for high-risk activities
  if (auditRecord.severity === 'high' || auditRecord.severity === 'critical') {
    await createSecurityAlert(supabase, auditRecord);
  }

  return new Response(
    JSON.stringify({ success: true, logged: true }),
    { headers: { "Content-Type": "application/json", ...defaultCorsHeaders } }
  );
}

async function getAuditTrail(supabase: any, { resource_type, resource_id, limit = 50 }: any) {
  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (resource_type) {
    query = query.eq('resource_type', resource_type);
  }

  if (resource_id) {
    query = query.eq('resource_id', resource_id);
  }

  const { data, error } = await query;
  if (error) throw error;

  return new Response(
    JSON.stringify({ audit_trail: data }),
    { headers: { "Content-Type": "application/json", ...defaultCorsHeaders } }
  );
}

async function searchAuditLogs(supabase: any, { user_id, action, start_date, end_date, limit = 100 }: any) {
  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (user_id) query = query.eq('user_id', user_id);
  if (action) query = query.eq('action', action);
  if (start_date) query = query.gte('timestamp', start_date);
  if (end_date) query = query.lte('timestamp', end_date);

  const { data, error } = await query;
  if (error) throw error;

  return new Response(
    JSON.stringify({ logs: data, total: data.length }),
    { headers: { "Content-Type": "application/json", ...defaultCorsHeaders } }
  );
}

function getSeverityLevel(action: string, resourceType: string): string {
  const highRiskActions = ['delete', 'export', 'bulk_update', 'admin_access'];
  const criticalResources = ['patients', 'medical_records', 'prescriptions'];
  
  if (highRiskActions.some(a => action.includes(a))) return 'high';
  if (criticalResources.includes(resourceType) && action === 'view') return 'medium';
  if (action.includes('login') || action.includes('logout')) return 'low';
  
  return 'medium';
}

async function createSecurityAlert(supabase: any, auditRecord: any) {
  const alert = {
    type: 'security_event',
    severity: auditRecord.severity,
    message: `High-risk activity: ${auditRecord.action} on ${auditRecord.resource_type}`,
    details: auditRecord,
    timestamp: new Date().toISOString(),
  };

  await supabase.from('security_alerts').insert(alert);
}

serve((req) => withRateLimit(req, handler));
