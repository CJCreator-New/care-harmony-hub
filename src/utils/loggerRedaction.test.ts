/**
 * PHI-safe client telemetry: logger redaction, Sentry scrubbing and the telemetry facade.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createLogger, redactForLog, scrubLogString, isSensitiveKey, REDACTED_KEY_WORDS } from '@/utils/logger';
import { scrubBreadcrumb, scrubEvent } from '@/lib/monitoring/sentry';
import { createClinicalSpan, recordClinicalMetric } from '@/utils/telemetry';

afterEach(() => {
  vi.restoreAllMocks();
});

const PHI = {
  patient_name: 'John Doe',
  firstName: 'John',
  mrn: 'MRN-7788990',
  dob: '1970-01-02',
  medication_name: 'metformin',
  clinical_notes: 'reports dizziness',
  diagnosis: 'E11.9',
  email: 'staff@hospital.example',
  phone: '555-867-5309',
  address: '1 Main St',
  ssn: '123-45-6789',
  allergies: 'penicillin',
  lab_value: 7.4,
  order_status: 'final',
};

describe('redactForLog', () => {
  it('redacts every required PHI and contact key', () => {
    const out = redactForLog(PHI) as Record<string, unknown>;
    for (const key of Object.keys(PHI)) {
      if (['lab_value', 'order_status'].includes(key)) continue;
      expect(out[key], key).toBe('[redacted]');
    }
    expect(out.lab_value).toBe(7.4);
    expect(out.order_status).toBe('final');
  });

  it('redacts nested objects and arrays', () => {
    const out = redactForLog({ visit: { patient_name: 'Ada Lovelace' }, rows: [{ email: 'a@b.co' }] });
    expect(JSON.stringify(out)).not.toContain('Ada Lovelace');
    expect(JSON.stringify(out)).not.toContain('a@b.co');
  });

  it('does not mutate its input', () => {
    const input = { patient_name: 'Keep Me' };
    redactForLog(input);
    expect(input.patient_name).toBe('Keep Me');
  });

  it('reduces errors to name and scrubbed message', () => {
    const out = redactForLog(new Error('contact a@b.co')) as { name: string; message: string; stack?: string };
    expect(out.name).toBe('Error');
    expect(out.message).toContain('[EMAIL]');
    expect(out.stack).toBeUndefined();
  });

  it('recognises key variants and leaves unrelated keys alone', () => {
    expect(isSensitiveKey('dateOfBirth')).toBe(true);
    expect(isSensitiveKey('contact_phone_number')).toBe(true);
    expect(isSensitiveKey('appointment_id')).toBe(false);
    expect(REDACTED_KEY_WORDS).toContain('name');
  });
});

describe('scrubLogString', () => {
  it('scrubs SSN, card, e-mail, phone, MRN and DOB patterns', () => {
    const text = scrubLogString('ssn 123-45-6789 card 4111-1111-1111-1111 a@b.co 555-123-4567 MRN: AB12345 DOB: 01/02/1970');
    expect(text).toContain('[SSN]');
    expect(text).toContain('[CARD]');
    expect(text).toContain('[EMAIL]');
    expect(text).toContain('[PHONE]');
    expect(text).toContain('[MRN]');
    expect(text).toContain('[DOB]');
  });
});

describe('client logger output', () => {
  it('never prints patient values to the console in development', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = createLogger('test-context', { version: '1.0.0' });
    logger.info('Loaded record', PHI);
    logger.logLifecycleEvent('prescription_created', {
      entity_type: 'prescription',
      entity_id: 'rx-1',
      actor_id: 'user-1',
      actor_role: 'doctor',
      timestamp: new Date().toISOString(),
      status: 'success',
      patient_name: 'John Doe',
    });
    const printed = spy.mock.calls.map((c) => String(c[0])).join('\n');
    if (import.meta.env.DEV) {
      expect(printed).not.toContain('John Doe');
      expect(printed).not.toContain('MRN-7788990');
      expect(printed).not.toContain('staff@hospital.example');
      expect(printed).toContain('Loaded record');
    }
  });

  it('error() scrubs e-mail addresses in the error message', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = createLogger('test-context');
    logger.error('save failed', new Error('row for staff@hospital.example rejected'));
    const printed = spy.mock.calls.map((c) => String(c[0])).join('\n');
    if (import.meta.env.DEV) {
      expect(printed).not.toContain('staff@hospital.example');
    }
  });
});

describe('Sentry scrubbing (SECF-12 acceptance)', () => {
  it('removes query strings that carry patient names from fetch breadcrumbs', () => {
    const crumb = scrubBreadcrumb({
      category: 'fetch',
      data: {
        method: 'GET',
        url: 'https://x.supabase.co/rest/v1/patients?or=(first_name.ilike.%25John%25,last_name.ilike.%25Doe%25)',
      },
    } as any);
    expect(crumb).not.toBeNull();
    expect(JSON.stringify(crumb)).not.toContain('John');
    expect(JSON.stringify(crumb)).not.toContain('ilike');
  });

  it('drops console breadcrumbs', () => {
    expect(scrubBreadcrumb({ category: 'console', message: 'John Doe' } as any)).toBeNull();
  });

  it('reduces event.user to id, role and hospital (no e-mail)', () => {
    const event = scrubEvent({
      type: undefined,
      user: { id: 'u-1', email: 'staff@hospital.example', role: 'nurse', hospital_id: 'h-1', ip_address: '1.2.3.4' },
      extra: { patient_name: 'John Doe', note: 'ok' },
      request: { url: 'https://app.example/x?q=John', query_string: 'q=John' },
    } as any);
    const json = JSON.stringify(event);
    expect(json).not.toContain('staff@hospital.example');
    expect(json).not.toContain('1.2.3.4');
    expect(json).not.toContain('John Doe');
    expect(json).not.toContain('query_string');
    expect(event.user).toEqual({ id: 'u-1', role: 'nurse', hospital_id: 'h-1' });
  });
});

describe('telemetry facade', () => {
  it('spans and metrics pass attributes through redaction', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const span = createClinicalSpan('appointment.create', { patient_name: 'John Doe', appointment_id: 'a-1' });
    span.end();
    recordClinicalMetric('appointment.create.latency', 12, { mrn: 'MRN-7788990' });
    const printed = spy.mock.calls.map((c) => String(c[0])).join('\n');
    if (import.meta.env.DEV) {
      expect(printed).not.toContain('John Doe');
      expect(printed).not.toContain('MRN-7788990');
    }
  });
});
