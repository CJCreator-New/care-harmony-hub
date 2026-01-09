import { test, expect } from '@playwright/test';

test.describe('Laboratory Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as lab technician
    await page.goto('/login');
    await page.getByLabel('Email').fill('labtech@testgeneral.com');
    await page.getByLabel('Password').fill('TestPass123!');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await expect(page).toHaveURL(/.*dashboard.*/);
  });

  test('should process lab orders', async ({ page }) => {
    // Navigate to laboratory
    await page.getByRole('link', { name: /laboratory|lab/i }).click();

    // View pending orders
    await page.getByRole('tab', { name: /pending|orders/i }).click();

    // Select lab order for Jane Doe
    await page.getByText('Jane Doe - Comprehensive Metabolic Panel').click();

    // View order details
    await expect(page.getByText('Comprehensive Metabolic Panel')).toBeVisible();
    await expect(page.getByText(/glucose|electrolytes|liver function/i)).toBeVisible();

    // Start processing
    await page.getByRole('button', { name: /start|begin processing/i }).click();

    // Record sample collection
    await page.getByLabel('Sample Type').selectOption('blood');
    await page.getByLabel('Collection Time').fill(new Date().toLocaleTimeString());
    await page.getByLabel('Collected By').fill('Lab Tech 1');

    await page.getByRole('button', { name: /save|record/i }).click();

    // Should update status
    await expect(page.getByText(/collected|processing/i)).toBeVisible();
  });

  test('should enter test results', async ({ page }) => {
    await page.getByRole('link', { name: /laboratory/i }).click();
    await page.getByRole('tab', { name: /results|entry/i }).click();

    // Select completed test
    await page.getByText('Jane Doe - Metabolic Panel').click();

    // Enter results
    await page.getByLabel('Glucose').fill('95');
    await page.getByLabel('Sodium').fill('140');
    await page.getByLabel('Potassium').fill('4.2');
    await page.getByLabel('Chloride').fill('102');
    await page.getByLabel('BUN').fill('18');
    await page.getByLabel('Creatinine').fill('0.8');
    await page.getByLabel('ALT').fill('25');
    await page.getByLabel('AST').fill('22');

    // Mark as normal/abnormal
    await page.getByLabel('Glucose Status').selectOption('normal');
    await page.getByLabel('Electrolytes Status').selectOption('normal');

    // Add notes
    await page.getByLabel('Notes').fill('All values within normal range');

    // Save results
    await page.getByRole('button', { name: /save|submit/i }).click();

    // Should show success
    await expect(page.getByText(/results saved|submitted/i)).toBeVisible();
  });

  test('should flag critical values', async ({ page }) => {
    await page.getByRole('link', { name: /laboratory/i }).click();

    // Enter critical result
    await page.getByRole('tab', { name: /results/i }).click();
    await page.getByText('Critical Test Sample').click();

    // Enter critical potassium level
    await page.getByLabel('Potassium').fill('7.8');

    // Should auto-flag as critical
    await expect(page.getByText(/critical|urgent|alert/i)).toBeVisible();

    // Save and trigger alert
    await page.getByRole('button', { name: /save|flag critical/i }).click();

    // Should show critical value alert
    await expect(page.getByText(/critical value reported|alert sent/i)).toBeVisible();
  });

  test('should view result history', async ({ page }) => {
    await page.getByRole('link', { name: /laboratory/i }).click();
    await page.getByRole('tab', { name: /history|reports/i }).click();

    // Search for patient results
    await page.getByPlaceholder(/search|find/i).fill('Jane Doe');
    await page.getByRole('button', { name: /search/i }).click();

    // Should show result history
    await expect(page.getByText('Jane Doe')).toBeVisible();
    await expect(page.getByText('Metabolic Panel')).toBeVisible();
    await expect(page.getByText(/completed|final/i)).toBeVisible();

    // View detailed results
    await page.getByText('View Details').click();
    await expect(page.getByText('Glucose: 95')).toBeVisible();
  });
});