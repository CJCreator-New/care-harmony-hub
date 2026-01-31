import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { aiOrchestrator } from '@/lib/ai/orchestrator';
import {
  AIRequest,
  AIResponse,
  AISecurityContext,
  SanitizedPatientData
} from '@/lib/ai/security';
import { captureClinicalError } from '@/lib/monitoring/sentry';

export interface UseAIProps {
  purpose: 'diagnosis' | 'treatment' | 'education' | 'research' | 'length_of_stay' | 'resource_optimization' | 'treatment_plan' | 'recommendations';
  dataRetentionDays?: number;
}

export interface UseAIResult {
  // AI Operations
  diagnosePatient: (patientData: Partial<SanitizedPatientData>, context?: string) => Promise<AIResponse>;
  createTreatmentPlan: (patientData: Partial<SanitizedPatientData>, context?: string) => Promise<AIResponse>;
  generateTreatmentRecommendations: (patientData: Partial<SanitizedPatientData>, diagnoses: string[], context?: string) => Promise<AIResponse>;
  optimizeTreatmentPlan: (params: { patientData: Partial<SanitizedPatientData>, currentPlan: string, diagnoses: string[], criteria: any, context?: string }) => Promise<AIResponse>;
  predictReadmissionRisk: (params: { patientData: Partial<SanitizedPatientData>, context?: string }) => Promise<AIResponse>;
  predictLengthOfStay: (params: { patientData: Partial<SanitizedPatientData>, context?: string }) => Promise<AIResponse>;
  optimizeResourceUtilization: (params: { operationalData: any, context?: string }) => Promise<AIResponse>;
  reviewMedications: (patientData: Partial<SanitizedPatientData>, medications: string[]) => Promise<AIResponse>;
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
 * React hook for HIPAA-compliant AI operations
 * Provides secure interface to AI services with automatic compliance
 */
export function useAI({ purpose, dataRetentionDays = 90 }: UseAIProps): UseAIResult {
  const { hospital, profile } = useAuth();
  const [lastResponse, setLastResponse] = useState<AIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  // Query for compliance status
  const { data: complianceStatus } = useQuery({
    queryKey: ['ai-compliance', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return null;
      return aiOrchestrator.getComplianceStatus(hospital.id);
    },
    enabled: !!hospital?.id,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Create security context
  const createSecurityContext = useCallback((): AISecurityContext => {
    if (!hospital?.id || !profile?.id) {
      throw new Error('Hospital and user context required for AI operations');
    }

    return {
      hospitalId: hospital.id,
      userId: profile.id,
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      purpose,
      dataRetentionDays,
    };
  }, [hospital?.id, profile?.id, purpose, dataRetentionDays]);

  // Generic AI operation handler
  const executeAIOperation = useCallback(async (
    type: AIRequest['type'],
    patientData: Partial<SanitizedPatientData>,
    context?: string,
    additionalOptions?: any
  ): Promise<AIResponse> => {
    if (!hospital?.id || !profile?.id) {
      throw new Error('Authentication required for AI operations');
    }

    setIsLoading(true);
    setError(null);

    try {
      const securityContext = createSecurityContext();

      // Validate compliance before proceeding
      if (complianceStatus?.status === 'violation') {
        throw new Error('AI operations are currently blocked due to compliance violations');
      }

      const request: AIRequest = {
        type,
        patientData: patientData as SanitizedPatientData,
        context: context || '',
        options: additionalOptions,
      };

      const response = await aiOrchestrator.processAIRequest(request, securityContext);

      setLastResponse(response);

      // Invalidate compliance status to refresh
      queryClient.invalidateQueries({ queryKey: ['ai-compliance'] });

      return response;
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);

      captureClinicalError(err as Error, {
        context: 'ai_hook_operation',
        operation: type,
        hospitalId: hospital?.id,
        userId: profile?.id,
      });

      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [hospital?.id, profile?.id, createSecurityContext, complianceStatus, queryClient]);

  // Specific AI operations
  const diagnosePatient = useCallback(async (
    patientData: Partial<SanitizedPatientData>,
    context?: string
  ): Promise<AIResponse> => {
    return executeAIOperation('diagnosis', patientData, context);
  }, [executeAIOperation]);

  const createTreatmentPlan = useCallback(async (
    patientData: Partial<SanitizedPatientData>,
    context?: string
  ): Promise<AIResponse> => {
    return executeAIOperation('treatment_plan', patientData, context);
  }, [executeAIOperation]);

  const generateTreatmentRecommendations = useCallback(async (
    patientData: Partial<SanitizedPatientData>,
    diagnoses: string[],
    context?: string
  ): Promise<AIResponse> => {
    const diagnosesContext = diagnoses.join('\n');
    return executeAIOperation('treatment_recommendations', patientData, diagnosesContext, context);
  }, [executeAIOperation]);

  const optimizeTreatmentPlan = useCallback(async (
    params: { patientData: Partial<SanitizedPatientData>, currentPlan: string, diagnoses: string[], criteria: any, context?: string }
  ): Promise<AIResponse> => {
    const { patientData, currentPlan, diagnoses, criteria, context } = params;
    const optimizationContext = JSON.stringify({
      currentPlan,
      diagnoses,
      criteria,
      context: context || 'treatment plan optimization with outcome prediction'
    });
    return executeAIOperation('treatment_plan_optimization', patientData, optimizationContext, context);
  }, [executeAIOperation]);

  const predictReadmissionRisk = useCallback(async (
    params: { patientData: Partial<SanitizedPatientData>, context?: string }
  ): Promise<AIResponse> => {
    const { patientData, context } = params;
    return executeAIOperation('predict_readmission_risk', patientData, context || '30-day readmission risk prediction', context);
  }, [executeAIOperation]);

  const predictLengthOfStay = useCallback(async (
    params: { patientData: Partial<SanitizedPatientData>, context?: string }
  ): Promise<AIResponse> => {
    const { patientData, context } = params;
    return executeAIOperation('predict_length_of_stay', patientData, context || 'Length of stay forecasting', context);
  }, [executeAIOperation]);

  const optimizeResourceUtilization = useCallback(async (
    params: { operationalData: any, context?: string }
  ): Promise<AIResponse> => {
    const { operationalData, context } = params;
    const operationalContext = JSON.stringify(operationalData);
    return executeAIOperation('resource_utilization_optimization', { id: 'resource_optimization' }, operationalContext, context);
  }, [executeAIOperation]);

  const reviewMedications = useCallback(async (
    patientData: Partial<SanitizedPatientData>,
    medications: string[]
  ): Promise<AIResponse> => {
    const context = `Current medications: ${medications.join(', ')}`;
    return executeAIOperation('medication_review', patientData, context);
  }, [executeAIOperation]);

  const summarizeClinicalData = useCallback(async (
    patientData: Partial<SanitizedPatientData>
  ): Promise<AIResponse> => {
    return executeAIOperation('clinical_summary', patientData);
  }, [executeAIOperation]);

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
    complianceStatus,

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
    queryFn: async () => {
      if (!hospital?.id) return [];
      return aiOrchestrator.getAvailableProviders(hospital.id);
    },
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
          .select(`
            *,
            user:user_id (
              first_name,
              last_name
            )
          `)
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

/**
 * Hook for AI data flow tracking
 */
export function useAIDataFlow(sessionId?: string) {
  const { hospital } = useAuth();

  const { data: dataFlow, isLoading } = useQuery({
    queryKey: ['ai-data-flow', hospital?.id, sessionId],
    queryFn: async () => {
      if (!hospital?.id) return [];

      const query = import('@/integrations/supabase/client').then(({ supabase }) =>
        supabase
          .from('ai_data_flow')
          .select('*')
          .eq('hospital_id', hospital.id)
          .order('stage_timestamp', { ascending: true })
      );

      if (sessionId) {
        query.then(q => q.eq('session_id', sessionId));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!hospital?.id,
  });

  return {
    dataFlow: dataFlow || [],
    isLoading,
  };
}