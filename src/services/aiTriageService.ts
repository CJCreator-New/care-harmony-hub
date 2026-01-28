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
  riskFactors: string[];
  predictedOutcome?: string;
  followUpRecommendations?: string[];
}

export interface PatientHistory {
  previousVisits: number;
  chronicConditions: string[];
  allergies: string[];
  medications: string[];
  lastVisit?: string;
}

export interface VitalsData {
  systolic: number;
  diastolic: number;
  heartRate: number;
  temperature: number;
  oxygenSaturation: number;
  respiratoryRate: number;
  painScale?: number;
}

export class AdvancedTriageService {
  private readonly CRITICAL_KEYWORDS = [
    'chest pain', 'difficulty breathing', 'severe bleeding', 'unconscious',
    'cardiac arrest', 'stroke symptoms', 'severe trauma', 'anaphylaxis'
  ];

  private readonly URGENT_KEYWORDS = [
    'high fever', 'severe pain', 'vomiting blood', 'seizure',
    'head injury', 'burns', 'fracture', 'infection'
  ];

  private readonly RISK_FACTORS = {
    age: { threshold: 65, weight: 0.3 },
    chronicConditions: { weight: 0.4 },
    vitalSigns: { weight: 0.3 }
  };

  async analyzeSymptoms(
    symptoms: string[],
    vitals?: VitalsData,
    history?: PatientHistory
  ): Promise<TriageResult> {
    // Enhanced symptom analysis with ML-like scoring
    const symptomScore = this.calculateSymptomScore(symptoms);
    const vitalScore = vitals ? this.calculateVitalScore(vitals) : 0;
    const historyScore = history ? this.calculateHistoryScore(history) : 0;

    // Weighted scoring system
    const totalScore = (symptomScore * 0.5) + (vitalScore * 0.3) + (historyScore * 0.2);
    const acuityLevel = this.determineAcuityLevel(totalScore);

    const riskFactors = this.identifyRiskFactors(symptoms, vitals, history);
    const recommendedActions = this.getRecommendedActions(acuityLevel, riskFactors);
    const estimatedWaitTime = this.calculateWaitTime(acuityLevel, totalScore);

    return {
      acuityLevel,
      confidence: Math.min(0.95, 0.7 + (totalScore / 100) * 0.25), // 70-95% confidence
      recommendedActions,
      estimatedWaitTime,
      riskFactors,
      predictedOutcome: this.predictOutcome(acuityLevel, riskFactors),
      followUpRecommendations: this.getFollowUpRecommendations(acuityLevel, history)
    };
  }

  private calculateSymptomScore(symptoms: string[]): number {
    let score = 0;
    const lowerSymptoms = symptoms.map(s => s.toLowerCase());

    // Critical symptoms (40-60 points)
    const criticalMatches = lowerSymptoms.filter(s =>
      this.CRITICAL_KEYWORDS.some(k => s.includes(k))
    ).length;
    score += criticalMatches * 25;

    // Urgent symptoms (20-40 points)
    const urgentMatches = lowerSymptoms.filter(s =>
      this.URGENT_KEYWORDS.some(k => s.includes(k))
    ).length;
    score += urgentMatches * 15;

    // Symptom severity modifiers
    if (lowerSymptoms.some(s => s.includes('severe') || s.includes('extreme'))) {
      score += 10;
    }

    // Multiple symptoms increase urgency
    score += Math.min(symptoms.length * 2, 10);

    return Math.min(score, 100);
  }

