import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type LabOrder = Tables<'lab_orders'>;
export type LabOrderInsert = TablesInsert<'lab_orders'>;
export type LabOrderUpdate = TablesUpdate<'lab_orders'>;

export function useLabOrders(status?: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['lab-orders', profile?.hospital_id, status],
    queryFn: async () => {
      if (!profile?.hospital_id) return [];

      let query = supabase
        .from('lab_orders')
        .select('*')
        .eq('hospital_id', profile.hospital_id)
        .order('ordered_at', { ascending: false });

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as LabOrder[];
    },
    enabled: !!profile?.hospital_id,
  });
}

export function useLabOrderStats() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['lab-order-stats', profile?.hospital_id],
    queryFn: async () => {
      if (!profile?.hospital_id) return null;

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('lab_orders')
        .select('status, completed_at')
        .eq('hospital_id', profile.hospital_id);

      if (error) throw error;

      const pending = data?.filter(o => o.status === 'pending').length || 0;
      const inProgress = data?.filter(o => o.status === 'sample_collected' || o.status === 'in_progress').length || 0;
      const completedToday = data?.filter(o => 
        o.status === 'completed' && 
        o.completed_at?.startsWith(today)
      ).length || 0;

      return { pending, inProgress, completedToday };
    },
    enabled: !!profile?.hospital_id,
  });
}

export function useUpdateLabOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: LabOrderUpdate }) => {
      const { data, error } = await supabase
        .from('lab_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-orders'] });
      queryClient.invalidateQueries({ queryKey: ['lab-order-stats'] });
      toast({ title: 'Lab order updated' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCreateLabOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (order: LabOrderInsert) => {
      const { data, error } = await supabase
        .from('lab_orders')
        .insert([order])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-orders'] });
      queryClient.invalidateQueries({ queryKey: ['lab-order-stats'] });
      toast({ title: 'Lab order created' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
