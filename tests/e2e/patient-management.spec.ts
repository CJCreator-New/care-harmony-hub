import { test, expect } from '@playwright/test';
import { loginAsRole, TEST_DATA, fillForm } from './utils/test-helpers';

test.describe('Patient Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, 'receptionist');
  });

  test('should register new patient', async ({ page }) => {
    await page.getByRole('link', { name: /patients/i }).click();
    await page.getByRole('button', { name: /register patient/i }).click();

    await fillForm(page, {
      'First Name': TEST_DATA.PATIENT.firstName,
      'Last Name': TEST_DATA.PATIENT.lastName,
      'Phone': TEST_DATA.PATIENT.phone,
      'Email': TEST_DATA.PATIENT.email,
    });

    await page.getByRole('button', { name: /save|register/i }).click();
    await expect(page.getByText(/patient registered/i)).toBeVisible();
  });

  test('should search and view patient records', async ({ page }) => {
    await page.getByRole('link', { name: /patients/i }).click();
    await page.getByPlaceholder(/search/i).fill(TEST_DATA.PATIENT.firstName);
    await expect(page.getByText(TEST_DATA.PATIENT.firstName)).toBeVisible();
  });
});