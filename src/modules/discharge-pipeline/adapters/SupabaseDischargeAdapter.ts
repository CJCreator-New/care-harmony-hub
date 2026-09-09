/**
 * Sequential Multi-Role Discharge Pipeline (`discharge-pipeline`)
 *
 * Production Supabase Adapter
 *
 * Interacts with Supabase tables and the `discharge-workflow` edge function.
 */

import { supabase } from '@/integrations/supabase/client';
import { IDischargeAuditLogger, IDischargeRepository } from '../ports';
import { DischargeQueueStep, DischargeWorkflow, DischargeWorkflowAuditEntry } from '../types';

export class SupabaseDischargeAdapter implements IDischargeRepository, IDischargeAuditLogger {
  async getById(id: string): Promise<DischargeWorkflow | null> {
    const { data, error } = await supabase
      .from('discharge_workflows')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data as DischargeWorkflow;
  }

  async getAuditHistory(workflowId: string): Promise<readonly DischargeWorkflowAuditEntry[]> {
    const { data, error } = await supabase
      .from('discharge_workflow_audit')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as DischargeWorkflowAuditEntry[];
  }

  async getQueueForStep(
    hospitalId: string,
    step: DischargeQueueStep
  ): Promise<readonly DischargeWorkflow[]> {
    const { data, error } = await supabase
      .from('discharge_workflows')
      .select('*')
      .eq('hospital_id', hospitalId)
      .eq('status', 'in_progress')
      .eq('current_step', step)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data || []) as DischargeWorkflow[];
  }

  async save(workflow: DischargeWorkflow): Promise<DischargeWorkflow> {
    const { data, error } = await supabase
      .from('discharge_workflows')
      .upsert(workflow)
      .select()
      .single();

    if (error) throw error;
    return data as DischargeWorkflow;
  }

  async logTransition(
    entry: Omit<DischargeWorkflowAuditEntry, 'id' | 'created_at'>
  ): Promise<void> {
    const { error } = await supabase.from('discharge_workflow_audit').insert([entry]);

    if (error) throw error;
  }
}
