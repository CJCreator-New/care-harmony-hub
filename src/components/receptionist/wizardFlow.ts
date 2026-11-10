/**
 * Shared helpers for receptionist wizards (check-in, check-out).
 *
 * A wizard is a transition table: for each step, the list of steps it may move to.
 * Pure functions only, so each wizard's flow module stays free of React.
 */

export type WizardTransitions<T extends string> = Readonly<Record<T, readonly T[]>>;

/** Same-step moves are always allowed, so repeated sets are harmless. */
export function canMove<T extends string>(table: WizardTransitions<T>, from: T, to: T): boolean {
  return from === to || table[from].includes(to);
}

/** Returns `to` when the move is legal, otherwise keeps `from`. */
export function move<T extends string>(table: WizardTransitions<T>, from: T, to: T): T {
  return canMove(table, from, to) ? to : from;
}
