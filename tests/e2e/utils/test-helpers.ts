import { Page, expect } from '@playwright/test';

// Generate unique identifier for this test run to ensure fresh data
const RUN_ID = Date.now().toString().slice(-6);

// Test data constants
export const TEST_DATA = {
  HOSPITAL: {
    name: `Test General Hospital ${RUN_ID}`,
    address: '123 Test Street',
    city: 'Test City',
    state: 'Test State',
    zip: '12345',
    phone: '(555) 123-4567',
    email: `hospital_${RUN_ID}@testgeneral.com`,
    license: `LIC${RUN_ID}`
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

const ROLE_LOGIN_EMAIL: Record<UserRole, string> = {
  admin: 'admin@testgeneral.com',
  doctor: 'doctor@testgeneral.com',
  nurse: 'nurse@testgeneral.com',
  receptionist: 'receptionist@testgeneral.com',
  pharmacist: 'pharmacist@testgeneral.com',
  lab_technician: 'labtech@testgeneral.com',
  patient: 'patient@testgeneral.com',
};

export type UserRole = keyof typeof ROLES;
const E2E_MOCK_AUTH_STORAGE_KEY = 'e2e-mock-auth-user';

/**
 * Authenticate as a specific role using live login UI or localStorage mock.
 * Exported so T-xx spec files can import instead of duplicating inline.
 */
export async function loginAs(page: Page, role: string): Promise<void> {
  const email =
    process.env[`E2E_${role.toUpperCase()}_EMAIL`] ||
    `${role.toLowerCase().replace('_', '')}@testgeneral.com`;
  const password =
    process.env[`E2E_${role.toUpperCase()}_PASSWORD`] || 'TestPass123!';

  await page.addInitScript(
    ({ em, r }) => {
      window.localStorage.setItem('e2e-mock-auth-user', em);
      window.localStorage.setItem('preferredRole', r);
      window.localStorage.setItem('testRole', r);
    },
    { em: email, r: role }
  );

  await page.goto('/dashboard');
  if (page.url().includes('/hospital/login')) {
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();
    await page.waitForLoadState('networkidle');
  }
}

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
 * Register test hospital if it doesn't exist
 */
export async function registerTestHospital(page: Page) {
  await page.goto('/hospital/signup');
  await page.waitForLoadState('networkidle');
  
  // Step 1: Hospital Info
  await page.getByLabel(/Hospital Name/i).fill(TEST_DATA.HOSPITAL.name);
  await page.getByLabel(/Address/i).fill(TEST_DATA.HOSPITAL.address);
  await page.getByLabel(/City/i).fill(TEST_DATA.HOSPITAL.city);
  await page.getByLabel(/State/i).fill(TEST_DATA.HOSPITAL.state);
  await page.getByLabel(/ZIP Code/i).fill(TEST_DATA.HOSPITAL.zip);
  await page.getByLabel(/Phone/i).fill(TEST_DATA.HOSPITAL.phone);
  await page.getByLabel(/Hospital Email/i).fill(TEST_DATA.HOSPITAL.email);
  await page.getByLabel(/License Number/i).fill(TEST_DATA.HOSPITAL.license);
  
  // Ensure no validation errors are visible
  await expect(page.locator('.text-red-500, .text-destructive')).toHaveCount(0);
  
  // Wait for continue button to be enabled
  const continueButton = page.getByRole('button', { name: /Continue/i });
  await expect(continueButton).toBeEnabled();
  
  await continueButton.click();
  
  // Wait for step 2 to be visible
  await expect(page.getByLabel(/First Name/i)).toBeVisible();
  
  // Step 2: Admin Info
  await page.getByLabel(/First Name/i).fill(TEST_DATA.ADMIN.firstName);
  await page.getByLabel(/Last Name/i).fill(TEST_DATA.ADMIN.lastName);
  await page.getByLabel(/Admin Email/i).fill(TEST_DATA.ADMIN.email);
  await page.getByLabel(/^Password/i).fill(TEST_DATA.ADMIN.password);
  await page.getByLabel(/Confirm Password/i).fill(TEST_DATA.ADMIN.password);
  
  // Ensure password requirements are satisfied without hard-coding exact icon count.
  await page.waitForTimeout(300);
  const checkCount = await page.locator('svg.lucide-check').count();
  expect(checkCount).toBeGreaterThanOrEqual(5);
  
  // Ensure no validation errors
  await expect(page.locator('.text-red-500, .text-destructive')).toHaveCount(0);
  
  // Wait for create account button to be enabled
  const createButton = page.getByRole('button', { name: /Create Account/i });
  await expect(createButton).toBeEnabled();
  
  await createButton.click();
  
  // Registration completion can land on setup, dashboard, or login (email verification / redirect).
  await expect(page).toHaveURL(/.*(role-setup|account-setup|dashboard|hospital\/login).*/, { timeout: 20000 });
}

/**
 * Deterministically bootstrap auth in E2E mock mode.
 */
export async function bootstrapMockAuth(page: Page, role: UserRole = 'admin') {
  const roleEmail = ROLE_LOGIN_EMAIL[role] || ROLE_LOGIN_EMAIL.admin;

  await page.addInitScript(
    ({ email, roleName }) => {
      window.localStorage.setItem('e2e-mock-auth-user', email);
      window.localStorage.setItem('preferredRole', roleName);
      window.localStorage.removeItem('testRole');
    },
    { email: roleEmail, roleName: role }
  );
}

/**
 * Login with test credentials.
 * Uses deterministic mock-auth bootstrap first, then falls back to live login.
 */
export async function loginAsTestUser(page: Page, role: UserRole = 'admin') {
  const roleEmail = ROLE_LOGIN_EMAIL[role] || TEST_DATA.ADMIN.email;
  const shouldUseMockAuth =
    process.env.E2E_FORCE_LIVE_AUTH !== 'true' &&
    process.env.VITE_E2E_MOCK_AUTH !== 'false';

  const attemptUiLogin = async (): Promise<boolean> => {
    await page.goto('/hospital/login');
    await page.getByLabel(/email/i).fill(roleEmail);
    await page.getByLabel(/password/i).fill(TEST_DATA.ADMIN.password);
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();
    try {
      await expect(page).toHaveURL(/.*(dashboard|hospital\/account-setup).*/, { timeout: 7000 });
      return true;
    } catch {
      return false;
    }
  };

  if (shouldUseMockAuth) {
    await bootstrapMockAuth(page, role);
    await page.goto('/dashboard');
    try {
      await expect(page).toHaveURL(/dashboard|hospital\/account-setup/i, { timeout: 7000 });
      if (role !== 'admin') {
        await setTestRole(page, role);
      }
      return;
    } catch {
      const loggedIn = await attemptUiLogin();
      if (loggedIn) {
        if (page.url().includes('/hospital/account-setup')) {
          await page.goto('/dashboard');
          await page.waitForLoadState('networkidle');
        }
        if (role !== 'admin') {
          await setTestRole(page, role);
        }
        return;
      }
    }
  }

  const loggedIn = await attemptUiLogin();
  if (!loggedIn) {
    console.log('Login failed: User lookup failed. Attempting registration...');
    await registerTestHospital(page);
    const retried = await attemptUiLogin();
    expect(retried).toBeTruthy();
  }

  if (page.url().includes('/hospital/account-setup')) {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  }

  if (role !== 'admin') {
    await setTestRole(page, role);
  }
}

/**
 * Login as a specific role (alias for loginAsTestUser)
 */
export async function loginAsRole(page: Page, role: UserRole) {
  return loginAsTestUser(page, role);
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
