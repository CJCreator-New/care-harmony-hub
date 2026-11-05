/**
 * S0-08: client contract for critical-lab-check. Verifies the payload carries
 * lab_order_id + per-analyte codes/values, and that invoke errors are surfaced
 * instead of being reported as "protocol initiated".
 */
import { describe, it, expect, vi } from 'vitest';
import {
  STANDARD_LAB_PANELS,
  acknowledgeCriticalLabAlert,
  buildCriticalLabCheckPayload,
  interpretCriticalLabCheckResponse,
  runCriticalLabCheck,
  shouldRunServerCriticalCheck,
} from '@/modules/critical-lab-escalation';
import { parseCriticalLabRequest } from '../../supabase/functions/_shared/criticalLabEscalation.ts';

const ORDER = '11111111-2222-4333-8444-555555555555';

/** Mimics supabase-js FunctionsHttpError: `context` is the Response. */
function httpError(status: number, body: unknown) {
  const err = new Error('Edge Function returned a non-2xx status code') as Error & { context: Response };
  err.context = new Response(JSON.stringify(body), { status });
  return err;
}

describe('buildCriticalLabCheckPayload', () => {
  it('sends lab_order_id and one analyte per entered panel value, raw strings as typed', () => {
    const p = buildCriticalLabCheckPayload({
      labOrderId: ORDER,
      panel: STANDARD_LAB_PANELS.bmp,
      rawValues: { k: '6.9', na: ' 140 ', glu: '', cr: 'hemolysed' },
      flaggedCritical: true,
    });
    expect(p.lab_order_id).toBe(ORDER);
    expect(p.manual_critical).toBe(true);
    expect(p.analytes).toEqual([
      { code: 'k', name: 'Potassium (K+)', value: '6.9', unit: 'mmol/L' },
      { code: 'na', name: 'Sodium (Na+)', value: '140', unit: 'mmol/L' },
      { code: 'cr', name: 'Serum Creatinine', value: 'hemolysed', unit: 'mg/dL' },
    ]);
    // ...and the server's validator accepts exactly this shape.
    expect(parseCriticalLabRequest(JSON.parse(JSON.stringify(p))).ok).toBe(true);
  });

  it('free-text result that nobody flagged is not sent; a flagged one is', () => {
    const plain = buildCriticalLabCheckPayload({ labOrderId: ORDER, panel: null, rawValues: { value: 'clear' }, flaggedCritical: false });
    expect(shouldRunServerCriticalCheck(plain)).toBe(false);
    const flagged = buildCriticalLabCheckPayload({ labOrderId: ORDER, panel: null, rawValues: { value: 'positive' }, flaggedCritical: true });
    expect(shouldRunServerCriticalCheck(flagged)).toBe(true);
    expect(parseCriticalLabRequest(JSON.parse(JSON.stringify(flagged))).ok).toBe(true);
  });
});

describe('interpretCriticalLabCheckResponse', () => {
  it('HTTP error is an error outcome with the server message (was swallowed before)', async () => {
    const o = await interpretCriticalLabCheckResponse({ data: null, error: httpError(403, { error: 'Forbidden - hospital scope mismatch' }) });
    expect(o).toEqual({ kind: 'error', message: 'Forbidden - hospital scope mismatch' });
  });

  it('primary dispatched -> primaryNotified true', async () => {
    const o = await interpretCriticalLabCheckResponse({
      data: { success: true, critical: true, alert_id: 'a1', severity: 'critical_high', escalation_scheduled: true, primary_dispatch: { outcome: 'dispatched' } },
      error: null,
    });
    expect(o).toMatchObject({ kind: 'alert_created', primaryNotified: true });
  });

  it('alert queued but primary not delivered -> primaryNotified false', async () => {
    const o = await interpretCriticalLabCheckResponse({
      data: { success: true, critical: true, alert_id: 'a1', severity: 'review_required', escalation_scheduled: true, primary_dispatch: { outcome: 'pending' } },
      error: null,
    });
    expect(o).toMatchObject({ kind: 'alert_created', primaryNotified: false, primaryStatus: 'pending' });
  });

  it('not critical, and malformed success bodies are errors', async () => {
    expect(await interpretCriticalLabCheckResponse({ data: { success: true, critical: false }, error: null })).toEqual({ kind: 'not_critical' });
    expect((await interpretCriticalLabCheckResponse({ data: { success: true, critical: true }, error: null })).kind).toBe('error');
    expect((await interpretCriticalLabCheckResponse({ data: null, error: null })).kind).toBe('error');
  });

  it('runCriticalLabCheck never throws on transport failure', async () => {
    const invoke = vi.fn().mockRejectedValue(new Error('network down'));
    const o = await runCriticalLabCheck(invoke, buildCriticalLabCheckPayload({ labOrderId: ORDER, panel: null, rawValues: {}, flaggedCritical: true }));
    expect(o).toEqual({ kind: 'error', message: 'network down' });
    expect(invoke).toHaveBeenCalledWith('critical-lab-check', expect.objectContaining({ body: expect.objectContaining({ lab_order_id: ORDER }) }));
  });
});

describe('acknowledgeCriticalLabAlert', () => {
  it('acknowledges by lab order id with read-back details', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { success: true, acknowledged: true, cancelled_escalations: 2 }, error: null });
    const o = await acknowledgeCriticalLabAlert(invoke, {
      labOrderId: ORDER,
      readBack: { clinicianName: 'Dr A', clinicianRole: 'Attending', channel: 'Direct Telephone', confirmed: true },
    });
    expect(o).toEqual({ kind: 'acknowledged', alreadyAcknowledged: false, cancelled: 2 });
    const body = invoke.mock.calls[0][1].body;
    expect(body).toMatchObject({ action: 'acknowledge', lab_order_id: ORDER, read_back: { clinician_name: 'Dr A', confirmed: true } });
    expect(parseCriticalLabRequest(JSON.parse(JSON.stringify(body))).ok).toBe(true);
  });

  it('404 no_open_alert is not an error; other failures are', async () => {
    const none = vi.fn().mockResolvedValue({ data: null, error: httpError(404, { error: 'No open critical alert', code: 'no_open_alert' }) });
    expect(await acknowledgeCriticalLabAlert(none, { labOrderId: ORDER })).toEqual({ kind: 'no_open_alert' });
    const boom = vi.fn().mockResolvedValue({ data: null, error: httpError(500, { error: 'Failed to acknowledge critical alert' }) });
    expect(await acknowledgeCriticalLabAlert(boom, { labOrderId: ORDER })).toEqual({ kind: 'error', message: 'Failed to acknowledge critical alert' });
  });
});
