import { expect } from '@playwright/test';
import { pharmacistTest } from './fixtures/auth.fixture';

pharmacistTest.describe('Pharmacist — Dispense Workflow', () => {
  pharmacistTest('views pending prescriptions queue', async ({ pharmacistPage: page }) => {
    await page.goto('/pharmacy');
    await expect(page).toHaveURL(/pharmacy/);

    await expect(page.getByText(/pending|queue/i)).toBeVisible();
  });

  pharmacistTest('dispenses a prescription', async ({ pharmacistPage: page }) => {
    await page.goto('/pharmacy');

    const dispenseBtn = page.getByRole('button', { name: /dispense|fulfill/i }).first();
    await expect(dispenseBtn).toBeVisible();
    await dispenseBtn.click();

    // Confirm dispense dialog if present
    const confirmBtn = page.getByRole('button', { name: /confirm|yes|dispense/i });
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }

    await expect(page.getByText(/dispensed successfully|prescription dispensed/i)).toBeVisible();
  });

  pharmacistTest('checks inventory stock levels', async ({ pharmacistPage: page }) => {
    await page.goto('/pharmacy/inventory');
    await expect(page).toHaveURL(/inventory/);

    await expect(page.getByRole('table').or(page.getByTestId('inventory-list'))).toBeVisible();
  });
});
