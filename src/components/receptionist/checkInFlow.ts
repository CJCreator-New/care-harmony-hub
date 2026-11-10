/**
 * Patient check-in wizard: explicit state machine.
 *
 * Previously the wizard's transitions were implicit: `setStep` calls were
 * scattered through the modal and the Back button did index arithmetic on a
 * local array. This module is the single source of truth for which steps
 * exist and which moves are allowed. The UI consults it; it has no React or
 * I/O dependencies, so it can be tested and read on its own.
 *
 *   search ──► verify ──► insurance ──► copay ──► complete
 *     │                                              ▲
 *     └──────────── express check-in ────────────────┘
 *
 * `complete` is terminal for navigation. The modal returns to `search` only
 * through `INITIAL_CHECK_IN_STEP` when it closes (a reset, not a transition).
 */

import { canMove, move } from './wizardFlow';

export type CheckInStep = 'search' | 'verify' | 'insurance' | 'copay' | 'complete';

/** Steps shown in the progress indicator, in order. */
export const CHECK_IN_PROGRESS_STEPS = ['search', 'verify', 'insurance', 'copay'] as const;

export const INITIAL_CHECK_IN_STEP: CheckInStep = 'search';

/** Allowed forward/backward moves. Anything not listed is rejected. */
export const CHECK_IN_TRANSITIONS: Readonly<Record<CheckInStep, readonly CheckInStep[]>> = {
  search: ['verify', 'complete'], // 'complete' = express check-in
  verify: ['search', 'insurance'],
  insurance: ['verify', 'copay'],
  copay: ['insurance', 'complete'],
  complete: [],
};

/** Target of the Back button. Steps absent here have no Back action. */
export const CHECK_IN_BACK_TARGET: Readonly<Partial<Record<CheckInStep, CheckInStep>>> = {
  verify: 'search',
  insurance: 'verify',
  copay: 'insurance',
};

export function canTransition(from: CheckInStep, to: CheckInStep): boolean {
  return canMove(CHECK_IN_TRANSITIONS, from, to);
}

/**
 * Returns `to` if the move is allowed, otherwise stays on `from`.
 * Rejecting an illegal move keeps the wizard on a valid screen.
 */
export function transition(from: CheckInStep, to: CheckInStep): CheckInStep {
  return move(CHECK_IN_TRANSITIONS, from, to);
}

/** Step the Back button returns to, or `null` when Back is not offered. */
export function backTarget(step: CheckInStep): CheckInStep | null {
  return CHECK_IN_BACK_TARGET[step] ?? null;
}
