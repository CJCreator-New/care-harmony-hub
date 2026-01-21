import { useState, useCallback, useEffect } from 'react';
import {
  Specimen,
  LabTest,
  TestResult,
  QualityControl,
  AnalyzerMaintenance,
  LabMetrics,
  LabTechDashboard,
  CriticalResult,
  SpecimenValidation,
  AnalyzerStatus,
} from '../types/labtech';
import { LabTechOperationsService } from '../utils/labTechOperationsService';
import { LabTechRBACManager } from '../utils/labTechRBACManager';

// Hook for lab tech dashboard
export function useLabTechDashboard(labTechId: string, rbacManager: LabTechRBACManager) {
  const [dashboard, setDashboard] = useState<LabTechDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const operationsService = new LabTechOperationsService(rbacManager, labTechId);

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
  }, [labTechId]);

  return { dashboard, loading, error };
}

// Hook for specimen management
export function useLabTechSpecimens(rbacManager: LabTechRBACManager, labTechId: string) {
  const [specimens, setSpecimens] = useState<Specimen[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const operationsService = new LabTechOperationsService(rbacManager, labTechId);

  const receiveSpecimen = useCallback(
    async (specimenData: Partial<Specimen>) => {
      setLoading(true);
      try {
        const received = await operationsService.receiveSpecimen(specimenData);
        setSpecimens(prev => [...prev, received]);
        return received;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to receive specimen';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  const processSpecimen = useCallback(
    async (specimenId: string) => {
      setLoading(true);
      try {
        const processed = await operationsService.processSpecimen(specimenId);
        setSpecimens(prev => prev.map(s => (s.id === specimenId ? processed : s)));
        return processed;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to process specimen';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  const rejectSpecimen = useCallback(
    async (specimenId: string, reason: string) => {
      setLoading(true);
      try {
        const rejected = await operationsService.rejectSpecimen(specimenId, reason);
        setSpecimens(prev => prev.map(s => (s.id === specimenId ? rejected : s)));
        return rejected;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to reject specimen';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  const validateSpecimen = useCallback(
    async (specimenId: string) => {
      setLoading(true);
      try {
        const validation = await operationsService.validateSpecimen(specimenId);
        return validation;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to validate specimen';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  return { specimens, receiveSpecimen, processSpecimen, rejectSpecimen, validateSpecimen, loading, error };
}

// Hook for testing operations
export function useLabTechTesting(rbacManager: LabTechRBACManager, labTechId: string) {
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const operationsService = new LabTechOperationsService(rbacManager, labTechId);

  const performTest = useCallback(
    async (specimenId: string, testCode: string) => {
      setLoading(true);
      try {
        const test = await operationsService.performTest(specimenId, testCode);
        setTests(prev => [...prev, test]);
        return test;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to perform test';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  const verifyTest = useCallback(
    async (testId: string) => {
      setLoading(true);
      try {
        const verified = await operationsService.verifyTest(testId);
        setTests(prev => prev.map(t => (t.id === testId ? verified : t)));
        return verified;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to verify test';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  return { tests, performTest, verifyTest, loading, error };
}

// Hook for result management
export function useLabTechResults(rbacManager: LabTechRBACManager, labTechId: string) {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const operationsService = new LabTechOperationsService(rbacManager, labTechId);

  const reviewResult = useCallback(
    async (testId: string, resultData: Partial<TestResult>) => {
      setLoading(true);
      try {
        const result = await operationsService.reviewResult(testId, resultData);
        setResults(prev => [...prev, result]);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to review result';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  const approveResult = useCallback(
    async (resultId: string) => {
      setLoading(true);
      try {
        const approved = await operationsService.approveResult(resultId);
        setResults(prev => prev.map(r => (r.id === resultId ? approved : r)));
        return approved;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to approve result';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  return { results, reviewResult, approveResult, loading, error };
}

// Hook for quality control
export function useLabTechQualityControl(rbacManager: LabTechRBACManager, labTechId: string) {
  const [qcRecords, setQcRecords] = useState<QualityControl[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const operationsService = new LabTechOperationsService(rbacManager, labTechId);

  const performQC = useCallback(
    async (analyzerId: string, testCode: string, qcLevel: 'low' | 'normal' | 'high') => {
      setLoading(true);
      try {
        const qc = await operationsService.performQC(analyzerId, testCode, qcLevel);
        setQcRecords(prev => [...prev, qc]);
        return qc;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to perform QC';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  return { qcRecords, performQC, loading, error };
}

// Hook for analyzer management
export function useLabTechAnalyzers(rbacManager: LabTechRBACManager, labTechId: string) {
  const [analyzerStatus, setAnalyzerStatus] = useState<AnalyzerStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const operationsService = new LabTechOperationsService(rbacManager, labTechId);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const status = await operationsService.getAnalyzerStatus();
        setAnalyzerStatus(status);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analyzer status');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [labTechId]);

  const operateAnalyzer = useCallback(
    async (analyzerId: string, operation: string) => {
      setLoading(true);
      try {
        const result = await operationsService.operateAnalyzer(analyzerId, operation);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to operate analyzer';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  const calibrateAnalyzer = useCallback(
    async (analyzerId: string) => {
      setLoading(true);
      try {
        const maintenance = await operationsService.calibrateAnalyzer(analyzerId);
        return maintenance;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to calibrate analyzer';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  const logMaintenance = useCallback(
    async (analyzerId: string, maintenanceData: Partial<AnalyzerMaintenance>) => {
      setLoading(true);
      try {
        const maintenance = await operationsService.logMaintenance(analyzerId, maintenanceData);
        return maintenance;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to log maintenance';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  return { analyzerStatus, operateAnalyzer, calibrateAnalyzer, logMaintenance, loading, error };
}

// Hook for critical results
export function useLabTechCriticalResults(rbacManager: LabTechRBACManager, labTechId: string) {
  const [criticalResults, setCriticalResults] = useState<CriticalResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const operationsService = new LabTechOperationsService(rbacManager, labTechId);

  const handleCriticalResult = useCallback(
    async (testId: string, resultData: Partial<TestResult>) => {
      setLoading(true);
      try {
        const critical = await operationsService.handleCriticalResult(testId, resultData);
        setCriticalResults(prev => [...prev, critical]);
        return critical;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to handle critical result';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [operationsService]
  );

  return { criticalResults, handleCriticalResult, loading, error };
}

// Hook for metrics
export function useLabTechMetrics(rbacManager: LabTechRBACManager, labTechId: string) {
  const [metrics, setMetrics] = useState<LabMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const operationsService = new LabTechOperationsService(rbacManager, labTechId);

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
  }, [labTechId]);

  return { metrics, loading, error };
}
