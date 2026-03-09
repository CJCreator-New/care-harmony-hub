import { expect } from '@playwright/test';
import { doctorTest } from './fixtures/auth.fixture';

doctorTest.describe('Doctor — Consultation Workflow', () => {
  doctorTest('views patient queue and starts consultation', async ({ doctorPage: page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/dashboard/);

    await page.getByRole('link', { name: /queue|patients/i }).first().click();

    const startBtn = page.getByRole('button', { name: /start consultation|see patient/i }).first();
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    await expect(page).toHaveURL(/consultation/);
  });

  doctorTest('creates a prescription from consultation', async ({ doctorPage: page }) => {
    await page.goto('/consultations');
    await expect(page).toHaveURL(/consultations/);

    const consultationRow = page.getByRole('row').nth(1);
    await consultationRow.getByRole('button', { name: /open|view|start/i }).click();

    await page.getByRole('tab', { name: /prescription/i }).click();
    await page.getByRole('button', { name: /add medication|new prescription/i }).click();

    await page.getByLabel(/medication name/i).fill('Amoxicillin');
    await page.getByLabel(/dosage/i).fill('500mg');
    await page.getByLabel(/frequency/i).fill('TID');
    await page.getByLabel(/duration/i).fill('7 days');

    await page.getByRole('button', { name: /save|prescribe|submit/i }).click();

    await expect(page.getByText(/prescription created|saved successfully/i)).toBeVisible();
  });

  doctorTest('orders a lab test', async ({ doctorPage: page }) => {
    await page.goto('/consultations');

    const consultationRow = page.getByRole('row').nth(1);
    await consultationRow.getByRole('button', { name: /open|view|start/i }).click();

    await page.getByRole('tab', { name: /lab|orders/i }).click();
    await page.getByRole('button', { name: /order lab|new order/i }).click();

    await page.getByLabel(/test name/i).fill('CBC');

    await page.getByRole('button', { name: /order|submit/i }).click();

    await expect(page.getByText(/lab order created|order placed/i)).toBeVisible();
  });
});
