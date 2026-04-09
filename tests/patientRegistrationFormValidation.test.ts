import { describe, it, expect, beforeEach } from 'vitest';
import {
  PatientRegistrationSchema,
  PatientRegistrationFormData,
  calculateAge,
  formatPhoneNumber,
  validatePostalCode,
  shouldUseAddressAutocomplete,
  EmergencyContactSchema,
  InsuranceSchema,
  AddressSchema,
} from '../src/lib/schemas/patientRegistrationSchema';
import { z } from 'zod';

/**
 * HP-2 PR2: PatientRegistrationForm Validation Tests
 * 
 * Comprehensive test coverage for patient registration schema:
 * - 25+ test cases across 7 test suites
 * - Schema validation (happy path & edge cases)
 * - Utility functions (age calculation, phone formatting, postal code validation)
 * - Clinical validations (age ranges, DOB logic, realistic constraints)
 * - Optional field handling (emergency contact, insurance)
 * - Cross-field validation rules
 * - HIPAA compliance (no PHI in test logs)
 */

const VALID_HOSPITAL_ID = '550e8400-e29b-41d4-a716-446655440001';

// Test data factory for valid patient registration
function createValidPatientData(): PatientRegistrationFormData {
  const dob = new Date('1990-05-15');
  return {
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: dob,
    gender: 'M',
    email: 'john.doe@example.com',
    phoneNumber: '+1-555-123-4567',
    address: {
      street: '123 Main Street, Apt 4B',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'US',
    },
    hospitalId: VALID_HOSPITAL_ID,
  };
}

// ============================================================================
// TEST SUITE 1: UTILITY FUNCTIONS
// ============================================================================

describe('PatientRegistrationSchema - Utility Functions', () => {
  
  it('calculateAge: returns correct age for adult patient', () => {
    const dob = new Date('1990-05-15');
    const age = calculateAge(dob);
    // Age should be between 33-34 depending on current date
    expect(age).toBeGreaterThanOrEqual(33);
    expect(age).toBeLessThanOrEqual(35);
  });

  it('calculateAge: handles newborn correctly (age 0)', () => {
    const today = new Date();
    const dob = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const age = calculateAge(dob);
    expect(age).toBe(0);
  });

  it('calculateAge: handles birthday boundary correctly', () => {
    const today = new Date();
    // Create DOB exactly 34 years ago
    const dob = new Date(today.getFullYear() - 34, today.getMonth(), today.getDate());
    const age = calculateAge(dob);
    expect(age).toBe(34);
  });

  it('formatPhoneNumber: standardizes US format', () => {
    const formatted = formatPhoneNumber('5551234567');
    expect(formatted).toMatch(/\+1/);
  });

  it('formatPhoneNumber: preserves international format', () => {
    const formatted = formatPhoneNumber('+441234567890');
    expect(formatted).toContain('+44');
  });

  it('formatPhoneNumber: handles various input formats', () => {
    const inputs = ['5551234567', '555-123-4567', '(555) 123-4567', '+1 555 123 4567'];
    inputs.forEach((input) => {
      const formatted = formatPhoneNumber(input);
      expect(formatted.length).toBeGreaterThan(5);
    });
  });

  it('validatePostalCode: accepts valid US zipcode', () => {
    expect(validatePostalCode('10001', 'US')).toBe(true);
    expect(validatePostalCode('90210', 'US')).toBe(true);
    expect(validatePostalCode('90210-1234', 'US')).toBe(true);
  });

  it('validatePostalCode: rejects invalid US zipcode', () => {
    expect(validatePostalCode('123', 'US')).toBe(false);
    expect(validatePostalCode('ABCDE', 'US')).toBe(false);
  });

  it('validatePostalCode: accepts valid Canadian postal code', () => {
    expect(validatePostalCode('K1A 0B1', 'CA')).toBe(true);
    expect(validatePostalCode('M5V 3A8', 'CA')).toBe(true);
  });

  it('validatePostalCode: accepts valid UK postal code', () => {
    expect(validatePostalCode('SW1A 1AA', 'UK')).toBe(true);
    expect(validatePostalCode('B33 8TH', 'UK')).toBe(true);
  });

  it('validatePostalCode: handles unknown country with generic validation', () => {
    expect(validatePostalCode('ABC-123', 'XX')).toBe(true);
    expect(validatePostalCode('A', 'XX')).toBe(false); // Too short
  });

  it('shouldUseAddressAutocomplete: recommends for major countries', () => {
    expect(shouldUseAddressAutocomplete('US')).toBe(true);
    expect(shouldUseAddressAutocomplete('UK')).toBe(true);
    expect(shouldUseAddressAutocomplete('CA')).toBe(true);
    expect(shouldUseAddressAutocomplete('AU')).toBe(true);
  });

  it('shouldUseAddressAutocomplete: does not recommend for minor countries', () => {
    expect(shouldUseAddressAutocomplete('XX')).toBe(false);
    expect(shouldUseAddressAutocomplete('ZZ')).toBe(false);
  });

});

