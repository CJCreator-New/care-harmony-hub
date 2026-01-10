import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { TriageAssessment, CreateTriageAssessmentData } from '@/types/enhancement';

export function useTriageAssessments() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch triage assessments for current hospital
  const {
    data: triageAssessments,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['triage-assessments', profile?.hospital_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('triage_assessments')
        .select(`
          *,
          patient:patients(first_name, last_name, mrn),
          assessed_by_profile:profiles!triage_assessments_assessed_by_fkey(first_name, last_name),
          appointment:appointments(scheduled_date, scheduled_time)
        `)
        .eq('hospital_id', profile?.hospital_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TriageAssessment[];
    },
    enabled: !!profile?.hospital_id,
  });

  // Create triage assessment
  const createTriageAssessment = useMutation({
    mutationFn: async (data: CreateTriageAssessmentData) => {
      const { data: result, error } = await supabase
        .from('triage_assessments')
        .insert({
          ...data,
          hospital_id: profile?.hospital_id,
          assessed_by: profile?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triage-assessments'] });
      toast({
        title: "Triage Assessment Created",
        description: "Patient triage assessment has been recorded successfully.",
      });
    },
    onError: (error) => {
      console.error('Error creating triage assessment:', error);
      toast({
        title: "Error",
        description: "Failed to create triage assessment. Please try again.",
        variant: "destructive"
      });
    },
  });

  return {
    triageAssessments,
    isLoading,
    error,
    refetch,
    createTriageAssessment: createTriageAssessment.mutate,
    isCreating: createTriageAssessment.isPending,
  };
}