  private calculateVitalScore(vitals: VitalsData): number {
    let score = 0;

    // Blood pressure
    if (vitals.systolic >= 180 || vitals.diastolic >= 110) score += 25;
    else if (vitals.systolic >= 160 || vitals.diastolic >= 100) score += 15;
    else if (vitals.systolic >= 140 || vitals.diastolic >= 90) score += 5;

    // Heart rate
    if (vitals.heartRate >= 120) score += 20;
    else if (vitals.heartRate >= 100) score += 10;
    else if (vitals.heartRate <= 50) score += 15;

    // Temperature
    if (vitals.temperature >= 39.5) score += 20;
    else if (vitals.temperature >= 38.5) score += 10;

    // Oxygen saturation
    if (vitals.oxygenSaturation <= 90) score += 25;
    else if (vitals.oxygenSaturation <= 95) score += 10;

    // Respiratory rate
    if (vitals.respiratoryRate >= 30) score += 15;
    else if (vitals.respiratoryRate >= 25) score += 8;

    // Pain scale
    if (vitals.painScale && vitals.painScale >= 8) score += 10;

    return Math.min(score, 100);
  }

  private calculateHistoryScore(history: PatientHistory): number {
    let score = 0;

    // Age factor
    if (history.previousVisits > 0) {
      const age = this.estimateAgeFromHistory(history);
      if (age >= 65) score += 10;
    }

    // Chronic conditions
    score += Math.min(history.chronicConditions.length * 5, 20);

    // Recent visits (last 30 days)
    if (history.lastVisit) {
      const daysSinceLastVisit = this.daysSinceLastVisit(history.lastVisit);
      if (daysSinceLastVisit <= 30) score += 15;
      else if (daysSinceLastVisit <= 90) score += 5;
    }

    // Medication count
    score += Math.min(history.medications.length * 2, 10);

    return Math.min(score, 100);
  }

  private determineAcuityLevel(totalScore: number): AcuityLevel {
    if (totalScore >= 70) return AcuityLevel.CRITICAL;
    if (totalScore >= 50) return AcuityLevel.URGENT;
    if (totalScore >= 30) return AcuityLevel.SEMI_URGENT;
    return AcuityLevel.NON_URGENT;
  }

  private identifyRiskFactors(
    symptoms: string[],
    vitals?: VitalsData,
    history?: PatientHistory
  ): string[] {
    const riskFactors: string[] = [];

    // Symptom-based risks
    if (symptoms.some(s => s.toLowerCase().includes('chest pain'))) {
      riskFactors.push('Cardiac risk');
    }
    if (symptoms.some(s => s.toLowerCase().includes('breathing'))) {
      riskFactors.push('Respiratory distress');
    }

    // Vital-based risks
    if (vitals) {
      if (vitals.oxygenSaturation < 95) riskFactors.push('Hypoxia');
      if (vitals.heartRate > 100) riskFactors.push('Tachycardia');
      if (vitals.systolic > 160) riskFactors.push('Hypertension');
    }

    // History-based risks
    if (history) {
      if (history.chronicConditions.includes('diabetes')) riskFactors.push('Diabetes');
      if (history.chronicConditions.includes('heart disease')) riskFactors.push('Cardiac history');
      if (history.allergies.length > 0) riskFactors.push('Allergies');
    }

    return riskFactors;
  }

  private getRecommendedActions(acuityLevel: AcuityLevel, riskFactors: string[]): string[] {
    const baseActions = {
      [AcuityLevel.CRITICAL]: [
        'Immediate medical attention required',
        'Activate emergency response team',
        'Prepare resuscitation equipment',
        'Notify specialist immediately'
      ],
      [AcuityLevel.URGENT]: [
        'Fast-track to physician within 15 minutes',
        'Continuous vital sign monitoring',
        'Prepare treatment room',
        'Consider pain management'
      ],
      [AcuityLevel.SEMI_URGENT]: [
        'Standard triage process',
        'Monitor in waiting area with regular checks',
        'Reassess in 30 minutes',
        'Consider basic pain relief'
      ],
      [AcuityLevel.NON_URGENT]: [
        'Standard queue',
        'Self-service check-in available',
        'Monitor for symptom changes',
        'Provide health education materials'
      ]
    };

    const actions = [...baseActions[acuityLevel]];

    // Add risk-specific actions
    if (riskFactors.includes('Cardiac risk')) {
      actions.push('ECG monitoring recommended');
    }
    if (riskFactors.includes('Respiratory distress')) {
      actions.push('Oxygen therapy consideration');
    }
    if (riskFactors.includes('Diabetes')) {
      actions.push('Blood glucose monitoring');
    }

    return actions;
  }

