import { vi } from 'vitest';

export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  aud: 'authenticated',
  role: 'authenticated',
};

export const mockProfile = {
  id: 'test-profile-id',
  user_id: 'test-user-id',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  hospital_id: 'test-hospital-id',
  is_staff: true,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

export const mockHospital = {
  id: 'test-hospital-id',
  name: 'Test Hospital',
  address: '123 Test Street',
  city: 'Test City',
  state: 'TS',
  zip: '12345',
  phone: '555-0123',
  email: 'hospital@test.com',
  license_number: 'LIC123456',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

export const mockSession = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: 'bearer',
  user: mockUser,
};

export const createMockAuthContext = (overrides = {}) => ({
  user: mockUser,
  session: mockSession,
  profile: mockProfile,
  hospital: mockHospital,
  roles: ['admin'] as const,
  isAuthenticated: true,
  isLoading: false,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  refreshProfile: vi.fn(),
  hasRole: vi.fn().mockReturnValue(true),
  ...overrides,
});
