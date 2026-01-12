import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Symptom {
  id: string;
  name: string;
  category: string;
  severity: 'mild' | 'moderate' | 'severe';
  duration: string;
  description?: string;
  associated_symptoms?: string[];
}

export interface SymptomAnalysis {
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

export interface PossibleCondition {
  condition: string;
  probability: number;
  description: string;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  recommended_action: string;
  specialist_referral?: string;
}

export interface TriageRecommendation {
  level: 'emergency' | 'urgent' | 'soon' | 'routine';
  action: string;
  timeframe: string;
  facility_type?: string;
}

export function useSymptomAnalysis() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Get symptom analysis history
  const { data: symptomHistory, isLoading } = useQuery({
    queryKey: ['symptom-analyses', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('symptom_analyses')
        .select('*')
        .eq('patient_id', profile.id)
        .order('analyzed_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as SymptomAnalysis[];
    },
    enabled: !!profile?.id,
  });

  // Analyze symptoms
  const analyzeSymptomsMutation = useMutation({
    mutationFn: async (symptoms: Symptom[]) => {
      if (!profile?.id) throw new Error('Patient not authenticated');

      // Call the symptom analysis function
      const { data, error } = await supabase.functions.invoke('symptom-analysis', {
        body: {
          symptoms,
          patient_id: profile.id,
          patient_age: calculateAge(profile.date_of_birth),
          patient_gender: profile.gender,
        }
      });

      if (error) throw error;
      return data as SymptomAnalysis;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['symptom-analyses'] });
      toast.success('Symptom analysis completed');

      // Show urgency alert if needed
      if (data.urgency_level === 'emergency' || data.urgency_level === 'high') {
        toast.error('This appears to be a medical emergency. Please seek immediate care!', {
          duration: 10000,
        });
      }
    },
    onError: (error) => {
      toast.error('Failed to analyze symptoms: ' + error.message);
    },
  });

  // Get common symptoms by category - returns query options for use in components
  const getSymptomsByCategoryQuery = (category: string) => ({
    queryKey: ['symptoms', category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('symptom_library')
        .select('*')
        .eq('category', category)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      return data as Symptom[];
    },
  });

  // Get triage recommendation based on symptoms
  const getTriageRecommendation = (analysis: SymptomAnalysis): TriageRecommendation => {
    if (analysis.urgency_level === 'emergency') {
      return {
        level: 'emergency',
        action: 'Call emergency services (911) or go to nearest emergency room immediately',
        timeframe: 'IMMEDIATE',
        facility_type: 'Emergency Department',
      };
    }

    if (analysis.urgency_level === 'high') {
      return {
        level: 'urgent',
        action: 'Contact healthcare provider or urgent care within hours',
        timeframe: 'Within 2-4 hours',
        facility_type: 'Urgent Care or Emergency Department',
      };
    }

    if (analysis.urgency_level === 'medium') {
      return {
        level: 'soon',
        action: 'Schedule appointment with healthcare provider',
        timeframe: 'Within 1-2 days',
        facility_type: 'Primary Care Office',
      };
    }

    return {
      level: 'routine',
      action: 'Monitor symptoms and consult healthcare provider if they worsen',
      timeframe: 'Within 1 week',
      facility_type: 'Primary Care Office',
    };
  };

  // Emergency keywords that should trigger immediate alerts
  const emergencyKeywords = [
    'chest pain', 'difficulty breathing', 'severe headache', 'confusion',
    'unconscious', 'seizure', 'severe bleeding', 'broken bone',
    'high fever', 'severe allergic reaction', 'poisoning'
  ];

  const checkForEmergency = (symptoms: Symptom[]): boolean => {
    const symptomText = symptoms.map(s => s.name.toLowerCase()).join(' ');
    return emergencyKeywords.some(keyword => symptomText.includes(keyword));
  };

  return {
    symptomHistory,
    isLoading,
    analyzeSymptoms: analyzeSymptomsMutation.mutate,
    getSymptomsByCategoryQuery,
    getTriageRecommendation,
    checkForEmergency,
    isAnalyzing: analyzeSymptomsMutation.isPending,
    lastAnalysis: symptomHistory?.[0],
  };
}

// Helper function to calculate age
function calculateAge(dateOfBirth: string | undefined): number | undefined {
  if (!dateOfBirth) return undefined;

  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}