/**
 * Health Check Hooks
 * React hooks for querying /health, /ready, and /metrics endpoints
 * Used by admin dashboards and monitoring components
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useHealthCheck', { module: 'monitoring' });

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime_seconds: number;
  environment: 'development' | 'production' | 'staging';
  version: string;
  error?: string;
  isHealthy: boolean;
}

export interface ReadinessStatus {
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
  isReady: boolean;
}

export interface MetricsSnapshot {
  timestamp: string;
  uptime_seconds: number;
  environment: string;
  version: string;
  http_requests: {
    total_requests: number;
    requests_by_method: Record<string, number>;
    requests_by_status: Record<string, number>;
    error_rate: number;
  };
  cache_metrics: {
    hit_ratio: number;
    hits: number;
    misses: number;
    evictions: number;
  };
  slo_metrics: {
    prescription_to_dispensing: {
      p50_ms: number;
      p95_ms: number;
      p99_ms: number;
      count: number;
    };
    registration_to_appointment: {
      p50_ms: number;
      p95_ms: number;
      p99_ms: number;
      count: number;
    };
    lab_order_to_critical_alert: {
      p50_ms: number;
      p95_ms: number;
      p99_ms: number;
      count: number;
    };
    appointment_confirmation_to_reminder: {
      p50_ms: number;
      p95_ms: number;
      p99_ms: number;
      count: number;
    };
  };
}

/**
 * Hook to query the /health endpoint
 * Returns liveness status (process is alive and responding)
 * Polls every 30 seconds
 *
 * @returns {object} Health status with isHealthy flag
 */
export function useHealthStatus() {
  const { data, error, isLoading } = useQuery({
    queryKey: ['health-check'],
    queryFn: async (): Promise<HealthStatus> => {
      const response = await fetch('/health', {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        ...data,
        isHealthy: data.status === 'healthy',
      };
    },
    refetchInterval: 30000, // Poll every 30 seconds
    staleTime: 5000,
    retry: true,
  });

  return {
    health: data,
    error,
    isLoading,
  };
}

/**
 * Hook to query the /ready endpoint
 * Returns readiness status with dependency checks
 * Polls every 30 seconds
 *
 * @returns {object} Readiness status with dependency checks
 */
export function useReadinessStatus() {
  const { data, error, isLoading } = useQuery({
    queryKey: ['readiness-check'],
    queryFn: async (): Promise<ReadinessStatus> => {
      const response = await fetch('/ready', {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Readiness check failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        ...data,
        isReady: data.status === 'ready',
      };
    },
    refetchInterval: 30000, // Poll every 30 seconds
    staleTime: 5000,
    retry: true,
  });

  return {
    ready: data,
    error,
    isLoading,
  };
}

/**
 * Hook to fetch current metrics snapshot
 * Returns Prometheus metrics and SLO data
 * Polls every 60 seconds
 *
 * @returns {object} Current metrics snapshot
 */
export function useMetricsSnapshot() {
  const { data, error, isLoading } = useQuery({
    queryKey: ['metrics-snapshot'],
    queryFn: async (): Promise<MetricsSnapshot> => {
      const response = await fetch('/metrics', {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Metrics fetch failed: ${response.statusText}`);
      }

      // Note: /metrics endpoint returns Prometheus format text/plain
      // This hook expects JSON, so we would need a separate endpoint
      // or parse the Prometheus format
      const data = await response.json();
      return data;
    },
    refetchInterval: 60000, // Poll every 60 seconds
    staleTime: 10000,
    retry: true,
  });

  return {
    metrics: data,
    error,
    isLoading,
  };
}

/**
 * Hook for manual health check trigger
 * Useful for admin-triggered checks
 *
 * @returns {object} Function to manually check health
 */
export function useManualHealthCheck() {
  const queryClient = useQueryClient();

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch('/health');
      if (!response.ok) {
        throw new Error('Health check failed');
      }

      const data = await response.json();
      logger.info('Manual health check completed', { status: data.status });

      // Invalidate cached health data to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['health-check'] });

      return data;
    } catch (error) {
      logger.error('Manual health check failed', error instanceof Error ? error : new Error('Unknown error'));
      throw error;
    }
  }, [queryClient]);

  return { checkHealth };
}

/**
 * Hook for manual readiness check trigger
 * Useful for admin-triggered checks
 *
 * @returns {object} Function to manually check readiness
 */
export function useManualReadinessCheck() {
  const queryClient = useQueryClient();

  const checkReadiness = useCallback(async () => {
    try {
      const response = await fetch('/ready');
      if (!response.ok) {
        throw new Error('Readiness check failed');
      }

      const data = await response.json();
      logger.info('Manual readiness check completed', { status: data.status });

      // Invalidate cached readiness data to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['readiness-check'] });

      return data;
    } catch (error) {
      logger.error('Manual readiness check failed', error instanceof Error ? error : new Error('Unknown error'));
      throw error;
    }
  }, [queryClient]);

  return { checkReadiness };
}

/**
 * Combined hook for monitoring dashboard
 * Returns all health data in one place
 */
export function useSystemHealth() {
  const { health, error: healthError, isLoading: healthLoading } = useHealthStatus();
  const { ready, error: readyError, isLoading: readyLoading } = useReadinessStatus();
  const { metrics, error: metricsError, isLoading: metricsLoading } = useMetricsSnapshot();

  const isHealthy = health?.isHealthy ?? false;
  const isReady = ready?.isReady ?? false;
  const hasErrors = healthError || readyError || metricsError;

  return {
    health,
    ready,
    metrics,
    isHealthy,
    isReady,
    hasErrors,
    isLoading: healthLoading || readyLoading || metricsLoading,
  };
}

/**
 * Hook to monitor SLO compliance
 * Returns real-time SLO metrics
 */
export function useSLOMetrics() {
  const { metrics, isLoading, error } = useMetricsSnapshot();

  const sloStatus = {
    prescription_to_dispensing: metrics?.slo_metrics?.prescription_to_dispensing,
    registration_to_appointment: metrics?.slo_metrics?.registration_to_appointment,
    lab_order_to_critical_alert: metrics?.slo_metrics?.lab_order_to_critical_alert,
    appointment_confirmation_to_reminder:
      metrics?.slo_metrics?.appointment_confirmation_to_reminder,
  };

  return {
    sloMetrics: sloStatus,
    isLoading,
    error,
  };
}

/**
 * Hook to monitor cache performance
 * Returns cache hit ratio and stats
 */
export function useCacheMetrics() {
  const { metrics, isLoading, error } = useMetricsSnapshot();

  const cacheStats = {
    hitRatio: metrics?.cache_metrics?.hit_ratio ?? 0,
    hits: metrics?.cache_metrics?.hits ?? 0,
    misses: metrics?.cache_metrics?.misses ?? 0,
    evictions: metrics?.cache_metrics?.evictions ?? 0,
  };

  return {
    cacheStats,
    isLoading,
    error,
  };
}
