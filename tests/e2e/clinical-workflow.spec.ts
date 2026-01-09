import { test, expect } from '@playwright/test';

test.describe('Clinical Consultation Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as doctor
    await page.goto('/login');
    await page.getByLabel('Email').fill('doctor@testgeneral.com');
    await page.getByLabel('Password').fill('TestPass123!');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await expect(page).toHaveURL(/.*dashboard.*/);
  });

  test('should complete full consultation workflow', async ({ page }) => {
    // Navigate to consultations
    await page.getByRole('link', { name: /consultations|clinic/i }).click();

    // Start new consultation
    await page.getByRole('button', { name: /new consultation|start/i }).click();

    // Select patient from queue
    await page.getByText('Jane Doe').click();

    // Step 1: Chief Complaint
    await page.getByLabel('Chief Complaint').fill('Patient reports increased blood pressure readings at home');
    await page.getByLabel('Duration').fill('2 weeks');
    await page.getByLabel('Severity').selectOption('moderate');
    await page.getByRole('button', { name: /next|continue/i }).click();

    // Step 2: Physical Exam
    await page.getByLabel('Blood Pressure').fill('150/95');
    await page.getByLabel('Heart Rate').fill('78');
    await page.getByLabel('Temperature').fill('98.6');
    await page.getByLabel('Weight').fill('165');
    await page.getByLabel('Height').fill('5\'6"');
    await page.getByRole('button', { name: /next|continue/i }).click();

    // Step 3: Diagnosis
    await page.getByLabel('Primary Diagnosis').fill('Essential Hypertension');
    await page.getByLabel('ICD-10 Code').fill('I10');
    await page.getByLabel('Notes').fill('Patient needs better medication adherence');
    await page.getByRole('button', { name: /next|continue/i }).click();

    // Step 4: Treatment Plan
    await page.getByLabel('Treatment Plan').fill('Increase Lisinopril to 20mg daily, lifestyle modifications');
    await page.getByLabel('Follow-up').fill('2 weeks');
    await page.getByRole('button', { name: /next|continue/i }).click();

    // Step 5: Summary & Orders
    // Order lab tests
    await page.getByRole('button', { name: /order labs|add lab/i }).click();
    await page.getByText('Comprehensive Metabolic Panel').click();
    await page.getByText('Lipid Panel').click();

    // Prescribe medication
    await page.getByRole('button', { name: /prescribe|add prescription/i }).click();
    await page.getByLabel('Medication').fill('Lisinopril');
    await page.getByLabel('Dosage').fill('20mg');
    await page.getByLabel('Frequency').fill('Once daily');
    await page.getByLabel('Duration').fill('30 days');

    // Complete consultation
    await page.getByRole('button', { name: /complete|finish/i }).click();

    // Should show success
    await expect(page.getByText(/consultation completed|saved successfully/i)).toBeVisible();
  });

  test('should show drug interaction alerts', async ({ page }) => {
    await page.getByRole('link', { name: /consultations/i }).click();
    await page.getByRole('button', { name: /new consultation/i }).click();
    await page.getByText('Jane Doe').click();

    // Go to prescription step
    // Navigate through steps or directly to prescriptions
    await page.getByRole('button', { name: /prescribe/i }).click();

    // Try to prescribe medication that interacts with current meds
    await page.getByLabel('Medication').fill('Ibuprofen');
    await page.getByLabel('Dosage').fill('400mg');

    // Should show interaction alert
    await expect(page.getByText(/interaction|warning|caution/i)).toBeVisible();
    await expect(page.getByText(/ACE inhibitor|blood pressure/i)).toBeVisible();
  });

  test('should handle allergy alerts', async ({ page }) => {
    await page.getByRole('link', { name: /consultations/i }).click();
    await page.getByRole('button', { name: /new consultation/i }).click();
    await page.getByText('Jane Doe').click();

    // Try to prescribe penicillin (patient is allergic)
    await page.getByRole('button', { name: /prescribe/i }).click();
    await page.getByLabel('Medication').fill('Amoxicillin');
    await page.getByLabel('Dosage').fill('500mg');

    // Should show allergy alert
    await expect(page.getByText(/allergy|allergic|penicillin/i)).toBeVisible();
  });
});