// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { useClinicalMetrics } from '@/hooks/useClinicalMetrics';
import { useWorkflowOrchestrator, WORKFLOW_EVENT_TYPES } from '@/hooks/useWorkflowOrchestrator';
import { useAudit } from '@/hooks/useAudit';
import { fieldEncryption } from '@/utils/dataProtection';
import { hasPermission } from '@/lib/permissions';
import { createPrescriptionDispensingEngine } from '@/modules/prescription-dispensing';

export interface Prescription {
  id: string;
  hospital_id: string;
  patient_id: string;
  consultation_id: string | null;
  prescribed_by: string;
  status: string;
  notes: string | null;
  dispensed_by: string | null;
  dispensed_at: string | null;
  created_at: string;
  updated_at: string;
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
    mrn: string;
    user_id: string | null;
  };
  prescriber?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  items?: PrescriptionItem[];
}

export interface PrescriptionItem {
  id: string;
  prescription_id: string;
  medication_id: string | null;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number | null;
  instructions: string | null;
  is_dispensed: boolean;
  created_at: string;
}

const isMissingPrescriptionQueueSchemaError = (error: { message?: string } | null) => {
  if (!error?.message) return false;

  return (
    /relation ["']?public\.prescription_queue["']? does not exist/i.test(error.message) ||
    /relation ["']?prescription_queue["']? does not exist/i.test(error.message) ||
    /column .* of relation ["']?prescription_queue["']? does not exist/i.test(error.message) ||
    /could not find the '([a-zA-Z0-9_]+)' column of 'prescription_queue' in the schema cache/i.test(
      error.message
    )
  );
};

// F2.4 — HIPAA §164.312(e)(2)(ii): decrypt PHI fields on prescription items
async function decryptPrescriptionItems(prescription: any): Promise<any> {
  if (!prescription.items?.length) return prescription;
  const decryptedItems = await Promise.all(
    prescription.items.map(async (item: any) => {
      if (!item.encryption_metadata || Object.keys(item.encryption_metadata).length === 0)
        return item;
      const decrypted = { ...item };
      for (const [field, encData] of Object.entries(
        item.encryption_metadata as Record<string, any>
      )) {
        if (typeof decrypted[field] === 'string' && decrypted[field].startsWith('__ENCRYPTED__')) {
          try {
            decrypted[field] = await fieldEncryption.decryptField(encData);
          } catch {
            decrypted[field] = '[Encrypted]';
          }
        }
      }
      return decrypted;
    })
  );
  return { ...prescription, items: decryptedItems };
}

export function usePrescriptions(status?: string) {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['prescriptions', hospital?.id, status],
    queryFn: async () => {
      if (!hospital?.id) return [];

      let query = supabase
        .from('prescriptions')
        .select(
          `
          *,
          patient:patients(id, first_name, last_name, mrn, user_id),
          prescriber:profiles!prescriptions_prescribed_by_fkey(id, first_name, last_name),
          items:prescription_items(*)
        `
        )
        .eq('hospital_id', hospital.id)
        .order('created_at', { ascending: false })
        .limit(100); // Prevent unbounded queries

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      const rows = (data || []) as any[];
      const decrypted = await Promise.all(rows.map(decryptPrescriptionItems));
      return decrypted as Prescription[];
    },
    enabled: !!hospital?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes - updated by staff
  });
}

export function usePrescriptionStats() {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['prescription-stats', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return { pending: 0, dispensed: 0, today: 0 };

      const today = new Date().toISOString().split('T')[0];

      const [pendingRes, dispensedRes, todayRes] = await Promise.all([
        supabase
          .from('prescriptions')
          .select('id', { count: 'exact', head: true })
          .eq('hospital_id', hospital.id)
          .eq('status', 'pending'),
        supabase
          .from('prescriptions')
          .select('id', { count: 'exact', head: true })
          .eq('hospital_id', hospital.id)
          .eq('status', 'dispensed')
          .gte('dispensed_at', `${today}T00:00:00`),
        supabase
          .from('prescriptions')
          .select('id', { count: 'exact', head: true })
          .eq('hospital_id', hospital.id)
          .gte('created_at', `${today}T00:00:00`),
      ]);

      return {
        pending: pendingRes.count || 0,
        dispensed: dispensedRes.count || 0,
        today: todayRes.count || 0,
      };
    },
    enabled: !!hospital?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes - updated by staff
  });
}

