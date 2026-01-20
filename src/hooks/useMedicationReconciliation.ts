import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Medication {
  id?: string;
  patient_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  route: string;
  start_date: string;
  end_date?: string;
  prescriber?: string;
  status: 'active' | 'discontinued' | 'completed';
}

export function useMedicationReconciliation(patientId: string) {
  const { hospital } = useAuth();
  const queryClient = useQueryClient();

  const { data: medications, isLoading } = useQuery({
    queryKey: ['medication-reconciliation', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_medications')
        .select('*')
        .eq('patient_id', patientId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Medication[];
    },
    enabled: !!patientId,
  });

  const addMedicationMutation = useMutation({
    mutationFn: async (medication: Omit<Medication, 'id'>) => {
      const { data, error } = await supabase
        .from('patient_medications')
        .insert([{ ...medication, hospital_id: hospital?.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medication-reconciliation', patientId] });
      toast.success('Medication added successfully');
    },
  });

  const updateMedicationMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Medication> & { id: string }) => {
      const { error } = await supabase
        .from('patient_medications')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medication-reconciliation', patientId] });
      toast.success('Medication updated successfully');
    },
  });

  return {
    medications,
    isLoading,
    addMedication: addMedicationMutation.mutate,
    updateMedication: updateMedicationMutation.mutate,
    isAdding: addMedicationMutation.isPending,
    isUpdating: updateMedicationMutation.isPending,
  };
}
