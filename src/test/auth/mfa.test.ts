import { describe, expect, it, vi, beforeEach } from 'vitest';

const mfa = {
  getAuthenticatorAssuranceLevel: vi.fn(),
  listFactors: vi.fn(),
  enroll: vi.fn(),
  challenge: vi.fn(),
  verify: vi.fn(),
  unenroll: vi.fn(),
};
const invoke = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { mfa }, functions: { invoke } },
}));

const {
  fetchMfaAssurance,
  startTotpEnrollment,
  confirmTotpEnrollment,
  verifyTotpCode,
  redeemBackupCode,
} = await import('@/lib/auth/mfa');

const verifiedTotp = { id: 'f-verified', factor_type: 'totp', status: 'verified' };
const unverifiedTotp = { id: 'f-pending', factor_type: 'totp', status: 'unverified' };

beforeEach(() => {
  Object.values(mfa).forEach((fn) => fn.mockReset());
  invoke.mockReset();
});

describe('fetchMfaAssurance (fail closed)', () => {
  it('returns the aal and the verified TOTP factor', async () => {
    mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: 'aal1', nextLevel: 'aal2' },
      error: null,
    });
    mfa.listFactors.mockResolvedValue({
      data: { all: [verifiedTotp, unverifiedTotp], totp: [verifiedTotp], phone: [] },
      error: null,
    });
    await expect(fetchMfaAssurance()).resolves.toEqual({
      status: 'ready',
      currentLevel: 'aal1',
      verifiedTotpFactorId: 'f-verified',
    });
  });

  it('does not count an unverified factor', async () => {
    mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: 'aal1', nextLevel: 'aal1' },
      error: null,
    });
    mfa.listFactors.mockResolvedValue({
      data: { all: [unverifiedTotp], totp: [], phone: [] },
      error: null,
    });
    const result = await fetchMfaAssurance();
    expect(result).toMatchObject({ status: 'ready', verifiedTotpFactorId: null });
  });

  it('is an error when the assurance level lookup fails', async () => {
    mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: null, error: new Error('x') });
    expect((await fetchMfaAssurance()).status).toBe('error');
  });

  it('is an error when listing factors fails', async () => {
    mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: 'aal1', nextLevel: 'aal1' },
      error: null,
    });
    mfa.listFactors.mockResolvedValue({ data: null, error: new Error('offline') });
    expect((await fetchMfaAssurance()).status).toBe('error');
  });

  it('is an error when the client throws', async () => {
    mfa.getAuthenticatorAssuranceLevel.mockRejectedValue(new Error('boom'));
    expect((await fetchMfaAssurance()).status).toBe('error');
  });
});

describe('enrolment', () => {
  it('removes unverified TOTP factors before enrolling a new one', async () => {
    mfa.listFactors.mockResolvedValue({
      data: { all: [verifiedTotp, unverifiedTotp], totp: [verifiedTotp], phone: [] },
      error: null,
    });
    mfa.unenroll.mockResolvedValue({ data: {}, error: null });
    mfa.enroll.mockResolvedValue({
      data: { id: 'f-new', type: 'totp', totp: { qr_code: 'data:qr', secret: 'SECRET', uri: 'otpauth://' } },
      error: null,
    });

    await expect(startTotpEnrollment()).resolves.toEqual({
      factorId: 'f-new',
      qrCode: 'data:qr',
      secret: 'SECRET',
    });
    expect(mfa.unenroll).toHaveBeenCalledTimes(1);
    expect(mfa.unenroll).toHaveBeenCalledWith({ factorId: 'f-pending' });
    expect(mfa.enroll).toHaveBeenCalledWith(expect.objectContaining({ factorType: 'totp' }));
  });

  it('counts only after challenge + verify succeed', async () => {
    mfa.challenge.mockResolvedValue({ data: { id: 'ch-1' }, error: null });
    mfa.verify.mockResolvedValue({ data: {}, error: null });
    await confirmTotpEnrollment('f-new', '123 456');
    expect(mfa.challenge).toHaveBeenCalledWith({ factorId: 'f-new' });
    expect(mfa.verify).toHaveBeenCalledWith({ factorId: 'f-new', challengeId: 'ch-1', code: '123456' });
  });

  it('rejects a wrong code', async () => {
    mfa.challenge.mockResolvedValue({ data: { id: 'ch-1' }, error: null });
    mfa.verify.mockResolvedValue({ data: null, error: new Error('Invalid TOTP code entered') });
    await expect(verifyTotpCode('f', '000000')).rejects.toThrow('Invalid TOTP code entered');
  });

  it('does not call the server for a malformed code', async () => {
    await expect(verifyTotpCode('f', '12ab')).rejects.toThrow();
    expect(mfa.challenge).not.toHaveBeenCalled();
  });
});

describe('backup-code recovery', () => {
  it('calls verify-backup-code with { code } and trusts only success === true', async () => {
    invoke.mockResolvedValue({ data: { success: true }, error: null });
    await expect(redeemBackupCode(' ABCD EFGH ')).resolves.toBe(true);
    expect(invoke).toHaveBeenCalledWith('verify-backup-code', { body: { code: 'ABCDEFGH' } });
  });

  it.each([
    [{ data: { success: false }, error: null }],
    [{ data: { success: 'true' }, error: null }],
    [{ data: null, error: new Error('401') }],
  ])('returns false for %j', async (response) => {
    invoke.mockResolvedValue(response);
    await expect(redeemBackupCode('CODE')).resolves.toBe(false);
  });

  it('returns false when the call throws', async () => {
    invoke.mockRejectedValue(new Error('network'));
    await expect(redeemBackupCode('CODE')).resolves.toBe(false);
  });
});
