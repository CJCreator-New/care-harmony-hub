/**
 * Critical Lab Alert Escalation Queue (`critical-lab-escalation`)
 *
 * Boundary Ports (Inversion of Control)
 */

import {
  EscalationLevel,
  LabAlertAuditEntry,
  LabAlertEscalationQueueItem,
  LabCriticalAlert,
} from './types';

export interface ILabEscalationRepository {
  /** Fetch a critical alert by UUID */
  getAlertById(alertId: string): Promise<LabCriticalAlert | null>;

  /** Fetch active (unresolved) alerts for a hospital and optional doctor */
  getActiveAlerts(hospitalId: string, doctorId?: string): Promise<readonly LabCriticalAlert[]>;

  /** Persist a new or modified critical alert */
  saveAlert(alert: LabCriticalAlert): Promise<LabCriticalAlert>;

  /** Fetch pending escalation queue items due for dispatch */
  getPendingEscalations(
    hospitalId: string,
    asOfTime?: string
  ): Promise<readonly LabAlertEscalationQueueItem[]>;

  /** Save an individual escalation queue item */
  saveEscalationItem(item: LabAlertEscalationQueueItem): Promise<LabAlertEscalationQueueItem>;

  /** Save a batch of escalation queue items atomically */
  saveEscalationItems(
    items: readonly LabAlertEscalationQueueItem[]
  ): Promise<readonly LabAlertEscalationQueueItem[]>;

  /** Cancel all pending escalation items for an alert upon acknowledgment */
  cancelPendingEscalationsForAlert(alertId: string): Promise<void>;

  /** Fetch audit trail history for an alert */
  getAuditHistory(alertId: string): Promise<readonly LabAlertAuditEntry[]>;
}

export interface ILabEscalationAuditLogger {
  /** Record an immutable audit log entry */
  logAction(entry: Omit<LabAlertAuditEntry, 'id' | 'created_at'>): Promise<void>;
}

export interface ILabEscalationNotifier {
  /** Dispatch notifications to primary doctor, on-call physician, or ER staff */
  dispatchNotification(
    level: EscalationLevel,
    alert: LabCriticalAlert,
    targetUserId?: string | null
  ): Promise<void>;
}
