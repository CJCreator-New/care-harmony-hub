/**
 * Performance Metrics Hook
 * 
 * Captures performance metrics for Phase 4 load testing and optimization.
 * Enables correlation between performance and clinical operations.
 * 
 * Metrics collected:
 * - Page load times (cold/warm cache)
 * - API response times (by endpoint)
 * - React component render times (critical paths)
 * - Database query times
 * - Cache hit rates
 * 
 * Usage:
 * ```tsx
 * const { startTimer, endTimer, recordMetric } = usePerformanceMetrics();
 * 
 * const timer = startTimer('patient-list-load');
 * await loadPatients();
 * endTimer(timer); // Automatically sends to metrics backend
 * ```
 */

import { useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Metric categories for organizing performance data
 */
export enum MetricCategory {
  PAGE_LOAD = 'page_load',
  API_CALL = 'api_call',
  COMPONENT_RENDER = 'component_render',
  DATABASE_QUERY = 'database_query',
  CACHE_OPERATION = 'cache_operation',
  CLINICAL_WORKFLOW = 'clinical_workflow',
  USER_INTERACTION = 'user_interaction',
}

/**
 * Metric entry structure
 */
export interface PerformanceMetric {
  name: string;
  category: MetricCategory | string;
  duration: number; // milliseconds
  timestamp: string;
  userId?: string;
  hospitalId?: string;
  correlationId?: string;
  tags?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

interface TimerEntry {
  startTime: number;
  category: MetricCategory | string;
  correlationId?: string;
}

/**
 * usePerformanceMetrics Hook
 */
export function usePerformanceMetrics() {
  const { user, hospital } = useAuth();
  const timersRef = useRef<Map<string, TimerEntry>>(new Map());

  /**
   * Start a performance timer
   */
  const startTimer = useCallback((name: string, category: MetricCategory = MetricCategory.USER_INTERACTION, correlationId?: string): string => {
    const timerId = `${name}-${Date.now()}`;
    timersRef.current.set(timerId, {
      startTime: performance.now(),
      category,
      correlationId,
    });
    return timerId;
  }, []);

  /**
   * End a performance timer and send metric
   */
  const endTimer = useCallback(
    (timerId: string, tags?: Record<string, string>, metadata?: Record<string, unknown>) => {
      const timerEntry = timersRef.current.get(timerId);
      if (!timerEntry) {
        console.warn(`Timer ${timerId} not found`);
        return;
      }

      const duration = performance.now() - timerEntry.startTime;
      timersRef.current.delete(timerId);

      recordMetric({
        name: timerId.split('-').slice(0, -1).join('-'),
        category: timerEntry.category,
        duration,
        tags,
        metadata,
        correlationId: timerEntry.correlationId,
      });
    },
    []
  );

  /**
   * Record a metric directly (without timer)
   */
  const recordMetric = useCallback(
    async (metric: Omit<PerformanceMetric, 'timestamp' | 'userId' | 'hospitalId'> & { correlationId?: string }) => {
      if (!user?.id) return;

      const fullMetric: PerformanceMetric = {
        ...metric,
        timestamp: new Date().toISOString(),
        userId: user.id,
        hospitalId: hospital?.id,
      };

      try {
        // Send to metrics endpoint
        const response = await fetch('/api/metrics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(metric.correlationId && { 'X-Correlation-Id': metric.correlationId }),
          },
          body: JSON.stringify(fullMetric),
          // Use beacon API for reliability (doesn't block page unload)
          keepalive: true,
        });

        if (!response.ok) {
          console.warn('Failed to record metric:', response.statusText);
        }
      } catch (error) {
        // Fail silently - don't interrupt user workflows if metrics fail
        console.error('Metrics recording error:', error);
      }
    },
    [user?.id, hospital?.id]
  );

  /**
   * Measure API response time
   */
  const measureApiCall = useCallback(
    async <T,>(
      endpoint: string,
      fetcher: () => Promise<T>,
      options?: { tags?: Record<string, string>; correlationId?: string }
    ): Promise<T> => {
      const timerId = startTimer(endpoint, MetricCategory.API_CALL, options?.correlationId);
      try {
        const result = await fetcher();
        endTimer(timerId, { endpoint, status: 'success', ...options?.tags });
        return result;
      } catch (error) {
        endTimer(timerId, { endpoint, status: 'error', ...options?.tags });
        throw error;
      }
    },
    [startTimer, endTimer]
  );

  /**
   * Mark component render for performance tracking
   */
  const measureComponentRender = useCallback(
    (componentName: string) => {
      const timerId = startTimer(`${componentName}-render`, MetricCategory.COMPONENT_RENDER);
      return () => endTimer(timerId, { component: componentName });
    },
    [startTimer, endTimer]
  );

  /**
   * Get current timer status
   */
  const getActiveTimers = useCallback(() => {
    return Array.from(timersRef.current.keys()).map((key) => ({
      id: key,
      elapsed: performance.now() - (timersRef.current.get(key)?.startTime || 0),
    }));
  }, []);

  /**
   * Clear all timers (for cleanup)
   */
  const clearAllTimers = useCallback(() => {
    timersRef.current.clear();
  }, []);

  return {
    startTimer,
    endTimer,
    recordMetric,
    measureApiCall,
    measureComponentRender,
    getActiveTimers,
    clearAllTimers,
  };
}

/**
 * Hook for tracking Web Vitals (Core Web Vitals for Phase 4 optimization)
 */
export function useWebVitals() {
  const { recordMetric } = usePerformanceMetrics();

  useEffect(() => {
    // Measure Largest Contentful Paint (LCP)
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        recordMetric({
          name: 'LCP',
          category: MetricCategory.PAGE_LOAD,
          duration: entry.duration,
          metadata: { metrics: 'web_vitals', type: 'LCP' },
        });
      }
    });

    try {
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch {
      // Browser doesn't support LCP
    }

    return () => observer.disconnect();
  }, [recordMetric]);

  useEffect(() => {
    // Measure First Input Delay (FID)
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        recordMetric({
          name: 'FID',
          category: MetricCategory.USER_INTERACTION,
          duration: entry.duration,
          metadata: { metrics: 'web_vitals', type: 'FID' },
        });
      }
    });

    try {
      observer.observe({ entryTypes: ['first-input'] });
    } catch {
      // Browser doesn't support FID
    }

    return () => observer.disconnect();
  }, [recordMetric]);

  useEffect(() => {
    // Measure Cumulative Layout Shift (CLS)
    let clsValue = 0;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['layout-shift'] });

      // Report CLS periodically
      const interval = setInterval(() => {
        if (clsValue > 0) {
          recordMetric({
            name: 'CLS',
            category: MetricCategory.PAGE_LOAD,
            duration: clsValue * 1000, // Convert to milliseconds for consistency
            metadata: { metrics: 'web_vitals', type: 'CLS' },
          });
        }
      }, 5000);

      return () => {
        observer.disconnect();
        clearInterval(interval);
      };
    } catch {
      // Browser doesn't support CLS
      return () => {};
    }
  }, [recordMetric]);
}
