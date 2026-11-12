/**
 * S0-08 (EDGE-03 / CLIN-10): unit tests for the pure grading, ladder, retry and
 * worker-auth logic used by supabase/functions/critical-lab-check.
 *
 * These are behaviour tests of the shared module, not source-string checks.
 * An integration test against a real database and the deployed function is still
 * outstanding (no credentials in this environment); see
 * supabase/pending-migrations/README.md for the staging drill.
 */
import { describe, it, expect } from 'vitest';
import {
  ALERT_SEVERITIES,
  DEFAULT_THRESHOLDS,
  ESCALATION_DELAY_MINUTES,
  ESCALATION_STATUSES,
  MAX_DISPATCH_ATTEMPTS,
  WORKER_SECRET_HEADER,
  ageGroupFromDob,
  buildLadderSchedule,
  constantTimeEqual,
  decideDispatchOutcome,
  decideResult,
  defaultRangeFor,
  gradeAnalyte,
  inAppMessage,
  isWorkerAuthorized,
  pagerMessage,
  parseAnalyteValue,
  parseCriticalLabRequest,
  resolveRange,
  selectHospitalRange,
  unitsConflict,
  type ChannelResult,
  type HospitalRangeRow,
} from '../../supabase/functions/_shared/criticalLabEscalation.ts';
import { STANDARD_LAB_PANELS, ESCALATION_INTERVALS_MS } from '@/modules/critical-lab-escalation';

const UUID = '11111111-2222-4333-8444-555555555555';
const NOW = new Date('2026-11-05T12:00:00Z');

describe('parseAnalyteValue (strict)', () => {
  it.each([
    ['6.9', 6.9],
    [' 140 ', 140],
    ['.5', 0.5],
    ['-1', -1],
    [7, 7],
  ])('parses %j', (raw, expected) => expect(parseAnalyteValue(raw)).toBe(expected));

  it.each(['', '  ', 'CRITICAL_ALERT', 'hemolysed', '<0.01', '>500', '6,9', '6.9 mmol/L', 'NaN', null, undefined, NaN, Infinity])(
    'refuses %j',
    (raw) => expect(parseAnalyteValue(raw)).toBeNull()
  );
});

describe('gradeAnalyte fails closed', () => {
  const k = defaultRangeFor('k');

  it('K+ 6.9 is critical_high, K+ 2.5 critical_low (inclusive thresholds as in the UI)', () => {
    expect(gradeAnalyte({ code: 'k', value: '6.9' }, k).grade).toBe('critical_high');
    expect(gradeAnalyte({ code: 'k', value: 6.2 }, k).grade).toBe('critical_high');
    expect(gradeAnalyte({ code: 'k', value: '2.5' }, k).grade).toBe('critical_low');
    expect(gradeAnalyte({ code: 'k', value: '2.8' }, k).grade).toBe('critical_low');
  });

  it('abnormal-but-not-critical is warning; in range is normal', () => {
    expect(gradeAnalyte({ code: 'k', value: '5.5' }, k).grade).toBe('warning');
    expect(gradeAnalyte({ code: 'k', value: '4.0' }, k).grade).toBe('normal');
  });

  it('the old frontend payload ("CRITICAL_ALERT" text) is review_required, never normal', () => {
    const g = gradeAnalyte({ code: 'k', value: 'CRITICAL PANIC VALUES DETECTED: Potassium (6.9)' }, k);
    expect(g.grade).toBe('review_required');
    expect(g.reason).toBe('unparseable_value');
    expect(g.value).toBeNull();
  });

  it('a value with no configured range is review_required', () => {
    const g = gradeAnalyte({ code: 'lactate', value: '9.1' }, null);
    expect(g.grade).toBe('review_required');
    expect(g.reason).toBe('no_critical_range_configured');
  });

  it('a range with no critical limits cannot grade and is review_required', () => {
    const g = gradeAnalyte({ code: 'alp', value: '900' }, { warning_low: 44, warning_high: 147, source: 'hospital' });
    expect(g.grade).toBe('review_required');
  });

  it('zero is a real threshold (the old code treated 0 as "no limit")', () => {
    const g = gradeAnalyte({ code: 'x', value: '0' }, { critical_low: 0, critical_high: 10, source: 'hospital' });
    expect(g.grade).toBe('critical_low');
  });

  it('conflicting units are review_required; mmol/L and mEq/L are equivalent', () => {
    expect(gradeAnalyte({ code: 'glu', value: '25', unit: 'mmol/L' }, defaultRangeFor('glu')).reason).toBe('unit_mismatch');
    expect(gradeAnalyte({ code: 'k', value: '6.9', unit: 'mEq/L' }, k).grade).toBe('critical_high');
    expect(unitsConflict('x10^3/µL', 'K/uL')).toBe(false);
    expect(unitsConflict(undefined, 'mg/dL')).toBe(false);
  });
});

