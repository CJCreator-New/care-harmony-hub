/**
 * Offline Store Module (`offline-store`)
 *
 * ADR-0013: which writes may queue offline, and which must fail closed.
 *
 * Low-risk bedside documentation (vitals, nursing notes) is durable through
 * IndexedDB and replayed on reconnect. High-risk actions that depend on live
 * clinical-safety validation (dispensing, STAT floor-stock overrides,
 * discharge release, billing finalization) are blocked while offline.
 */

/** Whitelisted writes that may be captured offline and replayed. */
export const OFFLINE_QUEUE_ALLOWED_TABLES = [
  'vital_signs',
  'nursing_notes',
  'consultations',
] as const;

export type OfflineQueueAllowedTable = (typeof OFFLINE_QUEUE_ALLOWED_TABLES)[number];

/** Legacy callers queued vitals under a table alias that does not exist. */
const TABLE_ALIASES: Record<string, OfflineQueueAllowedTable> = {
  vitals: 'vital_signs',
};

export function normalizeOfflineTable(table: string): string {
  return TABLE_ALIASES[table] ?? table;
}

export function isOfflineReplayAllowed(table: string): boolean {
  return (OFFLINE_QUEUE_ALLOWED_TABLES as readonly string[]).includes(normalizeOfflineTable(table));
}

const CRITICAL_OFFLINE_ACTIONS = {
  'medication:dispense': 'Medication dispensing',
  'floor_stock:stat_override': 'STAT floor stock override',
  'discharge:complete': 'Patient discharge release',
  'billing:finalize': 'Billing finalization',
} as const;

export type CriticalOfflineAction = keyof typeof CRITICAL_OFFLINE_ACTIONS;

export class OfflineActionBlockedError extends Error {
  readonly code = 'OFFLINE_ACTION_BLOCKED';
  readonly action: CriticalOfflineAction;

  constructor(action: CriticalOfflineAction) {
    super(
      `${CRITICAL_OFFLINE_ACTIONS[action]} requires a network connection for critical clinical safety validation.`
    );
    this.name = 'OfflineActionBlockedError';
    this.action = action;
  }
}

/**
 * Fail-closed gate for critical actions. Throws `OfflineActionBlockedError`
 * when the device is offline so callers can surface the blocking dialog.
 */
export function assertOnlineForCriticalAction(
  action: CriticalOfflineAction,
  isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true
): void {
  if (!isOnline) throw new OfflineActionBlockedError(action);
}
