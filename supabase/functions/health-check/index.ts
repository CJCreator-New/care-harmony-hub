import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: 'healthy' | 'unhealthy';
    auth: 'healthy' | 'unhealthy';
    storage: 'healthy' | 'unhealthy';
  };
  metrics: {
    response_time_ms: number;
    memory_usage_mb: number;
  };
}

const startTime = Date.now();

const handler = async (req: Request): Promise<Response> => {
  const startTime = performance.now();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = (globalThis as any).Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = (globalThis as any).Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check database connectivity
    let databaseStatus: 'healthy' | 'unhealthy' = 'unhealthy';
    try {
      const { error } = await supabase.from('hospitals').select('count').limit(1).single();
      databaseStatus = error ? 'unhealthy' : 'healthy';
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    // Check auth service
    let authStatus: 'healthy' | 'unhealthy' = 'unhealthy';
    try {
      // Try to get a user (this will fail but tells us if auth is responsive)
      await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
      authStatus = 'healthy';
    } catch (error) {
      console.error('Auth health check failed:', error);
    }

    // Check storage service
    let storageStatus: 'healthy' | 'unhealthy' = 'unhealthy';
    try {
      const { error } = await supabase.storage.listBuckets();
      storageStatus = error ? 'unhealthy' : 'healthy';
    } catch (error) {
      console.error('Storage health check failed:', error);
    }

    // Calculate overall status
    const services = { database: databaseStatus, auth: authStatus, storage: storageStatus };
    const unhealthyServices = Object.values(services).filter(status => status === 'unhealthy').length;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyServices === Object.keys(services).length) {
      overallStatus = 'unhealthy';
    } else if (unhealthyServices > 0) {
      overallStatus = 'degraded';
    }

    // Get memory usage (Deno specific)
    const memoryUsage = (globalThis as any).Deno.memoryUsage?.();
    const memoryUsageMB = memoryUsage ? Math.round(memoryUsage.heapUsed / 1024 / 1024) : 0;

    const responseTime = performance.now() - startTime;
    const uptime = Date.now() - startTime;

    const healthResponse: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime,
      services,
      metrics: {
        response_time_ms: Math.round(responseTime),
        memory_usage_mb: memoryUsageMB,
      },
    };

    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 206 : 503;

    return new Response(
      JSON.stringify(healthResponse, null, 2),
      {
        status: statusCode,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Health check error:", error);

    const errorResponse: HealthCheckResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime,
      services: {
        database: 'unhealthy',
        auth: 'unhealthy',
        storage: 'unhealthy',
      },
      metrics: {
        response_time_ms: Math.round(performance.now() - startTime),
        memory_usage_mb: 0,
      },
    };

    return new Response(
      JSON.stringify(errorResponse, null, 2),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    );
  }
};

serve(handler);