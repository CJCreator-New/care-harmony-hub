import { expect } from '@playwright/test';
import { receptionistTest } from './fixtures/auth.fixture';
import { generatePatient } from './fixtures/test-data';

receptionistTest.describe('Receptionist — Patient Registration & Check-In', () => {
  receptionistTest('registers a new patient', async ({ receptionistPage: page }) => {
    const patient = generatePatient();

    await page.goto('/patients/register');
    await expect(page).toHaveURL(/register/);

    await page.getByLabel(/first name/i).fill(patient.firstName);
    await page.getByLabel(/last name/i).fill(patient.lastName);
    await page.getByLabel(/email/i).fill(patient.email);
    await page.getByLabel(/phone/i).fill(patient.phone);
    await page.getByLabel(/date of birth/i).fill('1990-01-15');

    await page.getByRole('button', { name: /register|save|submit/i }).click();

    await expect(page.getByText(/successfully registered|patient created|registration complete/i)).toBeVisible();
  });

  receptionistTest('checks in a patient from appointment list', async ({ receptionistPage: page }) => {
    await page.goto('/appointments');
    await expect(page).toHaveURL(/appointments/);

    const checkInBtn = page.getByRole('button', { name: /check.?in/i }).first();
    await expect(checkInBtn).toBeVisible();
    await checkInBtn.click();

    await expect(page.getByText(/checked in|queue #/i)).toBeVisible();
  });

  receptionistTest('searches for existing patient', async ({ receptionistPage: page }) => {
    await page.goto('/patients');
    await expect(page).toHaveURL(/patients/);

    const searchInput = page.getByPlaceholder(/search|find patient/i);
    await searchInput.fill('John');

    await expect(page.getByRole('table').or(page.getByTestId('patient-list'))).toBeVisible();
  });
});
