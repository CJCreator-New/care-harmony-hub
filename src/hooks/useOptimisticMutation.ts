import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { toast } from 'sonner';
import { sanitizeLogMessage } from '@/utils/sanitize';

interface OptimisticMutationOptions<TData, TVariables, TContext = unknown>
  extends Omit<UseMutationOptions<TData, Error, TVariables, TContext>, 'onMutate' | 'onError' | 'onSuccess'> {
  queryKey: string[];
  optimisticUpdater: (oldData: any, variables: TVariables) => any;
  successMessage?: string;
  errorMessage?: string;
}

/**
 * Hook that provides optimistic updates for mutations
 * Automatically handles rollback on error and success feedback
 */
export function useOptimisticMutation<TData, TVariables, TContext = unknown>({
  queryKey,
  optimisticUpdater,
  successMessage,
  errorMessage,
  ...mutationOptions
}: OptimisticMutationOptions<TData, TVariables, TContext>) {
  const queryClient = useQueryClient();

  return useMutation({
    ...mutationOptions,
    onMutate: async (variables) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically update to the new value
      queryClient.setQueryData(queryKey, (oldData: any) =>
        optimisticUpdater(oldData, variables)
      );

      // Return a context object with the snapshotted value
      return { previousData };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }

      const message = errorMessage || 'An error occurred';
      toast.error(message);
      console.error('Mutation error:', sanitizeLogMessage(err instanceof Error ? err.message : 'Unknown error'));
    },
    onSuccess: (data, variables, context) => {
      if (successMessage) {
        toast.success(successMessage);
      }

      // Optionally refetch to ensure server state is correct
      queryClient.invalidateQueries({ queryKey });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure cache consistency
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

/**
 * Pre-built optimistic mutations for common operations
 */
export function useOptimisticStatusUpdate<T extends { id: string; status: string }>(
  queryKey: string[],
  updateFn: (variables: { id: string; status: string }) => Promise<T>
) {
  return useOptimisticMutation({
    queryKey,
    mutationFn: updateFn,
    optimisticUpdater: (oldData: T[], variables) =>
      oldData?.map(item =>
        item.id === variables.id
          ? { ...item, status: variables.status }
          : item
      ) || [],
    successMessage: 'Status updated successfully',
  });
}

export function useOptimisticDelete<T extends { id: string }>(
  queryKey: string[],
  deleteFn: (id: string) => Promise<void>
) {
  return useOptimisticMutation({
    queryKey,
    mutationFn: deleteFn,
    optimisticUpdater: (oldData: T[], variables: string) =>
      oldData?.filter(item => item.id !== variables) || [],
    successMessage: 'Item deleted successfully',
  });
}
