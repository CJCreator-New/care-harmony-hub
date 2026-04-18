/**
 * Tier 4.1: Discharge Workflow React Hook
 * Purpose: Manage discharge workflow state and multi-step transitions
 * 
 * Handles:
 * - Fetching existing discharge workflow
 * - Creating new discharge workflow
 * - Advancing workflow through steps
 * - Real-time updates via Supabase Realtime
 * - Activity logging
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityLog } from '@/hooks/useActivityLog';
import { toast } from 'sonner';

export interface DischargeWorkflow {
  id: string;
  hospital_id: string;
  admission_id: string;
  patient_id: string;
  initiated_by: string;
  status:
    | 'pending_review'
    | 'clinical_cleared'
    | 'nurse_confirmed'
    | 'med_reconciled'
    | 'financial_cleared'
    | 'discharged'
    | 'finalized'
    | 'cancelled';
  current_step: number;
  cancellation_reason?: string;
  clinical_notes?: Record<string, any>;
  medication_reconciliation?: Record<string, any>;
  financial_details?: Record<string, any>;
  checkout_details?: Record<string, any>;
  doctor_clearance_by?: string;
  doctor_clearance_at?: string;
  nurse_confirmed_by?: string;
  nurse_confirmed_at?: string;
  pharmacist_reconciliation_by?: string;
  pharmacist_reconciliation_at?: string;
  billing_clearance_by?: string;
  billing_clearance_at?: string;
  receptionist_checkout_by?: string;
  receptionist_checkout_at?: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

/**
 * Hook for managing discharge workflow lifecycle
 */