describe('decideResult', () => {
  const k = defaultRangeFor('k');
  const na = defaultRangeFor('na');

  it('critical analyte -> alert with that severity and headline', () => {
    const d = decideResult(
      [gradeAnalyte({ code: 'na', value: '140' }, na), gradeAnalyte({ code: 'k', value: '6.9' }, k)],
      false
    );
    expect(d).toMatchObject({ requiresAlert: true, severity: 'critical_high' });
    expect(d.headline?.code).toBe('k');
  });

  it('only an ungradeable analyte -> review_required alert', () => {
    const d = decideResult([gradeAnalyte({ code: 'k', value: 'hemolysed' }, k)], false);
    expect(d).toMatchObject({ requiresAlert: true, severity: 'review_required' });
    expect(d.reasons).toContain('k:unparseable_value');
  });

  it('manual critical flag with no gradeable values -> review_required alert', () => {
    const d = decideResult([], true);
    expect(d).toMatchObject({ requiresAlert: true, severity: 'review_required', headline: null });
    expect(d.reasons).toContain('manual_critical_flag');
  });

  it('all normal and not flagged -> no alert', () => {
    expect(decideResult([gradeAnalyte({ code: 'k', value: '4.1' }, k)], false).requiresAlert).toBe(false);
  });

  it('only emits severities allowed by the lab_critical_alerts CHECK', () => {
    const graded = ['6.9', '2.0', 'x'].map((v) => decideResult([gradeAnalyte({ code: 'k', value: v }, k)], false));
    for (const d of graded) expect(ALERT_SEVERITIES).toContain(d.severity);
  });
});

describe('range resolution', () => {
  const rows: HospitalRangeRow[] = [
    { test_code: '2823-3', age_group: 'adult', critical_low: '3.0', critical_high: '6.0', warning_low: null, warning_high: null, unit_of_measure: 'mmol/L' },
    { test_code: 'k', age_group: 'neonatal', critical_low: 2.5, critical_high: 7.5, warning_low: null, warning_high: null, unit_of_measure: 'mmol/L' },
  ];

  it('hospital range (matched by LOINC) wins over the default', () => {
    const r = resolveRange('k', rows, 'adult');
    expect(r).toMatchObject({ source: 'hospital', critical_high: 6 });
    expect(gradeAnalyte({ code: 'k', value: '6.1' }, r).grade).toBe('critical_high'); // default (6.2) would say warning
  });

  it('tier4 age-group synonyms are understood ("neonatal")', () => {
    expect(selectHospitalRange(rows, 'neonate')).toMatchObject({ critical_high: 7.5 });
  });

  it('geriatric falls back to adult hospital range', () => {
    expect(resolveRange('k', rows, 'geriatric')).toMatchObject({ source: 'hospital', critical_high: 6 });
  });

  it('neonates/infants never fall back to adult defaults: ungraded -> review', () => {
    expect(resolveRange('glu', [], 'infant')).toBeNull();
    expect(gradeAnalyte({ code: 'glu', value: '60' }, resolveRange('glu', [], 'infant')).grade).toBe('review_required');
  });

  it('adult with no hospital row uses the built-in default', () => {
    expect(resolveRange('glu', [], 'adult')).toMatchObject({ source: 'default', critical_low: 45 });
  });

  it('ageGroupFromDob', () => {
    expect(ageGroupFromDob('2026-11-01', NOW)).toBe('neonate');
    expect(ageGroupFromDob('2026-03-01', NOW)).toBe('infant');
    expect(ageGroupFromDob('2020-01-01', NOW)).toBe('pediatric');
    expect(ageGroupFromDob('2010-01-01', NOW)).toBe('adolescent');
    expect(ageGroupFromDob('1980-01-01', NOW)).toBe('adult');
    expect(ageGroupFromDob('1950-01-01', NOW)).toBe('geriatric');
    expect(ageGroupFromDob(null, NOW)).toBe('adult');
  });
});

