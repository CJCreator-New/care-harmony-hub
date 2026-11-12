/**
 * Patient-context integrity rules (Fail-Closed CDS).
 *
 * The allergy, interaction and dosing checks can only be as good as the patient
 * data they receive. When that data is known to be incomplete (a query failed,
 * existing prescriptions could not be decrypted), the order must not be cleared
 * automatically: CONTEXT.md "Fail-Closed Clinical Decision Support" requires an
 * explicit physician override with a logged rationale.
 */

import { OrderItemIntent, PatientClinicalContext, SafetyFinding } from '../types';

export const CONTEXT_INCOMPLETE_CODE = 'CDS_PATIENT_CONTEXT_INCOMPLETE';
export const ALLERGY_STATUS_UNKNOWN_CODE = 'ALLERGY_STATUS_NOT_RECORDED';

export function evaluateContextIntegrity(
  items: readonly OrderItemIntent[],
  patient: PatientClinicalContext
): readonly SafetyFinding[] {
  if (items.length === 0) return [];
  const findings: SafetyFinding[] = [];

  const gaps = (patient.dataGaps || []).filter((g) => g && g.trim());
  if (gaps.length > 0) {
    findings.push({
      code: CONTEXT_INCOMPLETE_CODE,
      kind: 'UPSTREAM_CDS_DEGRADATION',
      severity: 'SERIOUS',
      isHardStop: false,
      requiresPhysicianOverride: true,
      drugName: 'Patient clinical context',
      title: 'Fail-Closed CDS: Safety screening incomplete',
      detail: `Safety checks could not use complete patient data: ${gaps.join('; ')}.`,
      clinicalRecommendation:
        'Verify allergies and current medications directly with the patient or chart, then document the manual review to proceed.',
      source: 'ENGINE',
    });
  }

  if (patient.allergyStatusUnknown) {
    findings.push({
      code: ALLERGY_STATUS_UNKNOWN_CODE,
      kind: 'ALLERGY_CROSS_REACTIVITY',
      severity: 'INFORMATIONAL',
      isHardStop: false,
      requiresPhysicianOverride: false,
      drugName: 'Allergy status',
      title: 'Allergy status not recorded',
      detail:
        'No allergy information (including "no known allergies") is documented for this patient, so allergy screening had nothing to check against.',
      clinicalRecommendation: 'Confirm and record allergy status before or with this order.',
      source: 'ENGINE',
    });
  }

  return findings;
}
