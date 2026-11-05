/**
 * Interim critical-result safeguard (roadmap S0-08, day-1 measure).
 *
 * The server-side escalation ladder (critical-lab-check + lab_critical_alerts)
 * does not work end to end (audit EDGE-03 / CLIN-10). Until it does, every
 * clinical dashboard shows a persistent alert for each critical lab result whose
 * closed-loop read-back has not been recorded. Visibility widens with time to
 * mirror the ADR-0005 ladder, so an unanswered result cannot stay invisible:
 *
 *   0 min   ordering clinician + laboratory + admins       ("primary")
 *   5 min   + every doctor and nurse in the hospital       ("on_call")
 *  10 min   same audience, ED escalation instructions     ("ed")
 *
 * The data source is lab_orders (is_critical + results.acknowledgment), which
 * the laboratory screen already writes, so this works without the broken
 * escalation tables. The only thing that clears an alert is the recorded
 * read-back; a clinician's "receipt" hides it for that clinician only.
 */

export type SafeguardStage = 'primary' | 'on_call' | 'ed';

export interface CriticalLabOrderLike {
  readonly id: string;
  readonly is_critical?: boolean | null;
  readonly status?: string | null;
  readonly ordered_by?: string | null;
  readonly completed_at?: string | null;
  readonly critical_notified_at?: string | null;
  readonly updated_at?: string | null;
  readonly results?: unknown;
}

export interface SafeguardViewer {
  /** profiles.id of the viewer (lab_orders.ordered_by references profiles.id). */
  readonly profileId?: string | null;
  readonly roles: readonly string[];
}

export interface SafeguardAlert<T extends CriticalLabOrderLike = CriticalLabOrderLike> {
  readonly order: T;
  readonly stage: SafeguardStage;
  readonly minutesOpen: number;
  readonly isOrderingClinician: boolean;
}

export const ON_CALL_AFTER_MIN = 5;
export const ED_AFTER_MIN = 10;

const LAB_AND_ADMIN = ['lab_technician', 'admin'];
const WIDE_AUDIENCE = ['doctor', 'nurse'];

export function readBackRecorded(results: unknown): boolean {
  if (!results || typeof results !== 'object') return false;
  const ack = (results as Record<string, unknown>).acknowledgment;
  return !!ack && typeof ack === 'object' && (ack as Record<string, unknown>).verbalReadBackConfirmed === true;
}

/** When the clock started: the critical flag time, else completion, else last update. */
export function criticalSince(order: CriticalLabOrderLike): number | null {
  for (const v of [order.critical_notified_at, order.completed_at, order.updated_at]) {
    if (v) {
      const t = new Date(v).getTime();
      if (Number.isFinite(t)) return t;
    }
  }
  return null;
}

export function stageFor(minutesOpen: number): SafeguardStage {
  if (minutesOpen >= ED_AFTER_MIN) return 'ed';
  if (minutesOpen >= ON_CALL_AFTER_MIN) return 'on_call';
  return 'primary';
}

/**
 * Returns the alerts this viewer must see, oldest first. An order with no usable
 * timestamp is treated as already overdue (fail closed).
 */
export function selectSafeguardAlerts<T extends CriticalLabOrderLike>(
  orders: readonly T[],
  viewer: SafeguardViewer,
  now: number,
  receiptsByViewer: ReadonlySet<string> = new Set()
): SafeguardAlert<T>[] {
  const roles = viewer.roles.map((r) => r.toLowerCase());
  const isLabOrAdmin = roles.some((r) => LAB_AND_ADMIN.includes(r));
  const isWide = roles.some((r) => WIDE_AUDIENCE.includes(r));

  const out: SafeguardAlert<T>[] = [];
  for (const order of orders) {
    if (!order.is_critical) continue;
    if ((order.status ?? '').toLowerCase() === 'cancelled') continue;
    if (readBackRecorded(order.results)) continue;

    const since = criticalSince(order);
    const minutesOpen = since === null ? ED_AFTER_MIN : Math.max(0, Math.floor((now - since) / 60000));
    const stage = stageFor(minutesOpen);
    const isOrderingClinician = !!viewer.profileId && order.ordered_by === viewer.profileId;

    const visible = isLabOrAdmin || isOrderingClinician || (isWide && stage !== 'primary');
    if (!visible) continue;
    // A clinician's receipt hides the alert for them; the lab and admins keep
    // seeing it until the read-back is recorded.
    if (!isLabOrAdmin && receiptsByViewer.has(order.id)) continue;

    out.push({ order, stage, minutesOpen, isOrderingClinician });
  }
  return out.sort((a, b) => b.minutesOpen - a.minutesOpen);
}

export function stageInstruction(stage: SafeguardStage, isLabOrAdmin: boolean): string {
  if (isLabOrAdmin) {
    switch (stage) {
      case 'primary':
        return 'Phone the ordering clinician now and record the read-back.';
      case 'on_call':
        return 'Ordering clinician not confirmed after 5 minutes: phone the on-call doctor (SOP step 2, docs/operations/CRITICAL_RESULT_ESCALATION_SOP.md).';
      case 'ed':
        return 'No read-back after 10 minutes: phone the Emergency Department lead (SOP step 3).';
    }
  }
  switch (stage) {
    case 'primary':
      return 'Critical result for your patient. Review it and expect a call from the laboratory.';
    case 'on_call':
      return 'Not yet confirmed by the ordering clinician. If you are on call, review the patient and phone the laboratory.';
    case 'ed':
      return 'Unconfirmed for over 10 minutes. On-call / ED: review the patient now and phone the laboratory.';
  }
}