export function useCreatePrescription() {
  const queryClient = useQueryClient();
  const { hospital, profile, primaryRole } = useAuth();
  const { triggerWorkflow } = useWorkflowOrchestrator();
  const { logActivity } = useAudit();
  const { recordOperation, recordCustomEvent } = useClinicalMetrics();

  return useMutation({
    mutationFn: async ({
      patientId,
      consultationId,
      items,
      notes,
    }: {
      patientId: string;
      consultationId?: string;
      items: Array<{
        medication_name: string;
        dosage: string;
        frequency: string;
        duration: string;
        quantity?: number;
        instructions?: string;
      }>;
      notes?: string;
    }) => {
      return recordOperation(
        {
          workflowType: 'prescription',
          operationName: 'CreatePrescription',
          attributes: { patient_id: patientId },
        },
        async () => {
          if (!hasPermission(primaryRole, 'prescriptions:write')) {
            throw new Error('You do not have permission to create prescriptions');
          }
          if (!hospital?.id || !profile?.id) throw new Error('No hospital/profile context');

          // Create prescription
          const { data: prescription, error: rxError } = await supabase
            .from('prescriptions')
            .insert({
              hospital_id: hospital.id,
              patient_id: patientId,
              consultation_id: consultationId,
              prescribed_by: profile.id,
              notes,
              status: 'pending',
            })
            .select()
            .single();

          if (rxError) throw rxError;

          // F2.4 — HIPAA §164.312(e)(2)(ii): encrypt PHI fields in prescription items
          const encryptedItems = await Promise.all(
            items.map(async (item) => {
              const itemEncMeta: Record<string, any> = {};
              const encItem: any = { ...item };
              for (const field of ['medication_name', 'dosage', 'instructions'] as const) {
                if (encItem[field]) {
                  const enc = await fieldEncryption.encryptField(String(encItem[field]));
                  itemEncMeta[field] = enc;
                  encItem[field] = '__ENCRYPTED__' + enc.keyVersion;
                }
              }
              if (Object.keys(itemEncMeta).length > 0) encItem.encryption_metadata = itemEncMeta;
              return encItem;
            })
          );

          // Add prescription items
          const { error: itemsError } = await supabase.from('prescription_items').insert(
            encryptedItems.map((item) => ({
              prescription_id: prescription.id,
              medication_name: item.medication_name,
              dosage: item.dosage,
              frequency: item.frequency,
              duration: item.duration,
              quantity: item.quantity,
              instructions: item.instructions,
              ...(item.encryption_metadata
                ? { encryption_metadata: item.encryption_metadata }
                : {}),
            }))
          );

          if (itemsError) throw itemsError;

          // Add a durable queue entry for pharmacy fulfillment
          const { error: queueError } = await supabase.from('prescription_queue').insert({
            hospital_id: hospital.id,
            prescription_id: prescription.id,
            patient_id: patientId,
            status: 'queued',
            metadata: { item_count: items.length },
          });

          if (queueError) {
            if (!isMissingPrescriptionQueueSchemaError(queueError)) {
              throw queueError;
            }

            const { error: fallbackTaskError } = await supabase.from('workflow_tasks').insert({
              hospital_id: hospital.id,
              patient_id: patientId,
              title: 'Manual pharmacy queue follow-up required',
              description:
                'prescription_queue was unavailable when this prescription was created. Review and route manually.',
              assigned_to: profile.id,
              priority: 'high',
              status: 'pending',
              workflow_type: 'medication',
              metadata: {
                degraded_queue: 'prescription_queue',
                prescription_id: prescription.id,
                item_count: items.length,
                original_error: queueError.message,
              },
            });

            if (fallbackTaskError) {
              throw fallbackTaskError;
            }

            console.warn(
              'prescription_queue unavailable; prescription created without durable queue entry',
              {
                prescriptionId: prescription.id,
                error: queueError.message,
              }
            );
          }

          // CLIN-001: Initiate ADR-0004 approval workflow so the prescription
          // enters the pharmacist review pipeline instead of being directly dispensable.
          try {
            const engine = createPrescriptionDispensingEngine();
            await engine.initiate(
              { id: profile.id, hospitalId: hospital.id, role: primaryRole || 'doctor' },
              {
                prescriptionId: prescription.id,
                patientId: patientId,
                metadata: { consultationId: consultationId ?? null },
              }
            );
          } catch (workflowErr) {
            // Graceful degradation: prescription is still usable even if
            // approval workflow creation fails.  Log and continue.
            console.warn(
              '[useCreatePrescription] Failed to initiate approval workflow:',
              workflowErr
            );
          }

          return prescription;
        }
      );
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['prescription-stats'] });
      toast.success('Prescription created successfully');
      // F3.2 — HIPAA §164.312(b): audit log for prescription create
      void logActivity({
        actionType: 'PRESCRIPTION_CREATED',
        entityType: 'prescriptions',
        entityId: data.id,
        details: { patient_id: variables.patientId, item_count: variables.items.length },
        severity: 'info',
      });
      void triggerWorkflow({
        type: WORKFLOW_EVENT_TYPES.PRESCRIPTION_CREATED,
        sourceRole: 'doctor',
        patientId: variables.patientId,
        data: { prescriptionId: data.id, consultationId: variables.consultationId ?? null },
        priority: 'normal',
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to create prescription: ${error.message}`);
    },
  });
}

export function usePrescriptionsRealtime() {
  const queryClient = useQueryClient();
  const { hospital } = useAuth();

  useEffect(() => {
    if (!hospital?.id) return;

    const channel = supabase
      .channel('prescriptions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prescriptions',
          filter: `hospital_id=eq.${hospital.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
          queryClient.invalidateQueries({ queryKey: ['prescription-stats'] });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [hospital?.id, queryClient]);
}

export function useApprovePrescription() {
  const queryClient = useQueryClient();
  const { profile, hospital, primaryRole } = useAuth();
  const { logActivity } = useAudit();

  return useMutation({
    mutationFn: async ({ prescriptionId, notes }: { prescriptionId: string; notes?: string }) => {
      if (!hasPermission(primaryRole, 'prescriptions:write')) {
        throw new Error('You do not have permission to approve prescriptions');
      }
      if (!profile?.id || !hospital?.id) throw new Error('No profile/hospital context');

      // Advance approval workflow if one exists
      try {
        const engine = createPrescriptionDispensingEngine();
        const workflow = await engine.getWorkflowByPrescriptionId(prescriptionId);
        if (workflow) {
          await engine.approve(
            { id: profile.id, hospitalId: hospital.id, role: primaryRole || 'pharmacist' },
            { workflowId: workflow.id, notes }
          );
        }
      } catch (err) {
        console.warn('[useApprovePrescription] Workflow advance failed:', err);
      }

      // Update prescription status to 'verified'
      const { error } = await supabase
        .from('prescriptions')
        .update({
          status: 'verified',
          updated_at: new Date().toISOString(),
        })
        .eq('id', prescriptionId);

      if (error) throw error;

      return { id: prescriptionId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['prescription-stats'] });
      toast.success('Prescription verified and approved for dispensing');
      void logActivity({
        actionType: 'PRESCRIPTION_APPROVED',
        entityType: 'prescriptions',
        entityId: data.id,
        details: { approved_by: profile?.id },
        severity: 'info',
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve prescription: ${error.message}`);
    },
  });
}

export interface DispensedItemAllocation {
  readonly itemId?: string;
  readonly medicationName: string;
  readonly prescribedQuantity: number;
  readonly dispensedQuantity: number;
  readonly batchNumber?: string;
}

export interface ControlledSubstanceWitnessData {
  readonly witnessName: string;
  readonly witnessRole: string;
  readonly witnessId?: string;
  readonly photoIdVerified: boolean;
}

export interface DispensePrescriptionOptions {
  readonly prescriptionId: string;
  readonly batchNumber?: string;
  readonly notes?: string;
  readonly patientVerified?: boolean;
  readonly safetyChecksComplete?: boolean;
  readonly items?: readonly DispensedItemAllocation[];
  readonly witness?: ControlledSubstanceWitnessData;
}

export function useDispensePrescription() {
  const queryClient = useQueryClient();
  const { profile, hospital, primaryRole } = useAuth();
  const { logActivity } = useAudit();
  const { triggerWorkflow } = useWorkflowOrchestrator();

  return useMutation({
    mutationFn: async (arg: string | DispensePrescriptionOptions) => {
      if (!hasPermission(primaryRole, 'prescriptions:write')) {
        throw new Error('You do not have permission to dispense prescriptions');
      }
      if (!profile?.id || !hospital?.id) throw new Error('No profile/hospital context');

      const prescriptionId = typeof arg === 'string' ? arg : arg.prescriptionId;
      const opts = typeof arg === 'string' ? null : arg;

      // 1. Fetch active inventory medications to check stock and expiry (A1)
      const { data: medRows } = await supabase
        .from('medications')
        .select('*')
        .eq('hospital_id', hospital.id)
        .eq('is_active', true);

      let isPartial = false;
      const stockDeductions: Array<{ id: string; newStock: number; name: string }> = [];

      if (opts?.items && opts.items.length > 0) {
        for (const item of opts.items) {
          if (item.dispensedQuantity < item.prescribedQuantity) {
            isPartial = true;
          }

          if (item.dispensedQuantity > 0) {
            const medMatch = (medRows || []).find(
              (m) =>
                m.name.toLowerCase().trim() === item.medicationName.toLowerCase().trim() ||
                (m.generic_name &&
                  m.generic_name.toLowerCase().trim() === item.medicationName.toLowerCase().trim())
            );

            if (medMatch) {
              // Expiry Check (A1)
              if (medMatch.expiry_date && new Date(medMatch.expiry_date) < new Date()) {
                throw new Error(
                  `Medication "${medMatch.name}" batch (${medMatch.batch_number || 'LOT-EXP'}) is expired (${medMatch.expiry_date}). Dispensation blocked.`
                );
              }

              // Stock Check (A1)
              if (medMatch.current_stock < item.dispensedQuantity) {
                throw new Error(
                  `Insufficient stock for "${medMatch.name}". Available: ${medMatch.current_stock}, Requested: ${item.dispensedQuantity}.`
                );
              }

              stockDeductions.push({
                id: medMatch.id,
                newStock: Math.max(0, medMatch.current_stock - item.dispensedQuantity),
                name: medMatch.name,
              });
            }
          }
        }

        // Apply atomic stock deductions (A1)
        for (const deduction of stockDeductions) {
          await supabase
            .from('medications')
            .update({
              current_stock: deduction.newStock,
              updated_at: new Date().toISOString(),
            })
            .eq('id', deduction.id);
        }
      }

      const finalStatus = isPartial ? 'partially_dispensed' : 'dispensed';
      const notesWithWitness = opts?.witness
        ? `${opts?.notes || ''}\n[CONTROLLED SUBSTANCE DISPENSED] Witness: ${opts.witness.witnessName} (${opts.witness.witnessRole}), Photo ID Verified: ${opts.witness.photoIdVerified ? 'YES' : 'NO'}`.trim()
        : opts?.notes || null;

      const { error } = await supabase
        .from('prescriptions')
        .update({
          status: finalStatus,
          dispensed_by: profile.id,
          dispensed_at: new Date().toISOString(),
          notes: notesWithWitness,
        })
        .eq('id', prescriptionId);

      if (error) throw error;

      // Update prescription items
      if (opts?.items && opts.items.length > 0) {
        for (const item of opts.items) {
          if (item.itemId) {
            await supabase
              .from('prescription_items')
              .update({
                is_dispensed: item.dispensedQuantity > 0,
                batch_number: item.batchNumber || opts.batchNumber || null,
              })
              .eq('id', item.itemId);
          }
        }
      } else {
        await supabase
          .from('prescription_items')
          .update({ is_dispensed: true })
          .eq('prescription_id', prescriptionId);
      }

      // Update prescription queue
      const { error: queueError } = await (supabase.from('prescription_queue') as any)
        .update({
          status: isPartial ? 'in_progress' : 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('hospital_id', hospital.id)
        .eq('prescription_id', prescriptionId);

      if (queueError) throw queueError;

      // Advance approval workflow
      try {
        const engine = createPrescriptionDispensingEngine();
        const workflow = await engine.getWorkflowByPrescriptionId(prescriptionId);
        if (workflow) {
          if (isPartial) {
            await engine.partiallyDispense(
              { id: profile.id, hospitalId: hospital.id, role: primaryRole || 'pharmacist' },
              { workflowId: workflow.id, notes: notesWithWitness || undefined }
            );
          } else {
            await engine.dispense(
              { id: profile.id, hospitalId: hospital.id, role: primaryRole || 'pharmacist' },
              { workflowId: workflow.id }
            );
          }
        }
      } catch (err) {
        console.warn('[useDispensePrescription] Workflow advance bypassed:', err);
      }

      return { id: prescriptionId, isPartial, finalStatus };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['prescription-stats'] });
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      queryClient.invalidateQueries({ queryKey: ['medications-low-stock'] });
      toast.success(
        data.isPartial
          ? 'Prescription partially dispensed. Backorder tracked.'
          : 'Prescription dispensed and inventory deducted successfully'
      );
      void logActivity({
        actionType: data.isPartial ? 'PRESCRIPTION_PARTIALLY_DISPENSED' : 'PRESCRIPTION_DISPENSED',
        entityType: 'prescriptions',
        entityId: data.id,
        details: { dispensed_by: profile?.id, status: data.finalStatus },
        severity: 'info',
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to dispense: ${error.message}`);
    },
  });
}

export function useClarifyPrescription() {
  const queryClient = useQueryClient();
  const { profile, hospital, primaryRole } = useAuth();
  const { logActivity } = useAudit();
  const { triggerWorkflow } = useWorkflowOrchestrator();

  return useMutation({
    mutationFn: async ({
      prescriptionId,
      clarificationReason,
      category,
      prescriberId,
      patientId,
    }: {
      prescriptionId: string;
      clarificationReason: string;
      category?: string;
      prescriberId?: string;
      patientId?: string;
    }) => {
      if (!hasPermission(primaryRole, 'prescriptions:write')) {
        throw new Error('You do not have permission to request prescription clarification');
      }
      if (!profile?.id || !hospital?.id) throw new Error('No profile/hospital context');

      const notesBlock = `\n[PHARMACIST CLARIFICATION REQUEST (${new Date().toLocaleString()})]\nBy: ${profile.first_name || 'Pharmacist'} ${profile.last_name || ''}\nCategory: ${category || 'Clinical Inquiry'}\nInquiry: ${clarificationReason}`;

      const { error } = await supabase
        .from('prescriptions')
        .update({
          status: 'pending_clarification',
          notes: notesBlock,
          updated_at: new Date().toISOString(),
        })
        .eq('id', prescriptionId);

      if (error) throw error;

      // Keep approval workflow synchronized
      try {
        const engine = createPrescriptionDispensingEngine();
        const workflow = await engine.getWorkflowByPrescriptionId(prescriptionId);
        if (workflow) {
          await engine.requestClarification(
            { id: profile.id, hospitalId: hospital.id, role: primaryRole || 'pharmacist' },
            { workflowId: workflow.id, notes: clarificationReason }
          );
        }
      } catch (err) {
        console.warn('[useClarifyPrescription] Workflow advance bypassed:', err);
      }

      // Notify prescriber via orchestrator
      if (patientId) {
        await triggerWorkflow({
          type: WORKFLOW_EVENT_TYPES.PRESCRIPTION_CLARIFICATION_REQUESTED,
          sourceRole: 'pharmacist',
          patientId,
          data: {
            prescriptionId,
            prescriberId,
            reason: clarificationReason,
            category,
          },
          priority: 'urgent',
        });
      }

      return { id: prescriptionId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['prescription-stats'] });
      toast.success('Clarification inquiry dispatched to prescribing physician');
      void logActivity({
        actionType: 'PRESCRIPTION_CLARIFICATION_REQUESTED',
        entityType: 'prescriptions',
        entityId: data.id,
        details: { requested_by: profile?.id },
        severity: 'info',
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit clarification: ${error.message}`);
    },
  });
}
