import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PerformanceMetrics {
  pageLoadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  memoryUsage?: number;
  networkRequests: number;
  failedRequests: number;
}

export interface SystemHealth {
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

export function usePerformanceMonitoring() {
  const { user, hospital } = useAuth();
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);

  useEffect(() => {
    // Collect performance metrics
    const collectPerformanceMetrics = () => {
      if (typeof window === 'undefined' || !window.performance) return;

      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      const clsEntries = performance.getEntriesByType('layout-shift');
      const fidEntries = performance.getEntriesByType('first-input');

      const metrics: PerformanceMetrics = {
        pageLoadTime: perfData.loadEventEnd - perfData.fetchStart,
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.fetchStart,
        firstPaint: paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
        largestContentfulPaint: lcpEntries[0]?.startTime || 0,
        cumulativeLayoutShift: clsEntries.reduce((sum, entry) => sum + (entry as any).value, 0),
        firstInputDelay: fidEntries[0] ? ((fidEntries[0] as any).processingStart || 0) - ((fidEntries[0] as any).startTime || 0) : 0,
        memoryUsage: (performance as any).memory?.usedJSHeapSize ? Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) : undefined,
        networkRequests: performance.getEntriesByType('resource').length,
        failedRequests: 0, // Will be calculated below
      };

      // Count failed requests
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      metrics.failedRequests = resources.filter(entry => {
        // Check if the resource failed to load
        return entry.transferSize === 0 && entry.decodedBodySize === 0 && entry.duration > 0;
      }).length;

      setMetrics(metrics);

      // Send metrics to monitoring service (could be sent to analytics or logging service)
      console.log('Performance Metrics:', metrics);
    };

    // Collect metrics after page load
    if (document.readyState === 'complete') {
      collectPerformanceMetrics();
    } else {
      window.addEventListener('load', collectPerformanceMetrics);
    }

    return () => {
      window.removeEventListener('load', collectPerformanceMetrics);
    };
  }, []);

  const checkSystemHealth = async (): Promise<SystemHealth | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('health-check');

      if (error) {
        console.error('Health check failed:', error);
        return null;
      }

      setSystemHealth(data);
      return data;
    } catch (error) {
      console.error('Error checking system health:', error);
      return null;
    }
  };

  const logPerformanceIssue = async (issue: {
    type: 'slow_page_load' | 'high_memory_usage' | 'failed_requests' | 'layout_shift';
    value: number;
    threshold: number;
    page: string;
  }) => {
    try {
      await supabase.from('activity_logs').insert({
        user_id: user?.id || 'anonymous',
        action_type: 'performance_issue',
        entity_type: 'performance',
        entity_id: issue.type,
        details: {
          type: issue.type,
          value: issue.value,
          threshold: issue.threshold,
          page: issue.page,
          user_agent: navigator.userAgent,
        },
        hospital_id: hospital?.id || '',
        ip_address: '',
        severity: issue.type === 'failed_requests' ? 'high' : 'medium',
      });
    } catch (error) {
      console.error('Error logging performance issue:', error);
    }
  };

  return {
    metrics,
    systemHealth,
    checkSystemHealth,
    logPerformanceIssue,
  };
}