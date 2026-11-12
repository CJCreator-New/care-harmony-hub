/**
 * S0-10 / SECF-01 route-table test: every signed-in app route goes through the
 * same guard, and that guard enforces the second factor before rendering.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { UserRole } from '@/types/auth';
import {
  MFA_CHALLENGE_PATH,
  MFA_ENROLL_PATH,
  requiresMandatoryMfa,
  resolveMfaGate,
  type MfaAssurance,
} from '@/lib/auth/mfa';

type AuthState = {
  roles: UserRole[];
  profile: Record<string, unknown>;
};

const state: { auth: AuthState; assurance: MfaAssurance } = {
  auth: { roles: ['doctor'], profile: {} },
  assurance: { status: 'loading' },
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    isProfileReady: true,
    session: { access_token: 'token' },
    user: { id: 'user-1', email: 'u@example.test' },
    profile: {
      id: 'p1',
      user_id: 'user-1',
      hospital_id: 'h1',
      first_name: 'A',
      last_name: 'B',
      email: 'u@example.test',
      ...state.auth.profile,
    },
    hospital: { id: 'h1', name: 'Hospital' },
    roles: state.auth.roles,
    primaryRole: state.auth.roles[0] ?? null,
    pendingRoleSelection: false,
    pendingTwoFactor: false,
    logout: vi.fn(),
  }),
}));

// Real decision logic, fed by the mocked auth state and a controlled lookup result.
vi.mock('@/lib/hooks/auth/useMfaAssurance', () => ({
  useMfaAssurance: () => {
    const mandatory = requiresMandatoryMfa(
      state.auth.profile as { two_factor_required?: boolean },
      state.auth.roles
    );
    return {
      assurance: state.assurance,
      mandatory,
      decision: resolveMfaGate(state.assurance, mandatory),
      refresh: vi.fn(),
    };
  },
}));

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlags: () => ({ isLoading: false, isEnabled: () => true }),
}));

const { protectedRoutes, publicRoutes } = await import('@/routes/routeDefinitions');

// Public-table entries that use the shared guard (everything else there is a
// pre-auth page or one of the MFA/role-selection pages themselves).
const GUARDED_PUBLIC_PATHS = [
  '/dashboard',
  '/profile',
  '/notifications',
  '/hospital/profile-setup',
  '/hospital/role-setup',
];

const guardedRoutes = [
  ...protectedRoutes,
  ...publicRoutes.filter((route) => GUARDED_PUBLIC_PATHS.includes(route.path)),
];

function concretePath(pattern: string) {
  return pattern.replace(/:[^/]+/g, 'test-id');
}

function renderAt(route: { path: string; element: React.ReactNode }) {
  return render(
    <MemoryRouter initialEntries={[concretePath(route.path)]}>
      <Routes>
        <Route path={route.path} element={route.element} />
        <Route path={MFA_ENROLL_PATH} element={<div>ENROLL_PAGE</div>} />
        <Route path={MFA_CHALLENGE_PATH} element={<div>CHALLENGE_PAGE</div>} />
        <Route path="*" element={<div>OTHER_PAGE</div>} />
      </Routes>
    </MemoryRouter>
  );
}

const VERIFIED_AT_AAL1: MfaAssurance = {
  status: 'ready',
  currentLevel: 'aal1',
  verifiedTotpFactorId: 'factor-1',
};
const NO_FACTOR: MfaAssurance = { status: 'ready', currentLevel: 'aal1', verifiedTotpFactorId: null };

describe('MFA route guard covers every protected route (SECF-01)', () => {
  beforeEach(() => {
    state.auth = { roles: ['doctor'], profile: {} };
    state.assurance = { status: 'loading' };
  });
  afterEach(() => cleanup());

  it('guards the full protected route table', () => {
    expect(protectedRoutes.length).toBeGreaterThan(40);
    expect(guardedRoutes.length).toBe(protectedRoutes.length + GUARDED_PUBLIC_PATHS.length);
  });

  describe.each(['admin', 'doctor'] as UserRole[])('%s without a verified factor', (role) => {
    it.each(guardedRoutes.map((r) => [r.path, r] as const))(
      '%s redirects to mandatory enrolment',
      (_path, route) => {
        state.auth = { roles: [role], profile: {} };
        state.assurance = NO_FACTOR;
        renderAt(route);
        expect(screen.getByText('ENROLL_PAGE')).toBeInTheDocument();
      }
    );
  });

  it.each(guardedRoutes.map((r) => [r.path, r] as const))(
    '%s: legacy two_factor_enabled=true does not satisfy the requirement',
    (_path, route) => {
      state.auth = { roles: ['admin'], profile: { two_factor_enabled: true } };
      state.assurance = NO_FACTOR;
      renderAt(route);
      expect(screen.getByText('ENROLL_PAGE')).toBeInTheDocument();
    }
  );

  it.each(guardedRoutes.map((r) => [r.path, r] as const))(
    '%s: server flag two_factor_required forces enrolment for any role',
    (_path, route) => {
      state.auth = { roles: ['nurse'], profile: { two_factor_required: true } };
      state.assurance = NO_FACTOR;
      renderAt(route);
      expect(screen.getByText('ENROLL_PAGE')).toBeInTheDocument();
    }
  );

  describe.each(['admin', 'doctor', 'nurse', 'patient'] as UserRole[])(
    '%s with a verified factor at aal1',
    (role) => {
      it.each(guardedRoutes.map((r) => [r.path, r] as const))(
        '%s redirects to the challenge',
        (_path, route) => {
          state.auth = { roles: [role], profile: {} };
          state.assurance = VERIFIED_AT_AAL1;
          renderAt(route);
          expect(screen.getByText('CHALLENGE_PAGE')).toBeInTheDocument();
        }
      );
    }
  );

  it.each(guardedRoutes.map((r) => [r.path, r] as const))(
    '%s fails closed to the challenge when the MFA lookup errors',
    (_path, route) => {
      state.auth = { roles: ['receptionist'], profile: {} };
      state.assurance = { status: 'error', message: 'network' };
      renderAt(route);
      expect(screen.getByText('CHALLENGE_PAGE')).toBeInTheDocument();
    }
  );

  it.each(guardedRoutes.map((r) => [r.path, r] as const))(
    '%s renders nothing routable while the MFA lookup is pending',
    (_path, route) => {
      state.auth = { roles: ['doctor'], profile: {} };
      state.assurance = { status: 'loading' };
      renderAt(route);
      expect(screen.queryByText('ENROLL_PAGE')).not.toBeInTheDocument();
      expect(screen.queryByText('CHALLENGE_PAGE')).not.toBeInTheDocument();
      expect(screen.queryByText('OTHER_PAGE')).not.toBeInTheDocument();
    }
  );
});

describe('resolveMfaGate decision table', () => {
  const ready = (currentLevel: 'aal1' | 'aal2' | null, factor: string | null): MfaAssurance => ({
    status: 'ready',
    currentLevel,
    verifiedTotpFactorId: factor,
  });

  it.each([
    ['loading', { status: 'loading' } as MfaAssurance, true, 'loading'],
    ['error, mandatory', { status: 'error', message: 'x' } as MfaAssurance, true, 'challenge'],
    ['error, optional', { status: 'error', message: 'x' } as MfaAssurance, false, 'challenge'],
    ['factor at aal1, mandatory', ready('aal1', 'f'), true, 'challenge'],
    ['factor at aal1, optional', ready('aal1', 'f'), false, 'challenge'],
    ['factor at aal2, mandatory', ready('aal2', 'f'), true, 'allow'],
    ['factor at aal2, optional', ready('aal2', 'f'), false, 'allow'],
    ['no factor, mandatory', ready('aal1', null), true, 'enroll'],
    ['no factor, mandatory, stale aal2 token', ready('aal2', null), true, 'enroll'],
    ['no factor, optional', ready('aal1', null), false, 'allow'],
  ])('%s -> %s', (_label, assurance, mandatory, expected) => {
    expect(resolveMfaGate(assurance, mandatory)).toBe(expected);
  });

  it('mandatory roles mirror role_requires_2fa (admin, doctor)', () => {
    expect(requiresMandatoryMfa({}, ['admin'])).toBe(true);
    expect(requiresMandatoryMfa({}, ['doctor'])).toBe(true);
    for (const role of ['nurse', 'receptionist', 'pharmacist', 'lab_technician', 'patient'] as UserRole[]) {
      expect(requiresMandatoryMfa({}, [role])).toBe(false);
    }
    expect(requiresMandatoryMfa({ two_factor_required: true }, ['nurse'])).toBe(true);
  });
});
