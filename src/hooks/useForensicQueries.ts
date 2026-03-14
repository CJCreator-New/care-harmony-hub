import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback } from 'react';

/**
 * Phase 2B: Forensic Amendment Chain Queries
 * 
 * Immutable queries for prescription, invoice, and lab result amendment chains.
 * All queries are read-only and hospital-scoped via RLS.
 */

export interface PrescriptionAmendmentRecord {
  sequence_number: number;
  audit_id: string;
  event_time: string; // ISO 8601 UTC
  actor_email: string;
  actor_role: string;
  action_type: string;
  dosage_before: string | null;
  dosage_after: string | null;
  quantity_before: number | null;
  quantity_after: number | null;
  frequency_before: string | null;
  frequency_after: string | null;
  change_reason: string;
  amendment_justification: string | null;
}

export interface InvoiceAuditRecord {
  sequence_number: number;
  audit_id: string;
  event_time: string; // ISO 8601 UTC
  actor_email: string;
  actor_role: string;
  action_type: string;
  amount_before: number | null;
  amount_after: number | null;
  change_reason: string;
}

export interface LabResultAmendmentRecord {
  sequence_number: number;
  audit_id: string;
  event_time: string; // ISO 8601 UTC
  actor_email: string;
  actor_role: string;
  action_type: string;
  result_value_before: string | null;
  result_value_after: string | null;
  normal_range_before: string | null;
  normal_range_after: string | null;
  change_reason: string;
  amendment_justification: string | null;
}

/**
 * Query the amendment chain for a prescription (forensic investigation).
 * Shows: CREATE → APPROVE → AMEND (if any) → REVERSAL (if any)
 * 
 * @param prescriptionId - UUID of prescription
 * @returns Array of immutable audit records in chronological order
 */
export function usePrescriptionAmendmentChain(prescriptionId: string | null) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['prescription_amendment_chain', prescriptionId, profile?.hospital_id],
    queryFn: async () => {
      if (!prescriptionId || !profile?.hospital_id) return [];

      const { data, error } = await supabase.rpc(
        'get_prescription_amendment_chain',
        {
          p_prescription_id: prescriptionId,
        }
      );

      if (error) {
        console.error('Failed to fetch prescription amendment chain:', error);
        throw new Error(`Amendment chain query failed: ${error.message}`);
      }

      return (data || []) as PrescriptionAmendmentRecord[];
    },
    enabled: !!prescriptionId && !!profile?.hospital_id,
  });
}

/**
 * Query the audit trail for an invoice (billing forensics).
 * Shows: CHARGE_CREATED → DISCOUNT_APPLIED → PAYMENT_RECEIVED → ADJUSTMENT (if any)
 * 
 * @param invoiceId - UUID of invoice
 * @returns Array of immutable billing audit records
 */
export function useInvoiceAuditTrail(invoiceId: string | null) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['invoice_audit_trail', invoiceId, profile?.hospital_id],
    queryFn: async () => {
      if (!invoiceId || !profile?.hospital_id) return [];

      const { data, error } = await supabase.rpc(
        'get_invoice_audit_trail',
        {
          p_invoice_id: invoiceId,
        }
      );

      if (error) {
        console.error('Failed to fetch invoice audit trail:', error);
        throw new Error(`Invoice audit trail query failed: ${error.message}`);
      }

      return (data || []) as InvoiceAuditRecord[];
    },
    enabled: !!invoiceId && !!profile?.hospital_id,
  });
}

/**
 * Query the amendment history for a lab result.
 * Shows: CREATED → CORRECTED (if error) → VERIFIED (if final)
 * 
 * @param labResultId - UUID of lab result
 * @returns Array of immutable lab result audit records
 */
export function useLabResultAmendmentHistory(labResultId: string | null) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['lab_result_amendment_history', labResultId, profile?.hospital_id],
    queryFn: async () => {
      if (!labResultId || !profile?.hospital_id) return [];

      const { data, error } = await supabase.rpc(
        'get_lab_result_history',
        {
          p_lab_result_id: labResultId,
        }
      );

      if (error) {
        console.error('Failed to fetch lab result history:', error);
        throw new Error(`Lab result history query failed: ${error.message}`);
      }

      return (data || []) as LabResultAmendmentRecord[];
    },
    enabled: !!labResultId && !!profile?.hospital_id,
  });
}

