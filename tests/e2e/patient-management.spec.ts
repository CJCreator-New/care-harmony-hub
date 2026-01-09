import { test, expect } from '@playwright/test';

test.describe('Patient Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as receptionist (assuming we have test data setup)
    await page.goto('/login');
    await page.getByLabel('Email').fill('receptionist@testgeneral.com');
    await page.getByLabel('Password').fill('TestPass123!');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await expect(page).toHaveURL(/.*dashboard.*/);
  });

  test('should register new patient', async ({ page }) => {
    // Navigate to patients page
    await page.getByRole('link', { name: /patients|patient management/i }).click();

    // Click add new patient
    await page.getByRole('button', { name: /add patient|new patient|register/i }).click();

    // Fill patient registration form
    await page.getByLabel('First Name').fill('Jane');
    await page.getByLabel('Last Name').fill('Doe');
    await page.getByLabel('Date of Birth').fill('1990-05-15');
    await page.getByLabel('Gender').selectOption('female');
    await page.getByLabel('Phone').fill('(555) 987-6543');
    await page.getByLabel('Email').fill('jane.doe@example.com');
    await page.getByLabel('Address').fill('456 Patient Ave');
    await page.getByLabel('City').fill('Test City');
    await page.getByLabel('State').fill('Test State');
    await page.getByLabel('ZIP Code').fill('12345');

    // Emergency contact
    await page.getByLabel('Emergency Contact Name').fill('John Doe');
    await page.getByLabel('Emergency Contact Phone').fill('(555) 111-2222');
    await page.getByLabel('Relationship').fill('Spouse');

    // Insurance
    await page.getByLabel('Insurance Provider').fill('Test Insurance Co');
    await page.getByLabel('Policy Number').fill('POL123456');
    await page.getByLabel('Group Number').fill('GRP789');

    // Medical history
    await page.getByLabel('Allergies').fill('Penicillin, Peanuts');
    await page.getByLabel('Chronic Conditions').fill('Hypertension');
    await page.getByLabel('Current Medications').fill('Lisinopril 10mg daily');

    // Submit
    await page.getByRole('button', { name: /save|register|create/i }).click();

    // Should show success and patient details
    await expect(page.getByText(/patient registered|created successfully/i)).toBeVisible();

    // Check if MRN was generated
    await expect(page.getByText(/MRN|Medical Record Number/i)).toBeVisible();
  });

  test('should search and view patient records', async ({ page }) => {
    await page.getByRole('link', { name: /patients|patient management/i }).click();

    // Search for patient
    await page.getByPlaceholder(/search patients|find patient/i).fill('Jane Doe');
    await page.getByRole('button', { name: /search/i }).click();

    // Click on patient result
    await page.getByText('Jane Doe').click();

    // Should show patient details
    await expect(page.getByText('Jane Doe')).toBeVisible();
    await expect(page.getByText('1990-05-15')).toBeVisible();
    await expect(page.getByText('Hypertension')).toBeVisible();
  });

  test('should update patient information', async ({ page }) => {
    // Navigate to patient details
    await page.getByRole('link', { name: /patients/i }).click();
    await page.getByText('Jane Doe').click();

    // Click edit
    await page.getByRole('button', { name: /edit|update/i }).click();

    // Update phone number
    await page.getByLabel('Phone').fill('(555) 999-8888');

    // Save changes
    await page.getByRole('button', { name: /save|update/i }).click();

    // Should show success
    await expect(page.getByText(/updated successfully/i)).toBeVisible();
    await expect(page.getByText('(555) 999-8888')).toBeVisible();
  });
});