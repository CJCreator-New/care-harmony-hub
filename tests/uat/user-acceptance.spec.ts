import { test, expect } from '@playwright/test';
import { setTestRole, loginAsTestUser, setupApiMocks } from '../e2e/utils/test-helpers';

test.describe('User Acceptance Testing', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('Complete patient journey - UAT scenario', async ({ page }) => {
    // Receptionist check-in
    await loginAsTestUser(page, 'receptionist');
    await page.goto('/queue');

    // Check-in patient
    await page.getByRole('button', { name: 'Check In Patient' }).click();
    await page.getByLabel('Patient MRN').fill('MRN-UAT-001');
    await page.getByRole('button', { name: 'Confirm Check-in' }).click();

    // Nurse vitals recording
    await setTestRole(page, 'nurse');
    await page.goto('/patients');
    await page.getByText('MRN-UAT-001').click();

    // Record vitals
    await page.getByRole('button', { name: 'Record Vitals' }).click();
    await page.getByLabel('Blood Pressure').fill('120/80');
    await page.getByLabel('Heart Rate').fill('72');
    await page.getByLabel('Temperature').fill('98.6');
    await page.getByRole('button', { name: 'Save Vitals' }).click();

    // Doctor consultation
    await setTestRole(page, 'doctor');
    await page.goto('/consultations');
    await page.getByText('MRN-UAT-001').click();

    // Complete consultation steps
    await page.getByRole('button', { name: 'Start Consultation' }).click();
    await page.getByRole('button', { name: 'Review History' }).click();
    await page.getByRole('button', { name: 'Physical Exam' }).click();
    await page.getByRole('button', { name: 'Diagnosis' }).click();
    await page.getByRole('button', { name: 'Treatment Plan' }).click();

    // Create prescription
    await page.getByRole('button', { name: 'Prescribe Medication' }).click();
    await page.getByLabel('Medication').fill('Amoxicillin');
    await page.getByLabel('Dosage').fill('500mg');
    await page.getByLabel('Frequency').fill('3 times daily');
    await page.getByLabel('Duration').fill('7 days');
    await page.getByRole('button', { name: 'Create Prescription' }).click();

    // Pharmacist dispensing
    await setTestRole(page, 'pharmacist');
    await page.goto('/pharmacy');
    await page.getByText('Amoxicillin').click();
    await page.getByRole('button', { name: 'Dispense Medication' }).click();

    // Verify complete workflow
    await expect(page.getByText('Medication dispensed successfully')).toBeVisible();
  });

  test('Emergency patient workflow - UAT scenario', async ({ page }) => {
    // Emergency check-in
    await loginAsTestUser(page, 'receptionist');
    await page.goto('/emergency');

    await page.getByRole('button', { name: 'Emergency Check-in' }).click();
    await page.getByLabel('Patient Name').fill('John Emergency');
    await page.getByLabel('Emergency Level').selectOption('Critical');
    await page.getByRole('button', { name: 'Admit to ER' }).click();

    // Critical care nurse response
    await setTestRole(page, 'nurse');
    await page.goto('/emergency-queue');
    await page.getByText('John Emergency').click();

    // Rapid assessment
    await page.getByRole('button', { name: 'Rapid Assessment' }).click();
    await page.getByLabel('Airway').selectOption('Patent');
    await page.getByLabel('Breathing').selectOption('Labored');
    await page.getByLabel('Circulation').selectOption('Tachycardic');
    await page.getByRole('button', { name: 'Call Code Team' }).click();

    // Doctor emergency response
    await setTestRole(page, 'doctor');
    await page.goto('/emergency');
    await page.getByText('John Emergency').click();

    await page.getByRole('button', { name: 'Emergency Protocol' }).click();
    await page.getByRole('button', { name: 'Stabilize Patient' }).click();

    // Verify emergency response
    await expect(page.getByText('Emergency protocol activated')).toBeVisible();
  });
});