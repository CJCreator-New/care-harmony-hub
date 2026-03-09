import { expect } from '@playwright/test';
import { nurseTest } from './fixtures/auth.fixture';

nurseTest.describe('Nurse — Triage & Vitals Workflow', () => {
  nurseTest('records vitals for a queued patient', async ({ nursePage: page }) => {
    await page.goto('/nurse/queue');
    await expect(page).toHaveURL(/nurse/);

    const prepBtn = page.getByRole('button', { name: /prep|vitals|start prep/i }).first();
    await expect(prepBtn).toBeVisible();
    await prepBtn.click();

    await page.getByLabel(/blood pressure|systolic/i).fill('120');
    await page.getByLabel(/diastolic/i).fill('80');
    await page.getByLabel(/heart rate/i).fill('72');
    await page.getByLabel(/temperature/i).fill('98.6');
    await page.getByLabel(/oxygen|spo2/i).fill('98');

    await page.getByRole('button', { name: /save vitals|complete prep|submit/i }).click();

    await expect(page.getByText(/vitals recorded|prep complete|ready for doctor/i)).toBeVisible();
  });

  nurseTest('marks patient as ready for doctor', async ({ nursePage: page }) => {
    await page.goto('/nurse/queue');

    const completeBtn = page.getByRole('button', { name: /complete prep|ready for doctor/i }).first();
    await expect(completeBtn).toBeVisible();
    await completeBtn.click();

    await expect(page.getByText(/ready for doctor|prep completed/i)).toBeVisible();
  });
});
