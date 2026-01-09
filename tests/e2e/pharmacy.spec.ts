import { test, expect } from '@playwright/test';

test.describe('Pharmacy Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as pharmacist
    await page.goto('/login');
    await page.getByLabel('Email').fill('pharmacist@testgeneral.com');
    await page.getByLabel('Password').fill('TestPass123!');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await expect(page).toHaveURL(/.*dashboard.*/);
  });

  test('should process prescription', async ({ page }) => {
    // Navigate to pharmacy
    await page.getByRole('link', { name: /pharmacy|prescriptions/i }).click();

    // View pending prescriptions
    await page.getByRole('tab', { name: /pending|new/i }).click();

    // Select prescription for Jane Doe
    await page.getByText('Jane Doe - Lisinopril 20mg').click();

    // Verify prescription details
    await expect(page.getByText('Lisinopril')).toBeVisible();
    await expect(page.getByText('20mg')).toBeVisible();
    await expect(page.getByText('Once daily')).toBeVisible();

    // Check inventory
    await expect(page.getByText(/in stock|available/i)).toBeVisible();

    // Dispense medication
    await page.getByRole('button', { name: /dispense|fill/i }).click();

    // Confirm quantity and instructions
    await page.getByLabel('Quantity').fill('30');
    await page.getByLabel('Instructions').fill('Take one tablet by mouth daily');

    // Complete dispensing
    await page.getByRole('button', { name: /complete|dispense/i }).click();

    // Should show success and update status
    await expect(page.getByText(/dispensed|completed/i)).toBeVisible();
  });

  test('should handle low stock alerts', async ({ page }) => {
    await page.getByRole('link', { name: /pharmacy|inventory/i }).click();

    // Check inventory levels
    await page.getByRole('tab', { name: /inventory|stock/i }).click();

    // Should show low stock items
    await expect(page.getByText(/low stock|reorder/i)).toBeVisible();

    // Click on low stock item
    await page.getByText('Low Stock Item').click();

    // Should show reorder options
    await expect(page.getByText(/reorder|restock/i)).toBeVisible();
  });

  test('should manage inventory', async ({ page }) => {
    await page.getByRole('link', { name: /inventory|stock/i }).click();

    // Add new medication
    await page.getByRole('button', { name: /add medication|new item/i }).click();

    await page.getByLabel('Name').fill('Acetaminophen');
    await page.getByLabel('Generic Name').fill('Paracetamol');
    await page.getByLabel('Strength').fill('500mg');
    await page.getByLabel('Form').selectOption('tablet');
    await page.getByLabel('Quantity').fill('100');
    await page.getByLabel('Reorder Point').fill('20');

    await page.getByRole('button', { name: /save|add/i }).click();

    // Should show in inventory
    await expect(page.getByText('Acetaminophen')).toBeVisible();
    await expect(page.getByText('100')).toBeVisible();
  });

  test('should verify prescription safety', async ({ page }) => {
    await page.getByRole('link', { name: /prescriptions/i }).click();

    // Select prescription with potential issues
    await page.getByText('High Dose Prescription').click();

    // Should show verification checklist
    await expect(page.getByText(/verify|checklist/i)).toBeVisible();

    // Check for interactions
    await expect(page.getByText(/interactions|conflicts/i)).toBeVisible();

    // Verify and approve
    await page.getByRole('checkbox', { name: /verified|checked/i }).check();
    await page.getByRole('button', { name: /approve|verify/i }).click();

    // Should be ready for dispensing
    await expect(page.getByText(/ready|approved/i)).toBeVisible();
  });
});