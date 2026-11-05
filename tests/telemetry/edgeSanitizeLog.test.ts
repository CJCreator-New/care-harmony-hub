/**
 * Edge-function log redaction (supabase/functions/_shared/sanitizeLog.ts).
 *
 * The edge helper and the client logger (src/utils/logger.ts) must redact the same
 * keys. The parity test below fails if either list drifts.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  REDACTED_KEY_WORDS as EDGE_KEY_WORDS,
  isSensitiveKey,
  logEdge,
  redactLogValue,
  sanitizeLogMessage,
  sanitizeObjectForLog,
} from '../../supabase/functions/_shared/sanitizeLog.ts';
import { errorHandler } from '../../supabase/functions/_shared/errorHandler.ts';
import { REDACTED_KEY_WORDS as CLIENT_KEY_WORDS, redactForLog } from '../../src/utils/logger';

const PHI_SAMPLE = {
  patient_name: 'Jane Roe',
  firstName: 'Jane',
  mrn: 'MRN-0042871',
  dob: '1984-03-12',
  date_of_birth: '1984-03-12',
  medication_name: 'warfarin',
  clinical_notes: 'patient reports chest pain',
  diagnosis: 'I21.9',
  email: 'jane.roe@example.com',
  phone_number: '555-123-4567',
  address: '12 Elm St',
  ssn: '123-45-6789',
  allergies: ['penicillin'],
  lab_status: 'final',
  record_id: 'rec-1',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('edge log redaction: key list', () => {
  it('matches the client logger key list exactly (parity)', () => {
    expect([...EDGE_KEY_WORDS].sort()).toEqual([...CLIENT_KEY_WORDS].sort());
  });

  it('covers the required PHI and contact keys', () => {
    for (const word of ['name', 'mrn', 'dob', 'medication', 'notes', 'diagnosis', 'email', 'phone', 'address', 'ssn', 'allergies']) {
      expect(EDGE_KEY_WORDS).toContain(word);
    }
  });

  it('recognises snake_case, camelCase and kebab-case keys', () => {
    expect(isSensitiveKey('patient_name')).toBe(true);
    expect(isSensitiveKey('patientName')).toBe(true);
    expect(isSensitiveKey('contact-email')).toBe(true);
    expect(isSensitiveKey('lab_status')).toBe(false);
    expect(isSensitiveKey('record_id')).toBe(false);
  });
});

describe('edge log redaction: values', () => {
  it('replaces sensitive values with [redacted] and keeps safe fields', () => {
    const out = redactLogValue(PHI_SAMPLE) as Record<string, unknown>;
    expect(out.patient_name).toBe('[redacted]');
    expect(out.firstName).toBe('[redacted]');
    expect(out.mrn).toBe('[redacted]');
    expect(out.medication_name).toBe('[redacted]');
    expect(out.clinical_notes).toBe('[redacted]');
    expect(out.allergies).toBe('[redacted]');
    expect(out.lab_status).toBe('final');
    expect(out.record_id).toBe('rec-1');
  });

  it('scrubs patient-shaped strings in unrelated keys', () => {
    expect(sanitizeLogMessage('contact jane.roe@example.com today')).toContain('[EMAIL]');
    expect(sanitizeLogMessage('SSN 123-45-6789')).toContain('[SSN]');
    expect(sanitizeLogMessage('MRN: AB123456')).toContain('[MRN]');
  });

  it('reduces errors to name and scrubbed message', () => {
    const err = new Error('insert failed: Failing row contains (jane.roe@example.com)');
    const out = redactLogValue({ error: err }) as { error: { name: string; message: string } };
    expect(out.error.name).toBe('Error');
    expect(out.error.message).not.toContain('jane.roe@example.com');
    expect(JSON.stringify(out)).not.toContain('stack');
  });

  it('serialises without PHI through sanitizeObjectForLog', () => {
    const json = sanitizeObjectForLog(PHI_SAMPLE);
    for (const secret of ['Jane', 'MRN-0042871', '1984-03-12', 'warfarin', 'chest pain', 'jane.roe@example.com', '555-123-4567', '12 Elm St', '123-45-6789', 'penicillin']) {
      expect(json).not.toContain(secret);
    }
  });

  it('truncates deeply nested objects instead of recursing forever', () => {
    const deep: Record<string, unknown> = {};
    let cursor = deep;
    for (let i = 0; i < 20; i++) {
      cursor.child = {};
      cursor = cursor.child as Record<string, unknown>;
    }
    expect(() => sanitizeObjectForLog(deep)).not.toThrow();
    expect(sanitizeObjectForLog(deep)).toContain('[truncated]');
  });
});

describe('logEdge sink', () => {
  it('writes one redacted line to the matching console method', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logEdge('error', 'lab-result-notify', PHI_SAMPLE);
    expect(spy).toHaveBeenCalledTimes(1);
    const line = String(spy.mock.calls[0][0]);
    expect(line.startsWith('[lab-result-notify]')).toBe(true);
    expect(line).not.toContain('Jane');
    expect(line).not.toContain('MRN-0042871');
    expect(line).toContain('lab_status');
  });

  it('routes info and warn to their own console methods', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logEdge('info', 'a', { ok: true });
    logEdge('warn', 'b', { ok: false });
    expect(info).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe('shared error handler logging', () => {
  it('scrubs identifier and contact patterns from error messages written to the console', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    errorHandler.error(new Error('Failing row contains (MRN: AB123456, jane.roe@example.com)'));
    const written = spy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(written).not.toContain('AB123456');
    expect(written).not.toContain('jane.roe@example.com');
  });
  // Limitation: free-text person names inside arbitrary error messages cannot be detected by
  // pattern. Handlers must not pass raw record bodies into errors (tracked in EDGE-21).
});

describe('client redactor agrees with the edge helper on the same input', () => {
  it('produces the same redacted keys for the sample', () => {
    const client = redactForLog(PHI_SAMPLE) as Record<string, unknown>;
    const edge = redactLogValue(PHI_SAMPLE) as Record<string, unknown>;
    expect(Object.keys(client)).toEqual(Object.keys(edge));
    for (const key of Object.keys(edge)) {
      if (edge[key] === '[redacted]') expect(client[key]).toBe('[redacted]');
    }
  });
});
