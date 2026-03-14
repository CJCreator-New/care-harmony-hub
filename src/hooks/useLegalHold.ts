import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { sanitizeForLog } from '@/utils/sanitize';

/**
 * Phase 2B: Legal Hold Management Hook
 * 
 * Manage legal hold status for audit records:
 * - Query legal hold status
 * - Toggle legal hold with reason
 * - Export tamper-evident forensic report
 * - Log all hold changes
 * 
 * @example
 * ```typescript
 * const { isLegalHeld, toggleLegalHold, exportReport } = useLegalHold(
 *   'rx_123',
 *   'prescription'
 * );
 * 
 * return (
 *   <div>
 *     {isLegalHeld && <LegalHoldBadge />}
 *     <Button onClick={() => toggleLegalHold(true, 'Litigation case #2024-0001')}>
 *       Place Legal Hold
 *     </Button>
 *   </div>
 * );
 * ```
 */

export interface LegalHoldStatus {
  isLegalHeld: boolean;
  legalHoldAt: string | null; // ISO 8601 timestamp
  holdReason: string | null;
  holdedBy?: {
    userId: string;
    name: string;
    email: string;
  };
}

export interface UseLegalHoldReturn {
  isLegalHeld: boolean;
  legalHoldAt: string | null;
  holdReason: string | null;
  isLoading: boolean;
  error: Error | null;
  toggleLegalHold: (
    enable: boolean,
    reason?: string
  ) => Promise<void>;
  exportForensicReport: () => Promise<Blob>;
}

export type RecordTypeForHold = 'prescription' | 'lab_result' | 'appointment';

/**
 * Query and manage legal hold status for a record
 */
export function useLegalHold(
  recordId: string | null,
  recordType: RecordTypeForHold = 'prescription'
): UseLegalHoldReturn {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const cacheKey = ['legal_hold', recordType, recordId];

  // Query legal hold status
  const {
    data: legalHoldData,
    isLoading,
    error,
  } = useQuery({
    queryKey: cacheKey,
    queryFn: async () => {
      if (!recordId || !profile?.hospital_id) return null;

      try {
        // Query the appropriate audit table for legal hold status
        const tableName = `${recordType === 'prescription' ? 'prescription' : recordType}_audit`;
        const { data, error: queryError } = await supabase
          .from(tableName)
          .select('legal_hold_at, legal_hold_reason, created_by_user_id')
          .eq('prescription_id' in {} ? 'prescription_id' : 'record_id', recordId)
          .eq('hospital_id', profile.hospital_id)
          .limit(1)
          .single();

        if (queryError && queryError.code !== 'PGRST116') {
          throw queryError;
        }

        return (data as any) || null;
      } catch (err) {
        console.error(
          'Failed to fetch legal hold status:',
          sanitizeForLog(String(err))
        );
        throw err;
      }
    },
    enabled: !!recordId && !!profile?.hospital_id,
    staleTime: 10000, // 10s cache
  });

  // Toggle legal hold mutation
  const toggleMutation = useMutation({
    mutationFn: async (params: { enable: boolean; reason?: string }) => {
      if (!recordId || !profile?.hospital_id) {
        throw new Error('Authentication required');
      }

      if (params.enable && !params.reason?.trim()) {
        throw new Error('Legal hold reason is required');
      }

      // Validate reason length (max 500 chars)
      if (params.reason && params.reason.length > 500) {
        throw new Error('Legal hold reason must be less than 500 characters');
      }

      try {
        // Call stored procedure to toggle legal hold
        const { error } = await supabase.rpc('toggle_legal_hold', {
          p_record_id: recordId,
          p_record_type: recordType,
          p_hospital_id: profile.hospital_id,
          p_enable_hold: params.enable,
          p_hold_reason: params.reason || null,
        });

        if (error) {
          console.error('Toggle legal hold failed:', sanitizeForLog(error.message));
          throw error;
        }
      } catch (err) {
        console.error('Legal hold toggle error:', sanitizeForLog(String(err)));
        throw err;
      }
    },

    onSuccess: (_, variables) => {
      const action = variables.enable ? 'Place' : 'Remove';
      toast.success(`${action} legal hold successful`, {
        description: variables.reason
          ? `Reason: ${variables.reason.substring(0, 100)}`
          : 'Legal hold status updated',
      });

      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: cacheKey });
    },

    onError: (error: Error) => {
      toast.error('Legal hold update failed', {
        description: error.message,
      });
    },
  });

  // Export forensic report mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!recordId || !profile?.hospital_id) {
        throw new Error('Authentication required');
      }

      try {
        // Call RPC to generate forensic report
        const { data, error } = await supabase.rpc(
          'export_forensic_report_pdf',
          {
            p_record_id: recordId,
            p_record_type: recordType,
            p_hospital_id: profile.hospital_id,
          }
        );

        if (error) {
          throw error;
        }

        // Convert binary data to blob
        const binaryString = atob(data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return new Blob([bytes], { type: 'application/pdf' });
      } catch (err) {
        console.error('Forensic report export failed:', sanitizeForLog(String(err)));
        throw err;
      }
    },

    onSuccess: (blob) => {
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `forensic_report_${recordId}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Forensic report exported', {
        description: 'PDF downloaded successfully',
      });
    },

    onError: (error: Error) => {
      toast.error('Export failed', {
        description: error.message,
      });
    },
  });

  return {
    isLegalHeld: legalHoldData?.legal_hold_at !== null && legalHoldData?.legal_hold_at !== undefined,
    legalHoldAt: legalHoldData?.legal_hold_at || null,
    holdReason: legalHoldData?.legal_hold_reason || null,
    isLoading,
    error: error as Error | null,
    toggleLegalHold: (enable: boolean, reason?: string) =>
      toggleMutation.mutateAsync({ enable, reason }),
    exportForensicReport: () => exportMutation.mutateAsync(),
  };
}

/**
 * Validate legal hold reason
 */
export function validateLegalHoldReason(reason: string): { valid: boolean; message?: string } {
  if (!reason || !reason.trim()) {
    return { valid: false, message: 'Reason is required' };
  }

  if (reason.length < 10) {
    return { valid: false, message: 'Reason must be at least 10 characters' };
  }

  if (reason.length > 500) {
    return { valid: false, message: 'Reason must be less than 500 characters' };
  }

  // Check for basic malicious input (no SQL injection patterns)
  if (/[;'"\\]/i.test(reason)) {
    return { valid: false, message: 'Reason contains invalid characters' };
  }

  return { valid: true };
}
