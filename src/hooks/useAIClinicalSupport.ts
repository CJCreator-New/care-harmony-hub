import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface DifferentialDiagnosis {
  condition: string;
  confidence: number;
  evidence: string[];
  icd10_code: string;
}

export interface RiskAssessment {
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number;
  factors: string[];
  recommendations: string[];
}

export interface ClinicalCoding {
  icd10_codes: string[];
  cpt_codes: string[];
  confidence: number;
  suggested_modifiers: string[];
}

export function useAIClinicalSupport() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const generateDifferentialDiagnosis = useMutation({
    mutationFn: async ({ symptoms, patientHistory, vitals }: {
      symptoms: string[];
      patientHistory: string;
      vitals?: Record<string, any>;
    }) => {
      // Simulate AI processing - in production, this would call an AI service
      const mockDiagnoses: DifferentialDiagnosis[] = [
        {
          condition: "Hypertension",
          confidence: 0.85,
          evidence: ["Elevated BP readings", "Family history"],
          icd10_code: "I10"
        },
        {
          condition: "Anxiety disorder",
          confidence: 0.72,
          evidence: ["Patient reported symptoms", "Stress indicators"],
          icd10_code: "F41.9"
        }
      ];

      // Log AI usage for audit
      await supabase.from('activity_logs').insert({
        user_id: profile?.user_id,
        hospital_id: profile?.hospital_id,
        action_type: 'ai_differential_diagnosis',
        entity_type: 'clinical_ai',
        details: { symptoms, confidence_scores: mockDiagnoses.map(d => d.confidence) }
      });

      return mockDiagnoses;
    },
    onError: () => {
      toast({
        title: "AI Analysis Failed",
        description: "Unable to generate differential diagnosis. Please try again.",
        variant: "destructive"
      });
    }
  });

  const predictPatientRisk = useMutation({
    mutationFn: async ({ patientId, clinicalData }: {
      patientId: string;
      clinicalData: Record<string, any>;
    }) => {
      // Simulate risk prediction
      const riskAssessment: RiskAssessment = {
        risk_level: 'medium',
        risk_score: 0.65,
        factors: ["Age > 65", "Comorbidities present", "Medication interactions"],
        recommendations: ["Monitor vitals q4h", "Consider cardiology consult"]
      };

      // Store prediction in database
      await supabase.from('predictive_alerts').insert({
        patient_id: patientId,
        alert_type: 'risk_assessment',
        risk_score: riskAssessment.risk_score,
        recommended_action: riskAssessment.recommendations.join('; ')
      });

      return riskAssessment;
    }
  });

  const autoCodeEncounter = useMutation({
    mutationFn: async ({ consultationNotes, procedures }: {
      consultationNotes: string;
      procedures: string[];
    }) => {
      // Simulate NLP coding
      const coding: ClinicalCoding = {
        icd10_codes: ["Z00.00", "I10"],
        cpt_codes: ["99213", "36415"],
        confidence: 0.88,
        suggested_modifiers: ["25"]
      };

      return coding;
    }
  });

  // Additional methods for component compatibility
  const analyzeSymptoms = useMutation({
    mutationFn: async (symptoms: string[]) => {
      return generateDifferentialDiagnosis.mutateAsync({ symptoms, patientHistory: '' });
    }
  });

  const checkDrugInteractions = useMutation({
    mutationFn: async (medications: string[]) => {
      // Simulate drug interaction check
      return {
        hasInteractions: false,
        interactions: [],
        severity: 'none' as const
      };
    }
  });

  const assessRisk = useMutation({
    mutationFn: async ({ patientId, data }: { patientId: string; data: any }) => {
      return predictPatientRisk.mutateAsync({ patientId, clinicalData: data });
    }
  });

  return {
    generateDifferentialDiagnosis: generateDifferentialDiagnosis.mutate,
    isGeneratingDiagnosis: generateDifferentialDiagnosis.isPending,
    predictPatientRisk: predictPatientRisk.mutate,
    isPredictingRisk: predictPatientRisk.isPending,
    autoCodeEncounter: autoCodeEncounter.mutate,
    isCoding: autoCodeEncounter.isPending,
    // Additional exports for component compatibility
    analyzeSymptoms: analyzeSymptoms.mutate,
    checkDrugInteractions: checkDrugInteractions.mutate,
    assessRisk: assessRisk.mutate,
    isAnalyzing: analyzeSymptoms.isPending || generateDifferentialDiagnosis.isPending,
  };
}