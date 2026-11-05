import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

type AuthCallback = (event: string, session: unknown) => void;

const mocks = vi.hoisted(() => {
  const state: { authCallback: ((event: string, session: unknown) => void) | null } = {
    authCallback: null,
  };
  const session = {
    access_token: 'a',
    refresh_token: 'r',
    user: { id: 'user-1', email: 'doctor@example.test' },
  };
  const chain: Record<string, unknown> = {};
  ['select', 'eq', 'order', 'limit'].forEach((method) => {
    chain[method] = () => chain;
  });
  chain.maybeSingle = () => Promise.resolve({ data: null, error: null });
  chain.single = () => Promise.resolve({ data: null, error: null });
  chain.then = (resolve: (value: unknown) => unknown) => resolve({ data: [], error: null });

  return {
    state,
    session,
    purgeClientState: vi.fn(() => Promise.resolve({})),
    signOut: vi.fn(),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    from: vi.fn(() => chain),
  };
});

vi.mock('@/lib/security/purgeClientState', () => ({
  purgeClientState: mocks.purgeClientState,
}));

vi.mock('@/lib/monitoring/sentry', () => ({
  setUser: vi.fn(),
  clearUser: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (callback: AuthCallback) => {
        mocks.state.authCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      getSession: () => Promise.resolve({ data: { session: mocks.session } }),
      signOut: mocks.signOut,
    },
    rpc: mocks.rpc,
    from: mocks.from,
  },
}));

import { AuthProvider, useAuth } from '@/contexts/AuthContext';

function Probe() {
  const { isAuthenticated, logout } = useAuth();
  return (
    <div>
      <span data-testid="auth-state">{isAuthenticated ? 'in' : 'out'}</span>
      <button type="button" onClick={() => void logout()}>
        logout
      </button>
    </div>
  );
}

async function renderSignedIn() {
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await waitFor(() => expect(screen.getByTestId('auth-state')).toHaveTextContent('in'));
}

describe('AuthContext logout (SECF-05)', () => {
  beforeEach(() => {
    // Exercise the real Supabase path, not the E2E mock-auth shortcut.
    vi.stubEnv('VITE_E2E_MOCK_AUTH', 'false');
    mocks.purgeClientState.mockClear();
    mocks.signOut.mockReset();
    mocks.rpc.mockClear();
    mocks.state.authCallback = null;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('signs out globally and purges client state', async () => {
    mocks.signOut.mockResolvedValue({ error: null });
    await renderSignedIn();

    await userEvent.click(screen.getByRole('button', { name: 'logout' }));

    await waitFor(() => expect(mocks.purgeClientState).toHaveBeenCalled());
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(mocks.signOut).toHaveBeenCalledWith();
    expect(screen.getByTestId('auth-state')).toHaveTextContent('out');
  });

  it('falls back to a local sign-out when the global sign-out returns an error', async () => {
    mocks.signOut
      .mockResolvedValueOnce({ error: new Error('Failed to fetch') })
      .mockResolvedValueOnce({ error: null });
    await renderSignedIn();

    await userEvent.click(screen.getByRole('button', { name: 'logout' }));

    await waitFor(() => expect(mocks.purgeClientState).toHaveBeenCalled());
    expect(mocks.signOut).toHaveBeenNthCalledWith(2, { scope: 'local' });
    expect(screen.getByTestId('auth-state')).toHaveTextContent('out');
  });

  it('still purges when sign-out and the audit RPC both throw', async () => {
    mocks.rpc.mockRejectedValueOnce(new Error('offline'));
    mocks.signOut.mockRejectedValue(new Error('offline'));
    await renderSignedIn();

    await userEvent.click(screen.getByRole('button', { name: 'logout' }));

    await waitFor(() => expect(mocks.purgeClientState).toHaveBeenCalled());
    expect(mocks.signOut).toHaveBeenNthCalledWith(2, { scope: 'local' });
    expect(screen.getByTestId('auth-state')).toHaveTextContent('out');
  });

  it('purges client state when Supabase emits SIGNED_OUT', async () => {
    await renderSignedIn();
    expect(mocks.state.authCallback).not.toBeNull();

    await act(async () => {
      mocks.state.authCallback?.('SIGNED_OUT', null);
    });

    expect(mocks.purgeClientState).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByTestId('auth-state')).toHaveTextContent('out'));
  });

  it('does not purge on other auth events', async () => {
    await renderSignedIn();

    await act(async () => {
      mocks.state.authCallback?.('TOKEN_REFRESHED', mocks.session);
    });

    expect(mocks.purgeClientState).not.toHaveBeenCalled();
  });
});
