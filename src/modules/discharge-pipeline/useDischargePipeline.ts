/**
 * Sequential Multi-Role Discharge Pipeline (`discharge-pipeline`)
 *
 * Presentation Adapter Hook: `useDischargePipeline`
 *
 * Ergonomic reactive seam connecting React UI queues to the discharge pipeline.
 */

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { hasAnyAllowedRole } from '@/lib/permissions';
import {
  DischargeQueueStep,
  DischargeRejectionType,
  DischargeWorkflow,
  DischargeWorkflowAuditEntry,
  DischargeWorkflowStep,
} from './types';
import { getRoleStep, STEP_ROLE_MAP } from './core/stateMachine';

export type WorkflowAction = 'initiate' | 'approve' | 'reject' | 'cancel' | 'discharge_ama';

export type WorkflowActionPayload = {
  workflowId?: string;
  patientId?: string;
  consultationId?: string;
  reason?: string;
  rejectionType?: DischargeRejectionType;
  metadata?: Record<string, unknown>;
};

export interface UseDischargePipelineOptions {
  workflowId?: string;
  queueStepOverride?: DischargeQueueStep;
}

export function useDischargePipeline(workflowId?: string, queueStepOverride?: DischargeQueueStep) {
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

      const requestMetadata =
        payload.metadata || payload.rejectionType
          ? {
              ...(payload.metadata ?? {}),
              ...(payload.rejectionType ? { rejectionType: payload.rejectionType } : {}),
            }
          : undefined;

      const { data, error } = await supabase.functions.invoke('discharge-workflow', {
        body: {
          action,
          workflowId: payload.workflowId,
          patientId: payload.patientId,
          consultationId: payload.consultationId,
          reason: payload.reason,
          metadata: requestMetadata,
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
        }
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
        }
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
    initiateDischarge: (
      payload: Required<Pick<WorkflowActionPayload, 'patientId'>> & WorkflowActionPayload
    ) => actionMutation.mutateAsync({ action: 'initiate', payload }),
    approveStep: (
      payload: Required<Pick<WorkflowActionPayload, 'workflowId'>> & WorkflowActionPayload
    ) => actionMutation.mutateAsync({ action: 'approve', payload }),
    rejectStep: (
      payload: Required<Pick<WorkflowActionPayload, 'workflowId' | 'reason'>> &
        WorkflowActionPayload
    ) => actionMutation.mutateAsync({ action: 'reject', payload }),
    dischargeAMA: (
      payload: Required<Pick<WorkflowActionPayload, 'workflowId' | 'reason'>> &
        WorkflowActionPayload
    ) => actionMutation.mutateAsync({ action: 'discharge_ama', payload }),
    cancelWorkflow: (payload: Required<Pick<WorkflowActionPayload, 'workflowId'>>) =>
      actionMutation.mutateAsync({ action: 'cancel', payload }),
    isMutating: actionMutation.isPending,
    currentRoleStep,
    canAct: !!user?.id && !!currentRoleStep,
  };
}
