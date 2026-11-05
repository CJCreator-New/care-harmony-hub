import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStaffInvitations } from '@/hooks/useStaffInvitations';

const mockInvoke = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'profile-admin', hospital_id: 'hospital-1' },
  }),
}));

/** Chainable query builder; terminal calls resolve like PostgREST. */
function makeBuilder(terminal: { maybeSingle?: unknown; single?: unknown } = {}) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'neq', 'in', 'insert', 'update', 'order']) {
    builder[method] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn().mockResolvedValue(
    terminal.maybeSingle ?? { data: null, error: null }
  );
  builder.single = vi.fn().mockResolvedValue(
    terminal.single ?? { data: { id: 'invite-new', token: 'token-new' }, error: null }
  );
  return builder as Record<string, ReturnType<typeof vi.fn>>;
}

describe('useStaffInvitations.acceptInvitation (FUNC-21)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends the body accept-invitation-signup expects (token, password, firstName, lastName)', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, requires_login: true, user_id: 'user-1' },
      error: null,
    });

    const { result } = renderHook(() => useStaffInvitations());

    let outcome: Awaited<ReturnType<typeof result.current.acceptInvitation>> | undefined;
    await act(async () => {
      outcome = await result.current.acceptInvitation({
        token: 'token-123',
        password: 'StrongP@ss1',
        firstName: 'Alex',
        lastName: 'Rivers',
      });
    });

    expect(mockInvoke).toHaveBeenCalledWith('accept-invitation-signup', {
      body: {
        token: 'token-123',
        password: 'StrongP@ss1',
        firstName: 'Alex',
        lastName: 'Rivers',
      },
    });
    // The old contract sent a userId, which the server's zod schema rejects.
    const sentBody = (mockInvoke.mock.calls[0][1] as { body: Record<string, unknown> }).body;
    expect(sentBody).not.toHaveProperty('userId');
    expect(outcome?.error).toBeNull();
    expect(outcome?.data).toMatchObject({ success: true, user_id: 'user-1' });
  });

  it('returns the server error text when the function responds with a non-2xx status', async () => {
    // supabase-js resolves with { error } for HTTP errors; the body is on error.context.
    mockInvoke.mockResolvedValue({
      data: null,
      error: Object.assign(new Error('Edge Function returned a non-2xx status code'), {
        context: new Response(JSON.stringify({ error: 'Too many attempts. Please try again later.' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }),
      }),
    });

    const { result } = renderHook(() => useStaffInvitations());

    let outcome: Awaited<ReturnType<typeof result.current.acceptInvitation>> | undefined;
    await act(async () => {
      outcome = await result.current.acceptInvitation({
        token: 'token-123',
        password: 'StrongP@ss1',
        firstName: 'Alex',
        lastName: 'Rivers',
      });
    });

    expect(outcome?.error).toBe('Too many attempts. Please try again later.');
  });

  it('reports a failure body with success false as an error', async () => {
    mockInvoke.mockResolvedValue({ data: { error: 'Unable to accept invitation' }, error: null });

    const { result } = renderHook(() => useStaffInvitations());

    let outcome: Awaited<ReturnType<typeof result.current.acceptInvitation>> | undefined;
    await act(async () => {
      outcome = await result.current.acceptInvitation({
        token: 'token-123',
        password: 'StrongP@ss1',
        firstName: 'Alex',
        lastName: 'Rivers',
      });
    });

    expect(outcome?.error).toBe('Unable to accept invitation');
  });
});

describe('useStaffInvitations.createInvitation (FUNC-21)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // .env.test enables the E2E mock path; these tests exercise the real insert.
    vi.stubEnv('VITE_E2E_MOCK_AUTH', 'false');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    localStorage.clear();
  });

  it('records invited_by as the inviter profile id, not the auth user id', async () => {
    const builder = makeBuilder();
    mockFrom.mockReturnValue(builder);

    const { result } = renderHook(() => useStaffInvitations());

    await act(async () => {
      await result.current.createInvitation({ email: 'Nurse@Hospital.test', role: 'nurse' });
    });

    expect(builder.insert).toHaveBeenCalledWith({
      hospital_id: 'hospital-1',
      email: 'nurse@hospital.test',
      role: 'nurse',
      invited_by: 'profile-admin',
    });
  });

  it('ignores the E2E mock bypass in production builds (no fake success without a DB row)', async () => {
    vi.stubEnv('PROD', true);
    localStorage.setItem('e2e-mock-auth-user', '{"id":"stray"}');
    const builder = makeBuilder();
    mockFrom.mockReturnValue(builder);

    const { result } = renderHook(() => useStaffInvitations());

    let outcome: Awaited<ReturnType<typeof result.current.createInvitation>> | undefined;
    await act(async () => {
      outcome = await result.current.createInvitation({ email: 'nurse@hospital.test', role: 'nurse' });
    });

    expect(builder.insert).toHaveBeenCalled();
    expect(outcome?.data).toMatchObject({ id: 'invite-new' });
    expect(outcome?.data).not.toMatchObject({ id: 'mock-invitation-id' });
  });

  it('keeps the E2E mock bypass outside production builds', async () => {
    vi.stubEnv('PROD', false);
    localStorage.setItem('e2e-mock-auth-user', '{"id":"e2e"}');
    const builder = makeBuilder();
    mockFrom.mockReturnValue(builder);

    const { result } = renderHook(() => useStaffInvitations());

    let outcome: Awaited<ReturnType<typeof result.current.createInvitation>> | undefined;
    await act(async () => {
      outcome = await result.current.createInvitation({ email: 'nurse@hospital.test', role: 'nurse' });
    });

    expect(builder.insert).not.toHaveBeenCalled();
    expect(outcome?.data).toMatchObject({ id: 'mock-invitation-id' });
  });
});
