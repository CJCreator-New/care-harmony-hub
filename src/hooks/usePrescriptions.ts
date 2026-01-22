import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface Prescription {
  id: string;
  hospital_id: string;
  patient_id: string;
  consultation_id: string | null;
  prescribed_by: string;
  status: string;
  notes: string | null;
  dispensed_by: string | null;
  dispensed_at: string | null;
  created_at: string;
  updated_at: string;
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
    mrn: string;
  };
  prescriber?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  items?: PrescriptionItem[];
}

export interface PrescriptionItem {
  id: string;
  prescription_id: string;
  medication_id: string | null;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number | null;
  instructions: string | null;
  is_dispensed: boolean;
  created_at: string;
}

export function usePrescriptions(status?: string) {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['prescriptions', hospital?.id, status],
    queryFn: async () => {
      if (!hospital?.id) return [];

      let query = supabase
        .from('prescriptions')
        .select(`
          *,
          patient:patients(id, first_name, last_name, mrn),
          prescriber:profiles!prescriptions_prescribed_by_fkey(id, first_name, last_name),
          items:prescription_items(*)
        `)
        .eq('hospital_id', hospital.id)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Prescription[];
    },
    enabled: !!hospital?.id,
  });
}

export function usePrescriptionStats() {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['prescription-stats', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return { pending: 0, dispensed: 0, today: 0 };

      const today = new Date().toISOString().split('T')[0];

      const [pendingRes, dispensedRes, todayRes] = await Promise.all([
        supabase
          .from('prescriptions')
          .select('id', { count: 'exact', head: true })
          .eq('hospital_id', hospital.id)
          .eq('status', 'pending'),
        supabase
          .from('prescriptions')
          .select('id', { count: 'exact', head: true })
          .eq('hospital_id', hospital.id)
          .eq('status', 'dispensed')
          .gte('dispensed_at', `${today}T00:00:00`),
        supabase
          .from('prescriptions')
          .select('id', { count: 'exact', head: true })
          .eq('hospital_id', hospital.id)
          .gte('created_at', `${today}T00:00:00`),
      ]);

      return {
        pending: pendingRes.count || 0,
        dispensed: dispensedRes.count || 0,
        today: todayRes.count || 0,
      };
    },
    enabled: !!hospital?.id,
  });
}

export function useCreatePrescription() {
  const queryClient = useQueryClient();
  const { hospital, profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      patientId,
      consultationId,
      items,
      notes,
    }: {
      patientId: string;
      consultationId?: string;
      items: Array<{
        medication_name: string;
        dosage: string;
        frequency: string;
        duration: string;
        quantity?: number;
        instructions?: string;
      }>;
      notes?: string;
    }) => {
      if (!hospital?.id || !profile?.id) throw new Error('No hospital/profile context');

      // Create prescription
      const { data: prescription, error: rxError } = await supabase
        .from('prescriptions')
        .insert({
          hospital_id: hospital.id,
          patient_id: patientId,
          consultation_id: consultationId,
          prescribed_by: profile.id,
          notes,
          status: 'pending',
        })
        .select()
        .single();

      if (rxError) throw rxError;

      // Add prescription items
      const { error: itemsError } = await supabase
        .from('prescription_items')
        .insert(
          items.map((item) => ({
            prescription_id: prescription.id,
            medication_name: item.medication_name,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
            quantity: item.quantity,
            instructions: item.instructions,
          }))
        );

      if (itemsError) throw itemsError;

      return prescription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['prescription-stats'] });
      toast.success('Prescription created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create prescription: ${error.message}`);
    },
  });
}

export function usePrescriptionsRealtime() {
  const queryClient = useQueryClient();
  const { hospital } = useAuth();

  useEffect(() => {
    if (!hospital?.id) return;

    const channel = supabase
      .channel('prescriptions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prescriptions',
          filter: `hospital_id=eq.${hospital.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
          queryClient.invalidateQueries({ queryKey: ['prescription-stats'] });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [hospital?.id, queryClient]);
}

export function useDispensePrescription() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (prescriptionId: string) => {
      if (!profile?.id) throw new Error('No profile context');

      const { error } = await supabase
        .from('prescriptions')
        .update({
          status: 'dispensed',
          dispensed_by: profile.id,
          dispensed_at: new Date().toISOString(),
        })
        .eq('id', prescriptionId);

      if (error) throw error;

      // Also update prescription items as dispensed
      const { error: itemsError } = await supabase
        .from('prescription_items')
        .update({ is_dispensed: true })
        .eq('prescription_id', prescriptionId);

      if (itemsError) throw itemsError;

      return { id: prescriptionId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['prescription-stats'] });
      toast.success('Prescription dispensed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to dispense: ${error.message}`);
    },
  });
}
