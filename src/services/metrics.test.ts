/**
 * Tests for Metrics Collection Service
 * Validates SLO tracking and metrics accuracy
 */

import { describe, it, expect } from 'vitest';
import {
  initializeMetrics,
  getMetrics,
  trackSLOLatency,
  incrementMetricCounter,
} from '@/services/metrics';

describe('Metrics Collection', () => {
  describe('initializeMetrics()', () => {
    it('should initialize metrics collector', () => {
      const collector = initializeMetrics();
      expect(collector).toBeDefined();
    });

    it('should return singleton instance', () => {
      const collector1 = initializeMetrics();
      const collector2 = initializeMetrics();
      expect(collector1).toBe(collector2);
    });

    it('should return collector from getMetrics()', () => {
      const collector = getMetrics();
      expect(collector).toBeDefined();
    });
  });

  describe('SLO tracking', () => {
    it('should track prescription to dispensing latency', () => {
      const metrics = getMetrics();
      const snapshot = metrics.getSnapshot();

      expect(snapshot.slo_metrics.prescription_to_dispensing).toBeDefined();
      expect(snapshot.slo_metrics.prescription_to_dispensing.count).toBeGreaterThanOrEqual(0);
    });

    it('should calculate SLO percentiles', () => {
      const metrics = getMetrics();

      // Track some latencies
      metrics.trackSLO('prescription_to_dispensing', 100);
      metrics.trackSLO('prescription_to_dispensing', 200);
      metrics.trackSLO('prescription_to_dispensing', 300);
      metrics.trackSLO('prescription_to_dispensing', 400);
      metrics.trackSLO('prescription_to_dispensing', 500);

      const snapshot = metrics.getSnapshot();
      const slo = snapshot.slo_metrics.prescription_to_dispensing;

      expect(slo.count).toBeGreaterThan(0);
      expect(slo.min_ms).toBeLessThanOrEqual(slo.max_ms);
      expect(slo.p50_ms).toBeGreaterThanOrEqual(0);
      expect(slo.p95_ms).toBeGreaterThanOrEqual(slo.p50_ms);
      expect(slo.p99_ms).toBeGreaterThanOrEqual(slo.p95_ms);
    });

    it('should track histogram buckets', () => {
      const metrics = getMetrics();

      metrics.trackSLO('lab_order_to_critical_alert', 500);
      metrics.trackSLO('lab_order_to_critical_alert', 3000);
      metrics.trackSLO('lab_order_to_critical_alert', 20000);

      const snapshot = metrics.getSnapshot();
      const slo = snapshot.slo_metrics.lab_order_to_critical_alert;

      expect(slo.bucket_1s).toBeGreaterThanOrEqual(0);
      expect(slo.bucket_5s).toBeGreaterThanOrEqual(slo.bucket_1s);
      expect(slo.bucket_30s).toBeGreaterThanOrEqual(slo.bucket_5s);
    });
  });

  describe('Counter metrics', () => {
    it('should increment prescriptions_created counter', () => {
      const metrics = getMetrics();
      const beforeSnapshot = metrics.getSnapshot();
      const before = beforeSnapshot.system_metrics.prescriptions_created;

      metrics.incrementCounter('prescriptions_created', 1);

      const afterSnapshot = metrics.getSnapshot();
      const after = afterSnapshot.system_metrics.prescriptions_created;

      expect(after).toBe(before + 1);
    });

    it('should increment by specified amount', () => {
      const metrics = getMetrics();
      const beforeSnapshot = metrics.getSnapshot();
      const before = beforeSnapshot.system_metrics.audit_records_created;

      metrics.incrementCounter('audit_records_created', 5);

      const afterSnapshot = metrics.getSnapshot();
      const after = afterSnapshot.system_metrics.audit_records_created;

      expect(after).toBe(before + 5);
    });
  });

  describe('Gauge metrics', () => {
    it('should set active_users gauge', () => {
      const metrics = getMetrics();

      metrics.setGauge('active_users', 42);

      const snapshot = metrics.getSnapshot();
      expect(snapshot.system_metrics.active_users).toBe(42);
    });

    it('should set concurrent_requests gauge', () => {
      const metrics = getMetrics();

      metrics.setGauge('concurrent_requests', 10);

      const snapshot = metrics.getSnapshot();
      expect(snapshot.system_metrics.concurrent_requests).toBe(10);
    });
  });

  describe('HTTP request metrics', () => {
    it('should record HTTP requests', () => {
      const metrics = getMetrics();

      metrics.recordHttpRequest('GET', 200);
      metrics.recordHttpRequest('POST', 201);
      metrics.recordHttpRequest('GET', 404);

      const snapshot = metrics.getSnapshot();
      expect(snapshot.http_requests.total_requests).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Cache metrics', () => {
    it('should record cache hits and misses', () => {
      const metrics = getMetrics();

      metrics.recordCacheAccess(true); // hit
      metrics.recordCacheAccess(true); // hit
      metrics.recordCacheAccess(false); // miss

      const snapshot = metrics.getSnapshot();
      expect(snapshot.cache_metrics.hit_ratio).toBeGreaterThan(0);
      expect(snapshot.cache_metrics.hit_ratio).toBeLessThanOrEqual(1);
    });
  });

  describe('Snapshot format', () => {
    it('should return complete metrics snapshot', () => {
      const metrics = getMetrics();
      const snapshot = metrics.getSnapshot();

      expect(snapshot.timestamp).toBeDefined();
      expect(snapshot.environment).toBeDefined();
      expect(snapshot.version).toBeDefined();
      expect(snapshot.uptime_seconds).toBeGreaterThanOrEqual(0);
      expect(snapshot.slo_metrics).toBeDefined();
      expect(snapshot.http_requests).toBeDefined();
      expect(snapshot.cache_metrics).toBeDefined();
      expect(snapshot.system_metrics).toBeDefined();
    });
  });

  describe('Prometheus export', () => {
    it('should export metrics in Prometheus format', () => {
      const metrics = getMetrics();
      const prometheusOutput = metrics.exportPrometheus();

      expect(typeof prometheusOutput).toBe('string');
      expect(prometheusOutput).toContain('# HELP');
      expect(prometheusOutput).toContain('# TYPE');
    });

    it('should include SLO metrics in export', () => {
      const metrics = getMetrics();
      const prometheusOutput = metrics.exportPrometheus();

      expect(prometheusOutput).toContain(
        'caresync_slo_prescription_to_dispensing_seconds'
      );
    });
  });
});
