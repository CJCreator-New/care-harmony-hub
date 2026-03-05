import { test, expect } from '@playwright/test';
import { TEST_DATA } from './utils/test-helpers';

test('debug login', async ({ page }) => {
  console.log('--- Starting Debug Test ---');
  await page.goto('/hospital/login');

  await page.locator('input[type="email"]').first().fill(TEST_DATA.ADMIN.email);
  await page.locator('input[type="password"]').first().fill(TEST_DATA.ADMIN.password);
  await page.locator('button[type="submit"]').first().click();

  await expect(page).toHaveURL(/dashboard|hospital\/account-setup/i, { timeout: 30000 });

  console.log('--- Current URL ---');
  console.log(page.url());
});
