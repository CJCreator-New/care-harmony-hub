/**
 * Health Check Service
 * Kubernetes-ready liveness, readiness, and metrics endpoints
 * No authentication required - used by monitoring systems
 * @security monitoring-only - safe for public access
 */

import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/utils/logger';

const logger = createLogger('health-check', { module: 'monitoring' });
const START_TIME = Date.now();

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime_seconds: number;
  environment: 'development' | 'production' | 'staging';
  version: string;
  error?: string;
}

export interface ReadyResponse {
  status: 'ready' | 'not-ready';
  timestamp: string;
  checks: {
    database: 'ok' | 'down' | 'degraded';
    rls: 'ok' | 'down' | 'degraded';
    cache: 'ok' | 'down' | 'degraded';
    auth: 'ok' | 'down' | 'degraded';
  };
  warnings: string[];
  error?: string;
}

/**
 * GET /health - Liveness probe
 * Always returns 200 if process is alive
 * <50ms response time
 *
 * @returns {HealthResponse} Current health status
 */
export async function getHealth(): Promise<HealthResponse> {
  const startTime = performance.now();

  try {
    const timestamp = new Date().toISOString();
    const uptime_seconds = Math.floor((Date.now() - START_TIME) / 1000);
    const environment = (import.meta.env.MODE === 'production'
      ? 'production'
      : import.meta.env.MODE === 'staging'
        ? 'staging'
        : 'development') as 'development' | 'production' | 'staging';

    const response: HealthResponse = {
      status: 'healthy',
      timestamp,
      uptime_seconds,
      environment,
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    };

    const duration = performance.now() - startTime;
    logger.logPerformanceEvent({
      operation: 'health_check',
      duration_ms: duration,
      success: true,
    });

    return response;
  } catch (error) {
    const duration = performance.now() - startTime;
    logger.logPerformanceEvent({
      operation: 'health_check',
      duration_ms: duration,
      success: false,
    });

    return {
      status: 'healthy', // Still return healthy for liveness probe
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor((Date.now() - START_TIME) / 1000),
      environment: (import.meta.env.MODE === 'production'
        ? 'production'
        : import.meta.env.MODE === 'staging'
          ? 'staging'
          : 'development') as 'development' | 'production' | 'staging',
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * GET /ready - Readiness probe
 * Checks critical dependencies before declaring ready
 * <1000ms but should be ~500ms for most cases
 *
 * @returns {ReadyResponse} Readiness status with dependency checks
 */
export async function getReady(): Promise<ReadyResponse> {
  const startTime = performance.now();
  const timestamp = new Date().toISOString();
  const checks: ReadyResponse['checks'] = {
    database: 'ok',
    rls: 'ok',
    cache: 'ok',
    auth: 'ok',
  };
  const warnings: string[] = [];

  try {
    // Check 1: Database connectivity
    try {
      const { data, error } = await Promise.race([
        supabase.from('hospitals').select('id').limit(1),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('DB timeout')), 2000)
        ) as Promise<any>,
      ]);

      if (error) {
        checks.database = 'down';
        warnings.push(`Database error: ${error.message}`);
      }
    } catch (dbError) {
      checks.database = 'down';
      warnings.push(
        `Database unreachable: ${
          dbError instanceof Error ? dbError.message : 'Unknown'
        }`
      );
    }

    // Check 2: RLS policies (security-critical)
    try {
      // This query should succeed if RLS is working correctly
      const { data, error } = await Promise.race([
        supabase.from('audit_logs').select('id').limit(1),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('RLS timeout')), 2000)
        ) as Promise<any>,
      ]);

      if (error && error.code !== 'PGRST204') {
        // PGRST204 is expected if no data
        checks.rls = 'degraded';
        warnings.push(`RLS check degraded: ${error.message}`);
      }
    } catch (rlsError) {
      checks.rls = 'degraded';
      warnings.push(
        `RLS check failed: ${
          rlsError instanceof Error ? rlsError.message : 'Unknown'
        }`
      );
    }

    // Check 3: Cache/IndexedDB
    try {
      if ('indexedDB' in window) {
        const idbRequest = indexedDB.databases();
        checks.cache = 'ok';
      } else {
        checks.cache = 'degraded';
        warnings.push('IndexedDB not available');
      }
    } catch (cacheError) {
      checks.cache = 'degraded';
      warnings.push(
        `Cache check failed: ${
          cacheError instanceof Error ? cacheError.message : 'Unknown'
        }`
      );
    }

    // Check 4: Authentication context
    try {
      const session = await supabase.auth.getSession();
      if (!session) {
        checks.auth = 'degraded';
        warnings.push('No active session');
      } else {
        checks.auth = 'ok';
      }
    } catch (authError) {
      checks.auth = 'degraded';
      warnings.push(
        `Auth check failed: ${
          authError instanceof Error ? authError.message : 'Unknown'
        }`
      );
    }

    // Determine overall readiness
    const failedChecks = Object.values(checks).filter((s) => s === 'down');
    const status = failedChecks.length > 0 ? 'not-ready' : 'ready';

    const response: ReadyResponse = {
      status,
      timestamp,
      checks,
      warnings,
    };

    const duration = performance.now() - startTime;
    logger.logPerformanceEvent({
      operation: 'readiness_check',
      duration_ms: duration,
      success: status === 'ready',
    });

    return response;
  } catch (error) {
    const duration = performance.now() - startTime;
    logger.logPerformanceEvent({
      operation: 'readiness_check',
      duration_ms: duration,
      success: false,
    });

    return {
      status: 'not-ready',
      timestamp,
      checks: {
        database: 'down',
        rls: 'down',
        cache: 'down',
        auth: 'down',
      },
      warnings: [error instanceof Error ? error.message : 'Unknown error'],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * GET /metrics - Prometheus format metrics
 * Returns all collected metrics in text/plain Prometheus format
 * Compatible with Prometheus scraper
 *
 * @returns {string} Prometheus exposition format metrics
 */
export function getMetrics(): string {
  const timestamp = Date.now();
  const uptime_seconds = Math.floor((Date.now() - START_TIME) / 1000);

  // Retrieve metrics from global state (set by metrics collector)
  const metrics = getCollectedMetrics();

  // Build Prometheus format response
  let prometheusOutput = '';

  // Application info
  prometheusOutput += `# HELP caresync_app_info Application metadata\n`;
  prometheusOutput += `# TYPE caresync_app_info gauge\n`;
  prometheusOutput +=
    `caresync_app_info{version="${import.meta.env.VITE_APP_VERSION || '1.0.0'}",environment="${import.meta.env.MODE}"} 1\n`;
  prometheusOutput += `\n`;

  // Uptime
  prometheusOutput += `# HELP caresync_uptime_seconds Application uptime in seconds\n`;
  prometheusOutput += `# TYPE caresync_uptime_seconds gauge\n`;
  prometheusOutput += `caresync_uptime_seconds ${uptime_seconds}\n`;
  prometheusOutput += `\n`;

  // SLO latencies (histograms)
  prometheusOutput += `# HELP caresync_slo_prescription_to_dispensing_seconds Latency from prescription creation to dispensing\n`;
  prometheusOutput += `# TYPE caresync_slo_prescription_to_dispensing_seconds histogram\n`;
  prometheusOutput += `caresync_slo_prescription_to_dispensing_seconds_bucket{le="1.0"} ${metrics.prescription_to_dispensing?.bucket_1_0 || 0}\n`;
  prometheusOutput += `caresync_slo_prescription_to_dispensing_seconds_bucket{le="5.0"} ${metrics.prescription_to_dispensing?.bucket_5_0 || 0}\n`;
  prometheusOutput += `caresync_slo_prescription_to_dispensing_seconds_bucket{le="30.0"} ${metrics.prescription_to_dispensing?.bucket_30_0 || 0}\n`;
  prometheusOutput += `caresync_slo_prescription_to_dispensing_seconds_bucket{le="+Inf"} ${metrics.prescription_to_dispensing?.bucket_inf || 0}\n`;
  prometheusOutput += `caresync_slo_prescription_to_dispensing_seconds_sum ${metrics.prescription_to_dispensing?.sum || 0}\n`;
  prometheusOutput += `caresync_slo_prescription_to_dispensing_seconds_count ${metrics.prescription_to_dispensing?.count || 0}\n`;
  prometheusOutput += `\n`;

  // HTTP requests counter
  prometheusOutput += `# HELP caresync_http_requests_total Total HTTP requests\n`;
  prometheusOutput += `# TYPE caresync_http_requests_total counter\n`;
  prometheusOutput +=
    `caresync_http_requests_total{method="GET",status="200"} ${metrics.http_requests?.get_200 || 0}\n`;
  prometheusOutput +=
    `caresync_http_requests_total{method="POST",status="200"} ${metrics.http_requests?.post_200 || 0}\n`;
  prometheusOutput +=
    `caresync_http_requests_total{method="GET",status="400"} ${metrics.http_requests?.get_400 || 0}\n`;
  prometheusOutput += `\n`;

  // Cache hit ratio
  prometheusOutput += `# HELP caresync_cache_hit_ratio Cache hit ratio (0-1)\n`;
  prometheusOutput += `# TYPE caresync_cache_hit_ratio gauge\n`;
  prometheusOutput += `caresync_cache_hit_ratio ${metrics.cache_hit_ratio || 0}\n`;
  prometheusOutput += `\n`;

  // Active users
  prometheusOutput += `# HELP caresync_active_users_total Active users online\n`;
  prometheusOutput += `# TYPE caresync_active_users_total gauge\n`;
  prometheusOutput += `caresync_active_users_total ${metrics.active_users || 0}\n`;
  prometheusOutput += `\n`;

  // Prescription amendments
  prometheusOutput += `# HELP caresync_prescription_amendments_total Prescription amendments\n`;
  prometheusOutput += `# TYPE caresync_prescription_amendments_total counter\n`;
  prometheusOutput +=
    `caresync_prescription_amendments_total ${metrics.prescription_amendments || 0}\n`;
  prometheusOutput += `\n`;

  // Audit records
  prometheusOutput += `# HELP caresync_audit_records_created_total Audit records created\n`;
  prometheusOutput += `# TYPE caresync_audit_records_created_total counter\n`;
  prometheusOutput +=
    `caresync_audit_records_created_total ${metrics.audit_records_created || 0}\n`;

  return prometheusOutput;
}

/**
 * Global metrics storage
 * In production, this should be backed by a metrics client like prom-client
 */
const metricsState = {
  http_requests: { get_200: 0, post_200: 0, get_400: 0 },
  cache_hit_ratio: 0,
  active_users: 0,
  prescription_amendments: 0,
  audit_records_created: 0,
  prescription_to_dispensing: {
    bucket_1_0: 0,
    bucket_5_0: 0,
    bucket_30_0: 0,
    bucket_inf: 0,
    sum: 0,
    count: 0,
  },
};

export function getCollectedMetrics() {
  return metricsState;
}

export function updateMetric(key: string, value: number) {
  const keys = key.split('.');
  let current: any = metricsState;
  for (let i = 0; i < keys.length - 1; i++) {
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

export function incrementMetric(key: string, amount = 1) {
  const keys = key.split('.');
  let current: any = metricsState;
  for (let i = 0; i < keys.length - 1; i++) {
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = (current[keys[keys.length - 1]] || 0) + amount;
}
