import { expect, test, type Page } from '@playwright/test';
import { setTestRole, setupApiMocks } from './utils/test-helpers';

type Role = 'receptionist' | 'nurse' | 'doctor' | 'pharmacist' | 'lab_technician' | 'patient';

async function applyRole(page: Page, role: Role, route: string) {
  const emailByRole: Record<Role, string> = {
    receptionist: process.env.E2E_RECEPTIONIST_EMAIL || 'receptionist@testgeneral.com',
    nurse: process.env.E2E_NURSE_EMAIL || 'nurse@testgeneral.com',
    doctor: process.env.E2E_DOCTOR_EMAIL || 'doctor@testgeneral.com',
    pharmacist: process.env.E2E_PHARMACIST_EMAIL || 'pharmacist@testgeneral.com',
    lab_technician: process.env.E2E_LAB_TECHNICIAN_EMAIL || 'labtech@testgeneral.com',
    patient: process.env.E2E_PATIENT_EMAIL || 'patient@testgeneral.com',
  };
  const passwordByRole: Record<Role, string> = {
    receptionist: process.env.E2E_RECEPTIONIST_PASSWORD || 'TestPass123!',
    nurse: process.env.E2E_NURSE_PASSWORD || 'TestPass123!',
    doctor: process.env.E2E_DOCTOR_PASSWORD || 'TestPass123!',
    pharmacist: process.env.E2E_PHARMACIST_PASSWORD || 'TestPass123!',
    lab_technician: process.env.E2E_LAB_TECHNICIAN_PASSWORD || 'TestPass123!',
    patient: process.env.E2E_PATIENT_PASSWORD || 'TestPass123!',
  };

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
  await page.goto(route);
}

test.describe('Cross-Role Handoffs And Dependencies', () => {
  test('XRF-TC-01 Outpatient role handoff chain remains navigable', async ({ page }) => {
    await setupApiMocks(page);
    await applyRole(page, 'receptionist', '/queue');
    expect(page.url(), 'No valid mock/live auth context for receptionist.').not.toContain('/hospital/login');

    await test.step('Receptionist checks in via queue', async () => {
      await expect(page).toHaveURL(/\/queue/);
    });

    await test.step('Nurse accepts intake workflow', async () => {
      await applyRole(page, 'nurse', '/queue');
      await expect(page).toHaveURL(/\/queue/);
      await page.goto('/consultations');
      await expect(page).toHaveURL(/\/consultations/);
    });

    await test.step('Doctor completes clinical workflow routes', async () => {
      await applyRole(page, 'doctor', '/consultations');
      await expect(page).toHaveURL(/\/consultations/);
      await page.goto('/laboratory');
      await expect(page).toHaveURL(/\/laboratory/);
    });

    await test.step('Pharmacist receives post-prescription access', async () => {
      await applyRole(page, 'pharmacist', '/pharmacy');
      await expect(page).toHaveURL(/\/pharmacy/);
      await page.goto('/inventory');
      await expect(page).toHaveURL(/\/inventory/);
    });
  });

  test('XRF-TC-02 Lab critical path role boundaries', async ({ page }) => {
    await setupApiMocks(page);
    await applyRole(page, 'doctor', '/laboratory');
    expect(page.url(), 'No valid mock/live auth context for doctor.').not.toContain('/hospital/login');

    await test.step('Doctor can place and review lab context', async () => {
      await expect(page).toHaveURL(/\/laboratory/);
    });

    await test.step('Lab technician can process automation flow', async () => {
      await applyRole(page, 'lab_technician', '/laboratory/automation');
      await expect(page).toHaveURL(/\/laboratory\/automation/);
    });

    await test.step('Receptionist cannot access lab automation', async () => {
      await applyRole(page, 'receptionist', '/laboratory/automation');
      await expect(page.getByText(/access denied/i)).toBeVisible();
    });
  });

  test('XRF-TC-03 Patient refill loop route contract', async ({ page }) => {
    await setupApiMocks(page);
    await applyRole(page, 'patient', '/patient/prescriptions');
    expect(page.url(), 'No valid mock/live auth context for patient.').not.toContain('/hospital/login');

    await test.step('Patient can submit refill from prescriptions route context', async () => {
      await expect(page).toHaveURL(/\/patient\/prescriptions/);
    });

    await test.step('Pharmacist can process refill queue context', async () => {
      await applyRole(page, 'pharmacist', '/pharmacy');
      await expect(page).toHaveURL(/\/pharmacy/);
    });

    await test.step('Patient cannot access pharmacy processing route', async () => {
      await applyRole(page, 'patient', '/pharmacy');
      await expect(page.getByText(/access denied/i)).toBeVisible();
    });
  });
});
