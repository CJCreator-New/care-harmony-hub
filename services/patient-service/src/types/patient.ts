import { z } from 'zod';

// Base patient schema
export const PatientSchema = z.object({
  id: z.string().uuid(),
  hospital_id: z.string().uuid(),
  medical_record_number: z.string().min(1).max(50),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  date_of_birth: z.string().datetime(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(20).optional(),
  address: z.object({
    street: z.string().min(1).max(200),
    city: z.string().min(1).max(100),
    state: z.string().min(1).max(100),
    zip_code: z.string().min(5).max(10),
    country: z.string().min(1).max(100),
  }).optional(),
  emergency_contact: z.object({
    name: z.string().min(1).max(200),
    relationship: z.string().min(1).max(50),
    phone: z.string().min(10).max(20),
  }).optional(),
  insurance_info: z.object({
    provider: z.string().min(1).max(200),
    policy_number: z.string().min(1).max(100),
    group_number: z.string().optional(),
  }).optional(),
  medical_history: z.array(z.object({
    condition: z.string().min(1).max(500),
    diagnosis_date: z.string().datetime(),
    status: z.enum(['active', 'resolved', 'chronic']),
    notes: z.string().optional(),
  })).default([]),
  allergies: z.array(z.object({
    allergen: z.string().min(1).max(200),
    severity: z.enum(['mild', 'moderate', 'severe']),
    reaction: z.string().optional(),
  })).default([]),
  current_medications: z.array(z.object({
    name: z.string().min(1).max(200),
    dosage: z.string().min(1).max(100),
    frequency: z.string().min(1).max(100),
    prescribed_date: z.string().datetime(),
    prescribing_physician: z.string().min(1).max(200),
  })).default([]),
  vital_signs: z.object({
    blood_pressure: z.string().optional(),
    heart_rate: z.number().int().positive().optional(),
    temperature: z.number().positive().optional(),
    weight: z.number().positive().optional(),
    height: z.number().positive().optional(),
    bmi: z.number().positive().optional(),
    oxygen_saturation: z.number().min(0).max(100).optional(),
    recorded_at: z.string().datetime(),
  }).optional(),
  status: z.enum(['active', 'inactive', 'deceased']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  created_by: z.string().uuid(),
  updated_by: z.string().uuid(),
});

// Patient creation schema (without auto-generated fields)
export const CreatePatientSchema = PatientSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  created_by: true,
  updated_by: true,
});

// Patient update schema
export const UpdatePatientSchema = CreatePatientSchema.partial();

// Patient search/filter schema
export const PatientSearchSchema = z.object({
  hospital_id: z.string().uuid(),
  medical_record_number: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  date_of_birth: z.string().datetime().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  status: z.enum(['active', 'inactive', 'deceased']).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  sort_by: z.enum(['created_at', 'updated_at', 'last_name', 'first_name']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

// Type definitions
export type Patient = z.infer<typeof PatientSchema>;
export type CreatePatient = z.infer<typeof CreatePatientSchema>;
export type UpdatePatient = z.infer<typeof UpdatePatientSchema>;
export type PatientSearch = z.infer<typeof PatientSearchSchema>;

// API response types
export interface PatientResponse {
  data: Patient;
  success: true;
}

export interface PatientsResponse {
  data: Patient[];
  total: number;
  limit: number;
  offset: number;
  success: true;
}

export interface PatientSearchResponse extends PatientsResponse {}

// Error response type
export interface ErrorResponse {
  error: string;
  message: string;
  success: false;
  code?: string;
}

// Common API response union
export type ApiResponse<T> = T | ErrorResponse;