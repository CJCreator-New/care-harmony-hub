import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
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
    from: (...args: any[]) => mockFrom(...args),
  },
}));

describe('Signup Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignup.mockResolvedValue({ error: null });
    mockCreateHospitalAndProfile.mockResolvedValue({ error: null });

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockFrom.mockReturnValue(chain);
  });

  afterEach(() => {
  });

  it('completes signup and navigates to role setup', async () => {
    const user = userEvent.setup();
    render(<SignupPage />);

    await user.type(screen.getByLabelText('Hospital Name *'), 'CareSync General');
    await user.type(screen.getByLabelText('Address *'), '123 Medical Plaza');
    await user.type(screen.getByLabelText('City *'), 'Springfield');
    await user.type(screen.getByLabelText('State *'), 'IL');
    await user.type(screen.getByLabelText('ZIP Code *'), '62701');
    await user.type(screen.getByLabelText('Phone *'), '+1-555-0101');
    await user.type(screen.getByLabelText('Hospital Email *'), 'info@caresync.com');
    await user.type(screen.getByLabelText('License Number *'), 'LIC-12345');

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText('Administrator Account')).toBeInTheDocument();

    await user.type(screen.getByLabelText('First Name *'), 'Ava');
    await user.type(screen.getByLabelText('Last Name *'), 'Stone');
    await user.type(screen.getByLabelText('Admin Email *'), 'admin@caresync.com');

    await user.type(screen.getByLabelText('Password *'), 'StrongP@ss1');
    await user.type(screen.getByLabelText('Confirm Password *'), 'StrongP@ss1');

    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith('admin@caresync.com', 'StrongP@ss1', 'Ava', 'Stone');
    });

    await waitFor(() => {
      expect(mockCreateHospitalAndProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'CareSync General',
          address: '123 Medical Plaza',
          city: 'Springfield',
          state: 'IL',
          zip: '62701',
          phone: '+1-555-0101',
          email: 'info@caresync.com',
          license_number: 'LIC-12345',
        })
      );
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/hospital/role-setup');
    });
  });
});