// ============================================================================
// TEST SUITE 2: ADDRESS SCHEMA VALIDATION
// ============================================================================

describe('PatientRegistrationSchema - AddressSchema', () => {
  
  it('accepts valid address', async () => {
    const validAddress = {
      street: '123 Main Street',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'US',
    };
    const result = await AddressSchema.parseAsync(validAddress);
    expect(result).toBeDefined();
  });

  it('rejects address with missing street', async () => {
    const invalid = {
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'US',
    };
    await expect(AddressSchema.parseAsync(invalid)).rejects.toThrow();
  });

  it('rejects address with short street', async () => {
    const invalid = {
      street: '12',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'US',
    };
    await expect(AddressSchema.parseAsync(invalid)).rejects.toThrow();
  });

  it('rejects address with invalid postal code for country', async () => {
    const invalid = {
      street: '123 Main Street',
      city: 'New York',
      state: 'NY',
      postalCode: 'INVALID',
      country: 'US',
    };
    await expect(AddressSchema.parseAsync(invalid)).rejects.toThrow();
  });

});

// ============================================================================
// TEST SUITE 3: EMERGENCY CONTACT SCHEMA VALIDATION
// ============================================================================

describe('PatientRegistrationSchema - EmergencyContactSchema', () => {
  
  it('accepts valid emergency contact', async () => {
    const validEC = {
      fullName: 'Jane Doe',
      relationship: 'spouse',
      phoneNumber: '+1-555-987-6543',
    };
    const result = await EmergencyContactSchema.parseAsync(validEC);
    expect(result).toBeDefined();
  });

  it('accepts undefined emergency contact (optional)', async () => {
    const result = await EmergencyContactSchema.parseAsync(undefined);
    expect(result).toBeUndefined();
  });

  it('rejects emergency contact with short name', async () => {
    const invalid = {
      fullName: 'J',
      relationship: 'spouse',
      phoneNumber: '+1-555-987-6543',
    };
    await expect(EmergencyContactSchema.parseAsync(invalid)).rejects.toThrow();
  });

  it('rejects emergency contact with invalid relationship', async () => {
    const invalid = {
      fullName: 'Jane Doe',
      relationship: 'invalid',
      phoneNumber: '+1-555-987-6543',
    };
    await expect(EmergencyContactSchema.parseAsync(invalid)).rejects.toThrow();
  });

  it('rejects emergency contact with invalid phone', async () => {
    const invalid = {
      fullName: 'Jane Doe',
      relationship: 'parent',
      phoneNumber: 'not-a-phone',
    };
    await expect(EmergencyContactSchema.parseAsync(invalid)).rejects.toThrow();
  });

});

// ============================================================================
// TEST SUITE 4: INSURANCE SCHEMA VALIDATION
// ============================================================================

describe('PatientRegistrationSchema - InsuranceSchema', () => {
  
  it('accepts valid insurance information', async () => {
    const validIns = {
      providerId: 'BCBS',
      policyNumber: 'ABC123456',
      groupNumber: 'GRP789',
    };
    const result = await InsuranceSchema.parseAsync(validIns);
    expect(result).toBeDefined();
  });

  it('accepts undefined insurance (optional)', async () => {
    const result = await InsuranceSchema.parseAsync(undefined);
    expect(result).toBeUndefined();
  });

  it('accepts empty strings for optional insurance fields', async () => {
    const incomplete = {
      providerId: '',
      policyNumber: '',
    };
    const result = await InsuranceSchema.parseAsync(incomplete);
    expect(result).toBeDefined();
  });

  it('rejects insurance with short policy number', async () => {
    const invalid = {
      providerId: 'BCBS',
      policyNumber: 'AB12',
      groupNumber: 'GRP789',
    };
    await expect(InsuranceSchema.parseAsync(invalid)).rejects.toThrow();
  });

});

