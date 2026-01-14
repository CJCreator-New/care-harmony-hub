import { describe, it, expect, vi, beforeEach } from 'vitest';
import { biometricAuthManager } from './biometricAuth';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  },
}));

// Mock WebAuthn API
const mockPublicKeyCredential = {
  isUserVerifyingPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(true)),
  create: vi.fn(),
  get: vi.fn(),
};

Object.defineProperty(window, 'PublicKeyCredential', {
  value: mockPublicKeyCredential,
  writable: true,
  configurable: true, // Allow deletion
});
// Mock the static method
Object.defineProperty(window.PublicKeyCredential, 'isUserVerifyingPlatformAuthenticatorAvailable', {
  value: vi.fn(() => Promise.resolve(true)),
  writable: true,
  configurable: true,
});
Object.defineProperty(window, 'navigator', {
  value: {
    credentials: {
      create: vi.fn(),
      get: vi.fn(),
    },
  },
  writable: true,
});

describe('BiometricAuthManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isBiometricAvailable', () => {
    it('should return true when WebAuthn is available', () => {
      // WebAuthn is mocked as available
      const result = biometricAuthManager.isBiometricAvailable();
      expect(result).toBe(true);
    });

    it('should return false when WebAuthn is not available', () => {
      // Temporarily remove WebAuthn
      const originalPK = window.PublicKeyCredential;
      Object.defineProperty(window, 'PublicKeyCredential', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const result = biometricAuthManager.isBiometricAvailable();
      expect(result).toBe(false);

      // Restore
      Object.defineProperty(window, 'PublicKeyCredential', {
        value: originalPK,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('isPlatformAuthenticatorAvailable', () => {
    it('should check platform authenticator availability', async () => {
      const mockStaticMethod = vi.mocked(window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable);
      mockStaticMethod.mockResolvedValue(true);

      const result = await biometricAuthManager.isPlatformAuthenticatorAvailable();
      expect(result).toBe(true);
      expect(mockStaticMethod).toHaveBeenCalled();
    });

    it('should return false when platform authenticator is not available', async () => {
      mockPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(false);

      const result = await biometricAuthManager.isPlatformAuthenticatorAvailable();
      expect(result).toBe(false);
    });
  });

  describe('registerBiometricCredential', () => {
    it('should throw error when biometric is not available', async () => {
      // Temporarily remove WebAuthn
      const originalPK = window.PublicKeyCredential;
      Object.defineProperty(window, 'PublicKeyCredential', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const result = await biometricAuthManager.registerBiometricCredential('user-123', 'test', 'Test User');
      expect(result).toBe(false);

      // Restore
      Object.defineProperty(window, 'PublicKeyCredential', {
        value: originalPK,
        writable: true,
        configurable: true,
      });
    });

    it('should register biometric credential successfully', async () => {
      Object.defineProperty(window, 'PublicKeyCredential', {
        value: mockPublicKeyCredential,
        writable: true,
      });

      const mockCredential = {
        rawId: new Uint8Array([1, 2, 3]),
        response: {
          getPublicKey: () => new Uint8Array([4, 5, 6]),
          getTransports: () => ['usb', 'nfc'],
        },
      };

      vi.mocked(window.navigator.credentials.create).mockResolvedValue(mockCredential as any);

      const result = await biometricAuthManager.registerBiometricCredential('user-123', 'test', 'Test User');
      expect(result).toBe(true);
    });
  });

  describe('authenticateWithBiometric', () => {
    it('should throw error when biometric is not available', async () => {
      // Temporarily remove WebAuthn
      const originalPK = window.PublicKeyCredential;
      Object.defineProperty(window, 'PublicKeyCredential', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const result = await biometricAuthManager.authenticateWithBiometric('user-123');
      expect(result).toBe(false);

      // Restore
      Object.defineProperty(window, 'PublicKeyCredential', {
        value: originalPK,
        writable: true,
        configurable: true,
      });
    });

    it('should authenticate with biometric successfully', async () => {
      Object.defineProperty(window, 'PublicKeyCredential', {
        value: mockPublicKeyCredential,
        writable: true,
      });

      const mockCredentials = [
        {
          credential_id: btoa('test-credential'),
          transports: ['usb'],
        },
      ];

      const mockSupabase = vi.mocked(supabase);
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: mockCredentials, error: null })),
        })),
      } as any);

      const mockCredential = {
        rawId: new Uint8Array([1, 2, 3]),
        response: {},
      };

      vi.mocked(window.navigator.credentials.get).mockResolvedValue(mockCredential as any);

      const result = await biometricAuthManager.authenticateWithBiometric('user-123');
      expect(result).toBe(true);
    });
  });

  describe('getBiometricCredentials', () => {
    it('should return user biometric credentials', async () => {
      const mockCredentials = [
        {
          id: 'cred-1',
          user_id: 'user-123',
          credential_id: 'cred-id',
          public_key: 'public-key',
          counter: 0,
          created_at: new Date().toISOString(),
        },
      ];

      const mockSupabase = vi.mocked(supabase);
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: mockCredentials, error: null })),
          })),
        })),
      } as any);

      const credentials = await biometricAuthManager.getBiometricCredentials('user-123');
      expect(credentials).toEqual(mockCredentials);
    });
  });

  describe('removeBiometricCredential', () => {
    it('should remove biometric credential successfully', async () => {
      const result = await biometricAuthManager.removeBiometricCredential('cred-123');
      expect(result).toBe(true);
    });
  });

  describe('hasBiometricEnabled', () => {
    it('should return true when user has biometric credentials', async () => {
      const mockCredentials = [{ id: 'cred-1' }];

      const mockSupabase = vi.mocked(supabase);
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: mockCredentials, error: null })),
          })),
        })),
      } as any);

      const result = await biometricAuthManager.hasBiometricEnabled('user-123');
      expect(result).toBe(true);
    });

    it('should return false when user has no biometric credentials', async () => {
      const mockSupabase = vi.mocked(supabase);
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      } as any);

      const result = await biometricAuthManager.hasBiometricEnabled('user-123');
      expect(result).toBe(false);
    });
  });
});