import { Page, expect } from '@playwright/test';

// Test data constants
export const TEST_DATA = {
  HOSPITAL: {
    name: 'Test General Hospital',
    address: '123 Test Street',
    city: 'Test City',
    state: 'Test State',
    zip: '12345',
    phone: '(555) 123-4567',
    email: 'admin@testgeneral.com',
    license: 'LIC123456'
  },
  
  ADMIN: {
    firstName: 'John',
    lastName: 'Admin',
    email: 'admin@testgeneral.com',
    password: 'TestPass123!'
  },
  
  PATIENT: {
    firstName: 'Jane',
    lastName: 'TestPatient',
    mrn: 'MRN-E2E-001',
    phone: '555-0123',
    email: 'jane.testpatient@example.com',
    dateOfBirth: '1985-06-15',
    gender: 'female',
    bloodType: 'O+',
    allergies: ['Penicillin', 'Shellfish'],
    chronicConditions: ['Hypertension']
  },
  
  VITALS: {
    bloodPressure: '140/90',
    heartRate: '78',
    temperature: '98.6',
    weight: '165',
    height: '5\'6"',
    respiratoryRate: '16',
    oxygenSaturation: '98',
    bmi: '26.6'
  },
  
  PRESCRIPTION: {
    medication: 'Lisinopril',
    dosage: '10mg',
    frequency: 'Once daily',
    duration: '30 days',
    instructions: 'Take with food in the morning',
    quantity: 30
  },
  
  LAB_ORDER: {
    testName: 'Complete Blood Count',
    testCode: 'CBC',
    category: 'Hematology',
    priority: 'normal',
    specimenType: 'Blood'
  }
};

// Role configuration
export const ROLES = {
  admin: { label: 'Administrator', permissions: ['*'] },
  doctor: { label: 'Doctor', permissions: ['consultations', 'prescriptions', 'lab_orders'] },
  nurse: { label: 'Nurse', permissions: ['vitals', 'patient_prep', 'queue'] },
  receptionist: { label: 'Receptionist', permissions: ['appointments', 'check_in', 'billing'] },
  pharmacist: { label: 'Pharmacist', permissions: ['prescriptions', 'inventory'] },
  lab_technician: { label: 'Lab Technician', permissions: ['lab_orders', 'results'] },
  patient: { label: 'Patient', permissions: ['own_records'] }
} as const;

export type UserRole = keyof typeof ROLES;

/**
 * Set test role using localStorage and reload page
 */
export async function setTestRole(page: Page, role: UserRole) {
  await page.evaluate((role) => {
    localStorage.setItem('testRole', role);
  }, role);
  await page.reload();
  await page.waitForLoadState('networkidle');
}

/**
 * Login with test credentials
 */
export async function loginAsTestUser(page: Page, role: UserRole = 'admin') {
  await page.goto('/hospital/login');
  
  await page.getByLabel('Email').fill(TEST_DATA.ADMIN.email);
  await page.getByLabel('Password').fill(TEST_DATA.ADMIN.password);
  await page.getByRole('button', { name: /sign in|login/i }).click();
  
  await expect(page).toHaveURL(/.*dashboard.*/);
  
  if (role !== 'admin') {
    await setTestRole(page, role);
  }
}

/**
 * Mock API responses for testing
 */
export async function setupApiMocks(page: Page) {
  // Mock patient data
  await page.route('**/patients**', async route => {
    const method = route.request().method();
    
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'patient-1',
          ...TEST_DATA.PATIENT,
          hospital_id: 'hospital-1',
          created_at: new Date().toISOString()
        }])
      });
    } else {
      await route.continue();
    }
  });

  // Mock queue data
  await page.route('**/queue**', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'queue-1',
          patient_id: 'patient-1',
          queue_number: 1,
          status: 'waiting',
          priority: 'normal',
          check_in_time: new Date().toISOString(),
          patient: TEST_DATA.PATIENT
        }])
      });
    } else {
      await route.continue();
    }
  });

  // Mock consultation data
  await page.route('**/consultations**', async route => {
    const method = route.request().method();
    
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'consultation-1',
          patient_id: 'patient-1',
          current_step: 1,
          status: 'in_progress',
          patient: TEST_DATA.PATIENT,
          vitals: TEST_DATA.VITALS,
          prescriptions: [],
          lab_orders: []
        })
      });
    } else {
      await route.continue();
    }
  });

  // Mock prescription data
  await page.route('**/prescriptions**', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'prescription-1',
          patient_id: 'patient-1',
          status: 'pending',
          items: [TEST_DATA.PRESCRIPTION],
          created_at: new Date().toISOString()
        })
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Fill form with validation
 */
export async function fillForm(page: Page, formData: Record<string, string>) {
  for (const [field, value] of Object.entries(formData)) {
    const input = page.getByLabel(new RegExp(field, 'i'));
    await expect(input).toBeVisible();
    await input.fill(value);
  }
}

/**
 * Complete consultation workflow step
 */
export async function completeConsultationStep(page: Page, stepNumber: number, data: Record<string, any>) {
  // Wait for step to be active
  await expect(page.getByText(`Step ${stepNumber}`)).toBeVisible();
  
  // Fill step-specific data
  switch (stepNumber) {
    case 1: // Chief Complaint
      if (data.chiefComplaint) {
        await page.getByLabel('Chief Complaint').fill(data.chiefComplaint);
      }
      if (data.duration) {
        await page.getByLabel('Duration').fill(data.duration);
      }
      break;
      
    case 2: // Physical Exam
      if (data.vitals) {
        for (const [field, value] of Object.entries(data.vitals)) {
          await page.getByLabel(new RegExp(field, 'i')).fill(String(value));
        }
      }
      break;
      
    case 3: // Diagnosis
      if (data.diagnosis) {
        await page.getByLabel('Primary Diagnosis').fill(data.diagnosis);
      }
      if (data.icdCode) {
        await page.getByLabel('ICD-10 Code').fill(data.icdCode);
      }
      break;
      
    case 4: // Treatment Plan
      if (data.treatmentPlan) {
        await page.getByLabel('Treatment Plan').fill(data.treatmentPlan);
      }
      break;
      
    case 5: // Summary
      if (data.prescriptions) {
        for (const prescription of data.prescriptions) {
          await page.getByRole('button', { name: /add.*prescription/i }).click();
          await fillForm(page, prescription);
        }
      }
      break;
  }
  
  // Proceed to next step or complete
  if (stepNumber < 5) {
    await page.getByRole('button', { name: /next|continue/i }).click();
  } else {
    await page.getByRole('button', { name: /complete|finish/i }).click();
  }
}