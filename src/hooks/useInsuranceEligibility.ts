import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface EligibilityResult {
  eligible: boolean;
  coverage: number;
  copay: number;
  deductible: number;
  deductibleMet: number;
  message: string;
}

export function useInsuranceEligibility(patientId: string) {
  return useQuery({
    queryKey: ['insurance-eligibility', patientId],
    queryFn: async (): Promise<EligibilityResult> => {
      const { data: patient, error } = await supabase
        .from('patients')
        .select('insurance_provider, insurance_policy_number, insurance_status')
        .eq('id', patientId)
        .single();

      if (error) throw error;

      if (!patient.insurance_provider || patient.insurance_status !== 'active') {
        return {
          eligible: false,
          coverage: 0,
          copay: 0,
          deductible: 0,
          deductibleMet: 0,
          message: 'No active insurance coverage',
        };
      }

      // Simulated eligibility check (in production, integrate with insurance API)
      return {
        eligible: true,
        coverage: 80,
        copay: 25,
        deductible: 1000,
        deductibleMet: 450,
        message: `${patient.insurance_provider} - Active coverage`,
      };
    },
    enabled: !!patientId,
  });
}