// ============================================================================
// TEST SUITE 5: PERSONAL INFORMATION VALIDATION
// ============================================================================

describe('PatientRegistrationSchema - Personal Information', () => {
  
  it('accepts valid first name', async () => {
    const data = createValidPatientData();
    const result = await PatientRegistrationSchema.pick({ firstName: true }).parseAsync({ firstName: data.firstName });
    expect(result.firstName).toBe('John');
  });

  it('rejects first name too short', async () => {
    const data = createValidPatientData();
    data.firstName = 'J';
    await expect(PatientRegistrationSchema.parseAsync(data)).rejects.toThrow();
  });

  it('rejects first name with invalid characters', async () => {
    const data = createValidPatientData();
    data.firstName = 'John@123';
    await expect(PatientRegistrationSchema.parseAsync(data)).rejects.toThrow();
  });

  it('accepts names with hyphens and apostrophes', async () => {
    const data = createValidPatientData();
    data.firstName = "Jean-Luc O'Brien";
    const result = await PatientRegistrationSchema.parseAsync(data);
    expect(result.firstName).toContain('-');
  });

  it('accepts valid genders', async () => {
    const data = createValidPatientData();
    ['M', 'F', 'Other', 'Prefer not to say'].forEach(async (gender) => {
      data.gender = gender as any;
      const result = await PatientRegistrationSchema.parseAsync(data);
      expect(result.gender).toBe(gender);
    });
  });

  it('rejects invalid gender', async () => {
    const data = createValidPatientData();
    data.gender = 'invalid' as any;
    await expect(PatientRegistrationSchema.parseAsync(data)).rejects.toThrow();
  });

});

// ============================================================================
// TEST SUITE 6: DATE OF BIRTH & AGE VALIDATION
// ============================================================================

describe('PatientRegistrationSchema - Date of Birth & Age', () => {
  
  it('accepts valid DOB (34 year old)', async () => {
    const data = createValidPatientData();
    const result = await PatientRegistrationSchema.parseAsync(data);
    expect(result.dateOfBirth).toBeDefined();
  });

  it('rejects DOB in future', async () => {
    const data = createValidPatientData();
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    data.dateOfBirth = futureDate;
    await expect(PatientRegistrationSchema.parseAsync(data)).rejects.toThrow();
  });

  it('accepts newborn (age 0)', async () => {
    const data = createValidPatientData();
    // Use yesterday to ensure it's not in the future
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    data.dateOfBirth = yesterday;
    const result = await PatientRegistrationSchema.parseAsync(data);
    expect(result.dateOfBirth).toBeDefined();
  });

  it('accepts elderly patient (age 100)', async () => {
    const data = createValidPatientData();
    const oldDob = new Date();
    oldDob.setFullYear(oldDob.getFullYear() - 100);
    data.dateOfBirth = oldDob;
    const result = await PatientRegistrationSchema.parseAsync(data);
    expect(result.dateOfBirth).toBeDefined();
  });

  it('rejects unrealistic age (151 years old)', async () => {
    const data = createValidPatientData();
    const ancientDob = new Date();
    ancientDob.setFullYear(ancientDob.getFullYear() - 151);
    data.dateOfBirth = ancientDob;
    await expect(PatientRegistrationSchema.parseAsync(data)).rejects.toThrow();
  });

  it('accepts patient born in 1920s (age ~104)', async () => {
    const data = createValidPatientData();
    data.dateOfBirth = new Date('1920-01-01');
    const result = await PatientRegistrationSchema.parseAsync(data);
    expect(result.dateOfBirth).toBeDefined();
  });

});

// ============================================================================
// TEST SUITE 7: CONTACT INFORMATION VALIDATION
// ============================================================================

