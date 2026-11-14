import { describe, expect, it } from 'vitest';
import { resolveBookingModeration } from '@/lib/appointments/bookingModeration';

describe('ADR-0015 booking moderation', () => {
  it('routes unverified portal patients to front-desk moderation', () => {
    expect(resolveBookingModeration(false)).toEqual({
      status: 'pending_confirmation',
      verificationTier: 'tier1',
    });
    expect(resolveBookingModeration(null)).toEqual({
      status: 'pending_confirmation',
      verificationTier: 'tier1',
    });
  });

  it('lets identity-verified patients book normally', () => {
    expect(resolveBookingModeration(true)).toEqual({
      status: 'pending',
      verificationTier: 'tier2',
    });
  });
});
