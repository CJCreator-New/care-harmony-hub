import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  TriageAssessment, 
  MedicationReconciliation, 
  MedicationSchedule, 
  MARAdministration,
  CarePlanItem,
  CarePlanCompliance 
} from '@/types/nursing';

// Patient Prep Checklist Interface
export interface PatientPrepChecklist {
  id: string;
  patient_id: string;
  queue_entry_id?: string;
  appointment_id?: string;
  vitals_completed?: boolean;
  allergies_verified?: boolean;
  medications_reviewed?: boolean;
  chief_complaint_recorded?: boolean;
  consent_obtained?: boolean;
  ready_for_doctor?: boolean;
  notes?: string;
  hospital_id: string;
  created_at: string;
  updated_at: string;
}

// Shift Handover Interface
export interface ShiftHandover {
  id: string;
  patient_id: string;
  from_nurse_id: string;
  to_nurse_id?: string;
  shift_date: string;
  handover_notes: string;
  priority_items: string[];
  acknowledged: boolean;
  acknowledged_at?: string;
  hospital_id: string;
  created_at: string;
}

// Triage Assessment Hooks
export const useTriageAssessments = (patientId?: string) => {
  const [assessments, setAssessments] = useState<TriageAssessment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAssessments = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('triage_assessments')
        .select('*')
        .order('created_at', { ascending: false });

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAssessments(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

  const createAssessment = async (assessment: Partial<TriageAssessment>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('triage_assessments')
        .insert([assessment])
        .select()
        .single();

      if (error) throw error;
      setAssessments(prev => [data, ...prev]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assessment');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssessments();
  }, [patientId]);

  return {
    assessments,
    loading,
    error,
    createAssessment,
    refetch: loadAssessments
  };
};

// Medication Reconciliation Hooks
export const useMedicationReconciliation = (patientId: string) => {
  const [reconciliation, setReconciliation] = useState<MedicationReconciliation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReconciliation = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('medication_reconciliation')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setReconciliation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reconciliation');
    } finally {
      setLoading(false);
    }
  };

  const createReconciliation = async (reconciliation: Partial<MedicationReconciliation>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('medication_reconciliation')
        .insert([reconciliation])
        .select()
        .single();

      if (error) throw error;
      setReconciliation(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create reconciliation');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateReconciliation = async (id: string, updates: Partial<MedicationReconciliation>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('medication_reconciliation')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setReconciliation(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update reconciliation');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      loadReconciliation();
    }
  }, [patientId]);

  return {
    reconciliation,
    loading,
    error,
    createReconciliation,
    updateReconciliation,
    refetch: loadReconciliation
  };
};

// MAR (Medication Administration Record) Hooks
export const useMedicationSchedules = (patientId: string, date: string) => {
  const [schedules, setSchedules] = useState<MedicationSchedule[]>([]);
  const [administrations, setAdministrations] = useState<MARAdministration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSchedules = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('medication_schedules')
        .select('*')
        .eq('patient_id', patientId)
        .eq('scheduled_date', date)
        .eq('is_active', true);

      if (scheduleError) throw scheduleError;

      const { data: adminData, error: adminError } = await supabase
        .from('mar_administrations')
        .select('*')
        .eq('patient_id', patientId)
        .gte('scheduled_time', `${date}T00:00:00`)
        .lt('scheduled_time', `${date}T23:59:59`);

      if (adminError) throw adminError;

      setSchedules(scheduleData || []);
      setAdministrations(adminData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  const recordAdministration = async (administration: Partial<MARAdministration>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mar_administrations')
        .insert([administration])
        .select()
        .single();

      if (error) throw error;
      setAdministrations(prev => [...prev, data]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record administration');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateAdministration = async (id: string, updates: Partial<MARAdministration>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mar_administrations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setAdministrations(prev => prev.map(admin => admin.id === id ? data : admin));
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update administration');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId && date) {
      loadSchedules();
    }
  }, [patientId, date]);

  return {
    schedules,
    administrations,
    loading,
    error,
    recordAdministration,
    updateAdministration,
    refetch: loadSchedules
  };
};

