import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ClinicalData {
  symptoms: string[];
  vital_signs: { [key: string]: number };
  medical_history: string[];
  medications: string[];
  lab_results?: { [key: string]: number };
}

interface DiagnosisRecommendation {
  condition: string;
  confidence: number;
  reasoning: string[];
  recommended_tests: string[];
  treatment_options: string[];
  risk_factors: string[];
}

export function useAIClinicalSupport() {
  const analyzeSymptoms = useMutation({
    mutationFn: async (clinicalData: ClinicalData) => {
      const { data, error } = await supabase.functions.invoke('ai-clinical-support', {
        body: { action: 'analyze_symptoms', data: { clinical_data: clinicalData } }
      });
      if (error) throw error;
      return data;
    },
  });

  const checkDrugInteractions = useMutation({
    mutationFn: async (medications: string[]) => {
      const { data, error } = await supabase.functions.invoke('ai-clinical-support', {
        body: { action: 'drug_interaction_check', data: { medications } }
      });
      if (error) throw error;
      return data;
    },
  });

  const assessRisk = useMutation({
    mutationFn: async (patientId: string) => {
      const { data, error } = await supabase.functions.invoke('ai-clinical-support', {
        body: { action: 'risk_assessment', data: { patient_id: patientId } }
      });
      if (error) throw error;
      return data;
    },
  });

  const getTreatmentRecommendations = useMutation({
    mutationFn: async ({ diagnosis, patientData }: { diagnosis: string; patientData: unknown }) => {
      const { data, error } = await supabase.functions.invoke('ai-clinical-support', {
        body: { action: 'treatment_recommendations', data: { diagnosis, patient_data: patientData } }
      });
      if (error) throw error;
      return data;
    },
  });

  return {
    analyzeSymptoms: analyzeSymptoms.mutate,
    checkDrugInteractions: checkDrugInteractions.mutate,
    assessRisk: assessRisk.mutate,
    getTreatmentRecommendations: getTreatmentRecommendations.mutate,
    isAnalyzing: analyzeSymptoms.isPending,
    isCheckingInteractions: checkDrugInteractions.isPending,
    isAssessingRisk: assessRisk.isPending,
  };
}