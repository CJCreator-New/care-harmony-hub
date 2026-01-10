import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { LoincCode } from '@/types/enhancement';

export function useLoincCodes() {
  const { profile } = useAuth();

  // Fetch all LOINC codes (reference data)
  const {
    data: loincCodes,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['loinc-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loinc_codes')
        .select('*')
        .order('component', { ascending: true });

      if (error) throw error;
      return data as LoincCode[];
    },
    enabled: !!profile?.hospital_id,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - reference data doesn't change often
  });

  // Search LOINC codes by component or code
  const searchLoincCodes = (searchTerm: string) => {
    if (!loincCodes || !searchTerm) return [];
    
    const term = searchTerm.toLowerCase();
    return loincCodes.filter(code => 
      code.code.toLowerCase().includes(term) ||
      code.component.toLowerCase().includes(term) ||
      code.system_type?.toLowerCase().includes(term)
    );
  };

  // Get LOINC code by exact code
  const getLoincCode = (code: string) => {
    return loincCodes?.find(loinc => loinc.code === code);
  };

  // Get common lab test codes
  const getCommonLabCodes = () => {
    if (!loincCodes) return [];
    
    const commonCodes = [
      '33747-0', // Hemoglobin
      '4544-3',  // Hematocrit
      '6690-2',  // Leukocytes
      '777-3',   // Platelets
      '2093-3',  // Cholesterol
      '2571-8',  // Triglycerides
      '33914-3', // GFR
      '2160-0',  // Creatinine
      '6299-2',  // BUN
      '4548-4'   // Hemoglobin A1c
    ];
    
    return loincCodes.filter(code => commonCodes.includes(code.code));
  };

  return {
    loincCodes,
    isLoading,
    error,
    refetch,
    searchLoincCodes,
    getLoincCode,
    getCommonLabCodes,
  };
}