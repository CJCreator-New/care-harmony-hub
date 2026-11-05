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
  ClinicalRole,
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
import { useClinicalActor } from '@/hooks/useClinicalActor';

export interface UseOrderSafetyOptions {
  /**
   * Patient context. `null` while it is loading or when it could not be loaded:
   * with any order items present, that BLOCKS (fail-closed).
   */
  readonly patient: PatientClinicalContext | null;
  readonly items: readonly OrderItemIntent[];
  readonly debounceMs?: number; // default: 300ms
  readonly enabled?: boolean;
  readonly engine?: IOrderSafetyEngine;
  /** Role this screen acts in ('doctor' when prescribing, 'pharmacist' when verifying). Used only if the user holds it. */
  readonly actingRole?: ClinicalRole;
  /** The patient context is still loading. */
  readonly isContextLoading?: boolean;
  /** The patient context could not be loaded (shown to the user; blocks). */
  readonly contextError?: string | null;
}

export interface UseOrderSafetyReturn {
  // Reactive clearance state
  readonly status: 'idle' | 'checking' | 'cleared' | 'warning' | 'blocked' | 'error';
  readonly isChecking: boolean;
  readonly canProceed: boolean;
  readonly hasHardStop: boolean;
  readonly verdict: SafetyVerdict;
  readonly summary: string;
  /** Why the check failed or could not run (blocks when items exist). */
  readonly errorMessage: string | null;

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

const CLINICAL_ROLES: readonly ClinicalRole[] = [
  'doctor',
  'pharmacist',
  'nurse',
  'admin',
  'receptionist',
  'lab_technician',
  'patient',
];

/**
 * Builds the acting clinician from AuthContext. The tenant comes from the
 * user's profile, never from the patient (the old fallback made the tenant
 * isolation check compare the patient's hospital with itself), and the role
 * is one the user actually holds (Supabase's `user.role` is always
 * 'authenticated', which made every doctor override fail).
 */
function useOrderSafetyActor(actingRole?: ClinicalRole): ClinicalActor {
  const { userId, hospitalId, role } = useClinicalActor<ClinicalRole>({
    actingRole,
    allowedRoles: CLINICAL_ROLES,
  });
  return useMemo(
    () => ({ userId: userId || '', hospitalId: hospitalId || '', role: role || 'patient' }),
    [userId, hospitalId, role]
  );
}

/** Stable fingerprint of everything that affects the assessment. */
function fingerprint(patient: PatientClinicalContext | null, items: readonly OrderItemIntent[]): string {
  return JSON.stringify([
    items.map((i) => [i.clientItemId, i.drugName, i.doseMg, i.route, i.frequency, i.dosesPerDay]),
    patient && [
      patient.patientId,
      patient.hospitalId,
      patient.ageYears,
      patient.ageMonths,
      patient.weightKg,
      patient.gender,
      patient.isPregnant,
      patient.isBreastfeeding,
      patient.allergies,
      patient.activeMedications?.map((m) => m.drugName),
      patient.dataGaps,
      patient.allergyStatusUnknown,
    ],
  ]);
}

export function useOrderSafety(options: UseOrderSafetyOptions): UseOrderSafetyReturn {
  const {
    patient,
    items,
    debounceMs = 300,
    enabled = true,
    engine: customEngine,
    actingRole,
    isContextLoading = false,
    contextError = null,
  } = options;

  const engine = useMemo(() => customEngine || createOrderSafetyEngine(), [customEngine]);
  const actor = useOrderSafetyActor(actingRole);

  const [assessment, setAssessment] = useState<SafetyAssessment | null>(null);
  const [assessedFingerprint, setAssessedFingerprint] = useState<string>('');
  const [isChecking, setIsChecking] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [activeOverrides, setActiveOverrides] = useState<ClinicalOverride[]>([]);

  const actorKey = `${actor.userId}|${actor.hospitalId}|${actor.role}`;
  const currentFingerprint = useMemo(
    () => `${actorKey}|${fingerprint(patient, items)}`,
    [actorKey, patient, items]
  );
  const latestRequest = useRef(0);

  /**
   * Core evaluation trigger with abort cancellation
   */
  const runEvaluation = useCallback(
    async (signal?: AbortSignal) => {
      const requestId = ++latestRequest.current;
      if (!enabled || items.length === 0 || !patient) {
        setAssessment(null);
        setAssessedFingerprint('');
        setErrorState(null);
        setIsChecking(false);
        return;
      }

      setIsChecking(true);
      setErrorState(null);

      try {
        const res = await (engine as any).evaluate({ actor, patient, items }, signal);
        if (!signal?.aborted && requestId === latestRequest.current) {
          setAssessment(res);
          setAssessedFingerprint(currentFingerprint);
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError' && requestId === latestRequest.current) {
          console.error('OrderSafetyEngine evaluation failed:', err);
          // Fail-closed: drop any earlier result so it cannot be acted on.
          setAssessment(null);
          setAssessedFingerprint('');
          setErrorState(err?.message || 'Safety evaluation error');
        }
      } finally {
        if (!signal?.aborted && requestId === latestRequest.current) {
          setIsChecking(false);
        }
      }
    },
    [actor, patient, items, enabled, engine, currentFingerprint]
  );

  /**
   * Debounced evaluation whenever the items OR the patient data change.
   */
  useEffect(() => {
    const controller = new AbortController();
    if (items.length > 0 && enabled && patient) setIsChecking(true);
    const timer = setTimeout(() => {
      void runEvaluation(controller.signal);
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // currentFingerprint captures actor values + items + patient, so object
    // identity changes (new arrays from context) do not cause re-evaluation loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFingerprint, enabled, engine, debounceMs]);

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
  const hasItems = items.length > 0;
  const isFresh = assessment !== null && assessedFingerprint === currentFingerprint;
  const contextMissing = hasItems && enabled && !patient;
  const errorMessage = !hasItems
    ? null
    : errorState ||
      (contextMissing && !isContextLoading
        ? contextError || 'Patient safety data is unavailable, so this order cannot be screened.'
        : null);
  const checking = hasItems && (isChecking || isContextLoading || (!!patient && enabled && !isFresh && !errorState));

  // Fail-closed: proceed only with a fresh, error-free assessment of exactly
  // these items and this patient, with every override-requiring finding documented.
  const canProceed =
    !hasItems ||
    (enabled &&
      !checking &&
      !errorMessage &&
      isFresh &&
      !hasHardStop &&
      unhandledOverrides.length === 0);

  const status = useMemo(() => {
    if (!hasItems) return 'cleared';
    if (errorMessage) return 'error';
    if (checking) return 'checking';
    if (hasHardStop) return 'blocked';
    if (unhandledOverrides.length > 0) return 'warning';
    if (isFresh && assessment?.verdict === 'CLEARED') return 'cleared';
    if (isFresh) return 'cleared';
    return 'idle';
  }, [hasItems, errorMessage, checking, hasHardStop, unhandledOverrides.length, isFresh, assessment]);

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
      if (!patient) {
        throw new Error(contextError || 'Patient safety data is unavailable; the order cannot be cleared.');
      }
      return await engine.clear({
        actor,
        patient,
        items,
        overrides: activeOverrides,
        action,
      });
    },
    [engine, actor, patient, items, activeOverrides, contextError]
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
        if (!canProceed && errorMessage) {
          toast.error(`Order blocked: ${errorMessage}`);
          return null;
        }
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
    [canProceed, errorMessage, hasHardStop, hardStops, unhandledOverrides, clearAndSign]
  );

  return {
    status,
    isChecking: checking,
    canProceed,
    hasHardStop,
    verdict,
    summary: errorMessage || assessment?.summary || 'Safety checks ready.',
    errorMessage,
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
