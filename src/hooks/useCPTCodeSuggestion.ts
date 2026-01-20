import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CPTCode {
  code: string;
  description: string;
  category: string;
  typical_fee: number;
}

export function useCPTCodeSuggestion(diagnosis?: string, procedureType?: string) {
  return useQuery({
    queryKey: ['cpt-suggestions', diagnosis, procedureType],
    queryFn: async () => {
      if (!diagnosis && !procedureType) return [];

      const { data, error } = await supabase
        .from('cpt_codes')
        .select('*')
        .or(`description.ilike.%${diagnosis}%,category.ilike.%${procedureType}%`)
        .limit(10);

      if (error) throw error;

      // Common CPT codes for quick reference
      const commonCodes: CPTCode[] = [
        { code: '99213', description: 'Office visit, established patient, 15 min', category: 'E&M', typical_fee: 100 },
        { code: '99214', description: 'Office visit, established patient, 25 min', category: 'E&M', typical_fee: 150 },
        { code: '99215', description: 'Office visit, established patient, 40 min', category: 'E&M', typical_fee: 200 },
        { code: '99203', description: 'Office visit, new patient, 30 min', category: 'E&M', typical_fee: 150 },
        { code: '99204', description: 'Office visit, new patient, 45 min', category: 'E&M', typical_fee: 200 },
        { code: '36415', description: 'Venipuncture', category: 'Lab', typical_fee: 25 },
        { code: '80053', description: 'Comprehensive metabolic panel', category: 'Lab', typical_fee: 50 },
        { code: '85025', description: 'Complete blood count', category: 'Lab', typical_fee: 30 },
      ];

      return data && data.length > 0 ? data : commonCodes;
    },
    enabled: !!diagnosis || !!procedureType,
  });
}

export function getSuggestedCPTCodes(consultationDuration: number, complexity: 'low' | 'moderate' | 'high'): CPTCode[] {
  const suggestions: CPTCode[] = [];

  // E&M codes based on duration and complexity
  if (consultationDuration <= 15 && complexity === 'low') {
    suggestions.push({ code: '99213', description: 'Office visit, established patient, 15 min', category: 'E&M', typical_fee: 100 });
  } else if (consultationDuration <= 25 && complexity === 'moderate') {
    suggestions.push({ code: '99214', description: 'Office visit, established patient, 25 min', category: 'E&M', typical_fee: 150 });
  } else if (consultationDuration > 25 || complexity === 'high') {
    suggestions.push({ code: '99215', description: 'Office visit, established patient, 40 min', category: 'E&M', typical_fee: 200 });
  }

  return suggestions;
}
