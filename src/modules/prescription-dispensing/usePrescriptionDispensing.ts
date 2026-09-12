/**
 * Strict Pharmacist-Gated Prescription Dispensing (`prescription-dispensing`)
 *
 * React Hook Adapter: `usePrescriptionDispensing`
 *
 * Presentation-layer seam connecting UI components to PrescriptionDispensingEngine.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  PrescriptionActor,
  PrescriptionWorkflow,
  PrescriptionWorkflowAction,
  PrescriptionWorkflowStatus,
  TransitionPrescriptionStepParams,
} from './types';
import {
  createPrescriptionDispensingEngine,
  PrescriptionDispensingEngine,
} from './PrescriptionDispensingEngine';

export interface UsePrescriptionDispensingOptions {
  readonly workflowId?: string;
  readonly prescriptionId?: string;
  readonly engine?: PrescriptionDispensingEngine;
}

export interface UsePrescriptionDispensingReturn {
  readonly workflow: PrescriptionWorkflow | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly advanceStep: (
    action: PrescriptionWorkflowAction,
    options?: Omit<TransitionPrescriptionStepParams, 'workflowId'>
  ) => Promise<{
    success: boolean;
    workflow?: PrescriptionWorkflow;
    error?: string;
  }>;
  readonly canApprove: () => boolean;
  readonly canReject: () => boolean;
  readonly canDispense: () => boolean;
  readonly canClarify: () => boolean;
  readonly isTerminal: () => boolean;
  readonly getStatusColor: (status?: PrescriptionWorkflowStatus) => string;
  readonly getStatusBadgeColor: (status?: PrescriptionWorkflowStatus) => string;
  readonly refresh: () => Promise<void>;
}

export function usePrescriptionDispensing(
  workflowIdOrOptions?: string | UsePrescriptionDispensingOptions
): UsePrescriptionDispensingReturn {
  const options: UsePrescriptionDispensingOptions = useMemo(() => {
    if (typeof workflowIdOrOptions === 'string') {
      return { workflowId: workflowIdOrOptions };
    }
    return workflowIdOrOptions ?? {};
  }, [workflowIdOrOptions]);

  const { workflowId, prescriptionId, engine: customEngine } = options;
  const { user, profile } = useAuth();

  const engine = useMemo(
    () => customEngine || createPrescriptionDispensingEngine(),
    [customEngine]
  );

  const [workflow, setWorkflow] = useState<PrescriptionWorkflow | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actor: PrescriptionActor = useMemo(() => {
    const role = (profile?.role || (user as any)?.role || 'pharmacist') as string;
    const hospitalId = profile?.hospital_id || (user as any)?.hospital_id || 'default-hospital';
    return {
      id: user?.id || 'anonymous-actor',
      hospitalId,
      role,
    };
  }, [user, profile]);

  const fetchWorkflow = useCallback(async () => {
    if (!workflowId && !prescriptionId) {
      setWorkflow(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      let data: PrescriptionWorkflow | null = null;
      if (workflowId) {
        data = await engine.getWorkflow(workflowId);
      } else if (prescriptionId) {
        data = await engine.getWorkflowByPrescriptionId(prescriptionId);
      }
      setWorkflow(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      console.error('[usePrescriptionDispensing] Failed to fetch workflow:', msg);
    } finally {
      setIsLoading(false);
    }
  }, [workflowId, prescriptionId, engine]);

  useEffect(() => {
    fetchWorkflow();
  }, [fetchWorkflow]);

  // Realtime subscription
  useEffect(() => {
    const targetId = workflowId || workflow?.id;
    if (!targetId) return;

    const channel = supabase.channel(`prescription-workflow:${targetId}`);
    channel
      .on('broadcast', { event: 'step_advanced' }, (payload: any) => {
        if (payload?.id === targetId) {
          setWorkflow((prev) =>
            prev
              ? {
                  ...prev,
                  status: payload.status,
                  current_step: payload.step ?? prev.current_step,
                  updated_at: payload.timestamp ?? new Date().toISOString(),
                }
              : null
          );
          toast.success(`Prescription workflow advanced to ${payload.status}`);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workflowId, workflow?.id]);

  const advanceStep = useCallback(
    async (
      action: PrescriptionWorkflowAction,
      stepOptions: Omit<TransitionPrescriptionStepParams, 'workflowId'> = {}
    ): Promise<{ success: boolean; workflow?: PrescriptionWorkflow; error?: string }> => {
      const targetWorkflowId = workflowId || workflow?.id;
      if (!targetWorkflowId) {
        return {
          success: false,
          error: 'Workflow ID is not available for state transition.',
        };
      }

      setIsLoading(true);
      setError(null);

      try {
        let result;
        const transitionParams = {
          workflowId: targetWorkflowId,
          ...stepOptions,
        };

        switch (action) {
          case 'review':
            result = await engine.review(actor, transitionParams);
            break;
          case 'approve':
            result = await engine.approve(actor, transitionParams);
            break;
          case 'reject':
            result = await engine.reject(actor, {
              ...transitionParams,
              reason: stepOptions.reason || 'Rejected by pharmacist',
            });
            break;
          case 'clarify':
            result = await engine.requestClarification(actor, {
              ...transitionParams,
              notes: stepOptions.notes || stepOptions.reason || 'Clarification required',
            });
            break;
          case 'dispense':
            result = await engine.dispense(actor, transitionParams);
            break;
          case 'complete':
            result = await engine.complete(actor, transitionParams);
            break;
          case 'cancel':
            result = await engine.cancel(actor, {
              ...transitionParams,
              reason: stepOptions.reason || 'Cancelled by clinician',
            });
            break;
          default:
            throw new Error(`Unsupported action: ${action}`);
        }

        if (!result.success || !result.workflow) {
          throw new Error(result.error || 'Workflow transition failed');
        }

        setWorkflow(result.workflow);

        if (result.durWarnings && result.durWarnings.length > 0) {
          toast.warning(`DUR Warnings: ${result.durWarnings.join(', ')}`);
        }
        toast.success(`Prescription transition "${action}" successful`);

        return { success: true, workflow: result.workflow };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        toast.error(`Prescription workflow failed: ${msg}`);
        return { success: false, error: msg };
      } finally {
        setIsLoading(false);
      }
    },
    [workflowId, workflow?.id, actor, engine]
  );

  const canApprove = useCallback((): boolean => {
    const role = actor.role.toLowerCase();
    const isPharmacist = role === 'pharmacist' || role === 'admin';
    return (
      isPharmacist &&
      (workflow?.status === 'pending_approval' || workflow?.status === 'pending_clarification')
    );
  }, [workflow?.status, actor.role]);

  const canReject = useCallback((): boolean => {
    const role = actor.role.toLowerCase();
    const isPharmacist = role === 'pharmacist' || role === 'admin';
    return (
      isPharmacist &&
      (workflow?.status === 'pending_approval' || workflow?.status === 'pending_clarification')
    );
  }, [workflow?.status, actor.role]);

  const canClarify = useCallback((): boolean => {
    const role = actor.role.toLowerCase();
    const isPharmacist = role === 'pharmacist' || role === 'admin';
    return isPharmacist && workflow?.status === 'pending_approval';
  }, [workflow?.status, actor.role]);

  const canDispense = useCallback((): boolean => {
    // Non-negotiable ADR-0004 invariant: Only approved prescriptions may be dispensed
    return workflow?.status === 'approved' || workflow?.status === 'partially_dispensed';
  }, [workflow?.status]);

  const isTerminal = useCallback((): boolean => {
    return ['completed', 'rejected', 'cancelled'].includes(workflow?.status || '');
  }, [workflow?.status]);

  const getStatusColor = useCallback(
    (status?: PrescriptionWorkflowStatus): string => {
      const s = status || workflow?.status;
      switch (s) {
        case 'initiated':
        case 'pending_approval':
          return 'bg-yellow-50 border-yellow-200';
        case 'pending_clarification':
          return 'bg-orange-50 border-orange-200';
        case 'approved':
          return 'bg-blue-50 border-blue-200';
        case 'partially_dispensed':
          return 'bg-amber-50 border-amber-200';
        case 'dispensed':
          return 'bg-green-50 border-green-200';
        case 'completed':
          return 'bg-green-100 border-green-300';
        case 'rejected':
          return 'bg-red-50 border-red-200';
        case 'cancelled':
          return 'bg-gray-100 border-gray-300';
        default:
          return 'bg-gray-50 border-gray-200';
      }
    },
    [workflow?.status]
  );

  const getStatusBadgeColor = useCallback(
    (status?: PrescriptionWorkflowStatus): string => {
      const s = status || workflow?.status;
      switch (s) {
        case 'initiated':
          return 'bg-gray-100 text-gray-800';
        case 'pending_approval':
          return 'bg-yellow-100 text-yellow-800';
        case 'pending_clarification':
          return 'bg-orange-100 text-orange-800';
        case 'approved':
          return 'bg-blue-100 text-blue-800';
        case 'partially_dispensed':
          return 'bg-amber-100 text-amber-800';
        case 'dispensed':
          return 'bg-green-100 text-green-800';
        case 'completed':
          return 'bg-green-200 text-green-900';
        case 'rejected':
          return 'bg-red-100 text-red-800';
        case 'cancelled':
          return 'bg-gray-200 text-gray-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    },
    [workflow?.status]
  );

  return {
    workflow,
    isLoading,
    error,
    advanceStep,
    canApprove,
    canReject,
    canDispense,
    canClarify,
    isTerminal,
    getStatusColor,
    getStatusBadgeColor,
    refresh: fetchWorkflow,
  };
}
