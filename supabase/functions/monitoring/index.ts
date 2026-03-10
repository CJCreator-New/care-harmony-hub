import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, corsHeaders as defaultCorsHeaders } from "../_shared/cors.ts";
import { authorize } from "../_shared/authorize.ts";
import { withRateLimit } from "../_shared/rateLimit.ts";
import { validateRequest } from "../_shared/validation.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const monitoringSchema = z.object({
  action: z.string().min(1),
  data: z.any().optional(),
});

interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

interface MetricData {
  timestamp: string;
  service: string;
  metric_name: string;
  value: number;
  status: string;
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authError = await authorize(req, ['admin', 'super_admin']);
  if (authError) return authError;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const validation = await validateRequest(req, monitoringSchema);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: validation.error }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    const { action, data } = validation.data;

    switch (action) {
      case 'collect_metrics':
        return await collectMetrics(supabase, data);
      case 'check_alerts':
        return await checkAlerts(supabase);
      case 'get_status':
        return await getSystemStatus(supabase);
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

async function collectMetrics(supabase: any, metrics: MetricData[]) {
  const { error } = await supabase
    .from('system_metrics')
    .insert(metrics);

  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true, collected: metrics.length }),
    { headers: { "Content-Type": "application/json", ...defaultCorsHeaders } }
  );
}

async function checkAlerts(supabase: any) {
  const { data: rules } = await supabase
    .from('alert_rules')
    .select('*')
    .eq('enabled', true);

  const alerts = [];
  
  for (const rule of rules || []) {
    const { data: metrics } = await supabase
      .from('system_metrics')
      .select('*')
      .eq('metric_name', rule.condition)
      .gte('timestamp', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false })
      .limit(1);

    if (metrics?.[0]?.value > rule.threshold) {
      alerts.push({
        rule_id: rule.id,
        severity: rule.severity,
        message: `${rule.name}: ${metrics[0].value} exceeds threshold ${rule.threshold}`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  if (alerts.length > 0) {
    await supabase.from('system_alerts').insert(alerts);
  }

  return new Response(
    JSON.stringify({ alerts_triggered: alerts.length, alerts }),
    { headers: { "Content-Type": "application/json", ...defaultCorsHeaders } }
  );
}

async function getSystemStatus(supabase: any) {
  const { data: recentMetrics } = await supabase
    .from('system_metrics')
    .select('*')
    .gte('timestamp', new Date(Date.now() - 10 * 60 * 1000).toISOString())
    .order('timestamp', { ascending: false });

  const { data: activeAlerts } = await supabase
    .from('system_alerts')
    .select('*')
    .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .order('timestamp', { ascending: false });

  return new Response(
    JSON.stringify({
      status: activeAlerts?.length > 0 ? 'degraded' : 'healthy',
      metrics_count: recentMetrics?.length || 0,
      active_alerts: activeAlerts?.length || 0,
      last_updated: new Date().toISOString(),
    }),
    { headers: { "Content-Type": "application/json", ...defaultCorsHeaders } }
  );
}

serve((req) => withRateLimit(req, handler));
