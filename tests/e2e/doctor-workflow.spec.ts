import { test, expect, Page } from '@playwright/test';
import { loginAsTestUser } from './utils/test-helpers';

async function loginAs(page: Page) {
  await loginAsTestUser(page, 'doctor');
  await expect(page).toHaveURL(/dashboard|hospital\/account-setup/i);
}

test.describe('Doctor Workflow', () => {
  test('should login as doctor', async ({ page }) => {
    await loginAs(page);
  });

  test('should open consultations page', async ({ page }) => {
    await loginAs(page);
    await page.goto('/consultations');
    await expect(page).toHaveURL(/consultations|access/i);
  });

  test('should open patients page or route guard', async ({ page }) => {
    await loginAs(page);
    await page.goto('/patients');
    await expect(page).toHaveURL(/patients|access/i);
  });
});
