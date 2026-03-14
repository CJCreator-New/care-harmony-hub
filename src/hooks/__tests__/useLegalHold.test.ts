import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateLegalHoldReason } from '@/hooks/useLegalHold';

describe('useLegalHold - Helper Functions', () => {
  describe('validateLegalHoldReason', () => {
    it('should accept valid reason', () => {
      const result = validateLegalHoldReason('Litigation case #2024-001 - Patient complaint');
      expect(result.valid).toBe(true);
    });

    it('should reject empty reason', () => {
      const result = validateLegalHoldReason('');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Reason is required');
    });

    it('should reject reason with whitespace only', () => {
      const result = validateLegalHoldReason('   ');
      expect(result.valid).toBe(false);
    });

    it('should reject reason shorter than 10 characters', () => {
      const result = validateLegalHoldReason('short');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('at least 10 characters');
    });

    it('should reject reason longer than 500 characters', () => {
      const longReason = 'a'.repeat(501);
      const result = validateLegalHoldReason(longReason);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('less than 500');
    });

    it('should reject reason with SQL injection patterns', () => {
      const testCases = [
        "'; DROP TABLE audit; --",
        'reason" OR 1=1 --',
        "reason'; DELETE FROM records;",
      ];

      testCases.forEach(reason => {
        const result = validateLegalHoldReason(reason);
        expect(result.valid).toBe(false);
        expect(result.message).toContain('invalid characters');
      });
    });

    it('should accept reason at boundary lengths', () => {
      // 10 characters exactly (minimum)
      const minResult = validateLegalHoldReason('1234567890');
      expect(minResult.valid).toBe(true);

      // 500 characters exactly (maximum)
      const maxResult = validateLegalHoldReason('a'.repeat(500));
      expect(maxResult.valid).toBe(true);
    });

    it('should normalize whitespace in reason', () => {
      const result = validateLegalHoldReason('  Valid reason with spaces  ');
      expect(result.valid).toBe(true);
    });
  });
});
