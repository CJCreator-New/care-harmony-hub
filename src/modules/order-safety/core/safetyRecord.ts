/**
 * Persisted form of order-safety findings and overrides.
 *
 * Stored on the prescription row in the existing JSON columns, so no schema
 * change is needed:
 *   prescriptions.allergy_alerts    → allergy findings
 *   prescriptions.drug_interactions → every other blocking finding (interactions,
 *                                     dosing, pregnancy, route, incomplete screening)
 *   prescriptions.verification_required = true whenever anything was recorded
 * Each entry carries the documented override (if any), so the pharmacist sees
 * the prescriber's rationale and the record survives later edits to `notes`
 * (audit CLIN-02).
 */

import { ClinicalOverride, SafetyClearanceReceipt, SafetyFinding } from '../types';
import { findingKey } from './orderIntent';

export const SAFETY_RECORD_SCHEMA = 'order-safety/v1';

export interface PersistedSafetyFinding {
  readonly schema: typeof SAFETY_RECORD_SCHEMA;
  readonly key: string;
  readonly code: string;
  readonly kind: SafetyFinding['kind'];
  readonly severity: SafetyFinding['severity'];
  readonly isHardStop: boolean;
  readonly title: string;
  readonly detail: string;
  readonly drug: string;
  readonly subject?: string;
  readonly override?: {
    readonly reason: string;
    readonly authorizedBy: string;
    readonly role: string;
    readonly receiptId?: string;
    readonly auditLogId?: string;
    readonly documentedAt: string;
  };
}

export interface PrescriptionSafetyColumns {
  readonly allergy_alerts: PersistedSafetyFinding[];
  readonly drug_interactions: PersistedSafetyFinding[];
  readonly verification_required: boolean;
}

/**
 * Builds the column values for a new prescription from the findings that were
 * shown to the prescriber and the clearance receipt that accepted them.
 * Informational findings are not persisted (they do not require action).
 */
export function buildPrescriptionSafetyColumns(
  findings: readonly SafetyFinding[],
  receipt?: SafetyClearanceReceipt | null,
  overrides: readonly ClinicalOverride[] = receipt?.overridesApplied ?? []
): PrescriptionSafetyColumns {
  const at = receipt?.clearedAt ?? new Date().toISOString();
  const records = findings
    .filter((f) => f.requiresPhysicianOverride || f.isHardStop)
    .map<PersistedSafetyFinding>((f) => {
      const o = overrides.find((x) => x.findingCode === f.code);
      return {
        schema: SAFETY_RECORD_SCHEMA,
        key: findingKey(f),
        code: f.code,
        kind: f.kind,
        severity: f.severity,
        isHardStop: f.isHardStop,
        title: f.title,
        detail: f.detail,
        drug: f.drugName,
        ...(f.interactingSubject ? { subject: f.interactingSubject } : {}),
        ...(o
          ? {
              override: {
                reason: o.overrideReason,
                authorizedBy: o.authorizedDoctorId,
                role: receipt?.clearedBy.role ?? 'doctor',
                ...(receipt?.receiptId ? { receiptId: receipt.receiptId } : {}),
                ...(receipt?.auditLogId ? { auditLogId: receipt.auditLogId } : {}),
                documentedAt: at,
              },
            }
          : {}),
      };
    });
  const allergy = records.filter((r) => r.kind === 'ALLERGY_CROSS_REACTIVITY');
  const other = records.filter((r) => r.kind !== 'ALLERGY_CROSS_REACTIVITY');
  return {
    allergy_alerts: allergy,
    drug_interactions: other,
    verification_required: records.length > 0,
  };
}

/**
 * Prescriber overrides stored on a prescription, matched to the findings the
 * pharmacist's screen produced (codes differ between screens, keys do not).
 * Returns a map from the pharmacist-side finding code to the prescriber record.
 */
export function priorOverridesForFindings(
  stored: unknown,
  findings: readonly SafetyFinding[]
): Record<string, { reason: string; by?: string }> {
  const list = (Array.isArray(stored) ? stored : []).filter(
    (r: any): r is PersistedSafetyFinding => r && r.schema === SAFETY_RECORD_SCHEMA && r.override?.reason
  );
  const byKey = new Map(list.map((r) => [r.key, r]));
  const out: Record<string, { reason: string; by?: string }> = {};
  for (const f of findings) {
    const r = byKey.get(findingKey(f));
    if (r?.override) out[f.code] = { reason: r.override.reason, by: r.override.role };
  }
  return out;
}

/** Plain-text summary of documented overrides, for human-readable notes. */
export function overrideSummary(findings: readonly SafetyFinding[], overrides: readonly ClinicalOverride[]): string {
  return overrides
    .map((o) => {
      const f = findings.find((x) => x.code === o.findingCode);
      return `[CLINICAL SAFETY OVERRIDE] ${f?.title ?? o.findingCode}: ${o.overrideReason}`;
    })
    .join('\n');
}
