import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { sanitizeForLog } from '@/utils/sanitize';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReconciliationStatus =
  | 'pending'
  | 'doctor_review'
  | 'pharmacist_review'
  | 'nurse_reconcile'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface HomeMedication {
  name: string;
  dose: string;
  frequency: string;
  route: string;
  indication?: string;
  prescriber?: string;
  last_filled?: string;
}

export interface MedDiscrepancy {
  type: 'omission' | 'commission' | 'dose_change' | 'frequency_change' | 'duplicate' | 'interaction';
  medication: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  description: string;
  status: 'unresolved' | 'resolved' | 'deferred';
  resolved_by?: string;
  resolution_note?: string;
}

export interface AdmissionReconciliationWorkflow {
  id: string;
  hospital_id: string;
  patient_id: string;
  admission_type: 'inpatient' | 'emergency' | 'elective' | 'transfer';
  status: ReconciliationStatus;
  current_step: number;
  initiated_by: string;
  home_medications: HomeMedication[];
  active_orders: unknown[];
  reconciled_list: unknown[] | null;
  discrepancies: MedDiscrepancy[];
  interactions_found: unknown[];
  doctor_reviewed_by: string | null;
  doctor_reviewed_at: string | null;
  pharmacist_reviewed_by: string | null;
  pharmacist_reviewed_at: string | null;
  nurse_reconciled_by: string | null;
  nurse_reconciled_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  patients?: { first_name: string; last_name: string; mrn: string };
}

const WORKFLOW_SELECT = `*, patients ( first_name, last_name, mrn )`;

// ─── Queries ──────────────────────────────────────────────────────────────────

/** List active reconciliation workflows for this hospital. */
export function useAdmissionReconciliations(patientId?: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['admission-reconciliation', profile?.hospital_id, patientId ?? 'all'],
    queryFn: async () => {
      if (!profile?.hospital_id) return [];

      let q = supabase
        .from('medication_reconciliation_workflows')
        .select(WORKFLOW_SELECT)
        .eq('hospital_id', profile.hospital_id)
        .not('status', 'in', '("completed","cancelled")')
        .order('created_at', { ascending: false });

      if (patientId) q = q.eq('patient_id', patientId);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AdmissionReconciliationWorkflow[];
    },
    enabled: !!profile?.hospital_id,
    staleTime: 2 * 60 * 1000,
  });
}

/** Get a single reconciliation workflow. */
export function useAdmissionReconciliation(workflowId?: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['admission-reconciliation', 'detail', workflowId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medication_reconciliation_workflows')
        .select(WORKFLOW_SELECT)
        .eq('id', workflowId!)
        .eq('hospital_id', profile!.hospital_id!)
        .single();
      if (error) throw error;
      return data as AdmissionReconciliationWorkflow;
    },
    enabled: !!workflowId && !!profile?.hospital_id,
  });
}

// ─── Initiate workflow ────────────────────────────────────────────────────────

export function useInitiateAdmissionReconciliation() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      patientId,
      admissionType,
      homeMedications,
      notes,
    }: {
      patientId: string;
      admissionType: AdmissionReconciliationWorkflow['admission_type'];
      homeMedications: HomeMedication[];
      notes?: string;
    }) => {
      if (!profile?.hospital_id || !profile?.id) throw new Error('Not authenticated');

      // Pull current active prescriptions for comparison
      const { data: activePrescriptions } = await supabase
        .from('prescriptions')
        .select('id, medication_name, dosage, frequency, route, status')
        .eq('patient_id', patientId)
        .eq('hospital_id', profile.hospital_id)
        .eq('status', 'active');

      const discrepancies = detectDiscrepancies(
        homeMedications,
        (activePrescriptions ?? []) as Array<{ medication_name: string; dosage: string; frequency: string; route: string }>,
      );

      const { data, error } = await supabase
        .from('medication_reconciliation_workflows')
        .insert({
          hospital_id: profile.hospital_id,
          patient_id: patientId,
          admission_type: admissionType,
          status: 'doctor_review',
          current_step: 1,
          initiated_by: profile.id,
          home_medications: homeMedications as unknown as Record<string, unknown>[],
          active_orders: (activePrescriptions ?? []) as unknown as Record<string, unknown>[],
          discrepancies: discrepancies as unknown as Record<string, unknown>[],
          notes: notes ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as AdmissionReconciliationWorkflow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admission-reconciliation', profile?.hospital_id] });
      const count = data.discrepancies.length;
      if (count > 0) {
        toast.warning(`Reconciliation started — ${count} discrepancy${count > 1 ? 'ies' : 'y'} flagged`, {
          description: 'Doctor review required before admission.',
        });
      } else {
        toast.success('Medication reconciliation initiated', {
          description: 'No immediate discrepancies found.',
        });
      }
    },
    onError: (error: Error) => {
      console.error(sanitizeForLog(`Init reconciliation failed: ${error.message}`));
      toast.error('Failed to initiate reconciliation');
    },
  });
}

// ─── Advance workflow ─────────────────────────────────────────────────────────

type AdvanceAction = 'doctor_review' | 'pharmacist_review' | 'nurse_reconcile' | 'complete' | 'cancel';

