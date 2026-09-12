/**
 * Critical Lab Alert Escalation Queue (`critical-lab-escalation`)
 *
 * Domain Types & Contracts
 *
 * Implements ADR-0005 Invariants:
 * 1. Durable background escalation tracking via lab_alert_escalations queue
 * 2. Multi-tier escalation ladder: primary (0m) -> on-call (5m) -> ER staff (10m)
 * 3. Automatic queue cancellation when primary physician acknowledges or alert resolves
 * 4. Multi-tenant hospital isolation
 */

export type EscalationLevel = 'primary' | 'on_call' | 'er';

export type EscalationStatus = 'pending' | 'dispatched' | 'acknowledged' | 'cancelled' | 'failed';

export type AlertSeverity = 'critical_high' | 'critical_low' | 'warning';

export interface LabCriticalAlert {
  readonly id: string;
  readonly lab_result_id: string;
  readonly hospital_id: string;
  readonly patient_id: string;
  readonly test_name: string;
  readonly test_code: string;
  readonly result_value: number | string;
  readonly unit?: string | null;
  readonly severity: AlertSeverity;
  readonly primary_doctor_id: string;
  readonly primary_notified_at: string | null;
  readonly primary_acknowledged_at: string | null;
  readonly primary_action_taken: boolean;
  readonly primary_action_notes: string | null;
  readonly on_call_id: string | null;
  readonly on_call_notified_at: string | null;
  readonly on_call_acknowledged_at: string | null;
  readonly on_call_action_taken: boolean;
  readonly er_notified_at: string | null;
  readonly er_acknowledged_at: string | null;
  readonly is_resolved: boolean;
  readonly resolved_at: string | null;
  readonly resolved_by: string | null;
  readonly resolution_notes: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface LabAlertEscalationQueueItem {
  readonly id: string;
  readonly alert_id: string;
  readonly hospital_id: string;
  readonly escalation_level: EscalationLevel;
  readonly target_user_id?: string | null;
  readonly scheduled_for: string;
  readonly dispatched_at: string | null;
  readonly status: EscalationStatus;
  readonly error_message?: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface LabEscalationActor {
  readonly id: string;
  readonly hospitalId: string;
  readonly role: string;
}

export interface LabAlertAuditEntry {
  readonly id: string;
  readonly alert_id: string;
  readonly hospital_id: string;
  readonly actor_id: string;
  readonly action: string;
  readonly details?: Readonly<Record<string, unknown>>;
  readonly created_at: string;
}

export interface CreateCriticalAlertParams {
  readonly labResultId: string;
  readonly patientId: string;
  readonly testName: string;
  readonly testCode: string;
  readonly resultValue: number | string;
  readonly unit?: string;
  readonly severity: AlertSeverity;
  readonly primaryDoctorId: string;
  readonly onCallDoctorId?: string;
}

export interface AcknowledgeAlertParams {
  readonly alertId: string;
  readonly notes?: string;
}

export interface ResolveAlertParams {
  readonly alertId: string;
  readonly notes: string;
}

export interface LabEscalationResult {
  readonly success: boolean;
  readonly alert?: LabCriticalAlert;
  readonly escalations?: readonly LabAlertEscalationQueueItem[];
  readonly error?: string;
}
