/**
 * Standardized Form Validation Schemas
 * 
 * Centralized Zod schemas for common form patterns across CareSync HIMS
 * Ensures consistency and type safety for all input validation
 * 
 * Clinical rules are embedded in schemas to prevent invalid data at source
 */

import { z } from 'zod';
import { parseISO, isValid } from 'date-fns';

// ─── Common Field Schemas ───────────────────────────────────────

/** Email with clinical domain validation */
export const clinicalEmailSchema = z
  .string()
  .email('Please enter a valid email address')
  .max(254, 'Email too long');

/** Phone number (E.164 format or loose formats) */
export const phoneNumberSchema = z
  .string()
  .regex(
    /^(\+?[1-9]\d{1,14}|[\d\s\-()]{10,20})$/,
    'Please enter a valid phone number'
  )
  .optional()
  .or(z.literal(''));

/** Numeric password with strength requirements */
export const strongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/\d/, 'Must contain at least one number')
  .regex(/[!@#$%^&*]/, 'Must contain at least one special character (!@#$%^&*)')
  .max(128, 'Password too long');

/** Medical Record Number (MRN) - alphanumeric, 6-20 chars */
export const mrnSchema = z
  .string()
  .regex(/^[A-Z0-9]{6,20}$/, 'MRN must be 6-20 alphanumeric characters')
  .toUpperCase();

/** Date of birth - ensures valid date in past */
export const dateOfBirthSchema = z
  .string()
  .or(z.date())
  .pipe(
    z.coerce.date()
      .refine(
        (date) => {
          const now = new Date();
          const age = now.getFullYear() - date.getFullYear();
          return age >= 0 && age <= 150; // Realistic age range
        },
        'Please enter a valid date of birth'
      )
      .refine(
        (date) => date <= new Date(),
        'Date of birth cannot be in the future'
      )
  );

/** Medical note text - prevents XSS but allows clinical notation */
export const medicalNoteSchema = z
  .string()
  .min(1, 'Note is required')
  .max(5000, 'Note exceeds maximum length')
  .regex(
    /^[a-zA-Z0-9\s\n\.\,\-\(\)\/\:;']+$/,
    'Note contains invalid characters'
  );

/** ICD-10 code format (e.g., A00, B99.01) */
export const icd10CodeSchema = z
  .string()
  .regex(/^[A-Z]\d{2}(\.\d{1,2})?$/, 'Invalid ICD-10 code format')
  .toUpperCase();

/** CPT code format (5 digits) */
export const cptCodeSchema = z
  .string()
  .regex(/^\d{5}$/, 'CPT code must be 5 digits')
  .transform(v => parseInt(v));

/** Drug name - allows brand and generic names */
export const drugNameSchema = z
  .string()
  .min(1, 'Drug name is required')
  .max(100, 'Drug name too long')
  .regex(
    /^[a-zA-Z0-9\s\-\(\)]+$/,
    'Drug name contains invalid characters'
  );

/** Dosage - numeric with realistic limits */
export const dosageSchema = z
  .number()
  .min(0.001, 'Dose must be greater than 0')
  .max(10000, 'Dose exceeds maximum allowed')
  .refine(
    (val) => !Number.isNaN(val),
    'Dosage must be a valid number'
  );

/** Frequency enum for medication */
export const medicationFrequencySchema = z.enum([
  'once_daily',
  'BID',
  'TID',
  'QID',
  'Q4H',
  'Q6H',
  'Q8H',
  'Q12H',
  'weekly',
  'PRN',
  'as_directed'
], {
  errorMap: () => ({ message: 'Please select a valid frequency' })
});

/** Route of administration */
export const routeOfAdministrationSchema = z.enum([
  'oral',
  'intravenous',
  'intramuscular',
  'subcutaneous',
  'topical',
  'inhalation',
  'rectal',
  'sublingual',
  'transdermal',
  'intranasal'
], {
  errorMap: () => ({ message: 'Please select a valid route' })
});

/** Duration in days with realistic limits */
export const durationDaysSchema = z
  .number()
  .int('Duration must be a whole number')
  .min(1, 'Duration must be at least 1 day')
  .max(365, 'Duration cannot exceed 1 year');

/** Vital sign ranges with clinical appropriateness */
export const bloodPressureSystolicSchema = z
  .number()
  .min(50, 'Systolic too low')
  .max(250, 'Systolic too high');

export const bloodPressureDiastolicSchema = z
  .number()
  .min(30, 'Diastolic too low')
  .max(150, 'Diastolic too high');

export const heartRateSchema = z
  .number()
  .min(20, 'Heart rate too low')
  .max(200, 'Heart rate too high');

export const temperatureSchema = z
  .number()
  .min(95, 'Temperature too low (° F)')
  .max(106, 'Temperature too high (°F)');

export const bloodGlucoseSchema = z
  .number()
  .min(40, 'Blood glucose too low (mg/dL)')
  .max(500, 'Blood glucose too high (mg/dL)');

// ─── Form-Level Schemas ────────────────────────────────────────

/** Patient Demographics Form */
export const patientDemographicsSchema = z.object({
  first_name: z.string().min(1, 'First name required').max(50),
  last_name: z.string().min(1, 'Last name required').max(50),
  date_of_birth: dateOfBirthSchema,
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']),
  phone: phoneNumberSchema,
  email: clinicalEmailSchema.optional(),
  mrn: mrnSchema.optional(),
});

/** Medication/Prescription Form */
export const prescriptionFormSchema = z.object({
  patient_id: z.string().uuid('Invalid patient ID'),
  drug_name: drugNameSchema,
  dose: dosageSchema,
  dose_unit: z.enum(['mg', 'mcg', 'g', 'ml', 'units']),
  frequency: medicationFrequencySchema,
  route: routeOfAdministrationSchema,
  duration_days: durationDaysSchema,
  refills: z.number().int().min(0).max(11).default(0),
  instructions: z.string().max(500).optional(),
  indication: z.string().min(1, 'Indication required').max(200),
});

/** Vital Signs Entry Form */
export const vitalSignsFormSchema = z.object({
  patient_id: z.string().uuid('Invalid patient ID'),
  recorded_at: z.date(),
  systolic_bp: bloodPressureSystolicSchema.optional(),
  diastolic_bp: bloodPressureDiastolicSchema.optional(),
  heart_rate: heartRateSchema.optional(),
  temperature: temperatureSchema.optional(),
  respiration_rate: z.number().min(8).max(40).optional(),
  blood_glucose: bloodGlucoseSchema.optional(),
  o2_saturation: z.number().min(70).max(100).optional(),
  notes: medicalNoteSchema.optional(),
}).refine(
  (data) => {
    // At least one vital must be recorded
    return data.systolic_bp !== undefined || 
           data.heart_rate !== undefined || 
           data.temperature !== undefined || 
           data.blood_glucose !== undefined;
  },
  { message: 'At least one vital sign must be recorded' }
);

/** Lab Order Form */
export const labOrderFormSchema = z.object({
  patient_id: z.string().uuid('Invalid patient ID'),
  test_code: z.string().min(1, 'Test code required'),
  test_name: z.string().min(1, 'Test name required').max(200),
  priority: z.enum(['routine', 'urgent', 'stat']).default('routine'),
  clinical_indication: z.string().min(1, 'Clinical indication required').max(500),
  fasting_required: z.boolean().default(false),
  special_instructions: z.string().max(500).optional(),
});

/** Appointment Scheduling Form */
export const appointmentFormSchema = z.object({
  patient_id: z.string().uuid('Invalid patient ID'),
  doctor_id: z.string().uuid('Doctor required'),
  appointment_type: z.enum([
    'consultation',
    'follow_up',
    'procedure',
    'lab_review',
    'routine_checkup'
  ]),
  scheduled_date: z.date().refine(
    (date) => date > new Date(),
    'Appointment must be in the future'
  ),
  scheduled_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
  duration_minutes: z.number().int().min(15).max(480).default(30),
  reason_for_visit: z.string().min(1, 'Reason required').max(300),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  notes: z.string().max(500).optional(),
});

/** Clinical Note Form */
export const clinicalNoteFormSchema = z.object({
  patient_id: z.string().uuid('Invalid patient ID'),
  encounter_id: z.string().uuid('Invalid encounter ID'),
  note_type: z.enum(['subjective', 'objective', 'assessment', 'plan', 'progress', 'discharge']),
  content: medicalNoteSchema,
  icd10_codes: z.array(icd10CodeSchema).optional(),
});

export type PatientDemographics = z.infer<typeof patientDemographicsSchema>;
export type Prescription = z.infer<typeof prescriptionFormSchema>;
export type VitalSigns = z.infer<typeof vitalSignsFormSchema>;
export type LabOrder = z.infer<typeof labOrderFormSchema>;
export type Appointment = z.infer<typeof appointmentFormSchema>;
export type ClinicalNote = z.infer<typeof clinicalNoteFormSchema>;
