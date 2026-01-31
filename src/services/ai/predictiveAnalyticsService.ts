import { supabase } from '@/integrations/supabase/client';

// Predictive Analytics Service Configuration
const PREDICTIVE_CONFIG = {
  openai: {
    apiKey: process.env.VITE_OPENAI_API_KEY,
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4'
  },
  useMock: !process.env.VITE_OPENAI_API_KEY
};

// Predictive Analytics Interfaces
export interface PatientOutcomePrediction {
  patientId: string;
  predictedOutcome: 'improvement' | 'stable' | 'decline' | 'critical';
  confidence: number;
  timeFrame: string;
  factors: string[];
  recommendations: string[];
  riskScore: number;
}

export interface ReadmissionRisk {
  patientId: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  predictedDays: number;
  riskFactors: string[];
  preventionStrategies: string[];
  confidence: number;
}

export interface LengthOfStayPrediction {
  patientId: string;
  predictedDays: number;
  confidence: number;
  factors: string[];
  optimizationRecommendations: string[];
}

export interface PredictiveAnalyticsResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  fallback?: boolean;
}

// Predictive Analytics Service Class
export class PredictiveAnalyticsService {
  // Patient Outcome Prediction
  async predictPatientOutcomes(params: {
    patientId: string;
    clinicalData: any;
    timeFrame?: string;
  }): Promise<PredictiveAnalyticsResponse<PatientOutcomePrediction>> {
    if (PREDICTIVE_CONFIG.useMock) {
      return this.generateMockOutcomePrediction(params);
    }

    try {
      // Get comprehensive patient data
      const patientData = await this.getPatientDataForPrediction(params.patientId);

      const prompt = this.buildOutcomePredictionPrompt({
        ...params,
        patientData
      });

      const response = await this.callOpenAI(prompt, {
        temperature: 0.2,
        maxTokens: 1000,
        systemPrompt: 'You are a clinical outcomes researcher analyzing patient trajectories. Provide evidence-based predictions with confidence intervals.'
      });

      const parsed = this.parseOutcomePredictionResponse(response);
      return { success: true, data: parsed };
    } catch (error) {
      console.error('Outcome prediction failed:', error);
      return this.generateMockOutcomePrediction(params);
    }
  }

  // Readmission Risk Assessment
  async assessReadmissionRisk(params: {
    patientId: string;
    admissionData: any;
  }): Promise<PredictiveAnalyticsResponse<ReadmissionRisk>> {
    if (PREDICTIVE_CONFIG.useMock) {
      return this.generateMockReadmissionRisk(params);
    }

    try {
      const patientData = await this.getPatientDataForPrediction(params.patientId);

      const prompt = this.buildReadmissionRiskPrompt({
        ...params,
        patientData
      });

      const response = await this.callOpenAI(prompt, {
        temperature: 0.1,
        maxTokens: 800,
        systemPrompt: 'You are a healthcare data analyst specializing in readmission risk prediction. Use clinical evidence and statistical models.'
      });

      const parsed = this.parseReadmissionRiskResponse(response);
      return { success: true, data: parsed };
    } catch (error) {
      console.error('Readmission risk assessment failed:', error);
      return this.generateMockReadmissionRisk(params);
    }
  }

  // Length of Stay Prediction
  async predictLengthOfStay(params: {
    patientId: string;
    admissionData: any;
  }): Promise<PredictiveAnalyticsResponse<LengthOfStayPrediction>> {
    if (PREDICTIVE_CONFIG.useMock) {
      return this.generateMockLengthOfStay(params);
    }

    try {
      const patientData = await this.getPatientDataForPrediction(params.patientId);

      const prompt = this.buildLengthOfStayPrompt({
        ...params,
        patientData
      });

      const response = await this.callOpenAI(prompt, {
        temperature: 0.1,
        maxTokens: 600,
        systemPrompt: 'You are a healthcare operations analyst predicting hospital length of stay using clinical and operational data.'
      });

      const parsed = this.parseLengthOfStayResponse(response);
      return { success: true, data: parsed };
    } catch (error) {
      console.error('Length of stay prediction failed:', error);
      return this.generateMockLengthOfStay(params);
    }
  }

