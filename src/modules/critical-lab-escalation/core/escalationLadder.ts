/**
 * Critical Lab Alert Escalation Queue (`critical-lab-escalation`)
 *
 * Core Escalation Ladder & Safety Invariants
 *
 * Implements ADR-0005:
 * 1. Ladder delays: Primary (0m), On-Call (5m), Emergency Dept (10m)
 * 2. Automatic cancellation: Acknowledging by primary doctor or resolution cancels pending escalations
 * 3. Hospital tenant isolation
 */

import {
  EscalationLevel,
  LabAlertEscalationQueueItem,
  LabCriticalAlert,
  LabEscalationActor,
} from '../types';

export const ESCALATION_INTERVALS_MS = {
  primary: 0,
  on_call: 5 * 60 * 1000, // 5 minutes per ADR-0005
  er: 10 * 60 * 1000, // 10 minutes per ADR-0005
} as const;

export function buildEscalationLadder(
  alert: LabCriticalAlert,
  options?: {
    baseTime?: Date;
    onCallDoctorId?: string;
  }
): readonly LabAlertEscalationQueueItem[] {
  const baseTime = options?.baseTime ?? new Date();
  const baseTimeMs = baseTime.getTime();

  const levels: EscalationLevel[] = ['primary', 'on_call', 'er'];

  return levels.map((level) => {
    const scheduledMs = baseTimeMs + ESCALATION_INTERVALS_MS[level];
    const targetUserId =
      level === 'primary'
        ? alert.primary_doctor_id
        : level === 'on_call'
          ? options?.onCallDoctorId || alert.on_call_id || null
          : null; // ER level targets departmental pool

    return {
      id: `esc_${Date.now()}_${level}_${Math.random().toString(36).slice(2, 7)}`,
      alert_id: alert.id,
      hospital_id: alert.hospital_id,
      escalation_level: level,
      target_user_id: targetUserId,
      scheduled_for: new Date(scheduledMs).toISOString(),
      dispatched_at: null,
      status: 'pending',
      error_message: null,
      created_at: baseTime.toISOString(),
      updated_at: baseTime.toISOString(),
    };
  });
}

export function validateAcknowledgment(
  alert: LabCriticalAlert,
  actor: LabEscalationActor
): { valid: boolean; error?: string } {
  if (alert.hospital_id !== actor.hospitalId) {
    return {
      valid: false,
      error: `Hospital tenant mismatch: Actor hospital (${actor.hospitalId}) does not match alert (${alert.hospital_id})`,
    };
  }

  if (alert.is_resolved) {
    return {
      valid: false,
      error: 'Cannot acknowledge a critical alert that has already been resolved',
    };
  }

  return { valid: true };
}

export function validateResolution(
  alert: LabCriticalAlert,
  actor: LabEscalationActor,
  notes: string
): { valid: boolean; error?: string } {
  if (alert.hospital_id !== actor.hospitalId) {
    return {
      valid: false,
      error: `Hospital tenant mismatch: Actor hospital (${actor.hospitalId}) does not match alert (${alert.hospital_id})`,
    };
  }

  if (!notes || notes.trim().length < 5) {
    return {
      valid: false,
      error:
        'Substantive resolution notes (at least 5 characters) are required to resolve a critical lab alert',
    };
  }

  return { valid: true };
}
