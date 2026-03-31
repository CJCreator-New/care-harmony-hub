/**
 * usePrescriptionApprovalWorkflow Hook
 * Orchestrates prescription approval workflow with realtime updates.
 * 
 * Usage in PrescriptionQueue:
 *   const { advanceStep, currentWorkflow } = usePrescriptionApprovalWorkflow(workflowId);
 *   await advanceStep('approve', { notes: 'Verified' });
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityLog } from '@/hooks/useActivityLog';
import { toast } from 'sonner';

interface WorkflowState {
  id: string;
  status: 'initiated' | 'pending_approval' | 'pending_clarification' | 'approved' | 'dispensed' | 'completed' | 'rejected' | 'cancelled';
  current_step: number;
  prescription_id: string;
  patient_id: string;
  hospital_id: string;
  initiated_by: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  rejected_at?: string;
  dur_check_passed?: boolean;
  dur_warnings?: string[];
  clarification_notes?: string;
  updated_at: string;
}

interface StepAdvanceOptions {
  reason?: string;
  notes?: string;
  durWarnings?: string[];
}

/**
 * Hook for prescription approval workflow orchestration.
 */
export function usePrescriptionApprovalWorkflow(workflowId?: string) {
  const { profile } = useAuth();
  const { logActivity: recordActivity } = useActivityLog();
  const [workflow, setWorkflow] = useState<WorkflowState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Fetch Initial Workflow State ─────────────────────────────────────────────

  useEffect(() => {
    if (!workflowId) return;

    const fetchWorkflow = async () => {
      try {
        const { data, error: err } = await supabase
          .from('prescription_approval_workflows')
          .select('*')
          .eq('id', workflowId)
          .single();

        if (err) throw err;
        setWorkflow(data);
        setError(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        console.error('Failed to fetch workflow:', msg);
      }
    };

    fetchWorkflow();
  }, [workflowId]);

  // ─── Realtime Subscription ───────────────────────────────────────────────────

  useEffect(() => {
    if (!workflowId) return;

    const channel = supabase.channel(`workflow:${workflowId}`);

    const subscription = channel
      .on(
        'broadcast',
        { event: 'step_advanced' },
        (payload: any) => {
          console.log('Workflow step advanced:', payload);
          // Update local state with realtime change
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
          // Toast notification
          toast.success(`Prescription workflow advanced to ${payload.status}`);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workflowId]);

  // ─── Advance Workflow Step ───────────────────────────────────────────────────

  const advanceStep = useCallback(
    async (
      action: 'review' | 'approve' | 'reject' | 'clarify' | 'dispense' | 'complete',
      options: StepAdvanceOptions = {}
    ): Promise<{ success: boolean; workflow?: WorkflowState; error?: string }> => {
      if (!workflowId || !profile) {
        return {
          success: false,
          error: 'Workflow ID or user profile not available',
        };
      }

      setIsLoading(true);
      setError(null);

      try {
        // Call Edge Function
        const { data, error: fnError } = await supabase.functions.invoke(
          'prescription-approval',
          {
            body: {
              workflowId,
              action,
              actorId: profile.id,
              reason: options.reason,
              notes: options.notes,
              durWarnings: options.durWarnings,
            },
          }
        );

        if (fnError) throw fnError;
        if (!data?.success) throw new Error(data?.error || 'Workflow action failed');

        // Update local state
        const updatedWorkflow = data.workflow;
        setWorkflow(updatedWorkflow);

        // Log activity
        await recordActivity({
          actionType: `prescription_approval_${action}`,
          entityType: 'prescription_approval_workflow',
          entityId: workflowId,
          details: {
            status: updatedWorkflow.status,
            step: updatedWorkflow.current_step,
            reason: options.reason,
          },
        });

        // DUR warnings toast
        if (data.durWarnings?.length > 0) {
          toast.warning(`DUR Alerts: ${data.durWarnings.join(', ')}`);
        }

        toast.success(`Prescription ${action} successful`);

        return { success: true, workflow: updatedWorkflow };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        toast.error(`Workflow action failed: ${msg}`);
        return { success: false, error: msg };
      } finally {
        setIsLoading(false);
      }
    },
    [workflowId, profile, recordActivity]
  );

  // ─── Computed Helpers ────────────────────────────────────────────────────────

  const canApprove = useCallback((): boolean => {
    if (!profile) return false;
    return workflow?.status === 'pending_approval' || workflow?.status === 'pending_clarification';
  }, [workflow?.status, profile]);

  const canReject = useCallback((): boolean => {
    if (!profile) return false;
    return workflow?.status === 'pending_approval';
  }, [workflow?.status, profile]);

  const canDispense = useCallback((): boolean => {
    if (!profile) return false;
    return workflow?.status === 'approved';
  }, [workflow?.status, profile]);

  const canClarify = useCallback((): boolean => {
    if (!profile) return false;
    return workflow?.status === 'pending_approval';
  }, [workflow?.status, profile]);

  const isTerminal = useCallback((): boolean => {
    return ['completed', 'rejected', 'cancelled'].includes(workflow?.status || '');
  }, [workflow?.status]);

  // ─── UI Helpers ──────────────────────────────────────────────────────────────

  const getStatusColor = useCallback((status?: string): string => {
    const s = status || workflow?.status;
    switch (s) {
      case 'initiated':
      case 'pending_approval':
        return 'bg-yellow-50 border-yellow-200';
      case 'pending_clarification':
        return 'bg-orange-50 border-orange-200';
      case 'approved':
        return 'bg-blue-50 border-blue-200';
      case 'dispensed':
        return 'bg-green-50 border-green-200';
      case 'completed':
        return 'bg-green-100 border-green-300';
      case 'rejected':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  }, [workflow?.status]);

  const getStatusBadgeColor = useCallback((status?: string) => {
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
  }, [workflow?.status]);

  return {
    workflow,
    isLoading,
    error,
    advanceStep,
    // Check functions
    canApprove,
    canReject,
    canDispense,
    canClarify,
    isTerminal,
    // UI helpers
    getStatusColor,
    getStatusBadgeColor,
  };
}
