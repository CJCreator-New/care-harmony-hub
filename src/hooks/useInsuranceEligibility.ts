import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { buildEligibilityResponse, EligibilityResponse } from '@/services/insuranceIntegration';

export function useInsuranceEligibility(patientId: string) {
  return useQuery({
    queryKey: ['insurance-eligibility', patientId],
    queryFn: async (): Promise<EligibilityResponse> => {
      const { data: patient, error } = await supabase
        .from('patients')
        .select('insurance_provider, insurance_policy_number, insurance_status')
        .eq('id', patientId)
        .single();

      if (error) throw error;

      const baseEligibility = buildEligibilityResponse(
        patient.insurance_provider,
        patient.insurance_status === 'active',
      );

      if (!patient.insurance_provider || patient.insurance_status !== 'active') {
        return baseEligibility;
      }

      if (!patient.insurance_policy_number) {
        return {
          ...baseEligibility,
          message: `${patient.insurance_provider} - Missing policy number`,
        };
      }

      // Attempt eligibility verification via Supabase Edge Function (if available)
      const functions = (supabase as any).functions;
      if (functions?.invoke) {
        try {
          const response = await functions.invoke('insurance-integration', {
            body: {
              action: 'verify_eligibility',
              data: {
                patient_id: patientId,
                policy_number: patient.insurance_policy_number,
                provider_name: patient.insurance_provider,
              },
            },
          });

          if (response?.data) {
            return {
              ...baseEligibility,
              eligible: !!response.data.eligible,
              coverage: response.data.coverage_percentage ?? baseEligibility.coverage,
              copay: response.data.copay_amount ?? baseEligibility.copay,
              deductible: response.data.deductible_remaining ?? baseEligibility.deductible,
              deductibleMet: response.data.deductible_met ?? baseEligibility.deductibleMet,
              message: `${patient.insurance_provider} - Eligibility verified`,
            };
          }
        } catch (err) {
          // Fall back to local rules if verification fails
          return {
            ...baseEligibility,
            message: `${patient.insurance_provider} - Eligibility pending verification`,
          };
        }
      }

      return baseEligibility;
    },
    enabled: !!patientId,
  });
}
