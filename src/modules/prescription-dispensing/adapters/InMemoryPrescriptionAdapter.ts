/**
 * Strict Pharmacist-Gated Prescription Dispensing (`prescription-dispensing`)
 *
 * In-Memory Test Double Adapter
 *
 * Zero-network implementation of repository, audit logger, and notifier ports
 * enabling fast, isolated unit and integration testing.
 */

import {
  IPrescriptionDispensingAuditLogger,
  IPrescriptionDispensingNotifier,
  IPrescriptionDispensingRepository,
} from '../ports';
import {
  PrescriptionWorkflow,
  PrescriptionWorkflowAuditEntry,
  PrescriptionWorkflowStatus,
} from '../types';

export class InMemoryPrescriptionAdapter
  implements
    IPrescriptionDispensingRepository,
    IPrescriptionDispensingAuditLogger,
    IPrescriptionDispensingNotifier
{
  private readonly workflows = new Map<string, PrescriptionWorkflow>();
  private readonly auditEntries: PrescriptionWorkflowAuditEntry[] = [];
  public readonly notifications: Array<{
    hospitalId: string;
    workflowId: string;
    fromStatus: PrescriptionWorkflowStatus | null;
    toStatus: PrescriptionWorkflowStatus;
  }> = [];

  async getById(id: string): Promise<PrescriptionWorkflow | null> {
    return this.workflows.get(id) ?? null;
  }

  async getByPrescriptionId(prescriptionId: string): Promise<PrescriptionWorkflow | null> {
    for (const w of this.workflows.values()) {
      if (w.prescription_id === prescriptionId) {
        return w;
      }
    }
    return null;
  }

  async getQueue(
    hospitalId: string,
    status?: PrescriptionWorkflowStatus
  ): Promise<readonly PrescriptionWorkflow[]> {
    return Array.from(this.workflows.values()).filter((w) => {
      if (w.hospital_id !== hospitalId) return false;
      if (status && w.status !== status) return false;
      return true;
    });
  }

  async save(workflow: PrescriptionWorkflow): Promise<PrescriptionWorkflow> {
    const clone = { ...workflow };
    this.workflows.set(workflow.id, clone);
    return clone;
  }

  async getAuditHistory(workflowId: string): Promise<readonly PrescriptionWorkflowAuditEntry[]> {
    return [...this.auditEntries]
      .filter((e) => e.workflow_id === workflowId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async logTransition(
    entry: Omit<PrescriptionWorkflowAuditEntry, 'id' | 'created_at'>
  ): Promise<void> {
    const fullEntry: PrescriptionWorkflowAuditEntry = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      created_at: new Date().toISOString(),
    };
    this.auditEntries.push(fullEntry);
  }

  async notifyTransition(
    hospitalId: string,
    workflow: PrescriptionWorkflow,
    fromStatus: PrescriptionWorkflowStatus | null,
    toStatus: PrescriptionWorkflowStatus
  ): Promise<void> {
    this.notifications.push({
      hospitalId,
      workflowId: workflow.id,
      fromStatus,
      toStatus,
    });
  }

  clear(): void {
    this.workflows.clear();
    this.auditEntries.length = 0;
    this.notifications.length = 0;
  }
}
