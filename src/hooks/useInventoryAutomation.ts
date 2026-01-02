import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ReorderRule {
  id: string;
  hospital_id: string;
  medication_id: string;
  reorder_point: number;
  reorder_quantity: number;
  preferred_supplier_id: string | null;
  auto_reorder: boolean | null;
  last_auto_order_date: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
  medication?: {
    name: string;
    current_stock: number;
    minimum_stock: number;
  };
  supplier?: {
    name: string;
  };
}

interface StockAlert {
  id: string;
  hospital_id: string;
  medication_id: string;
  alert_type: string;
  current_quantity: number;
  threshold_quantity: number;
  status: string;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  auto_order_created: boolean | null;
  purchase_order_id: string | null;
  created_at: string;
  medication?: {
    name: string;
    generic_name: string | null;
  };
}

export const useInventoryAutomation = () => {
  const { profile } = useAuth();
  const hospitalId = profile?.hospital_id;
  const queryClient = useQueryClient();

  // Fetch reorder rules
  const { data: reorderRules, isLoading: rulesLoading } = useQuery({
    queryKey: ['reorder-rules', hospitalId],
    queryFn: async () => {
      if (!hospitalId) return [];
      
      const { data, error } = await supabase
        .from('reorder_rules')
        .select(`
          *,
          medication:medications(name, current_stock, minimum_stock),
          supplier:suppliers(name)
        `)
        .eq('hospital_id', hospitalId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ReorderRule[];
    },
    enabled: !!hospitalId,
  });

  // Fetch stock alerts
  const { data: stockAlerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['stock-alerts', hospitalId],
    queryFn: async () => {
      if (!hospitalId) return [];
      
      const { data, error } = await supabase
        .from('stock_alerts')
        .select(`
          *,
          medication:medications(name, generic_name)
        `)
        .eq('hospital_id', hospitalId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as StockAlert[];
    },
    enabled: !!hospitalId,
  });

  // Create reorder rule
  const createReorderRule = useMutation({
    mutationFn: async (rule: {
      medication_id: string;
      reorder_point: number;
      reorder_quantity: number;
      preferred_supplier_id?: string;
      auto_reorder?: boolean;
    }) => {
      if (!hospitalId) throw new Error('No hospital ID');
      
      const { data, error } = await supabase
        .from('reorder_rules')
        .insert({
          ...rule,
          hospital_id: hospitalId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reorder-rules'] });
      toast.success('Reorder rule created');
    },
    onError: (error) => {
      toast.error('Failed to create rule: ' + error.message);
    },
  });

  // Update reorder rule
  const updateReorderRule = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ReorderRule> & { id: string }) => {
      const { data, error } = await supabase
        .from('reorder_rules')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reorder-rules'] });
      toast.success('Rule updated');
    },
  });

  // Acknowledge stock alert
  const acknowledgeAlert = useMutation({
    mutationFn: async (alertId: string) => {
      if (!profile) throw new Error('No profile');
      
      const { data, error } = await supabase
        .from('stock_alerts')
        .update({
          status: 'acknowledged',
          acknowledged_by: profile.id,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', alertId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });
      toast.success('Alert acknowledged');
    },
  });

  // Resolve stock alert
  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { data, error } = await supabase
        .from('stock_alerts')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', alertId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });
      toast.success('Alert resolved');
    },
  });

  const activeAlerts = stockAlerts?.filter(a => a.status === 'active') || [];
  const acknowledgedAlerts = stockAlerts?.filter(a => a.status === 'acknowledged') || [];
  const lowStockAlerts = activeAlerts.filter(a => a.alert_type === 'low_stock');
  const outOfStockAlerts = activeAlerts.filter(a => a.alert_type === 'out_of_stock');
  const expiringAlerts = activeAlerts.filter(a => a.alert_type === 'expiring_soon' || a.alert_type === 'expired');

  return {
    reorderRules,
    stockAlerts,
    activeAlerts,
    acknowledgedAlerts,
    lowStockAlerts,
    outOfStockAlerts,
    expiringAlerts,
    isLoading: rulesLoading || alertsLoading,
    createReorderRule,
    updateReorderRule,
    acknowledgeAlert,
    resolveAlert,
  };
};
