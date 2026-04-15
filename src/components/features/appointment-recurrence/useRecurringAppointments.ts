import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { z } from 'zod';

const RecurrencePatternSchema = z.object({
  id: z.string().uuid(),
  appointmentId: z.string().uuid(),
  patternType: z.enum(['daily', 'weekly', 'bi_weekly', 'monthly', 'custom']),
  recurrenceRule: z.record(z.any()),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
});

type RecurrencePattern = z.infer<typeof RecurrencePatternSchema>;

export const useRecurringAppointments = (hospitalId: string) => {
  const queryClient = useQueryClient();

  // Fetch all recurring appointment patterns
  const { data: patterns, isLoading, error } = useQuery<RecurrencePattern[]>({
    queryKey: ['recurring-appointments', hospitalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointment_recurrence_patterns')
        .select('*')
        .eq('hospital_id', hospitalId);
      
      if (error) throw error;
      return data as RecurrencePattern[];
    },
    enabled: !!hospitalId,
  });

  // Create a new recurring pattern
  const { mutate: createRecurringPattern } = useMutation({
    mutationFn: async (pattern: Omit<RecurrencePattern, 'id'>) => {
      const { data, error } = await supabase
        .from('appointment_recurrence_patterns')
        .insert([pattern])
        .select();
      
      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['recurring-appointments', hospitalId],
      });
    },
  });

  // Delete a recurring pattern
  const { mutate: deleteRecurringPattern } = useMutation({
    mutationFn: async (patternId: string) => {
      const { error } = await supabase
        .from('appointment_recurrence_patterns')
        .delete()
        .eq('id', patternId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['recurring-appointments', hospitalId],
      });
    },
  });

  return {
    patterns,
    isLoading,
    error,
    createRecurringPattern,
    deleteRecurringPattern,
  };
};

export default useRecurringAppointments;