describe('server defaults stay in sync with the UI panel thresholds', () => {
  it('every UI panel parameter has the same critical limits on the server', () => {
    for (const panel of Object.values(STANDARD_LAB_PANELS)) {
      for (const p of panel.parameters) {
        if (p.criticalLow === undefined && p.criticalHigh === undefined) continue;
        const d = DEFAULT_THRESHOLDS[p.id];
        expect(d, `missing server default for ${p.id}`).toBeDefined();
        expect([d.criticalLow, d.criticalHigh, d.unit, d.normalMin, d.normalMax]).toEqual([
          p.criticalLow,
          p.criticalHigh,
          p.unit,
          p.normalMin,
          p.normalMax,
        ]);
      }
    }
  });

  it('ladder timing matches the module constants (0 / 5 / 10 minutes)', () => {
    expect(ESCALATION_DELAY_MINUTES.primary * 60_000).toBe(ESCALATION_INTERVALS_MS.primary);
    expect(ESCALATION_DELAY_MINUTES.on_call * 60_000).toBe(ESCALATION_INTERVALS_MS.on_call);
    expect(ESCALATION_DELAY_MINUTES.er * 60_000).toBe(ESCALATION_INTERVALS_MS.er);
  });
});

describe('buildLadderSchedule', () => {
  it('one row per level at +0, +5, +10 minutes', () => {
    expect(buildLadderSchedule(NOW)).toEqual([
      { escalation_level: 'primary', scheduled_for: '2026-11-05T12:00:00.000Z' },
      { escalation_level: 'on_call', scheduled_for: '2026-11-05T12:05:00.000Z' },
      { escalation_level: 'er', scheduled_for: '2026-11-05T12:10:00.000Z' },
    ]);
  });
});

describe('decideDispatchOutcome (honest status)', () => {
  const r = (channel: ChannelResult['channel'], status: ChannelResult['status']): ChannelResult => ({
    channel,
    status,
    recipient_profile_id: UUID,
  });

  it('in-app delivered -> dispatched, even with the pager hook unconfigured', () => {
    const o = decideDispatchOutcome([r('in_app', 'delivered'), r('pager', 'not_configured')], 1, NOW);
    expect(o).toMatchObject({ status: 'dispatched', error_message: null, delivered_count: 1 });
  });

  it('partial failure is dispatched but records the failure', () => {
    const o = decideDispatchOutcome([r('in_app', 'delivered'), r('pager', 'failed')], 1, NOW);
    expect(o.status).toBe('dispatched');
    expect(o.error_message).toMatch(/pager:failed/);
  });

  it('nothing delivered (pager not configured does not count) -> retry in 1 min', () => {
    const o = decideDispatchOutcome([r('in_app', 'failed'), r('pager', 'not_configured')], 1, NOW);
    expect(o).toMatchObject({ status: 'pending', retry_at: '2026-11-05T12:01:00.000Z', delivered_count: 0 });
  });

  it('no recipients at all -> retry, then failed after the last attempt', () => {
    expect(decideDispatchOutcome([], 1, NOW).status).toBe('pending');
    const o = decideDispatchOutcome([], MAX_DISPATCH_ATTEMPTS, NOW);
    expect(o.status).toBe('failed');
    expect(o.error_message).toMatch(/no_recipients_resolved/);
  });

  it('only produces statuses allowed by the lab_alert_escalations CHECK', () => {
    for (const a of [1, 2, 3]) {
      expect(ESCALATION_STATUSES).toContain(decideDispatchOutcome([], a, NOW).status);
    }
    expect(ESCALATION_STATUSES).not.toContain('escalated');
  });
});