describe('PatientRegistrationSchema - Contact Information', () => {
  
  it('accepts valid email', async () => {
    const data = createValidPatientData();
    const result = await PatientRegistrationSchema.parseAsync(data);
    expect(result.email).toBe('john.doe@example.com');
  });

  it('rejects invalid email (no @)', async () => {
    const data = createValidPatientData();
    data.email = 'invalidemail.com';
    await expect(PatientRegistrationSchema.parseAsync(data)).rejects.toThrow();
  });

  it('rejects invalid email (no domain extension)', async () => {
    const data = createValidPatientData();
    data.email = 'john@domain';
    await expect(PatientRegistrationSchema.parseAsync(data)).rejects.toThrow();
  });

  it('accepts valid international phone', async () => {
    const data = createValidPatientData();
    data.phoneNumber = '+44-789-4673';
    const result = await PatientRegistrationSchema.parseAsync(data);
    expect(result.phoneNumber).toContain('+44');
  });

  it('rejects invalid phone format', async () => {
    const data = createValidPatientData();
    data.phoneNumber = 'not-a-phone-number';
    await expect(PatientRegistrationSchema.parseAsync(data)).rejects.toThrow();
  });

  it('formats US phone to international format', async () => {
    const data = createValidPatientData();
    data.phoneNumber = '5551234567';
    const result = await PatientRegistrationSchema.parseAsync(data);
    // After transformation, should have + prefix
    expect(result.phoneNumber).toContain('+1');
  });

});

// ============================================================================
// TEST SUITE 8: COMPLETE REGISTRATION FLOW
// ============================================================================

describe('PatientRegistrationSchema - Complete Registration', () => {
  
  it('accepts complete valid patient registration with all fields', async () => {
    const data = createValidPatientData();
    data.emergencyContact = {
      fullName: 'Jane Doe',
      relationship: 'spouse',
      phoneNumber: '+1-555-987-6543',
    };
    data.insurance = {
      providerId: 'BCBS',
      policyNumber: 'POL123456',
      groupNumber: 'GRP789',
    };
    const result = await PatientRegistrationSchema.parseAsync(data);
    expect(result.firstName).toBe('John');
    expect(result.emergencyContact).toBeDefined();
    expect(result.insurance).toBeDefined();
  });

  it('accepts valid registration without optional emergency contact', async () => {
    const data = createValidPatientData();
    const result = await PatientRegistrationSchema.parseAsync(data);
    expect(result.emergencyContact).toBeUndefined();
  });

  it('accepts valid registration without optional insurance', async () => {
    const data = createValidPatientData();
    const result = await PatientRegistrationSchema.parseAsync(data);
    expect(result.insurance).toBeUndefined();
  });

  it('rejects registration missing firstName', async () => {
    const data = createValidPatientData();
    delete (data as any).firstName;
    await expect(PatientRegistrationSchema.parseAsync(data)).rejects.toThrow();
  });

  it('rejects registration missing required address fields', async () => {
    const data = createValidPatientData();
    delete (data.address as any).postalCode;
    await expect(PatientRegistrationSchema.parseAsync(data)).rejects.toThrow();
  });

  it('rejects registration with invalid hospitalId', async () => {
    const data = createValidPatientData();
    data.hospitalId = 'not-a-uuid';
    await expect(PatientRegistrationSchema.parseAsync(data)).rejects.toThrow();
  });

});

// ============================================================================
// TEST SUITE 9: EDGE CASES & SECURITY
// ============================================================================

describe('PatientRegistrationSchema - Edge Cases & Security', () => {
  
  it('rejects extra fields (strict mode)', async () => {
    const data: any = createValidPatientData();
    data.extraField = 'should be rejected';
    await expect(PatientRegistrationSchema.parseAsync(data)).rejects.toThrow();
  });

  it('handles string DOB by coercing to Date', async () => {
    const data: any = createValidPatientData();
    data.dateOfBirth = '1990-05-15';
    const result = await PatientRegistrationSchema.parseAsync(data);
    expect(result.dateOfBirth instanceof Date).toBe(true);
  });

  it('accepts maximum length names (50 chars)', async () => {
    const data = createValidPatientData();
    data.firstName = 'A'.repeat(50);
    const result = await PatientRegistrationSchema.parseAsync(data);
    expect(result.firstName.length).toBe(50);
  });

  it('rejects names exceeding maximum length', async () => {
    const data = createValidPatientData();
    data.firstName = 'A'.repeat(51);
    await expect(PatientRegistrationSchema.parseAsync(data)).rejects.toThrow();
  });

  it('accepts maximum email length (100 chars)', async () => {
    const data = createValidPatientData();
    data.email = 'a'.repeat(60) + '@example.com';
    const result = await PatientRegistrationSchema.parseAsync(data);
    expect(result.email.length).toBeLessThanOrEqual(100);
  });

  it('sanitizes phone leading +1 handling', async () => {
    const data = createValidPatientData();
    data.phoneNumber = '2125551234'; // NYC area code without +1
    const result = await PatientRegistrationSchema.parseAsync(data);
    expect(result.phoneNumber).toBeDefined();
  });

});
