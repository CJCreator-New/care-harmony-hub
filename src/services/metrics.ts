/**
 * Metrics Collection Service
 * Prometheus-compatible metrics for clinical SLOs and system monitoring
 * Tracks: SLO latencies, HTTP requests, cache hits, active users
 */

import { createLogger } from '@/utils/logger';

const logger = createLogger('metrics-service', { module: 'observability' });

export interface MetricSnapshot {
  timestamp: string;
  environment: string;
  version: string;
  uptime_seconds: number;
  slo_metrics: SLOMetrics;
  http_requests: HttpMetrics;
  cache_metrics: CacheMetrics;
  system_metrics: SystemMetrics;
}

export interface SLOMetrics {
  prescription_to_dispensing: LatencyMetric;
  registration_to_appointment: LatencyMetric;
  lab_order_to_critical_alert: LatencyMetric;
  appointment_confirmation_to_reminder: LatencyMetric;
}

export interface LatencyMetric {
  count: number;
  sum_ms: number;
  min_ms: number;
  max_ms: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  bucket_1s: number;
  bucket_5s: number;
  bucket_30s: number;
}

export interface HttpMetrics {
  total_requests: number;
  requests_by_method: Record<string, number>;
  requests_by_status: Record<string, number>;
  error_rate: number;
}

export interface CacheMetrics {
  hit_ratio: number;
  hits: number;
  misses: number;
  evictions: number;
}

export interface SystemMetrics {
  active_users: number;
  concurrent_requests: number;
  memory_usage_mb: number;
  prescriptions_created: number;
  prescription_amendments: number;
  lab_orders_created: number;
  appointments_scheduled: number;
  audit_records_created: number;
}

class MetricsCollector {
  private startTime: number;
  private sloMetrics: Map<string, number[]>;
  private httpMetrics: { total: number; byMethod: Map<string, number>; byStatus: Map<string, number> };
  private cacheMetrics: { hits: number; misses: number; evictions: number };
  private systemMetrics: SystemMetrics;

  constructor() {
    this.startTime = Date.now();
    this.sloMetrics = new Map([
      ['prescription_to_dispensing', []],
      ['registration_to_appointment', []],
      ['lab_order_to_critical_alert', []],
      ['appointment_confirmation_to_reminder', []],
    ]);
    this.httpMetrics = {
      total: 0,
      byMethod: new Map(),
      byStatus: new Map(),
    };
    this.cacheMetrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
    };
    this.systemMetrics = {
      active_users: 0,
      concurrent_requests: 0,
      memory_usage_mb: 0,
      prescriptions_created: 0,
      prescription_amendments: 0,
      lab_orders_created: 0,
      appointments_scheduled: 0,
      audit_records_created: 0,
    };

