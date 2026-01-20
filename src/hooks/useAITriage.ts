import { useState } from 'react';
import { aiTriageService, TriageResult } from '@/services/aiTriageService';
import { useToast } from '@/hooks/use-toast';

export const useAITriage = () => {
  const [result, setResult] = useState<TriageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const analyzeTriage = async (symptoms: string[], vitals: any, patientId: string) => {
    setLoading(true);
    try {
      const triageResult = await aiTriageService.analyzeSymptoms(symptoms);
      const acuity = aiTriageService.calculateAcuity(vitals, symptoms);
      
      await aiTriageService.saveAssessment(patientId, {
        symptoms,
        acuityLevel: acuity,
        estimatedWaitTime: triageResult.estimatedWaitTime
      });
      
      setResult(triageResult);
      toast({ title: 'Triage analysis complete' });
    } catch (error) {
      toast({ title: 'Analysis failed', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return { result, loading, analyzeTriage };
};
