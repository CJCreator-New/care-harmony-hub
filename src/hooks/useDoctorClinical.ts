// Doctor Hooks
import { useState, useCallback } from 'react';
import { DoctorClinicalService } from '@/utils/doctorClinicalService';
import { Consultation, Prescription, LabOrder, DoctorDashboard, DoctorMetrics } from '@/types/doctor';

export function useDoctorDashboard(doctorId: string) {
  const [dashboard, setDashboard] = useState<DoctorDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { dashboard: data, error: err } = await DoctorClinicalService.getDoctorDashboard(doctorId);
      if (err) throw err;
      setDashboard(data || null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [doctorId]);

  return { dashboard, isLoading, error, fetchDashboard };
}

export function useDoctorConsultations(doctorId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createConsultation = useCallback(
    async (patientId: string, notes: string) => {
      try {
        setIsLoading(true);
        setError(null);
        const { consultation, error: err } = await DoctorClinicalService.createConsultation(
          doctorId,
          patientId,
          notes
        );
        if (err) throw err;
        return consultation;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [doctorId]
  );

  const closeConsultation = useCallback(
    async (consultationId: string, diagnosis: string[], notes: string) => {
      try {
        setIsLoading(true);
        setError(null);
        const { error: err } = await DoctorClinicalService.closeConsultation(
          consultationId,
          diagnosis,
          notes
        );
        if (err) throw err;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { isLoading, error, createConsultation, closeConsultation };
}

export function useDoctorPrescriptions(doctorId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createPrescription = useCallback(
    async (
      patientId: string,
      consultationId: string,
      prescription: Omit<Prescription, 'id' | 'doctorId' | 'patientId' | 'consultationId' | 'createdAt' | 'status'>
    ) => {
      try {
        setIsLoading(true);
        setError(null);
        const { prescription: data, error: err } = await DoctorClinicalService.createPrescription(
          doctorId,
          patientId,
          consultationId,
          prescription
        );
        if (err) throw err;
        return data;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [doctorId]
  );

  return { isLoading, error, createPrescription };
}

export function useDoctorLabOrders(doctorId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createLabOrder = useCallback(
    async (
      patientId: string,
      consultationId: string,
      tests: string[],
      priority: 'routine' | 'urgent'
    ) => {
      try {
        setIsLoading(true);
        setError(null);
        const { labOrder, error: err } = await DoctorClinicalService.createLabOrder(
          doctorId,
          patientId,
          consultationId,
          tests,
          priority
        );
        if (err) throw err;
        return labOrder;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [doctorId]
  );

  return { isLoading, error, createLabOrder };
}

export function useDoctorQueue(doctorId: string) {
  const [queue, setQueue] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchQueue = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { queue: data, error: err } = await DoctorClinicalService.getQueueForDoctor(doctorId);
      if (err) throw err;
      setQueue(data || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [doctorId]);

  const acceptPatient = useCallback(
    async (queueId: string) => {
      try {
        setIsLoading(true);
        setError(null);
        const { error: err } = await DoctorClinicalService.acceptPatientFromQueue(queueId, doctorId);
        if (err) throw err;
        await fetchQueue();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [doctorId, fetchQueue]
  );

  const completePatient = useCallback(
    async (queueId: string) => {
      try {
        setIsLoading(true);
        setError(null);
        const { error: err } = await DoctorClinicalService.completeQueueItem(queueId);
        if (err) throw err;
        await fetchQueue();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchQueue]
  );

  return { queue, isLoading, error, fetchQueue, acceptPatient, completePatient };
}

export function useDoctorMetrics(doctorId: string) {
  const [metrics, setMetrics] = useState<DoctorMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { metrics: data, error: err } = await DoctorClinicalService.getDoctorMetrics(doctorId);
      if (err) throw err;
      setMetrics(data || null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [doctorId]);

  return { metrics, isLoading, error, fetchMetrics };
}

export function useDoctorPatientHistory(patientId: string) {
  const [history, setHistory] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { history: data, error: err } = await DoctorClinicalService.getPatientHistory(patientId);
      if (err) throw err;
      setHistory(data || null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  return { history, isLoading, error, fetchHistory };
}
