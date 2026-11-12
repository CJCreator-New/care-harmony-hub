// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeSearchQuery, toIlikePattern } from '@/utils/sanitize';

/**
 * SQL injection checks.
 *
 * Two kinds of check live here:
 * - Sanitizer checks are pure and always run.
 * - Live checks send payloads to the real database. They run only when a live
 *   backend is configured (VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY).
 *   Without one, the client points at a stub URL, and a network failure would
 *   make the live assertions pass vacuously (null data counts as "no rows"),
 *   so they are not run.
 */

const hasLiveBackend = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

const sqlInjectionPayloads = [
  "' OR '1'='1",
  "'; DROP TABLE patients; --",
  "' UNION SELECT * FROM users --",
  "admin'--",
  "' OR 1=1--",
];

describe('SQL Injection Prevention', () => {
  describe('Query Parameter Sanitization (pure)', () => {
    it('sanitizes search input so no SQL metacharacters reach the query', () => {
      for (const payload of sqlInjectionPayloads) {
        const sanitizedSearch = sanitizeSearchQuery(payload);
        expect(sanitizedSearch).not.toMatch(/--|['";\\%_]/);
        expect(typeof toIlikePattern(payload)).toBe('string');
      }
    });
  });

  describe.runIf(hasLiveBackend)('Live database checks (requires a configured backend)', () => {
    describe('Query Parameter Sanitization', () => {
      it('should prevent SQL injection in email field', async () => {
        for (const payload of sqlInjectionPayloads) {
          const { data } = await supabase.from('profiles').select('*').eq('email', payload);

          // Should not execute malicious SQL and must not return any matching rows
          // (RLS may reject the query outright, in which case `data` is null)
          expect(!data || data.length === 0).toBe(true);
        }
      });

      it('should prevent SQL injection in search queries', async () => {
        for (const payload of sqlInjectionPayloads) {
          const safePattern = toIlikePattern(payload);
          const { data, error } = await supabase
            .from('patients')
            .select('*')
            .ilike('first_name', safePattern);

          // Sanitized query should execute safely
          expect(error).toBeNull();
          expect(Array.isArray(data)).toBe(true);
        }
      });
    });

    describe('Prepared Statements', () => {
      it('should use parameterized queries', async () => {
        const maliciousId = "1' OR '1'='1";

        const { data } = await supabase.from('patients').select('*').eq('id', maliciousId);

        // Should return no results or error, not all records
        expect(data === null || data.length === 0).toBe(true);
      });
    });
  });
});