/**
 * Query audit records for a specific entity with optional filters.
 * Used for forensic dashboard and compliance reporting.
 * 
 * @param options - Filter options
 * @returns Filtered audit records
 */
export interface AuditQueryOptions {
  entityType?: string; // 'prescription', 'invoice', 'lab_result'
  entityId?: string; // UUID
  actorRole?: string; // 'doctor', 'pharmacist', 'nurse', etc.
  actionType?: string; // 'CREATE', 'APPROVE', 'AMEND', etc.
  dateFrom?: Date;
  dateTo?: Date;
}

export function useAuditQuery(options: AuditQueryOptions) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: [
      'audit_query',
      options.entityId,
      options.actionType,
      options.actorRole,
      options.dateFrom?.toISOString(),
      options.dateTo?.toISOString(),
      profile?.hospital_id,
    ],
    queryFn: async () => {
      if (!profile?.hospital_id) return [];

      let query = supabase
        .from('audit_log')
        .select('*')
        .eq('hospital_id', profile.hospital_id);

      if (options.entityType) {
        query = query.eq('entity_type', options.entityType);
      }
      if (options.entityId) {
        query = query.eq('entity_id', options.entityId);
      }
      if (options.actorRole) {
        query = query.eq('actor_role', options.actorRole);
      }
      if (options.actionType) {
        query = query.eq('action_type', options.actionType);
      }
      if (options.dateFrom) {
        query = query.gte('event_time', options.dateFrom.toISOString());
      }
      if (options.dateTo) {
        query = query.lte('event_time', options.dateTo.toISOString());
      }

      const { data, error } = await query.order('event_time', { ascending: false });

      if (error) {
        console.error('Failed to query audit logs:', error);
        throw new Error(`Audit query failed: ${error.message}`);
      }

      return data || [];
    },
    enabled: !!profile?.hospital_id,
  });
}

/**
 * Query anomalies in audit trail (potential bypasses).
 * Returns suspicious patterns like:
 * - Prescriptions without CREATE audit
 * - Invoices with high discounts without justification
 * - Missing amendment chains
 */
export interface AuditAnomaly {
  anomaly_type: string;
  count: number;
  description: string;
  example_entity_id: string;
}

export function useAuditAnomalies(hoursSince: number = 24) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['audit_anomalies', profile?.hospital_id, hoursSince],
    queryFn: async () => {
      if (!profile?.hospital_id) return [];

      const { data, error } = await supabase.rpc(
        'find_audit_anomalies',
        {
          p_hospital_id: profile.hospital_id,
          p_hours_since: hoursSince,
        }
      );

      if (error) {
        console.error('Failed to fetch audit anomalies:', error);
        throw new Error(`Anomaly detection failed: ${error.message}`);
      }

      return (data || []) as AuditAnomaly[];
    },
    enabled: !!profile?.hospital_id,
  });
}

/**
 * Manually refresh a specific amendment chain (e.g., after new amendment).
 * Usage:
 *   const { data, refetch } = usePrescriptionAmendmentChain(prescriptionId);
 *   await refetch(); // reload after amendment submitted
 */
export function useRefreshAmendmentChain() {
  const queryClient = require('@tanstack/react-query').useQueryClient;
  const qc = queryClient();

  const refreshPrescriptionChain = useCallback(
    (prescriptionId: string) => {
      qc.invalidateQueries({
        queryKey: ['prescription_amendment_chain', prescriptionId],
      });
    },
    [qc]
  );

  const refreshInvoiceTrail = useCallback(
    (invoiceId: string) => {
      qc.invalidateQueries({
        queryKey: ['invoice_audit_trail', invoiceId],
      });
    },
    [qc]
  );

  const refreshLabHistory = useCallback(
    (labResultId: string) => {
      qc.invalidateQueries({
        queryKey: ['lab_result_amendment_history', labResultId],
      });
    },
    [qc]
  );

  return { refreshPrescriptionChain, refreshInvoiceTrail, refreshLabHistory };
}
