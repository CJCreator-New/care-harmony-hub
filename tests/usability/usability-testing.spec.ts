import { test, expect } from '@playwright/test';
import { setTestRole, loginAsTestUser, setupApiMocks } from '../e2e/utils/test-helpers';

test.describe('Usability Testing', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('should provide clear navigation and user guidance', async ({ page }) => {
    await loginAsTestUser(page, 'nurse');
    await page.goto('/dashboard');

    // Check navigation is intuitive
    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Patients' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Queue' })).toBeVisible();

    // Check breadcrumbs or navigation context
    await page.getByRole('button', { name: 'Patients' }).click();
    await expect(page.getByText('Patient List')).toBeVisible();

    // Check back navigation
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByText('Dashboard')).toBeVisible();
  });

  test('should provide helpful error messages and validation', async ({ page }) => {
    await loginAsTestUser(page, 'doctor');
    await page.goto('/consultations');

    // Test form validation
    await page.getByRole('button', { name: 'New Consultation' }).click();

    // Try to submit empty form
    await page.getByRole('button', { name: 'Save' }).click();

    // Check for helpful error messages
    await expect(page.getByText('Patient selection is required')).toBeVisible();
    await expect(page.getByText('Please fill in all required fields')).toBeVisible();
  });

  test('should support keyboard navigation', async ({ page }) => {
    await loginAsTestUser(page, 'receptionist');
    await page.goto('/queue');

    // Test tab navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();

    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();

    // Test enter key activation
    await page.keyboard.press('Enter');
    // Should activate focused element or move to next focusable element
  });

  test('should provide appropriate feedback for user actions', async ({ page }) => {
    await loginAsTestUser(page, 'pharmacist');
    await page.goto('/pharmacy');

    // Test successful action feedback
    await page.getByRole('button', { name: 'Dispense Medication' }).first().click();
    await expect(page.getByText('Medication dispensed successfully')).toBeVisible();

    // Test loading states
    await page.getByRole('button', { name: 'Update Inventory' }).click();
    await expect(page.getByText('Updating...')).toBeVisible();

    // Test completion feedback
    await expect(page.getByText('Inventory updated')).toBeVisible();
  });

  test('should maintain user context and state', async ({ page }) => {
    await loginAsTestUser(page, 'nurse');
    await page.goto('/patients');

    // Select a patient
    await page.getByText('Test Patient').click();

    // Navigate away and back
    await page.goto('/dashboard');
    await page.goto('/patients');

    // Check if patient selection is maintained or appropriately reset
    // This depends on the application's design - either maintain or provide clear reset
    const patientVisible = await page.getByText('Test Patient').isVisible();
    expect(patientVisible).toBe(true); // Or false if reset is appropriate
  });

  test('should handle common user workflows efficiently', async ({ page }) => {
    await loginAsTestUser(page, 'doctor');
    await page.goto('/consultations');

    // Start consultation workflow
    const startTime = Date.now();

    await page.getByRole('button', { name: 'New Consultation' }).click();
    await page.getByLabel('Patient Search').fill('John Doe');
    await page.getByText('John Doe').click();
    await page.getByRole('button', { name: 'Start Consultation' }).click();

    // Complete basic consultation steps
    await page.getByRole('button', { name: 'Review History' }).click();
    await page.getByRole('button', { name: 'Physical Exam' }).click();
    await page.getByRole('button', { name: 'Diagnosis' }).click();

    const endTime = Date.now();
    const workflowTime = endTime - startTime;

    // Workflow should complete within reasonable time (under 30 seconds for manual testing simulation)
    expect(workflowTime).toBeLessThan(30000);
  });
});