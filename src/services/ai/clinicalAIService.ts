import { supabase } from '@/integrations/supabase/client';

// AI Service Configuration
const AI_CONFIG = {
  openai: {
    apiKey: process.env.VITE_OPENAI_API_KEY,
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4' // Using GPT-4 for superior clinical reasoning
  },
  anthropic: {
    apiKey: process.env.VITE_ANTHROPIC_API_KEY,
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-3-sonnet-20240229'
  },
  // Fallback to mock responses if no API keys
  useMock: !process.env.VITE_OPENAI_API_KEY && !process.env.VITE_ANTHROPIC_API_KEY
};

// AI Service Interface
export interface AIServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  fallback?: boolean;
}

// Clinical AI Service Class
export class ClinicalAIService {
  private provider: 'openai' | 'anthropic' = 'openai';

  constructor() {
    // Choose provider based on available API keys
    if (AI_CONFIG.anthropic.apiKey) {
      this.provider = 'anthropic';
    } else if (AI_CONFIG.openai.apiKey) {
      this.provider = 'openai';
    }
  }

  // Differential Diagnosis Analysis
  async analyzeDifferentialDiagnosis(params: {
    symptoms: string[];
    patientHistory: string;
    vitalSigns?: Record<string, any>;
    context?: string;
  }): Promise<AIServiceResponse> {
    if (AI_CONFIG.useMock) {
      return this.generateMockDifferentialDiagnosis(params);
    }

    try {
      const prompt = this.buildDifferentialDiagnosisPrompt(params);

      const response = await this.callAIProvider(prompt, {
        temperature: 0.3,
        maxTokens: 1000,
        systemPrompt: 'You are a medical AI assistant providing differential diagnosis analysis. Always include confidence scores and evidence-based reasoning.'
      });

      const parsed = this.parseDifferentialDiagnosisResponse(response);
      return { success: true, data: parsed };
    } catch (error) {
      console.error('AI differential diagnosis failed:', error);
      return this.generateMockDifferentialDiagnosis(params);
    }
  }

  // Drug Interaction Analysis
  async analyzeDrugInteractions(params: {
    medications: string[];
    allergies?: string[];
    patientContext?: string;
  }): Promise<AIServiceResponse> {
    if (AI_CONFIG.useMock) {
      return this.generateMockDrugInteractions(params);
    }

    try {
      const prompt = this.buildDrugInteractionPrompt(params);

      const response = await this.callAIProvider(prompt, {
        temperature: 0.2,
        maxTokens: 800,
        systemPrompt: 'You are a pharmacology expert analyzing drug interactions. Provide evidence-based analysis with severity ratings.'
      });

      const parsed = this.parseDrugInteractionResponse(response);
      return { success: true, data: parsed };
    } catch (error) {
      console.error('AI drug interaction analysis failed:', error);
      return this.generateMockDrugInteractions(params);
    }
  }

  // Clinical Guidelines Analysis
  async analyzeClinicalGuidelines(params: {
    age: number;
    chiefComplaint: string;
    medicalHistory: string[];
    context?: string;
  }): Promise<AIServiceResponse> {
    if (AI_CONFIG.useMock) {
      return this.generateMockClinicalGuidelines(params);
    }

    try {
      const prompt = this.buildClinicalGuidelinesPrompt(params);

      const response = await this.callAIProvider(prompt, {
        temperature: 0.3,
        maxTokens: 600,
        systemPrompt: 'You are a clinical guidelines expert providing evidence-based recommendations.'
      });

      const parsed = this.parseClinicalGuidelinesResponse(response);
      return { success: true, data: parsed };
    } catch (error) {
      console.error('AI clinical guidelines analysis failed:', error);
      return this.generateMockClinicalGuidelines(params);
    }
  }