  private calculateWaitTime(acuityLevel: AcuityLevel, score: number): number {
    const baseTimes = {
      [AcuityLevel.CRITICAL]: 0,
      [AcuityLevel.URGENT]: 15,
      [AcuityLevel.SEMI_URGENT]: 45,
      [AcuityLevel.NON_URGENT]: 90
    };

    // Adjust based on score severity
    const adjustment = Math.max(0, (score - 50) / 10);
    return Math.max(0, baseTimes[acuityLevel] - adjustment * 5);
  }

  private predictOutcome(acuityLevel: AcuityLevel, riskFactors: string[]): string {
    if (acuityLevel === AcuityLevel.CRITICAL) {
      return 'Requires immediate intervention, potential ICU admission';
    }
    if (acuityLevel === AcuityLevel.URGENT) {
      return 'Likely requires treatment today, possible admission';
    }
    if (acuityLevel === AcuityLevel.SEMI_URGENT) {
      return 'Requires medical attention, likely outpatient treatment';
    }
    return 'Minor condition, routine care appropriate';
  }

  private getFollowUpRecommendations(acuityLevel: AcuityLevel, history?: PatientHistory): string[] {
    const recommendations: string[] = [];

    if (acuityLevel >= AcuityLevel.SEMI_URGENT) {
      recommendations.push('Follow-up appointment within 1 week');
    }

    if (history?.chronicConditions.length) {
      recommendations.push('Continue chronic condition management');
    }

    if (acuityLevel === AcuityLevel.CRITICAL) {
      recommendations.push('Intensive monitoring required');
      recommendations.push('Specialist consultation recommended');
    }

    return recommendations;
  }

  private estimateAgeFromHistory(history: PatientHistory): number {
    // Simple estimation based on visit history
    // In real implementation, this would come from patient demographics
    return history.previousVisits > 10 ? 65 : 35;
  }

  private daysSinceLastVisit(lastVisit: string): number {
    const lastVisitDate = new Date(lastVisit);
    const now = new Date();
    return Math.floor((now.getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Legacy methods for backward compatibility
  calculateAcuity(vitals: any, symptoms: string[]): AcuityLevel {
    const result = this.analyzeSymptoms(symptoms.map(s => s), vitals);
    return result.acuityLevel;
  }

  predictWaitTime(queueData: any): number {
    const { criticalCount = 0, urgentCount = 0, semiUrgentCount = 0 } = queueData;
    return (criticalCount * 5) + (urgentCount * 15) + (semiUrgentCount * 30);
  }

  prioritizeQueue(patients: any[]): any[] {
    return patients.sort((a, b) => {
      if (a.acuityLevel !== b.acuityLevel) {
        return a.acuityLevel - b.acuityLevel;
      }
      return new Date(a.arrivalTime).getTime() - new Date(b.arrivalTime).getTime();
    });
  }

  getRecommendedActions(acuityLevel: AcuityLevel): string[] {
    return this.getRecommendedActions(acuityLevel, []);
  }

  async saveAssessment(patientId: string, assessment: any) {
    const { error } = await supabase.from('triage_assessments').insert({
      patient_id: patientId,
      symptoms: assessment.symptoms,
      ai_acuity_score: assessment.acuityLevel,
      predicted_wait_time: assessment.estimatedWaitTime,
      risk_factors: assessment.riskFactors || [],
      recommended_actions: assessment.recommendedActions || [],
      confidence_score: assessment.confidence || 0.85
    });
    if (error) throw error;
  }
}

export const aiTriageService = new AdvancedTriageService();
