/**
 * Test User Configuration
 * Role-based test credentials for all CareSync user types
 */

export type UserRole = 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'pharmacist' | 'lab_tech' | 'patient';

export interface TestUser {
  email: string;
  password: string;
  role: UserRole;
  displayName: string;
  hospitalId?: string;
  permissions: string[];
}

/**
 * Pre-configured test users for each role
 */
export const TEST_USERS: Record<UserRole, TestUser> = {
  admin: {
    email: 'admin@testgeneral.com',
    password: 'TestPass123!',
    role: 'admin',
    displayName: 'Admin User',
    hospitalId: 'test-hospital-001',
    permissions: ['manage_users', 'manage_settings', 'view_reports', 'manage_billing'],
  },
  doctor: {
    email: 'doctor@testgeneral.com',
    password: 'TestPass123!',
    role: 'doctor',
    displayName: 'Dr. Jane Smith',
    hospitalId: 'test-hospital-001',
    permissions: ['view_patients', 'create_prescriptions', 'manage_appointments', 'view_lab_results'],
  },
  nurse: {
    email: 'nurse@testgeneral.com',
    password: 'TestPass123!',
    role: 'nurse',
    displayName: 'Nancy Nurse',
    hospitalId: 'test-hospital-001',
    permissions: ['view_patients', 'record_vitals', 'triage_patients', 'manage_queue'],
  },
  receptionist: {
    email: 'reception@testgeneral.com',
    password: 'TestPass123!',
    role: 'receptionist',
    displayName: 'Rachel Receptionist',
    hospitalId: 'test-hospital-001',
    permissions: ['register_patients', 'schedule_appointments', 'check_in_patients', 'manage_queue'],
  },
  pharmacist: {
    email: 'pharmacy@testgeneral.com',
    password: 'TestPass123!',
    role: 'pharmacist',
    displayName: 'Phil Pharmacist',
    hospitalId: 'test-hospital-001',
    permissions: ['view_prescriptions', 'dispense_medications', 'manage_inventory', 'drug_interactions'],
  },
  lab_tech: {
    email: 'lab@testgeneral.com',
    password: 'TestPass123!',
    role: 'lab_tech',
    displayName: 'Larry LabTech',
    hospitalId: 'test-hospital-001',
    permissions: ['view_lab_orders', 'enter_results', 'manage_samples', 'quality_control'],
  },
  patient: {
    email: 'patient@testgeneral.com',
    password: 'TestPass123!',
    role: 'patient',
    displayName: 'John Patient',
    hospitalId: 'test-hospital-001',
    permissions: ['view_own_records', 'book_appointments', 'view_prescriptions', 'message_provider'],
  },
};

/**
 * Get test user by role
 */
export function getTestUser(role: UserRole): TestUser {
  return TEST_USERS[role];
}

/**
 * Get all test users
 */
export function getAllTestUsers(): TestUser[] {
  return Object.values(TEST_USERS);
}

/**
 * Get clinical staff users (excludes patient)
 */
export function getClinicalStaffUsers(): TestUser[] {
  return Object.values(TEST_USERS).filter(user => user.role !== 'patient');
}

/**
 * Check if user has a specific permission
 */
export function userHasPermission(role: UserRole, permission: string): boolean {
  return TEST_USERS[role].permissions.includes(permission);
}
