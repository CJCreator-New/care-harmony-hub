import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface AIInsight {
  type: 'drug_interaction' | 'clinical_guideline' | 'risk_assessment';
  severity: 'low' | 'medium' | 'high';
  message: string;
  recommendation: string;
  confidence?: number;
  evidence?: string[];
  source?: string;
}

export interface RiskLevel {
  type: string;
  level: 'low' | 'medium' | 'high';
  score: number;
  color: string;
}

export interface TreatmentGuideline {
  condition: string;
  recommendations: string[];
}

export function useAIClinicalSuggestions(patientId?: string) {
  const { profile } = useAuth();

  // Query for patient-specific AI insights using real AI analysis
  const { data: aiInsights = [], isLoading: isLoadingInsights, error: insightsError } = useQuery({
    queryKey: ['ai-insights', patientId],
    queryFn: async () => {
      if (!patientId) return [];

      // Get patient data for context
      const { data: patientData } = await supabase
        .from('patients')
        .select('medical_history, current_medications, allergies, age, gender, chief_complaint, vital_signs')
        .eq('id', patientId)
        .single();

      if (!patientData) return [];

      const insights: AIInsight[] = [];

      try {
        // Real AI-powered drug interaction analysis
        if (patientData.current_medications && patientData.current_medications.length > 0) {
          const drugAnalysis = await analyzeDrugInteractions(patientData.current_medications, patientData.allergies || []);
          insights.push(...drugAnalysis);
        }

        // Real AI-powered clinical guideline analysis
        if (patientData.age && patientData.chief_complaint) {
          const guidelineAnalysis = await analyzeClinicalGuidelines(patientData.age, patientData.chief_complaint, patientData.medical_history || []);
          insights.push(...guidelineAnalysis);
        }

        // Real AI-powered risk assessment
        const riskAnalysis = await assessPatientRisks(patientData);
        insights.push(...riskAnalysis);

        // Log AI usage for audit and improvement
        await supabase.from('activity_logs').insert({
          user_id: profile?.user_id,
          hospital_id: profile?.hospital_id,
          action_type: 'ai_clinical_analysis',
          entity_type: 'patient',
          entity_id: patientId,
          details: {
            insights_generated: insights.length,
            confidence_scores: insights.map(i => i.confidence),
            analysis_types: [...new Set(insights.map(i => i.type))]
          }
        });

      } catch (error) {
        console.error('AI analysis failed:', error);
        // Fallback to basic analysis if AI fails
        insights.push(...generateFallbackInsights(patientData));
      }

      return insights;
    },
    enabled: !!patientId,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query for patient risk levels
  const { data: riskLevels = [], isLoading: isLoadingRisks } = useQuery({
    queryKey: ['patient-risks', patientId],
    queryFn: async () => {
      if (!patientId) return [];

      // Get patient clinical data
      const { data: patientData } = await supabase
        .from('patients')
        .select('age, medical_history, current_medications')
        .eq('id', patientId)
        .single();

      if (!patientData) return [];

      const risks: RiskLevel[] = [];

      // Cardiovascular risk assessment
      let cvRisk = 0.3; // baseline
      if (patientData.age && patientData.age > 65) cvRisk += 0.3;
      if (patientData.medical_history?.includes('hypertension')) cvRisk += 0.25;
      if (patientData.current_medications?.some((med: string) => med.toLowerCase().includes('statin'))) cvRisk += 0.1;

      risks.push({
        type: 'Cardiovascular',
        level: cvRisk > 0.7 ? 'high' : cvRisk > 0.4 ? 'medium' : 'low',
        score: Math.min(cvRisk, 1),
        color: cvRisk > 0.7 ? 'bg-red-100 text-red-800' : cvRisk > 0.4 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
      });

      // Diabetes risk
      let diabetesRisk = 0.2;
      if (patientData.age && patientData.age > 45) diabetesRisk += 0.3;
      if (patientData.medical_history?.includes('obesity')) diabetesRisk += 0.25;

      risks.push({
        type: 'Diabetes',
        level: diabetesRisk > 0.6 ? 'high' : diabetesRisk > 0.3 ? 'medium' : 'low',
        score: Math.min(diabetesRisk, 1),
        color: diabetesRisk > 0.6 ? 'bg-red-100 text-red-800' : diabetesRisk > 0.3 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
      });

      // Fall risk
      let fallRisk = 0.15;
      if (patientData.age && patientData.age > 65) fallRisk += 0.4;
      if (patientData.current_medications && patientData.current_medications.length > 3) fallRisk += 0.3;

      risks.push({
        type: 'Fall Risk',
        level: fallRisk > 0.5 ? 'high' : fallRisk > 0.25 ? 'medium' : 'low',
        score: Math.min(fallRisk, 1),
        color: fallRisk > 0.5 ? 'bg-red-100 text-red-800' : fallRisk > 0.25 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
      });

      // Readmission risk
      let readmissionRisk = 0.2;
      if (patientData.medical_history?.includes('multiple')) readmissionRisk += 0.4;
      if (patientData.age && patientData.age > 70) readmissionRisk += 0.2;

      risks.push({
        type: 'Readmission',
        level: readmissionRisk > 0.5 ? 'high' : readmissionRisk > 0.3 ? 'medium' : 'low',
        score: Math.min(readmissionRisk, 1),
        color: readmissionRisk > 0.5 ? 'bg-red-100 text-red-800' : readmissionRisk > 0.3 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
      });

      return risks;
    },
    enabled: !!patientId
  });

  // Static treatment guidelines (could be made dynamic later)
  const treatmentGuidelines: TreatmentGuideline[] = [
    {
      condition: 'Hypertension Management',
      recommendations: [
        'First-line: ACE inhibitors or ARBs',
        'Target BP: < 130/80 mmHg',
        'Lifestyle modifications essential'
      ]
    },
    {
      condition: 'Diabetes Type 2',
      recommendations: [
        'First-line: Metformin + lifestyle',
        'Target HbA1c: < 7%',
        'Annual screening for complications'
      ]
    }
  ];

  return {
    aiInsights,
    riskLevels,
    treatmentGuidelines,
    isLoading: isLoadingInsights || isLoadingRisks,
    error: insightsError
  };
}

// Real AI analysis functions
async function analyzeDrugInteractions(medications: string[], allergies: string[]): Promise<AIInsight[]> {
  const insights: AIInsight[] = [];

  try {
    // Call real AI service for drug interaction analysis
    const response = await fetch('/api/ai/drug-interactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        medications,
        allergies,
        patient_context: 'hospital_inpatient'
      })
    });

    if (response.ok) {
      const aiResult = await response.json();

      // Process AI results into insights
      aiResult.interactions.forEach((interaction: any) => {
        insights.push({
          type: 'drug_interaction',
          severity: interaction.severity,
          message: interaction.description,
          recommendation: interaction.recommendation,
          confidence: interaction.confidence,
          evidence: interaction.evidence,
          source: 'AI_Analysis'
        });
      });
    } else {
      // Fallback to rule-based analysis
      insights.push(...generateRuleBasedDrugInteractions(medications, allergies));
    }
  } catch (error) {
    console.warn('AI drug interaction analysis failed, using rule-based fallback:', error);
    insights.push(...generateRuleBasedDrugInteractions(medications, allergies));
  }

  return insights;
}

