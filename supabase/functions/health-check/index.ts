import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { withRateLimit } from "../_shared/rateLimit.ts";

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: 'healthy' | 'unhealthy';
    auth: 'healthy' | 'unhealthy';
    storage: 'healthy' | 'unhealthy';
  };
  external_apis?: {
    lovable_ai?: 'healthy' | 'unhealthy' | 'untested';
    email_service?: 'healthy' | 'unhealthy' | 'untested';
  };
  metrics: {
    response_time_ms: number;
    memory_usage_mb: number;
  };
}

const startTime = Date.now();

// Helper function to check external APIs with timeout
async function checkExternalApi(url: string, timeoutMs: number = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok || response.status < 500;
  } catch (error) {
    console.error(`External API check failed for ${url}:`, error);
    return false;
  }
}

// Helper function to check with timeout
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    ),
  ]);
}

const handler = async (req: Request): Promise<Response> => {
  const requestStart = performance.now();
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/functions\/v1\/health-check/, '');

  // GET /ready — lightweight readiness check (DB ping only)
  if (path === '/ready' || path === '/ready/') {
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { error } = await supabase.from('hospitals').select('count').limit(1).single();
      return new Response(
        JSON.stringify({ ready: !error, timestamp: new Date().toISOString() }),
        { status: error ? 503 : 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } catch {
      return new Response(
        JSON.stringify({ ready: false, timestamp: new Date().toISOString() }),
        { status: 503, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
  }

  // GET /metrics — uptime + memory only, no external calls
  if (path === '/metrics' || path === '/metrics/') {
    const memoryUsage = Deno.memoryUsage?.();
    return new Response(
      JSON.stringify({
        uptime_ms: Date.now() - startTime,
        response_time_ms: Math.round(performance.now() - requestStart),
        memory_usage_mb: memoryUsage ? Math.round(memoryUsage.heapUsed / 1024 / 1024) : 0,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // GET /health (default) — full check
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    // Check external APIs (with timeout protection)
    let lovableAiStatus: 'healthy' | 'unhealthy' | 'untested' = 'untested';
    let emailServiceStatus: 'healthy' | 'unhealthy' | 'untested' = 'untested';
    
    try {
      const lovableAiUrl = Deno.env.get('LOVABLE_AI_ENDPOINT');
      if (lovableAiUrl) {
        lovableAiStatus = await checkExternalApi(lovableAiUrl) ? 'healthy' : 'unhealthy';
      }
    } catch (error) {
      console.error('Lovable AI health check error:', error);
      lovableAiStatus = 'unhealthy';
    }

    try {
      // Check email service (e.g., SendGrid)
      const emailServiceUrl = Deno.env.get('EMAIL_SERVICE_HEALTH_URL');
      if (emailServiceUrl) {
        emailServiceStatus = await checkExternalApi(emailServiceUrl) ? 'healthy' : 'unhealthy';
      }
    } catch (error) {
      console.error('Email service health check error:', error);
      emailServiceStatus = 'unhealthy';
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
    const memoryUsage = Deno.memoryUsage?.();
    const memoryUsageMB = memoryUsage ? Math.round(memoryUsage.heapUsed / 1024 / 1024) : 0;

    const responseTime = performance.now() - requestStart;
    const uptime = Date.now() - startTime;

    const healthResponse: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime,
      services,
      external_apis: {
        lovable_ai: lovableAiStatus,
        email_service: emailServiceStatus,
      },
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
      external_apis: {
        lovable_ai: 'unhealthy',
        email_service: 'unhealthy',
      },
      metrics: {
        response_time_ms: Math.round(performance.now() - requestStart),
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

serve((req) => withRateLimit(req, handler));
