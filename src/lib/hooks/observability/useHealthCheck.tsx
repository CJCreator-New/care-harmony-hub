/**
 * Health Check Hook
 * 
 * Provides readiness probes and liveness checks for clinical systems.
 * Ensures critical paths (patient access, prescriptions, lab results) are responsive.
 * 
 * Used for:
 * - Pre-operation validation (before allowing clinical workflows)
 * - Incident detection (automatic alerts if health degrades)
 * - Load balancer health checks
 * - Phase 4 performance baseline
 * 
 * Usage:
 * ```tsx
 * const { isHealthy, checkCriticalPath, getSystemStatus } = useHealthCheck();
 * 
 * if (!isHealthy('database')) {
 *   return <SystemDownnotice />;
 * }
 * ```
 */

import { useState, useCallback, useEffect, type ReactNode } from 'react';

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown',
}

export interface ComponentHealth {
  status: HealthStatus;
  responseTime?: number; // milliseconds
  lastCheck?: string;
  errorMessage?: string;
}

export interface SystemHealth {
  database: ComponentHealth;
  api: ComponentHealth;
  cache: ComponentHealth;
  auth: ComponentHealth;
  storage: ComponentHealth;
  timestamp: string;
  overallStatus: HealthStatus;
}

/**
 * useHealthCheck Hook
 */
export function useHealthCheck() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    database: { status: HealthStatus.UNKNOWN },
    api: { status: HealthStatus.UNKNOWN },
    cache: { status: HealthStatus.UNKNOWN },
    auth: { status: HealthStatus.UNKNOWN },
    storage: { status: HealthStatus.UNKNOWN },
    timestamp: new Date().toISOString(),
    overallStatus: HealthStatus.UNKNOWN,
  });

  /**
   * Check a specific component's health
   */
  const checkComponent = useCallback(
    async (component: keyof Omit<SystemHealth, 'timestamp' | 'overallStatus'>): Promise<ComponentHealth> => {
      const startTime = performance.now();

      try {
        const response = await fetch(`/api/health/${component}`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });

        const responseTime = performance.now() - startTime;

        if (!response.ok) {
          throw new Error(`Health check failed: ${response.status}`);
        }

        const data = await response.json();

        return {
          status: data.status === 'healthy' ? HealthStatus.HEALTHY : HealthStatus.DEGRADED,
          responseTime,
          lastCheck: new Date().toISOString(),
        };
      } catch (error) {
        return {
          status: HealthStatus.UNHEALTHY,
          responseTime: performance.now() - startTime,
          lastCheck: new Date().toISOString(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    []
  );

  /**
   * Perform full system health check
   */
  const performHealthCheck = useCallback(async () => {
    const [database, api, cache, auth, storage] = await Promise.all([
      checkComponent('database'),
      checkComponent('api'),
      checkComponent('cache'),
      checkComponent('auth'),
      checkComponent('storage'),
    ]);

    const allHealthy = [database, api, cache, auth, storage].every((c) => c.status === HealthStatus.HEALTHY);

    const anyUnhealthy = [database, api, cache, auth, storage].some((c) => c.status === HealthStatus.UNHEALTHY);

    const overallStatus = anyUnhealthy ? HealthStatus.UNHEALTHY : allHealthy ? HealthStatus.HEALTHY : HealthStatus.DEGRADED;

    const newHealth: SystemHealth = {
      database,
      api,
      cache,
      auth,
      storage,
      timestamp: new Date().toISOString(),
      overallStatus,
    };

    setSystemHealth(newHealth);
    return newHealth;
  }, [checkComponent]);

  /**
   * Check if a specific component is healthy
   */
  const isHealthy = useCallback(
    (component: keyof Omit<SystemHealth, 'timestamp' | 'overallStatus'>) => {
      return systemHealth[component]?.status === HealthStatus.HEALTHY;
    },
    [systemHealth]
  );

  /**
   * Check all critical paths for clinical operations
   */
  const checkCriticalPath = useCallback(
    async (pathType: 'patient_access' | 'prescription' | 'lab_results' | 'billing') => {
      const checks = {
        patient_access: () => Promise.all([checkComponent('database'), checkComponent('cache')]),
        prescription: () => Promise.all([checkComponent('database'), checkComponent('api'), checkComponent('cache')]),
        lab_results: () =>
          Promise.all([checkComponent('database'), checkComponent('api'), checkComponent('storage')]),
        billing: () => Promise.all([checkComponent('database'), checkComponent('api'), checkComponent('cache')]),
      };

      const results = await checks[pathType]();
      return results.every((r) => r.status === HealthStatus.HEALTHY);
    },
    [checkComponent]
  );

  /**
   * Get current system status
   */
  const getSystemStatus = useCallback(() => {
    return systemHealth;
  }, [systemHealth]);

  /**
   * Automatically check health on mount and periodically
   */
  useEffect(() => {
    performHealthCheck();

    const intervalId = setInterval(performHealthCheck, 30000); // Check every 30 seconds

    return () => clearInterval(intervalId);
  }, [performHealthCheck]);

  return {
    systemHealth,
    performHealthCheck,
    checkComponent,
    checkCriticalPath,
    isHealthy,
    getSystemStatus,
  };
}

/**
 * Component for displaying health status
 */
export function HealthStatusIndicator(): ReactNode {
  const { systemHealth } = useHealthCheck();

  const getStatusColor = (status: HealthStatus) => {
    switch (status) {
      case HealthStatus.HEALTHY:
        return 'bg-green-500';
      case HealthStatus.DEGRADED:
        return 'bg-yellow-500';
      case HealthStatus.UNHEALTHY:
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <div className={`w-2 h-2 rounded-full ${getStatusColor(systemHealth.overallStatus)}`} />
      <span className="text-xs font-medium">{systemHealth.overallStatus}</span>
    </div>
  );
}

/**
 * Pre-operation health check guard
 */
export async function validateHealthBeforeOperation(requiredComponents: (keyof Omit<SystemHealth, 'timestamp' | 'overallStatus'>)[]): Promise<boolean> {
  try {
    const response = await fetch('/api/health', {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return false;

    const health: SystemHealth = await response.json();
    return requiredComponents.every((comp) => health[comp]?.status === HealthStatus.HEALTHY);
  } catch {
    return false;
  }
}
