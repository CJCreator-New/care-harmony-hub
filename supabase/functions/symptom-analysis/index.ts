import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface Symptom {
  id: string;
  name: string;
  category: string;
  severity: 'mild' | 'moderate' | 'severe';
  duration: string;
  description?: string;
  associated_symptoms?: string[];
}

interface SymptomAnalysisRequest {
  symptoms: Symptom[];
  patient_id: string;
  patient_age?: number;
  patient_gender?: string;
}

interface PossibleCondition {
  condition: string;
  probability: number;
  description: string;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  recommended_action: string;
  specialist_referral?: string;
}

interface SymptomAnalysisResponse {
  id: string;
  patient_id: string;
  symptoms: Symptom[];
  possible_conditions: PossibleCondition[];
  urgency_level: 'low' | 'medium' | 'high' | 'emergency';
  recommendations: string[];
  disclaimer: string;
  analyzed_at: string;
  ai_model_version: string;
  confidence_score: number;
}

// Emergency keywords that indicate immediate medical attention
const EMERGENCY_KEYWORDS = [
  'chest pain', 'difficulty breathing', 'severe headache', 'unconscious',
  'seizure', 'severe bleeding', 'broken bone', 'high fever with stiff neck',
  'severe allergic reaction', 'poisoning', 'stroke symptoms', 'heart attack'
];

// Critical symptoms by category
const CRITICAL_SYMPTOMS = {
  cardiovascular: ['chest pain', 'severe shortness of breath', 'fainting', 'palpitations with dizziness'],
  neurological: ['sudden severe headache', 'confusion', 'seizure', 'weakness on one side'],
  respiratory: ['severe difficulty breathing', 'blue lips', 'high fever with cough'],
  gastrointestinal: ['severe abdominal pain', 'blood in vomit', 'cannot keep fluids down'],
  general: ['high fever over 103°f', 'unconscious', 'severe dehydration']
};

function checkForEmergency(symptoms: Symptom[]): boolean {
  const symptomText = symptoms.map(s => s.name.toLowerCase()).join(' ');

  // Check emergency keywords
  if (EMERGENCY_KEYWORDS.some(keyword => symptomText.includes(keyword))) {
    return true;
  }

  // Check critical symptoms by category
  for (const symptom of symptoms) {
    const categoryCriticals = CRITICAL_SYMPTOMS[symptom.category as keyof typeof CRITICAL_SYMPTOMS];
    if (categoryCriticals && categoryCriticals.some(critical =>
      symptom.name.toLowerCase().includes(critical.split(' ')[0])
    )) {
      return true;
    }
  }

  return false;
}

function determineUrgencyLevel(symptoms: Symptom[]): 'low' | 'medium' | 'high' | 'emergency' {
  if (checkForEmergency(symptoms)) {
    return 'emergency';
  }

  // Check for high urgency symptoms
  const highUrgencySymptoms = [
    'severe pain', 'high fever', 'difficulty breathing', 'chest pain',
    'confusion', 'seizure', 'uncontrolled bleeding', 'broken bone'
  ];

  const symptomText = symptoms.map(s => s.name.toLowerCase()).join(' ');
  if (highUrgencySymptoms.some(symptom => symptomText.includes(symptom))) {
    return 'high';
  }

  // Check for moderate urgency
  const moderateUrgencySymptoms = [
    'moderate pain', 'persistent cough', 'vomiting', 'diarrhea',
    'rash', 'swelling', 'dizziness'
  ];

  if (moderateUrgencySymptoms.some(symptom => symptomText.includes(symptom))) {
    return 'medium';
  }

  return 'low';
}

