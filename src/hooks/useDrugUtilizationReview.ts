import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { sanitizeLogMessage } from '@/utils/sanitize';

export interface DrugUtilizationCriteria {
  id: string;
  name: string;
  category: 'appropriateness' | 'efficiency' | 'safety' | 'cost';
  description: string;
  threshold?: number;
  active: boolean;
}

export interface DURFinding {
  id: string;
  prescription_id: string;
  patient_id: string;
  criteria_id: string;
  finding_type: 'underutilization' | 'overutilization' | 'inappropriate_use' | 'cost_inefficiency' | 'safety_concern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
  potential_savings?: number;
  quality_impact: 'positive' | 'neutral' | 'negative';
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DURReport {
  id: string;
  hospital_id: string;
  report_period: string;
  total_prescriptions_reviewed: number;
  interventions_made: number;
  cost_savings_achieved: number;
  quality_improvements: number;
  generated_at: string;
  generated_by: string;
}

export function useDrugUtilizationReview() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get DUR criteria
  const { data: durCriteria, isLoading: criteriaLoading } = useQuery({
    queryKey: ['dur-criteria', profile?.hospital_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dur_criteria')
        .select('*')
        .eq('hospital_id', profile?.hospital_id)
        .eq('active', true)
        .order('category', { ascending: true });

      if (error) throw error;
      return data as DrugUtilizationCriteria[];
    },
    enabled: !!profile?.hospital_id,
  });

  // Get DUR findings
  const { data: durFindings, isLoading: findingsLoading } = useQuery({
    queryKey: ['dur-findings', profile?.hospital_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dur_findings')
        .select(`
          *,
          prescriptions:prescription_id (
            id,
            patient_name,
            medication_name,
            dosage,
            quantity
          ),
          patients:patient_id (
            id,
            first_name,
            last_name,
            insurance_provider
          ),
          dur_criteria:criteria_id (
            name,
            category
          )
        `)
        .eq('hospital_id', profile?.hospital_id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as (DURFinding & {
        prescriptions: { id: string; patient_name: string; medication_name: string; dosage: string; quantity: number };
        patients: { id: string; first_name: string; last_name: string; insurance_provider?: string };
        dur_criteria: { name: string; category: string };
      })[];
    },
    enabled: !!profile?.hospital_id,
  });

  // Get unresolved DUR findings
  const { data: unresolvedFindings, isLoading: unresolvedLoading } = useQuery({
    queryKey: ['unresolved-dur-findings', profile?.hospital_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dur_findings')
        .select(`
          *,
          prescriptions:prescription_id (
            patient_name,
            medication_name,
            dosage
          ),
          patients:patient_id (
            first_name,
            last_name
          )
        `)
        .eq('hospital_id', profile?.hospital_id)
        .eq('resolved', false)
        .order('severity', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.hospital_id,
  });

  // Get DUR reports
  const { data: durReports, isLoading: reportsLoading } = useQuery({
    queryKey: ['dur-reports', profile?.hospital_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dur_reports')
        .select('*')
        .eq('hospital_id', profile?.hospital_id)
        .order('generated_at', { ascending: false })
        .limit(12);

      if (error) throw error;
      return data as DURReport[];
    },
    enabled: !!profile?.hospital_id,
  });

  // Run DUR analysis on prescription
  const runDURAnalysisMutation = useMutation({
    mutationFn: async (prescriptionId: string) => {
      const { data, error } = await supabase
        .rpc('run_dur_analysis', {
          prescription_id: prescriptionId,
          pharmacist_id: profile?.id,
          hospital_id: profile?.hospital_id
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dur-findings'] });
      queryClient.invalidateQueries({ queryKey: ['unresolved-dur-findings'] });
      toast({
        title: "DUR Analysis Complete",
        description: "Drug utilization review has been performed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description: "Failed to complete DUR analysis.",
        variant: "destructive",
      });
      console.error('DUR analysis error:', sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'));
    },
  });

  // Create DUR finding manually
  const createDURFindingMutation = useMutation({
    mutationFn: async (finding: Omit<DURFinding, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('dur_findings')
        .insert([{
          ...finding,
          hospital_id: profile?.hospital_id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dur-findings'] });
      queryClient.invalidateQueries({ queryKey: ['unresolved-dur-findings'] });
      toast({
        title: "Finding Recorded",
        description: "DUR finding has been documented.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to record DUR finding.",
        variant: "destructive",
      });
      console.error('DUR finding error:', sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'));
    },
  });

  // Resolve DUR finding
  const resolveDURFindingMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('dur_findings')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: profile?.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dur-findings'] });
      queryClient.invalidateQueries({ queryKey: ['unresolved-dur-findings'] });
      toast({
        title: "Finding Resolved",
        description: "DUR finding has been marked as resolved.",
      });
    },
  });

  // Generate DUR report
  const generateDURReportMutation = useMutation({
    mutationFn: async (period: string) => {
      const { data, error } = await supabase
        .rpc('generate_dur_report', {
          hospital_id: profile?.hospital_id,
          report_period: period,
          generated_by: profile?.id
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dur-reports'] });
      toast({
        title: "Report Generated",
        description: "DUR report has been generated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Report Generation Failed",
        description: "Failed to generate DUR report.",
        variant: "destructive",
      });
      console.error('DUR report error:', sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'));
    },
  });

  // Get DUR statistics
  const { data: durStats, isLoading: statsLoading } = useQuery({
    queryKey: ['dur-statistics', profile?.hospital_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_dur_statistics', {
          hospital_id: profile?.hospital_id
        });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.hospital_id,
  });

  return {
    // Data
    durCriteria,
    durFindings,
    unresolvedFindings,
    durReports,
    durStats,

    // Loading states
    criteriaLoading,
    findingsLoading,
    unresolvedLoading,
    reportsLoading,
    statsLoading,

    // Mutations
    runDURAnalysis: runDURAnalysisMutation.mutate,
    createDURFinding: createDURFindingMutation.mutate,
    resolveDURFinding: resolveDURFindingMutation.mutate,
    generateDURReport: generateDURReportMutation.mutate,

    // Loading states for mutations
    runningAnalysis: runDURAnalysisMutation.isPending,
    creatingFinding: createDURFindingMutation.isPending,
    resolvingFinding: resolveDURFindingMutation.isPending,
    generatingReport: generateDURReportMutation.isPending,
  };
}