// Care Plan Compliance Hooks
export const useCarePlanCompliance = (patientId: string) => {
  const [carePlanItems, setCarePlanItems] = useState<CarePlanItem[]>([]);
  const [compliance, setCompliance] = useState<CarePlanCompliance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCarePlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: itemsData, error: itemsError } = await supabase
        .from('care_plan_items')
        .select('*')
        .eq('patient_id', patientId)
        .eq('status', 'active')
        .order('priority', { ascending: false });

      if (itemsError) throw itemsError;

      const { data: complianceData, error: complianceError } = await supabase
        .from('care_plan_compliance')
        .select('*')
        .eq('patient_id', patientId)
        .order('due_time', { ascending: true });

      if (complianceError) throw complianceError;

      setCarePlanItems(itemsData || []);
      setCompliance(complianceData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load care plan');
    } finally {
      setLoading(false);
    }
  };

  const recordCompliance = async (compliance: Partial<CarePlanCompliance>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('care_plan_compliance')
        .insert([compliance])
        .select()
        .single();

      if (error) throw error;
      setCompliance(prev => [...prev, data]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record compliance');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateCompliance = async (id: string, updates: Partial<CarePlanCompliance>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('care_plan_compliance')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setCompliance(prev => prev.map(comp => comp.id === id ? data : comp));
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update compliance');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      loadCarePlan();
    }
  }, [patientId]);

  return {
    carePlanItems,
    compliance,
    loading,
    error,
    recordCompliance,
    updateCompliance,
    refetch: loadCarePlan
  };
};

// Patient Checklist Hooks
export const usePatientChecklist = (patientId: string) => {
  const [checklist, setChecklist] = useState<PatientPrepChecklist | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChecklist = async () => {
    if (!patientId) return;
    
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('patient_prep_checklists')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setChecklist(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load checklist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChecklist();
  }, [patientId]);

  return {
    data: checklist,
    isLoading: loading,
    error,
    refetch: loadChecklist
  };
};

export const useCreateChecklist = () => {
  const [loading, setLoading] = useState(false);

  const mutateAsync = async (data: {
    patientId: string;
    queueEntryId?: string;
    appointmentId?: string;
  }) => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase
        .from('patient_prep_checklists')
        .insert({
          patient_id: data.patientId,
          queue_entry_id: data.queueEntryId,
          appointment_id: data.appointmentId,
          vitals_completed: false,
          allergies_verified: false,
          medications_reviewed: false,
          chief_complaint_recorded: false,
          consent_obtained: false,
          ready_for_doctor: false
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    } finally {
      setLoading(false);
    }
  };

  return {
    mutateAsync,
    isPending: loading
  };
};

export const useUpdateChecklist = () => {
  const [loading, setLoading] = useState(false);

  const mutateAsync = async (data: {
    id: string;
    vitals_completed?: boolean;
    allergies_verified?: boolean;
    medications_reviewed?: boolean;
    chief_complaint_recorded?: boolean;
    consent_obtained?: boolean;
    ready_for_doctor?: boolean;
    notes?: string;
  }) => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase
        .from('patient_prep_checklists')
        .update(data)
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return result;
    } finally {
      setLoading(false);
    }
  };

  return {
    mutateAsync,
    isPending: loading
  };
};

export const usePatientChecklists = (hospitalId?: string) => {
  const [checklists, setChecklists] = useState<PatientPrepChecklist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChecklists = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('patient_prep_checklists')
        .select('*')
        .order('created_at', { ascending: false });

      if (hospitalId) {
        query = query.eq('hospital_id', hospitalId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setChecklists(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load checklists');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChecklists();
  }, [hospitalId]);

  return {
    checklists,
    loading,
    error,
    refetch: loadChecklists
  };
};

// Shift Handover Hooks
export const useCreateHandover = () => {
  const [loading, setLoading] = useState(false);

  const mutateAsync = async (data: Partial<ShiftHandover>) => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase
        .from('shift_handovers')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    } finally {
      setLoading(false);
    }
  };

  return {
    mutateAsync,
    isPending: loading
  };
};

export const usePendingHandovers = (nurseId?: string) => {
  const [handovers, setHandovers] = useState<ShiftHandover[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHandovers = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('shift_handovers')
        .select('*')
        .eq('acknowledged', false)
        .order('created_at', { ascending: false });

      if (nurseId) {
        query = query.eq('to_nurse_id', nurseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setHandovers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load handovers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHandovers();
  }, [nurseId]);

  return {
    handovers,
    loading,
    error,
    refetch: loadHandovers
  };
};

export const useAcknowledgeHandover = () => {
  const [loading, setLoading] = useState(false);

  const mutateAsync = async (handoverId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shift_handovers')
        .update({
          acknowledged: true,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', handoverId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } finally {
      setLoading(false);
    }
  };

  return {
    mutateAsync,
    isPending: loading
  };
};

// Medication Administration Hooks
export const useRecordMedicationAdministration = () => {
  const [loading, setLoading] = useState(false);

  const mutateAsync = async (data: Partial<MARAdministration>) => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase
        .from('mar_administrations')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    } finally {
      setLoading(false);
    }
  };

  return {
    mutateAsync,
    isPending: loading
  };
};

export const useMedicationAdministrations = (patientId?: string) => {
  const [administrations, setAdministrations] = useState<MARAdministration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAdministrations = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('mar_administrations')
        .select('*')
        .order('scheduled_time', { ascending: false });

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAdministrations(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load administrations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdministrations();
  }, [patientId]);

  return {
    administrations,
    loading,
    error,
    refetch: loadAdministrations
  };
};