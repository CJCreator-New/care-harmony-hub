/**
 * Performance Monitoring Utility
 * 
 * Provides real-time performance tracking and alerting for the CareSync HMS application.
 * Tracks query times, memory usage, bundle size, and API response times.
 * 
 * @module performanceMonitoring
 * @version 1.0.0
 */

import { useEffect, useRef } from 'react';

// Performance thresholds for alerting
const THRESHOLDS = {
  queryTime: { warning: 500, critical: 2000 },      // ms
  apiResponse: { warning: 300, critical: 1000 },    // ms
  bundleSize: { warning: 2 * 1024 * 1024, critical: 5 * 1024 * 1024 }, // bytes
  memoryUsage: { warning: 100, critical: 250 },     // MB
  realTimeLatency: { warning: 100, critical: 500 }, // ms
};

interface PerformanceMetrics {
  queryTime: number;
  apiResponse: number;
  bundleSize: number;
  memoryUsage: number;
  realTimeLatency: number;
  timestamp: number;
}

interface PerformanceAlert {
  metric: keyof typeof THRESHOLDS;
  severity: 'warning' | 'critical';
  value: number;
  threshold: number;
  timestamp: number;
  context?: string;
}

type PerformanceCallback = (alert: PerformanceAlert) => void;

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private callbacks: PerformanceCallback[] = [];
  private metrics: PerformanceMetrics[] = [];
  private maxMetricsHistory = 1000;

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Subscribe to performance alerts
   */
  subscribe(callback: PerformanceCallback): () => void {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Track database query performance
   */
  trackQuery(operation: string, duration: number, context?: string): void {
    this.recordMetric('queryTime', duration);
    
    if (duration > THRESHOLDS.queryTime.critical) {
      this.emitAlert({
        metric: 'queryTime',
        severity: 'critical',
        value: duration,
        threshold: THRESHOLDS.queryTime.critical,
        timestamp: Date.now(),
        context: `Slow query: ${operation}${context ? ` - ${context}` : ''}`
      });
    } else if (duration > THRESHOLDS.queryTime.warning) {
      this.emitAlert({
        metric: 'queryTime',
        severity: 'warning',
        value: duration,
        threshold: THRESHOLDS.queryTime.warning,
        timestamp: Date.now(),
        context: `Slow query: ${operation}${context ? ` - ${context}` : ''}`
      });
    }
  }

  /**
   * Track API response time
   */
  trackApiResponse(endpoint: string, duration: number): void {
    this.recordMetric('apiResponse', duration);
    
    if (duration > THRESHOLDS.apiResponse.critical) {
      this.emitAlert({
        metric: 'apiResponse',
        severity: 'critical',
        value: duration,
        threshold: THRESHOLDS.apiResponse.critical,
        timestamp: Date.now(),
        context: `Slow API: ${endpoint}`
      });
    } else if (duration > THRESHOLDS.apiResponse.warning) {
      this.emitAlert({
        metric: 'apiResponse',
        severity: 'warning',
        value: duration,
        threshold: THRESHOLDS.apiResponse.warning,
        timestamp: Date.now(),
        context: `Slow API: ${endpoint}`
      });
    }
  }

  /**
   * Track JavaScript heap memory usage
   */
  trackMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      
      this.recordMetric('memoryUsage', usedMB);
      
      if (usedMB > THRESHOLDS.memoryUsage.critical) {
        this.emitAlert({
          metric: 'memoryUsage',
          severity: 'critical',
          value: usedMB,
          threshold: THRESHOLDS.memoryUsage.critical,
          timestamp: Date.now(),
          context: `Memory usage critical: ${usedMB.toFixed(2)}MB`
        });
      } else if (usedMB > THRESHOLDS.memoryUsage.warning) {
        this.emitAlert({
          metric: 'memoryUsage',
          severity: 'warning',
          value: usedMB,
          threshold: THRESHOLDS.memoryUsage.warning,
          timestamp: Date.now(),
          context: `Memory usage high: ${usedMB.toFixed(2)}MB`
        });
      }
      
      return usedMB;
    }
    return 0;
  }

  /**
   * Track real-time data latency
   */
  trackRealTimeLatency(latency: number, context?: string): void {
    this.recordMetric('realTimeLatency', latency);
    
    if (latency > THRESHOLDS.realTimeLatency.critical) {
      this.emitAlert({
        metric: 'realTimeLatency',
        severity: 'critical',
        value: latency,
        threshold: THRESHOLDS.realTimeLatency.critical,
        timestamp: Date.now(),
        context: `High real-time latency${context ? `: ${context}` : ''}`
      });
    } else if (latency > THRESHOLDS.realTimeLatency.warning) {
      this.emitAlert({
        metric: 'realTimeLatency',
        severity: 'warning',
        value: latency,
        threshold: THRESHOLDS.realTimeLatency.warning,
        timestamp: Date.now(),
        context: `Elevated real-time latency${context ? `: ${context}` : ''}`
      });
    }
  }

  /**
   * Calculate total bundle size from loaded resources
   */
  calculateBundleSize(): number {
    const entries = performance.getEntriesByType('resource');
    const totalSize = entries.reduce((sum, r) => {
      const size = (r as any).transferSize || 0;
      return sum + size;
    }, 0);
    
    this.recordMetric('bundleSize', totalSize);
    
    if (totalSize > THRESHOLDS.bundleSize.critical) {
      this.emitAlert({
        metric: 'bundleSize',
        severity: 'critical',
        value: totalSize,
        threshold: THRESHOLDS.bundleSize.critical,
        timestamp: Date.now(),
        context: `Bundle size critical: ${(totalSize / 1024 / 1024).toFixed(2)}MB`
      });
    } else if (totalSize > THRESHOLDS.bundleSize.warning) {
      this.emitAlert({
        metric: 'bundleSize',
        severity: 'warning',
        value: totalSize,
        threshold: THRESHOLDS.bundleSize.warning,
        timestamp: Date.now(),
        context: `Bundle size large: ${(totalSize / 1024 / 1024).toFixed(2)}MB`
      });
    }
    
    return totalSize;
  }

  /**
   * Get average metrics over a time period
   */
  getAverageMetrics(minutes: number = 5): Partial<PerformanceMetrics> {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff);
    
    if (recentMetrics.length === 0) return {};
    
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    
    return {
      queryTime: avg(recentMetrics.map(m => m.queryTime)),
      apiResponse: avg(recentMetrics.map(m => m.apiResponse)),
      memoryUsage: avg(recentMetrics.map(m => m.memoryUsage)),
      realTimeLatency: avg(recentMetrics.map(m => m.realTimeLatency)),
    };
  }

  /**
   * Get current performance report
   */
  getReport(): {
    current: Partial<PerformanceMetrics>;
    averages: Partial<PerformanceMetrics>;
    alerts: PerformanceAlert[];
  } {
    return {
      current: this.metrics[this.metrics.length - 1] || {},
      averages: this.getAverageMetrics(),
      alerts: this.getRecentAlerts()
    };
  }

  /**
   * Clear metrics history
   */
  clearHistory(): void {
    this.metrics = [];
  }

  private recordMetric(metric: keyof PerformanceMetrics, value: number): void {
    const lastMetric = this.metrics[this.metrics.length - 1];
    
    if (lastMetric && Date.now() - lastMetric.timestamp < 1000) {
      // Update existing metric if within 1 second
      (lastMetric as any)[metric] = value;
    } else {
      // Create new metric entry
      this.metrics.push({
        queryTime: 0,
        apiResponse: 0,
        bundleSize: 0,
        memoryUsage: 0,
        realTimeLatency: 0,
        timestamp: Date.now(),
        [metric]: value
      } as PerformanceMetrics);
      
      // Limit history size
      if (this.metrics.length > this.maxMetricsHistory) {
        this.metrics = this.metrics.slice(-this.maxMetricsHistory);
      }
    }
  }

  private emitAlert(alert: PerformanceAlert): void {
    this.callbacks.forEach(cb => {
      try {
        cb(alert);
      } catch (error) {
        console.error('Performance alert callback error:', error);
      }
    });
    
    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      const method = alert.severity === 'critical' ? console.error : console.warn;
      method(`[Performance ${alert.severity.toUpperCase()}] ${alert.context}: ${alert.value}ms`);
    }
  }

  private getRecentAlerts(minutes: number = 60): PerformanceAlert[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    // Note: In a real implementation, you'd store alerts separately
    return [];
  }
}

// Singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

/**
 * React hook for performance monitoring
 */
export function usePerformanceMonitoring() {
  const monitoringRef = useRef<{
    memoryInterval: number | null;
    bundleSizeCalculated: boolean;
  }>({ memoryInterval: null, bundleSizeCalculated: false });

  useEffect(() => {
    // Calculate bundle size once on mount
    if (!monitoringRef.current.bundleSizeCalculated) {
      performanceMonitor.calculateBundleSize();
      monitoringRef.current.bundleSizeCalculated = true;
    }

    // Monitor memory usage every 30 seconds
    monitoringRef.current.memoryInterval = window.setInterval(() => {
      performanceMonitor.trackMemoryUsage();
    }, 30000);

    return () => {
      if (monitoringRef.current.memoryInterval) {
        clearInterval(monitoringRef.current.memoryInterval);
      }
    };
  }, []);

  return {
    trackQuery: performanceMonitor.trackQuery.bind(performanceMonitor),
    trackApiResponse: performanceMonitor.trackApiResponse.bind(performanceMonitor),
    trackRealTimeLatency: performanceMonitor.trackRealTimeLatency.bind(performanceMonitor),
    getReport: performanceMonitor.getReport.bind(performanceMonitor),
    subscribe: performanceMonitor.subscribe.bind(performanceMonitor),
  };
}

/**
 * Decorator for tracking function execution time
 */
export function trackPerformance<T extends (...args: any[]) => any>(
  operation: string,
  fn: T,
  context?: string
): T {
  return ((...args: any[]) => {
    const start = performance.now();
    const result = fn(...args);
    
    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = performance.now() - start;
        performanceMonitor.trackQuery(operation, duration, context);
      });
    } else {
      const duration = performance.now() - start;
      performanceMonitor.trackQuery(operation, duration, context);
      return result;
    }
  }) as T;
}

/**
 * Track Supabase query performance
 */
export async function trackSupabaseQuery<T>(
  operation: string,
  query: Promise<T>,
  context?: string
): Promise<T> {
  const start = performance.now();
  try {
    const result = await query;
    const duration = performance.now() - start;
    performanceMonitor.trackQuery(operation, duration, context);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    performanceMonitor.trackQuery(operation, duration, `${context || ''} - ERROR`);
    throw error;
  }
}

export default performanceMonitor;
