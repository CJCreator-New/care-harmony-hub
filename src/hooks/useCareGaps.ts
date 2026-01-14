import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { sanitizeLogMessage } from '@/utils/sanitize';
import type { CareGap, CreateCareGapData, UpdateCareGapData } from '@/types/enhancement';

export function useCareGaps() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch care gaps for current hospital
  const {
    data: careGaps,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['care-gaps', profile?.hospital_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('care_gaps')
        .select(`
          *,
          patient:patients(first_name, last_name, mrn, date_of_birth)
        `)
        .eq('hospital_id', profile?.hospital_id)
        .order('due_date', { ascending: true, nullsLast: true });

      if (error) throw error;
      return data as CareGap[];
    },
    enabled: !!profile?.hospital_id,
  });

  // Fetch overdue care gaps
  const {
    data: overdueCareGaps,
    isLoading: isLoadingOverdue
  } = useQuery({
    queryKey: ['overdue-care-gaps', profile?.hospital_id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('care_gaps')
        .select(`
          *,
          patient:patients(first_name, last_name, mrn)
        `)
        .eq('hospital_id', profile?.hospital_id)
        .in('status', ['open', 'due', 'overdue'])
        .lt('due_date', today)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data as CareGap[];
    },
    enabled: !!profile?.hospital_id,
  });

  // Create care gap
  const createCareGap = useMutation({
    mutationFn: async (data: CreateCareGapData) => {
      const { data: result, error } = await supabase
        .from('care_gaps')
        .insert({
          ...data,
          hospital_id: profile?.hospital_id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['care-gaps'] });
      queryClient.invalidateQueries({ queryKey: ['overdue-care-gaps'] });
      toast({
        title: "Care Gap Created",
        description: "Care gap has been recorded successfully.",
      });
    },
    onError: (error) => {
      console.error('Error creating care gap:', sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'));
      toast({
        title: "Error",
        description: "Failed to create care gap. Please try again.",
        variant: "destructive"
      });
    },
  });

  // Update care gap
  const updateCareGap = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCareGapData }) => {
      const updateData = { ...data };
      if (data.status === 'completed' && !data.completed_date) {
        updateData.completed_date = new Date().toISOString().split('T')[0];
      }

      const { data: result, error } = await supabase
        .from('care_gaps')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['care-gaps'] });
      queryClient.invalidateQueries({ queryKey: ['overdue-care-gaps'] });
      toast({
        title: "Care Gap Updated",
        description: "Care gap has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Error updating care gap:', sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'));
      toast({
        title: "Error",
        description: "Failed to update care gap. Please try again.",
        variant: "destructive"
      });
    },
  });

  // Close care gap (mark as completed)
  const closeCareGap = useMutation({
    mutationFn: async (id: string) => {
      const { data: result, error } = await supabase
        .from('care_gaps')
        .update({
          status: 'completed',
          completed_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['care-gaps'] });
      queryClient.invalidateQueries({ queryKey: ['overdue-care-gaps'] });
      toast({
        title: "Care Gap Closed",
        description: "Care gap has been marked as completed.",
      });
    },
    onError: (error) => {
      console.error('Error closing care gap:', sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'));
      toast({
        title: "Error",
        description: "Failed to close care gap. Please try again.",
        variant: "destructive"
      });
    },
  });

  return {
    careGaps,
    overdueCareGaps,
    isLoading,
    isLoadingOverdue,
    error,
    refetch,
    createCareGap: createCareGap.mutate,
    isCreating: createCareGap.isPending,
    updateCareGap: updateCareGap.mutate,
    isUpdating: updateCareGap.isPending,
    closeCareGap: closeCareGap.mutate,
    isClosing: closeCareGap.isPending,
  };
}