async function analyzeClinicalGuidelines(age: number, chiefComplaint: string, medicalHistory: string[]): Promise<AIInsight[]> {
  const insights: AIInsight[] = [];

  try {
    // Call real AI service for clinical guideline analysis
    const response = await fetch('/api/ai/clinical-guidelines', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        age,
        chief_complaint: chiefComplaint,
        medical_history: medicalHistory,
        context: 'primary_care'
      })
    });

    if (response.ok) {
      const aiResult = await response.json();

      aiResult.guidelines.forEach((guideline: any) => {
        insights.push({
          type: 'clinical_guideline',
          severity: guideline.priority,
          message: guideline.title,
          recommendation: guideline.recommendation,
          confidence: guideline.confidence,
          evidence: guideline.evidence,
          source: 'Clinical_Guidelines_AI'
        });
      });
    } else {
      // Fallback to basic guideline checks
      insights.push(...generateBasicGuidelines(age, chiefComplaint, medicalHistory));
    }
  } catch (error) {
    console.warn('AI clinical guideline analysis failed, using basic fallback:', error);
    insights.push(...generateBasicGuidelines(age, chiefComplaint, medicalHistory));
  }

  return insights;
}

async function assessPatientRisks(patientData: any): Promise<AIInsight[]> {
  const insights: AIInsight[] = [];

  try {
    // Call real AI service for risk assessment
    const response = await fetch('/api/ai/risk-assessment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        patient_data: patientData,
        assessment_types: ['fall_risk', 'readmission_risk', 'cardiovascular_risk']
      })
    });

    if (response.ok) {
      const aiResult = await response.json();

      aiResult.risks.forEach((risk: any) => {
        insights.push({
          type: 'risk_assessment',
          severity: risk.level,
          message: risk.description,
          recommendation: risk.recommendation,
          confidence: risk.confidence,
          evidence: risk.factors,
          source: 'Risk_Assessment_AI'
        });
      });
    } else {
      // Fallback to basic risk assessment
      insights.push(...generateBasicRiskAssessment(patientData));
    }
  } catch (error) {
    console.warn('AI risk assessment failed, using basic fallback:', error);
    insights.push(...generateBasicRiskAssessment(patientData));
  }

  return insights;
}

