import { describe, it, expect, vi, beforeEach } from 'vitest';
import { passwordPolicyManager } from '../passwordPolicy';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
}));

describe('PasswordPolicyManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPasswordPolicy', () => {
    it('should return default policy when no hospital ID provided', async () => {
      const policy = await passwordPolicyManager.getPasswordPolicy();

      expect(policy).toBeDefined();
      expect(policy.minLength).toBe(8);
      expect(policy.requireUppercase).toBe(true);
      expect(policy.requireLowercase).toBe(true);
      expect(policy.requireNumbers).toBe(true);
      expect(policy.requireSymbols).toBe(true);
    });

    it('should return hospital-specific policy when available', async () => {
      const mockPolicy = {
        min_length: 12,
        require_uppercase: false,
        require_lowercase: true,
        require_numbers: true,
        require_symbols: false,
        prevent_reuse_count: 10,
        max_age_days: 60,
      };

      const mockSupabase = vi.mocked(supabase);
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockPolicy, error: null })),
          })),
        })),
      } as any);

      const policy = await passwordPolicyManager.getPasswordPolicy('hospital-123');

      expect(policy.minLength).toBe(12);
      expect(policy.requireUppercase).toBe(false);
      expect(policy.requireLowercase).toBe(true);
      expect(policy.requireNumbers).toBe(true);
      expect(policy.requireSymbols).toBe(false);
      expect(policy.preventReuseCount).toBe(10);
      expect(policy.maxAgeDays).toBe(60);
    });
  });

  describe('validatePassword', () => {
    it('should validate a strong password successfully', async () => {
      const result = await passwordPolicyManager.validatePassword('StrongPass123!');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password that is too short', async () => {
      const result = await passwordPolicyManager.validatePassword('Short1!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password without uppercase', async () => {
      const result = await passwordPolicyManager.validatePassword('weakpass123!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase', async () => {
      const result = await passwordPolicyManager.validatePassword('WEAKPASS123!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without numbers', async () => {
      const result = await passwordPolicyManager.validatePassword('WeakPass!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without symbols', async () => {
      const result = await passwordPolicyManager.validatePassword('WeakPass123');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should reject common passwords', async () => {
      const result = await passwordPolicyManager.validatePassword('password');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is too common. Please choose a stronger password');
    });
  });

  describe('generateSecurePassword', () => {
    it('should generate a secure password', () => {
      const password = passwordPolicyManager.generateSecurePassword();

      expect(password).toBeDefined();
      expect(typeof password).toBe('string');
      expect(password.length).toBe(12);

      // Should contain required character types
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/\d/.test(password)).toBe(true);
      expect(/[!@#$%^&*()_+\-=[\]{};"':\\|,.<>?]/.test(password)).toBe(true);
    });
  });

  describe('updatePasswordPolicy', () => {
    it('should update password policy successfully', async () => {
      const result = await passwordPolicyManager.updatePasswordPolicy('hospital-123', {
        minLength: 10,
        requireUppercase: false,
      });

      expect(result).toBe(true);
    });
  });
});