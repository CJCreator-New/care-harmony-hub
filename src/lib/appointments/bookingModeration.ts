/**
 * ADR-0015: unverified (Tier-1) portal patients cannot self-confirm a slot.
 * Their requests enter front-desk moderation as `pending_confirmation`.
 */
export interface BookingModerationDecision {
  status: 'pending' | 'pending_confirmation';
  verificationTier: 'tier1' | 'tier2';
}

export function resolveBookingModeration(
  isIdentityVerified: boolean | null | undefined
): BookingModerationDecision {
  return isIdentityVerified === true
    ? { status: 'pending', verificationTier: 'tier2' }
    : { status: 'pending_confirmation', verificationTier: 'tier1' };
}
