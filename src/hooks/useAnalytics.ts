import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  CareGap,
  QualityMeasure,
  PatientQualityCompliance,
  ProviderScorecard,
  PopulationCohort,
  PatientCohortMembership,
  ClinicalOutcome,
  RiskScore,
  PopulationIntervention,
  QualityDashboardData,
  PopulationHealthSummary
} from '@/types/analytics';

// Hook for care gaps management
export const useCareGaps = (hospitalId?: string) => {
  const [careGaps, setCareGaps] = useState<CareGap[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCareGaps = async (filters?: { status?: string; priority?: number; provider_id?: string }) => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('care_gaps')
        .select('*')
        .order('due_date', { ascending: true });

      if (hospitalId) {
        query = query.eq('hospital_id', hospitalId);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.priority) {
        query = query.eq('priority_level', filters.priority);
      }

      if (filters?.provider_id) {
        query = query.eq('assigned_provider_id', filters.provider_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setCareGaps(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch care gaps');
    } finally {
      setLoading(false);
    }
  };

  const createCareGap = async (gapData: Omit<CareGap, 'id' | 'created_at' | 'updated_at'>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('care_gaps')
        .insert(gapData)
        .select()
        .single();

      if (error) throw error;
      
      setCareGaps(prev => [data, ...prev]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create care gap');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateCareGap = async (gapId: string, updates: Partial<CareGap>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('care_gaps')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', gapId)
        .select()
        .single();

      if (error) throw error;
      
      setCareGaps(prev => prev.map(gap => gap.id === gapId ? data : gap));
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update care gap');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const closeCareGap = async (gapId: string, notes?: string) => {
    return updateCareGap(gapId, {
      status: 'closed',
      completed_date: new Date().toISOString().split('T')[0],
      intervention_notes: notes
    });
  };

  return {
    careGaps,
    loading,
    error,
    fetchCareGaps,
    createCareGap,
    updateCareGap,
    closeCareGap
  };
};

// Hook for quality measures
export const useQualityMeasures = () => {
  const [measures, setMeasures] = useState<QualityMeasure[]>([]);
  const [compliance, setCompliance] = useState<PatientQualityCompliance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQualityMeasures = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quality_measures')
        .select('*')
        .eq('is_active', true)
        .order('measure_name');

      if (error) throw error;
      setMeasures(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch quality measures');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientCompliance = async (patientId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patient_quality_compliance')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompliance(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch compliance data');
    } finally {
      setLoading(false);
    }
  };

  const updateCompliance = async (complianceData: Omit<PatientQualityCompliance, 'id' | 'created_at' | 'updated_at'>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patient_quality_compliance')
        .upsert(complianceData)
        .select()
        .single();

      if (error) throw error;
      
      setCompliance(prev => {
        const existing = prev.find(c => c.patient_id === data.patient_id && c.measure_id === data.measure_id);
        if (existing) {
          return prev.map(c => c.id === existing.id ? data : c);
        }
        return [data, ...prev];
      });
      
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update compliance');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    measures,
    compliance,
    loading,
    error,
    fetchQualityMeasures,
    fetchPatientCompliance,
    updateCompliance
  };
};

// Hook for population cohorts
export const usePopulationCohorts = (hospitalId?: string) => {
  const [cohorts, setCohorts] = useState<PopulationCohort[]>([]);
  const [memberships, setMemberships] = useState<PatientCohortMembership[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCohorts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('population_cohorts')
        .select('*')
        .eq('is_active', true)
        .order('cohort_name');

      if (hospitalId) {
        query = query.eq('hospital_id', hospitalId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setCohorts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cohorts');
    } finally {
      setLoading(false);
    }
  };

  const fetchCohortMemberships = async (cohortId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patient_cohort_membership')
        .select('*')
        .eq('cohort_id', cohortId)
        .eq('status', 'active')
        .order('enrollment_date', { ascending: false });

      if (error) throw error;
      setMemberships(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch memberships');
    } finally {
      setLoading(false);
    }
  };

  const enrollPatient = async (patientId: string, cohortId: string, riskLevel?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patient_cohort_membership')
        .insert({
          patient_id: patientId,
          cohort_id: cohortId,
          risk_level: riskLevel,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;
      
      setMemberships(prev => [data, ...prev]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enroll patient');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateMembershipStatus = async (membershipId: string, status: string, notes?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patient_cohort_membership')
        .update({ status, notes })
        .eq('id', membershipId)
        .select()
        .single();

      if (error) throw error;
      
      setMemberships(prev => prev.map(m => m.id === membershipId ? data : m));
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update membership');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    cohorts,
    memberships,
    loading,
    error,
    fetchCohorts,
    fetchCohortMemberships,
    enrollPatient,
    updateMembershipStatus
  };
};

// Hook for provider scorecards
export const useProviderScorecards = (hospitalId?: string) => {
  const [scorecards, setScorecards] = useState<ProviderScorecard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScorecards = async (providerId?: string, period?: { start: string; end: string }) => {
    setLoading(true);
    try {
      let query = supabase
        .from('provider_scorecards')
        .select('*')
        .order('reporting_period_end', { ascending: false });

      if (hospitalId) {
        query = query.eq('hospital_id', hospitalId);
      }

      if (providerId) {
        query = query.eq('provider_id', providerId);
      }

      if (period) {
        query = query
          .gte('reporting_period_start', period.start)
          .lte('reporting_period_end', period.end);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setScorecards(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch scorecards');
    } finally {
      setLoading(false);
    }
  };

  const generateScorecard = async (scorecardData: Omit<ProviderScorecard, 'id' | 'created_at'>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('provider_scorecards')
        .insert(scorecardData)
        .select()
        .single();

      if (error) throw error;
      
      setScorecards(prev => [data, ...prev]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate scorecard');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    scorecards,
    loading,
    error,
    fetchScorecards,
    generateScorecard
  };
};

// Hook for clinical outcomes tracking
export const useClinicalOutcomes = (hospitalId?: string) => {
  const [outcomes, setOutcomes] = useState<ClinicalOutcome[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOutcomes = async (patientId?: string, outcomeType?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('clinical_outcomes')
        .select('*')
        .order('outcome_date', { ascending: false });

      if (hospitalId) {
        query = query.eq('hospital_id', hospitalId);
      }

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      if (outcomeType) {
        query = query.eq('outcome_type', outcomeType);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setOutcomes(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch outcomes');
    } finally {
      setLoading(false);
    }
  };

  const recordOutcome = async (outcomeData: Omit<ClinicalOutcome, 'id' | 'created_at'>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clinical_outcomes')
        .insert(outcomeData)
        .select()
        .single();

      if (error) throw error;
      
      setOutcomes(prev => [data, ...prev]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record outcome');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    outcomes,
    loading,
    error,
    fetchOutcomes,
    recordOutcome
  };
};

// Hook for comprehensive analytics dashboard
export const useAnalyticsDashboard = (hospitalId: string) => {
  const [dashboardData, setDashboardData] = useState<QualityDashboardData | null>(null);
  const [populationSummary, setPopulationSummary] = useState<PopulationHealthSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async (period?: { start_date: string; end_date: string }) => {
    setLoading(true);
    setError(null);
    try {
      // This would typically aggregate data from multiple tables
      // For now, we'll simulate the data structure
      
      const mockDashboardData: QualityDashboardData = {
        hospital_id: hospitalId,
        reporting_period: period || {
          start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0]
        },
        overall_quality_score: 87.5,
        measure_performance: [],
        care_gaps_summary: {
          total_gaps: 0,
          overdue_gaps: 0,
          high_priority_gaps: 0,
          gaps_by_category: {}
        },
        top_performing_providers: [],
        improvement_opportunities: []
      };

      const mockPopulationSummary: PopulationHealthSummary = {
        hospital_id: hospitalId,
        total_population: 15420,
        active_cohorts: 8,
        high_risk_patients: 1247,
        interventions_active: 12,
        cohort_summaries: [],
        intervention_effectiveness: []
      };

      setDashboardData(mockDashboardData);
      setPopulationSummary(mockPopulationSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  return {
    dashboardData,
    populationSummary,
    loading,
    error,
    fetchDashboardData
  };
};

// Main useAnalytics hook for BusinessIntelligenceDashboard
export const useAnalytics = (range: { start: Date; end: Date }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [kpis, setKpis] = useState<any>(null);
  const [financialMetrics, setFinancialMetrics] = useState<any>(null);
  const [operationalMetrics, setOperationalMetrics] = useState<any>(null);
  const [clinicalMetrics, setClinicalMetrics] = useState<any>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        // Mock data for now - in production this would fetch from database
        const mockKpis = {
          totalPatients: 15420,
          todayAppointments: 87,
          revenue: 1250000,
          avgWaitTime: 12,
          patientsChange: 5.2,
          appointmentsChange: -2.1,
          revenueChange: 8.5,
          waitTimeChange: -15.3
        };
        
        const mockFinancialMetrics = {
          revenue_by_service: {
            'Consultations': 450000,
            'Lab Tests': 280000,
            'Pharmacy': 320000,
            'Imaging': 200000
          },
          total_revenue: 1250000,
          outstanding_balance: 125000
        };
        
        const mockOperationalMetrics = {
          bed_occupancy: 78,
          staff_utilization: 85,
          avg_visit_duration: 45
        };
        
        const mockClinicalMetrics = {
          diagnosis_distribution: {
            'Hypertension': 234,
            'Diabetes': 189,
            'Respiratory': 156,
            'Cardiac': 98,
            'Other': 423
          }
        };

        setKpis(mockKpis);
        setFinancialMetrics(mockFinancialMetrics);
        setOperationalMetrics(mockOperationalMetrics);
        setClinicalMetrics(mockClinicalMetrics);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [range.start, range.end]);

  return {
    kpis,
    financialMetrics,
    operationalMetrics,
    clinicalMetrics,
    isLoading
  };
};
