/**
 * useTelemetry — non-PHI operational telemetry hook.
 *
 * T-90: Critical handoff success/failure rates
 *   - consult_start, lab_order_dispatch, pharmacist_notify, critical_alert_ack
 *
 * T-91: Client-side error telemetry (no PHI in any field)
 *   - downstream_insert_failed, duplicate_consult_guard, payment_post_failed, scheduler_booking_failed
 *
 * Design principles:
 *   - Fire-and-forget: never awaited, never blocks the main flow.
 *   - ZERO PHI: patient IDs, names, MRNs, diagnoses must NOT appear in details.
 *     Use entity_id (UUID, not a clinical identifier) with entity_type label only.
 *   - Uses activity_logs table (hospital-scoped) as the telemetry store.
 *   - Falls back silently if the insert fails (no user-visible errors).
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ─── Event types ─────────────────────────────────────────────────────────────

/** T-90: Critical-handoff instrumentation events */
export type HandoffEvent =
  | 'consult_start_success'
  | 'consult_start_failure'
  | 'lab_order_dispatch_success'
  | 'lab_order_dispatch_failure'
  | 'pharmacist_notify_success'
  | 'pharmacist_notify_failure'
  | 'critical_alert_ack_latency';

/** T-91: Client-side error telemetry events */
export type ErrorTelemetryEvent =
  | 'downstream_insert_failed'
  | 'duplicate_consult_guard_triggered'
  | 'payment_post_failed'
  | 'scheduler_booking_failed';

export type TelemetryEvent = HandoffEvent | ErrorTelemetryEvent;

export interface TelemetryPayload {
  /** Entity type (e.g. 'consultation', 'lab_order', 'prescription') */
  entityType: string;
  /** Entity UUID — NEVER a clinical identifier */
  entityId?: string;
  /** Duration in milliseconds (for latency events) */
  durationMs?: number;
  /** Error code or message (no PHI) */
  errorCode?: string;
  /** Hospital-scoped context metadata (no PHI) */
  meta?: Record<string, string | number | boolean | null>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTelemetry() {
  const { hospital, user } = useAuth();

  /**
   * Emit a telemetry event — fire-and-forget, never throws.
   * All fields are non-PHI operational metrics.
   */
  const emit = useCallback(
    (event: TelemetryEvent, payload: TelemetryPayload): void => {
      void supabase.from('activity_logs').insert({
        user_id: user?.id ?? null,
        hospital_id: hospital?.id ?? null,
        action_type: `telemetry:${event}`,
        entity_type: payload.entityType,
        entity_id: payload.entityId ?? null,
        details: {
          event,
          duration_ms: payload.durationMs ?? null,
          error_code: payload.errorCode ?? null,
          ...payload.meta,
          emitted_at: new Date().toISOString(),
        },
      });
    },
    [hospital?.id, user?.id]
  );

  return { emit };
}