  // Helper method to get comprehensive patient data
  private async getPatientDataForPrediction(patientId: string): Promise<any> {
    const { data: patient } = await supabase
      .from('patients')
      .select(`
        *,
        medical_history,
        current_medications,
        allergies,
        vital_signs,
        chief_complaint,
        diagnosis,
        treatment_plan
      `)
      .eq('id', patientId)
      .single();

    // Get recent activity logs for behavioral patterns
    const { data: activities } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('entity_id', patientId)
      .eq('entity_type', 'patient')
      .order('created_at', { ascending: false })
      .limit(50);

    return {
      patient,
      activities: activities || []
    };
  }

  // OpenAI API Call
  private async callOpenAI(prompt: string, options: {
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
  }): Promise<string> {
    const response = await fetch(`${PREDICTIVE_CONFIG.openai.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PREDICTIVE_CONFIG.openai.apiKey}`
      },
      body: JSON.stringify({
        model: PREDICTIVE_CONFIG.openai.model,
        messages: [
          { role: 'system', content: options.systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: options.temperature,
        max_tokens: options.maxTokens
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // Prompt Building Methods
  private buildOutcomePredictionPrompt(params: any): string {
    const { patientData, timeFrame = '30 days' } = params;

    return `Analyze this patient's clinical trajectory and predict outcomes over the next ${timeFrame}.

PATIENT PROFILE:
- Age: ${patientData.patient?.age || 'Unknown'}
- Gender: ${patientData.patient?.gender || 'Unknown'}
- Chief Complaint: ${patientData.patient?.chief_complaint || 'Not specified'}
- Medical History: ${patientData.patient?.medical_history?.join(', ') || 'None'}
- Current Medications: ${patientData.patient?.current_medications?.join(', ') || 'None'}
- Vital Signs: ${JSON.stringify(patientData.patient?.vital_signs || {})}
- Diagnosis: ${patientData.patient?.diagnosis || 'Pending'}
- Treatment Plan: ${patientData.patient?.treatment_plan || 'Not established'}

RECENT ACTIVITY:
${patientData.activities?.slice(0, 10).map((a: any) =>
  `- ${a.action_type}: ${a.details?.description || 'No description'}`
).join('\n') || 'No recent activity'}

PREDICTIVE ANALYSIS:

1. **Clinical Trajectory Prediction**:
   - Most likely outcome (improvement/stable/decline/critical)
   - Confidence level in prediction
   - Key factors influencing trajectory

2. **Risk Stratification**:
   - Overall risk score (0-1)
   - Contributing risk factors
   - Protective factors

3. **Clinical Recommendations**:
   - Interventions to improve outcomes
   - Monitoring requirements
   - Follow-up planning

Format as JSON:
{
  "predictedOutcome": "improvement|stable|decline|critical",
  "confidence": number,
  "timeFrame": "string",
  "factors": ["string"],
  "recommendations": ["string"],
  "riskScore": number
}`;
  }

  private buildReadmissionRiskPrompt(params: any): string {
    const { patientData } = params;

    return `Assess the risk of hospital readmission for this patient within 30 days.

PATIENT DATA:
- Age: ${patientData.patient?.age || 'Unknown'}
- Medical History: ${patientData.patient?.medical_history?.join(', ') || 'None'}
- Current Diagnosis: ${patientData.patient?.diagnosis || 'Not established'}
- Treatment Plan: ${patientData.patient?.treatment_plan || 'Not established'}
- Discharge Planning: ${params.admissionData?.dischargePlanning || 'Not specified'}
- Social Support: ${params.admissionData?.socialSupport || 'Unknown'}

RISK FACTORS TO CONSIDER:
- Age > 65
- Multiple comorbidities
- Previous hospital admissions
- Polypharmacy
- Limited social support
- Complex discharge needs
- Mental health conditions

ANALYZE:
1. **Readmission Risk Level**: low/medium/high/critical
2. **Risk Score**: 0-1 scale
3. **Predicted Timeline**: Days until potential readmission
4. **Key Risk Factors**: Most significant contributors
5. **Prevention Strategies**: Evidence-based interventions

Format as JSON:
{
  "riskLevel": "low|medium|high|critical",
  "riskScore": number,
  "predictedDays": number,
  "riskFactors": ["string"],
  "preventionStrategies": ["string"],
  "confidence": number
}`;
  }

  private buildLengthOfStayPrompt(params: any): string {
    const { patientData } = params;

    return `Predict the expected length of hospital stay for this patient.

PATIENT INFORMATION:
- Age: ${patientData.patient?.age || 'Unknown'}
- Admission Diagnosis: ${patientData.patient?.diagnosis || 'Not established'}
- Medical History: ${patientData.patient?.medical_history?.join(', ') || 'None'}
- Current Medications: ${patientData.patient?.current_medications?.length || 0} medications
- Vital Signs on Admission: ${JSON.stringify(patientData.patient?.vital_signs || {})}
- Treatment Complexity: ${params.admissionData?.treatmentComplexity || 'Standard'}

FACTORS INFLUENCING LENGTH OF STAY:
- Age and comorbidities
- Treatment requirements
- Response to therapy
- Discharge planning needs
- Social support systems

PREDICT:
1. **Expected Length of Stay**: Days
2. **Confidence Level**: 0-1
3. **Contributing Factors**: Key determinants
4. **Optimization Recommendations**: Ways to reduce LOS

Format as JSON:
{
  "predictedDays": number,
  "confidence": number,
  "factors": ["string"],
  "optimizationRecommendations": ["string"]
}`;
  }

  // Response Parsing Methods
  private parseOutcomePredictionResponse(response: string): PatientOutcomePrediction {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found');
    } catch (error) {
      return {
        patientId: '',
        predictedOutcome: 'stable',
        confidence: 0.5,
        timeFrame: '30 days',
        factors: ['Unable to analyze'],
        recommendations: ['Consult clinical team'],
        riskScore: 0.5
      };
    }
  }

  private parseReadmissionRiskResponse(response: string): ReadmissionRisk {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found');
    } catch (error) {
      return {
        patientId: '',
        riskLevel: 'medium',
        riskScore: 0.5,
        predictedDays: 14,
        riskFactors: ['Unable to analyze'],
        preventionStrategies: ['Enhanced follow-up'],
        confidence: 0.5
      };
    }
  }

  private parseLengthOfStayResponse(response: string): LengthOfStayPrediction {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found');
    } catch (error) {
      return {
        patientId: '',
        predictedDays: 5,
        confidence: 0.5,
        factors: ['Unable to analyze'],
        optimizationRecommendations: ['Standard care pathway']
      };
    }
  }

  // Mock Data Generation Methods
  private generateMockOutcomePrediction(params: any): PredictiveAnalyticsResponse<PatientOutcomePrediction> {
    const outcomes: ('improvement' | 'stable' | 'decline' | 'critical')[] = ['improvement', 'stable', 'decline', 'critical'];
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];

    return {
      success: true,
      data: {
        patientId: params.patientId,
        predictedOutcome: outcome,
        confidence: 0.7 + Math.random() * 0.3,
        timeFrame: params.timeFrame || '30 days',
        factors: [
          'Age and comorbidities',
          'Response to current treatment',
          'Social support systems',
          'Compliance with care plan'
        ],
        recommendations: [
          'Continue current treatment plan',
          'Monitor vital signs regularly',
          'Ensure adequate follow-up care',
          'Address social determinants of health'
        ],
        riskScore: Math.random()
      },
      fallback: true
    };
  }

  private generateMockReadmissionRisk(params: any): PredictiveAnalyticsResponse<ReadmissionRisk> {
    const riskLevels: ('low' | 'medium' | 'high' | 'critical')[] = ['low', 'medium', 'high', 'critical'];
    const riskLevel = riskLevels[Math.floor(Math.random() * riskLevels.length)];

    return {
      success: true,
      data: {
        patientId: params.patientId,
        riskLevel,
        riskScore: Math.random(),
        predictedDays: Math.floor(Math.random() * 30) + 1,
        riskFactors: [
          'Multiple comorbidities',
          'Recent hospital admission',
          'Limited social support',
          'Polypharmacy'
        ],
        preventionStrategies: [
          'Enhanced discharge planning',
          'Home health services',
          'Medication reconciliation',
          'Close primary care follow-up'
        ],
        confidence: 0.7 + Math.random() * 0.3
      },
      fallback: true
    };
  }

  private generateMockLengthOfStay(params: any): PredictiveAnalyticsResponse<LengthOfStayPrediction> {
    return {
      success: true,
      data: {
        patientId: params.patientId,
        predictedDays: Math.floor(Math.random() * 10) + 3,
        confidence: 0.7 + Math.random() * 0.3,
        factors: [
          'Admission diagnosis complexity',
          'Patient age and comorbidities',
          'Response to initial treatment',
          'Discharge planning requirements'
        ],
        optimizationRecommendations: [
          'Early mobilization protocols',
          'Standardized care pathways',
          'Multidisciplinary team rounds',
          'Patient education and engagement'
        ]
      },
      fallback: true
    };
  }
}

// Export singleton instance
export const predictiveAnalyticsService = new PredictiveAnalyticsService();