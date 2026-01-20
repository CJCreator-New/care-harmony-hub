import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useCriticalValueAlerts() {
  const { hospital } = useAuth();
  const queryClient = useQueryClient();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['critical-value-alerts', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];

      const { data, error } = await supabase
        .from('critical_value_alerts')
        .select(`
          *,
          patient:patients(id, mrn, first_name, last_name),
          lab_order:lab_orders(id, test_name)
        `)
        .eq('hospital_id', hospital.id)
        .is('acknowledged_at', null)
        .order('alerted_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!hospital?.id,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('critical_value_alerts')
        .update({
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['critical-value-alerts'] });
      toast.success('Critical value acknowledged');
    },
  });

  return {
    alerts,
    isLoading,
    acknowledgeAlert: acknowledgeMutation.mutate,
    isAcknowledging: acknowledgeMutation.isPending,
  };
}
