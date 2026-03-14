/**
 * Tests for Structured Logger
 * Validates PHI masking and log format compliance
 */

import { describe, it, expect } from 'vitest';
import { createLogger, maskPHI, sanitizeForLog } from '@/utils/logger';

describe('Structured Logger', () => {
  describe('createLogger()', () => {
    it('should create logger with correlation ID', () => {
      const logger = createLogger('test-context');
      expect(logger).toBeDefined();
    });

    it('should generate unique correlation IDs', () => {
      const logger1 = createLogger('context1');
      const logger2 = createLogger('context2');

      const id1 = (logger1 as any).correlationId;
      const id2 = (logger2 as any).correlationId;

      expect(id1).not.toBe(id2);
    });

    it('should accept metadata', () => {
      const logger = createLogger('test-context', {
        module: 'test-module',
        version: '1.0.0',
      });
      expect(logger).toBeDefined();
    });
  });

  describe('maskPHI()', () => {
    it('should mask UHID patterns', () => {
      const result = maskPHI('12345678');
      expect(result).toBe('[REDACTED]');
    });

    it('should mask email addresses', () => {
      const result = maskPHI('patient@hospital.com');
      expect(result).toBe('[REDACTED]');
    });

    it('should mask phone numbers', () => {
      const result = maskPHI('9876543210');
      expect(result).toBe('[REDACTED]');
    });

    it('should leave non-PHI values unchanged', () => {
      const result = maskPHI('random-text');
      expect(result).toBe('random-text');
    });

    it('should handle empty values', () => {
      expect(maskPHI('')).toBe('');
      expect(maskPHI(undefined)).toBe('');
    });

    it('should handle numeric values', () => {
      const result = maskPHI(999999);
      expect(result).toContain('REDACTED');
    });
  });

  describe('sanitizeForLog()', () => {
    it('should remove PHI fields from objects', () => {
      const input = {
        patient_name: 'John Doe',
        patient_uhid: '123456',
        diagnosis: 'Diabetes',
        safe_field: 'value',
      };

      const result = sanitizeForLog(input);
      expect(result).toContain('safe_field');
      expect(result).not.toContain('John Doe');
      expect(result).not.toContain('Diabetes');
    });

    it('should mask sensitive strings', () => {
      const result = sanitizeForLog('patient@email.com');
      expect(result).toContain('REDACTED');
    });

    it('should handle null/undefined', () => {
      expect(sanitizeForLog(null)).toBe('');
      expect(sanitizeForLog(undefined)).toBe('');
    });
  });

  describe('Logger methods', () => {
    it('should support debug logging', () => {
      const logger = createLogger('test');
      expect(() => logger.debug('test message')).not.toThrow();
    });

    it('should support info logging', () => {
      const logger = createLogger('test');
      expect(() => logger.info('test message')).not.toThrow();
    });

    it('should support warn logging', () => {
      const logger = createLogger('test');
      expect(() => logger.warn('test message')).not.toThrow();
    });

    it('should support error logging', () => {
      const logger = createLogger('test');
      const error = new Error('test error');
      expect(() => logger.error('error occurred', error)).not.toThrow();
    });

    it('should support lifecycle event logging', () => {
      const logger = createLogger('test');
      expect(() => {
        logger.logLifecycleEvent('prescription_created', {
          entity_type: 'prescription',
          entity_id: '123',
          actor_id: 'user1',
          actor_role: 'doctor',
          timestamp: new Date().toISOString(),
          status: 'success',
        });
      }).not.toThrow();
    });

    it('should support performance event logging', () => {
      const logger = createLogger('test');
      expect(() => {
        logger.logPerformanceEvent({
          operation: 'db_query',
          duration_ms: 150,
          success: true,
        });
      }).not.toThrow();
    });

    it('should support safety event logging', () => {
      const logger = createLogger('test');
      expect(() => {
        logger.logSafetyEvent({
          event_type: 'medication_conflict',
          reason: 'Drug interaction detected',
          actor_id: 'user1',
          actor_role: 'pharmacist',
          impact_level: 'high',
        });
      }).not.toThrow();
    });
  });

  describe('User context', () => {
    it('should set user context', () => {
      const logger = createLogger('test');
      expect(() => {
        logger.setUserContext('user123', 'doctor', 'hospital456');
      }).not.toThrow();
    });

    it('should generate new correlation ID', () => {
      const logger = createLogger('test');
      const id1 = (logger as any).correlationId;
      logger.newCorrelationId();
      const id2 = (logger as any).correlationId;

      expect(id1).not.toBe(id2);
    });
  });
});