const NEXT_STATUS: Record<AdvanceAction, ReconciliationStatus> = {
  doctor_review:     'pharmacist_review',
  pharmacist_review: 'nurse_reconcile',
  nurse_reconcile:   'completed',
  complete:          'completed',
  cancel:            'cancelled',
};

const NEXT_STEP: Record<AdvanceAction, number> = {
  doctor_review:     2,
  pharmacist_review: 3,
  nurse_reconcile:   4,
  complete:          4,
  cancel:            0,
};

export function useAdvanceAdmissionReconciliation() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      workflowId,
      action,
      resolvedDiscrepancies,
      notes,
    }: {
      workflowId: string;
      action: AdvanceAction;
      resolvedDiscrepancies?: Array<Pick<MedDiscrepancy, 'medication' | 'type' | 'status' | 'resolution_note'>>;
      notes?: string;
    }) => {
      const update: Record<string, unknown> = {
        status: NEXT_STATUS[action],
        current_step: NEXT_STEP[action],
        notes: notes ?? null,
      };

      if (action === 'doctor_review') {
        update.doctor_reviewed_by = profile?.id;
        update.doctor_reviewed_at = new Date().toISOString();
      } else if (action === 'pharmacist_review') {
        update.pharmacist_reviewed_by = profile?.id;
        update.pharmacist_reviewed_at = new Date().toISOString();
      } else if (action === 'nurse_reconcile' || action === 'complete') {
        update.nurse_reconciled_by = profile?.id;
        update.nurse_reconciled_at = new Date().toISOString();
      }

      if (resolvedDiscrepancies?.length) {
        const { data: current } = await supabase
          .from('medication_reconciliation_workflows')
          .select('discrepancies')
          .eq('id', workflowId)
          .single();

        const merged = ((current?.discrepancies ?? []) as MedDiscrepancy[]).map(d => {
          const r = resolvedDiscrepancies.find(x => x.medication === d.medication && x.type === d.type);
          return r ? { ...d, ...r } : d;
        });
        update.discrepancies = merged;
      }

      const { data, error } = await supabase
        .from('medication_reconciliation_workflows')
        .update(update)
        .eq('id', workflowId)
        .eq('hospital_id', profile?.hospital_id)
        .select()
        .single();

      if (error) throw error;
      return data as AdmissionReconciliationWorkflow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admission-reconciliation'] });
      const message =
        data.status === 'completed' ? 'Reconciliation completed — medication list finalized.' :
        data.status === 'cancelled' ? 'Reconciliation cancelled.' :
        'Review submitted — workflow advanced.';
      toast.success(data.status === 'completed' ? 'Reconciliation complete' : 'Review submitted', {
        description: message,
      });
    },
    onError: (error: Error) => {
      console.error(sanitizeForLog(`Reconciliation advance failed: ${error.message}`));
      toast.error('Could not advance reconciliation');
    },
  });
}

// ─── Discrepancy detection helper ────────────────────────────────────────────

function detectDiscrepancies(
  home: HomeMedication[],
  active: Array<{ medication_name: string; dosage: string; frequency: string; route: string }>,
): MedDiscrepancy[] {
  const discrepancies: MedDiscrepancy[] = [];

  for (const homeMed of home) {
    const activeMed = active.find(
      a => a.medication_name.toLowerCase() === homeMed.name.toLowerCase()
    );

    if (!activeMed) {
      discrepancies.push({
        type: 'omission',
        medication: homeMed.name,
        severity: 'moderate',
        description: `${homeMed.name} is on the home medication list but missing from active orders.`,
        status: 'unresolved',
      });
      continue;
    }

    if (activeMed.dosage && activeMed.dosage !== homeMed.dose) {
      discrepancies.push({
        type: 'dose_change',
        medication: homeMed.name,
        severity: 'moderate',
        description: `Dose mismatch: home list has ${homeMed.dose}, active order has ${activeMed.dosage}.`,
        status: 'unresolved',
      });
    }

    if (activeMed.frequency && activeMed.frequency !== homeMed.frequency) {
      discrepancies.push({
        type: 'frequency_change',
        medication: homeMed.name,
        severity: 'low',
        description: `Frequency mismatch: home list has ${homeMed.frequency}, active order has ${activeMed.frequency}.`,
        status: 'unresolved',
      });
    }
  }

  // Meds in active orders but not in home list
  for (const activeMed of active) {
    const inHome = home.some(
      h => h.name.toLowerCase() === activeMed.medication_name.toLowerCase()
    );
    if (!inHome) {
      discrepancies.push({
        type: 'commission',
        medication: activeMed.medication_name,
        severity: 'low',
        description: `${activeMed.medication_name} is in active orders but not reported at home.`,
        status: 'unresolved',
      });
    }
  }

  // Duplicate detection within home meds
  const seen = new Set<string>();
  for (const med of home) {
    const key = med.name.toLowerCase();
    if (seen.has(key)) {
      discrepancies.push({
        type: 'duplicate',
        medication: med.name,
        severity: 'high',
        description: `${med.name} appears more than once in the home medication list.`,
        status: 'unresolved',
      });
    }
    seen.add(key);
  }

  return discrepancies;
}
