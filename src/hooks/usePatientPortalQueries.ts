/**
 * Typed TanStack Query hooks for the patient portal.
 * T-44 — replaces the monolithic state-based usePatientPortal hooks with
 * properly typed React Query hooks that return `{ data, isLoading, error }`.
 *
 * Use these in new components. The old hooks in usePatientPortal.ts remain
 * for backward compatibility until all callers are migrated.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolvePatientIdByAuthUserId } from '@/services/identityResolver';
import { useAuth } from '@/contexts/AuthContext';

// ─── Shared patient-id resolver ───────────────────────────────────────────────

async function resolvePatientId(
  profile: { user_id?: string | null } | null | undefined,
  explicitPatientId?: string
): Promise<string | null> {
  if (explicitPatientId) return explicitPatientId;
  if (!profile?.user_id) return null;
  return resolvePatientIdByAuthUserId(profile.user_id);
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export function usePatientAppointmentsQuery(patientId?: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['patient-appointments-query', profile?.user_id, patientId],
    queryFn: async () => {
      const pid = await resolvePatientId(profile, patientId);
      if (!pid) return [];

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          doctor:profiles!appointments_doctor_id_fkey(id, first_name, last_name)
        `)
        .eq('patient_id', pid)
        .order('scheduled_date', { ascending: false })
        .order('scheduled_time', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.user_id || !!patientId,
  });
}

// ─── Prescriptions ────────────────────────────────────────────────────────────

export function usePatientPrescriptionsQuery(patientId?: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['patient-prescriptions-query', profile?.user_id, patientId],
    queryFn: async () => {
      const pid = await resolvePatientId(profile, patientId);
      if (!pid) return [];

      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          *,
          prescriber:profiles!prescriptions_prescribed_by_fkey(id, first_name, last_name),
          items:prescription_items(
            id, medication_name, dosage, frequency, duration, quantity, instructions, is_dispensed
          )
        `)
        .eq('patient_id', pid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.user_id || !!patientId,
  });
}

// ─── Lab Orders ───────────────────────────────────────────────────────────────

export function usePatientLabOrdersQuery(patientId?: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['patient-lab-orders-query', profile?.user_id, patientId],
    queryFn: async () => {
      const pid = await resolvePatientId(profile, patientId);
      if (!pid) return [];

      const { data, error } = await supabase
        .from('lab_orders')
        .select(`
          *,
          ordered_by:profiles!lab_orders_ordered_by_fkey(id, first_name, last_name)
        `)
        .eq('patient_id', pid)
        .order('ordered_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.user_id || !!patientId,
  });
}

// ─── Vitals ───────────────────────────────────────────────────────────────────

export function usePatientVitalsQuery(patientId?: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['patient-vitals-query', profile?.user_id, patientId],
    queryFn: async () => {
      const pid = await resolvePatientId(profile, patientId);
      if (!pid) return [];

      const { data, error } = await supabase
        .from('vital_signs')
        .select('*')
        .eq('patient_id', pid)
        .order('recorded_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.user_id || !!patientId,
  });
}

// ─── Billing ──────────────────────────────────────────────────────────────────

export function usePatientBillingQuery(patientId?: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['patient-billing-query', profile?.user_id, patientId],
    queryFn: async () => {
      const pid = await resolvePatientId(profile, patientId);
      if (!pid) return { invoices: [], payments: [] };

      const [invoicesRes, paymentsRes] = await Promise.all([
        supabase
          .from('invoices')
          .select(`
            *,
            items:invoice_items(id, description, quantity, unit_price, total_price)
          `)
          .eq('patient_id', pid)
          .order('created_at', { ascending: false }),

        supabase
          .from('payments')
          .select('*')
          .eq('patient_id', pid)
          .order('payment_date', { ascending: false }),
      ]);

      if (invoicesRes.error) throw invoicesRes.error;
      if (paymentsRes.error) throw paymentsRes.error;

      return {
        invoices: invoicesRes.data ?? [],
        payments: paymentsRes.data ?? [],
      };
    },
    enabled: !!profile?.user_id || !!patientId,
  });
}