  // Risk Assessment
  async assessPatientRisks(params: {
    patientData: any;
    assessmentTypes: string[];
  }): Promise<AIServiceResponse> {
    if (AI_CONFIG.useMock) {
      return this.generateMockRiskAssessment(params);
    }

    try {
      const prompt = this.buildRiskAssessmentPrompt(params);

      const response = await this.callAIProvider(prompt, {
        temperature: 0.2,
        maxTokens: 700,
        systemPrompt: 'You are a risk assessment expert providing evidence-based patient risk analysis.'
      });

      const parsed = this.parseRiskAssessmentResponse(response);
      return { success: true, data: parsed };
    } catch (error) {
      console.error('AI risk assessment failed:', error);
      return this.generateMockRiskAssessment(params);
    }
  }

  // Treatment Guidelines Analysis
  async getTreatmentGuidelines(params: {
    condition: string;
    patientProfile?: any;
    context?: string;
  }): Promise<AIServiceResponse> {
    if (AI_CONFIG.useMock) {
      return this.generateMockTreatmentGuidelines(params);
    }

    try {
      const prompt = this.buildTreatmentGuidelinesPrompt(params);

      const response = await this.callAIProvider(prompt, {
        temperature: 0.3,
        maxTokens: 800,
        systemPrompt: 'You are a clinical guidelines expert providing evidence-based treatment recommendations for specific conditions.'
      });

      const parsed = this.parseTreatmentGuidelinesResponse(response);
      return { success: true, data: parsed };
    } catch (error) {
      console.error('AI treatment guidelines analysis failed:', error);
      return this.generateMockTreatmentGuidelines(params);
    }
  }

