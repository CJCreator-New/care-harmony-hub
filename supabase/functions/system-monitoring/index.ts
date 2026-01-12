import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { action, data } = await req.json();

    switch (action) {
      case 'get_status':
        return await getSystemStatus(supabaseClient);
      case 'collect_metrics':
        return await collectMetrics(supabaseClient, data);
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getSystemStatus(supabaseClient: any) {
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

async function collectMetrics(supabaseClient: any, metrics: any[]) {
  const { error } = await supabaseClient
    .from('system_metrics')
    .insert(metrics);

  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true, count: metrics.length }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
