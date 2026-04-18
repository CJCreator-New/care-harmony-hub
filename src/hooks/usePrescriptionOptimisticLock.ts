/**
 * Hook for managing prescription updates with optimistic locking
 * Prevents concurrent edit conflicts by version checking
 * See: TIER4_IMPLEMENTATION_PLAN.md - Item 4.3
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityLog } from '@/hooks/useActivityLog';
import { toast } from 'sonner';

export interface Prescription {
  id: string;
  hospital_id: string;
  patient_id: string;
  created_by: string;
  drug_name: string;
  dose: string;
  dosage_unit: string;
  frequency: string;
  duration: string;
  notes?: string;
  status: 'active' | 'completed' | 'cancelled';
  version: number; // Critical: for optimistic locking
  updated_at: string;
  [key: string]: any;
}

export interface VersionConflictError {
  type: 'version_conflict';
  clientVersion: number;
  serverVersion: number;
  serverData: Partial<Prescription>;
  message: string;
}

/**
 * Hook for safely updating prescriptions with optimistic locking
 * Detects concurrent edits and prompts user to reconcile changes
 */
export function usePrescriptionOptimisticLock(prescriptionId: string) {
  const { user, hospital } = useAuth();
  const { logActivity } = useActivityLog();

  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [conflictError, setConflictError] = useState<VersionConflictError | null>(null);

  /**
   * Fetch current prescription state
   */
  const fetchPrescription = useCallback(async () => {
    if (!hospital?.id) return;

    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('id', prescriptionId)
        .eq('hospital_id', hospital.id)
        .single();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('Prescription not found');

      setPrescription(data as Prescription);
      setError(null);
      setConflictError(null);
    } catch (err) {
      const error = err as Error;
      setError(error);
      toast.error(`Failed to load prescription: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [prescriptionId, hospital?.id]);

  /**
   * Update prescription with optimistic locking
   * Returns success or version conflict error
   */
  const updatePrescription = useCallback(
    async (updates: Partial<Prescription>): Promise<Prescription | VersionConflictError | null> => {
      if (!prescription) {
        toast.error('Prescription not loaded');
        return null;
      }

      try {
        setIsSaving(true);
        setConflictError(null);

        // Critical: Include version check in WHERE clause
        // If version doesn't match, no rows updated (conflict detected)
        const { data, error: updateError } = await supabase
          .from('prescriptions')
          .update({
            ...updates,
            version: prescription.version + 1, // Increment version
            updated_at: new Date().toISOString(),
          })
          .eq('id', prescriptionId)
          .eq('version', prescription.version) // Version check — critical!
          .eq('hospital_id', hospital?.id)
          .select()
          .single();

        if (updateError) {
          // Check if this is a version conflict (NO_ROWS_AFFECTED)
          if (updateError.code === 'PGRST116' || updateError.message.includes('0 rows')) {
            // Version conflict — fetch current server state
            const { data: currentData, error: fetchError } = await supabase
              .from('prescriptions')
              .select('*')
              .eq('id', prescriptionId)
              .eq('hospital_id', hospital?.id)
              .single();

            if (fetchError) throw fetchError;

            const conflict: VersionConflictError = {
              type: 'version_conflict',
              clientVersion: prescription.version,
              serverVersion: currentData?.version || prescription.version + 1,
              serverData: currentData,
              message: `Prescription was modified by someone else. 
Your changes: ${JSON.stringify(updates)}
Current server data: ${JSON.stringify(currentData)}
Please review and retry.`,
            };

            setConflictError(conflict);
            toast.error('Prescription conflict: Another user modified it. Review and retry.');

            // Log conflict for debugging
            await logActivity({
              actionType: 'prescription_update_conflict',
              entityType: 'prescription',
              entityId: prescriptionId,
              details: {
                your_version: prescription.version,
                server_version: currentData?.version,
                your_updates: updates,
              },
            });

            return conflict;
          }

          throw updateError;
        }

        if (!data) throw new Error('Update returned no data');

        // Success: update local state and log
        const updatedPrescription = data as Prescription;
        setPrescription(updatedPrescription);

        await logActivity({
          actionType: 'prescription_updated',
          entityType: 'prescription',
          entityId: prescriptionId,
          details: { updates, new_version: updatedPrescription.version },
        });

        toast.success('Prescription updated successfully');
        return updatedPrescription;
      } catch (err) {
        const error = err as Error;
        setError(error);
        toast.error(`Failed to update prescription: ${error.message}`);
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [prescription, prescriptionId, hospital?.id, logActivity]
  );

  /**
   * Resolve version conflict by accepting server version
   * User must review and re-apply their changes to the current server version
   */
  const resolveConflict = useCallback(
    async (keepServerVersion: boolean = true) => {
      if (!conflictError) return;

      try {
        if (keepServerVersion) {
          // Accept server version as-is
          setPrescription(conflictError.serverData as Prescription);
          setConflictError(null);
          toast.info('Using server version. You can make additional changes.');
        } else {
          // Retry with user's original updates against new version
          // User needs to manually merge changes and resubmit
          toast.info('Please review server changes and resubmit your updates.');
        }
      } catch (err) {
        const error = err as Error;
        toast.error(`Failed to resolve conflict: ${error.message}`);
      }
    },
    [conflictError]
  );

  /**
   * Force refresh from server (useful after conflict)
   */
  const refresh = useCallback(() => {
    fetchPrescription();
  }, [fetchPrescription]);

  // Initial fetch on mount or when prescriptionId changes
  useEffect(() => {
    fetchPrescription();
  }, [fetchPrescription]);

  return {
    prescription,
    isLoading,
    isSaving,
    error,
    conflictError,
    updatePrescription,
    resolveConflict,
    refresh,
  };
}

/**
 * Simplified hook for read-only access (no updates)
 */
export function usePrescription(prescriptionId: string) {
  const { prescription, isLoading, error } = usePrescriptionOptimisticLock(prescriptionId);
  return { prescription, isLoading, error };
}
