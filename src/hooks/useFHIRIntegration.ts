import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface FHIRPatient {
  resourceType: "Patient";
  id?: string;
  identifier: Array<{ system: string; value: string }>;
  name: Array<{ family: string; given: string[] }>;
  telecom: Array<{ system: string; value: string }>;
  gender: "male" | "female" | "other" | "unknown";
  birthDate: string;
  address: Array<{ line: string[]; city: string; state: string; postalCode: string }>;
}

export function useFHIRIntegration() {
  const exportPatient = useMutation({
    mutationFn: async (patientId: string) => {
      const { data, error } = await supabase.functions.invoke('fhir-integration', {
        body: { action: 'export_patient', data: { patient_id: patientId } }
      });
      if (error) throw error;
      return data as FHIRPatient;
    },
  });

  const importPatient = useMutation({
    mutationFn: async (fhirPatient: FHIRPatient) => {
      const { data, error } = await supabase.functions.invoke('fhir-integration', {
        body: { action: 'import_patient', data: { fhir_patient: fhirPatient } }
      });
      if (error) throw error;
      return data;
    },
  });

  const syncObservations = useMutation({
    mutationFn: async ({ patientId, observations }: { patientId: string; observations: any[] }) => {
      const { data, error } = await supabase.functions.invoke('fhir-integration', {
        body: { action: 'sync_observations', data: { patient_id: patientId, observations } }
      });
      if (error) throw error;
      return data;
    },
  });

  const exportEncounter = useMutation({
    mutationFn: async (consultationId: string) => {
      const { data, error } = await supabase.functions.invoke('fhir-integration', {
        body: { action: 'export_encounter', data: { consultation_id: consultationId } }
      });
      if (error) throw error;
      return data;
    },
  });

  return {
    exportPatient: exportPatient.mutate,
    importPatient: importPatient.mutate,
    syncObservations: syncObservations.mutate,
    exportEncounter: exportEncounter.mutate,
    isExporting: exportPatient.isPending,
    isImporting: importPatient.isPending,
    isSyncing: syncObservations.isPending,
  };
}