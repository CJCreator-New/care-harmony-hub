import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import type { SanitizedPatientData } from '@/lib/ai/security';

type AIRequest = {
  type: string;
  patientData: SanitizedPatientData;
  context: string;
  options?: any;
};
type AIResponse = any;

/**
 * Generative AI operations used to call OpenAI/Anthropic directly from the
 * browser with keys inlined from VITE_* env vars (SECF-03). That path has been
 * removed: provider credentials may only live in edge-function secrets, and no
 * edge function yet offers an equivalent free-text clinical AI operation.
 * Until one exists, every operation below fails with this message.
 */
export const AI_UNAVAILABLE_MESSAGE =
  'AI-assisted analysis is currently unavailable. It must be provided by a server-side service and has not been enabled for this deployment.';

export class AIUnavailableError extends Error {
  constructor() {
    super(AI_UNAVAILABLE_MESSAGE);
    this.name = 'AIUnavailableError';
  }
}

async function fetchComplianceStatus(hospitalId: string): Promise<{
  status: 'compliant' | 'warning' | 'violation';
  issues: string[];
  lastAudit: Date | null;
}> {
  try {
    const { data: audit } = await supabase
      .from('ai_security_audit' as any)
      .select('compliance_status, timestamp')
      .eq('hospital_id', hospitalId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    const row = audit as { compliance_status?: string; timestamp?: string } | null;
    if (!row) {
      return { status: 'warning', issues: ['No AI operations audited yet'], lastAudit: null };
    }

    const status = row.compliance_status as 'compliant' | 'warning' | 'violation';
    const issues =
      status === 'violation' ? ['Compliance violations detected in recent AI operations'] : [];
    return { status, issues, lastAudit: row.timestamp ? new Date(row.timestamp) : null };
  } catch {
    return { status: 'warning', issues: ['Unable to retrieve compliance status'], lastAudit: null };
  }
}

export interface UseAIProps {
  purpose:
    | 'diagnosis'
    | 'treatment'
    | 'education'
    | 'research'
    | 'length_of_stay'
    | 'resource_optimization'
    | 'treatment_plan'
    | 'recommendations';
  dataRetentionDays?: number;
}

export interface UseAIResult {
  // AI Operations
  diagnosePatient: (
    patientData: Partial<SanitizedPatientData>,
    context?: string
  ) => Promise<AIResponse>;
  createTreatmentPlan: (
    patientData: Partial<SanitizedPatientData>,
    context?: string
  ) => Promise<AIResponse>;
  generateTreatmentRecommendations: (
    patientData: Partial<SanitizedPatientData>,
    diagnoses: string[],
    context?: string
  ) => Promise<AIResponse>;
  optimizeTreatmentPlan: (params: {
    patientData: Partial<SanitizedPatientData>;
    currentPlan: string;
    diagnoses: string[];
    criteria: any;
    context?: string;
  }) => Promise<AIResponse>;
  predictReadmissionRisk: (params: {
    patientData: Partial<SanitizedPatientData>;
    context?: string;
  }) => Promise<AIResponse>;
  predictLengthOfStay: (params: {
    patientData: Partial<SanitizedPatientData>;
    context?: string;
  }) => Promise<AIResponse>;
  optimizeResourceUtilization: (params: {
    operationalData: any;
    context?: string;
  }) => Promise<AIResponse>;
  reviewMedications: (
    patientData: Partial<SanitizedPatientData>,
    medications: string[]
  ) => Promise<AIResponse>;
  summarizeClinicalData: (patientData: Partial<SanitizedPatientData>) => Promise<AIResponse>;

  // Status and Monitoring
  isLoading: boolean;
  lastResponse: AIResponse | null;
  error: string | null;

  // Compliance
  complianceStatus: {
    status: 'compliant' | 'warning' | 'violation';
    issues: string[];
    lastAudit: Date | null;
  } | null;

  // Utilities
  clearError: () => void;
  reset: () => void;
}

/**
 * React hook for AI operations. Operations currently reject with
 * AIUnavailableError (see AI_UNAVAILABLE_MESSAGE); `error` carries the message
 * so callers can render an "unavailable" state.
 */
export function useAI(_options: UseAIProps): UseAIResult {
  const { hospital, profile } = useAuth();
  const [lastResponse, setLastResponse] = useState<AIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Query for compliance status
  const { data: complianceStatus } = useQuery({
    queryKey: ['ai-compliance', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return null;
      return fetchComplianceStatus(hospital.id);
    },
    enabled: !!hospital?.id,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Generic AI operation handler
  const executeAIOperation = useCallback(
    async (
      type: AIRequest['type'],
      patientData: Partial<SanitizedPatientData>,
      context?: string,
      additionalOptions?: any
    ): Promise<AIResponse> => {
      if (!hospital?.id || !profile?.id) {
        const authError = 'Authentication required for AI operations';
        setError(authError);
        throw new Error(authError);
      }

      // No browser-side AI provider path exists any more (SECF-03).
      const unavailable = new AIUnavailableError();
      setLastResponse(null);
      setError(unavailable.message);
      throw unavailable;
    },
    [hospital?.id, profile?.id]
  );

  // Specific AI operations
  const diagnosePatient = useCallback(
    async (patientData: Partial<SanitizedPatientData>, context?: string): Promise<AIResponse> => {
      return executeAIOperation('diagnosis', patientData, context);
    },
    [executeAIOperation]
  );

  const createTreatmentPlan = useCallback(
    async (patientData: Partial<SanitizedPatientData>, context?: string): Promise<AIResponse> => {
      return executeAIOperation('treatment_plan', patientData, context);
    },
    [executeAIOperation]
  );

  const generateTreatmentRecommendations = useCallback(
    async (
      patientData: Partial<SanitizedPatientData>,
      diagnoses: string[],
      context?: string
    ): Promise<AIResponse> => {
      const diagnosesContext = diagnoses.join('\n');
      return executeAIOperation(
        'treatment_recommendations',
        patientData,
        diagnosesContext,
        context
      );
    },
    [executeAIOperation]
  );

  const optimizeTreatmentPlan = useCallback(
    async (params: {
      patientData: Partial<SanitizedPatientData>;
      currentPlan: string;
      diagnoses: string[];
      criteria: any;
      context?: string;
    }): Promise<AIResponse> => {
      const { patientData, currentPlan, diagnoses, criteria, context } = params;
      const optimizationContext = JSON.stringify({
        currentPlan,
        diagnoses,
        criteria,
        context: context || 'treatment plan optimization with outcome prediction',
      });
      return executeAIOperation(
        'treatment_plan_optimization',
        patientData,
        optimizationContext,
        context
      );
    },
    [executeAIOperation]
  );

  const predictReadmissionRisk = useCallback(
    async (params: {
      patientData: Partial<SanitizedPatientData>;
      context?: string;
    }): Promise<AIResponse> => {
      const { patientData, context } = params;
      return executeAIOperation(
        'predict_readmission_risk',
        patientData,
        context || '30-day readmission risk prediction',
        context
      );
    },
    [executeAIOperation]
  );

  const predictLengthOfStay = useCallback(
    async (params: {
      patientData: Partial<SanitizedPatientData>;
      context?: string;
    }): Promise<AIResponse> => {
      const { patientData, context } = params;
      return executeAIOperation(
        'predict_length_of_stay',
        patientData,
        context || 'Length of stay forecasting',
        context
      );
    },
    [executeAIOperation]
  );

  const optimizeResourceUtilization = useCallback(
    async (params: { operationalData: any; context?: string }): Promise<AIResponse> => {
      const { operationalData, context } = params;
      const operationalContext = JSON.stringify(operationalData);
      return executeAIOperation(
        'resource_utilization_optimization',
        { id: 'resource_optimization' },
        operationalContext,
        context
      );
    },
    [executeAIOperation]
  );

  const reviewMedications = useCallback(
    async (
      patientData: Partial<SanitizedPatientData>,
      medications: string[]
    ): Promise<AIResponse> => {
      const context = `Current medications: ${medications.join(', ')}`;
      return executeAIOperation('medication_review', patientData, context);
    },
    [executeAIOperation]
  );

  const summarizeClinicalData = useCallback(
    async (patientData: Partial<SanitizedPatientData>): Promise<AIResponse> => {
      return executeAIOperation('clinical_summary', patientData);
    },
    [executeAIOperation]
  );

  // Utility functions
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setLastResponse(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    // AI Operations
    diagnosePatient,
    createTreatmentPlan,
    generateTreatmentRecommendations,
    optimizeTreatmentPlan,
    predictReadmissionRisk,
    predictLengthOfStay,
    optimizeResourceUtilization,
    reviewMedications,
    summarizeClinicalData,

    // Status
    isLoading,
    lastResponse,
    error,

    // Compliance
    complianceStatus: complianceStatus ?? null,

    // Utilities
    clearError,
    reset,
  };
}

/**
 * Hook for AI provider management
 */
export function useAIProviders() {
  const { hospital } = useAuth();

  const { data: providers, isLoading } = useQuery({
    queryKey: ['ai-providers', hospital?.id],
    // Browser-side AI providers were removed (SECF-03); none are available.
    queryFn: async (): Promise<{ name: string; model: string; status: string }[]> => [],
    enabled: !!hospital?.id,
  });

  return {
    providers: providers || [],
    isLoading,
  };
}

/**
 * Hook for AI operation history and audit
 */
export function useAIAudit() {
  const { hospital } = useAuth();

  const { data: auditHistory, isLoading } = useQuery({
    queryKey: ['ai-audit', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];

      const { data, error } = await import('@/integrations/supabase/client').then(({ supabase }) =>
        supabase
          .from('ai_security_audit')
          .select(
            `
            *,
            user:user_id (
              first_name,
              last_name
            )
          `
          )
          .eq('hospital_id', hospital.id)
          .order('timestamp', { ascending: false })
          .limit(50)
      );

      if (error) throw error;
      return data || [];
    },
    enabled: !!hospital?.id,
  });

  return {
    auditHistory: auditHistory || [],
    isLoading,
  };
}
