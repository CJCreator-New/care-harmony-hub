/**
 * Unified Clinical Order Safety Engine (`OrderSafetyEngine`) - Types
 *
 * Domain Context: CareSync HIMS
 * Invariants Enforced:
 * 1. Fail-Closed Clinical Decision Support (CDS)
 * 2. Multi-Tenant Hospital Isolation (actor.hospitalId === patient.hospitalId)
 * 3. Prescription Approval Workflow Safety Gates
 */

// ─── Actor & Tenant Identity ──────────────────────────────────────────────────

export type ClinicalRole =
  'doctor' | 'pharmacist' | 'nurse' | 'admin' | 'receptionist' | 'lab_technician' | 'patient';

export interface ClinicalActor {
  readonly userId: string;
  readonly hospitalId: string;
  readonly role: ClinicalRole;
  readonly licenseNumber?: string;
}

// ─── Clinical Order Request Data ──────────────────────────────────────────────

export type AdministrationRoute =
  'PO' | 'IV' | 'IV (slow)' | 'IM' | 'SC' | 'PR' | 'Inhaled' | 'Topical' | 'SL';

export interface OrderItemIntent {
  readonly clientItemId: string;
  readonly drugName: string;
  readonly drugRxcui?: string;
  readonly doseMg: number;
  readonly route: AdministrationRoute;
  readonly frequency: string; // e.g., 'daily', 'BID', 'TID', 'QID', 'PRN'
  readonly dosesPerDay?: number;
  readonly durationDays?: number;
  readonly isHighDoseProtocol?: boolean;
}

export interface PatientClinicalContext {
  readonly patientId: string;
  readonly hospitalId: string;
  readonly ageYears: number;
  readonly ageMonths?: number;
  readonly weightKg?: number;
  readonly gender?: 'M' | 'F' | 'O' | string;
  readonly isPregnant?: boolean;
  readonly isBreastfeeding?: boolean;
  readonly allergies?: readonly string[];
  readonly activeMedications?: readonly {
    readonly drugName: string;
    readonly drugRxcui?: string;
    readonly dosageMg?: number;
  }[];
}

// ─── Findings & Verdict ───────────────────────────────────────────────────────

export type SafetyVerdict =
  | 'CLEARED' // Completely safe to proceed
  | 'REQUIRES_OVERRIDE' // Serious interaction or dosage variance: Doctor override required
  | 'HARD_STOP' // Absolute contraindication (e.g. >200% AAP ceiling, lethal DDI): Blocked
  | 'INCOMPLETE_CDS'; // Service timeout or unverified drug: Fail-Closed blocks automation

export type FindingSeverity = 'CRITICAL' | 'SERIOUS' | 'MODERATE' | 'INFORMATIONAL';

export type FindingKind =
  | 'ALLERGY_CROSS_REACTIVITY'
  | 'PEDIATRIC_DOSE_LIMIT'
  | 'DRUG_DRUG_INTERACTION'
  | 'PREGNANCY_CONTRAINDICATION'
  | 'ROUTE_INCOMPATIBILITY'
  | 'CLINICAL_INVARIANT_VIOLATION'
  | 'UPSTREAM_CDS_DEGRADATION';

export interface SafetyFinding {
  readonly code: string;
  readonly kind: FindingKind;
  readonly severity: FindingSeverity;
  readonly isHardStop: boolean;
  readonly requiresPhysicianOverride: boolean;
  readonly clientItemId?: string;
  readonly drugName: string;
  readonly interactingSubject?: string;
  readonly title: string;
  readonly detail: string;
  readonly clinicalRecommendation: string;
  readonly source: 'AAP' | 'RXNORM' | 'LOCAL_FORMULARY' | 'PHYSIOLOGICAL_RULES' | 'ENGINE';
}

export interface PediatricSafetyAnalysis {
  readonly drugName: string;
  readonly weightKg: number;
  readonly ageMonths: number;
  readonly calculatedDailyMgPerKg: number;
  readonly maxSafeDailyMgPerKg: number;
  readonly adultCeilingSingleDoseMg: number;
  readonly adultCeilingDailyDoseMg: number;
  readonly adjustmentsApplied: readonly string[];
  readonly ratioToSafeCeiling: number; // e.g. 1.15 = 115%
}

// ─── Entry Point 1: Evaluation (Advisory / Drafting) ──────────────────────────

export interface SafetyEvaluationRequest {
  readonly actor: ClinicalActor;
  readonly patient: PatientClinicalContext;
  readonly items: readonly OrderItemIntent[];
}

export interface SafetyAssessment {
  readonly verdict: SafetyVerdict;
  readonly canProceed: boolean;
  readonly summary: string;
  readonly findings: readonly SafetyFinding[];
  readonly pediatricAnalyses: Readonly<Record<string, PediatricSafetyAnalysis>>;
  readonly evaluatedAt: string;
}

// ─── Entry Point 2: Clearance Gate (Commit / Enforcement) ─────────────────────

export interface ClinicalOverride {
  readonly findingCode: string;
  readonly overrideReason: string; // Must be >= 10 non-whitespace characters
  readonly authorizedDoctorId: string;
}

export type OrderSafetyAction = 'DOCTOR_PRESCRIBE' | 'PHARMACIST_DISPENSE' | 'TELEHEALTH_ISSUE';

export interface SafetyClearanceCommand {
  readonly actor: ClinicalActor;
  readonly patient: PatientClinicalContext;
  readonly items: readonly OrderItemIntent[];
  readonly overrides?: readonly ClinicalOverride[];
  readonly action: OrderSafetyAction;
}

export interface SafetyClearanceReceipt {
  readonly receiptId: string; // UUID
  readonly status: 'CLEARED';
  readonly orderHash: string; // SHA-256 fingerprint
  readonly clearedAt: string;
  readonly clearedBy: ClinicalActor;
  readonly auditLogId?: string; // Reference in public.audit_logs
  readonly overridesApplied: readonly ClinicalOverride[];
  readonly signature: string; // HMAC clearance signature
}

// ─── Engine Interface ─────────────────────────────────────────────────────────

export interface IOrderSafetyEngine {
  /**
   * Entry Point 1: Evaluates medication orders for clinical safety.
   * Pure evaluation without persistent side effects. Ideal for interactive UI forms.
   */
  evaluate(request: SafetyEvaluationRequest): Promise<SafetyAssessment>;

  /**
   * Entry Point 2: Authoritative commit gate.
   * Atomically verifies hospital isolation, re-evaluates all safety invariants,
   * validates physician override rationales, logs to audit_logs, and mints an
   * immutable clearance receipt.
   *
   * Throws `OrderSafetyRejectionError` on HARD_STOP or unhandled overrides.
   * Throws `TenantIsolationViolationError` on cross-hospital mismatch.
   * Throws `CDSUnavailableFailClosedError` on service degradation without override.
   */
  clear(command: SafetyClearanceCommand): Promise<SafetyClearanceReceipt>;
}

// ─── Explicit Error Modes ─────────────────────────────────────────────────────

export class OrderSafetyRejectionError extends Error {
  constructor(
    message: string,
    public readonly verdict: SafetyVerdict,
    public readonly unresolvedFindings: readonly SafetyFinding[]
  ) {
    super(message);
    this.name = 'OrderSafetyRejectionError';
  }
}

export class TenantIsolationViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantIsolationViolationError';
  }
}

export class CDSUnavailableFailClosedError extends Error {
  constructor(
    message: string,
    public readonly degradedServices: readonly string[]
  ) {
    super(message);
    this.name = 'CDSUnavailableFailClosedError';
  }
}
