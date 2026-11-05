/**
 * S0-06: audit-logger (EDGE-09) and outbound email (EDGE-16) rules.
 * Behaviour tests of supabase/functions/_shared/auditEvent.ts and emailSafety.ts.
 */
import { describe, it, expect } from 'vitest';
import {
  AUDIT_MAX_LIMIT,
  AUDIT_READ_ROLES,
  auditLimit,
  buildAuditRecord,
  getSeverityLevel,
} from '../../supabase/functions/_shared/auditEvent';
import {
  buildFromHeader,
  escapeHtml,
  normalizeRecipients,
  recipientsOutsideAllowlist,
  sanitizeDisplayName,
} from '../../supabase/functions/_shared/emailSafety';

const ctx = {
  userId: 'actor-user',
  hospitalId: 'hospital-a',
  ipAddress: '10.0.0.1',
  userAgent: 'ua',
  now: new Date('2026-11-05T10:00:00.000Z'),
};

describe('buildAuditRecord (EDGE-09)', () => {
  it('attributes the event to the JWT actor and hospital, ignoring body identity', () => {
    const r = buildAuditRecord(
      {
        user_id: 'doctor-in-hospital-b',
        hospital_id: 'hospital-b',
        timestamp: '1999-01-01T00:00:00Z',
        severity: 'low',
        ip_address: '6.6.6.6',
        action: 'export',
        resource_type: 'patients',
        resource_id: 'p1',
        details: { count: 3 },
      },
      ctx,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.user_id).toBe('actor-user');
    expect(r.value.hospital_id).toBe('hospital-a');
    expect(r.value.timestamp).toBe('2026-11-05T10:00:00.000Z');
    expect(r.value.ip_address).toBe('10.0.0.1');
    expect(r.value.severity).toBe('high');
    expect(r.value.resource_id).toBe('p1');
    expect(r.value.details).toEqual({ count: 3 });
    expect(Object.keys(r.value).sort()).toEqual(
      [
        'action',
        'details',
        'hospital_id',
        'ip_address',
        'resource_id',
        'resource_type',
        'session_id',
        'severity',
        'timestamp',
        'user_agent',
        'user_id',
      ].sort(),
    );
  });

  it('rejects events without action/resource_type or with oversized fields', () => {
    expect(buildAuditRecord(null, ctx).ok).toBe(false);
    expect(buildAuditRecord([], ctx).ok).toBe(false);
    expect(buildAuditRecord({ action: 'view' }, ctx).ok).toBe(false);
    expect(buildAuditRecord({ action: 'x'.repeat(101), resource_type: 'patients' }, ctx).ok).toBe(false);
  });

  it('drops non-object details', () => {
    const r = buildAuditRecord({ action: 'view', resource_type: 'patients', details: 'free text' }, ctx);
    expect(r.ok && r.value.details).toEqual({});
  });

  it('severity rules unchanged', () => {
    expect(getSeverityLevel('bulk_update', 'x')).toBe('high');
    expect(getSeverityLevel('view', 'patients')).toBe('medium');
    expect(getSeverityLevel('login', 'auth')).toBe('low');
  });

  it('reads are admin-only and capped', () => {
    expect([...AUDIT_READ_ROLES]).toEqual(['admin']);
    expect(auditLimit(undefined)).toBe(50);
    expect(auditLimit(0)).toBe(50);
    expect(auditLimit(10)).toBe(10);
    expect(auditLimit(1e9)).toBe(AUDIT_MAX_LIMIT);
    expect(auditLimit('20')).toBe(20);
  });
});

describe('emailSafety (EDGE-16)', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<a href="x">\'&\'</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(5)).toBe('5');
  });

  it('builds a From header with a sanitised name and a fixed address', () => {
    expect(buildFromHeader('St. Mary <it@evil.example>\r\nBcc: x@y.z')).toBe(
      'St. Mary it@evil.example Bcc: x@y.z <onboarding@resend.dev>',
    );
    expect(buildFromHeader('', 'noreply@hospital.example')).toBe('CareSync <noreply@hospital.example>');
    expect(sanitizeDisplayName(42)).toBe('CareSync');
    expect(sanitizeDisplayName('a'.repeat(200)).length).toBe(80);
  });

  it('normalises, de-duplicates and caps recipients', () => {
    expect(normalizeRecipients(' A@Example.com ')).toEqual({ ok: true, value: ['a@example.com'] });
    expect(normalizeRecipients(['a@example.com', 'A@example.com'])).toEqual({ ok: true, value: ['a@example.com'] });
    expect(normalizeRecipients('not an email').ok).toBe(false);
    expect(normalizeRecipients([]).ok).toBe(false);
    expect(normalizeRecipients(['a@x.io', 'b@x.io', 'c@x.io'], 2).ok).toBe(false);
    expect(normalizeRecipients('a@x.io,b@x.io').ok).toBe(false);
  });

  it('flags recipients outside the tenant allowlist', () => {
    expect(recipientsOutsideAllowlist(['a@x.io', 'evil@ext.io'], ['A@x.io', null])).toEqual(['evil@ext.io']);
    expect(recipientsOutsideAllowlist(['a@x.io'], ['a@x.io'])).toEqual([]);
  });
});
