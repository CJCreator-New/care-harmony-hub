import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PredictiveInsights {
  outcomePrediction?: {
    predictedOutcome: string;
    confidence: number;
    timeFrame: string;
    factors: string[];
    recommendations: string[];
    riskScore: number;
  };
  readmissionRisk?: {
    riskLevel: string;
    riskScore: number;
    predictedDays: number;
    riskFactors: string[];
    preventionStrategies: string[];
    confidence: number;
  };
  lengthOfStay?: {
    predictedDays: number;
    confidence: number;
    factors: string[];
    optimizationRecommendations: string[];
  };
}

export function useClinicalPredictiveAnalytics(patientId?: string) {
  const { profile } = useAuth();
  const { toast } = useToast();

  // Query for comprehensive clinical predictive insights
  const { data: predictiveInsights = {}, isLoading: isLoadingInsights, error: insightsError } = useQuery({
    queryKey: ['clinical-predictive-insights', patientId],
    queryFn: async () => {
      if (!patientId) return {};

      const insights: PredictiveInsights = {};

      try {
        // Get patient data for context
        const { data: patientData } = await supabase
          .from('patients')
          .select('age, medical_history, current_medications, diagnosis, treatment_plan, vital_signs')
          .eq('id', patientId)
          .single();

        if (!patientData) return {};

        // Outcome prediction
        const outcomeResult = await fetch('/api/ai/predict-outcomes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            patient_id: patientId,
            clinical_data: patientData,
            time_frame: '30 days'
          })
        });

        if (outcomeResult.ok) {
          const outcomeData = await outcomeResult.json();
          insights.outcomePrediction = outcomeData.prediction;
        }

        // Readmission risk assessment
        const readmissionResult = await fetch('/api/ai/readmission-risk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            patient_id: patientId,
            admission_data: {
              diagnosis: patientData.diagnosis,
              treatmentPlan: patientData.treatment_plan,
              dischargePlanning: 'standard'
            }
          })
        });

        if (readmissionResult.ok) {
          const readmissionData = await readmissionResult.json();
          insights.readmissionRisk = readmissionData.risk_assessment;
        }

        // Length of stay prediction
        const losResult = await fetch('/api/ai/length-of-stay', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            patient_id: patientId,
            admission_data: {
              diagnosis: patientData.diagnosis,
              treatmentComplexity: patientData.current_medications?.length > 3 ? 'complex' : 'standard'
            }
          })
        });

        if (losResult.ok) {
          const losData = await losResult.json();
          insights.lengthOfStay = losData.prediction;
        }

        // Log clinical predictive analytics usage
        await supabase.from('activity_logs').insert({
          user_id: profile?.user_id,
          hospital_id: profile?.hospital_id,
          action_type: 'clinical_predictive_analytics_generated',
          entity_type: 'patient',
          entity_id: patientId,
          details: {
            insights_generated: Object.keys(insights).length,
            outcome_predicted: !!insights.outcomePrediction,
            readmission_assessed: !!insights.readmissionRisk,
            los_predicted: !!insights.lengthOfStay,
            confidence_scores: {
              outcome: insights.outcomePrediction?.confidence,
              readmission: insights.readmissionRisk?.confidence,
              los: insights.lengthOfStay?.confidence
            }
          }
        });

      } catch (error) {
        console.error('Clinical predictive analytics failed:', error);
        // Return empty insights on error - don't break the UI
      }

      return insights;
    },
    enabled: !!patientId,
    retry: 2,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Mutation for real-time outcome prediction
  const predictOutcome = useMutation({
    mutationFn: async ({ patientId, timeFrame }: { patientId: string; timeFrame: string }) => {
      const result = await fetch('/api/ai/predict-outcomes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          patient_id: patientId,
          clinical_data: {},
          time_frame: timeFrame
        })
      });

      if (!result.ok) throw new Error('Prediction failed');
      const data = await result.json();
      return data.prediction;
    },
    onSuccess: () => {
      toast({
        title: "Outcome Prediction Complete",
        description: "AI has analyzed the patient's likely trajectory.",
      });
    },
    onError: (error) => {
      toast({
        title: "Prediction Failed",
        description: "Unable to generate outcome prediction. Using clinical judgment.",
        variant: "destructive"
      });
    }
  });

  // Mutation for readmission risk assessment
  const assessReadmissionRisk = useMutation({
    mutationFn: async ({ patientId, admissionData }: { patientId: string; admissionData: any }) => {
      const result = await fetch('/api/ai/readmission-risk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          patient_id: patientId,
          admission_data: admissionData
        })
      });

      if (!result.ok) throw new Error('Risk assessment failed');
      const data = await result.json();
      return data.risk_assessment;
    },
    onSuccess: (data) => {
      const riskLevel = data.riskLevel;
      const message = riskLevel === 'high' || riskLevel === 'critical'
        ? "High readmission risk detected. Enhanced discharge planning recommended."
        : "Readmission risk assessed. Standard follow-up care appropriate.";

      toast({
        title: "Readmission Risk Assessed",
        description: message,
        variant: riskLevel === 'high' || riskLevel === 'critical' ? "destructive" : "default"
      });
    },
    onError: () => {
      toast({
        title: "Risk Assessment Failed",
        description: "Unable to assess readmission risk. Clinical judgment required.",
        variant: "destructive"
      });
    }
  });

  // Mutation for length of stay prediction
  const predictLengthOfStay = useMutation({
    mutationFn: async ({ patientId, admissionData }: { patientId: string; admissionData: any }) => {
      const result = await fetch('/api/ai/length-of-stay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          patient_id: patientId,
          admission_data: admissionData
        })
      });

      if (!result.ok) throw new Error('Prediction failed');
      const data = await result.json();
      return data.prediction;
    },
    onSuccess: (data) => {
      toast({
        title: "Length of Stay Predicted",
        description: `Expected stay: ${data.predictedDays} days (confidence: ${Math.round(data.confidence * 100)}%)`,
      });
    },
    onError: () => {
      toast({
        title: "Prediction Failed",
        description: "Unable to predict length of stay. Using standard protocols.",
        variant: "destructive"
      });
    }
  });

  return {
    predictiveInsights,
    isLoading: isLoadingInsights,
    error: insightsError,
    predictOutcome,
    assessReadmissionRisk,
    predictLengthOfStay
  };
}