import { test, expect } from '@playwright/test';

test.describe('Billing & Payment Processing', () => {
  test.beforeEach(async ({ page }) => {
    // Login as receptionist (handles billing)
    await page.goto('/login');
    await page.getByLabel('Email').fill('receptionist@testgeneral.com');
    await page.getByLabel('Password').fill('TestPass123!');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await expect(page).toHaveURL(/.*dashboard.*/);
  });

  test('should generate invoice for consultation', async ({ page }) => {
    // Navigate to billing
    await page.getByRole('link', { name: /billing|invoices/i }).click();

    // Create new invoice
    await page.getByRole('button', { name: /new invoice|create/i }).click();

    // Select patient
    await page.getByLabel('Patient').click();
    await page.getByText('Jane Doe').click();

    // Add consultation charge
    await page.getByRole('button', { name: /add item|add charge/i }).click();
    await page.getByLabel('Service').selectOption('office-visit');
    await page.getByLabel('Description').fill('Office consultation - Hypertension follow-up');
    await page.getByLabel('Quantity').fill('1');
    await page.getByLabel('Unit Price').fill('150.00');

    // Add lab charges
    await page.getByRole('button', { name: /add item/i }).click();
    await page.getByLabel('Service').selectOption('lab-test');
    await page.getByLabel('Description').fill('Comprehensive Metabolic Panel');
    await page.getByLabel('Quantity').fill('1');
    await page.getByLabel('Unit Price').fill('85.00');

    // Calculate total
    await page.getByRole('button', { name: /calculate|total/i }).click();

    // Should show total: $235.00
    await expect(page.getByText('$235.00')).toBeVisible();

    // Save invoice
    await page.getByRole('button', { name: /save|generate/i }).click();

    // Should show invoice created
    await expect(page.getByText(/invoice created|generated/i)).toBeVisible();
  });

  test('should process insurance claims', async ({ page }) => {
    await page.getByRole('link', { name: /billing/i }).click();

    // Find pending invoice
    await page.getByRole('tab', { name: /pending|unpaid/i }).click();
    await page.getByText('Jane Doe - $235.00').click();

    // Submit insurance claim
    await page.getByRole('button', { name: /submit claim|insurance/i }).click();

    // Enter insurance details (should be pre-filled from patient record)
    await expect(page.getByRole('textbox', { name: /insurance company/i })).toHaveValue('Test Insurance Co');
    await expect(page.getByRole('textbox', { name: /policy number/i })).toHaveValue('POL123456');

    // Add diagnosis codes
    await page.getByLabel('Primary Diagnosis').fill('I10 - Essential Hypertension');

    // Submit claim
    await page.getByRole('button', { name: /submit|send/i }).click();

    // Should show claim submitted
    await expect(page.getByText(/claim submitted|processing/i)).toBeVisible();
  });

  test('should process payment', async ({ page }) => {
    await page.getByRole('link', { name: /billing/i }).click();

    // Find invoice with patient responsibility
    await page.getByText('Patient Balance: $50.00').click();

    // Process payment
    await page.getByRole('button', { name: /payment|pay/i }).click();

    // Select payment method
    await page.getByLabel('Payment Method').selectOption('cash');

    // Enter amount
    await page.getByLabel('Amount').fill('50.00');

    // Process payment
    await page.getByRole('button', { name: /process|pay/i }).click();

    // Should show payment successful
    await expect(page.getByText(/payment processed|paid/i)).toBeVisible();

    // Invoice should show paid
    await expect(page.getByText(/paid|settled/i)).toBeVisible();
  });

  test('should handle payment plans', async ({ page }) => {
    await page.getByRole('link', { name: /billing/i }).click();

    // Create payment plan for large invoice
    await page.getByText('Large Balance Invoice').click();

    await page.getByRole('button', { name: /payment plan|installments/i }).click();

    // Set up plan
    await page.getByLabel('Total Amount').fill('1000.00');
    await page.getByLabel('Number of Payments').fill('4');
    await page.getByLabel('Frequency').selectOption('monthly');

    // Create plan
    await page.getByRole('button', { name: /create|setup/i }).click();

    // Should show payment schedule
    await expect(page.getByText('$250.00')).toBeVisible(); // Monthly payment
    await expect(page.getByText('4 payments')).toBeVisible();
  });
});