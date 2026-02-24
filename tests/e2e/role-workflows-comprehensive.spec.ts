import { expect, test, type Page } from '@playwright/test';
import { setTestRole, setupApiMocks } from './utils/test-helpers';

type Role = 'doctor' | 'nurse' | 'receptionist' | 'pharmacist' | 'lab_technician' | 'patient';

async function assertRouteAccess(page: Page, route: string, shouldAllow: boolean) {
  await page.goto(route);
  if (shouldAllow) {
    await expect(page).toHaveURL(new RegExp(route.replace('/', '\\/')));
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByText(/access denied/i)).toHaveCount(0);
    return;
  }
  await expect(page.getByText(/access denied/i)).toBeVisible();
}

async function bootstrapRole(page: Page, role: Role): Promise<void> {
  const emailByRole: Record<Role, string> = {
    doctor: process.env.E2E_DOCTOR_EMAIL || 'doctor@testgeneral.com',
    nurse: process.env.E2E_NURSE_EMAIL || 'nurse@testgeneral.com',
    receptionist: process.env.E2E_RECEPTIONIST_EMAIL || 'receptionist@testgeneral.com',
    pharmacist: process.env.E2E_PHARMACIST_EMAIL || 'pharmacist@testgeneral.com',
    lab_technician: process.env.E2E_LAB_TECHNICIAN_EMAIL || 'labtech@testgeneral.com',
    patient: process.env.E2E_PATIENT_EMAIL || 'patient@testgeneral.com',
  };
  const passwordByRole: Record<Role, string> = {
    doctor: process.env.E2E_DOCTOR_PASSWORD || 'TestPass123!',
    nurse: process.env.E2E_NURSE_PASSWORD || 'TestPass123!',
    receptionist: process.env.E2E_RECEPTIONIST_PASSWORD || 'TestPass123!',
    pharmacist: process.env.E2E_PHARMACIST_PASSWORD || 'TestPass123!',
    lab_technician: process.env.E2E_LAB_TECHNICIAN_PASSWORD || 'TestPass123!',
    patient: process.env.E2E_PATIENT_PASSWORD || 'TestPass123!',
  };

  await setupApiMocks(page);
  await page.addInitScript(
    ({ email, roleName }) => {
      window.localStorage.setItem('e2e-mock-auth-user', email);
      window.localStorage.setItem('preferredRole', roleName);
      window.localStorage.setItem('testRole', roleName);
    },
    { email: emailByRole[role], roleName: role }
  );
  await page.goto(role === 'patient' ? '/patient/portal' : '/dashboard');
  if (page.url().includes('/hospital/login')) {
    await page.getByLabel(/email/i).fill(emailByRole[role]);
    await page.getByLabel(/password/i).fill(passwordByRole[role]);
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();
    await page.waitForLoadState('networkidle');
  }
  if (!page.url().includes('/hospital/login')) {
    await setTestRole(page, role);
  }
  await page.goto(role === 'patient' ? '/patient/portal' : '/dashboard');
}

test.describe('Comprehensive Role Workflow Coverage', () => {
  test('DOC-TC-01 Doctor route and RBAC checks', async ({ page }) => {
    await bootstrapRole(page, 'doctor');
    expect(page.url(), 'No valid mock/live auth context for doctor.').not.toContain('/hospital/login');
    await assertRouteAccess(page, '/dashboard', true);
    await assertRouteAccess(page, '/consultations', true);
    await assertRouteAccess(page, '/patients', true);
    await assertRouteAccess(page, '/pharmacy', false);
    await assertRouteAccess(page, '/patient/portal', false);
  });

  test('NUR-TC-01 Nurse queue and clinical access checks', async ({ page }) => {
    await bootstrapRole(page, 'nurse');
    expect(page.url(), 'No valid mock/live auth context for nurse.').not.toContain('/hospital/login');
    await assertRouteAccess(page, '/dashboard', true);
    await assertRouteAccess(page, '/queue', true);
    await assertRouteAccess(page, '/consultations', true);
    await assertRouteAccess(page, '/inventory', false);
    await assertRouteAccess(page, '/patient/portal', false);
  });

  test('REC-TC-01 Reception scheduling and billing access checks', async ({ page }) => {
    await bootstrapRole(page, 'receptionist');
    expect(page.url(), 'No valid mock/live auth context for receptionist.').not.toContain('/hospital/login');
    await assertRouteAccess(page, '/dashboard', true);
    await assertRouteAccess(page, '/appointments', true);
    await assertRouteAccess(page, '/queue', true);
    await assertRouteAccess(page, '/billing', true);
    await assertRouteAccess(page, '/consultations', false);
  });

  test('PHA-TC-01 Pharmacist dispensing and inventory access checks', async ({ page }) => {
    await bootstrapRole(page, 'pharmacist');
    expect(page.url(), 'No valid mock/live auth context for pharmacist.').not.toContain('/hospital/login');
    await assertRouteAccess(page, '/dashboard', true);
    await assertRouteAccess(page, '/pharmacy', true);
    await assertRouteAccess(page, '/inventory', true);
    await assertRouteAccess(page, '/consultations', false);
    await assertRouteAccess(page, '/billing', false);
  });

  test('LAB-TC-01 Lab technician processing access checks', async ({ page }) => {
    await bootstrapRole(page, 'lab_technician');
    expect(page.url(), 'No valid mock/live auth context for lab technician.').not.toContain('/hospital/login');
    await assertRouteAccess(page, '/dashboard', true);
    await assertRouteAccess(page, '/laboratory', true);
    await assertRouteAccess(page, '/laboratory/automation', true);
    await assertRouteAccess(page, '/pharmacy', false);
    await assertRouteAccess(page, '/billing', false);
  });

  test('PAT-TC-01 Patient portal isolation checks', async ({ page }) => {
    await bootstrapRole(page, 'patient');
    expect(page.url(), 'No valid mock/live auth context for patient.').not.toContain('/hospital/login');
    await assertRouteAccess(page, '/patient/portal', true);
    await assertRouteAccess(page, '/patient/appointments', true);
    await assertRouteAccess(page, '/patient/prescriptions', true);
    await assertRouteAccess(page, '/patient/lab-results', true);
    await assertRouteAccess(page, '/patients', false);
    await assertRouteAccess(page, '/consultations', false);
  });
});
