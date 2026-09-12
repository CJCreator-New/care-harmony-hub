/**
 * Critical Lab Alert Escalation Queue (`critical-lab-escalation`)
 *
 * Headless Core Engine: `CriticalLabEscalationEngine`
 *
 * Implements ADR-0005 Invariants:
 * 1. Durable background escalation tracking via lab_alert_escalations queue
 * 2. Escalation ladder: Primary doctor (0m) -> On-call (5m) -> Emergency Dept (10m)
 * 3. Non-negotiable auto-cancellation: Acknowledging by primary doctor cancels pending ladder items
 * 4. Multi-tenant hospital isolation
 */

import {
  AcknowledgeAlertParams,
  CreateCriticalAlertParams,
  LabAlertAuditEntry,
  LabAlertEscalationQueueItem,
  LabCriticalAlert,
  LabEscalationActor,
  LabEscalationResult,
  ResolveAlertParams,
} from './types';
import {
  ILabEscalationAuditLogger,
  ILabEscalationNotifier,
  ILabEscalationRepository,
} from './ports';
import {
  buildEscalationLadder,
  validateAcknowledgment,
  validateResolution,
} from './core/escalationLadder';
import { SupabaseLabEscalationAdapter } from './adapters/SupabaseLabEscalationAdapter';

export interface CriticalLabEscalationDependencies {
  readonly repo: ILabEscalationRepository;
  readonly auditLogger: ILabEscalationAuditLogger;
  readonly notifier?: ILabEscalationNotifier;
}

export class CriticalLabEscalationEngine {
  constructor(private readonly deps: CriticalLabEscalationDependencies) {}

