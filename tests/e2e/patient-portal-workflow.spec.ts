import { expect } from '@playwright/test';
import { patientTest } from './fixtures/auth.fixture';

patientTest.describe('Patient Portal — Self-Service Workflow', () => {
  patientTest('views health timeline', async ({ patientPage: page }) => {
    await page.goto('/patient/portal');
    await expect(page).toHaveURL(/patient/);

    await expect(page.getByText(/timeline|history|visits/i)).toBeVisible();
  });

  patientTest('views upcoming appointments', async ({ patientPage: page }) => {
    await page.goto('/patient/appointments');
    await expect(page).toHaveURL(/appointments/);

    await expect(page.getByText(/upcoming|scheduled|appointments/i)).toBeVisible();
  });

  patientTest('views prescriptions', async ({ patientPage: page }) => {
    await page.goto('/patient/prescriptions');
    await expect(page).toHaveURL(/prescriptions/);

    await expect(page.getByText(/prescription|medication/i)).toBeVisible();
  });

  patientTest('views lab results', async ({ patientPage: page }) => {
    await page.goto('/patient/lab-results');
    await expect(page).toHaveURL(/lab/);

    await expect(page.getByText(/lab results|test results/i)).toBeVisible();
  });

  patientTest('cannot access admin routes', async ({ patientPage: page }) => {
    await page.goto('/admin/staff');
    await expect(page).not.toHaveURL(/admin\/staff/);
  });
});
