import { test, expect, Page } from '@playwright/test';
import { loginAsTestUser } from './utils/test-helpers';

async function loginAs(page: Page) {
  await loginAsTestUser(page, 'admin');
  await expect(page).toHaveURL(/dashboard|hospital\/account-setup/i);
}

test.describe('Admin Operations', () => {
  test('should login as admin', async ({ page }) => {
    await loginAs(page);
    await expect(page).toHaveURL(/dashboard|hospital\/account-setup/i);
    await expect(page.getByText(/application error|something went wrong/i)).toHaveCount(0);
  });

  test('should load admin dashboard widgets', async ({ page }) => {
    await loginAs(page);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/dashboard/i);
    await expect(page.getByText(/application error|something went wrong/i)).toHaveCount(0);
    await expect(page.getByText(/dashboard|overview|analytics/i).first()).toBeVisible();
  });

  test('should access staff management route', async ({ page }) => {
    await loginAs(page);
    await page.goto('/settings/staff-management');
    await expect(page).toHaveURL(/settings\/staff|access/i);
  });
});
