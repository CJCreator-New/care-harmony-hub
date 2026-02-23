import { test, expect, Page } from '@playwright/test';
import { loginAsTestUser } from './utils/test-helpers';

async function loginAs(page: Page) {
  await loginAsTestUser(page, 'pharmacist');
  await expect(page).toHaveURL(/dashboard|hospital\/account-setup/i);
}

test.describe('Pharmacy Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test('should open pharmacy page', async ({ page }) => {
    await page.goto('/pharmacy');
    await expect(page).toHaveURL(/pharmacy|access/i);
    await expect(page.getByText(/application error|something went wrong/i)).toHaveCount(0);
  });

  test('should open refill tab route', async ({ page }) => {
    await page.goto('/pharmacy?tab=refills');
    await expect(page).toHaveURL(/pharmacy/i);
  });

  test('should open inventory page', async ({ page }) => {
    await page.goto('/inventory');
    await expect(page).toHaveURL(/inventory|access/i);
  });
});
