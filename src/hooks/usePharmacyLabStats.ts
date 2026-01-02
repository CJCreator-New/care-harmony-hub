import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

export interface PharmacyStats {
  pending: number;
  dispensedToday: number;
  refillRequests: number;
  drugInteractionAlerts: number;
}

export function usePharmacyStats() {
  const { hospital } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['pharmacy-stats', hospital?.id, today],
    queryFn: async (): Promise<PharmacyStats> => {
      if (!hospital?.id) {
        return { pending: 0, dispensedToday: 0, refillRequests: 0, drugInteractionAlerts: 0 };
      }

      // Pending prescriptions
      const { data: pending } = await supabase
        .from('prescriptions')
        .select('id')
        .eq('hospital_id', hospital.id)
        .is('dispensed_at', null);

      // Dispensed today
      const { data: dispensed } = await supabase
        .from('prescriptions')
        .select('id')
        .eq('hospital_id', hospital.id)
        .gte('dispensed_at', `${today}T00:00:00`)
        .lte('dispensed_at', `${today}T23:59:59`);

      // Pending refill requests
      const { data: refills } = await supabase
        .from('prescription_refill_requests')
        .select('id')
        .eq('hospital_id', hospital.id)
        .eq('status', 'pending');

      // Count prescriptions with drug interaction alerts
      const { data: alerts } = await supabase
        .from('prescriptions')
        .select('id, drug_interactions')
        .eq('hospital_id', hospital.id)
        .is('dispensed_at', null);

      const alertCount = alerts?.filter(
        p => p.drug_interactions && Array.isArray(p.drug_interactions) && p.drug_interactions.length > 0
      ).length || 0;

      return {
        pending: pending?.length || 0,
        dispensedToday: dispensed?.length || 0,
        refillRequests: refills?.length || 0,
        drugInteractionAlerts: alertCount,
      };
    },
    enabled: !!hospital?.id,
    refetchInterval: 30000,
  });
}

export function usePendingPrescriptions() {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['pending-prescriptions', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];

      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          *,
          patient:patients(id, first_name, last_name, mrn, allergies),
          prescriber:profiles!prescriptions_prescribed_by_fkey(id, first_name, last_name),
          items:prescription_items(*)
        `)
        .eq('hospital_id', hospital.id)
        .is('dispensed_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!hospital?.id,
  });
}

export function useLabTechStats() {
  const { hospital } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['lab-tech-stats', hospital?.id, today],
    queryFn: async () => {
      if (!hospital?.id) {
        return { 
          pending: 0, 
          collected: 0, 
          inProgress: 0, 
          completedToday: 0, 
          urgent: 0, 
          critical: 0,
          bloodTests: 0,
          urineAnalysis: 0,
          imaging: 0,
          other: 0,
        };
      }

      // Pending orders
      const { data: pending } = await supabase
        .from('lab_orders')
        .select('id')
        .eq('hospital_id', hospital.id)
        .eq('status', 'pending');

      // Collected samples
      const { data: collected } = await supabase
        .from('lab_orders')
        .select('id')
        .eq('hospital_id', hospital.id)
        .eq('status', 'collected');

      // In progress
      const { data: inProgress } = await supabase
        .from('lab_orders')
        .select('id')
        .eq('hospital_id', hospital.id)
        .eq('status', 'in_progress');

      // Completed today
      const { data: completed } = await supabase
        .from('lab_orders')
        .select('id')
        .eq('hospital_id', hospital.id)
        .eq('status', 'completed')
        .gte('completed_at', `${today}T00:00:00`)
        .lte('completed_at', `${today}T23:59:59`);

      // Urgent orders
      const { data: urgent } = await supabase
        .from('lab_orders')
        .select('id')
        .eq('hospital_id', hospital.id)
        .eq('priority', 'urgent')
        .neq('status', 'completed');

      // Critical results
      const { data: critical } = await supabase
        .from('lab_orders')
        .select('id')
        .eq('hospital_id', hospital.id)
        .eq('is_critical', true)
        .eq('critical_notified', false);

      // Test categories for today
      const { data: todayTests } = await supabase
        .from('lab_orders')
        .select('test_category')
        .eq('hospital_id', hospital.id)
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);

      const categoryCounts = {
        bloodTests: todayTests?.filter(t => t.test_category?.toLowerCase().includes('blood') || t.test_category?.toLowerCase().includes('hematology')).length || 0,
        urineAnalysis: todayTests?.filter(t => t.test_category?.toLowerCase().includes('urine') || t.test_category?.toLowerCase().includes('urinalysis')).length || 0,
        imaging: todayTests?.filter(t => t.test_category?.toLowerCase().includes('imaging') || t.test_category?.toLowerCase().includes('radiology') || t.test_category?.toLowerCase().includes('x-ray')).length || 0,
        other: 0,
      };
      categoryCounts.other = (todayTests?.length || 0) - categoryCounts.bloodTests - categoryCounts.urineAnalysis - categoryCounts.imaging;

      return {
        pending: pending?.length || 0,
        collected: collected?.length || 0,
        inProgress: inProgress?.length || 0,
        completedToday: completed?.length || 0,
        urgent: urgent?.length || 0,
        critical: critical?.length || 0,
        ...categoryCounts,
      };
    },
    enabled: !!hospital?.id,
    refetchInterval: 30000,
  });
}

export function usePendingLabOrders() {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['pending-lab-orders', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];

      const { data, error } = await supabase
        .from('lab_orders')
        .select(`
          *,
          patient:patients(id, first_name, last_name, mrn, date_of_birth)
        `)
        .eq('hospital_id', hospital.id)
        .in('status', ['pending', 'collected', 'in_progress'])
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!hospital?.id,
  });
}
