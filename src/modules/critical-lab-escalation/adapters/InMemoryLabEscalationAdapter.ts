/**
 * Critical Lab Alert Escalation Queue (`critical-lab-escalation`)
 *
 * In-Memory Test Double Adapter
 */

import {
  ILabEscalationAuditLogger,
  ILabEscalationNotifier,
  ILabEscalationRepository,
} from '../ports';
import {
  EscalationLevel,
  LabAlertAuditEntry,
  LabAlertEscalationQueueItem,
  LabCriticalAlert,
} from '../types';

export class InMemoryLabEscalationAdapter
  implements ILabEscalationRepository, ILabEscalationAuditLogger, ILabEscalationNotifier
{
  private readonly alerts = new Map<string, LabCriticalAlert>();
  private readonly escalations = new Map<string, LabAlertEscalationQueueItem>();
  private readonly auditEntries: LabAlertAuditEntry[] = [];
  public readonly dispatchedNotifications: Array<{
    level: EscalationLevel;
    alertId: string;
    targetUserId?: string | null;
  }> = [];

  async getAlertById(alertId: string): Promise<LabCriticalAlert | null> {
    return this.alerts.get(alertId) ?? null;
  }

  async getActiveAlerts(
    hospitalId: string,
    doctorId?: string
  ): Promise<readonly LabCriticalAlert[]> {
    return Array.from(this.alerts.values()).filter((a) => {
      if (a.hospital_id !== hospitalId) return false;
      if (a.is_resolved) return false;
      if (doctorId && a.primary_doctor_id !== doctorId && a.on_call_id !== doctorId) {
        return false;
      }
      return true;
    });
  }

  async saveAlert(alert: LabCriticalAlert): Promise<LabCriticalAlert> {
    const clone = { ...alert };
    this.alerts.set(alert.id, clone);
    return clone;
  }

  async getPendingEscalations(
    hospitalId: string,
    asOfTime?: string
  ): Promise<readonly LabAlertEscalationQueueItem[]> {
    const cutoff = asOfTime ? new Date(asOfTime).getTime() : Date.now();
    return Array.from(this.escalations.values()).filter((item) => {
      if (item.hospital_id !== hospitalId) return false;
      if (item.status !== 'pending') return false;
      return new Date(item.scheduled_for).getTime() <= cutoff;
    });
  }

  async saveEscalationItem(
    item: LabAlertEscalationQueueItem
  ): Promise<LabAlertEscalationQueueItem> {
    const clone = { ...item };
    this.escalations.set(item.id, clone);
    return clone;
  }

  async saveEscalationItems(
    items: readonly LabAlertEscalationQueueItem[]
  ): Promise<readonly LabAlertEscalationQueueItem[]> {
    const saved: LabAlertEscalationQueueItem[] = [];
    for (const item of items) {
      saved.push(await this.saveEscalationItem(item));
    }
    return saved;
  }

  async cancelPendingEscalationsForAlert(alertId: string): Promise<void> {
    for (const [id, item] of this.escalations.entries()) {
      if (item.alert_id === alertId && item.status === 'pending') {
        this.escalations.set(id, {
          ...item,
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        });
      }
    }
  }

  async getAuditHistory(alertId: string): Promise<readonly LabAlertAuditEntry[]> {
    return [...this.auditEntries]
      .filter((e) => e.alert_id === alertId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async logAction(entry: Omit<LabAlertAuditEntry, 'id' | 'created_at'>): Promise<void> {
    const fullEntry: LabAlertAuditEntry = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      created_at: new Date().toISOString(),
    };
    this.auditEntries.push(fullEntry);
  }

  async dispatchNotification(
    level: EscalationLevel,
    alert: LabCriticalAlert,
    targetUserId?: string | null
  ): Promise<void> {
    this.dispatchedNotifications.push({
      level,
      alertId: alert.id,
      targetUserId,
    });
  }

  clear(): void {
    this.alerts.clear();
    this.escalations.clear();
    this.auditEntries.length = 0;
    this.dispatchedNotifications.length = 0;
  }
}