export function useDischargeWorkflow(admissionId: string) {
  const { user } = useAuth();
  const { logActivity } = useActivityLog();

  const [workflow, setWorkflow] = useState<DischargeWorkflow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch existing discharge workflow for admission
   */
  const fetchWorkflow = useCallback(async () => {
    if (!admissionId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('discharge_workflows')
        .select('*')
        .eq('admission_id', admissionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError) {
        if (fetchError.code !== 'PGRST116') {
          throw fetchError;
        }
        setWorkflow(null);
      } else {
        setWorkflow(data as DischargeWorkflow);
      }
    } catch (err) {
      const error = err as Error;
      setError(error);
      toast.error(`Failed to load discharge workflow: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [admissionId]);

  /**
   * Subscribe to real-time workflow updates
   */
  useEffect(() => {
    if (!workflow?.id) return;

    const channel = supabase
      .channel(`discharge:${workflow.id}`)
      .on('broadcast', { event: 'step_advanced' }, ({ payload }) => {
        setWorkflow((prev) =>
          prev
            ? {
                ...prev,
                status: payload.status,
                current_step: payload.step,
                updated_at: payload.timestamp,
              }
            : null
        );
        toast.info(payload.message);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workflow?.id]);

  /**
   * Advance workflow to next step via Edge Function
   */
  const advanceWorkflow = useCallback(
    async (
      action: string,
      notes?: string,
      details?: Record<string, any>
    ): Promise<DischargeWorkflow | null> => {
      if (!workflow) {
        toast.error('Workflow not loaded');
        return null;
      }

      if (!user?.id) {
        toast.error('User not authenticated');
        return null;
      }

      try {
        setIsTransitioning(true);
        setError(null);

        const { data, error: transitionError } = await supabase.functions.invoke(
          'discharge-workflow',
          {
            body: {
              workflowId: workflow.id,
              action,
              actorId: user.id,
              notes,
              details,
            },
          }
        );

        if (transitionError) throw transitionError;
        if (!data?.workflow) throw new Error('No workflow returned');

        const updatedWorkflow = data.workflow as DischargeWorkflow;
        setWorkflow(updatedWorkflow);

        await logActivity({
          actionType: `discharge_${action}`,
          entityType: 'discharge_workflow',
          entityId: workflow.id,
          details: {
            action,
            notes,
            admission_id: workflow.admission_id,
            step: updatedWorkflow.current_step,
            status: updatedWorkflow.status,
          },
        });

        toast.success(`Discharge: ${action} completed`);
        return updatedWorkflow;
      } catch (err) {
        const error = err as Error;
        setError(error);
        toast.error(`Workflow action failed: ${error.message}`);
        return null;
      } finally {
        setIsTransitioning(false);
      }
    },
    [workflow, user?.id, logActivity]
  );

  /**
   * Create new discharge workflow
   */
  const initiateDischarge = useCallback(
    async (patientId: string): Promise<DischargeWorkflow | null> => {
      if (!user?.id || !user?.hospital_id) {
        toast.error('User context missing');
        return null;
      }

      try {
        setIsTransitioning(true);
        setError(null);

        const { data, error: createError } = await supabase
          .from('discharge_workflows')
          .insert([
            {
              admission_id: admissionId,
              patient_id: patientId,
              initiated_by: user.id,
              hospital_id: user.hospital_id,
              status: 'pending_review',
              current_step: 1,
            },
          ])
          .select()
          .single();

        if (createError) throw createError;
        if (!data) throw new Error('No workflow created');

        const newWorkflow = data as DischargeWorkflow;
        setWorkflow(newWorkflow);

        await logActivity({
          actionType: 'discharge_initiated',
          entityType: 'discharge_workflow',
          entityId: newWorkflow.id,
          details: {
            admission_id: admissionId,
            patient_id: patientId,
          },
        });

        toast.success('Discharge workflow initiated');
        return newWorkflow;
      } catch (err) {
        const error = err as Error;
        setError(error);
        toast.error(`Failed to initiate discharge: ${error.message}`);
        return null;
      } finally {
        setIsTransitioning(false);
      }
    },
    [admissionId, user?.id, user?.hospital_id, logActivity]
  );

  /**
   * Cancel discharge workflow
   */
  const cancelDischarge = useCallback(
    async (reason: string): Promise<DischargeWorkflow | null> => {
      if (!workflow) {
        toast.error('No active workflow to cancel');
        return null;
      }

      return advanceWorkflow('cancel', reason);
    },
    [workflow, advanceWorkflow]
  );

  /**
   * Check if current user can perform an action
   */
  const canPerformAction = useCallback(
    (action: string, userRole?: string): boolean => {
      const rolePermissions: Record<string, string[]> = {
        clinical_clear: ['doctor', 'admin'],
        nurse_confirm: ['nurse', 'admin'],
        med_reconcile: ['pharmacist', 'admin'],
        financial_clear: ['billing', 'admin'],
        checkout: ['receptionist', 'admin'],
        finalize: ['receptionist', 'admin'],
        cancel: ['doctor', 'nurse', 'admin'],
      };

      if (!userRole) return false;
      return rolePermissions[action]?.includes(userRole) || false;
    },
    []
  );

  /**
   * Get next allowed actions for current status
   */
  const getNextActions = useCallback((): string[] => {
    if (!workflow) return [];

    const transitions: Record<string, string[]> = {
      pending_review: ['clinical_clear', 'cancel'],
      clinical_cleared: ['nurse_confirm', 'cancel'],
      nurse_confirmed: ['med_reconcile', 'cancel'],
      med_reconciled: ['financial_clear', 'cancel'],
      financial_cleared: ['checkout', 'cancel'],
      discharged: ['finalize', 'cancel'],
      finalized: [],
      cancelled: [],
    };

    return transitions[workflow.status] || [];
  }, [workflow]);

  useEffect(() => {
    fetchWorkflow();
  }, [fetchWorkflow]);

  return {
    workflow,
    isLoading,
    isTransitioning,
    error,
    fetchWorkflow,
    advanceWorkflow,
    initiateDischarge,
    cancelDischarge,
    canPerformAction,
    getNextActions,
  };
}
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { hasAnyAllowedRole } from '@/lib/permissions';

export type DischargeWorkflowStep =
  | 'doctor'
  | 'pharmacist'
  | 'billing'
  | 'nurse'
  | 'completed'
  | 'cancelled';

export type DischargeWorkflowStatus =
  | 'draft'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type DischargeWorkflowQueueStep = Extract<
  DischargeWorkflowStep,
  'doctor' | 'pharmacist' | 'billing' | 'nurse'
>;

export interface DischargeWorkflow {
  id: string;
  hospital_id: string;
  patient_id: string;
  consultation_id: string | null;
  initiated_by: string;
  current_step: DischargeWorkflowStep;
  status: DischargeWorkflowStatus;
  last_action_by: string | null;
  last_action_at: string | null;
  rejection_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DischargeWorkflowAuditEntry {
  id: string;
  workflow_id: string;
  hospital_id: string;
  patient_id: string;
  actor_id: string;
  actor_role: string;
  transition_action: 'initiate' | 'approve' | 'reject' | 'cancel';
  from_step: string | null;
  to_step: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

type WorkflowAction = 'initiate' | 'approve' | 'reject' | 'cancel';

type WorkflowActionPayload = {
  workflowId?: string;
  patientId?: string;
  consultationId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
};

const getRoleStep = (role: string | null): DischargeWorkflowQueueStep | null => {
  if (role === 'doctor') return 'doctor';
  if (role === 'pharmacist') return 'pharmacist';
  if (role === 'nurse') return 'nurse';
  if (role === 'receptionist' || role === 'admin') return 'billing';
  return null;
};

export function useDischargeWorkflow(
  workflowId?: string,
  queueStepOverride?: DischargeWorkflowQueueStep,
) {
  const { hospital, user, primaryRole } = useAuth();
  const queryClient = useQueryClient();
  const currentRoleStep = queueStepOverride ?? getRoleStep(primaryRole);

  const workflowQuery = useQuery({
    queryKey: ['discharge-workflow', workflowId],
    queryFn: async () => {
      if (!workflowId) return null;

      const { data, error } = await supabase
        .from('discharge_workflows')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (error) throw error;
      return data as DischargeWorkflow;
    },
    enabled: !!workflowId,
  });

  const auditQuery = useQuery({
    queryKey: ['discharge-workflow-audit', workflowId],
    queryFn: async () => {
      if (!workflowId) return [];

      const { data, error } = await supabase
        .from('discharge_workflow_audit')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as DischargeWorkflowAuditEntry[];
    },
    enabled: !!workflowId,
  });

  const myQueueQuery = useQuery({
    queryKey: ['discharge-workflow-queue', hospital?.id, currentRoleStep],
    queryFn: async () => {
      if (!hospital?.id || !currentRoleStep) return [];

      const { data, error } = await supabase
        .from('discharge_workflows')
        .select('*')
        .eq('hospital_id', hospital.id)
        .eq('status', 'in_progress')
        .eq('current_step', currentRoleStep)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data || []) as DischargeWorkflow[];
    },
    enabled: !!hospital?.id && !!currentRoleStep,
  });

  const actionMutation = useMutation({
    mutationFn: async ({
      action,
      payload,
    }: {
      action: WorkflowAction;
      payload: WorkflowActionPayload;
    }) => {
      const allowedRoles = ['doctor', 'pharmacist', 'receptionist', 'admin', 'nurse'] as const;
      if (!hasAnyAllowedRole(primaryRole ? [primaryRole] : [], [...allowedRoles])) {
        throw new Error('You do not have permission to act on discharge workflows');
      }

      const { data, error } = await supabase.functions.invoke('discharge-workflow', {
        body: {
          action,
          workflowId: payload.workflowId,
          patientId: payload.patientId,
          consultationId: payload.consultationId,
          reason: payload.reason,
          metadata: payload.metadata,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['discharge-workflow'] });
      void queryClient.invalidateQueries({ queryKey: ['discharge-workflow-audit'] });
      void queryClient.invalidateQueries({ queryKey: ['discharge-workflow-queue'] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Discharge workflow action failed';
      toast.error(message);
    },
  });

  useEffect(() => {
    if (!hospital?.id) return;

    const workflowChannel = supabase
      .channel(`discharge-workflows:${hospital.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'discharge_workflows',
          filter: `hospital_id=eq.${hospital.id}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['discharge-workflow'] });
          void queryClient.invalidateQueries({ queryKey: ['discharge-workflow-queue'] });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'discharge_workflow_audit',
          filter: `hospital_id=eq.${hospital.id}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['discharge-workflow-audit'] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(workflowChannel);
    };
  }, [hospital?.id, queryClient]);

  return {
    workflow: workflowQuery.data ?? null,
    workflowAudit: auditQuery.data ?? [],
    myQueue: myQueueQuery.data ?? [],
    isLoadingWorkflow: workflowQuery.isLoading,
    isLoadingAudit: auditQuery.isLoading,
    isLoadingQueue: myQueueQuery.isLoading,
    initiateDischarge: (payload: Required<Pick<WorkflowActionPayload, 'patientId'>> & WorkflowActionPayload) =>
      actionMutation.mutateAsync({ action: 'initiate', payload }),
    approveStep: (payload: Required<Pick<WorkflowActionPayload, 'workflowId'>> & WorkflowActionPayload) =>
      actionMutation.mutateAsync({ action: 'approve', payload }),
    rejectStep: (
      payload: Required<Pick<WorkflowActionPayload, 'workflowId' | 'reason'>> & WorkflowActionPayload,
    ) => actionMutation.mutateAsync({ action: 'reject', payload }),
    cancelWorkflow: (payload: Required<Pick<WorkflowActionPayload, 'workflowId'>>) =>
      actionMutation.mutateAsync({ action: 'cancel', payload }),
    isMutating: actionMutation.isPending,
    currentRoleStep,
    canAct: !!user?.id && !!currentRoleStep,
  };
}
