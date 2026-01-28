/**
 * Optimistic Mutation Hook
 * 
 * Provides optimistic updates for mutations to improve perceived performance.
 * Updates UI immediately before server confirmation, with rollback on error.
 * 
 * @module useOptimisticMutation
 * @version 1.0.0
 */

import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface OptimisticMutationConfig<TData, TError, TVariables, TContext> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  queryKey: string | string[];
  entityId?: (variables: TVariables) => string;
  onMutate?: (variables: TVariables, queryClient: ReturnType<typeof useQueryClient>) => TContext | Promise<TContext>;
  onError?: (error: TError, variables: TVariables, context: TContext | undefined, queryClient: ReturnType<typeof useQueryClient>) => void;
  onSuccess?: (data: TData, variables: TVariables, context: TContext | undefined, queryClient: ReturnType<typeof useQueryClient>) => void;
  successMessage?: string;
  errorMessage?: string;
  invalidateQueries?: string[];
}

/**
 * Hook for optimistic mutations with automatic rollback
 * 
 * @example
 * ```typescript
 * const mutation = useOptimisticMutation({
 *   mutationFn: updatePatient,
 *   queryKey: 'patients',
 *   entityId: (vars) => vars.id,
 *   successMessage: 'Patient updated successfully',
 *   invalidateQueries: ['appointments']
 * });
 * ```
 */
export function useOptimisticMutation<TData = unknown, TError = Error, TVariables = void, TContext = unknown>(
  config: OptimisticMutationConfig<TData, TError, TVariables, TContext>
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const {
    mutationFn,
    queryKey,
    entityId,
    onMutate: customOnMutate,
    onError: customOnError,
    onSuccess: customOnSuccess,
    successMessage,
    errorMessage,
    invalidateQueries = []
  } = config;

  const queryKeyArray = Array.isArray(queryKey) ? queryKey : [queryKey];

  return useMutation({
    mutationFn,

    // Optimistic update
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeyArray });

      // Get current data for rollback
      const previousData = queryClient.getQueryData(queryKeyArray);

      // Apply optimistic update
      if (entityId) {
        const id = entityId(variables);
        
        // For single entity updates
        queryClient.setQueryData([...queryKeyArray, id], (old: any) => ({
          ...old,
          ...variables,
          _optimistic: true // Mark as optimistic
        }));

        // For list updates
        queryClient.setQueryData(queryKeyArray, (old: any[] = []) => {
          return old.map(item =>
            item.id === id ? { ...item, ...variables, _optimistic: true } : item
          );
        });
      }

      // Call custom onMutate if provided
      let context: TContext | undefined;
      if (customOnMutate) {
        context = await customOnMutate(variables, queryClient);
      }

      return { previousData, ...context } as TContext;
    },

    // Rollback on error
    onError: (error, variables, context) => {
      // Restore previous data
      const ctx = context as any;
      if (ctx?.previousData !== undefined) {
        queryClient.setQueryData(queryKeyArray, ctx.previousData);
      }

      // Show error toast
      if (errorMessage) {
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive'
        });
      }

      // Call custom onError if provided
      if (customOnError) {
        customOnError(error, variables, context, queryClient);
      }
    },

    // Success handling
    onSuccess: (data, variables, context) => {
      // Remove optimistic flag
      if (entityId) {
        const id = entityId(variables);
        queryClient.setQueryData([...queryKeyArray, id], (old: any) => {
          if (old) {
            const { _optimistic, ...rest } = old;
            return { ...rest, ...data };
          }
          return data;
        });

        queryClient.setQueryData(queryKeyArray, (old: any[] = []) => {
          return old.map(item => {
            if (item.id === id && item._optimistic) {
              const { _optimistic, ...rest } = item;
              return { ...rest, ...data };
            }
            return item;
          });
        });
      }

      // Invalidate related queries
      invalidateQueries.forEach(query => {
        queryClient.invalidateQueries({ queryKey: [query] });
      });

      // Show success toast
      if (successMessage) {
        toast({
          title: 'Success',
          description: successMessage
        });
      }

      // Call custom onSuccess if provided
      if (customOnSuccess) {
        customOnSuccess(data, variables, context, queryClient);
      }
    },

    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeyArray });
    }
  });
}

/**
 * Pre-configured optimistic mutation for patient updates
 */
export function useOptimisticPatientUpdate() {
  return useOptimisticMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from('patients')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
      return { id, ...data };
    },
    queryKey: 'patients',
    entityId: (vars) => vars.id,
    successMessage: 'Patient updated successfully',
    errorMessage: 'Failed to update patient',
    invalidateQueries: ['appointments', 'prescriptions']
  });
}

/**
 * Pre-configured optimistic mutation for appointment updates
 */
export function useOptimisticAppointmentUpdate() {
  return useOptimisticMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from('appointments')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
      return { id, ...data };
    },
    queryKey: 'appointments',
    entityId: (vars) => vars.id,
    successMessage: 'Appointment updated successfully',
    errorMessage: 'Failed to update appointment',
    invalidateQueries: ['patients', 'admin-stats']
  });
}

/**
 * Pre-configured optimistic mutation for queue status updates
 */
export function useOptimisticQueueUpdate() {
  return useOptimisticMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('patient_queue')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      return { id, status };
    },
    queryKey: 'queue',
    entityId: (vars) => vars.id,
    onMutate: async (variables, queryClient) => {
      // Optimistically update queue order
      await queryClient.cancelQueries({ queryKey: ['queue'] });
      
      const previousQueue = queryClient.getQueryData(['queue']);
      
      queryClient.setQueryData(['queue'], (old: any[] = []) => {
        return old
          .map(item => item.id === variables.id ? { ...item, status: variables.status } : item)
          .sort((a, b) => {
            // Sort by status priority and check-in time
            const statusPriority = { waiting: 0, called: 1, in_service: 2, completed: 3 };
            const priorityDiff = (statusPriority[a.status as keyof typeof statusPriority] || 0) - 
                                (statusPriority[b.status as keyof typeof statusPriority] || 0);
            if (priorityDiff !== 0) return priorityDiff;
            return new Date(a.check_in_time).getTime() - new Date(b.check_in_time).getTime();
          });
      });
      
      return { previousQueue };
    },
    successMessage: 'Queue updated',
    errorMessage: 'Failed to update queue'
  });
}

// Import supabase for the pre-configured mutations
import { supabase } from '@/integrations/supabase/client';

export default useOptimisticMutation;
