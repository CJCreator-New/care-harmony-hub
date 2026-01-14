/**
 * Type Safety Utilities for CareSync HIMS
 * Provides safe type guards and helpers
 */

// Common types
export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  mrn: string;
  date_of_birth: string;
  phone?: string;
  email?: string;
}

export interface LabOrder {
  id: string;
  test_name: string;
  priority: 'normal' | 'high' | 'urgent' | null;
  status: 'pending' | 'collected' | 'in_progress' | 'completed';
  is_critical: boolean;
  patient?: Patient;
  test_category?: string;
  specimen_type?: string;
  created_at: string;
}

export interface Prescription {
  id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  status: 'active' | 'dispensed' | 'completed' | 'cancelled';
  priority?: 'normal' | 'high' | 'urgent';
  patient?: Patient;
  created_at: string;
}

export interface QueueEntry {
  id: string;
  queue_number: number;
  patient_id: string;
  patient?: Patient;
  status: 'waiting' | 'in_service' | 'completed';
  priority: 'normal' | 'high' | 'urgent' | 'emergency';
  department?: string;
  check_in_time: string;
  appointment_id?: string;
}

export interface VitalSign {
  id: string;
  patient_id: string;
  type: string;
  value: number;
  unit: string;
  recorded_at: string;
  recorded_by: string;
  notes?: string;
}

export interface HealthAlert {
  id: string;
  patient_id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  created_at: string;
  resolved: boolean;
}

/**
 * Type guard for Patient
 */
export const isPatient = (obj: unknown): obj is Patient => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'first_name' in obj &&
    'last_name' in obj &&
    'mrn' in obj
  );
};

/**
 * Type guard for array
 */
export const isArray = <T>(value: unknown): value is T[] => {
  return Array.isArray(value);
};

/**
 * Safe array access with default
 */
export const safeArrayAccess = <T>(
  arr: T[] | null | undefined,
  index: number,
  defaultValue: T
): T => {
  if (!arr || !Array.isArray(arr) || index < 0 || index >= arr.length) {
    return defaultValue;
  }
  return arr[index];
};

/**
 * Safe object property access
 */
export const safeGet = <T, K extends keyof T>(
  obj: T | null | undefined,
  key: K,
  defaultValue: T[K]
): T[K] => {
  if (!obj || typeof obj !== 'object') return defaultValue;
  return obj[key] ?? defaultValue;
};

/**
 * Safe string conversion
 */
export const safeString = (
  value: unknown,
  defaultValue: string = ''
): string => {
  if (value === null || value === undefined) return defaultValue;
  return String(value);
};

/**
 * Safe number conversion
 */
export const safeNumber = (
  value: unknown,
  defaultValue: number = 0
): number => {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
};

/**
 * Safe boolean conversion
 */
export const safeBoolean = (
  value: unknown,
  defaultValue: boolean = false
): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  if (typeof value === 'number') return value !== 0;
  return defaultValue;
};

/**
 * Filter null/undefined from array
 */
export const filterNullish = <T>(arr: (T | null | undefined)[]): T[] => {
  return arr.filter((item): item is T => item !== null && item !== undefined);
};

/**
 * Safe map operation
 */
export const safeMap = <T, U>(
  arr: T[] | null | undefined,
  fn: (item: T, index: number) => U
): U[] => {
  if (!arr || !Array.isArray(arr)) return [];
  return arr.map(fn);
};

/**
 * Safe filter operation
 */
export const safeFilter = <T>(
  arr: T[] | null | undefined,
  predicate: (item: T, index: number) => boolean
): T[] => {
  if (!arr || !Array.isArray(arr)) return [];
  return arr.filter(predicate);
};

/**
 * Safe find operation
 */
export const safeFind = <T>(
  arr: T[] | null | undefined,
  predicate: (item: T) => boolean,
  defaultValue: T | null = null
): T | null => {
  if (!arr || !Array.isArray(arr)) return defaultValue;
  return arr.find(predicate) ?? defaultValue;
};
