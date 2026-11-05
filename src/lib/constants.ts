/**
 * Application Constants
 * Centralized location for app-wide constants to prevent inline object/array literals in components
 * This helps prevent unnecessary re-renders in React components
 */

// ============================================================================
// Role & Permission Constants
// ============================================================================

export const USER_ROLES = {
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  NURSE: 'nurse',
  PHARMACIST: 'pharmacist',
  LAB_TECHNICIAN: 'lab_technician',
  RECEPTIONIST: 'receptionist',
  PATIENT: 'patient',
} as const;

export const ROLE_NAMES: Record<string, string> = {
  admin: 'Administrator',
  doctor: 'Doctor',
  nurse: 'Nurse',
  pharmacist: 'Pharmacist',
  lab_technician: 'Lab Technician',
  receptionist: 'Receptionist',
  patient: 'Patient',
};

// ============================================================================
// Status Constants
// ============================================================================

export const PATIENT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
} as const;

export const APPOINTMENT_STATUS = {
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
  RESCHEDULED: 'rescheduled',
} as const;

export const PRESCRIPTION_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
} as const;

export const LAB_TEST_STATUS = {
  ORDERED: 'ordered',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  APPROVED: 'approved',
  CANCELLED: 'cancelled',
} as const;

// ============================================================================
// Pagination Constants
// ============================================================================

export const DEFAULT_PAGE_SIZE = 25;
export const PAGINATION_SIZES = [10, 25, 50, 100];

// ============================================================================
// Date/Time Format Constants
// ============================================================================

export const DATE_FORMAT = 'MMM dd, yyyy';
export const TIME_FORMAT = 'h:mm a';
export const DATETIME_FORMAT = 'MMM dd, yyyy h:mm a';
export const ISO_DATE_FORMAT = 'yyyy-MM-dd';

// ============================================================================
// API Constants
// ============================================================================

export const API_TIMEOUT = 30000; // 30 seconds
export const API_RETRY_ATTEMPTS = 3;
export const API_RETRY_DELAY = 1000; // 1 second

// ============================================================================
// Cache Constants
// ============================================================================

export const CACHE_KEYS = {
  PATIENTS_LIST: 'patients_list',
  PATIENT_DETAIL: 'patient_detail',
  APPOINTMENTS: 'appointments',
  PRESCRIPTIONS: 'prescriptions',
  LAB_TESTS: 'lab_tests',
  USERS: 'users',
  HOSPITAL_CONFIG: 'hospital_config',
} as const;

export const CACHE_DURATIONS = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 30 * 60 * 1000, // 30 minutes
  LONG: 2 * 60 * 60 * 1000, // 2 hours
} as const;

// ============================================================================
// Validation Constants
// ============================================================================

export const VALIDATION_RULES = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^[\d\s\-\+\(\)]+$/,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_REQUIRES_UPPERCASE: true,
  PASSWORD_REQUIRES_NUMBER: true,
  PASSWORD_REQUIRES_SPECIAL_CHAR: true,
} as const;

// ============================================================================
// UI Constants
// ============================================================================

export const TOAST_DURATION = 3000; // 3 seconds
export const TOAST_POSITION = 'top-right';

export const LOADING_MESSAGES = {
  FETCHING_DATA: 'Fetching data...',
  SAVING: 'Saving changes...',
  DELETING: 'Deleting...',
  PROCESSING: 'Processing...',
} as const;

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  GENERIC_ERROR: 'An error occurred. Please try again.',
} as const;

// ============================================================================
// Performance Constants
// ============================================================================

export const PERFORMANCE_TARGETS = {
  INITIAL_LOAD_TIME: 3000, // 3 seconds
  PAGE_LOAD_TIME: 1500, // 1.5 seconds
  API_RESPONSE_TIME: 500, // 500ms
  RENDER_TIME: 200, // 200ms
} as const;

// ============================================================================
// Feature Flags
// ============================================================================

export const FEATURE_FLAGS = {
  ENABLE_ANALYTICS: true,
  ENABLE_ERROR_TRACKING: true,
  ENABLE_PERFORMANCE_MONITORING: true,
  ENABLE_A_B_TESTING: false,
} as const;

// ============================================================================
// Hospital Configuration
// ============================================================================

export const HOSPITAL_DEFAULTS = {
  TIMEZONE: 'UTC',
  CURRENCY: 'USD',
  DATE_FORMAT: 'MM/dd/yyyy',
  TIME_FORMAT: '24h',
} as const;

// ============================================================================
// Medical Constants
// ============================================================================

export const VITAL_SIGNS_NORMAL_RANGES = {
  TEMPERATURE: { min: 36.1, max: 37.2, unit: '°C' },
  HEART_RATE: { min: 60, max: 100, unit: 'bpm' },
  BLOOD_PRESSURE_SYSTOLIC: { min: 90, max: 120, unit: 'mmHg' },
  BLOOD_PRESSURE_DIASTOLIC: { min: 60, max: 80, unit: 'mmHg' },
  RESPIRATORY_RATE: { min: 12, max: 20, unit: 'breaths/min' },
  OXYGEN_SATURATION: { min: 95, max: 100, unit: '%' },
} as const;

export const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'] as const;

// ============================================================================
// Export Type Helpers
// ============================================================================

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
export type PatientStatus = (typeof PATIENT_STATUS)[keyof typeof PATIENT_STATUS];
export type AppointmentStatus = (typeof APPOINTMENT_STATUS)[keyof typeof APPOINTMENT_STATUS];
export type PrescriptionStatus = (typeof PRESCRIPTION_STATUS)[keyof typeof PRESCRIPTION_STATUS];
export type LabTestStatus = (typeof LAB_TEST_STATUS)[keyof typeof LAB_TEST_STATUS];
export type CacheKey = (typeof CACHE_KEYS)[keyof typeof CACHE_KEYS];