    // Initialize Prometheus client if available
    this.initializePrometheus();
  }

  /**
   * Initialize Prometheus client
   * For now, we manage metrics in memory
   * In production, integrate with prom-client library
   */
  private initializePrometheus() {
    logger.info('Metrics collector initialized', {
      collectors: [
        'slo_latencies',
        'http_requests',
        'cache_metrics',
        'system_metrics',
      ],
    });
  }

  /**
   * Track SLO latency (e.g., prescription to dispensing time)
   * @param sloName The SLO name (prescription_to_dispensing, etc.)
   * @param latency_ms Latency in milliseconds
   */
  trackSLO(sloName: string, latency_ms: number) {
    const latencies = this.sloMetrics.get(sloName);
    if (latencies) {
      latencies.push(latency_ms);

      // Keep only last 1000 measurements for memory efficiency
      if (latencies.length > 1000) {
        latencies.shift();
      }

      // Log SLO breach if needed
      const sloThresholds: Record<string, number> = {
        prescription_to_dispensing: 300000, // 5 minutes
        registration_to_appointment: 1800000, // 30 minutes
        lab_order_to_critical_alert: 60000, // 1 minute
        appointment_confirmation_to_reminder: 86400000, // 24 hours
      };

      if (latency_ms > (sloThresholds[sloName] || Infinity)) {
        logger.warn(`SLO breach: ${sloName}`, {
          slo_name: sloName,
          latency_ms,
          threshold_ms: sloThresholds[sloName],
        });
      }
    }
  }

  /**
   * Increment a counter metric
   * @param metricName The counter name (e.g., 'prescriptions_created')
   * @param amount Amount to increment (default 1)
   */
  incrementCounter(
    metricName:
      | 'prescriptions_created'
      | 'prescription_amendments'
      | 'lab_orders_created'
      | 'appointments_scheduled'
      | 'audit_records_created',
    amount = 1
  ) {
    const key = metricName as keyof SystemMetrics;
    if (key in this.systemMetrics) {
      (this.systemMetrics[key] as number) += amount;

      logger.debug(`Counter incremented: ${metricName}`, {
        metric: metricName,
        amount,
        total: this.systemMetrics[key],
      });
    }
  }

  /**
   * Set gauge metric (e.g., active users)
   * @param metricName The gauge name
   * @param value The value to set
   */
  setGauge(
    metricName: 'active_users' | 'concurrent_requests' | 'memory_usage_mb',
    value: number
  ) {
    const key = metricName as keyof SystemMetrics;
    if (key in this.systemMetrics) {
      (this.systemMetrics[key] as number) = value;
    }
  }

  /**
   * Record HTTP request metrics
   * @param method HTTP method (GET, POST, etc.)
   * @param statusCode Response status code
   */
  recordHttpRequest(method: string, statusCode: number) {
    this.httpMetrics.total++;
    this.httpMetrics.byMethod.set(method, (this.httpMetrics.byMethod.get(method) || 0) + 1);
    this.httpMetrics.byStatus.set(String(statusCode), (this.httpMetrics.byStatus.get(String(statusCode)) || 0) + 1);
  }

  /**
   * Record cache hit/miss
   * @param hit Whether the cache hit (true) or missed (false)
   */
  recordCacheAccess(hit: boolean) {
    if (hit) {
      this.cacheMetrics.hits++;
    } else {
      this.cacheMetrics.misses++;
    }
  }

  /**
   * Record cache eviction
   */
  recordCacheEviction() {
    this.cacheMetrics.evictions++;
  }

  /**
   * Get current metrics snapshot
   * @returns {MetricSnapshot} Current metrics state
   */
  getSnapshot(): MetricSnapshot {
    const uptime_seconds = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      timestamp: new Date().toISOString(),
      environment: import.meta.env.MODE,
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      uptime_seconds,
      slo_metrics: {
        prescription_to_dispensing: this.calculateLatencyMetric(
          'prescription_to_dispensing'
        ),
        registration_to_appointment: this.calculateLatencyMetric(
          'registration_to_appointment'
        ),
        lab_order_to_critical_alert: this.calculateLatencyMetric(
          'lab_order_to_critical_alert'
        ),
        appointment_confirmation_to_reminder: this.calculateLatencyMetric(
          'appointment_confirmation_to_reminder'
        ),
      },
      http_requests: {
        total_requests: this.httpMetrics.total,
        requests_by_method: Object.fromEntries(this.httpMetrics.byMethod),
        requests_by_status: Object.fromEntries(this.httpMetrics.byStatus),
        error_rate:
          this.httpMetrics.total > 0
            ? ((this.httpMetrics.byStatus.get('5xx') || 0) / this.httpMetrics.total) * 100
            : 0,
      },
      cache_metrics: {
        hit_ratio:
          this.cacheMetrics.hits + this.cacheMetrics.misses > 0
            ? this.cacheMetrics.hits / (this.cacheMetrics.hits + this.cacheMetrics.misses)
            : 0,
        hits: this.cacheMetrics.hits,
        misses: this.cacheMetrics.misses,
        evictions: this.cacheMetrics.evictions,
      },
      system_metrics: this.systemMetrics,
    };
  }

  /**
   * Calculate percentile latency metrics
   */
  private calculateLatencyMetric(sloName: string): LatencyMetric {
    const latencies = this.sloMetrics.get(sloName) || [];
    const sorted = [...latencies].sort((a, b) => a - b);

    if (sorted.length === 0) {
      return {
        count: 0,
        sum_ms: 0,
        min_ms: 0,
        max_ms: 0,
        p50_ms: 0,
        p95_ms: 0,
        p99_ms: 0,
        bucket_1s: 0,
        bucket_5s: 0,
        bucket_30s: 0,
      };
    }

    const sum_ms = sorted.reduce((a, b) => a + b, 0);
    const count = sorted.length;
    const min_ms = sorted[0];
    const max_ms = sorted[sorted.length - 1];
    const p50_ms = sorted[Math.floor(count * 0.5)];
    const p95_ms = sorted[Math.floor(count * 0.95)];
    const p99_ms = sorted[Math.floor(count * 0.99)];

    const bucket_1s = sorted.filter((x) => x <= 1000).length;
    const bucket_5s = sorted.filter((x) => x <= 5000).length;
    const bucket_30s = sorted.filter((x) => x <= 30000).length;

    return {
      count,
      sum_ms,
      min_ms,
      max_ms,
      p50_ms,
      p95_ms,
      p99_ms,
      bucket_1s,
      bucket_5s,
      bucket_30s,
    };
  }

  /**
   * Export metrics in Prometheus format
   * @returns {string} Prometheus exposition format metrics
   */
  exportPrometheus(): string {
    const snapshot = this.getSnapshot();
    let output = '';

    // SLO latencies
    output += `# HELP caresync_slo_prescription_to_dispensing_seconds Prescription to dispensing latency\n`;
    output += `# TYPE caresync_slo_prescription_to_dispensing_seconds histogram\n`;
    const ptd = snapshot.slo_metrics.prescription_to_dispensing;
    output += `caresync_slo_prescription_to_dispensing_seconds_bucket{le="1"} ${ptd.bucket_1s}\n`;
    output += `caresync_slo_prescription_to_dispensing_seconds_bucket{le="5"} ${ptd.bucket_5s}\n`;
    output += `caresync_slo_prescription_to_dispensing_seconds_bucket{le="30"} ${ptd.bucket_30s}\n`;
    output += `caresync_slo_prescription_to_dispensing_seconds_bucket{le="+Inf"} ${ptd.count}\n`;
    output += `caresync_slo_prescription_to_dispensing_seconds_sum ${ptd.sum_ms / 1000}\n`;
    output += `caresync_slo_prescription_to_dispensing_seconds_count ${ptd.count}\n`;
    output += `\n`;

    // HTTP requests
    output += `# HELP caresync_http_requests_total Total HTTP requests\n`;
    output += `# TYPE caresync_http_requests_total counter\n`;
    for (const [method, count] of Object.entries(snapshot.http_requests.requests_by_method)) {
      output += `caresync_http_requests_total{method="${method}"} ${count}\n`;
    }
    output += `\n`;

    // Cache hit ratio
    output += `# HELP caresync_cache_hit_ratio Cache hit ratio\n`;
    output += `# TYPE caresync_cache_hit_ratio gauge\n`;
    output += `caresync_cache_hit_ratio ${snapshot.cache_metrics.hit_ratio}\n`;
    output += `\n`;

    // Active users
    output += `# HELP caresync_active_users_total Active users\n`;
    output += `# TYPE caresync_active_users_total gauge\n`;
    output += `caresync_active_users_total ${snapshot.system_metrics.active_users}\n`;

    return output;
  }
}

