import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import AccountSetupPage from '@/pages/hospital/AccountSetupPage';
import { useAuth } from '@/contexts/AuthContext';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const baseUser = {
  id: 'user-1',
  email: 'admin@hospital.com',
  user_metadata: {},
} as any;

const baseProfile = {
  id: 'profile-1',
  user_id: 'user-1',
  hospital_id: null,
  first_name: 'Ava',
  last_name: 'Admin',
  email: 'admin@hospital.com',
  phone: null,
  avatar_url: null,
  two_factor_enabled: false,
};

const baseHospital = {
  id: 'hospital-1',
  name: 'CareSync General',
  address: null,
  city: null,
  state: null,
  zip: null,
  phone: null,
  email: null,
  license_number: null,
};

const mockCreateHospitalAndProfile = vi.fn();
const mockLogout = vi.fn();

const mockedUseAuth = vi.mocked(useAuth);

describe('Account Setup Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateHospitalAndProfile.mockResolvedValue({ error: null });
    mockLogout.mockResolvedValue(undefined);
  });

  it('renders the profile step when profile is missing', () => {
    mockedUseAuth.mockReturnValue({
      user: baseUser,
      profile: null,
      hospital: null,
      roles: [],
      isLoading: false,
      createHospitalAndProfile: mockCreateHospitalAndProfile,
      logout: mockLogout,
    } as any);

    render(<AccountSetupPage />);

    expect(screen.getByText('Your Profile')).toBeInTheDocument();
  });

  it('renders the hospital step when profile exists but hospital is missing', () => {
    mockedUseAuth.mockReturnValue({
      user: baseUser,
      profile: baseProfile,
      hospital: null,
      roles: [],
      isLoading: false,
      createHospitalAndProfile: mockCreateHospitalAndProfile,
      logout: mockLogout,
    } as any);

    render(<AccountSetupPage />);

    expect(screen.getByText('Hospital Details')).toBeInTheDocument();
  });

  it('renders the role assignment step when no roles are present', () => {
    mockedUseAuth.mockReturnValue({
      user: baseUser,
      profile: { ...baseProfile, hospital_id: baseHospital.id },
      hospital: baseHospital,
      roles: [],
      isLoading: false,
      createHospitalAndProfile: mockCreateHospitalAndProfile,
      logout: mockLogout,
    } as any);

    render(<AccountSetupPage />);

    expect(screen.getByText('Role Assignment Required')).toBeInTheDocument();
  });

  it('signs out from the role step and navigates to login', async () => {
    const user = userEvent.setup();

    mockedUseAuth.mockReturnValue({
      user: baseUser,
      profile: { ...baseProfile, hospital_id: baseHospital.id },
      hospital: baseHospital,
      roles: [],
      isLoading: false,
      createHospitalAndProfile: mockCreateHospitalAndProfile,
      logout: mockLogout,
    } as any);

    render(<AccountSetupPage />);

    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/hospital/login');
  });

  it('submits hospital details and navigates to role setup', async () => {
    const user = userEvent.setup();

    mockedUseAuth.mockReturnValue({
      user: baseUser,
      profile: baseProfile,
      hospital: null,
      roles: [],
      isLoading: false,
      createHospitalAndProfile: mockCreateHospitalAndProfile,
      logout: mockLogout,
    } as any);

    render(<AccountSetupPage />);

    await user.type(screen.getByLabelText('Hospital Name *'), 'Sunrise Hospital');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(mockCreateHospitalAndProfile).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Sunrise Hospital' })
    );
    expect(mockNavigate).toHaveBeenCalledWith('/hospital/role-setup');
  });
});
