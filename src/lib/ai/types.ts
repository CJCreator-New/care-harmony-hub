export interface AIProviderConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIProvider {
  name: string;
  model: string;
  diagnosePatient(
    patientData: any,
    context?: string,
    sessionId?: string
  ): Promise<AIResponse>;
  createTreatmentPlan(
    patientData: any,
    diagnosis: string,
    context?: string,
    sessionId?: string
  ): Promise<AIResponse>;
  generateTreatmentRecommendations(
    patientData: any,
    diagnoses: string[],
    context?: string,
    sessionId?: string
  ): Promise<AIResponse>;
  optimizeTreatmentPlan(
    patientData: any,
    currentPlan: string,
    diagnoses: string[],
    criteria: any,
    context?: string,
    sessionId?: string
  ): Promise<AIResponse>;
  predictReadmissionRisk(
    patientData: any,
    context?: string,
    sessionId?: string
  ): Promise<AIResponse>;
  predictLengthOfStay(
    patientData: any,
    context?: string,
    sessionId?: string
  ): Promise<AIResponse>;
  optimizeResourceUtilization(
    operationalData: any,
    context?: string,
    sessionId?: string
  ): Promise<AIResponse>;
  reviewMedications(
    patientData: any,
    medications: string[],
    sessionId?: string
  ): Promise<AIResponse>;
}

export interface AIRequest {
  type: 'diagnosis' | 'treatment_plan' | 'treatment_recommendations' | 'treatment_plan_optimization' | 'predict_readmission_risk' | 'predict_length_of_stay' | 'resource_utilization_optimization' | 'medication_review' | 'clinical_summary';
  patientData: any;
  context: string;
  options?: {
    temperature?: number;
    maxTokens?: number;
    provider?: string;
  };
}

export interface AIResponse {
  response: string;
  confidence: number;
  metadata: {
    provider: string;
    model: string;
    tokensUsed: number;
    processingTime: number;
    cost: number;
  };
  warnings?: string[];
  errors?: string[];
  auditId?: string;
  success?: boolean;
}