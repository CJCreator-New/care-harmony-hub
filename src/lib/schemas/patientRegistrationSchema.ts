import { z } from 'zod';

/**
 * HP-2 PR2: PatientRegistrationForm Validation Schema
 * 
 * Comprehensive patient registration validation with:
 * - Personal information (name, DOB, gender)
 * - Contact info (email, phone with international format support)
 * - Address (multi-field with postal validation)
 * - Optional emergency contact and insurance
 * - Cross-field validation (DOB → age calculation)
 * - HIPAA compliance (no PHI logging)
 */

// Phone regex supporting international formats: +1-234-567-8900, +44 20 7946 0958, etc.
const INTERNATIONAL_PHONE_REGEX = /^(\+\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/;

// Email regex with basic validation (RFC 5322 simplified)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Name regex: alphanumeric, spaces, hyphens, apostrophes (supports O'Brien, Jean-Luc, etc.)
const NAME_REGEX = /^[a-zA-Z\s\-']{2,50}$/;

// Postal code patterns for common countries
const POSTAL_CODE_PATTERNS: Record<string, RegExp> = {
  US: /^\d{5}(-\d{4})?$/, // 12345 or 12345-6789
  CA: /^[A-Z]\d[A-Z] \d[A-Z]\d$/, // A1A 1A1
  UK: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i, // SW1A 1AA
  AU: /^\d{4}$/, // 4000
  NZ: /^\d{4}$/, // 4000
  DE: /^\d{5}$/, // 10115
  FR: /^\d{5}$/, // 75001
  JP: /^\d{3}-\d{4}$/, // 100-0005
  IN: /^\d{6}$/, // 110001
};

/**
 * Calculate age from date of birth
 * Returns age in years, validates realistic range (0-150)
 */
export function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Format phone number to consistent display format
 * Input: raw international phone (e.g., "+12345678900" or "234-567-8900")
 * Output: standardized format (e.g., "+1 (234) 567-8900" or "+44 789 4673")
 */
export function formatPhoneNumber(phoneRaw: string): string {
  // Remove all non-digit characters except leading +
  const digits = phoneRaw.replace(/[^\d+]/g, '');
  
  if (!digits.startsWith('+')) {
    // Assume US format if no country code
    const match = digits.match(/^1?(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `+1 (${match[1]}) ${match[2]}-${match[3]}`;
    }
  } else {
    // International format - return with basic spacing
    return digits.replace(/^(\+\d{1,3})(\d{1,14})$/, '$1 $2');
  }
  
  return phoneRaw; // Return as-is if no match
}

/**
 * Validate postal code based on country
 */
export function validatePostalCode(code: string, country: string): boolean {
  const pattern = POSTAL_CODE_PATTERNS[country.toUpperCase()];
  if (!pattern) {
    // If country pattern not found, accept 3-10 character alphanumeric
    return /^[A-Z0-9\s\-]{3,10}$/i.test(code);
  }
  return pattern.test(code);
}

// ============================================================================
// MAIN SCHEMA DEFINITIONS
// ============================================================================

/**
 * Emergency Contact Schema (nested object, optional)
 */
export const EmergencyContactSchema = z.object({
  fullName: z.string()
    .min(2, 'Emergency contact name must be at least 2 characters')
    .max(100, 'Name too long'),
  relationship: z.enum(['spouse', 'parent', 'child', 'sibling', 'other'], {
    errorMap: () => ({ message: 'Select a valid relationship' }),
  }),
  phoneNumber: z.string()
    .regex(INTERNATIONAL_PHONE_REGEX, 'Invalid phone number format'),
}).strict().optional();

/**
 * Insurance Schema (nested object, optional)
 */
export const InsuranceSchema = z.object({
  providerId: z.string()
    .min(3, 'Provider ID must be at least 3 characters')
    .optional()
    .or(z.literal('')), // Allow empty string
  policyNumber: z.string()
    .min(5, 'Policy number must be at least 5 characters')
    .optional()
    .or(z.literal('')), // Allow empty string
  groupNumber: z.string()
    .optional()
    .or(z.literal('')),
}).strict().optional();

/**
 * Address Schema (nested object)
 */
export const AddressSchema = z.object({
  street: z.string()
    .min(5, 'Street address must be at least 5 characters')
    .max(100, 'Street address too long'),
  city: z.string()
    .min(2, 'City must be at least 2 characters')
    .max(50, 'City name too long'),
  state: z.string()
    .min(2, 'State/Province must be at least 2 characters')
    .max(50, 'State name too long'),
  postalCode: z.string()
    .min(3, 'Postal code must be at least 3 characters')
    .max(20, 'Postal code too long'),
  country: z.string()
    .min(2, 'Country must be selected')
    .max(50, 'Country name too long'),
}).strict()
  .refine(
    (data) => validatePostalCode(data.postalCode, data.country),
    {
      message: 'Invalid postal code format for selected country',
      path: ['postalCode'], // Focus error on postalCode field
    }
  );

/**
 * Patient Registration Form Schema (main)
 * 
 * Clinical validations:
 * - Age must be 0-150 years (realistic human lifespan)
 * - DOB cannot be in future
 * - Gender from clinical standard enum
 * - Email format validation
 * - Phone format with international support
 * - Address multi-field validation
 * - Optional emergency contact and insurance
 */
export const PatientRegistrationSchema = z.object({
  firstName: z.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name too long')
    .regex(NAME_REGEX, 'First name contains invalid characters'),
  
  lastName: z.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name too long')
    .regex(NAME_REGEX, 'Last name contains invalid characters'),
  
  dateOfBirth: z.coerce.date()
    .max(new Date(), 'Date of birth cannot be in the future')
    .refine(
      (dob) => {
        const age = calculateAge(dob);
        return age >= 0 && age <= 150;
      },
      'Patient age must be between 0 and 150 years'
    ),
  
  gender: z.enum(['M', 'F', 'Other', 'Prefer not to say'], {
    errorMap: () => ({ message: 'Please select a gender identity' }),
  }),
  
  email: z.string()
    .email('Invalid email format')
    .max(100, 'Email too long'),
  
  phoneNumber: z.string()
    .regex(INTERNATIONAL_PHONE_REGEX, 'Invalid phone number format')
    .transform(formatPhoneNumber),
  
  address: AddressSchema,
  
  emergencyContact: EmergencyContactSchema,
  
  insurance: InsuranceSchema,
  
  hospitalId: z.string().uuid('Invalid hospital ID'),
  
}).strict();

// ============================================================================
// TYPE EXPORTS & UTILITY FUNCTIONS
// ============================================================================

export type PatientRegistrationFormData = z.infer<typeof PatientRegistrationSchema>;
export type EmergencyContactData = z.infer<typeof EmergencyContactSchema>;
export type InsuranceData = z.infer<typeof InsuranceSchema>;
export type AddressData = z.infer<typeof AddressSchema>;

/**
 * Validate complete registration data
 * Useful for final submission validation before Supabase insert
 */
export async function validatePatientRegistration(
  data: unknown
): Promise<{ valid: boolean; errors?: Record<string, string> }> {
  try {
    await PatientRegistrationSchema.parseAsync(data);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { valid: false, errors };
    }
    return { valid: false, errors: { _error: 'Validation failed' } };
  }
}

/**
 * Check if address requires autocomplete based on country
 * Some countries have strong postal systems (US, UK, CA)
 * Others may require manual entry
 */
export function shouldUseAddressAutocomplete(country: string): boolean {
  const autocompleteCountries = ['US', 'UK', 'CA', 'AU', 'NZ', 'DE', 'FR', 'JP'];
  return autocompleteCountries.includes(country.toUpperCase());
}

/**
 * Default empty insurance object for optional field initialization
 */
export const DEFAULT_INSURANCE: InsuranceData = {
  providerId: '',
  policyNumber: '',
  groupNumber: '',
};

/**
 * Default empty emergency contact for optional field initialization
 */
export const DEFAULT_EMERGENCY_CONTACT: EmergencyContactData = {};
