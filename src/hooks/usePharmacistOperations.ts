import { useState, useCallback, useEffect } from 'react';
import {
  Prescription,
  PrescriptionVerification,
  DispensingRecord,
  PatientCounseling,
  PharmacyMetrics,
  PharmacistDashboard,
  InventoryItem,
  InventoryReorderRequest,
  ClinicalIntervention,
  InteractionCheck,
  AllergyCheck,
  DosageVerification,
} from '../types/pharmacist';
import { PharmacistOperationsService } from '../utils/pharmacistOperationsService';
import { PharmacistRBACManager } from '../utils/pharmacistRBACManager';

// Hook for pharmacist dashboard
export function usePharmacistDashboard(pharmacistId: string, rbacManager: PharmacistRBACManager) {
  const [dashboard, setDashboard] = useState<PharmacistDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const operationsService = new PharmacistOperationsService(rbacManager, pharmacistId);

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
  }, [pharmacistId]);

  return { dashboard, loading, error };
}

// Hook for prescription management
export function usePharmacistPrescriptions(rbacManager: PharmacistRBACManager, pharmacistId: string) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const operationsService = new PharmacistOperationsService(rbacManager, pharmacistId);

  const receivePrescription = useCallback(
    async (prescriptionData: Partial<Prescription>) => {
      setLoading(true);
      try {
        const received = await operationsService.receivePrescription(prescriptionData);
        setPrescriptions(prev => [...prev, received]);
        return received;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to receive prescription';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  const fillPrescription = useCallback(
    async (prescriptionId: string) => {
      setLoading(true);
      try {
        const filled = await operationsService.fillPrescription(prescriptionId);
        setPrescriptions(prev => prev.map(p => (p.id === prescriptionId ? filled : p)));
        return filled;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fill prescription';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  const rejectPrescription = useCallback(
    async (prescriptionId: string, reason: string) => {
      setLoading(true);
      try {
        const rejected = await operationsService.rejectPrescription(prescriptionId, reason);
        setPrescriptions(prev => prev.map(p => (p.id === prescriptionId ? rejected : p)));
        return rejected;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to reject prescription';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  return { prescriptions, receivePrescription, fillPrescription, rejectPrescription, loading, error };
}

// Hook for prescription verification
export function usePharmacistVerification(rbacManager: PharmacistRBACManager, pharmacistId: string) {
  const [verifications, setVerifications] = useState<PrescriptionVerification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const operationsService = new PharmacistOperationsService(rbacManager, pharmacistId);

  const verifyPrescription = useCallback(
    async (prescriptionId: string, patientId: string) => {
      setLoading(true);
      try {
        const verification = await operationsService.verifyPrescription(prescriptionId, patientId);
        setVerifications(prev => [...prev, verification]);
        return verification;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to verify prescription';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  return { verifications, verifyPrescription, loading, error };
}

// Hook for dispensing operations
export function usePharmacistDispensing(rbacManager: PharmacistRBACManager, pharmacistId: string) {
  const [dispensings, setDispensings] = useState<DispensingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const operationsService = new PharmacistOperationsService(rbacManager, pharmacistId);

  const processDispensing = useCallback(
    async (prescriptionId: string, patientId: string) => {
      setLoading(true);
      try {
        const dispensing = await operationsService.processDispensing(prescriptionId, patientId);
        setDispensings(prev => [...prev, dispensing]);
        return dispensing;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to process dispensing';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  const verifyDispensing = useCallback(
    async (dispensingId: string) => {
      setLoading(true);
      try {
        const verified = await operationsService.verifyDispensing(dispensingId);
        setDispensings(prev => prev.map(d => (d.id === dispensingId ? verified : d)));
        return verified;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to verify dispensing';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  const generateLabel = useCallback(
    async (dispensingId: string) => {
      setLoading(true);
      try {
        const label = await operationsService.generateLabel(dispensingId);
        return label;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate label';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  return { dispensings, processDispensing, verifyDispensing, generateLabel, loading, error };
}

// Hook for inventory management
export function usePharmacistInventory(rbacManager: PharmacistRBACManager, pharmacistId: string) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const operationsService = new PharmacistOperationsService(rbacManager, pharmacistId);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const items = await operationsService.getInventory();
        setInventory(items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load inventory');
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, [pharmacistId]);

  const updateInventory = useCallback(
    async (itemId: string, quantity: number) => {
      setLoading(true);
      try {
        const updated = await operationsService.updateInventory(itemId, quantity);
        setInventory(prev => prev.map(i => (i.id === itemId ? updated : i)));
        return updated;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update inventory';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  const requestReorder = useCallback(
    async (medicationName: string, ndc: string, quantity: number) => {
      setLoading(true);
      try {
        const request = await operationsService.requestReorder(medicationName, ndc, quantity);
        return request;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to request reorder';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  return { inventory, updateInventory, requestReorder, loading, error };
}

// Hook for clinical decision support
export function usePharmacistClinicalSupport(rbacManager: PharmacistRBACManager, pharmacistId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const operationsService = new PharmacistOperationsService(rbacManager, pharmacistId);

  const checkInteractions = useCallback(
    async (medicationName: string, currentMedications: string[]) => {
      setLoading(true);
      try {
        const check = await operationsService.checkDrugInteractions(medicationName, currentMedications);
        return check;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to check interactions';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  const checkAllergies = useCallback(
    async (patientId: string, medicationName: string) => {
      setLoading(true);
      try {
        const check = await operationsService.checkAllergies(patientId, medicationName);
        return check;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to check allergies';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  const verifyDosage = useCallback(
    async (medicationName: string, dosage: string, patientAge: number, patientWeight?: number) => {
      setLoading(true);
      try {
        const verification = await operationsService.verifyDosage(medicationName, dosage, patientAge, patientWeight);
        return verification;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to verify dosage';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  return { checkInteractions, checkAllergies, verifyDosage, loading, error };
}

// Hook for patient counseling
export function usePharmacistCounseling(rbacManager: PharmacistRBACManager, pharmacistId: string) {
  const [counselings, setCounselings] = useState<PatientCounseling[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const operationsService = new PharmacistOperationsService(rbacManager, pharmacistId);

  const counselPatient = useCallback(
    async (prescriptionId: string, patientId: string, counselingData: Partial<PatientCounseling>) => {
      setLoading(true);
      try {
        const counseling = await operationsService.counselPatient(prescriptionId, patientId, counselingData);
        setCounselings(prev => [...prev, counseling]);
        return counseling;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to counsel patient';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  return { counselings, counselPatient, loading, error };
}

// Hook for clinical interventions
export function usePharmacistInterventions(rbacManager: PharmacistRBACManager, pharmacistId: string) {
  const [interventions, setInterventions] = useState<ClinicalIntervention[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const operationsService = new PharmacistOperationsService(rbacManager, pharmacistId);

  const createIntervention = useCallback(
    async (prescriptionId: string, patientId: string, interventionData: Partial<ClinicalIntervention>) => {
      setLoading(true);
      try {
        const intervention = await operationsService.createIntervention(prescriptionId, patientId, interventionData);
        setInterventions(prev => [...prev, intervention]);
        return intervention;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create intervention';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  return { interventions, createIntervention, loading, error };
}

// Hook for metrics
export function usePharmacistMetrics(rbacManager: PharmacistRBACManager, pharmacistId: string) {
  const [metrics, setMetrics] = useState<PharmacyMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const operationsService = new PharmacistOperationsService(rbacManager, pharmacistId);

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
  }, [pharmacistId]);

  return { metrics, loading, error };
}
