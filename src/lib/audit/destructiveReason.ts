/**
 * Minimum length for an audit reason on an irreversible action. Matches the order-safety
 * override rule (`overrideReason.trim().length >= 10` in src/modules/order-safety).
 */
export const MIN_REASON_LENGTH = 10;

export function isValidDestructiveReason(reason: string): boolean {
  return reason.trim().length >= MIN_REASON_LENGTH;
}
