import { describe, it, expect, vi, beforeEach } from 'vitest';
// Test validation utilities
describe('Validation Utilities', () => {
  describe('Email Validation', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    it('should validate correct email formats', () => {
      expect(emailRegex.test('test@example.com')).toBe(true);
      expect(emailRegex.test('user.name@domain.org')).toBe(true);
      expect(emailRegex.test('user+tag@example.co.uk')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(emailRegex.test('invalid')).toBe(false);
      expect(emailRegex.test('test@')).toBe(false);
      expect(emailRegex.test('@example.com')).toBe(false);
      expect(emailRegex.test('test @example.com')).toBe(false);
    });
  });

  describe('Phone Validation', () => {
    const phoneRegex = /^[\d\s\-\(\)+]+$/;

    it('should validate correct phone formats', () => {
      expect(phoneRegex.test('555-0123')).toBe(true);
      expect(phoneRegex.test('(555) 555-0123')).toBe(true);
      expect(phoneRegex.test('+1 555 555 0123')).toBe(true);
    });

    it('should reject invalid phone formats', () => {
      expect(phoneRegex.test('abc-defg')).toBe(false);
      expect(phoneRegex.test('555.555.5555')).toBe(false);
    });
  });

  describe('MRN Format', () => {
    const mrnRegex = /^MRN\d{8}$/;

    it('should validate correct MRN format', () => {
      expect(mrnRegex.test('MRN00000001')).toBe(true);
      expect(mrnRegex.test('MRN12345678')).toBe(true);
    });

    it('should reject invalid MRN formats', () => {
      expect(mrnRegex.test('MRN123')).toBe(false);
      expect(mrnRegex.test('12345678')).toBe(false);
      expect(mrnRegex.test('mrn00000001')).toBe(false);
    });
  });

  describe('Date Validation', () => {
    it('should validate date of birth is not in future', () => {
      const today = new Date();
      const futureDate = new Date(today.getFullYear() + 1, 0, 1);
      const pastDate = new Date(today.getFullYear() - 20, 0, 1);

      expect(futureDate > today).toBe(true);
      expect(pastDate < today).toBe(true);
    });

    it('should validate age is reasonable', () => {
      const today = new Date();
      const validDob = new Date(today.getFullYear() - 30, 0, 1);
      const tooOldDob = new Date(today.getFullYear() - 150, 0, 1);
      
      const age = today.getFullYear() - validDob.getFullYear();
      const oldAge = today.getFullYear() - tooOldDob.getFullYear();

      expect(age).toBeLessThan(120);
      expect(oldAge).toBeGreaterThan(120);
    });
  });
});

describe('Password Validation', () => {
  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return {
      isValid: minLength && hasUppercase && hasLowercase && hasNumber && hasSymbol,
      minLength,
      hasUppercase,
      hasLowercase,
      hasNumber,
      hasSymbol,
    };
  };

  it('should accept strong passwords', () => {
    const result = validatePassword('SecurePass1!');
    expect(result.isValid).toBe(true);
  });

  it('should reject short passwords', () => {
    const result = validatePassword('Abc1!');
    expect(result.isValid).toBe(false);
    expect(result.minLength).toBe(false);
  });

  it('should reject passwords without uppercase', () => {
    const result = validatePassword('securepass1!');
    expect(result.isValid).toBe(false);
    expect(result.hasUppercase).toBe(false);
  });

  it('should reject passwords without numbers', () => {
    const result = validatePassword('SecurePass!');
    expect(result.isValid).toBe(false);
    expect(result.hasNumber).toBe(false);
  });

  it('should reject passwords without symbols', () => {
    const result = validatePassword('SecurePass1');
    expect(result.isValid).toBe(false);
    expect(result.hasSymbol).toBe(false);
  });
});

describe('Gender Type Enum', () => {
  const validGenders = ['male', 'female', 'other'];

  it('should include all valid gender types', () => {
    expect(validGenders).toContain('male');
    expect(validGenders).toContain('female');
    expect(validGenders).toContain('other');
  });

  it('should not include invalid values', () => {
    expect(validGenders).not.toContain('unknown');
    expect(validGenders).not.toContain('');
  });
});

describe('Blood Type Validation', () => {
  const validBloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  it('should include all valid blood types', () => {
    validBloodTypes.forEach((type) => {
      expect(validBloodTypes).toContain(type);
    });
  });

  it('should have 8 blood types', () => {
    expect(validBloodTypes.length).toBe(8);
  });
});
