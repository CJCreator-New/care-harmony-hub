import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { differenceInMinutes, endOfDay, format, startOfDay, subDays } from 'date-fns';

export interface WorkflowMetrics {
  checkInToNurse: number; // minutes
  nurseToDoctor: number; // minutes
  consultationDuration: number; // minutes
  labTurnaround: number; // minutes
  prescriptionFill: number; // minutes
  invoiceGeneration: number; // minutes
  patientThroughput: number; // patients per day
  noShowRate: number; // percentage
}

export interface WorkflowStageTime {
  stage: string;
  avgTime: number;
  target: number;
  status: 'good' | 'warning' | 'critical';
}

export function useWorkflowMetrics(dateRange?: { start: Date; end: Date }) {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['workflow-metrics', hospital?.id, dateRange],
    queryFn: async () => {
      if (!hospital?.id) return null;

      const { data: latestCompletedConsultation } = await supabase
        .from('consultations')
        .select('completed_at')
        .eq('hospital_id', hospital.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1);

      const referencePoint = latestCompletedConsultation?.[0]?.completed_at
        ? new Date(latestCompletedConsultation[0].completed_at)
        : new Date();
      const start = dateRange?.start || startOfDay(subDays(referencePoint, 6));
      const end = dateRange?.end || endOfDay(referencePoint);

      // Check-in to Nurse (queue entry to vitals recorded)
      const { data: checkInData } = await supabase
        .from('patient_queue')
        .select('check_in_time, service_start_time, patient_id')
        .eq('hospital_id', hospital.id)
        .gte('check_in_time', start.toISOString())
        .lte('check_in_time', end.toISOString());

      const checkInToNurse = calculateTransitionDuration(checkInData || [], 'check_in_time', 'service_start_time');

      // Nurse to Doctor (vitals to consultation start)
      const { data: nurseData } = await supabase
        .from('consultations')
        .select('created_at, started_at, patient_id')
        .eq('hospital_id', hospital.id)
        .gte('started_at', start.toISOString())
        .lte('started_at', end.toISOString());

      const nurseToDoctor = calculateTransitionDuration(nurseData || [], 'created_at', 'started_at');

      // Consultation Duration
      const { data: consultData } = await supabase
        .from('consultations')
        .select('started_at, completed_at')
        .eq('hospital_id', hospital.id)
        .eq('status', 'completed')
        .gte('started_at', start.toISOString())
        .lte('started_at', end.toISOString());

      const consultationDuration = calculateDuration(consultData || []);

      // Lab Turnaround
      const { data: labData } = await supabase
        .from('lab_orders')
        .select('created_at, completed_at')
        .eq('hospital_id', hospital.id)
        .eq('status', 'completed')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      const labTurnaround = calculateDuration(labData || []);

      // Prescription Fill Time
      const { data: rxData } = await supabase
        .from('prescriptions')
        .select('created_at, dispensed_at')
        .eq('hospital_id', hospital.id)
        .eq('status', 'dispensed')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      const prescriptionFill = calculateDuration(rxData || []);

      // Patient Throughput
      const { count: throughputCount } = await supabase
        .from('consultations')
        .select('*', { count: 'exact', head: true })
        .eq('hospital_id', hospital.id)
        .eq('status', 'completed')
        .gte('completed_at', start.toISOString())
        .lte('completed_at', end.toISOString());

      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const patientThroughput = (throughputCount || 0) / days;

      // No-Show Rate
      const { count: scheduledCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('hospital_id', hospital.id)
        .gte('scheduled_date', format(start, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(end, 'yyyy-MM-dd'));

      const { count: noShowCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('hospital_id', hospital.id)
        .eq('status', 'no_show')
        .gte('scheduled_date', format(start, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(end, 'yyyy-MM-dd'));

      const noShowRate = scheduledCount ? ((noShowCount || 0) / scheduledCount) * 100 : 0;

      return {
        checkInToNurse,
        nurseToDoctor,
        consultationDuration,
        labTurnaround,
        prescriptionFill,
        invoiceGeneration: 5, // Mock - implement when billing timestamps added
        patientThroughput,
        noShowRate,
      } as WorkflowMetrics;
    },
    enabled: !!hospital?.id,
    refetchInterval: 300000, // Refresh every 5 minutes
  });
}

export function useWorkflowStages() {
  const { data: metrics } = useWorkflowMetrics();

  const stages: WorkflowStageTime[] = [
    {
      stage: 'Check-in to Nurse',
      avgTime: metrics?.checkInToNurse || 0,
      target: 10,
      status: getStatus(metrics?.checkInToNurse || 0, 10),
    },
    {
      stage: 'Nurse to Doctor',
      avgTime: metrics?.nurseToDoctor || 0,
      target: 20,
      status: getStatus(metrics?.nurseToDoctor || 0, 20),
    },
    {
      stage: 'Consultation',
      avgTime: metrics?.consultationDuration || 0,
      target: 25,
      status: getStatus(metrics?.consultationDuration || 0, 25),
    },
    {
      stage: 'Lab Turnaround',
      avgTime: metrics?.labTurnaround || 0,
      target: 60,
      status: getStatus(metrics?.labTurnaround || 0, 60),
    },
    {
      stage: 'Prescription Fill',
      avgTime: metrics?.prescriptionFill || 0,
      target: 15,
      status: getStatus(metrics?.prescriptionFill || 0, 15),
    },
  ];

  return stages;
}

// Helper functions
function calculateDuration(data: any[]): number {
  if (!data.length) return 0;

  const durations = data
    .filter(item => item.completed_at || item.dispensed_at)
    .map(item => {
      const start = new Date(item.created_at || item.started_at);
      const end = new Date(item.completed_at || item.dispensed_at);
      return (end.getTime() - start.getTime()) / (1000 * 60); // minutes
    });

  return durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
}

function calculateTransitionDuration(
  data: any[],
  startField: string,
  endField: string
): number {
  if (!data.length) return 0;

  const durations = data
    .filter((item) => item[startField] && item[endField])
    .map((item) => differenceInMinutes(new Date(item[endField]), new Date(item[startField])))
    .filter((duration) => duration >= 0 && duration < 24 * 60);

  return durations.length
    ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length
    : 0;
}

function getStatus(actual: number, target: number): 'good' | 'warning' | 'critical' {
  if (actual <= target) return 'good';
  if (actual <= target * 1.5) return 'warning';
  return 'critical';
}
