import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { render } from '@/test/test-utils';
import SignupPage from '@/pages/hospital/SignupPage';

const mockNavigate = vi.fn();
const mockSignup = vi.fn();
const mockCreateHospitalAndProfile = vi.fn();
const mockFrom = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    signup: mockSignup,
    createHospitalAndProfile: mockCreateHospitalAndProfile,
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Hospital Name *'), 'CareSync General');
  await user.type(screen.getByLabelText('Address *'), '123 Medical Plaza');
  await user.type(screen.getByLabelText('City *'), 'Springfield');
  await user.type(screen.getByLabelText('State *'), 'IL');
  await user.type(screen.getByLabelText('ZIP Code *'), '62701');
  await user.type(screen.getByLabelText('Phone *'), '+1-555-0101');
  await user.type(screen.getByLabelText('Hospital Email *'), 'info@caresync.com');
  await user.type(screen.getByLabelText('License Number *'), 'LIC-12345');
  await user.click(screen.getByRole('button', { name: 'Continue' }));

  await user.type(screen.getByLabelText('First Name *'), 'Ava');
  await user.type(screen.getByLabelText('Last Name *'), 'Stone');
  await user.type(screen.getByLabelText('Admin Email *'), 'admin@caresync.com');
  await user.type(screen.getByLabelText('Password *'), 'StrongP@ss1');
  await user.type(screen.getByLabelText('Confirm Password *'), 'StrongP@ss1');
  await user.click(screen.getByRole('button', { name: 'Create Account' }));
}

describe('Hospital signup onboarding (FUNC-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignup.mockResolvedValue({ error: null, userId: 'user-new-1' });
    mockCreateHospitalAndProfile.mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
  });

  it('creates the hospital with the userId returned by signup, not the stale auth state', { timeout: 20000 }, async () => {
    const user = userEvent.setup();
    render(<SignupPage />);

    await fillAndSubmit(user);

    await waitFor(() => {
      expect(mockCreateHospitalAndProfile).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'CareSync General', license_number: 'LIC-12345' }),
        'user-new-1'
      );
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/hospital/role-setup');
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('shows the server reason when hospital creation is refused, and sends the user to account setup', { timeout: 20000 }, async () => {
    mockCreateHospitalAndProfile.mockResolvedValue({
      error: new Error('This account already belongs to a hospital. Ask an administrator for access.'),
    });

    const user = userEvent.setup();
    render(<SignupPage />);

    await fillAndSubmit(user);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Hospital setup failed',
        expect.objectContaining({
          description: expect.stringContaining('This account already belongs to a hospital.'),
        })
      );
    });
    expect(mockNavigate).toHaveBeenCalledWith('/hospital/account-setup');
    expect(mockNavigate).not.toHaveBeenCalledWith('/hospital/role-setup');
  });
});
