import { useState, useCallback } from 'react';
import { patientQueryService, PatientQuery } from '@/lib/patient/PatientQueryService';

export interface UsePatientQueryReturn {
  parseQuery: (query: string) => Promise<PatientQuery>;
  getSuggestedResponses: (query: PatientQuery) => string[];
  loading: boolean;
  error: string | null;
  lastQuery: PatientQuery | null;
}

export const usePatientQuery = (): UsePatientQueryReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<PatientQuery | null>(null);

  const parseQuery = useCallback(async (query: string): Promise<PatientQuery> => {
    setLoading(true);
    setError(null);

    try {
      const result = await patientQueryService.parseQuery(query);
      setLastQuery(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse query';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const getSuggestedResponses = useCallback((query: PatientQuery): string[] => {
    return patientQueryService.getSuggestedResponses(query);
  }, []);

  return {
    parseQuery,
    getSuggestedResponses,
    loading,
    error,
    lastQuery,
  };
};