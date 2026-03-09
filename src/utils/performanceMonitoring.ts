/**
 * Performance Monitoring System
 * Tracks Core Web Vitals, API performance, and user interactions
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  context?: Record<string, unknown>;
}

export interface CoreWebVitals {
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
  fcp?: number; // First Contentful Paint
}

export interface APIMetric {
  endpoint: string;
  method: string;
  duration: number;
  status: number;
  timestamp: number;
  size?: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private apiMetrics: APIMetric[] = [];
  private coreWebVitals: CoreWebVitals = {};
  private maxMetrics = 1000;

  constructor() {
    this.initializeWebVitals();
    this.initializeResourceTiming();
  }

  /**
   * Initialize Core Web Vitals tracking
   */
  private initializeWebVitals() {
    // LCP - Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.coreWebVitals.lcp = lastEntry.renderTime || lastEntry.loadTime;
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        // LCP not supported
      }

      // CLS - Cumulative Layout Shift
      try {
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              this.coreWebVitals.cls = (this.coreWebVitals.cls || 0) + (entry as any).value;
            }
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        // CLS not supported
      }

      // FID - First Input Delay
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            this.coreWebVitals.fid = (entries[0] as any).processingDuration;
          }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        // FID not supported
      }
    }

    // TTFB - Time to First Byte
    if (performance.timing) {
      this.coreWebVitals.ttfb = performance.timing.responseStart - performance.timing.navigationStart;
    }

    // FCP - First Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            this.coreWebVitals.fcp = entries[0].startTime;
          }
        });
        fcpObserver.observe({ entryTypes: ['paint'] });
      } catch (e) {
        // FCP not supported
      }
    }
  }

  /**
   * Initialize resource timing tracking
   */
  private initializeResourceTiming() {
    if ('PerformanceObserver' in window) {
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric({
              name: `resource_${entry.name}`,
              value: entry.duration,
              unit: 'ms',
              timestamp: Date.now(),
              context: {
                type: entry.initiatorType,
                size: (entry as any).transferSize,
              },
            });
          }
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
      } catch (e) {
        // Resource timing not supported
      }
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  /**
   * Record API call metrics
   */
  recordAPIMetric(metric: APIMetric) {
    this.apiMetrics.push(metric);
    if (this.apiMetrics.length > this.maxMetrics) {
      this.apiMetrics.shift();
    }
  }

  /**
   * Get Core Web Vitals
   */
  getCoreWebVitals(): CoreWebVitals {
    return { ...this.coreWebVitals };
  }

  /**
   * Get average API response time
   */
  getAverageAPITime(): number {
    if (this.apiMetrics.length === 0) return 0;
    const total = this.apiMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / this.apiMetrics.length;
  }

  /**
   * Get API metrics by endpoint
   */
  getAPIMetricsByEndpoint(endpoint: string): APIMetric[] {
    return this.apiMetrics.filter(m => m.endpoint === endpoint);
  }

  /**
   * Get slowest API calls
   */
  getSlowestAPICalls(limit = 10): APIMetric[] {
    return [...this.apiMetrics].sort((a, b) => b.duration - a.duration).slice(0, limit);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics summary
   */
  getSummary() {
    return {
      coreWebVitals: this.getCoreWebVitals(),
      averageAPITime: this.getAverageAPITime(),
      totalMetrics: this.metrics.length,
      totalAPIMetrics: this.apiMetrics.length,
      slowestAPICalls: this.getSlowestAPICalls(5),
    };
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics = [];
    this.apiMetrics = [];
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Hook for React components to track performance
 */
export function usePerformanceMonitoring(componentName: string) {
  React.useEffect(() => {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      performanceMonitor.recordMetric({
        name: `component_${componentName}`,
        value: duration,
        unit: 'ms',
        timestamp: Date.now(),
      });
    };
  }, [componentName]);
}

/**
 * Fetch wrapper with performance tracking
 */
export async function fetchWithMetrics(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const startTime = performance.now();
  const method = options?.method || 'GET';

  try {
    const response = await fetch(url, options);
    const duration = performance.now() - startTime;

    performanceMonitor.recordAPIMetric({
      endpoint: url,
      method,
      duration,
      status: response.status,
      timestamp: Date.now(),
      size: response.headers.get('content-length') ? parseInt(response.headers.get('content-length')!) : undefined,
    });

    return response;
  } catch (error) {
    const duration = performance.now() - startTime;
    performanceMonitor.recordAPIMetric({
      endpoint: url,
      method,
      duration,
      status: 0,
      timestamp: Date.now(),
    });
    throw error;
  }
}

// Import React for useEffect
import React from 'react';