  /**
   * Records a critical lab result and initializes the durable escalation ladder.
   */
  async recordCriticalAlert(
    actor: LabEscalationActor,
    params: CreateCriticalAlertParams
  ): Promise<LabEscalationResult> {
    const now = new Date().toISOString();
    const alertId = `cla_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const alert: LabCriticalAlert = {
      id: alertId,
      lab_result_id: params.labResultId,
      hospital_id: actor.hospitalId,
      patient_id: params.patientId,
      test_name: params.testName,
      test_code: params.testCode,
      result_value: params.resultValue,
      unit: params.unit ?? null,
      severity: params.severity,
      primary_doctor_id: params.primaryDoctorId,
      primary_notified_at: now,
      primary_acknowledged_at: null,
      primary_action_taken: false,
      primary_action_notes: null,
      on_call_id: params.onCallDoctorId ?? null,
      on_call_notified_at: null,
      on_call_acknowledged_at: null,
      on_call_action_taken: false,
      er_notified_at: null,
      er_acknowledged_at: null,
      is_resolved: false,
      resolved_at: null,
      resolved_by: null,
      resolution_notes: null,
      created_at: now,
      updated_at: now,
    };

    const savedAlert = await this.deps.repo.saveAlert(alert);

    // Build the 3-stage durable escalation ladder (0m Primary -> 5m On-Call -> 10m ER)
    const ladder = buildEscalationLadder(savedAlert, {
      baseTime: new Date(now),
      onCallDoctorId: params.onCallDoctorId,
    });

    const savedEscalations = await this.deps.repo.saveEscalationItems(ladder);

    // Immediate Level 1 notification dispatch
    if (this.deps.notifier) {
      await this.deps.notifier.dispatchNotification(
        'primary',
        savedAlert,
        savedAlert.primary_doctor_id
      );
    }

    await this.deps.auditLogger.logAction({
      alert_id: savedAlert.id,
      hospital_id: savedAlert.hospital_id,
      actor_id: actor.id,
      action: 'critical_alert_created',
      details: {
        test_name: savedAlert.test_name,
        result_value: savedAlert.result_value,
        severity: savedAlert.severity,
        escalation_ladder_items: savedEscalations.length,
      },
    });

    return {
      success: true,
      alert: savedAlert,
      escalations: savedEscalations,
    };
  }

  /**
   * Primary physician acknowledges critical value.
   * ADR-0005 Invariant: Automatically cancels all pending ladder items.
   */
  async acknowledgeAlert(
    actor: LabEscalationActor,
    params: AcknowledgeAlertParams
  ): Promise<LabEscalationResult> {
    const alert = await this.deps.repo.getAlertById(params.alertId);
    if (!alert) {
      return {
        success: false,
        error: `Critical lab alert not found: ${params.alertId}`,
      };
    }

    const validation = validateAcknowledgment(alert, actor);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error ?? 'Acknowledgment validation failed',
      };
    }

    const now = new Date().toISOString();
    const updatedAlert: LabCriticalAlert = {
      ...alert,
      primary_acknowledged_at: now,
      primary_action_taken: true,
      primary_action_notes: params.notes ?? alert.primary_action_notes,
      updated_at: now,
    };

    const savedAlert = await this.deps.repo.saveAlert(updatedAlert);

    // Non-negotiable ADR-0005 Invariant: Cancel pending escalation ladder items
    await this.deps.repo.cancelPendingEscalationsForAlert(savedAlert.id);

    await this.deps.auditLogger.logAction({
      alert_id: savedAlert.id,
      hospital_id: savedAlert.hospital_id,
      actor_id: actor.id,
      action: 'critical_alert_acknowledged',
      details: {
        notes: params.notes,
        canceled_pending_escalations: true,
      },
    });

    return {
      success: true,
      alert: savedAlert,
    };
  }

  /**
   * Background runner: Processes due escalations in the durable queue.
   */
  async processDueEscalations(
    hospitalId: string,
    asOfTime?: string
  ): Promise<{ dispatchedCount: number; cancelledCount: number }> {
    const dueItems = await this.deps.repo.getPendingEscalations(hospitalId, asOfTime);
    let dispatchedCount = 0;
    let cancelledCount = 0;

    const now = new Date().toISOString();

    for (const item of dueItems) {
      const alert = await this.deps.repo.getAlertById(item.alert_id);
      if (!alert) continue;

      // If already acknowledged or resolved, cancel and skip
      if (alert.primary_acknowledged_at || alert.is_resolved) {
        await this.deps.repo.saveEscalationItem({
          ...item,
          status: 'cancelled',
          updated_at: now,
        });
        cancelledCount++;
        continue;
      }

      // Dispatch escalation
      if (this.deps.notifier) {
        await this.deps.notifier.dispatchNotification(
          item.escalation_level,
          alert,
          item.target_user_id
        );
      }

      // Update escalation item status
      await this.deps.repo.saveEscalationItem({
        ...item,
        status: 'dispatched',
        dispatched_at: now,
        updated_at: now,
      });

      // Update alert notified timestamp
      let alertUpdate: LabCriticalAlert = alert;
      if (item.escalation_level === 'on_call') {
        alertUpdate = { ...alert, on_call_notified_at: now, updated_at: now };
      } else if (item.escalation_level === 'er') {
        alertUpdate = { ...alert, er_notified_at: now, updated_at: now };
      }

      if (alertUpdate !== alert) {
        await this.deps.repo.saveAlert(alertUpdate);
      }

      dispatchedCount++;
    }

    return { dispatchedCount, cancelledCount };
  }

  /**
   * Resolves a critical lab alert after clinical intervention.
   */
  async resolveAlert(
    actor: LabEscalationActor,
    params: ResolveAlertParams
  ): Promise<LabEscalationResult> {
    const alert = await this.deps.repo.getAlertById(params.alertId);
    if (!alert) {
      return {
        success: false,
        error: `Critical lab alert not found: ${params.alertId}`,
      };
    }

    const validation = validateResolution(alert, actor, params.notes);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error ?? 'Resolution validation failed',
      };
    }

    const now = new Date().toISOString();
    const updatedAlert: LabCriticalAlert = {
      ...alert,
      is_resolved: true,
      resolved_at: now,
      resolved_by: actor.id,
      resolution_notes: params.notes.trim(),
      updated_at: now,
    };

    const savedAlert = await this.deps.repo.saveAlert(updatedAlert);

    // Cancel all pending escalations
    await this.deps.repo.cancelPendingEscalationsForAlert(savedAlert.id);

    await this.deps.auditLogger.logAction({
      alert_id: savedAlert.id,
      hospital_id: savedAlert.hospital_id,
      actor_id: actor.id,
      action: 'critical_alert_resolved',
      details: {
        notes: params.notes,
      },
    });

    return {
      success: true,
      alert: savedAlert,
    };
  }

  async getAlert(alertId: string): Promise<LabCriticalAlert | null> {
    return this.deps.repo.getAlertById(alertId);
  }

  async getActiveAlerts(
    hospitalId: string,
    doctorId?: string
  ): Promise<readonly LabCriticalAlert[]> {
    return this.deps.repo.getActiveAlerts(hospitalId, doctorId);
  }

  async getAuditTrail(alertId: string): Promise<readonly LabAlertAuditEntry[]> {
    return this.deps.repo.getAuditHistory(alertId);
  }
}

export function createCriticalLabEscalationEngine(
  dependencies?: Partial<CriticalLabEscalationDependencies>
): CriticalLabEscalationEngine {
  const defaultAdapter = new SupabaseLabEscalationAdapter();
  return new CriticalLabEscalationEngine({
    repo: dependencies?.repo ?? defaultAdapter,
    auditLogger: dependencies?.auditLogger ?? defaultAdapter,
    notifier: dependencies?.notifier ?? defaultAdapter,
  });
}
