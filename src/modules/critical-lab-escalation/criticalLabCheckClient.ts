/**
 * Critical Lab Alert Escalation Queue (`critical-lab-escalation`)
 *
 * Client contract for the `critical-lab-check` edge function (roadmap S0-08).
 *
 * - buildCriticalLabCheckPayload: per-analyte codes + raw values for one lab order.
 *   The server re-grades every value and fails closed, so raw strings are sent as
 *   typed (an unparseable value becomes a review alert, never "normal").
 * - interpret*Response: turn `supabase.functions.invoke` results (which do NOT throw
 *   on HTTP errors) into explicit outcomes, so the UI never claims success it did
 *   not get.
 */

import type { LabPanelDefinition } from './core/labPanels';

export const CRITICAL_LAB_CHECK_FUNCTION = 'critical-lab-check';

export interface CriticalLabCheckAnalyte {
  readonly code: string;
  readonly name: string;
  readonly value: number | string | null;
  readonly unit?: string;
}

export interface CriticalLabCheckPayload {
  readonly action: 'create_alert';
  readonly lab_order_id: string;
  readonly analytes: readonly CriticalLabCheckAnalyte[];
  readonly manual_critical: boolean;
  readonly notes?: string;
}

export function buildCriticalLabCheckPayload(args: {
  labOrderId: string;
  panel: LabPanelDefinition | null;
  rawValues: Readonly<Record<string, unknown>>;
  /** True when the technologist (or the UI's own grading) flagged a panic value. */
  flaggedCritical: boolean;
  notes?: string;
}): CriticalLabCheckPayload {
  const analytes: CriticalLabCheckAnalyte[] = [];
  if (args.panel) {
    for (const param of args.panel.parameters) {
      const raw = args.rawValues[param.id];
      if (raw === undefined || raw === null) continue;
      const value = typeof raw === 'number' ? raw : String(raw).trim();
      if (value === '') continue;
      analytes.push({ code: param.id, name: param.name, value, unit: param.unit });
    }
  }
  return {
    action: 'create_alert',
    lab_order_id: args.labOrderId,
    analytes,
    manual_critical: args.flaggedCritical,
    notes: args.notes?.slice(0, 2000) || undefined,
  };
}

/** Free-text results that nobody flagged have nothing the server can grade. */
export function shouldRunServerCriticalCheck(payload: CriticalLabCheckPayload): boolean {
  return payload.analytes.length > 0 || payload.manual_critical;
}

export type CriticalLabCheckOutcome =
  | { readonly kind: 'not_critical' }
  | {
      readonly kind: 'alert_created';
      readonly alertId: string;
      readonly severity: string;
      readonly duplicate: boolean;
      /** True only when the server confirmed the primary notification was dispatched. */
      readonly primaryNotified: boolean;
      readonly primaryStatus: string;
    }
  | { readonly kind: 'error'; readonly message: string };

export type AcknowledgeOutcome =
  | { readonly kind: 'acknowledged'; readonly alreadyAcknowledged: boolean; readonly cancelled: number }
  | { readonly kind: 'no_open_alert' }
  | { readonly kind: 'error'; readonly message: string };

interface InvokeResult {
  data: unknown;
  error: unknown;
}

async function errorBody(error: unknown): Promise<Record<string, unknown> | null> {
  const ctx = (error as { context?: unknown } | null)?.context as
    | { json?: () => Promise<unknown>; clone?: () => { json: () => Promise<unknown> } }
    | undefined;
  if (!ctx || typeof ctx.json !== 'function') return null;
  try {
    const body = await (typeof ctx.clone === 'function' ? ctx.clone().json() : ctx.json());
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

async function errorMessage(error: unknown): Promise<string> {
  const body = await errorBody(error);
  const fromBody = body && (body.details || body.error);
  if (typeof fromBody === 'string' && fromBody) return fromBody;
  if (error instanceof Error && error.message) return error.message;
  return 'critical-lab-check request failed';
}

export async function interpretCriticalLabCheckResponse(res: InvokeResult): Promise<CriticalLabCheckOutcome> {
  if (res.error) return { kind: 'error', message: await errorMessage(res.error) };
  const d = (res.data ?? {}) as Record<string, unknown>;
  if (d.success !== true) {
    return { kind: 'error', message: typeof d.error === 'string' ? d.error : 'Unexpected response from critical-lab-check' };
  }
  if (d.critical === false) return { kind: 'not_critical' };
  if (d.critical === true && typeof d.alert_id === 'string' && d.escalation_scheduled === true) {
    const primary = (d.primary_dispatch ?? {}) as Record<string, unknown>;
    const primaryStatus = typeof primary.outcome === 'string' ? primary.outcome : 'unknown';
    return {
      kind: 'alert_created',
      alertId: d.alert_id,
      severity: typeof d.severity === 'string' ? d.severity : 'unknown',
      duplicate: d.duplicate === true,
      primaryNotified: primaryStatus === 'dispatched',
      primaryStatus,
    };
  }
  return { kind: 'error', message: 'Unexpected response from critical-lab-check' };
}

export async function interpretAcknowledgeResponse(res: InvokeResult): Promise<AcknowledgeOutcome> {
  if (res.error) {
    const body = await errorBody(res.error);
    if (body?.code === 'no_open_alert') return { kind: 'no_open_alert' };
    return { kind: 'error', message: await errorMessage(res.error) };
  }
  const d = (res.data ?? {}) as Record<string, unknown>;
  if (d.success === true && d.acknowledged === true) {
    return {
      kind: 'acknowledged',
      alreadyAcknowledged: d.already_acknowledged === true,
      cancelled: typeof d.cancelled_escalations === 'number' ? d.cancelled_escalations : 0,
    };
  }
  return { kind: 'error', message: typeof d.error === 'string' ? d.error : 'Unexpected response from critical-lab-check' };
}

type Invoke = (name: string, options: { body: unknown }) => Promise<InvokeResult>;

/** Invokes the function and never throws: transport failures become `{ kind: 'error' }`. */
export async function runCriticalLabCheck(invoke: Invoke, payload: CriticalLabCheckPayload): Promise<CriticalLabCheckOutcome> {
  try {
    return await interpretCriticalLabCheckResponse(await invoke(CRITICAL_LAB_CHECK_FUNCTION, { body: payload }));
  } catch (err) {
    return { kind: 'error', message: err instanceof Error ? err.message : String(err) };
  }
}

export async function acknowledgeCriticalLabAlert(
  invoke: Invoke,
  args: {
    labOrderId: string;
    alertId?: string;
    notes?: string;
    readBack?: { clinicianName: string; clinicianRole: string; channel: string; confirmed: boolean };
  },
): Promise<AcknowledgeOutcome> {
  const body = {
    action: 'acknowledge' as const,
    lab_order_id: args.labOrderId,
    alert_id: args.alertId,
    notes: args.notes,
    read_back: args.readBack
      ? {
          clinician_name: args.readBack.clinicianName,
          clinician_role: args.readBack.clinicianRole,
          channel: args.readBack.channel,
          confirmed: args.readBack.confirmed,
        }
      : undefined,
  };
  try {
    return await interpretAcknowledgeResponse(await invoke(CRITICAL_LAB_CHECK_FUNCTION, { body }));
  } catch (err) {
    return { kind: 'error', message: err instanceof Error ? err.message : String(err) };
  }
}
