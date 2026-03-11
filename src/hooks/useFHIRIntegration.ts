import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type FHIRResourceType =
  | 'Patient'
  | 'Observation'
  | 'Encounter'
  | 'OperationOutcome';

interface OperationOutcomeIssue {
  severity?: string;
  code?: string;
  diagnostics?: string;
}

interface OperationOutcome {
  resourceType: 'OperationOutcome';
  issue?: OperationOutcomeIssue[];
}

export interface FHIRPatient {
  resourceType: 'Patient';
  id?: string;
  identifier?: Array<{ system?: string; value?: string }>;
  name?: Array<{ family?: string; given?: string[] }>;
  telecom?: Array<{ system?: string; value?: string }>;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  address?: Array<{ line?: string[]; city?: string; state?: string; postalCode?: string }>;
  meta?: { versionId?: string; lastUpdated?: string };
}

interface ImportPatientPayload {
  fhirPatient: FHIRPatient;
  hospitalId: string;
  mrn?: string;
}

function extractOperationOutcomeDiagnostics(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;

  const maybeResourceType = (payload as { resourceType?: unknown }).resourceType;
  if (maybeResourceType !== 'OperationOutcome') return null;

  const issues = (payload as OperationOutcome).issue;
  if (!Array.isArray(issues) || issues.length === 0) return null;

  const diagnostics = issues
    .map((issue) => issue?.diagnostics?.trim())
    .filter((message): message is string => Boolean(message));

  return diagnostics.length > 0 ? diagnostics.join(' | ') : null;
}

async function toReadableInvokeError(error: unknown): Promise<Error> {
  const fallbackMessage =
    error instanceof Error ? error.message : 'FHIR integration request failed.';

  const maybeError = error as {
    context?: { json?: () => Promise<unknown>; text?: () => Promise<string> };
  };

  if (maybeError?.context?.json) {
    try {
      const body = await maybeError.context.json();
      const operationOutcomeMessage = extractOperationOutcomeDiagnostics(body);
      if (operationOutcomeMessage) return new Error(operationOutcomeMessage);

      if (body && typeof body === 'object') {
        const genericError = (body as { error?: unknown }).error;
        if (typeof genericError === 'string' && genericError.trim()) {
          return new Error(genericError.trim());
        }
      }
    } catch {
      // Continue to generic fallbacks.
    }
  }

  if (maybeError?.context?.text) {
    try {
      const text = await maybeError.context.text();
      if (text?.trim()) return new Error(text.trim());
    } catch {
      // Continue to fallback message.
    }
  }

  return new Error(fallbackMessage);
}

async function invokeFHIRAction<T>(
  action: string,
  data: Record<string, unknown>,
): Promise<T> {
  const { data: responseData, error } = await supabase.functions.invoke('fhir-integration', {
    body: { action, data },
  });

  if (error) {
    throw await toReadableInvokeError(error);
  }

  return responseData as T;
}

export function useFHIRIntegration() {
  const exportPatient = useMutation({
    mutationFn: async (patientId: string) => {
      // F4.2 — HIPAA §164.508: verify data-sharing consent before FHIR export
      const { data: consent, error: consentError } = await supabase
        .from('patient_consents')
        .select('data_sharing_consent')
        .eq('patient_id', patientId)
        .maybeSingle();

      if (consentError || !consent?.data_sharing_consent) {
        throw new Error('Patient data sharing consent not recorded. Cannot export FHIR data.');
      }

      return invokeFHIRAction<FHIRPatient>('export_patient', { patient_id: patientId });
    },
  });

  const importPatient = useMutation({
    mutationFn: async ({ fhirPatient, hospitalId, mrn }: ImportPatientPayload) => {
      return invokeFHIRAction<FHIRPatient | OperationOutcome>('import_patient', {
        fhir_patient: fhirPatient,
        hospital_id: hospitalId,
        mrn,
      });
    },
  });

  const syncObservations = useMutation({
    mutationFn: async ({ patientId, observations }: { patientId: string; observations: any[] }) => {
      return invokeFHIRAction<{ resourceType?: FHIRResourceType }>('sync_observations', {
        patient_id: patientId,
        observations,
      });
    },
  });

  const exportEncounter = useMutation({
    mutationFn: async (consultationId: string) => {
      return invokeFHIRAction<{ resourceType?: FHIRResourceType }>('export_encounter', {
        consultation_id: consultationId,
      });
    },
  });

  return {
    exportPatient: exportPatient.mutate,
    importPatient: importPatient.mutate,
    importPatientAsync: importPatient.mutateAsync,
    syncObservations: syncObservations.mutate,
    exportEncounter: exportEncounter.mutate,
    isExporting: exportPatient.isPending,
    isImporting: importPatient.isPending,
    isSyncing: syncObservations.isPending,
  };
}
