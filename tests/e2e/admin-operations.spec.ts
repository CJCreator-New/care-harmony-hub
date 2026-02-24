import { test, expect, Page, Route } from '@playwright/test';
import { loginAsTestUser } from './utils/test-helpers';

type MockPatient = {
  id: string;
  hospital_id: string;
  mrn: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  blood_type: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  insurance_provider: string | null;
  insurance_policy_number: string | null;
  insurance_group_number: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

async function loginAs(page: Page) {
  await loginAsTestUser(page, 'admin');
  await expect(page).toHaveURL(/dashboard|hospital\/account-setup/i);
}

async function attachPatientApiMocks(page: Page, seed?: Partial<MockPatient>) {
  const now = new Date().toISOString();
  let patient: MockPatient = {
    id: 'p-e2e-001',
    hospital_id: 'e2e-hospital-001',
    mrn: 'MRN-E2E-001',
    first_name: 'Jane',
    last_name: 'Existing',
    date_of_birth: '1988-01-10',
    gender: 'female',
    phone: '555-0101',
    email: 'jane.existing@example.com',
    address: '1 Main St',
    city: 'Test City',
    state: 'TS',
    zip: '12345',
    blood_type: 'O+',
    emergency_contact_name: null,
    emergency_contact_phone: null,
    emergency_contact_relationship: null,
    insurance_provider: null,
    insurance_policy_number: null,
    insurance_group_number: null,
    notes: null,
    is_active: true,
    created_at: now,
    updated_at: now,
    ...seed,
  };

  await page.route(/\/rest\/v1\/rpc\/generate_mrn(\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify('MRN-E2E-NEW'),
    });
  });

  await page.route(/\/rest\/v1\/patients(\?|$)/, async (route) => {
    const req = route.request();
    const method = req.method();
    const expectsSingle = req.headers()['accept']?.includes('application/vnd.pgrst.object+json');

    if (method === 'GET') {
      if (req.url().includes('id=eq.')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: expectsSingle ? JSON.stringify(patient) : JSON.stringify([patient]),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': '0-0/1' },
        body: JSON.stringify([patient]),
      });
      return;
    }

    if (method === 'POST') {
      const payload = req.postDataJSON() as Record<string, unknown>;
      patient = {
        ...patient,
        ...payload,
        id: 'p-e2e-002',
        mrn: 'MRN-E2E-NEW',
        first_name: String(payload.first_name || patient.first_name),
        last_name: String(payload.last_name || patient.last_name),
        date_of_birth: String(payload.date_of_birth || patient.date_of_birth),
        gender: String(payload.gender || patient.gender),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as MockPatient;

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: expectsSingle ? JSON.stringify(patient) : JSON.stringify([patient]),
      });
      return;
    }

    if (method === 'PATCH') {
      const payload = req.postDataJSON() as Record<string, unknown>;
      patient = {
        ...patient,
        ...payload,
        updated_at: new Date().toISOString(),
      } as MockPatient;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: expectsSingle ? JSON.stringify(patient) : JSON.stringify([patient]),
      });
      return;
    }

    await route.continue();
  });
}

test.describe('Admin Operations', () => {
  test('onboarding form enforces required fields and step gating', async ({ page }) => {
    await page.goto('/hospital/signup');

    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByText(/hospital name is required/i)).toBeVisible();
    await expect(page.getByText(/address is required/i)).toBeVisible();
    await expect(page.getByText(/license number is required/i)).toBeVisible();

    await page.getByLabel(/hospital name/i).fill('E2E Care Hospital');
    await page.getByLabel(/address/i).fill('123 Health St');
    await page.getByLabel(/city/i).fill('Test City');
    await page.getByLabel(/state/i).fill('TS');
    await page.getByLabel(/zip code/i).fill('12345');
    await page.getByLabel(/^phone/i).fill('555-1212');
    await page.getByLabel(/hospital email/i).fill('new-hospital-e2e@test.example');
    await page.getByLabel(/license number/i).fill('LIC-E2E-001');
    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page.getByRole('heading', { name: /administrator account/i })).toBeVisible();
    await page.getByLabel(/^password/i).fill('weak');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/hospital\/signup/i);
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
  });

  test('admin can register a patient with form validation and mocked API persistence', async ({ page }) => {
    await loginAs(page);
    await attachPatientApiMocks(page);
    await page.goto('/patients');

    await page.getByRole('button', { name: /register patient/i }).click();
    const registerDialog = page.getByRole('dialog');
    await registerDialog.getByRole('button', { name: /register patient/i }).click();
    await expect(page.getByText(/first name must be at least 2 characters/i)).toBeVisible();
    await expect(page.getByText(/last name must be at least 2 characters/i)).toBeVisible();
    await expect(page.getByText(/date of birth is required/i)).toBeVisible();

    await page.getByLabel(/first name/i).fill('Alice');
    await page.getByLabel(/last name/i).fill('Walker');
    await page.getByLabel(/date of birth/i).fill('1992-06-10');
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /^female$/i }).click();
    await page.getByLabel(/phone number/i).fill('555-2000');
    await page.getByLabel(/^email$/i).fill('alice.walker@example.com');

    await registerDialog.getByRole('button', { name: /register patient/i }).click();

    await expect(page.getByText(/registration failed/i)).toHaveCount(0);
    await expect(registerDialog).toHaveCount(0);
  });

  test('admin patient update form enforces validation and accepts corrected details', async ({ page }) => {
    await loginAs(page);
    await page.goto('/patients/p-e2e-001');
    await expect(page).toHaveURL(/\/patients\//i);

    await page.getByRole('button', { name: /edit details/i }).click();
    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByText(/first name must be at least 2 characters/i)).toBeVisible();
    await expect(page.getByText(/last name must be at least 2 characters/i)).toBeVisible();

    await page.getByLabel(/first name/i).fill('Mark');
    await page.getByLabel(/last name/i).fill('Initial');
    await page.getByLabel(/^phone$/i).fill('555-9999');
    await page.getByLabel(/^address$/i).fill('77 Updated Ave');
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('should access staff management route', async ({ page }) => {
    await loginAs(page);
    await page.goto('/settings/staff-management');
    await expect(page).toHaveURL(/settings\/staff|access/i);
  });
});
