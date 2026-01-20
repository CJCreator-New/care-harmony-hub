import { supabase } from '@/integrations/supabase/client';

export interface DrugInteraction {
  severity: 'minor' | 'moderate' | 'severe';
  description: string;
  recommendation: string;
}

export interface DiagnosisSuggestion {
  icd10Code: string;
  name: string;
  confidence: number;
  supportingFactors: string[];
}

export const clinicalDecisionSupport = {
  async checkDrugInteractions(medications: string[]): Promise<DrugInteraction[]> {
    const interactions: DrugInteraction[] = [];
    
    const knownInteractions: Record<string, any> = {
      'warfarin-aspirin': { severity: 'severe', description: 'Increased bleeding risk' },
      'metformin-alcohol': { severity: 'moderate', description: 'Risk of lactic acidosis' }
    };
    
    for (let i = 0; i < medications.length; i++) {
      for (let j = i + 1; j < medications.length; j++) {
        const key = `${medications[i]}-${medications[j]}`.toLowerCase();
        if (knownInteractions[key]) {
          interactions.push({
            ...knownInteractions[key],
            recommendation: 'Consult pharmacist before prescribing'
          });
        }
      }
    }
    
    return interactions;
  },

  async suggestDiagnosis(symptoms: string[], vitals: any): Promise<DiagnosisSuggestion[]> {
    const suggestions: DiagnosisSuggestion[] = [];
    
    if (symptoms.includes('fever') && symptoms.includes('cough')) {
      suggestions.push({
        icd10Code: 'J06.9',
        name: 'Upper Respiratory Infection',
        confidence: 0.75,
        supportingFactors: ['Fever present', 'Cough reported']
      });
    }
    
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  },

  async getProtocolRecommendations(diagnosis: string): Promise<string[]> {
    const protocols: Record<string, string[]> = {
      'hypertension': [
        'Lifestyle modifications counseling',
        'Consider ACE inhibitor or ARB',
        'Monitor blood pressure weekly',
        'Schedule follow-up in 2 weeks'
      ],
      'diabetes': [
        'HbA1c testing',
        'Metformin as first-line therapy',
        'Dietary counseling',
        'Regular glucose monitoring'
      ]
    };
    
    return protocols[diagnosis.toLowerCase()] || ['Follow standard clinical guidelines'];
  },

  async checkGuidelineCompliance(treatment: any): Promise<{ compliant: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    if (!treatment.dosage) issues.push('Dosage not specified');
    if (!treatment.duration) issues.push('Treatment duration not specified');
    
    return {
      compliant: issues.length === 0,
      issues
    };
  }
};
