import { expect, test, type Page } from '@playwright/test';
import { setupApiMocks } from './utils/test-helpers';

type Role =
  | 'receptionist'
  | 'nurse'
  | 'doctor'
  | 'lab_technician'
  | 'pharmacist'
  | 'patient';

async function expectDeniedOrRedirect(page: Page, forbiddenPath: string) {
  const current = page.url();
  const deniedTextVisible = await page.getByText(/access denied/i).isVisible().catch(() => false);
  const stillOnForbidden = current.includes(forbiddenPath);
  expect(deniedTextVisible || !stillOnForbidden, `Expected denial or redirect away from ${forbiddenPath}, got ${current}`).toBe(true);
}

async function gotoAsRole(page: Page, role: Role, route: string) {
  const roleEmailMap: Record<Role, string> = {
    receptionist: process.env.E2E_RECEPTIONIST_EMAIL || 'receptionist@testgeneral.com',
    nurse: process.env.E2E_NURSE_EMAIL || 'nurse@testgeneral.com',
    doctor: process.env.E2E_DOCTOR_EMAIL || 'doctor@testgeneral.com',
    lab_technician: process.env.E2E_LAB_TECHNICIAN_EMAIL || 'labtech@testgeneral.com',
    pharmacist: process.env.E2E_PHARMACIST_EMAIL || 'pharmacist@testgeneral.com',
    patient: process.env.E2E_PATIENT_EMAIL || 'patient@testgeneral.com',
  };
  const rolePasswordMap: Record<Role, string> = {
    receptionist: process.env.E2E_RECEPTIONIST_PASSWORD || 'TestPass123!',
    nurse: process.env.E2E_NURSE_PASSWORD || 'TestPass123!',
    doctor: process.env.E2E_DOCTOR_PASSWORD || 'TestPass123!',
    lab_technician: process.env.E2E_LAB_TECHNICIAN_PASSWORD || 'TestPass123!',
    pharmacist: process.env.E2E_PHARMACIST_PASSWORD || 'TestPass123!',
    patient: process.env.E2E_PATIENT_PASSWORD || 'TestPass123!',
  };

  await page.addInitScript(
    ({ email, roleName }) => {
      window.localStorage.setItem('e2e-mock-auth-user', email);
      window.localStorage.setItem('preferredRole', roleName);
      window.localStorage.setItem('testRole', roleName);
    },
    { email: roleEmailMap[role], roleName: role }
  );
  await page.goto(role === 'patient' ? '/patient/portal' : '/dashboard');

  // If mock auth is unavailable, attempt live UI login.
  if (page.url().includes('/hospital/login')) {
    await page.getByLabel(/email/i).fill(roleEmailMap[role]);
    await page.getByLabel(/password/i).fill(rolePasswordMap[role]);
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();
    await page.waitForLoadState('networkidle');
  }

  // If still unauthenticated, caller can skip based on URL.
  if (!page.url().includes('/hospital/login')) {
    await page.evaluate((roleName) => {
      localStorage.setItem('testRole', roleName);
      localStorage.setItem('preferredRole', roleName);
    }, role);
  }
  await page.goto(route);
}

test.describe('All Roles End-to-End Flow', () => {
  test('E2E-ALL-ROLES-01 Reception -> Nurse -> Doctor -> Lab -> Pharmacy -> Patient Portal', async ({ page }) => {
    await setupApiMocks(page);

    await test.step('Receptionist: registration/scheduling/check-in routes', async () => {
      await gotoAsRole(page, 'receptionist', '/appointments');
      expect(page.url(), 'No valid mock/live auth context for receptionist.').not.toContain('/hospital/login');
      await expect(page).toHaveURL(/\/appointments/);

      await page.goto('/queue');
      await expect(page).toHaveURL(/\/queue/);

      await page.goto('/billing');
      await expect(page).toHaveURL(/\/billing/);
    });

    await test.step('Nurse: intake/queue and consultation prep routes', async () => {
      await gotoAsRole(page, 'nurse', '/queue');
      await expect(page).toHaveURL(/\/queue/);

      await page.goto('/consultations');
      await expect(page).toHaveURL(/\/consultations/);

      await page.goto('/inventory');
      await expectDeniedOrRedirect(page, '/inventory');
    });

    await test.step('Doctor: consultation and lab ordering routes', async () => {
      await gotoAsRole(page, 'doctor', '/consultations');
      await expect(page).toHaveURL(/\/consultations/);

      await page.goto('/laboratory');
      await expect(page).toHaveURL(/\/laboratory/);

      await page.goto('/billing');
      await expectDeniedOrRedirect(page, '/billing');
    });

    await test.step('Lab Technician: lab processing routes', async () => {
      await gotoAsRole(page, 'lab_technician', '/laboratory');
      await expect(page).toHaveURL(/\/laboratory/);

      await page.goto('/laboratory/automation');
      await expect(page).toHaveURL(/\/laboratory\/automation/);

      await page.goto('/pharmacy');
      await expectDeniedOrRedirect(page, '/pharmacy');
    });

    await test.step('Pharmacist: prescription and inventory routes', async () => {
      await gotoAsRole(page, 'pharmacist', '/pharmacy');
      await expect(page).toHaveURL(/\/pharmacy/);

      await page.goto('/inventory');
      await expect(page).toHaveURL(/\/inventory/);

      await page.goto('/consultations');
      await expect(page).toHaveURL(/\/consultations/);

      await page.goto('/settings/staff');
      await expectDeniedOrRedirect(page, '/settings/staff');
    });

    await test.step('Patient: portal self-service routes and staff-route denial', async () => {
      await gotoAsRole(page, 'patient', '/patient/portal');
      await expect(page).toHaveURL(/\/patient\/portal/);

      await page.goto('/patient/appointments');
      await expect(page).toHaveURL(/\/patient\/appointments/);

      await page.goto('/patient/prescriptions');
      await expect(page).toHaveURL(/\/patient\/prescriptions/);

      await page.goto('/patient/lab-results');
      await expect(page).toHaveURL(/\/patient\/lab-results/);

      await page.goto('/pharmacy');
      await expectDeniedOrRedirect(page, '/pharmacy');
    });
  });
});