// Fallback functions for when AI services are unavailable
function generateRuleBasedDrugInteractions(medications: string[], allergies: string[]): AIInsight[] {
  const insights: AIInsight[] = [];

  // Allergy checks
  allergies.forEach(allergy => {
    const allergicMeds = medications.filter(med =>
      med.toLowerCase().includes(allergy.toLowerCase())
    );
    if (allergicMeds.length > 0) {
      insights.push({
        type: 'drug_interaction',
        severity: 'high',
        message: `Patient allergic to ${allergy} - prescribed: ${allergicMeds.join(', ')}`,
        recommendation: 'Discontinue immediately and find alternative medication',
        confidence: 0.99,
        source: 'Allergy_Check'
      });
    }
  });

  // Common dangerous combinations
  const dangerousCombos = [
    {
      drugs: ['warfarin', 'aspirin'],
      severity: 'high' as const,
      message: 'Warfarin + Aspirin: Significantly increased bleeding risk',
      recommendation: 'Monitor INR closely, consider alternative pain management'
    },
    {
      drugs: ['warfarin', 'heparin'],
      severity: 'critical' as const,
      message: 'Warfarin + Heparin: Excessive anticoagulation risk',
      recommendation: 'Monitor coagulation studies frequently'
    },
    {
      drugs: ['lithium', 'nsaid'],
      severity: 'high' as const,
      message: 'Lithium + NSAID: Lithium toxicity risk',
      recommendation: 'Monitor lithium levels, consider alternative analgesics'
    }
  ];

  dangerousCombos.forEach(combo => {
    const hasBothDrugs = combo.drugs.every(drug =>
      medications.some(med => med.toLowerCase().includes(drug.toLowerCase()))
    );

    if (hasBothDrugs) {
      insights.push({
        type: 'drug_interaction',
        severity: combo.severity,
        message: combo.message,
        recommendation: combo.recommendation,
        confidence: 0.90,
        source: 'Rule_Based_Analysis'
      });
    }
  });

  return insights;
}

function generateBasicGuidelines(age: number, chiefComplaint: string, medicalHistory: string[]): AIInsight[] {
  const insights: AIInsight[] = [];

  // Age-based screening guidelines
  if (age >= 45) {
    insights.push({
      type: 'clinical_guideline',
      severity: 'medium',
      message: 'Patient meets criteria for diabetes screening',
      recommendation: 'Order HbA1c and fasting glucose tests',
      confidence: 0.85,
      source: 'ADA_Guidelines'
    });
  }

  if (age >= 50) {
    insights.push({
      type: 'clinical_guideline',
      severity: 'medium',
      message: 'Patient eligible for colorectal cancer screening',
      recommendation: 'Order colonoscopy or FIT test',
      confidence: 0.80,
      source: 'ACS_Guidelines'
    });
  }

  // Chief complaint based guidelines
  if (chiefComplaint.toLowerCase().includes('chest pain')) {
    insights.push({
      type: 'clinical_guideline',
      severity: 'high',
      message: 'Chest pain requires immediate cardiac evaluation',
      recommendation: 'Order ECG, cardiac enzymes, and consider cardiology consult',
      confidence: 0.95,
      source: 'ACC_AHA_Guidelines'
    });
  }

  return insights;
}

function generateBasicRiskAssessment(patientData: any): AIInsight[] {
  const insights: AIInsight[] = [];

  // Fall risk assessment
  let fallRiskScore = 0;
  if (patientData.age > 65) fallRiskScore += 2;
  if (patientData.current_medications?.length > 3) fallRiskScore += 1;
  if (patientData.medical_history?.some((h: string) => h.toLowerCase().includes('fall'))) fallRiskScore += 2;

  const fallRiskLevel = fallRiskScore >= 3 ? 'high' : fallRiskScore >= 1 ? 'medium' : 'low';
  if (fallRiskLevel !== 'low') {
    insights.push({
      type: 'risk_assessment',
      severity: fallRiskLevel,
      message: `${fallRiskLevel.charAt(0).toUpperCase() + fallRiskLevel.slice(1)} fall risk identified`,
      recommendation: fallRiskLevel === 'high' ? 'Implement fall prevention protocol' : 'Monitor for fall risk factors',
      confidence: 0.75,
      source: 'Basic_Risk_Assessment'
    });
  }

  return insights;
}

function generateFallbackInsights(patientData: any): AIInsight[] {
  const insights: AIInsight[] = [];

  // Basic fallback insights when AI completely fails
  if (patientData.age > 65) {
    insights.push({
      type: 'risk_assessment',
      severity: 'medium',
      message: 'Elderly patient - increased monitoring recommended',
      recommendation: 'Consider geriatric assessment and fall prevention',
      confidence: 0.70,
      source: 'Fallback_Analysis'
    });
  }

  return insights;
}