describe('worker authentication (service credentials only)', () => {
  const secret = 'w'.repeat(40);
  const serviceKey = 's'.repeat(60);
  const headers = (h: Record<string, string>) => (name: string) => h[name.toLowerCase()] ?? null;

  it('accepts the shared secret header', () => {
    expect(isWorkerAuthorized(headers({ [WORKER_SECRET_HEADER]: secret }), { workerSecret: secret })).toBe(true);
  });

  it('accepts Bearer <service-role key>', () => {
    expect(isWorkerAuthorized(headers({ authorization: `Bearer ${serviceKey}` }), { serviceRoleKey: serviceKey })).toBe(true);
  });

  it('rejects a user JWT, a wrong secret, and an unset/short secret', () => {
    const userJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.sig';
    expect(isWorkerAuthorized(headers({ authorization: `Bearer ${userJwt}` }), { workerSecret: secret, serviceRoleKey: serviceKey })).toBe(false);
    expect(isWorkerAuthorized(headers({ [WORKER_SECRET_HEADER]: secret + 'x' }), { workerSecret: secret })).toBe(false);
    expect(isWorkerAuthorized(headers({ [WORKER_SECRET_HEADER]: '' }), { workerSecret: '' })).toBe(false);
    expect(isWorkerAuthorized(headers({ [WORKER_SECRET_HEADER]: 'short' }), { workerSecret: 'short' })).toBe(false);
    expect(isWorkerAuthorized(headers({}), {})).toBe(false);
  });

  it('constantTimeEqual', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
    expect(constantTimeEqual('abc', 'abcd')).toBe(false);
    expect(constantTimeEqual('', '')).toBe(true);
  });
});

describe('parseCriticalLabRequest', () => {
  it('accepts the new create contract and defaults the action', () => {
    const r = parseCriticalLabRequest({
      lab_order_id: UUID,
      analytes: [{ code: 'k', name: 'Potassium', value: '6.9', unit: 'mmol/L' }],
    });
    expect(r).toMatchObject({ ok: true, value: { action: 'create_alert', manual_critical: false } });
  });

  it('rejects the old contract (labResultId/labResult) and non-UUID ids', () => {
    expect(parseCriticalLabRequest({ labResultId: UUID, labResult: {} }).ok).toBe(false);
    expect(parseCriticalLabRequest({ lab_order_id: 'abc', analytes: [] }).ok).toBe(false);
  });

  it('requires analytes or the manual flag', () => {
    expect(parseCriticalLabRequest({ lab_order_id: UUID, analytes: [] }).ok).toBe(false);
    expect(parseCriticalLabRequest({ lab_order_id: UUID, analytes: [], manual_critical: true }).ok).toBe(true);
  });

  it('rejects analytes with no code or an object value', () => {
    expect(parseCriticalLabRequest({ lab_order_id: UUID, analytes: [{ value: '1' }] }).ok).toBe(false);
    expect(parseCriticalLabRequest({ lab_order_id: UUID, analytes: [{ code: 'k', value: {} }] }).ok).toBe(false);
  });

  it('acknowledge needs alert_id or lab_order_id; legacy alertId is accepted', () => {
    expect(parseCriticalLabRequest({ action: 'acknowledge' }).ok).toBe(false);
    expect(parseCriticalLabRequest({ action: 'acknowledge', alertId: UUID })).toMatchObject({ ok: true, value: { alert_id: UUID } });
    expect(parseCriticalLabRequest({ action: 'acknowledge', lab_order_id: UUID })).toMatchObject({ ok: true });
  });

  it('process_escalations clamps the limit', () => {
    expect(parseCriticalLabRequest({ action: 'process_escalations', limit: 10_000 })).toMatchObject({ ok: true, value: { limit: 200 } });
    expect(parseCriticalLabRequest({ action: 'process_escalations' })).toMatchObject({ ok: true, value: { limit: 50 } });
  });

  it('rejects unknown actions and non-object bodies', () => {
    expect(parseCriticalLabRequest({ action: 'escalate_now' }).ok).toBe(false);
    expect(parseCriticalLabRequest(null).ok).toBe(false);
    expect(parseCriticalLabRequest([]).ok).toBe(false);
  });
});

describe('messages', () => {
  it('pager text carries no PHI (no test, value or patient)', () => {
    const m = pagerMessage('on_call', UUID);
    expect(m).toContain(UUID.slice(0, 8));
    expect(m).not.toMatch(/potassium|6\.9|patient/i);
  });

  it('in-app message names the escalation level', () => {
    const m = inAppMessage({ level: 'er', testName: 'BMP — Potassium', severity: 'critical_high', value: '6.9', unit: 'mmol/L' });
    expect(m.title).toMatch(/ESCALATED \(ED, 10 min\)/);
    expect(m.message).toContain('6.9 mmol/L');
  });
});
