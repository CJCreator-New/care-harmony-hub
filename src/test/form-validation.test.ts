/**
 * Tests for Standardized Form Validation & Components
 * 
 * Validates:
 * - Form validation schemas (Zod)
 * - useFormStandardized hook behavior
 * - Error handling patterns
 * - Clinical validation rules
 */

import { describe, it, expect } from 'vitest';
import {
  patientDemographicsSchema,
  prescriptionFormSchema,
  vitalSignsFormSchema,
  appointmentFormSchema,
  clinicalEmailSchema,
  phoneNumberSchema,
  strongPasswordSchema,
  dateOfBirthSchema,
  dosageSchema,
  mrnSchema,
} from '@/lib/schemas/formValidation';
import { z } from 'zod';

describe('Form Validation Schemas', () => {
  // ─── Common Field Validation ───
  describe('Email Validation', () => {
    it('accepts valid emails', () => {
      expect(() => clinicalEmailSchema.parse('doctor@hospital.com')).not.toThrow();
      expect(() => clinicalEmailSchema.parse('patient+tag@example.org')).not.toThrow();
    });

    it('rejects invalid emails', () => {
      expect(() => clinicalEmailSchema.parse('not-an-email')).toThrow();
      expect(() => clinicalEmailSchema.parse('missing@domain')).toThrow();
    });

    it('rejects emails over 254 chars', () => {
      const longEmail = 'a'.repeat(250) + '@test.com';
      expect(() => clinicalEmailSchema.parse(longEmail)).toThrow();
    });
  });

  describe('Phone Number Validation', () => {
    it('accepts valid phone numbers', () => {
      expect(() => phoneNumberSchema.parse('+1 (555) 123-4567')).not.toThrow();
      expect(() => phoneNumberSchema.parse('+14155552368')).not.toThrow();
      expect(() => phoneNumberSchema.parse('555-123-4567')).not.toThrow();
    });

    it('accepts optional/empty phone', () => {
      expect(() => phoneNumberSchema.parse('')).not.toThrow();
      expect(() => phoneNumberSchema.parse(undefined)).not.toThrow();
    });

    it('rejects invalid phone numbers', () => {
      expect(() => phoneNumberSchema.parse('123')).toThrow();
      expect(() => phoneNumberSchema.parse('abc-def-ghij')).toThrow();
    });
  });

  describe('Password Strength Validation', () => {
    it('accepts strong passwords', () => {
      expect(() => strongPasswordSchema.parse('SecureP@ss123')).not.toThrow();
      expect(() => strongPasswordSchema.parse('MyHos@pital2024')).not.toThrow();
    });

    it('rejects weak passwords', () => {
      // Too short
      expect(() => strongPasswordSchema.parse('Pass1!A')).toThrow(/at least 8 characters/);
      
      // Missing uppercase
      expect(() => strongPasswordSchema.parse('password@123')).toThrow(/uppercase/);
      
      // Missing lowercase
      expect(() => strongPasswordSchema.parse('PASSWORD@123')).toThrow(/lowercase/);
      
      // Missing number
      expect(() => strongPasswordSchema.parse('Password@')).toThrow(/number/);
      
      // Missing special char
      expect(() => strongPasswordSchema.parse('Password123')).toThrow(/special character/);
    });

    it('rejects passwords over 128 chars', () => {
      const longPass = 'P@ssw0rd' + 'a'.repeat(121);
      expect(() => strongPasswordSchema.parse(longPass)).toThrow(/too long/);
    });
  });

  describe('MRN Validation', () => {
    it('accepts valid MRN formats', () => {
      expect(() => mrnSchema.parse('ABC12345')).not.toThrow();
      expect(() => mrnSchema.parse('H123456789ABC')).not.toThrow();
      expect(() => mrnSchema.parse('000001')).not.toThrow();
    });

    it('converts to uppercase', () => {
      const result = mrnSchema.parse('abc123def');
      expect(result).toBe('ABC123DEF');
    });

    it('rejects invalid formats', () => {
      expect(() => mrnSchema.parse('ab')).toThrow(); // Too short
      expect(() => mrnSchema.parse('abc-123')).toThrow(); // Invalid chars
      expect(() => mrnSchema.parse('a'.repeat(21))).toThrow(); // Too long
    });
  });

  describe('Date of Birth Validation', () => {
    it('accepts valid dates', () => {
      const validDob = new Date('1990-01-15');
      expect(() => dateOfBirthSchema.parse(validDob)).not.toThrow();
      expect(() => dateOfBirthSchema.parse('1990-01-15')).not.toThrow();
    });

    it('rejects future dates', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      expect(() => dateOfBirthSchema.parse(futureDate)).toThrow(/cannot be in the future/);
    });

    it('rejects unrealistic ages (>150)', () => {
      const ancientDate = new Date('1800-01-01');
      expect(() => dateOfBirthSchema.parse(ancientDate)).toThrow(/valid date of birth/);
    });

    it('accepts today as valid DOB (age 0)', () => {
      const today = new Date();
      expect(() => dateOfBirthSchema.parse(today)).not.toThrow();
    });
  });

  describe('Dosage Validation', () => {
    it('accepts valid dosages', () => {
      expect(() => dosageSchema.parse(500)).not.toThrow();
      expect(() => dosageSchema.parse(0.001)).not.toThrow();
      expect(() => dosageSchema.parse(1000)).not.toThrow();
    });

    it('rejects zero or negative dosages', () => {
      expect(() => dosageSchema.parse(0)).toThrow(/greater than 0/);
      expect(() => dosageSchema.parse(-100)).toThrow(/greater than 0/);
    });

    it('rejects dosages > 10,000', () => {
      expect(() => dosageSchema.parse(50000)).toThrow(/exceeds maximum/);
    });

    it('rejects non-numeric values', () => {
      expect(() => dosageSchema.parse(NaN)).toThrow();
    });
  });

  // ─── Form-Level Validation ───
  describe('Patient Demographics Schema', () => {
    const validPatient = {
      first_name: 'John',
      last_name: 'Doe',
      date_of_birth: '1990-01-15',
      gender: 'male',
    };

    it('accepts valid patient data', () => {
      expect(() => patientDemographicsSchema.parse(validPatient)).not.toThrow();
    });

    it('requires first_name', () => {
      const invalid = { ...validPatient, first_name: '' };
      expect(() => patientDemographicsSchema.parse(invalid)).toThrow();
    });

    it('requires last_name', () => {
      const invalid = { ...validPatient, last_name: '' };
      expect(() => patientDemographicsSchema.parse(invalid)).toThrow();
    });

    it('requires valid gender enum', () => {
      const invalid = { ...validPatient, gender: 'unknown' };
      expect(() => patientDemographicsSchema.parse(invalid)).toThrow();
    });

    it('accepts optional email and phone', () => {
      const withOptional = {
        ...validPatient,
        email: 'john@example.com',
        phone: '+15551234567',
      };
      expect(() => patientDemographicsSchema.parse(withOptional)).not.toThrow();
    });
  });

  describe('Prescription Schema - Clinical Validation', () => {
    const validRx = {
      patient_id: '550e8400-e29b-41d4-a716-446655440000',
      drug_name: 'Metformin',
      dose: 500,
      dose_unit: 'mg',
      frequency: 'BID',
      route: 'oral',
      duration_days: 30,
      indication: 'Type 2 Diabetes',
    };

    it('accepts valid prescription', () => {
      expect(() => prescriptionFormSchema.parse(validRx)).not.toThrow();
    });

    it('enforces frequency enum (prevents typos)', () => {
      const invalid = { ...validRx, frequency: 'DAILY' };
      expect(() => prescriptionFormSchema.parse(invalid)).toThrow();
    });

    it('enforces route enum (clinical safety)', () => {
      const invalid = { ...validRx, route: 'nasal' }; // Not in enum
      expect(() => prescriptionFormSchema.parse(invalid)).toThrow(/Please select a valid route/);
    });

    it('rejects duration > 365 days', () => {
      const invalid = { ...validRx, duration_days: 400 };
      expect(() => prescriptionFormSchema.parse(invalid)).toThrow(/cannot exceed 1 year/);
    });

    it('rejects high dosages', () => {
      const invalid = { ...validRx, dose: 50000 };
      expect(() => prescriptionFormSchema.parse(invalid)).toThrow(/exceeds maximum/);
    });

    it('requires indication field', () => {
      const invalid = { ...validRx, indication: '' };
      expect(() => prescriptionFormSchema.parse(invalid)).toThrow();
    });

    it('allows 0-11 refills', () => {
      expect(() => prescriptionFormSchema.parse({ ...validRx, refills: 0 })).not.toThrow();
      expect(() => prescriptionFormSchema.parse({ ...validRx, refills: 11 })).not.toThrow();
      expect(() => prescriptionFormSchema.parse({ ...validRx, refills: 12 })).toThrow();
    });
  });

  describe('Vital Signs Schema - Cross-Field Validation', () => {
    const baseVitals = {
      patient_id: '550e8400-e29b-41d4-a716-446655440000',
      recorded_at: new Date(),
    };

    it('requires at least ONE vital sign', () => {
      const invalid = baseVitals;
      expect(() => vitalSignsFormSchema.parse(invalid)).toThrow(
        /At least one vital sign must be recorded/
      );
    });

    it('accepts with systolic_bp only', () => {
      const valid = { ...baseVitals, systolic_bp: 120 };
      expect(() => vitalSignsFormSchema.parse(valid)).not.toThrow();
    });

    it('accepts with heart_rate only', () => {
      const valid = { ...baseVitals, heart_rate: 75 };
      expect(() => vitalSignsFormSchema.parse(valid)).not.toThrow();
    });

    it('enforces systolic BP range (50-250)', () => {
      expect(() => vitalSignsFormSchema.parse({ 
        ...baseVitals, 
        systolic_bp: 40 
      })).toThrow(/too low/);

      expect(() => vitalSignsFormSchema.parse({ 
        ...baseVitals, 
        systolic_bp: 300 
      })).toThrow(/too high/);
    });

    it('enforces heart rate range (20-200)', () => {
      expect(() => vitalSignsFormSchema.parse({ 
        ...baseVitals, 
        heart_rate: 10 
      })).toThrow(/too low/);

      expect(() => vitalSignsFormSchema.parse({ 
        ...baseVitals, 
        heart_rate: 250 
      })).toThrow(/too high/);
    });

    it('enforces temperature range (95-106°F)', () => {
      expect(() => vitalSignsFormSchema.parse({ 
        ...baseVitals, 
        temperature: 94 
      })).toThrow(/too low/);

      expect(() => vitalSignsFormSchema.parse({ 
        ...baseVitals, 
        temperature: 108 
      })).toThrow(/too high/);
    });
  });

  describe('Appointment Schema', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const validAppt = {
      patient_id: '550e8400-e29b-41d4-a716-446655440000',
      doctor_id: '660e8400-e29b-41d4-a716-446655440000',
      appointment_type: 'consultation' as const,
      scheduled_date: tomorrow,
      scheduled_time: '09:30',
      reason_for_visit: 'Annual checkup',
    };

    it('accepts valid appointment', () => {
      expect(() => appointmentFormSchema.parse(validAppt)).not.toThrow();
    });

    it('rejects past appointment dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const invalid = { ...validAppt, scheduled_date: yesterday };
      expect(() => appointmentFormSchema.parse(invalid)).toThrow(/must be in the future/);
    });

    it('enforces appointment_type enum', () => {
      const invalid = { ...validAppt, appointment_type: 'emergency' };
      expect(() => appointmentFormSchema.parse(invalid as any)).toThrow();
    });

    it('validates time format (HH:MM)', () => {
      expect(() => appointmentFormSchema.parse({ 
        ...validAppt, 
        scheduled_time: '25:00' 
      })).not.toThrow(); // Format only check, not range

      expect(() => appointmentFormSchema.parse({ 
        ...validAppt, 
        scheduled_time: '9:30' 
      })).toThrow(/Invalid time format/);
    });

    it('enforces duration between 15-480 minutes', () => {
      expect(() => appointmentFormSchema.parse({ 
        ...validAppt, 
        duration_minutes: 10 
      })).toThrow();

      expect(() => appointmentFormSchema.parse({ 
        ...validAppt, 
        duration_minutes: 500 
      })).toThrow();

      expect(() => appointmentFormSchema.parse({ 
        ...validAppt, 
        duration_minutes: 30 
      })).not.toThrow();
    });
  });
});

describe('Form Schema Type Inference', () => {
  it('infers correct TypeScript types', () => {
    const validPatient = {
      first_name: 'John',
      last_name: 'Doe',
      date_of_birth: new Date('1990-01-15'),
      gender: 'male' as const,
    };

    const result = patientDemographicsSchema.parse(validPatient);
    
    // These would be type-checked at compile time
    expect(result.first_name).toBe('John');
    expect(result.gender).toBe('male');
  });
});
