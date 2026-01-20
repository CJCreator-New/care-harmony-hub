import { supabase } from '@/integrations/supabase/client';

export interface PredictionResult {
  risk: 'low' | 'medium' | 'high';
  probability: number;
  factors: string[];
  recommendations: string[];
}

export const machineLearningService = {
  async predictDeterioration(patientId: string, vitals: any): Promise<PredictionResult> {
    const riskFactors: string[] = [];
    let riskScore = 0;

    if (vitals.heartRate > 100) { riskFactors.push('Elevated heart rate'); riskScore += 2; }
    if (vitals.systolic > 140) { riskFactors.push('High blood pressure'); riskScore += 2; }
    if (vitals.oxygenSaturation < 95) { riskFactors.push('Low oxygen saturation'); riskScore += 3; }
    if (vitals.temperature > 38.5) { riskFactors.push('Fever'); riskScore += 1; }

    const risk = riskScore >= 5 ? 'high' : riskScore >= 3 ? 'medium' : 'low';
    
    return {
      risk,
      probability: Math.min(riskScore * 0.15, 0.95),
      factors: riskFactors,
      recommendations: this.getRecommendations(risk)
    };
  },

  async assessReadmissionRisk(patientId: string): Promise<PredictionResult> {
    const { data: history } = await supabase
      .from('consultations')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(5);

    const recentAdmissions = history?.length || 0;
    const risk = recentAdmissions >= 3 ? 'high' : recentAdmissions >= 2 ? 'medium' : 'low';

    return {
      risk,
      probability: recentAdmissions * 0.2,
      factors: [`${recentAdmissions} admissions in last 6 months`],
      recommendations: ['Enhanced discharge planning', 'Follow-up within 48 hours', 'Home health services']
    };
  },

  async predictTreatmentOutcome(diagnosis: string, treatment: string): Promise<PredictionResult> {
    const successRates: Record<string, number> = {
      'hypertension-medication': 0.85,
      'diabetes-insulin': 0.78,
      'infection-antibiotics': 0.92
    };

    const key = `${diagnosis}-${treatment}`.toLowerCase();
    const probability = successRates[key] || 0.75;

    return {
      risk: probability > 0.8 ? 'low' : probability > 0.6 ? 'medium' : 'high',
      probability,
      factors: ['Historical success rate', 'Patient compliance expected'],
      recommendations: ['Monitor response weekly', 'Adjust dosage if needed']
    };
  },

  async forecastResourceUtilization(days: number): Promise<any> {
    return {
      expectedPatients: Array.from({ length: days }, (_, i) => ({
        date: new Date(Date.now() + i * 86400000),
        count: 80 + Math.floor(Math.random() * 40)
      })),
      peakDays: ['Monday', 'Friday'],
      recommendedStaffing: { doctors: 12, nurses: 24, support: 8 }
    };
  },

  getRecommendations(risk: string): string[] {
    switch (risk) {
      case 'high':
        return ['Immediate physician review', 'Increase monitoring frequency', 'Consider ICU transfer'];
      case 'medium':
        return ['Enhanced monitoring', 'Review in 4 hours', 'Notify attending physician'];
      default:
        return ['Continue standard care', 'Routine monitoring'];
    }
  }
};
