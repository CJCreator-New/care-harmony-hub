import Anthropic from '@anthropic-ai/sdk';
import { AIDateSanitizer, AIEncryptionService, AISecurityAuditor } from '../security';
import { AIProvider, AIRequest, AIResponse, AIProviderConfig } from '../types';

export class ClaudeProvider implements AIProvider {
  private client: Anthropic;
  private sanitizer: AIDateSanitizer;
  private encryptor: AIEncryptionService;
  private auditor: AISecurityAuditor;
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    if (!config.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    this.config = config;
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });

    this.sanitizer = new AIDateSanitizer();
    this.encryptor = new AIEncryptionService();
    this.auditor = new AISecurityAuditor();
  }

  get name(): string {
    return 'Anthropic';
  }

  get model(): string {
    return this.config.model || 'claude-3-sonnet-20240229';
  }

  async diagnosePatient(
    patientData: any,
    context?: string,
    sessionId?: string
  ): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      const sanitizedData = this.sanitizer.sanitizePatientData(patientData);

      const auditEntry = await this.auditor.logOperation({
        operation: 'differential_diagnosis',
        provider: this.name,
        model: this.model,
        sessionId,
        dataSize: JSON.stringify(sanitizedData).length,
        purpose: 'diagnosis',
      });

      const prompt = this.buildDiagnosisPrompt(sanitizedData, context);

      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 2000,
        temperature: 0.3,
        system: `You are an expert clinical diagnostician. Provide differential diagnoses based on the patient's symptoms, history, and vital signs. Always include:

1. Primary diagnosis with confidence level
2. 2-3 differential diagnoses
3. Key clinical reasoning
4. Recommended next steps
5. Urgency level (routine, urgent, emergent)

Format your response as structured clinical notes.`,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
      });

      const response = message.content[0]?.type === 'text' ? message.content[0].text : '';
      if (!response) {
        throw new Error('No response from Claude API');
      }

      const parsedResponse = this.parseDiagnosisResponse(response);
      const confidence = this.calculateConfidence(response);

      await this.auditor.updateOperationResult(auditEntry.id, {
        success: true,
        responseLength: response.length,
        confidence,
        processingTime: Date.now() - startTime,
        cost: this.calculateCost(message.usage),
      });

      return {
        response: parsedResponse,
        confidence,
        metadata: {
          provider: this.name,
          model: this.model,
          tokensUsed: message.usage?.input_tokens + (message.usage?.output_tokens || 0) || 0,
          processingTime: Date.now() - startTime,
          cost: this.calculateCost(message.usage),
        },
        warnings: this.extractWarnings(response),
        auditId: auditEntry.id,
      };

    } catch (error) {
      if (sessionId) {
        await this.auditor.logOperation({
          operation: 'differential_diagnosis',
          provider: this.name,
          model: this.model,
          sessionId,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false,
        });
      }

      throw new Error(`Claude diagnosis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createTreatmentPlan(
    patientData: any,
    diagnosis: string,
    context?: string,
    sessionId?: string
  ): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      const sanitizedData = this.sanitizer.sanitizePatientData(patientData);

      const auditEntry = await this.auditor.logOperation({
        operation: 'treatment_planning',
        provider: this.name,
        model: this.model,
        sessionId,
        dataSize: JSON.stringify(sanitizedData).length,
        purpose: 'treatment',
      });

      const prompt = this.buildTreatmentPrompt(sanitizedData, diagnosis, context);

      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 2500,
        temperature: 0.2,
        system: `You are an expert clinical pharmacologist and treatment specialist. Create evidence-based treatment plans that include:

1. Primary treatment recommendations
2. Medication regimen with dosages
3. Lifestyle modifications
4. Follow-up schedule
5. Monitoring parameters
6. Patient education points

Consider drug interactions, contraindications, and patient-specific factors.`,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
      });

      const response = message.content[0]?.type === 'text' ? message.content[0].text : '';
      if (!response) {
        throw new Error('No response from Claude API');
      }

      const parsedResponse = this.parseTreatmentResponse(response);
      const confidence = this.calculateConfidence(response);

      await this.auditor.updateOperationResult(auditEntry.id, {
        success: true,
        responseLength: response.length,
        confidence,
        processingTime: Date.now() - startTime,
        cost: this.calculateCost(message.usage),
      });

      return {
        response: parsedResponse,
        confidence,
        metadata: {
          provider: this.name,
          model: this.model,
          tokensUsed: message.usage?.input_tokens + (message.usage?.output_tokens || 0) || 0,
          processingTime: Date.now() - startTime,
          cost: this.calculateCost(message.usage),
        },
        warnings: this.extractWarnings(response),
        auditId: auditEntry.id,
      };

    } catch (error) {
      if (sessionId) {
        await this.auditor.logOperation({
          operation: 'treatment_planning',
          provider: this.name,
          model: this.model,
          sessionId,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false,
        });
      }

      throw new Error(`Claude treatment planning failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateTreatmentRecommendations(
    patientData: any,
    diagnoses: string[],
    context?: string,
    sessionId?: string
  ): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      const sanitizedData = this.sanitizer.sanitizePatientData(patientData);

      const auditEntry = await this.auditor.logOperation({
        operation: 'treatment_recommendations',
        provider: this.name,
        model: this.model,
        sessionId,
        dataSize: JSON.stringify(sanitizedData).length,
        purpose: 'treatment_recommendations',
      });

      const prompt = this.buildTreatmentRecommendationsPrompt(sanitizedData, diagnoses, context);

      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 3000,
        temperature: 0.2,
        system: `You are an expert clinical decision support system. Generate evidence-based treatment recommendations for the given diagnoses.

Return a JSON array of treatment recommendations with the following structure for each recommendation:
{
  "id": "unique_id",
  "condition": "condition_name",
  "treatment": "treatment_description",
  "category": "pharmacological|non-pharmacological|lifestyle|monitoring",
  "priority": "high|medium|low",
  "evidenceLevel": "A|B|C|D",
  "confidence": 85,
  "rationale": "clinical_reasoning",
  "references": ["reference1", "reference2"],
  "contraindications": ["contraindication1"],
  "monitoring": ["monitoring1", "monitoring2"],
  "duration": "treatment_duration",
  "followUp": "follow_up_schedule"
}

Consider patient allergies, current medications, comorbidities, and evidence-based guidelines.`,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
      });

      const response = message.content[0]?.type === 'text' ? message.content[0].text : '';
      if (!response) {
        throw new Error('No response from Claude API');
      }

      const parsedResponse = this.parseTreatmentRecommendationsResponse(response);
      const confidence = this.calculateConfidence(response);

      await this.auditor.updateOperationResult(auditEntry.id, {
        success: true,
        responseLength: response.length,
        confidence,
        processingTime: Date.now() - startTime,
        cost: this.calculateCost(message.usage),
      });

      return {
        response: parsedResponse,
        confidence,
        metadata: {
          provider: this.name,
          model: this.model,
          tokensUsed: message.usage?.input_tokens + (message.usage?.output_tokens || 0) || 0,
          processingTime: Date.now() - startTime,
          cost: this.calculateCost(message.usage),
        },
        warnings: this.extractWarnings(response),
        auditId: auditEntry.id,
      };

    } catch (error) {
      if (sessionId) {
        await this.auditor.logOperation({
          operation: 'treatment_recommendations',
          provider: this.name,
          model: this.model,
          sessionId,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false,
        });
      }

      throw new Error(`Claude treatment recommendations failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async optimizeTreatmentPlan(
    patientData: any,
    currentPlan: string,
    diagnoses: string[],
    criteria: any,
    context?: string,
    sessionId?: string
  ): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      // Sanitize patient data for HIPAA compliance
      const sanitizedData = this.sanitizer.sanitizePatientData(patientData);

      // Create audit trail
      const auditEntry = await this.auditor.logOperation({
        operation: 'treatment_plan_optimization',
        provider: this.name,
        model: this.model,
        sessionId,
        dataSize: JSON.stringify(sanitizedData).length,
        purpose: 'treatment_plan_optimization',
      });

      const prompt = `You are an expert clinical decision support system specializing in treatment plan optimization. Your task is to analyze a current treatment plan and generate optimized alternatives using advanced algorithms and evidence-based medicine.

PATIENT PROFILE:
- Age: ${sanitizedData.age || 'Not specified'}
- Gender: ${sanitizedData.gender || 'Not specified'}
- Comorbidities: ${sanitizedData.comorbidities?.join(', ') || 'None specified'}
- Current Medications: ${sanitizedData.currentMedications?.join(', ') || 'None specified'}
- Socioeconomic Factors: ${JSON.stringify(sanitizedData.socioeconomicFactors || {})}

DIAGNOSES:
${diagnoses.map((d, i) => `${i + 1}. ${d}`).join('\n')}

CURRENT TREATMENT PLAN:
${currentPlan}

OPTIMIZATION CRITERIA:
${Object.entries(criteria).map(([key, value]) => `- ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${value}`).join('\n')}

CONTEXT: ${context || 'General treatment plan optimization'}

INSTRUCTIONS:
1. Analyze the current treatment plan for efficacy, safety, cost-effectiveness, and adherence potential
2. Generate 2-3 optimized treatment plan alternatives
3. For each alternative, provide:
   - Detailed treatment plan with medications, therapies, and follow-up
   - Predicted improvements in efficacy, safety, cost, and adherence (as percentages)
   - Rationale for changes and evidence-based justification
   - Predicted outcomes: success rate, complication rate, hospital stay duration, cost savings, quality of life score
   - Confidence level in the optimization (0-100%)

4. Consider patient-specific factors including age, comorbidities, socioeconomic status, and medication history
5. Ensure all recommendations are evidence-based and clinically appropriate
6. Provide specific, actionable treatment plans with clear dosing and monitoring instructions

RESPONSE FORMAT:
Return a JSON object with this exact structure:
{
  "optimizations": [
    {
      "id": "opt_1",
      "originalPlan": {${JSON.stringify({ summary: currentPlan })}},
      "optimizedPlan": {
        "summary": "Brief summary of optimized plan",
        "medications": ["medication 1 with dose", "medication 2 with dose"],
        "therapies": ["therapy 1", "therapy 2"],
        "monitoring": ["monitoring instructions"],
        "followUp": "follow-up schedule"
      },
      "improvements": {
        "efficacy": 15.5,
        "safety": 8.2,
        "cost": -12.3,
        "adherence": 22.1,
        "overall": 18.7
      },
      "rationale": "Detailed explanation of why this optimization improves outcomes...",
      "predictedOutcomes": {
        "successRate": 87.5,
        "complicationRate": 3.2,
        "hospitalStay": 4.2,
        "costSavings": 12500,
        "qualityOfLife": 8.1
      },
      "alternatives": [
        {
          "summary": "Alternative approach summary",
          "medications": ["alternative meds"],
          "rationale": "Why this alternative might be considered"
        }
      ],
      "confidence": 92
    }
  ]
}

IMPORTANT:
- All percentage values should be numbers (positive for improvements, negative for worsening)
- Cost savings should be in USD
- Quality of life should be on a 1-10 scale
- Hospital stay in days
- Success and complication rates as percentages
- Provide realistic, evidence-based predictions`;

      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 4000,
        temperature: 0.3,
        system: `You are a clinical decision support AI specializing in treatment plan optimization. Always respond with valid JSON containing treatment plan optimizations.`,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const response = message.content[0]?.type === 'text' ? message.content[0].text : '';
      if (!response) {
        throw new Error('No response from Claude');
      }

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(response);
      } catch (parseError) {
        console.error('Failed to parse Claude response:', response);
        throw new Error('Invalid JSON response from Claude');
      }

      // Validate response structure
      if (!parsedResponse.optimizations || !Array.isArray(parsedResponse.optimizations)) {
        throw new Error('Invalid response structure: missing optimizations array');
      }

      // Update audit entry with success
      await this.auditor.logOperation({
        operation: 'treatment_plan_optimization',
        provider: this.name,
        model: this.model,
        sessionId,
        success: true,
        responseTime: Date.now() - startTime,
        tokensUsed: message.usage?.input_tokens + message.usage?.output_tokens,
        cost: this.calculateCost(message.usage),
      });

      return {
        success: true,
        data: parsedResponse,
        metadata: {
          provider: this.name,
          model: this.model,
          responseTime: Date.now() - startTime,
          tokensUsed: message.usage?.input_tokens + message.usage?.output_tokens,
          cost: this.calculateCost(message.usage),
        },
        warnings: this.extractWarnings(response),
        auditId: auditEntry.id,
      };

    } catch (error) {
      if (sessionId) {
        await this.auditor.logOperation({
          operation: 'treatment_plan_optimization',
          provider: this.name,
          model: this.model,
          sessionId,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false,
        });
      }

      throw new Error(`Claude treatment plan optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async predictReadmissionRisk(
    patientData: any,
    context?: string,
    sessionId?: string
  ): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      // Sanitize patient data for HIPAA compliance
      const sanitizedData = this.sanitizer.sanitizePatientData(patientData);

      // Create audit trail
      const auditEntry = await this.auditor.logOperation({
        operation: 'readmission_risk_prediction',
        provider: this.name,
        model: this.model,
        sessionId,
        dataSize: JSON.stringify(sanitizedData).length,
        purpose: 'predictive_analytics',
      });

      const prompt = `You are an expert clinical data scientist specializing in healthcare predictive analytics. Your task is to analyze patient data and predict the 30-day hospital readmission risk using advanced machine learning techniques.

PATIENT PROFILE:
- Age: ${sanitizedData.age || 'Not specified'}
- Gender: ${sanitizedData.gender || 'Not specified'}
- Primary Diagnosis: ${sanitizedData.diagnosis?.join(', ') || 'Not specified'}
- Comorbidities: ${sanitizedData.comorbidities?.join(', ') || 'None specified'}
- Previous Hospital Admissions: ${sanitizedData.previousAdmissions || 0}
- Length of Stay (days): ${sanitizedData.lengthOfStay || 'Not specified'}
- Current Medications: ${sanitizedData.currentMedications?.join(', ') || 'None specified'}
- Vital Signs: ${JSON.stringify(sanitizedData.vitals || {})}
- Laboratory Results: ${JSON.stringify(sanitizedData.labResults || {})}
- Socioeconomic Factors: ${JSON.stringify(sanitizedData.socialFactors || {})}

CONTEXT: ${context || '30-day readmission risk assessment'}

INSTRUCTIONS:
1. Analyze all patient factors to calculate 30-day readmission risk score (0-100%)
2. Determine risk level: 'low' (<30%), 'medium' (30-60%), 'high' (60-80%), 'critical' (>80%)
3. Identify key risk factors and their impact on readmission probability
4. Predict likely readmission date if risk is medium or higher
5. Suggest specific interventions with expected risk reduction impact
6. Provide model performance metrics (AUC, accuracy, precision, recall)

RESPONSE FORMAT:
Return a JSON object with this exact structure:
{
  "risk": {
    "patientId": "${sanitizedData.id || 'unknown'}",
    "riskScore": 45.7,
    "riskLevel": "medium",
    "predictedReadmissionDate": "2026-02-15",
    "confidence": 87,
    "factors": [
      {
        "name": "Previous admissions",
        "impact": 25.3,
        "description": "Multiple recent hospitalizations increase readmission risk"
      },
      {
        "name": "Comorbidities",
        "impact": 18.9,
        "description": "Diabetes and hypertension complicate recovery"
      }
    ],
    "interventions": [
      {
        "type": "Enhanced discharge planning",
        "priority": "high",
        "description": "Comprehensive care coordination and follow-up scheduling",
        "expectedImpact": 35.2
      },
      {
        "type": "Medication reconciliation",
        "priority": "medium",
        "description": "Review and optimize medication regimen",
        "expectedImpact": 22.1
      }
    ],
    "modelMetrics": {
      "auc": 0.87,
      "accuracy": 82.3,
      "precision": 78.9,
      "recall": 85.4
    }
  }
}

IMPORTANT:
- Risk score should be realistic based on clinical factors
- Risk level must match the score ranges above
- Predicted date should be within 30 days if risk >30%
- Factors should be evidence-based clinical indicators
- Interventions should be specific and actionable
- Model metrics should reflect real ML performance`;

      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 3000,
        temperature: 0.2,
        system: `You are a healthcare predictive analytics AI specializing in readmission risk assessment. Always respond with valid JSON containing risk analysis.`,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const response = message.content[0]?.type === 'text' ? message.content[0].text : '';
      if (!response) {
        throw new Error('No response from Claude');
      }

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(response);
      } catch (parseError) {
        console.error('Failed to parse Claude response:', response);
        throw new Error('Invalid JSON response from Claude');
      }

      // Validate response structure
      if (!parsedResponse.risk) {
        throw new Error('Invalid response structure: missing risk object');
      }

      // Update audit entry with success
      await this.auditor.logOperation({
        operation: 'readmission_risk_prediction',
        provider: this.name,
        model: this.model,
        sessionId,
        success: true,
        responseTime: Date.now() - startTime,
        tokensUsed: message.usage?.input_tokens + message.usage?.output_tokens,
        cost: this.calculateCost(message.usage),
      });

      return {
        success: true,
        data: parsedResponse,
        metadata: {
          provider: this.name,
          model: this.model,
          responseTime: Date.now() - startTime,
          tokensUsed: message.usage?.input_tokens + message.usage?.output_tokens,
          cost: this.calculateCost(message.usage),
        },
        warnings: this.extractWarnings(response),
        auditId: auditEntry.id,
      };

    } catch (error) {
      if (sessionId) {
        await this.auditor.logOperation({
          operation: 'readmission_risk_prediction',
          provider: this.name,
          model: this.model,
          sessionId,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false,
        });
      }

      throw new Error(`Claude readmission risk prediction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async predictLengthOfStay(
    patientData: any,
    context?: string,
    sessionId?: string
  ): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      // Sanitize patient data for HIPAA compliance
      const sanitizedData = this.sanitizer.sanitizePatientData(patientData);

      // Create audit trail
      const auditEntry = await this.auditor.logOperation({
        operation: 'length_of_stay_forecasting',
        provider: this.name,
        model: this.model,
        sessionId,
        dataSize: JSON.stringify(sanitizedData).length,
        purpose: 'predictive_analytics',
      });

      const prompt = `You are an expert clinical data scientist specializing in healthcare predictive analytics. Your task is to analyze patient data and predict the expected length of hospital stay using advanced machine learning techniques.

PATIENT PROFILE:
- Age: ${sanitizedData.age || 'Not specified'}
- Gender: ${sanitizedData.gender || 'Not specified'}
- Primary Diagnosis: ${sanitizedData.diagnosis?.join(', ') || 'Not specified'}
- Comorbidities: ${sanitizedData.comorbidities?.join(', ') || 'None specified'}
- Admission Type: ${sanitizedData.admissionType || 'Not specified'}
- Surgical Procedure: ${sanitizedData.surgicalProcedure || 'None'}
- Current Medications: ${sanitizedData.currentMedications?.join(', ') || 'None specified'}
- Vital Signs: ${JSON.stringify(sanitizedData.vitals || {})}
- Laboratory Results: ${JSON.stringify(sanitizedData.labResults || {})}
- Socioeconomic Factors: ${JSON.stringify(sanitizedData.socialFactors || {})}

CONTEXT: ${context || 'Length of stay forecasting'}

INSTRUCTIONS:
1. Analyze all patient factors to predict expected length of stay in days
2. Determine risk level for extended stay: 'low' (<3 days), 'medium' (3-7 days), 'high' (7-14 days), 'critical' (>14 days)
3. Identify key factors influencing length of stay duration
4. Provide confidence score for the prediction (0-100%)
5. Suggest interventions to optimize length of stay
6. Provide model performance metrics (MAE, RMSE, R², accuracy)

RESPONSE FORMAT:
Return a JSON object with this exact structure:
{
  "forecast": {
    "patientId": "${sanitizedData.id || 'unknown'}",
    "predictedDays": 5.8,
    "riskLevel": "medium",
    "confidence": 84,
    "factors": [
      {
        "name": "Surgical complexity",
        "impact": 2.3,
        "description": "Major surgical procedure increases recovery time"
      },
      {
        "name": "Age factor",
        "impact": 1.7,
        "description": "Advanced age may prolong recovery"
      }
    ],
    "recommendations": [
      {
        "type": "Enhanced recovery protocol",
        "priority": "high",
        "description": "Implement fast-track surgical recovery program",
        "expectedImpact": -1.8
      },
      {
        "type": "Early mobilization",
        "priority": "medium",
        "description": "Physical therapy starting day 1 post-op",
        "expectedImpact": -1.2
      }
    ],
    "modelMetrics": {
      "mae": 1.8,
      "rmse": 2.4,
      "rSquared": 0.76,
      "accuracy": 87.3
    }
  }
}

IMPORTANT:
- Predicted days should be realistic based on clinical factors
- Risk level must match the day ranges above
- Factors should be evidence-based clinical indicators
- Recommendations should be specific and actionable
- Model metrics should reflect real ML performance
- Impact values show days added/subtracted from baseline`;

      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 3000,
        temperature: 0.2,
        system: `You are a healthcare predictive analytics AI specializing in length of stay forecasting. Always respond with valid JSON containing stay duration analysis.`,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const response = message.content[0]?.type === 'text' ? message.content[0].text : '';
      if (!response) {
        throw new Error('No response from Claude');
      }

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(response);
      } catch (parseError) {
        console.error('Failed to parse Claude response:', response);
        throw new Error('Invalid JSON response from Claude');
      }

      // Validate response structure
      if (!parsedResponse.forecast) {
        throw new Error('Invalid response structure: missing forecast object');
      }

      // Update audit entry with success
      await this.auditor.logOperation({
        operation: 'length_of_stay_forecasting',
        provider: this.name,
        model: this.model,
        sessionId,
        success: true,
        responseTime: Date.now() - startTime,
        tokensUsed: message.usage?.input_tokens + message.usage?.output_tokens,
        cost: this.calculateCost(message.usage),
      });

      return {
        success: true,
        data: parsedResponse,
        metadata: {
          provider: this.name,
          model: this.model,
          responseTime: Date.now() - startTime,
          tokensUsed: message.usage?.input_tokens + message.usage?.output_tokens,
          cost: this.calculateCost(message.usage),
        },
        warnings: this.extractWarnings(response),
        auditId: auditEntry.id,
      };

    } catch (error) {
      if (sessionId) {
        await this.auditor.logOperation({
          operation: 'length_of_stay_forecasting',
          provider: this.name,
          model: this.model,
          sessionId,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false,
        });
      }

      throw new Error(`Claude length of stay forecasting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async optimizeResourceUtilization(
    operationalData: any,
    context?: string,
    sessionId?: string
  ): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      // Create audit trail
      const auditEntry = await this.auditor.logOperation({
        operation: 'resource_utilization_optimization',
        provider: this.name,
        model: this.model,
        sessionId,
        dataSize: JSON.stringify(operationalData).length,
        purpose: 'resource_optimization',
      });

      const prompt = `You are an expert healthcare operations analyst specializing in hospital resource optimization. Your task is to analyze operational data and generate comprehensive recommendations for optimizing resource utilization across beds, staffing, and equipment.

OPERATIONAL DATA:
- Department: ${operationalData.department || 'General'}
- Time Frame: ${operationalData.timeframe || '24 hours'}
- Current Patient Load: ${operationalData.currentPatients || 0}
- Scheduled Appointments: ${operationalData.currentAppointments || 0}
- Current Bed Occupancy: ${operationalData.currentBedOccupancy || 0}%
- Available Beds: ${operationalData.availableBeds || 0}
- Current Staff Count: ${JSON.stringify(operationalData.currentStaff || {})}
- Equipment Status: ${JSON.stringify(operationalData.equipmentStatus || {})}

CONTEXT: ${context || 'Hospital resource utilization optimization'}

INSTRUCTIONS:
1. Analyze current resource utilization patterns and identify inefficiencies
2. Generate specific recommendations for bed management, staffing optimization, and equipment utilization
3. Calculate potential cost savings and efficiency improvements
4. Provide implementation priority levels and timelines
5. Include risk mitigation strategies for proposed changes

RESPONSE FORMAT:
Return a JSON object with this exact structure:
{
  "optimization": {
    "beds": {
      "currentOccupancy": 78,
      "optimalOccupancy": 85,
      "recommendedCapacity": 120,
      "utilizationRate": 82.3,
      "costSavings": 45000
    },
    "staffing": {
      "nurses": {
        "current": 24,
        "recommended": 22,
        "optimal": 20,
        "costImpact": -15000
      },
      "physicians": {
        "current": 8,
        "recommended": 9,
        "optimal": 8,
        "costImpact": 0
      },
      "support": {
        "current": 15,
        "recommended": 18,
        "optimal": 16,
        "costImpact": 8000
      }
    },
    "equipment": {
      "utilization": {
        "ventilators": 65,
        "monitors": 78,
        "infusion_pumps": 82,
        "defibrillators": 45
      },
      "recommendations": [
        "Redistribute 3 ventilators to ICU from general wards",
        "Schedule preventive maintenance for 2 cardiac monitors",
        "Procure 5 additional infusion pumps for peak hours"
      ],
      "efficiency": 71.5
    },
    "scheduling": {
      "optimizationScore": 87.3,
      "bottleneckHours": ["14:00-16:00", "18:00-20:00"],
      "recommendations": [
        "Shift 2 nurses from night shift to afternoon bottleneck",
        "Schedule elective procedures during low-demand hours",
        "Implement appointment clustering for similar procedures"
      ]
    }
  }
}

IMPORTANT:
- All recommendations must be operationally feasible and clinically safe
- Cost impacts should be realistic based on typical healthcare economics
- Efficiency metrics should reflect actual operational benchmarks
- Recommendations should include specific, actionable steps
- Consider patient safety and care quality in all optimization suggestions`;

      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 3500,
        temperature: 0.2,
        system: `You are a healthcare operations optimization AI specializing in hospital resource management. Always respond with valid JSON containing comprehensive optimization analysis.`,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const response = message.content[0]?.type === 'text' ? message.content[0].text : '';
      if (!response) {
        throw new Error('No response from Claude');
      }

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(response);
      } catch (parseError) {
        console.error('Failed to parse Claude response:', response);
        throw new Error('Invalid JSON response from Claude');
      }

      // Validate response structure
      if (!parsedResponse.optimization) {
        throw new Error('Invalid response structure: missing optimization object');
      }

      // Update audit entry with success
      await this.auditor.logOperation({
        operation: 'resource_utilization_optimization',
        provider: this.name,
        model: this.model,
        sessionId,
        success: true,
        responseTime: Date.now() - startTime,
        tokensUsed: message.usage?.input_tokens + message.usage?.output_tokens,
        cost: this.calculateCost(message.usage),
      });

      return {
        success: true,
        data: parsedResponse,
        metadata: {
          provider: this.name,
          model: this.model,
          responseTime: Date.now() - startTime,
          tokensUsed: message.usage?.input_tokens + message.usage?.output_tokens,
          cost: this.calculateCost(message.usage),
        },
        warnings: this.extractWarnings(response),
        auditId: auditEntry.id,
      };

    } catch (error) {
      if (sessionId) {
        await this.auditor.logOperation({
          operation: 'resource_utilization_optimization',
          provider: this.name,
          model: this.model,
          sessionId,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false,
        });
      }

      throw new Error(`Claude resource utilization optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async reviewMedications(
    patientData: any,
    medications: string[],
    sessionId?: string
  ): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      const sanitizedData = this.sanitizer.sanitizePatientData(patientData);

      const auditEntry = await this.auditor.logOperation({
        operation: 'medication_review',
        provider: this.name,
        model: this.model,
        sessionId,
        dataSize: JSON.stringify(sanitizedData).length,
        purpose: 'medication_review',
      });

      const prompt = this.buildMedicationReviewPrompt(sanitizedData, medications);

      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 2000,
        temperature: 0.1,
        system: `You are an expert clinical pharmacologist. Review medication regimens for:

1. Drug-drug interactions
2. Drug-disease interactions
3. Appropriate dosing
4. Duplications
5. Cost-effectiveness
6. Evidence-based alternatives

Provide specific recommendations with clinical reasoning.`,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
      });

      const response = message.content[0]?.type === 'text' ? message.content[0].text : '';
      if (!response) {
        throw new Error('No response from Claude API');
      }

      const parsedResponse = this.parseMedicationResponse(response);
      const confidence = this.calculateConfidence(response);

      await this.auditor.updateOperationResult(auditEntry.id, {
        success: true,
        responseLength: response.length,
        confidence,
        processingTime: Date.now() - startTime,
        cost: this.calculateCost(message.usage),
      });

      return {
        response: parsedResponse,
        confidence,
        metadata: {
          provider: this.name,
          model: this.model,
          tokensUsed: message.usage?.input_tokens + (message.usage?.output_tokens || 0) || 0,
          processingTime: Date.now() - startTime,
          cost: this.calculateCost(message.usage),
        },
        warnings: this.extractWarnings(response),
        auditId: auditEntry.id,
      };

    } catch (error) {
      if (sessionId) {
        await this.auditor.logOperation({
          operation: 'medication_review',
          provider: this.name,
          model: this.model,
          sessionId,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false,
        });
      }

      throw new Error(`Claude medication review failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildDiagnosisPrompt(patientData: any, context?: string): string {
    return `
Patient Information:
- Age: ${patientData.age}
- Gender: ${patientData.gender}
- Chief Complaint: ${patientData.chiefComplaint}
- Symptoms: ${patientData.symptoms?.join(', ') || 'Not specified'}
- Vital Signs: ${JSON.stringify(patientData.vitalSigns || {})}
- Medical History: ${patientData.medicalHistory?.join(', ') || 'Not specified'}
- Current Medications: ${patientData.currentMedications?.join(', ') || 'Not specified'}

${context ? `Additional Context: ${context}` : ''}

Please provide a differential diagnosis with clinical reasoning.`;
  }

  private buildTreatmentPrompt(patientData: any, diagnosis: string, context?: string): string {
    return `
Patient Information:
- Age: ${patientData.age}
- Gender: ${patientData.gender}
- Diagnosis: ${diagnosis}
- Medical History: ${patientData.medicalHistory?.join(', ') || 'Not specified'}
- Current Medications: ${patientData.currentMedications?.join(', ') || 'Not specified'}
- Allergies: ${patientData.allergies?.join(', ') || 'Not specified'}

${context ? `Additional Context: ${context}` : ''}

Please create a comprehensive treatment plan.`;
  }

  private buildMedicationReviewPrompt(patientData: any, medications: string[]): string {
    return `
Patient Information:
- Age: ${patientData.age}
- Medical History: ${patientData.medicalHistory?.join(', ') || 'Not specified'}
- Current Medications: ${medications.join(', ')}
- Allergies: ${patientData.allergies?.join(', ') || 'Not specified'}

Please review this medication regimen for safety and appropriateness.`;
  }

  private parseDiagnosisResponse(response: string): string {
    return response.trim();
  }

  private parseTreatmentResponse(response: string): string {
    return response.trim();
  }

  private parseMedicationResponse(response: string): string {
    return response.trim();
  }

  private calculateConfidence(response: string): number {
    const hasStructuredResponse = response.includes('1.') || response.includes('Diagnosis:');
    const length = response.length;

    let confidence = 0.5;

    if (hasStructuredResponse) confidence += 0.2;
    if (length > 500) confidence += 0.1;
    if (length > 1000) confidence += 0.1;
    if (response.includes('differential') || response.includes('consider')) confidence += 0.1;

    return Math.min(confidence, 0.95);
  }

  private extractWarnings(response: string): string[] {
    const warnings: string[] = [];

    if (response.toLowerCase().includes('uncertain') ||
        response.toLowerCase().includes('consider further testing')) {
      warnings.push('AI suggests additional testing may be needed');
    }

    if (response.toLowerCase().includes('emergent') ||
        response.toLowerCase().includes('immediate')) {
      warnings.push('AI indicates potentially urgent condition');
    }

    return warnings;
  }

  private calculateCost(usage: any): number {
    if (!usage) return 0;

    // Claude Sonnet pricing (as of 2024)
    const inputCostPerToken = 0.003 / 1000; // $0.003 per 1K tokens
    const outputCostPerToken = 0.015 / 1000; // $0.015 per 1K tokens

    const inputCost = (usage.input_tokens || 0) * inputCostPerToken;
    const outputCost = (usage.output_tokens || 0) * outputCostPerToken;

    return inputCost + outputCost;
  }

  private buildTreatmentRecommendationsPrompt(patientData: any, diagnoses: string[], context?: string): string {
    return `
Patient Information:
- Age: ${patientData.age}
- Gender: ${patientData.gender}
- Weight: ${patientData.weight} kg
- Allergies: ${patientData.allergies?.join(', ') || 'None specified'}
- Comorbidities: ${patientData.comorbidities?.join(', ') || 'None specified'}
- Current Medications: ${patientData.medications?.join(', ') || 'None specified'}
- Vital Signs: BP ${patientData.vitals?.bloodPressure || 'Not specified'}, HR ${patientData.vitals?.heartRate || 'Not specified'} bpm

Diagnoses to Address:
${diagnoses.map((d, i) => `${i + 1}. ${d}`).join('\n')}

${context ? `Additional Context: ${context}` : ''}

Generate evidence-based treatment recommendations for each diagnosis, considering patient-specific factors, drug interactions, and clinical guidelines.`;
  }

  private parseTreatmentRecommendationsResponse(response: string): string {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(response);
      return JSON.stringify(parsed);
    } catch {
      // If not JSON, return as structured text
      return response.trim();
    }
  }
}