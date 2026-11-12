/**
 * Double-administration guard for the nurse eMAR (audit CLIN-13).
 *
 * The scheduled list has no dose instances, so after a dose is given the same
 * line stayed "Administer"-able and could be given again at once. These rules
 * derive the next due time from the prescribed frequency and block a second
 * administration until it has passed.
 */

import { getDosesPerDay } from '@/modules/order-safety';

const HOURS_PER_DAY = 24;

/** Statuses that mean the dose was actually given (DB vocabulary: given; UI vocabulary: administered). */
const GIVEN_STATUSES = new Set(['administered', 'given']);

/**
 * Hours between doses for a prescribed frequency. A frequency that cannot be
 * read is treated as once daily, the longest interval, so it cannot prompt an
 * early second dose.
 */
export function doseIntervalHours(frequency: string | null | undefined): number {
  const doses = frequency ? getDosesPerDay(frequency, 0) : 0;
  return doses > 0 ? HOURS_PER_DAY / doses : HOURS_PER_DAY;
}

export interface AdministrationRecordLike {
  readonly prescription_id?: string | null;
  readonly medication_name?: string | null;
  readonly status?: string | null;
  readonly administered_at?: string | null;
}

export interface DoseBlock {
  readonly blocked: boolean;
  readonly lastGivenAt: Date | null;
  readonly nextDueAt: Date | null;
}

/**
 * Whether a line may be administered now. A line is blocked when a given dose
 * for the same prescription and drug is still inside the dose interval.
 */
export function administrationBlock(params: {
  administrations: readonly AdministrationRecordLike[];
  prescriptionId: string;
  medicationName: string;
  frequency: string | null | undefined;
  now: Date;
}): DoseBlock {
  const drug = params.medicationName.trim().toLowerCase();
  let lastGivenAt: Date | null = null;
  for (const admin of params.administrations) {
    if (admin.prescription_id !== params.prescriptionId) continue;
    if (!admin.status || !GIVEN_STATUSES.has(admin.status)) continue;
    if ((admin.medication_name ?? '').trim().toLowerCase() !== drug) continue;
    const at = admin.administered_at ? new Date(admin.administered_at) : null;
    if (!at || Number.isNaN(at.getTime())) continue;
    if (!lastGivenAt || at > lastGivenAt) lastGivenAt = at;
  }
  if (!lastGivenAt) return { blocked: false, lastGivenAt: null, nextDueAt: null };

  const nextDueAt = new Date(lastGivenAt.getTime() + doseIntervalHours(params.frequency) * 60 * 60 * 1000);
  return { blocked: params.now < nextDueAt, lastGivenAt, nextDueAt };
}

/** True when two instants fall on the same calendar day in the user's local time zone. */
export function isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