function generatePossibleConditions(symptoms: Symptom[], age?: number, gender?: string): PossibleCondition[] {
  const conditions: PossibleCondition[] = [];
  const symptomText = symptoms.map(s => s.name.toLowerCase()).join(' ');

  // Common condition patterns (simplified for demo - in production, use medical AI/ML models)
  if (symptomText.includes('fever') && symptomText.includes('cough')) {
    conditions.push({
      condition: 'Upper Respiratory Infection',
      probability: 0.75,
      description: 'Common cold or viral infection affecting the respiratory system',
      urgency: 'low',
      recommended_action: 'Rest, stay hydrated, use over-the-counter cold medications',
      specialist_referral: undefined
    });
  }

  if (symptomText.includes('chest pain') || symptomText.includes('shortness of breath')) {
    conditions.push({
      condition: 'Cardiac Concern',
      probability: 0.60,
      description: 'Symptoms may indicate heart-related issues requiring medical evaluation',
      urgency: 'high',
      recommended_action: 'Seek immediate medical attention if symptoms persist',
      specialist_referral: 'Cardiologist'
    });
  }

  if (symptomText.includes('headache') && symptomText.includes('nausea')) {
    conditions.push({
      condition: 'Migraine or Tension Headache',
      probability: 0.70,
      description: 'Common headache disorder that may be triggered by various factors',
      urgency: 'medium',
      recommended_action: 'Rest in dark room, use pain relievers, avoid triggers',
      specialist_referral: 'Neurologist (if severe or frequent)'
    });
  }

  if (symptomText.includes('abdominal pain') && symptomText.includes('nausea')) {
    conditions.push({
      condition: 'Gastrointestinal Issue',
      probability: 0.65,
      description: 'Possible stomach flu, food poisoning, or digestive disorder',
      urgency: 'medium',
      recommended_action: 'Stay hydrated, avoid solid foods initially, monitor symptoms',
      specialist_referral: 'Gastroenterologist (if persistent)'
    });
  }

  // Age and gender specific considerations
  if (age && age > 50) {
    if (symptomText.includes('joint pain')) {
      conditions.push({
        condition: 'Age-related Arthritis',
        probability: 0.55,
        description: 'Joint pain common in older adults, may indicate osteoarthritis',
        urgency: 'low',
        recommended_action: 'Consult primary care for pain management options',
        specialist_referral: 'Rheumatologist'
      });
    }
  }

  if (gender === 'female' && symptomText.includes('abdominal pain')) {
    conditions.push({
      condition: 'Gynecological Concern',
      probability: 0.45,
      description: 'May be related to menstrual cycle or gynecological issues',
      urgency: 'medium',
      recommended_action: 'Track symptoms with menstrual cycle, consult gynecologist if concerned',
      specialist_referral: 'Gynecologist'
    });
  }

  // Default fallback
  if (conditions.length === 0) {
    conditions.push({
      condition: 'General Symptoms',
      probability: 0.50,
      description: 'Multiple symptoms that may be related to various causes',
      urgency: 'medium',
      recommended_action: 'Monitor symptoms and consult healthcare provider if they persist or worsen',
      specialist_referral: undefined
    });
  }

  return conditions.sort((a, b) => b.probability - a.probability);
}

function generateRecommendations(symptoms: Symptom[], conditions: PossibleCondition[]): string[] {
  const recommendations: string[] = [];

  // Basic self-care recommendations
  recommendations.push('Rest and stay hydrated');
  recommendations.push('Monitor your symptoms and note any changes');

  // Condition-specific recommendations
  const topCondition = conditions[0];
  if (topCondition) {
    recommendations.push(topCondition.recommended_action);

    if (topCondition.urgency === 'high' || topCondition.urgency === 'emergency') {
      recommendations.push('Do not delay seeking medical attention');
    }

    if (topCondition.specialist_referral) {
      recommendations.push(`Consider consultation with a ${topCondition.specialist_referral.toLowerCase()}`);
    }
  }

  // Symptom-specific recommendations
  const symptomText = symptoms.map(s => s.name.toLowerCase()).join(' ');

  if (symptomText.includes('fever')) {
    recommendations.push('Take fever-reducing medication like acetaminophen if needed');
  }

  if (symptomText.includes('pain')) {
    recommendations.push('Use over-the-counter pain relievers as appropriate');
  }

  if (symptomText.includes('cough') || symptomText.includes('congestion')) {
    recommendations.push('Use cough syrups or decongestants if needed');
  }

  return [...new Set(recommendations)]; // Remove duplicates
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the request body
    const { symptoms, patient_id, patient_age, patient_gender }: SymptomAnalysisRequest = await req.json();

    // Validate input
    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Symptoms array is required and cannot be empty' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!patient_id) {
      return new Response(
        JSON.stringify({ error: 'Patient ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Determine urgency level
    const urgency_level = determineUrgencyLevel(symptoms);

    // Generate possible conditions
    const possible_conditions = generatePossibleConditions(symptoms, patient_age, patient_gender);

    // Generate recommendations
    const recommendations = generateRecommendations(symptoms, possible_conditions);

    // Create analysis response
    const analysis: SymptomAnalysisResponse = {
      id: crypto.randomUUID(),
      patient_id,
      symptoms,
      possible_conditions,
      urgency_level,
      recommendations,
      disclaimer: 'This analysis is for informational purposes only and does not constitute medical advice. Always consult with a qualified healthcare professional for proper diagnosis and treatment. In case of emergency, call 911 or go to the nearest emergency room immediately.',
      analyzed_at: new Date().toISOString(),
      ai_model_version: 'symptom-analyzer-v1.0',
      confidence_score: 0.85 // Simulated confidence score
    };

    // Store analysis in database
    const { error: insertError } = await supabaseClient
      .from('symptom_analyses')
      .insert({
        patient_id,
        symptoms: symptoms,
        possible_conditions: possible_conditions,
        urgency_level,
        recommendations,
        disclaimer: analysis.disclaimer,
        ai_model_version: analysis.ai_model_version,
        confidence_score: analysis.confidence_score,
        hospital_id: null // Will be set by RLS policy based on user context
      });

    if (insertError) {
      console.error('Error storing analysis:', insertError);
      // Continue anyway - analysis was successful even if storage failed
    }

    return new Response(
      JSON.stringify(analysis),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in symptom analysis:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error during symptom analysis' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});