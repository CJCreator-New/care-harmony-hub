import { useState, useCallback, useEffect } from 'react';
import {
  PatientAssignment,
  VitalSigns,
  Alert,
  Task,
  NurseAssessment,
  MedicationAdministration,
  CarePlan,
  NurseMetrics,
  NurseDashboard,
} from '../types/nurse';
import { NurseClinicalService } from '../utils/nurseClinicalService';
import { NurseRBACManager } from '../utils/nurseRBACManager';

// Hook for nurse dashboard
export function useNurseDashboard(nurseId: string, rbacManager: NurseRBACManager) {
  const [dashboard, setDashboard] = useState<NurseDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clinicalService = new NurseClinicalService(rbacManager, nurseId);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await clinicalService.getDashboardData([]);
        setDashboard(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [nurseId]);

  return { dashboard, loading, error };
}

// Hook for patient assignments
export function useNursePatients(rbacManager: NurseRBACManager) {
  const [patients, setPatients] = useState<PatientAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        if (!rbacManager.canMonitorPatient()) {
          throw new Error('Insufficient permissions');
        }
        // Fetch from API
        setPatients([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load patients');
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  return { patients, loading, error };
}

// Hook for vital signs
export function useNurseVitals(rbacManager: NurseRBACManager, nurseId: string) {
  const [vitals, setVitals] = useState<VitalSigns[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clinicalService = new NurseClinicalService(rbacManager, nurseId);

  const recordVitals = useCallback(
    async (patientId: string, vitalData: Partial<VitalSigns>) => {
      setLoading(true);
      try {
        const recorded = await clinicalService.recordVitals(patientId, vitalData);
        setVitals(prev => [...prev, recorded]);
        return recorded;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to record vitals';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [clinicalService]
  );

  return { vitals, recordVitals, loading, error };
}

// Hook for medications
export function useNurseMedications(rbacManager: NurseRBACManager, nurseId: string) {
  const [medications, setMedications] = useState<MedicationAdministration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clinicalService = new NurseClinicalService(rbacManager, nurseId);

  const administerMedication = useCallback(
    async (patientId: string, medData: Partial<MedicationAdministration>) => {
      setLoading(true);
      try {
        const administered = await clinicalService.administerMedication(patientId, medData);
        setMedications(prev => [...prev, administered]);
        return administered;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to administer medication';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [clinicalService]
  );

  return { medications, administerMedication, loading, error };
}

// Hook for care plans
export function useNurseCarePlans(rbacManager: NurseRBACManager, nurseId: string) {
  const [carePlans, setCarePlans] = useState<CarePlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clinicalService = new NurseClinicalService(rbacManager, nurseId);

  const updateCarePlan = useCallback(
    async (patientId: string, planData: Partial<CarePlan>) => {
      setLoading(true);
      try {
        const updated = await clinicalService.updateCarePlan(patientId, planData);
        setCarePlans(prev => {
          const existing = prev.findIndex(p => p.patientId === patientId);
          if (existing >= 0) {
            const newPlans = [...prev];
            newPlans[existing] = updated;
            return newPlans;
          }
          return [...prev, updated];
        });
        return updated;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update care plan';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [clinicalService]
  );

  return { carePlans, updateCarePlan, loading, error };
}

// Hook for tasks
export function useNurseTasks(rbacManager: NurseRBACManager, nurseId: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clinicalService = new NurseClinicalService(rbacManager, nurseId);

  const completeTask = useCallback(
    async (taskId: string, patientId: string, notes?: string) => {
      setLoading(true);
      try {
        const completed = await clinicalService.completeTask(taskId, patientId, notes);
        setTasks(prev => prev.map(t => (t.id === taskId ? completed : t)));
        return completed;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to complete task';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [clinicalService]
  );

  return { tasks, completeTask, loading, error };
}

// Hook for alerts
export function useNurseAlerts(rbacManager: NurseRBACManager, nurseId: string) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clinicalService = new NurseClinicalService(rbacManager, nurseId);

  const acknowledgeAlert = useCallback(
    async (alertId: string, patientId: string) => {
      setLoading(true);
      try {
        const acknowledged = await clinicalService.acknowledgeAlert(alertId, patientId);
        setAlerts(prev => prev.map(a => (a.id === alertId ? acknowledged : a)));
        return acknowledged;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to acknowledge alert';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [clinicalService]
  );

  return { alerts, acknowledgeAlert, loading, error };
}

// Hook for metrics
export function useNurseMetrics(rbacManager: NurseRBACManager, nurseId: string) {
  const [metrics, setMetrics] = useState<NurseMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clinicalService = new NurseClinicalService(rbacManager, nurseId);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await clinicalService.getMetrics();
        setMetrics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60000);
    return () => clearInterval(interval);
  }, [nurseId]);

  return { metrics, loading, error };
}

// Hook for assessments
export function useNurseAssessments(rbacManager: NurseRBACManager, nurseId: string) {
  const [assessments, setAssessments] = useState<NurseAssessment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clinicalService = new NurseClinicalService(rbacManager, nurseId);

  const assessPatient = useCallback(
    async (patientId: string, assessmentData: Partial<NurseAssessment>) => {
      setLoading(true);
      try {
        const assessment = await clinicalService.assessPatient(patientId, assessmentData);
        setAssessments(prev => [...prev, assessment]);
        return assessment;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to assess patient';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [clinicalService]
  );

  return { assessments, assessPatient, loading, error };
}
