import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { authorize } from '../_shared/authorize.ts';
import { withRateLimit } from '../_shared/rateLimit.ts';
import { validateRequest } from '../_shared/validation.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const systemMonitoringSchema = z.object({
  action: z.string().min(1),
  data: z.any().optional(),
});

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authErr = await authorize(req, ['admin', 'super_admin']);
  if (authErr) return authErr;

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const validation = await validateRequest(req, systemMonitoringSchema);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { action, data } = validation.data;

    switch (action) {
      case 'get_status':
        return await getSystemStatus(supabaseClient, corsHeaders);
      case 'collect_metrics':
        return await collectMetrics(supabaseClient, data, corsHeaders);
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
};

serve((req) => withRateLimit(req, handler));

async function getSystemStatus(supabaseClient: any, corsHeaders: Record<string, string>) {
  const startTime = Date.now();

  const { error: dbError } = await supabaseClient
    .from('hospitals')
    .select('count')
    .limit(1);

  const dbResponseTime = Date.now() - startTime;
  const dbStatus = dbError ? 'critical' : dbResponseTime > 1000 ? 'slow' : 'healthy';

  const { count: activeConnections } = await supabaseClient
    .from('activity_logs')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

  const systemHealth = {
    overall_status: dbStatus === 'critical' ? 'critical' : dbStatus === 'slow' ? 'degraded' : 'healthy',
    uptime_percentage: 99.9,
    services: [
      {
        name: 'database',
        status: dbStatus === 'critical' ? 'down' : dbStatus === 'slow' ? 'degraded' : 'up',
        response_time: dbResponseTime,
        last_check: new Date().toISOString(),
      },
      {
        name: 'api',
        status: 'up',
        response_time: dbResponseTime,
        last_check: new Date().toISOString(),
      },
    ],
    database: {
      status: dbStatus,
      connections: activeConnections || 0,
      query_performance: dbResponseTime,
    },
    api: {
      requests_per_minute: activeConnections || 0,
      error_rate: 0.5,
      avg_response_time: dbResponseTime,
    },
  };

  return new Response(
    JSON.stringify(systemHealth),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function collectMetrics(supabaseClient: any, metrics: any[], corsHeaders: Record<string, string>) {
  const { error } = await supabaseClient
    .from('system_metrics')
    .insert(metrics);

  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true, count: metrics.length }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

