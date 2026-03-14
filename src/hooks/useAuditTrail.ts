import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { sanitizeForLog } from '@/utils/sanitize';

/**
 * Phase 2B: Audit Trail Hook
 * 
 * Fetches and caches audit trail for a record with real-time updates.
 * Supports multiple record types (prescription, lab_result, appointment).
 * 
 * @example
 * ```typescript
 * const { auditTrail, isLoading, error, hasAmendments, refetch } = useAuditTrail(
 *   'rx_123',
 *   'prescription'
 * );
 * 
 * return (
 *   <AuditTimeline 
 *     trail={auditTrail}
 *     loading={isLoading}
 *     recordType="prescription"
 *   />
 * );
 * ```
 */

export interface Amendment {
  amendmentId: string;
  timestamp: string; // ISO 8601 UTC
  amendedBy: {
    userId: string;
    name: string;
    email: string;
    role: string;
    avatarUrl?: string;
  };
  changeType: string; // DOSAGE_CHANGE, CRITICAL_ALERT, APPOINTMENT_RESCHEDULE, etc.
  originalValue: string | Record<string, any>;
  amendedValue: string | Record<string, any>;
  reason: string;
  approvedBy?: {
    userId: string;
    name: string;
    role: string;
  };
  legalHoldAt: string | null;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  sequence: number;
}

export interface UseAuditTrailReturn {
  auditTrail: Amendment[];
  isLoading: boolean;
  error: Error | null;
  hasAmendments: boolean;
  refetch: () => Promise<any>;
}

export type RecordType = 'prescription' | 'lab_result' | 'appointment';

/**
 * Fetch audit trail for a record with caching and real-time support
 */
export function useAuditTrail(
  recordId: string | null,
  recordType: RecordType = 'prescription'
): UseAuditTrailReturn {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Map record types to their database tables & RPC functions
  const getRpcFunction = (type: RecordType): string => {
    switch (type) {
      case 'prescription':
        return 'get_prescription_amendment_chain';
      case 'lab_result':
        return 'get_lab_result_history';
      case 'appointment':
        return 'get_appointment_amendment_chain';
      default:
        return 'get_prescription_amendment_chain';
    }
  };

  const cacheKey = ['audit_trail', recordType, recordId, profile?.hospital_id];

  // Main query
  const {
    data: rawTrail = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: cacheKey,
    queryFn: async () => {
      if (!recordId || !profile?.hospital_id) return [];

      try {
        const rpcFn = getRpcFunction(recordType);
        const { data, error: rpcError } = await supabase.rpc(rpcFn, {
          p_record_id: recordId,
        });

        if (rpcError) {
          console.error(
            `Failed to fetch ${recordType} audit trail:`,
            sanitizeForLog(rpcError.message)
          );
          throw rpcError;
        }

        return data || [];
      } catch (err) {
        console.error(`Audit trail fetch failed:`, sanitizeForLog(String(err)));
        throw err;
      }
    },
    enabled: !!recordId && !!profile?.hospital_id,
    staleTime: 5000, // 5s cache
    refetchInterval: 5000, // Poll every 5s for real-time amendments
    refetchIntervalInBackground: true,
  });

  // Transform raw data to Amendment interface
  const auditTrail: Amendment[] = (rawTrail || []).map((record: any, idx: number) => ({
    amendmentId: record.audit_id || record.amendment_id || `${recordId}_${idx}`,
    timestamp: record.event_time || record.amendment_timestamp || new Date().toISOString(),
    amendedBy: {
      userId: record.actor_user_id || record.amended_by_user_id || 'unknown',
      name: record.actor_name || record.amended_by_name || 'System',
      email: record.actor_email || record.amended_by_email || 'system@hospital',
      role: record.actor_role || 'SYSTEM',
      avatarUrl: record.actor_avatar_url,
    },
    changeType: record.action_type || record.amendment_type || 'UPDATE',
    originalValue: record.dosage_before ||
      record.result_value_before ||
      record.appointment_date_before ||
      record.before_state ||
      'N/A',
    amendedValue: record.dosage_after ||
      record.result_value_after ||
      record.appointment_date_after ||
      record.after_state ||
      'N/A',
    reason: record.change_reason || record.amendment_reason || 'No reason provided',
    approvedBy: record.approval_user_id ? {
      userId: record.approval_user_id,
      name: record.approval_user_name || 'Unknown',
      role: record.approval_user_role || 'DOCTOR',
    } : undefined,
    legalHoldAt: record.legal_hold_at || null,
    severity: parseSeverity(record.severity || record.change_type),
    sequence: record.sequence_number || idx + 1,
  }));

  // Subscribe to real-time changes (using polling fallback)
  useEffect(() => {
    if (!recordId || !profile?.hospital_id) return;

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: cacheKey });
    }, 5000);

    return () => clearInterval(interval);
  }, [recordId, profile?.hospital_id, cacheKey, queryClient]);

  return {
    auditTrail: auditTrail.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ),
    isLoading,
    error: error as Error | null,
    hasAmendments: auditTrail.length > 0,
    refetch,
  };
}

/**
 * Parse severity from change type or explicit field
 */
function parseSeverity(value: string): Amendment['severity'] {
  const lower = String(value).toLowerCase();
  if (lower.includes('critical') || lower.includes('urgent')) return 'CRITICAL';
  if (lower.includes('dosage') || lower.includes('discontinue')) return 'HIGH';
  if (lower.includes('quantity') || lower.includes('frequency')) return 'MEDIUM';
  return 'LOW';
}

/**
 * Invalidate audit trail cache after mutation
 */
export function useInvalidateAuditTrail() {
  const queryClient = useQueryClient();

  return {
    invalidate: (recordId: string, recordType: RecordType = 'prescription') => {
      queryClient.invalidateQueries({
        queryKey: ['audit_trail', recordType, recordId],
      });
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({
        queryKey: ['audit_trail'],
      });
    },
  };
}
