import { test, expect } from '@playwright/test';

test.describe('Patient Portal', () => {
  test.beforeEach(async ({ page }) => {
    // Login as patient
    await page.goto('/patient/login');
    await page.getByLabel('Email').fill('jane.doe@example.com');
    await page.getByLabel('Password').fill('PatientPass123!');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await expect(page).toHaveURL(/.*dashboard.*/);
  });

  test('should view personal health records', async ({ page }) => {
    // Navigate to medical records
    await page.getByRole('link', { name: /records|history|medical/i }).click();

    // Should show patient demographics
    await expect(page.getByText('Jane Doe')).toBeVisible();
    await expect(page.getByText('1990-05-15')).toBeVisible();
    await expect(page.getByText('Hypertension')).toBeVisible();

    // View current medications
    await expect(page.getByText('Lisinopril 20mg')).toBeVisible();

    // View allergies
    await expect(page.getByText('Penicillin')).toBeVisible();
  });

  test('should schedule appointments online', async ({ page }) => {
    // Navigate to appointments
    await page.getByRole('link', { name: /appointments|schedule/i }).click();

    // Click schedule new appointment
    await page.getByRole('button', { name: /schedule|book/i }).click();

    // Select doctor
    await page.getByLabel('Doctor').click();
    await page.getByText('Dr. Smith').click();

    // Select date and time
    await page.getByLabel('Preferred Date').fill('2026-02-01');
    await page.getByLabel('Preferred Time').selectOption('morning');

    // Select appointment type
    await page.getByLabel('Type').selectOption('follow-up');

    // Add reason
    await page.getByLabel('Reason').fill('Follow-up for blood pressure check');

    // Submit request
    await page.getByRole('button', { name: /request|schedule/i }).click();

    // Should show confirmation
    await expect(page.getByText(/appointment requested|pending approval/i)).toBeVisible();
  });

  test('should view lab results', async ({ page }) => {
    // Navigate to lab results
    await page.getByRole('link', { name: /lab results|tests/i }).click();

    // Should show recent results
    await expect(page.getByText('Comprehensive Metabolic Panel')).toBeVisible();
    await expect(page.getByText(/completed|final/i)).toBeVisible();

    // View detailed results
    await page.getByText('View Results').click();

    // Should show individual test values
    await expect(page.getByText('Glucose: 95 mg/dL')).toBeVisible();
    await expect(page.getByText('Sodium: 140 mEq/L')).toBeVisible();

    // Should indicate normal ranges
    await expect(page.getByText(/normal|within range/i)).toBeVisible();
  });

  test('should view prescriptions', async ({ page }) => {
    // Navigate to prescriptions
    await page.getByRole('link', { name: /prescriptions|medications/i }).click();

    // Should show active prescriptions
    await expect(page.getByText('Lisinopril')).toBeVisible();
    await expect(page.getByText('20mg')).toBeVisible();
    await expect(page.getByText('Once daily')).toBeVisible();

    // Should show refill status
    await expect(page.getByText(/refills remaining|last filled/i)).toBeVisible();

    // Request refill
    await page.getByRole('button', { name: /refill|request/i }).click();

    // Should show refill requested
    await expect(page.getByText(/refill requested|pending/i)).toBeVisible();
  });

  test('should send secure messages', async ({ page }) => {
    // Navigate to messages
    await page.getByRole('link', { name: /messages|contact/i }).click();

    // Start new message
    await page.getByRole('button', { name: /new message|compose/i }).click();

    // Select recipient
    await page.getByLabel('To').click();
    await page.getByText('Dr. Smith').click();

    // Enter subject and message
    await page.getByLabel('Subject').fill('Question about medication');
    await page.getByLabel('Message').fill('I have a question about my Lisinopril dosage. Can we discuss this at my next appointment?');

    // Send message
    await page.getByRole('button', { name: /send/i }).click();

    // Should show message sent
    await expect(page.getByText(/message sent|delivered/i)).toBeVisible();
  });

  test('should view billing statements', async ({ page }) => {
    // Navigate to billing
    await page.getByRole('link', { name: /billing|statements/i }).click();

    // Should show recent invoices
    await expect(page.getByText('Office Visit')).toBeVisible();
    await expect(page.getByText('$150.00')).toBeVisible();

    // View statement details
    await page.getByText('View Statement').click();

    // Should show charges and payments
    await expect(page.getByText('Consultation')).toBeVisible();
    await expect(page.getByText('Insurance Adjustment')).toBeVisible();
    await expect(page.getByText('Patient Responsibility')).toBeVisible();
  });
});