  // Core AI Provider Call
  private async callAIProvider(prompt: string, options: {
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
  }): Promise<string> {
    const config = AI_CONFIG[this.provider];

    if (this.provider === 'openai') {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
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
    } else if (this.provider === 'anthropic') {
      const response = await fetch(`${config.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: config.model,
          system: options.systemPrompt,
          messages: [{ role: 'user', content: prompt }],
          temperature: options.temperature,
          max_tokens: options.maxTokens
        })
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }

      const data = await response.json();
      return data.content[0].text;
    }

    throw new Error('No AI provider configured');
  }

  // Prompt Building Methods
  private buildDifferentialDiagnosisPrompt(params: any): string {
    return `You are a board-certified physician with extensive clinical experience. Analyze the following patient presentation using evidence-based medicine principles and provide a comprehensive differential diagnosis.

PATIENT PRESENTATION:
- Chief Symptoms: ${params.symptoms.join(', ')}
- Medical History: ${params.patientHistory || 'Not provided'}
- Vital Signs: ${params.vitalSigns ? JSON.stringify(params.vitalSigns) : 'Not available'}
- Clinical Context: ${params.context || 'General practice setting'}

DIFFERENTIAL DIAGNOSIS ANALYSIS:

1. **Top Differential Diagnoses** (3-5 most likely conditions):
   - Consider both common and serious conditions
   - Account for patient's age, history, and presentation
   - Include both acute and chronic possibilities

2. **Clinical Reasoning** for each diagnosis:
   - Pathophysiology supporting the diagnosis
   - Key clinical features matching the presentation
   - Risk factors or predisposing conditions
   - Likelihood based on epidemiology

3. **Diagnostic Workup** recommendations:
   - Essential immediate tests/labs/imaging
   - Supporting diagnostic studies
   - Red flags requiring urgent evaluation

4. **Clinical Decision Making**:
   - Most likely diagnosis with confidence level
   - Conditions to "rule out" first
   - When to consider specialist consultation

Format as JSON with the following structure:
{
  "differential_diagnoses": [
    {
      "condition": "string",
      "confidence": number (0.0-1.0),
      "category": "acute|chronic|serious|common",
      "evidence": ["string"],
      "icd10_code": "string",
      "red_flags": ["string"],
      "recommended_workup": ["string"]
    }
  ],
  "most_likely_diagnosis": "string",
  "clinical_reasoning": "string",
  "urgent_concerns": ["string"],
  "follow_up_recommendations": ["string"]
}

Ensure your analysis follows evidence-based medicine principles and considers patient safety first.`;
  }

  private buildDrugInteractionPrompt(params: any): string {
    return `Analyze potential drug interactions for the following medications:

Medications: ${params.medications.join(', ')}
Allergies: ${params.allergies?.join(', ') || 'None reported'}
Patient Context: ${params.patientContext || 'General'}

Please identify:
1. Any drug-drug interactions
2. Drug-allergy interactions
3. Severity level (low/medium/high/critical)
4. Clinical recommendations
5. Evidence supporting each interaction

Format as JSON with keys: hasInteractions (boolean), interactions (array of objects with drugs, severity, description, recommendation, evidence)`;
  }

  private buildClinicalGuidelinesPrompt(params: any): string {
    return `Based on current clinical guidelines, analyze this patient presentation:

Patient Age: ${params.age}
Chief Complaint: ${params.chiefComplaint}
Medical History: ${params.medicalHistory.join(', ')}
Context: ${params.context || 'Primary care'}

Provide guideline-based recommendations for:
1. Screening tests needed
2. Treatment considerations
3. Follow-up requirements
4. Preventive measures

Format as JSON array of guideline objects with keys: title, priority (low/medium/high), recommendation, evidence`;
  }

  private buildTreatmentGuidelinesPrompt(params: any): string {
    return `Provide evidence-based treatment guidelines for the following condition:

Condition: ${params.condition}
Patient Profile: ${params.patientProfile ? JSON.stringify(params.patientProfile) : 'General adult patient'}
Context: ${params.context || 'Primary care setting'}

Please provide:
1. First-line treatment options
2. Alternative treatments if first-line fails
3. Monitoring and follow-up requirements
4. Lifestyle modifications
5. When to refer to specialist
6. Evidence-based rationale for recommendations

Format as JSON array of treatment objects with keys: title, priority (low/medium/high), recommendation, evidence`;
  }

  private buildRiskAssessmentPrompt(params: any): string {
    return `Perform risk assessment for this patient:

Patient Data: ${JSON.stringify(params.patientData)}
Assessment Types: ${params.assessmentTypes.join(', ')}

For each risk type, provide:
1. Risk level (low/medium/high/critical)
2. Risk score (0-1)
3. Contributing factors
4. Recommendations to mitigate risk

Format as JSON array of risk objects with keys: type, level, score, factors (array), recommendation`;
  }

  // Response Parsing Methods
  private parseDifferentialDiagnosisResponse(response: string): any[] {
    try {
      // Extract JSON from response - look for the full JSON object
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // Return the differential_diagnoses array if it exists, otherwise convert to expected format
        if (parsed.differential_diagnoses) {
          return parsed.differential_diagnoses.map((diag: any) => ({
            condition: diag.condition,
            confidence: diag.confidence,
            evidence: diag.evidence || [],
            icd10_code: diag.icd10_code,
            category: diag.category,
            red_flags: diag.red_flags || [],
            recommended_workup: diag.recommended_workup || []
          }));
        }
        // Fallback to old format if needed
        return parsed;
      }
      // Fallback parsing
      return this.parseDifferentialDiagnosisText(response);
    } catch (error) {
      console.warn('Failed to parse AI response, using fallback');
      return [];
    }
  }

  private parseDrugInteractionResponse(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { hasInteractions: false, interactions: [] };
    } catch (error) {
      return { hasInteractions: false, interactions: [] };
    }
  }

  private parseClinicalGuidelinesResponse(response: string): any[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  private parseRiskAssessmentResponse(response: string): any[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  private parseDifferentialDiagnosisText(response: string): any[] {
    // Basic text parsing fallback
    const diagnoses = [];
    const lines = response.split('\n');

    for (const line of lines) {
      if (line.includes('condition') || line.includes('diagnosis')) {
        // Extract basic info from text
        const condition = line.replace(/.*?(?:condition|diagnosis)[:\s]*/i, '').trim();
        if (condition) {
          diagnoses.push({
            condition,
            confidence: 0.5,
            evidence: ['AI analysis'],
            icd10_code: 'R69' // Unknown diagnosis
          });
        }
      }
    }

    return diagnoses;
  }

  private parseTreatmentGuidelinesResponse(response: string): any[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  // Mock Response Generators (for when AI services are unavailable)
  private generateMockDifferentialDiagnosis(params: any): AIServiceResponse {
    const diagnoses = [
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

    return { success: true, data: diagnoses, fallback: true };
  }

  private generateMockDrugInteractions(params: any): AIServiceResponse {
    const interactions = [];

    if (params.medications.some((m: string) => m.toLowerCase().includes('warfarin')) &&
        params.medications.some((m: string) => m.toLowerCase().includes('aspirin'))) {
      interactions.push({
        drugs: ['warfarin', 'aspirin'],
        severity: 'high',
        description: 'Increased bleeding risk',
        recommendation: 'Monitor INR closely',
        evidence: ['Known pharmacokinetic interaction']
      });
    }

    return {
      success: true,
      data: {
        hasInteractions: interactions.length > 0,
        interactions,
        severity: interactions.length > 0 ? 'high' : 'none'
      },
      fallback: true
    };
  }

  private generateMockClinicalGuidelines(params: any): AIServiceResponse {
    const guidelines = [];

    if (params.age >= 45) {
      guidelines.push({
        title: 'Diabetes screening recommended',
        priority: 'medium',
        recommendation: 'Order HbA1c and fasting glucose',
        evidence: ['ADA guidelines for age ≥45']
      });
    }

    return { success: true, data: guidelines, fallback: true };
  }

  private generateMockRiskAssessment(params: any): AIServiceResponse {
    const risks = [];

    if (params.patientData.age > 65) {
      risks.push({
        type: 'fall_risk',
        level: 'medium',
        score: 0.65,
        factors: ['Age > 65', 'Potential mobility issues'],
        recommendation: 'Implement fall prevention measures'
      });
    }

    return { success: true, data: risks, fallback: true };
  }

  private generateMockTreatmentGuidelines(params: any): AIServiceResponse {
    const guidelines = [];

    const condition = params.condition.toLowerCase();

    if (condition.includes('hypertension')) {
      guidelines.push(
        {
          title: 'First-line treatment: ACE inhibitors or ARBs',
          priority: 'high',
          recommendation: 'Start with lisinopril 10mg daily or losartan 50mg daily',
          evidence: ['ACC/AHA guidelines 2017']
        },
        {
          title: 'Blood pressure target: <130/80 mmHg',
          priority: 'high',
          recommendation: 'Monitor BP at each visit, adjust medication as needed',
          evidence: ['ACC/AHA guidelines 2017']
        },
        {
          title: 'Lifestyle modifications essential',
          priority: 'medium',
          recommendation: 'Dietary Approaches to Stop Hypertension (DASH) diet, regular exercise, weight management',
          evidence: ['Multiple RCTs showing 5-10 mmHg reduction']
        }
      );
    } else if (condition.includes('diabetes')) {
      guidelines.push(
        {
          title: 'First-line: Metformin + lifestyle modification',
          priority: 'high',
          recommendation: 'Start metformin 500mg twice daily, titrate to 1000mg twice daily',
          evidence: ['ADA Standards of Care 2023']
        },
        {
          title: 'HbA1c target: <7.0%',
          priority: 'high',
          recommendation: 'Check HbA1c every 3 months until target reached, then every 6 months',
          evidence: ['ADA Standards of Care 2023']
        },
        {
          title: 'Annual screening for complications',
          priority: 'medium',
          recommendation: 'Eye exam, foot exam, kidney function tests, lipid panel annually',
          evidence: ['ADA Standards of Care 2023']
        }
      );
    } else {
      guidelines.push({
        title: 'General treatment approach',
        priority: 'medium',
        recommendation: 'Consult specialist for condition-specific guidelines',
        evidence: ['General medical practice']
      });
    }

    return { success: true, data: guidelines, fallback: true };
  }
}

// Export singleton instance
export const clinicalAIService = new ClinicalAIService();