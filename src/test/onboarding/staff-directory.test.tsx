import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '@/test/test-utils';
import StaffManagementPage from '@/pages/settings/StaffManagementPage';

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'profile-admin', user_id: 'u-admin', hospital_id: 'hospital-1' },
    hospital: { id: 'hospital-1', name: 'CareSync General' },
    roles: ['admin'],
    user: { id: 'u-admin' },
  }),
}));

vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/auth/ProtectedPage', () => ({
  AdminProtectedPage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/staff/StaffInviteModal', () => ({
  StaffInviteModal: () => null,
}));

vi.mock('@/components/staff/EditStaffModal', () => ({
  EditStaffModal: () => null,
}));

vi.mock('@/components/staff/DeactivateStaffDialog', () => ({
  DeactivateStaffDialog: () => null,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/useStaffInvitations', () => ({
  useStaffInvitations: () => ({
    fetchInvitations: vi.fn().mockResolvedValue([]),
    cancelInvitation: vi.fn(),
    resendInvitation: vi.fn(),
  }),
}));

/** Query builder that resolves to `result` at the end of the chain. */
function query(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'neq', 'in', 'order']) {
    builder[method] = vi.fn(() => builder);
  }
  builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return builder as Record<string, ReturnType<typeof vi.fn>> & PromiseLike<unknown>;
}

describe('Staff directory (FUNC-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists staff derived from non-patient roles in the hospital, not from profiles.is_staff', async () => {
    const userRoles = query({
      data: [
        { user_id: 'u-admin', role: 'admin' },
        { user_id: 'u-nurse', role: 'nurse' },
      ],
      error: null,
    });
    const profiles = query({
      data: [
        {
          id: 'p-admin',
          user_id: 'u-admin',
          first_name: 'Ava',
          last_name: 'Stone',
          email: 'admin@caresync.com',
          phone: null,
          avatar_url: null,
          created_at: '2026-01-01T00:00:00Z',
        },
        {
          id: 'p-nurse',
          user_id: 'u-nurse',
          first_name: 'Nina',
          last_name: 'Patel',
          email: 'nina@caresync.com',
          phone: null,
          avatar_url: null,
          created_at: '2026-01-02T00:00:00Z',
        },
      ],
      error: null,
    });

    mockFrom.mockImplementation((table: string) =>
      table === 'user_roles' ? userRoles : profiles
    );

    render(<StaffManagementPage />);

    expect(await screen.findByText(/Ava/)).toBeInTheDocument();
    expect(screen.getByText(/Nina/)).toBeInTheDocument();

    expect(mockFrom).toHaveBeenCalledWith('user_roles');
    expect(userRoles.neq).toHaveBeenCalledWith('role', 'patient');
    expect(profiles.in).toHaveBeenCalledWith('user_id', ['u-admin', 'u-nurse']);

    // The profile query must not depend on is_staff, which onboarding never set.
    const profileFilters = Object.values(profiles).filter(
      (v): v is ReturnType<typeof vi.fn> => typeof v === 'function' && 'mock' in v
    );
    for (const fn of profileFilters) {
      expect(fn).not.toHaveBeenCalledWith('is_staff', expect.anything());
    }
  });

  it('shows an empty list without querying profiles when no staff roles exist', async () => {
    const userRoles = query({ data: [], error: null });
    const profiles = query({ data: [], error: null });
    mockFrom.mockImplementation((table: string) =>
      table === 'user_roles' ? userRoles : profiles
    );

    render(<StaffManagementPage />);

    await waitFor(() => {
      expect(userRoles.neq).toHaveBeenCalledWith('role', 'patient');
    });
    expect(profiles.in).not.toHaveBeenCalled();
  });
});
