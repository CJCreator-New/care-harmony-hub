import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface ClinicalIntervention {
  id: string;
  prescription_id: string;
  patient_id: string;
  intervention_type: 'drug_interaction' | 'dosage_adjustment' | 'therapeutic_duplication' | 'allergy_alert' | 'renal_adjustment' | 'hepatic_adjustment' | 'age_appropriate' | 'pregnancy_lactation' | 'monitoring_recommendation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
  pharmacist_notes?: string;
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  created_at: string;
  updated_at: string;
}

export interface MedicationTherapyReview {
  id: string;
  patient_id: string;
  prescription_id?: string;
  review_type: 'comprehensive' | 'targeted' | 'follow_up';
  indications_assessed: string[];
  effectiveness_evaluated: boolean;
  safety_assessed: boolean;
  adherence_evaluated: boolean;
  recommendations: string[];
  follow_up_date?: string;
  pharmacist_id: string;
  created_at: string;
  updated_at: string;
}

export interface DrugUtilizationReview {
  id: string;
  prescription_id: string;
  patient_id: string;
  review_type: 'prospective' | 'retrospective' | 'concurrent';
  criteria: string[];
  findings: string[];
  recommendations: string[];
  cost_impact?: number;
  quality_impact: 'positive' | 'neutral' | 'negative';
  pharmacist_id: string;
  created_at: string;
}

export function useClinicalPharmacy() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get clinical interventions
  const { data: interventions, isLoading: interventionsLoading } = useQuery({
    queryKey: ['clinical-interventions', profile?.hospital_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinical_interventions')
        .select(`
          *,
          prescriptions:prescription_id (
            id,
            patient_name,
            medication_name,
            dosage
          ),
          patients:patient_id (
            id,
            first_name,
            last_name
          )
        `)
        .eq('hospital_id', profile?.hospital_id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as (ClinicalIntervention & {
        prescriptions: { id: string; patient_name: string; medication_name: string; dosage: string };
        patients: { id: string; first_name: string; last_name: string };
      })[];
    },
    enabled: !!profile?.hospital_id,
  });

  // Get medication therapy reviews
  const { data: therapyReviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['medication-therapy-reviews', profile?.hospital_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medication_therapy_reviews')
        .select(`
          *,
          patients:patient_id (
            first_name,
            last_name
          ),
          prescriptions:prescription_id (
            medication_name,
            dosage
          )
        `)
        .eq('hospital_id', profile?.hospital_id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as (MedicationTherapyReview & {
        patients: { first_name: string; last_name: string };
        prescriptions?: { medication_name: string; dosage: string };
      })[];
    },
    enabled: !!profile?.hospital_id,
  });

  // Get pending clinical reviews
  const { data: pendingReviews, isLoading: pendingLoading } = useQuery({
    queryKey: ['pending-clinical-reviews', profile?.hospital_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          id,
          patient_id,
          medication_name,
          dosage,
          status,
          created_at,
          patients:patient_id (
            first_name,
            last_name,
            date_of_birth,
            allergies
          )
        `)
        .eq('hospital_id', profile?.hospital_id)
        .in('status', ['pending', 'verified'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.hospital_id,
  });

  // Create clinical intervention
  const createInterventionMutation = useMutation({
    mutationFn: async (intervention: Omit<ClinicalIntervention, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('clinical_interventions')
        .insert([{
          ...intervention,
          hospital_id: profile?.hospital_id,
          pharmacist_id: profile?.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-interventions'] });
      toast({
        title: "Clinical intervention recorded",
        description: "The intervention has been documented successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to record clinical intervention.",
        variant: "destructive",
      });
      console.error('Clinical intervention error:', error);
    },
  });

  // Create medication therapy review
  const createTherapyReviewMutation = useMutation({
    mutationFn: async (review: Omit<MedicationTherapyReview, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('medication_therapy_reviews')
        .insert([{
          ...review,
          hospital_id: profile?.hospital_id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medication-therapy-reviews'] });
      toast({
        title: "Therapy review completed",
        description: "Medication therapy review has been recorded.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to record therapy review.",
        variant: "destructive",
      });
      console.error('Therapy review error:', error);
    },
  });

  // Resolve clinical intervention
  const resolveInterventionMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('clinical_interventions')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: profile?.id,
          pharmacist_notes: notes,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-interventions'] });
      toast({
        title: "Intervention resolved",
        description: "Clinical intervention has been marked as resolved.",
      });
    },
  });

  // Get clinical pharmacy statistics
  const { data: clinicalStats, isLoading: statsLoading } = useQuery({
    queryKey: ['clinical-pharmacy-stats', profile?.hospital_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_clinical_pharmacy_stats', {
          hospital_id: profile?.hospital_id
        });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.hospital_id,
  });

  return {
    // Data
    interventions,
    therapyReviews,
    pendingReviews,
    clinicalStats,

    // Loading states
    interventionsLoading,
    reviewsLoading,
    pendingLoading,
    statsLoading,

    // Mutations
    createIntervention: createInterventionMutation.mutate,
    createTherapyReview: createTherapyReviewMutation.mutate,
    resolveIntervention: resolveInterventionMutation.mutate,

    // Loading states for mutations
    creatingIntervention: createInterventionMutation.isPending,
    creatingReview: createTherapyReviewMutation.isPending,
    resolvingIntervention: resolveInterventionMutation.isPending,
  };
}