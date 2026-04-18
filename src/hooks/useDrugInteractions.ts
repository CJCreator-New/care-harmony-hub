/**
 * Hook: useDrugInteractions (Tier 4.5 - Phase 3)
 * 
 * Purpose: Manage drug interaction checks in React components
 * Pattern: Call Edge Function, cache results, provide UI helpers
 * 
 * Usage:
 * const { checkInteraction, lastCheck, isChecking, canDispense, requiresApproval } = useDrugInteractions();
 * const result = await checkInteraction(patientId, drugRxcui);
 * if (!canDispense(result)) { /* block dispensing */ }
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityLog } from '@/hooks/useActivityLog';
import { toast } from 'sonner';

export interface InteractionResult {
  severity: 'contraindicated' | 'serious' | 'moderate' | 'minor' | 'none';
  interactions: Array<{
    interactingDrug: string;
    severity: string;
    recommendation: string;
    source?: 'local' | 'rxnorm';
  }>;
  cacheHit: boolean;
  timestamp: string;
}

interface UseDrugInteractionsReturn {
  /** Check interactions for a patient + drug combination */
  checkInteraction: (patientId: string, drugRxcui: string, drugName?: string) => Promise<InteractionResult | null>;

  /** Last interaction check result */
  lastCheck: InteractionResult | null;

  /** True while API call in progress */
  isChecking: boolean;

  /** Can we dispense? (false only if contraindicated) */
  canDispense: (check: InteractionResult | null) => boolean;

  /** Requires doctor approval? (true if serious) */
  requiresApproval: (check: InteractionResult | null) => boolean;

  /** Get human-readable message for UI */
  getMessage: (check: InteractionResult | null) => string;

  /** Clear cached result */
  clearCache: () => void;
}

export function useDrugInteractions(): UseDrugInteractionsReturn {
  const { user } = useAuth();
  const { logActivity } = useActivityLog();

  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<InteractionResult | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Check drug interactions via Edge Function
   * Returns null on error (fail-safe)
   */
  const checkInteraction = useCallback(
    async (patientId: string, drugRxcui: string, drugName?: string): Promise<InteractionResult | null> => {
      // Validate inputs
      if (!patientId || !drugRxcui) {
        console.error('Missing required parameters for drug interaction check');
        return null;
      }

      if (!user?.hospital_id) {
        console.error('User hospital_id not available');
        toast.error('Hospital context not available');
        return null;
      }

      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      setIsChecking(true);
      const startTime = Date.now();

      try {
        // Call Edge Function
        const { data, error } = await supabase.functions.invoke('drug-interaction-check', {
          body: {
            patientId,
            newDrugRxcui: drugRxcui,
            newDrugName: drugName || 'Unknown',
            hospitalId: user.hospital_id,
            userId: user.id,
          },
        });

        if (error) {
          console.error('Edge Function error:', error);
          toast.error('Failed to check drug interactions');
          return null;
        }

        const result: InteractionResult = data;
        setLastCheck(result);

        // Log activity
        await logActivity({
          actionType: 'drug_interaction_checked',
          resourceType: 'prescription',
          resourceId: drugRxcui,
          details: {
            patient_id: patientId,
            severity: result.severity,
            interactions_found: result.interactions.length,
            duration_ms: Date.now() - startTime,
            cache_hit: result.cacheHit,
          },
        });

        return result;
      } catch (err: any) {
        console.error('Drug interaction check error:', err);
        toast.error('Error checking drug interactions');
        return null;
      } finally {
        setIsChecking(false);
      }
    },
    [user, logActivity]
  );

  /**
   * Can we dispense this medication?
   * Returns false ONLY if contraindicated (blocks dispensing)
   * Serious requires approval but doesn't block
   */
  const canDispense = useCallback((check: InteractionResult | null): boolean => {
    if (!check) return true; // No check = safe to proceed
    return check.severity !== 'contraindicated'; // Only contraindicated blocks
  }, []);

  /**
   * Does this interaction require doctor approval?
   */
  const requiresApproval = useCallback((check: InteractionResult | null): boolean => {
    if (!check) return false;
    return check.severity === 'serious';
  }, []);

  /**
   * Get user-friendly message for display
   */
  const getMessage = useCallback((check: InteractionResult | null): string => {
    if (!check || check.severity === 'none') {
      return '✓ No drug interactions detected';
    }

    const messages = {
      contraindicated: `🚫 CONTRAINDICATED — Do not dispense (${check.interactions.length} interaction)`,
      serious: `⚠️ SERIOUS interaction — Doctor approval required (${check.interactions.length} interaction)`,
      moderate: `⚠️ Moderate interaction detected — Use caution (${check.interactions.length} interaction)`,
      minor: `ℹ️ Minor interaction — Patient counseling recommended (${check.interactions.length} interaction)`,
    };

    return messages[check.severity];
  }, []);

  /**
   * Clear cached check (e.g., when patient changes)
   */
  const clearCache = useCallback(() => {
    setLastCheck(null);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    checkInteraction,
    lastCheck,
    isChecking,
    canDispense,
    requiresApproval,
    getMessage,
    clearCache,
  };
}

/**
 * Common usage patterns:
 *
 * 1. Check before dispensing:
 *    const { checkInteraction, canDispense } = useDrugInteractions();
 *    const result = await checkInteraction(patientId, drugRxcui);
 *    if (!canDispense(result)) {
 *      toast.error('Cannot dispense — contraindicated combination');
 *      return;
 *    }
 *
 * 2. With approval workflow:
 *    const { checkInteraction, requiresApproval } = useDrugInteractions();
 *    const result = await checkInteraction(patientId, drugRxcui);
 *    if (requiresApproval(result)) {
 *      // Show approval button, wait for doctor
 *    }
 *
 * 3. Display warning:
 *    const { getMessage } = useDrugInteractions();
 *    <p>{getMessage(lastCheck)}</p>
 */
