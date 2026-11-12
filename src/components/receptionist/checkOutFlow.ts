/**
 * Patient check-out wizard: explicit state machine.
 *
 *   summary ──► billing ──► payment ──► followup ──► complete
 *
 * Back steps one screen backwards. `complete` is terminal for navigation. The
 * modal returns to `summary` on close, and when a new patient is picked; both
 * are resets (INITIAL_CHECK_OUT_STEP), not transitions.
 */

import { canMove, move } from './wizardFlow';

export type CheckOutStep = 'summary' | 'billing' | 'payment' | 'followup' | 'complete';

/** Steps shown in the progress indicator, in order. */
export const CHECK_OUT_PROGRESS_STEPS = ['summary', 'billing', 'payment', 'followup'] as const;

export const INITIAL_CHECK_OUT_STEP: CheckOutStep = 'summary';

/** Allowed forward/backward moves. Anything not listed is rejected. */
export const CHECK_OUT_TRANSITIONS: Readonly<Record<CheckOutStep, readonly CheckOutStep[]>> = {
  summary: ['billing'],
  billing: ['summary', 'payment'],
  payment: ['billing', 'followup'],
  followup: ['payment', 'complete'],
  complete: [],
};

/** Target of the Back button. Steps absent here have no Back action. */
export const CHECK_OUT_BACK_TARGET: Readonly<Partial<Record<CheckOutStep, CheckOutStep>>> = {
  billing: 'summary',
  payment: 'billing',
  followup: 'payment',
};

export function canTransition(from: CheckOutStep, to: CheckOutStep): boolean {
  return canMove(CHECK_OUT_TRANSITIONS, from, to);
}

/** Returns `to` if the move is allowed, otherwise stays on `from`. */
export function transition(from: CheckOutStep, to: CheckOutStep): CheckOutStep {
  return move(CHECK_OUT_TRANSITIONS, from, to);
}

/** Step the Back button returns to, or `null` when Back is not offered. */
export function backTarget(step: CheckOutStep): CheckOutStep | null {
  return CHECK_OUT_BACK_TARGET[step] ?? null;
}
