/**
 * React Hook Adapter: `useOrderSafety`
 *
 * Provides an ergonomic presentation-layer seam for prescribing and dispensing components.
 * Hides debouncing, background checking, abort controllers, item badge mappings,
 * and clinical override dialog workflows behind a clean reactive hook interface.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ClinicalActor,
  ClinicalOverride,
  IOrderSafetyEngine,
  OrderItemIntent,
  OrderSafetyAction,
  PatientClinicalContext,
  PediatricSafetyAnalysis,
  SafetyAssessment,
  SafetyClearanceReceipt,
  SafetyFinding,
  SafetyVerdict,
} from './types';
import { createOrderSafetyEngine } from './OrderSafetyEngine';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface UseOrderSafetyOptions {
  readonly patient: PatientClinicalContext;
  readonly items: readonly OrderItemIntent[];
  readonly debounceMs?: number; // default: 300ms
  readonly enabled?: boolean;
  readonly engine?: IOrderSafetyEngine;
}

export interface UseOrderSafetyReturn {
  // Reactive clearance state
  readonly status: 'idle' | 'checking' | 'cleared' | 'warning' | 'blocked' | 'error';
  readonly isChecking: boolean;
  readonly canProceed: boolean;
  readonly hasHardStop: boolean;
  readonly verdict: SafetyVerdict;
  readonly summary: string;

  // Categorized findings
  readonly findings: readonly SafetyFinding[];
  readonly hardStops: readonly SafetyFinding[];
  readonly unhandledOverrides: readonly SafetyFinding[];
  readonly pediatricAnalyses: Readonly<Record<string, PediatricSafetyAnalysis>>;

  // Item-level helpers
  readonly getItemIssues: (clientItemId: string) => readonly SafetyFinding[];

  // Override management
  readonly activeOverrides: readonly ClinicalOverride[];
  readonly recordOverride: (findingCode: string, reason: string) => boolean;
  readonly removeOverride: (findingCode: string) => void;
  readonly clearOverrides: () => void;

  // Submission execution gate
  readonly clearAndSign: (action?: OrderSafetyAction) => Promise<SafetyClearanceReceipt>;
  readonly bindSubmission: <T>(
    onSubmit: (receipt: SafetyClearanceReceipt) => Promise<T>,
    action?: OrderSafetyAction
  ) => () => Promise<T | null>;

  // Manual refresh
  readonly refresh: () => Promise<void>;
}

export function useOrderSafety(options: UseOrderSafetyOptions): UseOrderSafetyReturn {
  const { patient, items, debounceMs = 300, enabled = true, engine: customEngine } = options;
  const { user } = useAuth();

  const engine = useMemo(() => customEngine || createOrderSafetyEngine(), [customEngine]);

  const [assessment, setAssessment] = useState<SafetyAssessment | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [activeOverrides, setActiveOverrides] = useState<ClinicalOverride[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastEvaluatedItemsHash = useRef<string>('');

  // Assemble ClinicalActor from AuthContext
  const actor: ClinicalActor = useMemo(
    () => ({
      userId: user?.id || 'anonymous-user',
      hospitalId: user?.hospital_id || patient.hospitalId,
      role: (user?.role as any) || 'doctor',
    }),
    [user, patient.hospitalId]
  );

  /**
   * Core evaluation trigger with abort cancellation
   */
  const runEvaluation = useCallback(
    async (signal?: AbortSignal) => {
      if (!enabled || !actor.hospitalId || items.length === 0) {
        setAssessment(null);
        setIsChecking(false);
        return;
      }

      setIsChecking(true);
      setErrorState(null);

      try {
        const res = await (engine as any).evaluate(
          {
            actor,
            patient,
            items,
          },
          signal
        );

        if (!signal?.aborted) {
          setAssessment(res);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('OrderSafetyEngine evaluation failed:', err);
          setErrorState(err.message || 'Safety evaluation error');
        }
      } finally {
        if (!signal?.aborted) {
          setIsChecking(false);
        }
      }
    },
    [actor, patient, items, enabled, engine]
  );

  /**
   * Debounced evaluation effect
   */
  useEffect(() => {
    const itemsHash = JSON.stringify(
      items.map((i) => [i.drugName, i.doseMg, i.route, i.frequency])
    );
    if (itemsHash === lastEvaluatedItemsHash.current && assessment !== null) {
      return;
    }
    lastEvaluatedItemsHash.current = itemsHash;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(() => {
      runEvaluation(controller.signal);
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [items, debounceMs, runEvaluation, assessment]);

  // Derived Safety Properties
  const findings = useMemo(() => assessment?.findings || [], [assessment]);
  const hardStops = useMemo(() => findings.filter((f) => f.isHardStop), [findings]);
  const unhandledOverrides = useMemo(
    () =>
      findings.filter(
        (f) =>
          f.requiresPhysicianOverride &&
          !f.isHardStop &&
          !activeOverrides.some(
            (o) => o.findingCode === f.code && o.overrideReason.trim().length >= 10
          )
      ),
    [findings, activeOverrides]
  );

  const hasHardStop = hardStops.length > 0;
  const verdict: SafetyVerdict = assessment?.verdict || 'CLEARED';
  const canProceed =
    enabled &&
    !isChecking &&
    !hasHardStop &&
    unhandledOverrides.length === 0 &&
    (assessment !== null || items.length === 0);

  const status = useMemo(() => {
    if (errorState) return 'error';
    if (isChecking) return 'checking';
    if (hasHardStop) return 'blocked';
    if (unhandledOverrides.length > 0) return 'warning';
    if (assessment?.verdict === 'CLEARED' || items.length === 0) return 'cleared';
    return 'idle';
  }, [errorState, isChecking, hasHardStop, unhandledOverrides.length, assessment, items.length]);

  /**
   * Get findings associated with a specific order item row
   */
  const getItemIssues = useCallback(
    (clientItemId: string) => {
      return findings.filter((f) => f.clientItemId === clientItemId);
    },
    [findings]
  );

  /**
   * Add or update an override rationale
   */
  const recordOverride = useCallback(
    (findingCode: string, reason: string): boolean => {
      const trimmed = reason.trim();
      if (trimmed.length < 10) {
        toast.error('Clinical override justification must be at least 10 characters.');
        return false;
      }

      setActiveOverrides((prev) => {
        const filtered = prev.filter((o) => o.findingCode !== findingCode);
        return [
          ...filtered,
          {
            findingCode,
            overrideReason: trimmed,
            authorizedDoctorId: actor.userId,
          },
        ];
      });
      toast.success('Clinical override rationale documented.');
      return true;
    },
    [actor.userId]
  );

  const removeOverride = useCallback((findingCode: string) => {
    setActiveOverrides((prev) => prev.filter((o) => o.findingCode !== findingCode));
  }, []);

  const clearOverrides = useCallback(() => {
    setActiveOverrides([]);
  }, []);

  /**
   * Authoritative commit gate
   */
  const clearAndSign = useCallback(
    async (action: OrderSafetyAction = 'DOCTOR_PRESCRIBE'): Promise<SafetyClearanceReceipt> => {
      return await engine.clear({
        actor,
        patient,
        items,
        overrides: activeOverrides,
        action,
      });
    },
    [engine, actor, patient, items, activeOverrides]
  );

  /**
   * Execution guard wrapper for form submission handlers
   */
  const bindSubmission = useCallback(
    <T>(
      onSubmit: (receipt: SafetyClearanceReceipt) => Promise<T>,
      action: OrderSafetyAction = 'DOCTOR_PRESCRIBE'
    ) => {
      return async (): Promise<T | null> => {
        if (hasHardStop) {
          toast.error(`Order blocked: ${hardStops[0]?.title || 'Critical contraindication'}`);
          return null;
        }

        if (unhandledOverrides.length > 0) {
          toast.warning(
            `Documentation required: ${unhandledOverrides.length} clinical safety issue(s) require an override rationale.`
          );
          return null;
        }

        try {
          const receipt = await clearAndSign(action);
          return await onSubmit(receipt);
        } catch (err: any) {
          toast.error(`Safety clearance failed: ${err.message}`);
          return null;
        }
      };
    },
    [hasHardStop, hardStops, unhandledOverrides, clearAndSign]
  );

  return {
    status,
    isChecking,
    canProceed,
    hasHardStop,
    verdict,
    summary: assessment?.summary || 'Safety checks ready.',
    findings,
    hardStops,
    unhandledOverrides,
    pediatricAnalyses: assessment?.pediatricAnalyses || {},
    getItemIssues,
    activeOverrides,
    recordOverride,
    removeOverride,
    clearOverrides,
    clearAndSign,
    bindSubmission,
    refresh: async () => runEvaluation(),
  };
}
