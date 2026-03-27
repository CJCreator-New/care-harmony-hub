/**
 * Test Data Fixtures for E2E Tests
 * 
 * Creates consistent test patients, prescriptions, and clinical data
 * for reproducible multi-role workflow tests.
 * 
 * Usage:
 *   const patient = await createTestPatient({ name: 'John Doe', age: 45 });
 *   const prescription = await createTestPrescription(patient.id, { medication: 'Penicillin' });
 */

export interface TestPatient {
  id: string;
  uhid: string;
  name: string;
  age: number;
  gender: 'M' | 'F';
  weight: number;
  bloodType: string;
  allergies: string[];
}

export interface TestPrescription {
  id: string;
  patientId: string;
  medication: string;
  dosage: string;
  frequency: string;
  route: string;
  duration: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'dispensed' | 'completed';
}

/**
 * Create a test patient with realistic clinical data
 * 
 * If hospital_id is not provided, uses the test hospital from env
 */
export async function createTestPatient(overrides?: Partial<TestPatient>): Promise<TestPatient> {
  const now = Date.now();
  const testId = `test_${now}`;

  const patient: TestPatient = {
    id: `patient_${testId}`,
    uhid: `UHID${testId}`,
    name: 'Test Patient',
    age: 45,
    gender: 'M',
    weight: 75,
    bloodType: 'O+',
    allergies: [],
    ...overrides,
  };

  // For E2E tests without real backend, we'll store in sessionStorage
  if (typeof window !== 'undefined') {
    const patients = JSON.parse(window.sessionStorage.getItem('test_patients') || '{}');
    patients[patient.id] = patient;
    window.sessionStorage.setItem('test_patients', JSON.stringify(patients));
  }

  return patient;
}

/**
 * Create a test prescription for a patient
 */
export async function createTestPrescription(
  patientId: string,
  overrides?: Partial<TestPrescription>
): Promise<TestPrescription> {
  const now = Date.now();
  const testId = `test_${now}`;

  const prescription: TestPrescription = {
    id: `rx_${testId}`,
    patientId,
    medication: 'Penicillin',
    dosage: '500mg',
    frequency: 'TID',
    route: 'oral',
    duration: '7 days',
    status: 'draft',
    ...overrides,
  };

  if (typeof window !== 'undefined') {
    const prescriptions = JSON.parse(window.sessionStorage.getItem('test_prescriptions') || '{}');
    prescriptions[prescription.id] = prescription;
    window.sessionStorage.setItem('test_prescriptions', JSON.stringify(prescriptions));
  }

  return prescription;
}

/**
 * Retrieve a test patient by ID
 */
export async function getTestPatient(patientId: string): Promise<TestPatient | null> {
  if (typeof window === 'undefined') return null;
  const patients = JSON.parse(window.sessionStorage.getItem('test_patients') || '{}');
  return patients[patientId] || null;
}

/**
 * Retrieve a test prescription by ID
 */
export async function getTestPrescription(prescriptionId: string): Promise<TestPrescription | null> {
  if (typeof window === 'undefined') return null;
  const prescriptions = JSON.parse(window.sessionStorage.getItem('test_prescriptions') || '{}');
  return prescriptions[prescriptionId] || null;
}

/**
 * Update test prescription status
 */
export async function updateTestPrescriptionStatus(
  prescriptionId: string,
  status: TestPrescription['status']
): Promise<void> {
  if (typeof window === 'undefined') return;
  const prescriptions = JSON.parse(window.sessionStorage.getItem('test_prescriptions') || '{}');
  if (prescriptions[prescriptionId]) {
    prescriptions[prescriptionId].status = status;
    window.sessionStorage.setItem('test_prescriptions', JSON.stringify(prescriptions));
  }
}

/**
 * Clear all test data (call in test teardown)
 */
export async function clearTestData(): Promise<void> {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem('test_patients');
  window.sessionStorage.removeItem('test_prescriptions');
}
