import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Medication {
  id: string;
  hospital_id: string;
  name: string;
  generic_name: string | null;
  category: string | null;
  form: string | null;
  strength: string | null;
  unit: string | null;
  manufacturer: string | null;
  current_stock: number;
  minimum_stock: number;
  unit_price: number | null;
  expiry_date: string | null;
  batch_number: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useMedications() {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['medications', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];

      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('hospital_id', hospital.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as Medication[];
    },
    enabled: !!hospital?.id,
  });
}

export function useLowStockMedications() {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['medications-low-stock', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];

      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('hospital_id', hospital.id)
        .eq('is_active', true)
        .lt('current_stock', supabase.rpc as any) // This will be filtered client-side
        .order('current_stock');

      if (error) throw error;
      // Filter for low stock
      return (data as Medication[]).filter(m => m.current_stock < m.minimum_stock);
    },
    enabled: !!hospital?.id,
  });
}

export function useInventoryStats() {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['inventory-stats', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return { total: 0, lowStock: 0, outOfStock: 0 };

      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('hospital_id', hospital.id)
        .eq('is_active', true);

      if (error) throw error;

      const medications = data as Medication[];
      return {
        total: medications.length,
        lowStock: medications.filter(m => m.current_stock < m.minimum_stock && m.current_stock > 0).length,
        outOfStock: medications.filter(m => m.current_stock === 0).length,
      };
    },
    enabled: !!hospital?.id,
  });
}

export function useCreateMedication() {
  const queryClient = useQueryClient();
  const { hospital } = useAuth();

  return useMutation({
    mutationFn: async (medication: Omit<Medication, 'id' | 'hospital_id' | 'created_at' | 'updated_at'>) => {
      if (!hospital?.id) throw new Error('No hospital context');

      const { data, error } = await supabase
        .from('medications')
        .insert({
          ...medication,
          hospital_id: hospital.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Medication;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
      toast.success('Medication added to inventory');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add medication: ${error.message}`);
    },
  });
}

export function useUpdateMedicationStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quantity, action }: { id: string; quantity: number; action: 'add' | 'subtract' }) => {
      // First get current stock
      const { data: current, error: fetchError } = await supabase
        .from('medications')
        .select('current_stock')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const newStock = action === 'add' 
        ? (current.current_stock || 0) + quantity 
        : Math.max(0, (current.current_stock || 0) - quantity);

      const { data, error } = await supabase
        .from('medications')
        .update({ current_stock: newStock })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Medication;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
      toast.success('Stock updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update stock: ${error.message}`);
    },
  });
}
