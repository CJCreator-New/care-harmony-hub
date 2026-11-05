/**
 * Merges allergies and home medications captured at nurse intake into the
 * patient's structured record (audit CLIN-14).
 *
 * Intake forms collect free text ("Penicillin, sulfa" / "NKDA") that was only
 * written to checklist notes, so the order-safety engine, which reads
 * `patients.allergies` and `patients.current_medications`, never saw it.
 *
 * Merge rules (additive only; intake never erases a documented allergy):
 *  - new allergies are appended, case-insensitively de-duplicated;
 *  - "NKDA"/"none" is recorded only when the record has no allergy entries;
 *  - a real allergy replaces a previous "NKDA" marker;
 *  - new medications are appended as strings, existing entries keep their shape.
 */

import { medicationsFromRecord, normalizeAllergyList } from './orderIntent';

export interface IntakeClinicalText {
  readonly allergies?: string | null;
  readonly currentMedications?: string | null;
}

export interface PatientRecordPatch {
  allergies?: string[];
  current_medications?: unknown[];
}

const NKDA_MARKER = 'NKDA';

export function mergeIntakeIntoPatientRecord(
  existing: { allergies?: unknown; current_medications?: unknown },
  intake: IntakeClinicalText
): PatientRecordPatch | null {
  const patch: PatientRecordPatch = {};

  const incoming = normalizeAllergyList(intake.allergies ?? null);
  if (incoming.recorded) {
    const current = normalizeAllergyList(existing.allergies ?? null);
    const known = new Set(current.allergies.map((a) => a.toLowerCase()));
    const added = incoming.allergies.filter((a) => !known.has(a.toLowerCase()));
    if (added.length > 0) {
      patch.allergies = [...current.allergies, ...added];
    } else if (!current.recorded && incoming.allergies.length === 0) {
      patch.allergies = [NKDA_MARKER];
    }
  }

  const newMeds = medicationsFromRecord(intake.currentMedications ?? null);
  if (newMeds.length > 0) {
    const currentList: unknown[] = Array.isArray(existing.current_medications)
      ? [...existing.current_medications]
      : medicationsFromRecord(existing.current_medications ?? null).map((m) => m.drugName);
    const known = new Set(medicationsFromRecord(currentList).map((m) => m.drugName.toLowerCase()));
    const added = newMeds.filter((m) => !known.has(m.drugName.toLowerCase())).map((m) => m.drugName);
    if (added.length > 0) patch.current_medications = [...currentList, ...added];
  }

  return Object.keys(patch).length > 0 ? patch : null;
}
