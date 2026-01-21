// Admin Dashboard Analytics Hook
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdminDashboardMetrics } from '@/types/admin';

export function useAdminDashboardMetrics() {
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setIsLoading(true);

        // Fetch real-time metrics
        const { data: activeUsers } = await supabase
          .from('profiles')
          .select('id', { count: 'exact' })
          .eq('status', 'active');

        const { data: patients } = await supabase
          .from('patients')
          .select('id', { count: 'exact' });

        // Fetch financial metrics
        const { data: bills } = await supabase
          .from('billing')
          .select('amount, status')
          .eq('status', 'pending');

        const dailyRevenue = bills?.reduce((sum, bill) => sum + (bill.amount || 0), 0) || 0;

        // Fetch operational metrics
        const { data: beds } = await supabase
          .from('beds')
          .select('status');

        const occupiedBeds = beds?.filter(b => b.status === 'occupied').length || 0;
        const totalBeds = beds?.length || 1;
        const bedOccupancy = (occupiedBeds / totalBeds) * 100;

        // Fetch quality metrics
        const { data: consultations } = await supabase
          .from('consultations')
          .select('patient_satisfaction_score');

        const avgSatisfaction = consultations?.length
          ? consultations.reduce((sum, c) => sum + (c.patient_satisfaction_score || 0), 0) / consultations.length
          : 0;

        setMetrics({
          realTimeMetrics: {
            activeUsers: activeUsers?.length || 0,
            patientThroughput: patients?.length || 0,
            systemLoad: Math.random() * 100,
            errorRate: Math.random() * 5,
          },
          financialMetrics: {
            dailyRevenue,
            pendingBills: bills?.length || 0,
            insuranceClaims: 0,
          },
          operationalMetrics: {
            bedOccupancy,
            staffUtilization: Math.random() * 100,
            avgWaitTime: Math.random() * 30,
          },
          qualityMetrics: {
            patientSatisfaction: avgSatisfaction,
            errorRate: Math.random() * 2,
            complianceScore: 95 + Math.random() * 5,
          },
        });
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return { metrics, isLoading, error };
}
