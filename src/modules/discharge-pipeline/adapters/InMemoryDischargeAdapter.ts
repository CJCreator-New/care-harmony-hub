/**
 * Sequential Multi-Role Discharge Pipeline (`discharge-pipeline`)
 *
 * In-Memory Adapter Double
 *
 * Provides an isolated, zero-network implementation of repository, audit logger,
 * and notifier ports for deterministic unit testing.
 */

import { IDischargeAuditLogger, IDischargeNotifier, IDischargeRepository } from '../ports';
import { DischargeQueueStep, DischargeWorkflow, DischargeWorkflowAuditEntry } from '../types';

export class InMemoryDischargeAdapter
  implements IDischargeRepository, IDischargeAuditLogger, IDischargeNotifier
{
  private readonly workflows = new Map<string, DischargeWorkflow>();
  private readonly auditEntries: DischargeWorkflowAuditEntry[] = [];
  public readonly notifications: Array<{
    hospitalId: string;
    workflowId: string;
    fromStep: string | null;
    toStep: string;
  }> = [];

  async getById(id: string): Promise<DischargeWorkflow | null> {
    return this.workflows.get(id) ?? null;
  }

  async getAuditHistory(workflowId: string): Promise<readonly DischargeWorkflowAuditEntry[]> {
    return [...this.auditEntries].filter((e) => e.workflow_id === workflowId).reverse();
  }

  async getQueueForStep(
    hospitalId: string,
    step: DischargeQueueStep
  ): Promise<readonly DischargeWorkflow[]> {
    return Array.from(this.workflows.values()).filter(
      (w) => w.hospital_id === hospitalId && w.status === 'in_progress' && w.current_step === step
    );
  }

  async save(workflow: DischargeWorkflow): Promise<DischargeWorkflow> {
    const clone = { ...workflow };
    this.workflows.set(workflow.id, clone);
    return clone;
  }

  async logTransition(
    entry: Omit<DischargeWorkflowAuditEntry, 'id' | 'created_at'>
  ): Promise<void> {
    const fullEntry: DischargeWorkflowAuditEntry = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      created_at: new Date().toISOString(),
    };
    this.auditEntries.push(fullEntry);
  }

  async notifyTransition(
    hospitalId: string,
    workflow: DischargeWorkflow,
    fromStep: string | null,
    toStep: string
  ): Promise<void> {
    this.notifications.push({
      hospitalId,
      workflowId: workflow.id,
      fromStep,
      toStep,
    });
  }

  // Testing helpers
  clear(): void {
    this.workflows.clear();
    this.auditEntries.length = 0;
    this.notifications.length = 0;
  }

  seed(workflow: DischargeWorkflow): void {
    this.workflows.set(workflow.id, { ...workflow });
  }
}
