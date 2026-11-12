/**
 * React hook: loads the patient data the order-safety engine needs (allergies,
 * home medications, recent prescriptions, age, gender) and returns it as a
 * `PatientClinicalContext` with explicit `dataGaps` for anything that could
 * not be read. Fail-closed: a load failure is never treated as "no allergies".
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PatientClinicalContext } from './types';
import { loadPatientClinicalRecord } from './adapters/SupabaseAdapters';
import { medicationsFromRecord, normalizeAllergyList } from './core/orderIntent';

export interface UsePatientClinicalContextOptions {
  readonly patientId?: string | null;
  readonly enabled?: boolean;
  /** Pharmacist review: do not screen the prescription against its own items. */
  readonly excludePrescriptionId?: string;
  /** Current weight in kg, only when the unit is known to be kg. */
  readonly weightKg?: number;
  readonly isPregnant?: boolean;
  readonly isBreastfeeding?: boolean;
  /** Allergies captured during this encounter and not yet saved to the record. */
  readonly additionalAllergies?: unknown;
  /** Home medications captured during this encounter and not yet saved. */
  readonly additionalMedications?: unknown;
}

export interface UsePatientClinicalContextReturn {
  /** null while loading, or when the patient record could not be loaded at all. */
  readonly context: PatientClinicalContext | null;
  readonly isLoading: boolean;
  /** Set when the patient record itself could not be loaded (screening impossible). */
  readonly loadError: string | null;
  readonly refetch: () => void;
}

export function usePatientClinicalContext(
  options: UsePatientClinicalContextOptions
): UsePatientClinicalContextReturn {
  const { patientId, enabled = true, excludePrescriptionId } = options;

  const query = useQuery({
    queryKey: ['order-safety', 'patient-context', patientId, excludePrescriptionId ?? null],
    enabled: enabled && !!patientId,
    // Safety data must be fresh for every ordering session.
    staleTime: 0,
    gcTime: 60_000,
    retry: 1,
    queryFn: () => loadPatientClinicalRecord(patientId as string, { excludePrescriptionId }),
  });

  const extraAllergiesKey = JSON.stringify(options.additionalAllergies ?? null);
  const extraMedsKey = JSON.stringify(options.additionalMedications ?? null);

  const context = useMemo<PatientClinicalContext | null>(() => {
    const record = query.data;
    if (!record) return null;
    const extraAllergies = normalizeAllergyList(options.additionalAllergies);
    const allergies = [
      ...new Map(
        [...record.allergies, ...extraAllergies.allergies].map((a) => [a.toLowerCase(), a])
      ).values(),
    ];
    const meds = [
      ...record.homeMedications,
      ...record.activePrescriptionMedications,
      ...medicationsFromRecord(options.additionalMedications),
    ];
    const activeMedications = [...new Map(meds.map((m) => [m.drugName.toLowerCase(), m])).values()];
    return {
      patientId: record.patientId,
      hospitalId: record.hospitalId,
      // Unknown age: screen as an adult; the missing date of birth is a data gap.
      ageYears: record.ageYears ?? 99,
      ...(record.ageMonths !== undefined ? { ageMonths: record.ageMonths } : {}),
      ...(record.gender ? { gender: record.gender } : {}),
      ...(options.weightKg && options.weightKg > 0 ? { weightKg: options.weightKg } : {}),
      ...(options.isPregnant ? { isPregnant: true } : {}),
      ...(options.isBreastfeeding ? { isBreastfeeding: true } : {}),
      allergies,
      allergyStatusUnknown: record.allergyStatusUnknown && !extraAllergies.recorded,
      activeMedications,
      dataGaps: record.gaps,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, extraAllergiesKey, extraMedsKey, options.weightKg, options.isPregnant, options.isBreastfeeding]);

  const loadError =
    query.isError || (query.isSuccess && !query.data)
      ? 'Patient safety data (allergies, medications) could not be loaded.'
      : null;

  return {
    context,
    isLoading: !!patientId && enabled && query.isLoading,
    loadError,
    refetch: () => {
      void query.refetch();
    },
  };
}
