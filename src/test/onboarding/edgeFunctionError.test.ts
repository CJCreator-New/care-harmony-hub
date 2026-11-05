import { describe, it, expect } from 'vitest';
import { getEdgeFunctionErrorMessage } from '@/lib/onboarding/edgeFunctionError';
import {
  isHospitalSignupInFlight,
  setHospitalSignupInFlight,
} from '@/lib/onboarding/hospitalSignupInFlight';

// Mirrors supabase-js FunctionsHttpError: a generic message with the HTTP
// response on `context`.
function httpError(response: Response) {
  const error = new Error('Edge Function returned a non-2xx status code') as Error & {
    context: Response;
  };
  error.name = 'FunctionsHttpError';
  error.context = response;
  return error;
}

describe('getEdgeFunctionErrorMessage (FUNC-03 / EDGE-24)', () => {
  it('returns the server error text from a 409 body instead of the generic message', async () => {
    const error = httpError(
      new Response(
        JSON.stringify({ error: 'This account already belongs to a hospital. Ask an administrator for access.' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      )
    );

    await expect(getEdgeFunctionErrorMessage(error, 'fallback')).resolves.toBe(
      'This account already belongs to a hospital. Ask an administrator for access.'
    );
  });

  it('falls back to the error message when the body is not JSON', async () => {
    const error = httpError(new Response('<html>502</html>', { status: 502 }));

    await expect(getEdgeFunctionErrorMessage(error, 'fallback')).resolves.toBe(
      'Edge Function returned a non-2xx status code'
    );
  });

  it('uses the error message for errors without an HTTP response (network failures)', async () => {
    await expect(
      getEdgeFunctionErrorMessage(new Error('Failed to fetch'), 'fallback')
    ).resolves.toBe('Failed to fetch');
  });

  it('uses the fallback for non-Error values with no body', async () => {
    await expect(getEdgeFunctionErrorMessage({}, 'fallback')).resolves.toBe('fallback');
  });
});

describe('hospitalSignupInFlight (FUNC-03 PublicRoute race)', () => {
  it('tracks whether a hospital sign-up submit is running', () => {
    expect(isHospitalSignupInFlight()).toBe(false);
    setHospitalSignupInFlight(true);
    expect(isHospitalSignupInFlight()).toBe(true);
    setHospitalSignupInFlight(false);
    expect(isHospitalSignupInFlight()).toBe(false);
  });
});