// Global singleton instance
let metricsInstance: MetricsCollector | null = null;

/**
 * Initialize metrics collection
 * Should be called once at application startup
 */
export function initializeMetrics(): MetricsCollector {
  if (!metricsInstance) {
    metricsInstance = new MetricsCollector();
    logger.info('Metrics collection initialized');
  }
  return metricsInstance;
}

/**
 * Get the metrics collector instance
 */
export function getMetrics(): MetricsCollector {
  if (!metricsInstance) {
    return initializeMetrics();
  }
  return metricsInstance;
}

/**
 * Convenience function to track SLO latencies
 */
export function trackSLOLatency(sloName: string, latency_ms: number) {
  const metrics = getMetrics();
  metrics.trackSLO(sloName, latency_ms);
}

/**
 * Convenience function to increment counters
 */
export function incrementMetricCounter(
  counterName:
    | 'prescriptions_created'
    | 'prescription_amendments'
    | 'lab_orders_created'
    | 'appointments_scheduled'
    | 'audit_records_created',
  amount?: number
) {
  const metrics = getMetrics();
  metrics.incrementCounter(counterName, amount);
}

/**
 * Convenience function to set gauge metrics
 */
export function setMetricGauge(gaugeName: string, value: number) {
  const metrics = getMetrics();
  if (gaugeName === 'active_users' || gaugeName === 'concurrent_requests' || gaugeName === 'memory_usage_mb') {
    metrics.setGauge(gaugeName, value);
  }
}

/**
 * Convenience function to record HTTP requests
 */
export function recordHttpRequestMetric(method: string, statusCode: number) {
  const metrics = getMetrics();
  metrics.recordHttpRequest(method, statusCode);
}

/**
 * Convenience function to record cache operations
 */
export function recordCacheHit() {
  const metrics = getMetrics();
  metrics.recordCacheAccess(true);
}

export function recordCacheMiss() {
  const metrics = getMetrics();
  metrics.recordCacheAccess(false);
}
