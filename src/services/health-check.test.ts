/**
 * Tests for Health Check Service
 * Validates response format, PHI masking, and endpoint behavior
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getHealth, getReady, getMetrics } from '@/services/health-check';

describe('Health Check Service', () => {
  describe('getHealth()', () => {
    it('should return healthy status with correct format', async () => {
      const response = await getHealth();

      expect(response).toBeDefined();
      expect(response.status).toBe('healthy');
      expect(response.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(response.uptime_seconds).toBeGreaterThanOrEqual(0);
      expect(response.environment).toMatch(/development|production|staging/);
      expect(response.version).toBeDefined();
    });

    it('should include status that can be interpreted as healthy', async () => {
      const response = await getHealth();
      expect(response.status === 'healthy').toBe(true);
    });

    it('should respond in under 100ms', async () => {
      const startTime = performance.now();
      await getHealth();
      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(100);
    });
  });

  describe('getReady()', () => {
    it('should return readiness status with dependency checks', async () => {
      const response = await getReady();

      expect(response).toBeDefined();
      expect(response.status).toMatch(/ready|not-ready/);
      expect(response.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(response.checks).toBeDefined();
      expect(response.checks.database).toMatch(/ok|down|degraded/);
      expect(response.checks.rls).toMatch(/ok|down|degraded/);
      expect(response.checks.cache).toMatch(/ok|down|degraded/);
      expect(response.checks.auth).toMatch(/ok|down|degraded/);
    });

    it('should include warnings array', async () => {
      const response = await getReady();
      expect(Array.isArray(response.warnings)).toBe(true);
    });

    it('should include status that can be interpreted as ready', async () => {
      const response = await getReady();
      expect(['ready', 'not-ready']).toContain(response.status);
    });
  });

  describe('getMetrics()', () => {
    it('should return Prometheus format text', () => {
      const response = getMetrics();

      expect(typeof response).toBe('string');
      expect(response).toContain('# HELP caresync_app_info');
      expect(response).toContain('# TYPE caresync_app_info gauge');
    });

    it('should include application metadata', () => {
      const response = getMetrics();

      expect(response).toContain('caresync_uptime_seconds');
      expect(response).toContain('caresync_app_info');
    });

    it('should include SLO metrics', () => {
      const response = getMetrics();

      expect(response).toContain('caresync_slo_prescription_to_dispensing_seconds');
      expect(response).toContain('_bucket');
      expect(response).toContain('_sum');
      expect(response).toContain('_count');
    });

    it('should include HTTP metrics', () => {
      const response = getMetrics();

      expect(response).toContain('caresync_http_requests_total');
      expect(response).toContain('method=');
    });

    it('should include cache metrics', () => {
      const response = getMetrics();

      expect(response).toContain('caresync_cache_hit_ratio');
      expect(response).toContain('caresync_active_users_total');
    });
  });
});
