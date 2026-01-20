import { supabase } from '@/integrations/supabase/client';

export enum AcuityLevel {
  CRITICAL = 1,
  URGENT = 2,
  SEMI_URGENT = 3,
  NON_URGENT = 4
}

export interface TriageResult {
  acuityLevel: AcuityLevel;
  confidence: number;
  recommendedActions: string[];
  estimatedWaitTime: number;
}

export const aiTriageService = {
  async analyzeSymptoms(symptoms: string[]): Promise<TriageResult> {
    const criticalSymptoms = ['chest pain', 'difficulty breathing', 'severe bleeding', 'unconscious'];
    const urgentSymptoms = ['high fever', 'severe pain', 'vomiting', 'head injury'];
    
    const hasCritical = symptoms.some(s => criticalSymptoms.some(cs => s.toLowerCase().includes(cs)));
    const hasUrgent = symptoms.some(s => urgentSymptoms.some(us => s.toLowerCase().includes(us)));
    
    let acuityLevel = AcuityLevel.NON_URGENT;
    let estimatedWaitTime = 60;
    
    if (hasCritical) {
      acuityLevel = AcuityLevel.CRITICAL;
      estimatedWaitTime = 0;
    } else if (hasUrgent) {
      acuityLevel = AcuityLevel.URGENT;
      estimatedWaitTime = 15;
    } else if (symptoms.length > 2) {
      acuityLevel = AcuityLevel.SEMI_URGENT;
      estimatedWaitTime = 30;
    }
    
    return {
      acuityLevel,
      confidence: 0.85,
      recommendedActions: this.getRecommendedActions(acuityLevel),
      estimatedWaitTime
    };
  },

  calculateAcuity(vitals: any, symptoms: string[]): AcuityLevel {
    if (vitals.systolic > 180 || vitals.heartRate > 120 || vitals.oxygenSaturation < 90) {
      return AcuityLevel.CRITICAL;
    }
    if (vitals.systolic > 160 || vitals.heartRate > 100 || vitals.temperature > 39) {
      return AcuityLevel.URGENT;
    }
    return symptoms.length > 3 ? AcuityLevel.SEMI_URGENT : AcuityLevel.NON_URGENT;
  },

  predictWaitTime(queueData: any): number {
    const { criticalCount = 0, urgentCount = 0, semiUrgentCount = 0 } = queueData;
    return (criticalCount * 5) + (urgentCount * 15) + (semiUrgentCount * 30);
  },

  prioritizeQueue(patients: any[]): any[] {
    return patients.sort((a, b) => {
      if (a.acuityLevel !== b.acuityLevel) {
        return a.acuityLevel - b.acuityLevel;
      }
      return new Date(a.arrivalTime).getTime() - new Date(b.arrivalTime).getTime();
    });
  },

  getRecommendedActions(acuityLevel: AcuityLevel): string[] {
    switch (acuityLevel) {
      case AcuityLevel.CRITICAL:
        return ['Immediate medical attention', 'Notify emergency team', 'Prepare resuscitation equipment'];
      case AcuityLevel.URGENT:
        return ['Fast-track to physician', 'Monitor vitals continuously', 'Prepare treatment room'];
      case AcuityLevel.SEMI_URGENT:
        return ['Standard triage process', 'Monitor in waiting area', 'Reassess in 30 minutes'];
      default:
        return ['Standard queue', 'Self-service check-in available'];
    }
  },

  async saveAssessment(patientId: string, assessment: any) {
    const { error } = await supabase.from('triage_assessments').insert({
      patient_id: patientId,
      symptoms: assessment.symptoms,
      ai_acuity_score: assessment.acuityLevel,
      predicted_wait_time: assessment.estimatedWaitTime
    });
    if (error) throw error;
  }
};
