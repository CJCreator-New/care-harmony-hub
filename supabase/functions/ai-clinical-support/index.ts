/// <reference types="https://esm.sh/@types/deno@2.5.0" />
import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClinicalData {
  symptoms: string[];
  vital_signs: { [key: string]: number };
  medical_history: string[];
  medications: string[];
  lab_results?: { [key: string]: number };
}

interface DiagnosisRecommendation {
  condition: string;
  confidence: number;
  reasoning: string[];
  recommended_tests: string[];
  treatment_options: string[];
  risk_factors: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = (globalThis as any).Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = (globalThis as any).Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, data } = await req.json();

    switch (action) {
      case 'analyze_symptoms':
        return await analyzeSymptoms(supabase, data);
      case 'drug_interaction_check':
        return await checkDrugInteractions(supabase, data);
      case 'risk_assessment':
        return await assessPatientRisk(supabase, data);
      case 'treatment_recommendations':
        return await getTreatmentRecommendations(supabase, data);
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

async function analyzeSymptoms(supabase: any, { clinical_data }: { clinical_data: ClinicalData }) {
  // AI-powered symptom analysis (simplified rule-based system)
  const recommendations: DiagnosisRecommendation[] = [];

  // Cardiovascular conditions
  if (clinical_data.symptoms.includes('chest_pain') && 
      clinical_data.vital_signs.blood_pressure_systolic > 140) {
    recommendations.push({
      condition: 'Hypertensive Crisis',
      confidence: 0.85,
      reasoning: ['Chest pain with elevated blood pressure', 'Requires immediate attention'],
      recommended_tests: ['ECG', 'Cardiac enzymes', 'Chest X-ray'],
      treatment_options: ['Antihypertensive medication', 'Cardiac monitoring'],
      risk_factors: ['High blood pressure', 'Chest pain']
    });
  }

  // Respiratory conditions
  if (clinical_data.symptoms.includes('shortness_of_breath') && 
      clinical_data.vital_signs.oxygen_saturation < 95) {
    recommendations.push({
      condition: 'Respiratory Distress',
      confidence: 0.78,
      reasoning: ['Low oxygen saturation', 'Breathing difficulties'],
      recommended_tests: ['Arterial blood gas', 'Chest X-ray', 'Pulmonary function tests'],
      treatment_options: ['Oxygen therapy', 'Bronchodilators'],
      risk_factors: ['Low oxygen levels', 'Respiratory symptoms']
    });
  }

  // Infectious conditions
  if (clinical_data.symptoms.includes('fever') && 
      clinical_data.vital_signs.temperature > 38.5) {
    recommendations.push({
      condition: 'Infectious Process',
      confidence: 0.72,
      reasoning: ['High fever', 'Systemic symptoms'],
      recommended_tests: ['Complete blood count', 'Blood cultures', 'Urinalysis'],
      treatment_options: ['Antipyretics', 'Antibiotics if bacterial'],
      risk_factors: ['High fever', 'Potential infection']
    });
  }

  // Store analysis in database
  const analysisId = crypto.randomUUID();
  await supabase.from('ai_clinical_analyses').insert({
    id: analysisId,
    clinical_data,
    recommendations,
    analysis_type: 'symptom_analysis',
    created_at: new Date().toISOString(),
  });

  return new Response(
    JSON.stringify({ analysis_id: analysisId, recommendations }),
    { headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

async function checkDrugInteractions(supabase: any, { medications }: { medications: string[] }) {
  // Drug interaction database (simplified)
  const interactions = [
    {
      drugs: ['warfarin', 'aspirin'],
      severity: 'high',
      description: 'Increased bleeding risk',
      recommendation: 'Monitor INR closely, consider alternative'
    },
    {
      drugs: ['metformin', 'contrast_dye'],
      severity: 'medium',
      description: 'Risk of lactic acidosis',
      recommendation: 'Hold metformin 48 hours before and after contrast'
    },
    {
      drugs: ['digoxin', 'furosemide'],
      severity: 'medium',
      description: 'Hypokalemia may increase digoxin toxicity',
      recommendation: 'Monitor potassium levels and digoxin levels'
    }
  ];

  const detectedInteractions = interactions.filter(interaction =>
    interaction.drugs.every(drug => 
      medications.some(med => med.toLowerCase().includes(drug))
    )
  );

  return new Response(
    JSON.stringify({ 
      interactions_found: detectedInteractions.length,
      interactions: detectedInteractions 
    }),
    { headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

async function assessPatientRisk(supabase: any, { patient_id }: { patient_id: string }) {
  // Get patient data
  const { data: patient } = await supabase
    .from('patients')
    .select(`
      *,
      consultations(*),
      vital_signs(*),
      prescriptions(*)
    `)
    .eq('id', patient_id)
    .single();

  if (!patient) throw new Error('Patient not found');

  // Calculate risk scores
  const riskFactors = {
    cardiovascular: calculateCardiovascularRisk(patient),
    diabetes: calculateDiabetesRisk(patient),
    fall_risk: calculateFallRisk(patient),
    readmission: calculateReadmissionRisk(patient)
  };

  const overallRisk = Object.values(riskFactors).reduce((sum, risk) => sum + risk, 0) / 4;

  return new Response(
    JSON.stringify({
      patient_id,
      overall_risk_score: Math.round(overallRisk * 100) / 100,
      risk_factors: riskFactors,
      risk_level: overallRisk > 0.7 ? 'high' : overallRisk > 0.4 ? 'medium' : 'low',
      recommendations: generateRiskRecommendations(riskFactors)
    }),
    { headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

async function getTreatmentRecommendations(supabase: any, { diagnosis, patient_data }: any) {
  // Treatment guidelines database (simplified)
  const treatmentGuidelines: { [key: string]: any } = {
    'hypertension': {
      first_line: ['ACE inhibitors', 'ARBs', 'Calcium channel blockers', 'Thiazide diuretics'],
      lifestyle: ['Low sodium diet', 'Regular exercise', 'Weight management'],
      monitoring: ['Blood pressure checks', 'Kidney function tests'],
      target_bp: '< 130/80 mmHg'
    },
    'diabetes_type_2': {
      first_line: ['Metformin', 'Lifestyle modifications'],
      second_line: ['SGLT2 inhibitors', 'GLP-1 agonists', 'Insulin'],
      lifestyle: ['Carbohydrate counting', 'Regular exercise', 'Weight management'],
      monitoring: ['HbA1c every 3 months', 'Annual eye exam', 'Foot care'],
      target_hba1c: '< 7%'
    }
  };

  const recommendations = treatmentGuidelines[diagnosis.toLowerCase()] || {
    message: 'No specific guidelines available for this condition'
  };

  return new Response(
    JSON.stringify({ diagnosis, recommendations }),
    { headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

function calculateCardiovascularRisk(patient: any): number {
  let risk = 0;
  const age = new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear();
  
  if (age > 65) risk += 0.3;
  if (patient.gender === 'male') risk += 0.2;
  
  // Check for hypertension in vital signs
  const latestVitals = patient.vital_signs?.[0];
  if (latestVitals?.blood_pressure_systolic > 140) risk += 0.4;
  
  return Math.min(risk, 1);
}

function calculateDiabetesRisk(patient: any): number {
  let risk = 0;
  const age = new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear();
  
  if (age > 45) risk += 0.3;
  if (patient.medical_history?.includes('family_history_diabetes')) risk += 0.4;
  
  return Math.min(risk, 1);
}

function calculateFallRisk(patient: any): number {
  let risk = 0;
  const age = new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear();
  
  if (age > 75) risk += 0.5;
  if (patient.prescriptions?.some((p: any) => p.medication_name.includes('sedative'))) risk += 0.3;
  
  return Math.min(risk, 1);
}

function calculateReadmissionRisk(patient: any): number {
  let risk = 0;
  const recentConsultations = patient.consultations?.filter((c: any) => 
    new Date(c.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  ).length || 0;
  
  if (recentConsultations > 2) risk += 0.4;
  if (patient.medical_history?.length > 3) risk += 0.3;
  
  return Math.min(risk, 1);
}

function generateRiskRecommendations(riskFactors: any): string[] {
  const recommendations = [];
  
  if (riskFactors.cardiovascular > 0.6) {
    recommendations.push('Consider cardiology referral and cardiac risk stratification');
  }
  if (riskFactors.diabetes > 0.6) {
    recommendations.push('Implement diabetes prevention program and lifestyle counseling');
  }
  if (riskFactors.fall_risk > 0.6) {
    recommendations.push('Assess home safety and consider physical therapy evaluation');
  }
  if (riskFactors.readmission > 0.6) {
    recommendations.push('Enhance discharge planning and follow-up care coordination');
  }
  
  return recommendations;
}

serve(handler);