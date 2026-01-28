import { useState, useCallback } from 'react';
import { automatedResponseService, PersonalizedResponse, PatientContext } from '@/lib/patient/AutomatedResponseService';
import { PatientQuery } from '@/lib/patient/PatientQueryService';

interface UseAutomatedResponseOptions {
  autoGenerate?: boolean;
  patientContext?: PatientContext;
}

interface UseAutomatedResponseReturn {
  response: PersonalizedResponse | null;
  loading: boolean;
  error: string | null;
  generateResponse: (query: PatientQuery) => Promise<void>;
  clearResponse: () => void;
  updateResponse: (updates: Partial<PersonalizedResponse>) => void;
}

export const useAutomatedResponse = (
  options: UseAutomatedResponseOptions = {}
): UseAutomatedResponseReturn => {
  const { autoGenerate = false, patientContext } = options;

  const [response, setResponse] = useState<PersonalizedResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateResponse = useCallback(async (query: PatientQuery) => {
    setLoading(true);
    setError(null);

    try {
      const generatedResponse = await automatedResponseService.generateResponse(
        query,
        patientContext
      );
      setResponse(generatedResponse);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate response';
      setError(errorMessage);
      console.error('Error generating automated response:', err);
    } finally {
      setLoading(false);
    }
  }, [patientContext]);

  const clearResponse = useCallback(() => {
    setResponse(null);
    setError(null);
  }, []);

  const updateResponse = useCallback((updates: Partial<PersonalizedResponse>) => {
    if (response) {
      setResponse({ ...response, ...updates });
    }
  }, [response]);

  return {
    response,
    loading,
    error,
    generateResponse,
    clearResponse,
    updateResponse,
  };
};