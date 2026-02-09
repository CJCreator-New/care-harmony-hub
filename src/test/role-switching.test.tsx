import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { isValidRoleTransition } from '@/utils/roleInterconnectionValidator';
import { RoleSwitcher } from '@/components/auth/RoleSwitcher';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    roles: [],
    primaryRole: null,
    switchRole: vi.fn(),
  }),
}));

describe('Role Switching Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows switching to an assigned role', () => {
    const result = isValidRoleTransition('admin', 'doctor', ['admin', 'doctor']);
    expect(result.valid).toBe(true);
  });

  it('blocks switching to an unassigned role', () => {
    const result = isValidRoleTransition('admin', 'doctor', ['admin']);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Role not assigned to user');
  });

  it('blocks switching when current role is not assigned', () => {
    const result = isValidRoleTransition('admin', 'doctor', ['doctor']);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Current role not assigned to user');
  });

  it('blocks switching to the same role', () => {
    const result = isValidRoleTransition('admin', 'admin', ['admin']);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Already using this role');
  });

  it('shows only available roles in the menu', async () => {
    const user = userEvent.setup();

    render(
      <RoleSwitcher
        roles={['admin', 'doctor', 'nurse']}
        currentRole="admin"
        onSwitchRole={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Doctor')).toBeInTheDocument();
    expect(screen.getByText('Nurse')).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Administrator' })).not.toBeInTheDocument();
  });

  it('calls the switch handler when a role is selected', async () => {
    const user = userEvent.setup();
    const onSwitchRole = vi.fn();

    render(
      <RoleSwitcher
        roles={['admin', 'doctor']}
        currentRole="admin"
        onSwitchRole={onSwitchRole}
      />
    );

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText('Doctor'));

    expect(onSwitchRole).toHaveBeenCalledWith('doctor');
  });

  it('shows empty state when no alternative roles exist', async () => {
    const user = userEvent.setup();

    render(
      <RoleSwitcher
        roles={['admin']}
        currentRole="admin"
        onSwitchRole={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button'));

    expect(screen.getByRole('menuitem', { name: 'No other roles available' })).toBeInTheDocument();
  });
});
