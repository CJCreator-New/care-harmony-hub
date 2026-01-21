import { useState, useCallback, useEffect } from 'react';
import {
  PatientRegistration,
  Appointment,
  CheckInRecord,
  CheckOutRecord,
  QueueStatus,
  PatientCommunication,
  ReceptionistMetrics,
  ReceptionistDashboard,
  SchedulingConflict,
  NoShowPrediction,
} from '../types/receptionist';
import { ReceptionistOperationsService } from '../utils/receptionistOperationsService';
import { ReceptionistRBACManager } from '../utils/receptionistRBACManager';

// Hook for receptionist dashboard
export function useReceptionistDashboard(receptionistId: string, rbacManager: ReceptionistRBACManager) {
  const [dashboard, setDashboard] = useState<ReceptionistDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const operationsService = new ReceptionistOperationsService(rbacManager, receptionistId);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await operationsService.getDashboardData();
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
  }, [receptionistId]);

  return { dashboard, loading, error };
}

// Hook for appointment management
export function useReceptionistAppointments(rbacManager: ReceptionistRBACManager, receptionistId: string) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const operationsService = new ReceptionistOperationsService(rbacManager, receptionistId);

  const createAppointment = useCallback(
    async (appointmentData: Partial<Appointment>) => {
      setLoading(true);
      try {
        const created = await operationsService.createAppointment(appointmentData);
        setAppointments(prev => [...prev, created]);
        return created;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create appointment';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  const modifyAppointment = useCallback(
    async (appointmentId: string, appointmentData: Partial<Appointment>) => {
      setLoading(true);
      try {
        const modified = await operationsService.modifyAppointment(appointmentId, appointmentData);
        setAppointments(prev => prev.map(a => (a.id === appointmentId ? modified : a)));
        return modified;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to modify appointment';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  const cancelAppointment = useCallback(
    async (appointmentId: string, reason?: string) => {
      setLoading(true);
      try {
        const cancelled = await operationsService.cancelAppointment(appointmentId, reason);
        setAppointments(prev => prev.map(a => (a.id === appointmentId ? cancelled : a)));
        return cancelled;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to cancel appointment';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  return { appointments, createAppointment, modifyAppointment, cancelAppointment, loading, error };
}

// Hook for patient registration
export function useReceptionistPatients(rbacManager: ReceptionistRBACManager, receptionistId: string) {
  const [patients, setPatients] = useState<PatientRegistration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const operationsService = new ReceptionistOperationsService(rbacManager, receptionistId);

  const registerPatient = useCallback(
    async (patientData: Partial<PatientRegistration>) => {
      setLoading(true);
      try {
        const registered = await operationsService.registerPatient(patientData);
        setPatients(prev => [...prev, registered]);
        return registered;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to register patient';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  const updatePatient = useCallback(
    async (patientId: string, patientData: Partial<PatientRegistration>) => {
      setLoading(true);
      try {
        const updated = await operationsService.updatePatient(patientId, patientData);
        setPatients(prev => prev.map(p => (p.id === patientId ? updated : p)));
        return updated;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update patient';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  const verifyPatient = useCallback(
    async (patientId: string) => {
      setLoading(true);
      try {
        const result = await operationsService.verifyPatient(patientId);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to verify patient';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  return { patients, registerPatient, updatePatient, verifyPatient, loading, error };
}

// Hook for check-in operations
export function useReceptionistCheckIn(rbacManager: ReceptionistRBACManager, receptionistId: string) {
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const operationsService = new ReceptionistOperationsService(rbacManager, receptionistId);

  const processCheckIn = useCallback(
    async (appointmentId: string, patientId: string) => {
      setLoading(true);
      try {
        const checkIn = await operationsService.processCheckIn(appointmentId, patientId);
        setCheckIns(prev => [...prev, checkIn]);
        return checkIn;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to process check-in';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  const processCheckOut = useCallback(
    async (appointmentId: string, patientId: string) => {
      setLoading(true);
      try {
        const checkOut = await operationsService.processCheckOut(appointmentId, patientId);
        return checkOut;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to process check-out';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  return { checkIns, processCheckIn, processCheckOut, loading, error };
}

// Hook for queue management
export function useReceptionistQueue(rbacManager: ReceptionistRBACManager, receptionistId: string) {
  const [queue, setQueue] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const operationsService = new ReceptionistOperationsService(rbacManager, receptionistId);

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const data = await operationsService.getQueueStatus();
        setQueue(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load queue');
      } finally {
        setLoading(false);
      }
    };

    fetchQueue();
    const interval = setInterval(fetchQueue, 15000);
    return () => clearInterval(interval);
  }, [receptionistId]);

  const updatePriority = useCallback(
    async (appointmentId: string, priority: 'urgent' | 'high' | 'normal' | 'low') => {
      try {
        await operationsService.updateQueuePriority(appointmentId, priority);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update priority';
        setError(message);
        throw err;
      }
    },
    [operationsService]
  );

  return { queue, updatePriority, loading, error };
}

// Hook for patient communication
export function useReceptionistCommunication(rbacManager: ReceptionistRBACManager, receptionistId: string) {
  const [communications, setCommunications] = useState<PatientCommunication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const operationsService = new ReceptionistOperationsService(rbacManager, receptionistId);

  const sendCommunication = useCallback(
    async (patientId: string, type: 'sms' | 'email' | 'phone' | 'app_notification', message: string) => {
      setLoading(true);
      try {
        const comm = await operationsService.sendPatientCommunication(patientId, type, message);
        setCommunications(prev => [...prev, comm]);
        return comm;
      } catch (err) {
        const message_err = err instanceof Error ? err.message : 'Failed to send communication';
        setError(message_err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  return { communications, sendCommunication, loading, error };
}

// Hook for metrics
export function useReceptionistMetrics(rbacManager: ReceptionistRBACManager, receptionistId: string) {
  const [metrics, setMetrics] = useState<ReceptionistMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const operationsService = new ReceptionistOperationsService(rbacManager, receptionistId);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await operationsService.getMetrics();
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
  }, [receptionistId]);

  return { metrics, loading, error };
}

// Hook for scheduling conflicts
export function useReceptionistScheduling(rbacManager: ReceptionistRBACManager, receptionistId: string) {
  const [conflicts, setConflicts] = useState<SchedulingConflict[]>([]);
  const [noShowPredictions, setNoShowPredictions] = useState<NoShowPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const operationsService = new ReceptionistOperationsService(rbacManager, receptionistId);

  const checkConflicts = useCallback(
    async (appointmentData: Partial<Appointment>) => {
      setLoading(true);
      try {
        const detected = await operationsService.detectSchedulingConflicts(appointmentData);
        setConflicts(detected);
        return detected;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to check conflicts';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  const predictNoShow = useCallback(
    async (appointmentId: string) => {
      setLoading(true);
      try {
        const prediction = await operationsService.predictNoShowRisk(appointmentId);
        setNoShowPredictions(prev => [...prev, prediction]);
        return prediction;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to predict no-show';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  return { conflicts, noShowPredictions, checkConflicts, predictNoShow, loading, error };
}

// Hook for insurance verification
export function useReceptionistInsurance(rbacManager: ReceptionistRBACManager, receptionistId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const operationsService = new ReceptionistOperationsService(rbacManager, receptionistId);

  const verifyInsurance = useCallback(
    async (patientId: string) => {
      setLoading(true);
      try {
        const result = await operationsService.verifyInsurance(patientId);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to verify insurance';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  return { verifyInsurance, loading, error };
}
