import { expect } from '@playwright/test';
import { labTechTest } from './fixtures/auth.fixture';

labTechTest.describe('Lab Technician — Order Processing Workflow', () => {
  labTechTest('views pending lab orders', async ({ labTechPage: page }) => {
    await page.goto('/lab');
    await expect(page).toHaveURL(/lab/);

    await expect(page.getByText(/pending|orders/i)).toBeVisible();
  });

  labTechTest('collects sample for a lab order', async ({ labTechPage: page }) => {
    await page.goto('/lab');

    const collectBtn = page.getByRole('button', { name: /collect|sample/i }).first();
    await expect(collectBtn).toBeVisible();
    await collectBtn.click();

    await expect(page.getByText(/sample collected|collection recorded/i)).toBeVisible();
  });

  labTechTest('enters results for a lab order', async ({ labTechPage: page }) => {
    await page.goto('/lab');

    const resultBtn = page.getByRole('button', { name: /enter result|result/i }).first();
    await expect(resultBtn).toBeVisible();
    await resultBtn.click();

    const resultInput = page.getByLabel(/result value|value/i);
    await resultInput.fill('14.5');

    await page.getByRole('button', { name: /save|submit result/i }).click();

    await expect(page.getByText(/result saved|completed/i)).toBeVisible();
  });
});
