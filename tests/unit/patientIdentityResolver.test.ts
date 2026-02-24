import { describe, it, expect } from 'vitest';

// T-75: Patient identity resolver
// Ensures that patient display names are built correctly and MRN format is validated

interface PatientProfile {
  first_name: string | null;
  last_name: string | null;
  mrn: string | null;
  date_of_birth: string | null;
}

function resolveDisplayName(patient: PatientProfile): string {
  const first = patient.first_name?.trim() ?? '';
  const last = patient.last_name?.trim() ?? '';
  const full = [first, last].filter(Boolean).join(' ');
  return full || 'Unknown Patient';
}

const MRN_REGEX = /^[A-Z]{3}-\d{6}$/;

function isValidMRN(mrn: string | null): boolean {
  if (!mrn) return false;
  return MRN_REGEX.test(mrn);
}

function resolvePatientAge(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

describe('Patient Identity Resolver (T-75)', () => {
  it('builds full name from first and last', () => {
    expect(resolveDisplayName({ first_name: 'John', last_name: 'Doe', mrn: null, date_of_birth: null })).toBe('John Doe');
  });

  it('returns first name only when last is missing', () => {
    expect(resolveDisplayName({ first_name: 'Jane', last_name: null, mrn: null, date_of_birth: null })).toBe('Jane');
  });

  it('returns "Unknown Patient" when both names are null', () => {
    expect(resolveDisplayName({ first_name: null, last_name: null, mrn: null, date_of_birth: null })).toBe('Unknown Patient');
  });

  it('trims whitespace from names', () => {
    expect(resolveDisplayName({ first_name: '  Alice ', last_name: ' Smith  ', mrn: null, date_of_birth: null })).toBe('Alice Smith');
  });

  it('validates correct MRN format (ABC-123456)', () => {
    expect(isValidMRN('ABC-123456')).toBe(true);
  });

  it('rejects lowercase MRN prefix', () => {
    expect(isValidMRN('abc-123456')).toBe(false);
  });

  it('rejects MRN with wrong digit count', () => {
    expect(isValidMRN('ABC-12345')).toBe(false);
    expect(isValidMRN('ABC-1234567')).toBe(false);
  });

  it('rejects null MRN', () => {
    expect(isValidMRN(null)).toBe(false);
  });

  it('resolves patient age correctly', () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 30);
    const age = resolvePatientAge(dob.toISOString());
    expect(age).toBe(30);
  });

  it('returns null for null date_of_birth', () => {
    expect(resolvePatientAge(null)).toBeNull();
  });
});
