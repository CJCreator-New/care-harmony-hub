import { test, expect, Page } from '@playwright/test';
import { loginAsTestUser } from './utils/test-helpers';

async function loginAs(page: Page) {
  await loginAsTestUser(page, 'lab_technician');
  await expect(page).toHaveURL(/dashboard|hospital\/account-setup/i);
}

test.describe('Laboratory Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test('should open laboratory page', async ({ page }) => {
    await page.goto('/laboratory');
    await expect(page).toHaveURL(/laboratory|access/i);
    await expect(page.getByText(/application error|something went wrong/i)).toHaveCount(0);
  });

  test('should open sample collection route', async ({ page }) => {
    await page.goto('/laboratory?tab=collected');
    await expect(page).toHaveURL(/laboratory/i);
  });

  test('should open result entry route', async ({ page }) => {
    await page.goto('/laboratory?tab=results');
    await expect(page).toHaveURL(/laboratory/i);
  });

  test('should open lab automation page', async ({ page }) => {
    await page.goto('/laboratory/automation');
    await expect(page).toHaveURL(/laboratory\/automation|access/i);
  });
});
