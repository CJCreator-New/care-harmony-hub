/**
 * Strict Pharmacist-Gated Prescription Dispensing (`prescription-dispensing`)
 *
 * Production Supabase Adapter
 *
 * Interacts with `prescription_approval_workflows` table and the `prescription-approval` Edge Function.
 */

import { supabase } from '@/integrations/supabase/client';
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

export class SupabasePrescriptionAdapter
  implements
    IPrescriptionDispensingRepository,
    IPrescriptionDispensingAuditLogger,
    IPrescriptionDispensingNotifier
{
  async getById(id: string): Promise<PrescriptionWorkflow | null> {
    const { data, error } = await supabase
      .from('prescription_approval_workflows' as any)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return (data as unknown as PrescriptionWorkflow) ?? null;
  }

  async getByPrescriptionId(prescriptionId: string): Promise<PrescriptionWorkflow | null> {
    const { data, error } = await supabase
      .from('prescription_approval_workflows' as any)
      .select('*')
      .eq('prescription_id', prescriptionId)
      .maybeSingle();

    if (error) throw error;
    return (data as unknown as PrescriptionWorkflow) ?? null;
  }

  async getQueue(
    hospitalId: string,
    status?: PrescriptionWorkflowStatus
  ): Promise<readonly PrescriptionWorkflow[]> {
    let query = supabase
      .from('prescription_approval_workflows' as any)
      .select('*')
      .eq('hospital_id', hospitalId)
      .order('updated_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as unknown as PrescriptionWorkflow[];
  }

  async save(workflow: PrescriptionWorkflow): Promise<PrescriptionWorkflow> {
    const { data, error } = await supabase
      .from('prescription_approval_workflows' as any)
      .upsert(workflow)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as PrescriptionWorkflow;
  }

  async getAuditHistory(workflowId: string): Promise<readonly PrescriptionWorkflowAuditEntry[]> {
    const { data, error } = await supabase
      .from('prescription_approval_workflow_audit' as any)
      .select('*')
      .eq('workflow_id', workflowId)
      .order('created_at', { ascending: false });

    if (error) {
      // If separate audit table does not exist, degrade gracefully
      return [];
    }
    return (data || []) as unknown as PrescriptionWorkflowAuditEntry[];
  }

  async logTransition(
    entry: Omit<PrescriptionWorkflowAuditEntry, 'id' | 'created_at'>
  ): Promise<void> {
    try {
      await supabase.from('prescription_approval_workflow_audit' as any).insert([entry]);
    } catch {
      // Fallback: log to general activity log if dedicated table is not deployed
      try {
        await supabase.from('audit_logs' as any).insert([
          {
            action: `prescription_${entry.action}`,
            resource_type: 'prescription_workflow',
            resource_id: entry.workflow_id,
            hospital_id: entry.hospital_id,
            user_id: entry.actor_id,
            details: {
              from_status: entry.from_status,
              to_status: entry.to_status,
              reason: entry.reason,
            },
          },
        ]);
      } catch {
        // Immutability trigger or schema restriction ignored
      }
    }
  }

  async notifyTransition(
    hospitalId: string,
    workflow: PrescriptionWorkflow,
    fromStatus: PrescriptionWorkflowStatus | null,
    toStatus: PrescriptionWorkflowStatus
  ): Promise<void> {
    try {
      const channel = supabase.channel(`workflow:${workflow.id}`);
      await channel.send({
        type: 'broadcast',
        event: 'step_advanced',
        payload: {
          id: workflow.id,
          status: toStatus,
          previous_status: fromStatus,
          step: workflow.current_step,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.warn('[SupabasePrescriptionAdapter] Broadcast notification failed:', err);
    }
  }
}
