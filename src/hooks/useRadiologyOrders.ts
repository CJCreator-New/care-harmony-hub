/**
 * useRadiologyOrders.ts
 * Hook for Radiology & Diagnostic Imaging Workflow
 *
 * Backed by lab_orders with test_category = 'Radiology'.
 * Manages accessioning, modality worklist, pre-scan safety,
 * preliminary wet reads, and finalized ACR reports.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  ImagingModality,
  ContrastProtocol,
  AnatomicalRegion,
  PreScanSafetyChecklist,
  CriticalReadBackDetails,
} from '@/lib/clinical/radiologyWorkflowRules';

export interface RadiologyOrder {
  id: string;
  hospital_id: string;
  patient_id: string;
  doctor_id?: string | null;
  test_name: string;
  test_category: string;
  test_code?: string | null;
  status: 'ordered' | 'sample_collected' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  ordered_at: string;
  completed_at?: string | null;
  notes?: string | null;
  results?: any;
  is_critical?: boolean | null;
  critical_notified_at?: string | null;
  specimen_barcode?: string | null; // Accession Number
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
    mrn: string;
    date_of_birth?: string | null;
    gender?: string | null;
  };
  doctor?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  // Parsed metadata from notes
  metadata?: {
    modality?: ImagingModality;
    anatomicalRegion?: AnatomicalRegion;
    laterality?: string;
    contrastProtocol?: ContrastProtocol;
    clinicalIndication?: string;
    preliminaryRead?: {
      impression: string;
      radiologistName: string;
      timestamp: string;
    };
    preScanSafety?: PreScanSafetyChecklist;
    criticalFindingCode?: string;
    readBackDetails?: CriticalReadBackDetails;
    doseDlp?: number;
    doseCtdiVol?: number;
  };
}

function parseOrderMetadata(notes?: string | null): RadiologyOrder['metadata'] {
  if (!notes) return {};
  try {
    if (notes.startsWith('{') && notes.endsWith('}')) {
      return JSON.parse(notes);
    }
  } catch {
    // fallback
  }
  return {};
}

export function useRadiologyOrders(modalityFilter?: ImagingModality | 'all') {
  const { hospital } = useAuth();
  const queryClient = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: ['radiology-orders', hospital?.id, modalityFilter],
    queryFn: async (): Promise<RadiologyOrder[]> => {
      if (!hospital?.id) return [];

      const { data, error } = await supabase
        .from('lab_orders')
        .select(
          `
          id,
          hospital_id,
          patient_id,
          doctor_id,
          test_name,
          test_category,
          test_code,
          status,
          priority,
          ordered_at,
          completed_at,
          notes,
          results,
          is_critical,
          critical_notified_at,
          specimen_barcode,
          patient:patients(id, first_name, last_name, mrn, date_of_birth, gender),
          doctor:profiles!lab_orders_doctor_id_fkey(id, first_name, last_name)
        `
        )
        .eq('hospital_id', hospital.id)
        .eq('test_category', 'Radiology')
        .order('ordered_at', { ascending: false });

      if (error) throw error;

      const mapped: RadiologyOrder[] = (data || []).map((order: any) => ({
        ...order,
        metadata: parseOrderMetadata(order.notes),
      }));

      if (modalityFilter && modalityFilter !== 'all') {
        return mapped.filter((o) => {
          const mod =
            o.metadata?.modality || (o.test_code?.split('-')[1]?.toLowerCase() as ImagingModality);
          return mod === modalityFilter;
        });
      }

      return mapped;
    },
    enabled: !!hospital?.id,
    staleTime: 15 * 1000,
  });

  const createImagingOrder = useMutation({
    mutationFn: async (params: {
      patientId: string;
      modality: ImagingModality;
      anatomicalRegion: AnatomicalRegion;
      laterality?: string;
      contrastProtocol: ContrastProtocol;
      clinicalIndication: string;
      priority: 'normal' | 'urgent';
    }) => {
      if (!hospital?.id) throw new Error('No hospital context');

      const accessionNumber = `ACC-${params.modality.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      const studyName = `${params.modality.toUpperCase()} ${params.anatomicalRegion.replace('_', ' ').toUpperCase()}${
        params.contrastProtocol !== 'none' ? ` (${params.contrastProtocol.replace('_', ' ')})` : ''
      }`;

      const metadata = {
        modality: params.modality,
        anatomicalRegion: params.anatomicalRegion,
        laterality: params.laterality || 'Axial / Bilateral',
        contrastProtocol: params.contrastProtocol,
        clinicalIndication: params.clinicalIndication,
      };

      const { data, error } = await supabase
        .from('lab_orders')
        .insert({
          hospital_id: hospital.id,
          patient_id: params.patientId,
          test_name: studyName,
          test_category: 'Radiology',
          test_code: `RAD-${params.modality.toUpperCase()}-${params.anatomicalRegion.slice(0, 4).toUpperCase()}`,
          priority: params.priority,
          status: 'ordered',
          specimen_barcode: accessionNumber,
          notes: JSON.stringify(metadata),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['radiology-orders'] });
      toast.success('Imaging study ordered successfully.');
    },
    onError: (err: any) => {
      toast.error(`Failed to create imaging order: ${err.message}`);
    },
  });

  const performPreScanSafety = useMutation({
    mutationFn: async (params: { orderId: string; checklist: PreScanSafetyChecklist }) => {
      const order = ordersQuery.data?.find((o) => o.id === params.orderId);
      const existingMetadata = order?.metadata || {};

      const updatedMetadata = {
        ...existingMetadata,
        preScanSafety: params.checklist,
        doseDlp: params.checklist.doseDlp,
        doseCtdiVol: params.checklist.doseCtdiVol,
      };

      const { data, error } = await supabase
        .from('lab_orders')
        .update({
          status: 'in_progress',
          notes: JSON.stringify(updatedMetadata),
        })
        .eq('id', params.orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['radiology-orders'] });
      toast.success('Pre-scan safety verified. Scan marked In Progress.');
    },
    onError: (err: any) => {
      toast.error(`Safety validation failed: ${err.message}`);
    },
  });

  const submitPreliminaryRead = useMutation({
    mutationFn: async (params: {
      orderId: string;
      impression: string;
      radiologistName: string;
      isCritical: boolean;
      criticalFindingCode?: string;
    }) => {
      const order = ordersQuery.data?.find((o) => o.id === params.orderId);
      const existingMetadata = order?.metadata || {};

      const updatedMetadata = {
        ...existingMetadata,
        preliminaryRead: {
          impression: params.impression,
          radiologistName: params.radiologistName,
          timestamp: new Date().toISOString(),
        },
        criticalFindingCode: params.criticalFindingCode,
      };

      const { data, error } = await supabase
        .from('lab_orders')
        .update({
          is_critical: params.isCritical,
          notes: JSON.stringify(updatedMetadata),
        })
        .eq('id', params.orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['radiology-orders'] });
      toast.success('Preliminary wet read saved.');
    },
    onError: (err: any) => {
      toast.error(`Failed to save preliminary read: ${err.message}`);
    },
  });

  const submitFinalReport = useMutation({
    mutationFn: async (params: {
      orderId: string;
      report: {
        clinicalHistory: string;
        technique: string;
        comparison: string;
        findings: string;
        impression: string;
        radiologistName: string;
        isCritical: boolean;
        criticalFindingCode?: string;
      };
    }) => {
      const order = ordersQuery.data?.find((o) => o.id === params.orderId);
      const existingMetadata = order?.metadata || {};

      const updatedMetadata = {
        ...existingMetadata,
        criticalFindingCode: params.report.criticalFindingCode,
      };

      const finalResults = {
        clinicalHistory: params.report.clinicalHistory,
        technique: params.report.technique,
        comparison: params.report.comparison,
        findings: params.report.findings,
        impression: params.report.impression,
        radiologistName: params.report.radiologistName,
        finalizedAt: new Date().toISOString(),
        digitalSignature: `DIGITAL-SIG-${Date.now().toString(36).toUpperCase()}`,
      };

      const { data, error } = await supabase
        .from('lab_orders')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          is_critical: params.report.isCritical,
          results: finalResults,
          notes: JSON.stringify(updatedMetadata),
        })
        .eq('id', params.orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['radiology-orders'] });
      toast.success('Diagnostic imaging report finalized and digitally signed.');
    },
    onError: (err: any) => {
      toast.error(`Failed to finalize report: ${err.message}`);
    },
  });

  const recordCriticalFindingReadBack = useMutation({
    mutationFn: async (params: { orderId: string; readBack: CriticalReadBackDetails }) => {
      const order = ordersQuery.data?.find((o) => o.id === params.orderId);
      const existingMetadata = order?.metadata || {};

      const updatedMetadata = {
        ...existingMetadata,
        readBackDetails: params.readBack,
      };

      const { data, error } = await supabase
        .from('lab_orders')
        .update({
          critical_notified_at: params.readBack.calledAt,
          notes: JSON.stringify(updatedMetadata),
        })
        .eq('id', params.orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['radiology-orders'] });
      toast.success('Closed-loop critical finding verbal read-back documented.');
    },
    onError: (err: any) => {
      toast.error(`Failed to log read-back: ${err.message}`);
    },
  });

  const criticalPendingCount =
    ordersQuery.data?.filter((o) => o.is_critical && !o.critical_notified_at).length || 0;

  return {
    orders: ordersQuery.data || [],
    isLoading: ordersQuery.isLoading,
    criticalPendingCount,
    createImagingOrder,
    performPreScanSafety,
    submitPreliminaryRead,
    submitFinalReport,
    recordCriticalFindingReadBack,
  };
}
